# supplier

Let the supply chain deliver the resources and services you need, where you need them. No more tedious wiring or prop-drilling.

A powerful, type-inferred, and hyper-minimalistic library for dependency injection (DI), context propagation, and waterfall management.

STILL IN VERY UNSTABLE, PRE-ALPHA, PLEASE DON'T INSTALL VERSIONS v0.0.x

## Features

### 🔧 **Dependency Injection**

-   **Functions only** - No OOP, classes, decorators, or compiler magic,
-   **Fully typesafe and type-inferred** - Full TypeScript support with compile-time circular dependency detection.
-   **Stateless** - No stateful container, dependencies injected via closure.
-   **Fluent and expressive API** - Learn in minutes, designed for both developers and AI usage.
-   **Runtime overrides** - Easily mock dependencies for testing using `.hire()`

### 📦 **Context Propagation**

-   **Global resources** - Supply once at entry point, access everywhere without prop-drilling
-   **Smart memoization** - Dependencies injected once per supplied context for optimal performance
-   **Context switching** - Add or resupply context anywhere in the call stack

### ⚡ **Waterfall Management**

-   **Eager loading** - Use `preload: true` for immediate initialization on `supply()` call
-   **Lazy loading** - Use `preload: false` for on-demand initialization when first accessed.
-   **Performance control** - Optimize loading in deeply nested dependency trees like React component hierarchies

## Installation

```bash
npm install supplier
```

## Quick Start

### Creating Services

Services are factory functions that can depend on other resources or services. Factory functions can return anything (values, functions, etc.).

```typescript
import { register, type $ } from "supplier"

// Simple service with no dependencies.
const LoggerService = register("logger").asService({
    factory: () => (message: string) => console.log(`[LOG] ${message}`)
})

const ApiClient = register("api-client").asService({
    // You can view $ as a shorthand for supplies.
    // Use $<> type utility to define the shape of the required supplies.
    factory: ($: $<[typeof ConfigResource, typeof LoggerService]>) => {
        return {
            async get(path: string) {
                const config = $(ConfigResource.id)
                const logger = $(LoggerService.id)
                logger.log(`GET ${config.apiUrl}${path}`)
                // ... implementation
            }
            // ... other methods
        }
    },
    team: [LoggerService] // Service dependencies can be provided in place using the team array. Resource dependencies (like ConfigResource) will be passed at the entry point when calling supply().
})
```

### Creating Resources

Resources are simple values that can be injected into services in a type-safe way:

```typescript
import { register } from "supplier"

// Create a resource registration with type constraint
const ConfigResource = register("config").asResource<{
    apiUrl: string
    timeout: number
}>()

// Instanciate a resource with a value
const config = ConfigResource.of({
    apiUrl: "https://api.example.com",
    timeout: 5000
})

console.log(config.id) // "config"
console.log(config.value.apiUrl) // "https://api.example.com"
```

### Supplying at the entry point

The supply method of a service (e.g. `ApiClient.supply(supplies)`) typechecks supplies to be an object with entries determined by the following formula:

```
(Recursive aggregate of all dependencies specified in $<> and all transitive dependencies
($<> dependencies of dependencies))
-
(Recursive aggregate of all services provided in team[] and all transitive team[] services
(team[] of dependencies))
-
services hired with hire() method (see below) and all their transitive team[] services
```

```typescript
//ApiClient.supply() needs LoggerService and ConfigResource, but LoggerService was already provided in-place using the team array.
const apiClient = ApiCLient.supply({
    [ConfigResource.id]: ConfigResource.of({
        apiUrl: "https://api.example.com",
        timeout: 5000
    })
})

// Use the result
await apiClient.value.get("/users")
```

You can use index() utility as a shorthand to easily transform a ...list of resources of type {id, value} to an object supply() can easily typecheck (of type `Record<id, {id,value}>`)

```typescript
const apiClient = ApiClient.supply(
    index(
        ConfigResource.of({
            apiUrl: "https://api.example.com",
            timeout: 5000
        })
    )
)
```

#### Type narrowing

`Narrow<>` type utility allows you to extend the type constraint on a depended-upon resource of a service. This is very powerful, as it allows you to remove almost all runtime type guards. No more if (!user && !user.role==="...") throw ... at the top of all your functions!

```typescript
type Session = { user: User; now: Date }

// Session resource can hold any object of type Session
const Session = register("session").asResource<Session>()

// But admin dashboard requires admin session
const AdminDashboard = register("admin-dashboard").asService({
    // Only allow this service to be instantiated if an admin session is in the supplied context. Narrow is just a helper that basically intersects the constraint stored in the Session resource(here, type Session) with any provided 2nd generic parameter. So here, the value of the Session resource is narrowed to be Session & {user:{role:"admin"}}
    factory: ($: $<[Narrow<typeof Session, { user: { role: "admin" } }>]>) => {
        const session = $(Session.id)
        // No runtime check needed - TypeScript ensures session.user.role === "admin"
        return {
            // Some admin only methods
        }
    }
})

// This will create a type error
const adminDashboard = AdminDashboard.supply(
    index(
        Session.of({
            userId: "user123",
            token: "user-token",
            role: "user" // TypeScript error: role "user" not assignable to role "admin"
        })
    )
)

//This will succeed
const adminDashboard = AdminDashboard.supply(
    index(
        Session.of({
            userId: "admin456",
            token: "admin-token",
            role: "admin" // ✅ Compiles successfully
        })
    )
)
```

