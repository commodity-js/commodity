# supplier

Let the supply chain deliver the resources and services you need, where you need them. No more tedious wiring or prop-drilling.

A powerful, type-inferred, and hyper-minimalistic library for dependency injection (DI), context propagation, and waterfall management.

## Features

### 🔧 **Dependency Injection**

-   **Functions only** - No OOP, classes, decorators, or compiler magic,
-   **Fully type-inferred** - Full TypeScript inference using an imperative reader monad pattern
-   **Stateless** - No stateful container, dependencies injected via closure.
-   **Fluent and expressive API** - Learn in minutes, designed for both developers and AI usage.
-   **Runtime overrides** - Easily mock dependencies for testing using `.hire()`

### 📦 **Context Propagation**

-   **Global resources** - Supply once at entry point, access everywhere without prop-drilling
-   **Smart memoization** - Dependencies injected once per supplied context for optimal performance
-   **Context switching** - Add, override, or resupply context anywhere in the call stack

### ⚡ **Waterfall Management**

-   **Eager loading** - Use `preload: true` for immediate initialization on `supply()` call
-   **Lazy loading** - Use `preload: false` for on-demand initialization when first accessed.
-   **Performance control** - Optimize loading in deeply nested dependency trees like React component hierarchies

## Installation

```bash
npm install supplier
```

## Quick Start

### Creating Agents

Agents are factory functions that can depend on other resources or agents:

```typescript
import { register, type $ } from "supplier"

// Simple agent with no dependencies
const LoggerAgent = register("logger").asAgent({
    factory: () => ({
        log: (message: string) => console.log(`[LOG] ${message}`)
    })
})

// Agent with dependencies supplied in-place using the "team" array
const ApiClient = register("api-client").asAgent({
    team: [ConfigResource, LoggerAgent],
    factory: ($: $<[typeof ConfigResource, typeof LoggerAgent]>) => {
        const config = $(ConfigResource.id)
        const logger = $(LoggerAgent.id)

        return {
            async get(path: string) {
                logger.log(`GET ${config.apiUrl}${path}`)
                // ... implementation
            }
        }
    }
})
```

### Creating Resources

Resources are simple values that can be injected into agents:

```typescript
import { register } from "supplier"

// Create a resource registration with type constraint
const ConfigResource = register("config").asResource<{
    apiUrl: string
    timeout: number
}>()

// Put a value in the resource
const config = ConfigResource.put({
    apiUrl: "https://api.example.com",
    timeout: 5000
})

console.log(config.value.apiUrl) // "https://api.example.com"
console.log(config.id) // "config"
```

### Using the Supply Chain

```typescript
// Supply dependencies and get the result
const apiClient = ApiClient.supply(
    tagged(
        ConfigResource.put({
            apiUrl: "https://api.example.com",
            timeout: 5000
        })
    )
)

// Use the result
await apiClient.value.get("/users")
```

## Advanced Usage

### Callable Object API

The `$` callable object provides access to an agent's dependencies. Call $(depId) or access $[depId].value to get the dependency value.

```typescript
const MyAgent = register("my-agent").asAgent({
    team: [SomeService],
    factory: ($: $<[typeof SomeService]>) => {
        // Both of these work:
        const service1 = $(SomeService.id) // Function call
        const service2 = $[SomeService.id].value // Property access

        return { service1, service2 }
    }
})
```

### Context switching

Use `$[agentId].resupply()` to load an agent in a different context. Example use cases: Impersonate another user, or run a query in a db transaction instead of the default db session.

```typescript
// Wallet service that depends on user session
const WalletService = register("wallet").asAgent({
    team: [Session],
    factory: ($: $<[typeof Session]>) => {
        const session = $(Session.id)

        return {
            acceptTransfer(amount: number) {
                // Add entry into the current user's wallet
                // ...
            }
        }
    }
})

// Money transfer service that switches contexts
const TransferService = register("transfer").asAgent({
    team: [WalletService, Session],
    factory: ($: $<[typeof WalletService, typeof Session]>) => {
        return {
            transferMoney(
                fromUserId: string,
                toUserId: string,
                amount: number
            ) {
                // First, deduct from sender's wallet (current context)
                this.deductFromSender(amount)

                // Then, switch to recipient's context to accept the transfer
                const recipientWallet = $[WalletService.id].resupply(
                    tagged(
                        Session.put({
                            user: { id: toUserId, role: "user" },
                            now: new Date()
                        })
                    )
                ).value

                // Accept the transfer in recipient's wallet
                recipientWallet.acceptTransfer(amount)

                return { success: true, amount, fromUserId, toUserId }
            },

            deductFromSender(amount: number) {
                // Deduct from current user's wallet
            }
        }
    }
})
```