## Advanced Usage

### Callable Object API

The `$` callable object provides access to a service's dependencies. `$[depId]` accesses the resource or service, and `$(depId)` is a shorthand to access the value stored in the resource, or built by the service. To remember, I view `$[]` as accessing the "box" that contains the value ([] looks like a box). The resource `$[resourceId]` is of type {id, value, of} and the service `$[serviceId]` is of type {id, value, of, resupply} (see the use of resupply below). `$[depId].of(value)` simply creates a new resource or service with same depId, and with its value directly set to the value param, bypassing the factory in the case of services.

```typescript
const MyService = register("my-service").asService({
    team: [SomeService],
    factory: ($: $<[typeof SomeService]>) => {
        // Both of these work:
        const service = $(SomeService.id) // Function call
        const sameService = $[SomeService.id].value // Property access
        //...
    }
})
```

### Context switching

Use `$[serviceId].resupply()` to load a service in a different context. Example use cases: Impersonate another user, or run a query in a db transaction instead of the default db session.
The parent supplies in $ are preserved, you just need to overwrite what you want to change or add.

```typescript
// Wallet service that depends on user session
const AcceptTransferService = register("transfer-service").asService({
    team: [Session],
    factory: ($: $<[typeof Session]>) => {
        const session = $(Session.id)

        return (amount: number) {
            // Add entry into the current user's wallet
            // ...
        }
    }
})

// Money transfer service that switches contexts
const TransferService = register("transfer").asService({
    team: [WalletService, Session],
    factory: ($: $<[typeof WalletService, typeof Session]>) => {
        function deductFromSender(amount: number) {
            const session = $(Session.id)
            // Deduct from current user's wallet
        }

        return (
                toUserId: string,
                amount: number
            )=>{
                // First, deduct from sender's wallet (current context)
                deductFromSender(amount)

                // Then, switch to recipient's context to accept the transfer
                $[WalletService.id].resupply(
                    index(
                        Session.of({
                            user: { id: toUserId, role: "user" },
                            now: new Date()
                        })
                    )
                // Accept the transfer in recipient's wallet
                ).value.acceptTransfer(amount)

                return { success: true, amount, fromUserId, toUserId }
            }
    }
}
)
```

### Hiring Services (Composition Root)

Dependencies can be supplied alongside the service definition using the "team" array, or supplied at the entry point of the application using the hire() method. This aligns with traditional DI systems and the composition root pattern, and allows you to override dependencies easily for mocking and testing.

```typescript
// Create a test logger that doesn't actually log
const TestLogger = register("logger").asService({
    factory: () => (message: string) => {
        /* silent */
    }
})

// Override the logger for testing
const testApiClient = ApiClient.hire(TestLogger).supply(
    index(ConfigResource.of({ apiUrl: "http://localhost", timeout: 1000 }))
)
```

### Memoization and Performance

Service factories are automatically memoized within the same supply context, but get reinjected when resupply() is called.

```typescript
const ExpensiveService = register("expensive").asService({
    factory: () => {
        console.log("This will only run once per supply context")
        return performExpensiveComputation()
    }
})

const ConsumerService = register("consumer").asService({
    team: [ExpensiveService],
    factory: ($: $<[typeof ExpensiveService]>) => {
        const result1 = $(ExpensiveService.id) // Computed
        const result2 = $(ExpensiveService.id) // Memoized
        const result3 = $(ExpensiveService.id) // Memoized

        return { result1, result2, result3 } // All identical
    }
})
```

### Eager Preloading

For performance-critical scenarios, you can enable eager preloading:

```typescript
// These 2 services will be initialized immediately when supply() is called
const DatabaseService = register("database").asService({
    factory: () => createDatabaseConnection(),
    preload: true // Eager initialization
})

const CacheService = register("cache").asService({
    factory: () => createCacheConnection(),
    preload: true // Eager initialization
})

const SomeService = register("service").asService({
    team: [DatabaseService, CacheService],
    factory: ($) => {
        // DatabaseService and CacheService are already initialized, so the $() call is instantaneous
        return someFn($(DatabaseService.id), $(CacheService.id))
    }
})

// Both DatabaseService and CacheService start initializing immediately
const service = SomeService.supply()
```

## API Reference

### `register(id: string)`

Creates a registration that can be turned into either a resource or service.

### `.asResource<T>()`

Creates a resource registration that can supply git tagvalues of type `T`.

### `.asService({ factory, team? })`

Creates a service registration with:

-   `factory`: Function that creates the service's value
-   `team`: Optional array of dependencies

### `.supply(supplies?)`

Executes the supply chain and returns a resource with the computed value.

### `.hire(...services)`

Creates a new service with additional or overridden dependencies.

### `index(...resources)`

Helper function to bundle multiple resources for supply, index by their id.

## TypeScript Support

Supplier is built with TypeScript-first design:

-   Full type inference for dependencies
-   Compile-time dependency validation and circular dependency detection
-   Zero runtime type checking overhead
-   IntelliSense support for all APIs

## Testing

```bash
npm test
```

## 🌐 Website & Examples

**[supplier-js.github.io/supplier](https://supplier-js.github.io/supplier)**

## License

MIT © [Supplier.js](https://github.com/supplier-js/supplier)

## Contributing

Issues and pull requests welcome on [GitHub](https://github.com/supplier-js/supplier).