### Type narrowing

`Narrow<>` type utility enables compile-time guarantees about your dependencies. Instead of runtime checks, you can constrain resource types to specific shapes, ensuring that agents only receive dependencies that meet their exact requirements. This catches type mismatches at compile time and eliminates the need for defensive programming.

```typescript
type Session = { user: User; now: Date }

// Session resource can hold any object of type Session
const Session = register("session").asResource<Session>()

// But admin dashboard requires admin session
const AdminDashboard = register("admin-dashboard").asAgent({
    team: [Session],
    // Only allow this agent to be instanciated if an admin session is in the supplied context
    factory: (
        $: $<
            [
                Narrow<
                    typeof Session,
                    Session & { user: User & { role: "admin" } }
                >
            ]
        >
    ) => {
        const session = $(Session.id)
        // No runtime check needed - TypeScript ensures session.role === "admin"
        return {
            async getSystemStats() {
                const response = await fetch(`/api/admin/stats`, {
                    headers: { Authorization: `Bearer ${session.token}` }
                })
                return response.json()
            }
        }
    }
})

// This will create a type error
const adminDashboard = AdminDashboard.supply(
    tagged(
        Session.put({
            userId: "user123",
            token: "user-token",
            role: "user" // TypeScript error: role "user" not assignable to role "admin"
        })
    )
)

//This will succeed
const adminDashboard = AdminDashboard.supply(
    tagged(
        Session.put({
            userId: "admin456",
            token: "admin-token",
            role: "admin" // ✅ Compiles successfully
        })
    )
)
```

### Hiring Agents (Composition Root)

Dependencies can be supplied alongside the agent definition using the "team" array, or supplied at the entry point of the application using the hire() method. This aligns with traditional DI systems and the composition root pattern, and allows to override dependencies easily for mocking and testing.

```typescript
// Create a test logger that doesn't actually log
const TestLogger = register("logger").asAgent({
    factory: () => ({
        log: (message: string) => {
            /* silent */
        }
    })
})

// Override the logger for testing
const testApiClient = ApiClient.hire(TestLogger).supply(
    tagged(ConfigResource.put({ apiUrl: "http://localhost", timeout: 1000 }))
)
```

### Memoization and Performance

Agent factories are automatically memoized within the same supply context, but get reinjected when resupply() is called.

```typescript
const ExpensiveAgent = register("expensive").asAgent({
    factory: () => {
        console.log("This will only run once per supply context")
        return performExpensiveComputation()
    }
})

const ConsumerAgent = register("consumer").asAgent({
    team: [ExpensiveAgent],
    factory: ($: $<[typeof ExpensiveAgent]>) => {
        const result1 = $(ExpensiveAgent.id) // Computed
        const result2 = $(ExpensiveAgent.id) // Memoized
        const result3 = $(ExpensiveAgent.id) // Memoized

        return { result1, result2, result3 } // All identical
    }
})
```

### Eager Preloading

For performance-critical scenarios, you can enable eager preloading:

```typescript
// These agents will be initialized immediately when supply() is called
const DatabaseAgent = register("database").asAgent({
    factory: () => createDatabaseConnection(),
    preload: true // Eager initialization
})

const CacheAgent = register("cache").asAgent({
    factory: () => createCacheConnection(),
    preload: true // Eager initialization
})

const ApiAgent = register("api").asAgent({
    team: [DatabaseAgent, CacheAgent],
    factory: ($) => {
        // DatabaseAgent and CacheAgent are already initialized, so the $() call is instantaneous
        return createApiService($(DatabaseAgent.id), $(CacheAgent.id))
    }
})

// Both DatabaseAgent and CacheAgent start initializing immediately
const api = ApiAgent.supply()
```

## API Reference

### `register(id: string)`

Creates a registration that can be turned into either a resource or agent.

### `.asResource<T>()`

Creates a resource registration that can supply values of type `T`.

### `.asAgent({ factory, team? })`

Creates an agent registration with:

-   `factory`: Function that creates the agent's value
-   `team`: Optional array of dependencies

### `.supply(supplies?)`

Executes the supply chain and returns a resource with the computed value.

### `.hire(...agents)`

Creates a new agent with additional or overridden dependencies.

### `tagged(...resources)`

Helper function to bundle multiple resources for supply, tagged by their id.

## TypeScript Support

Supplier is built with TypeScript-first design:

-   Full type inference for dependencies
-   Compile-time dependency validation
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
