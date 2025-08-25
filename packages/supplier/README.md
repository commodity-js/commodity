# supplier

Let the market and the supply chain deliver the resources and services ("products") you need, where you need them. No more tedious wiring or prop-drilling.

A powerful, type-inferred, and hyper-minimalistic library for Context Propagation, Reactive Caching, Optimistic Mutations, and Waterfall Management.

## Background

I created this library to solve multiple pain points I had while working with complex dependency graphs and deeply nested function call chains in applications. The more decoupled, dry and SOLID your application becomes, the more the dependency graph becomes hard to manage, and the easier the chance of creating a chain of functions that call each other in a deeply nested fashion. And when that happens, problems like prop-drilling, context propagation, waterfall management (managing what functions to preload or not for optimization) and caching management (determining what functions and results to uncache when one result is invalidated) become very tedious, and no solution really exist to address them all at once, even if the root cause of all of them is the same: deeply nested function calls and dependency graphs.

I encountered these pain points working on a big React application, trying to convert my deep component tree to server components without the help of React Context to ease the pains of prop-drilling :'(. But the problems are more general and arise in other contexts, like complex backends with intertwined data dependencies, so this package is completely framework-agnostic.

It is inspired by Dependency Injection frameworks (DI), but don't be scared! I removed all OOP paradigms, all classes, decorators, annotations, reflect-metadata and compiler magic, and I added full type-safety and type-inference. I had the intuition that DI got this complex in OOP world because of the absence of first-class functions in the languages it was most used. But JS DI frameworks currently on the market seem to have been built by imitating how they were built for languages without first-class functions. And I get why, even with first-class functions, DI is a hard and confusing pattern, full of potential recursions and circular dependencies. But once you manage to untangle all of that, it becomes really powerful! I only created this library to solve prop-drilling and context propagation initially, but then I kept seeing pain points of other developers and even frameworks that I could solve easily with my library, so I added caching, preloading and optimistic mutations.

STILL IN VERY UNSTABLE, PRE-ALPHA, PLEASE DON'T INSTALL VERSIONS v0.0.x

## Features

### :sunny: **General**

-   **Fully typesafe and type-inferred** - Full TypeScript support with compile-time circular dependency detection.
-   **Fluent and expressive API** - Learn in minutes, designed for both developers and AI usage.
-   **Fully framework-agnostic** - Complements back-end and front-end frameworks.

### 🔧 **Dependency Injection**

-   **Functions only** - No OOP, classes, decorators, or compiler magic,
-   **Stateless Injection** - Dependencies are resolved via closures, not state.
-   **Maximal colocation** - Declare most of your injections (supplies) right next to your functions, not at the entry-point. No compostion root.
-   **Runtime overrides** - Easily mock dependencies for testing.

### 📦 **Context Propagation**

-   **Shared context** - Assemble the context once at the entry point, access everywhere without prop-drilling
-   **Smart memoization** - Dependencies injected once per context for optimal performance
-   **Context switching** - Add or override context anywhere in the call stack

### 🧠 **Smart Reactive Caching**

-   **Bring Your Own Cache** - Integrate any caching strategy via `memoFn` and `recallFn`.
-   **Reactive Dependency Graph** - Automatically invalidate all dependents when a cached function is recalled (invalidated).
-   **Fine-Grained Control** - Enable or disable memoization and recallability on a per-function basis for maximum flexibility.

### 🚀 **Optimistic Mutations**

-   **Immediate UI Updates** - Set optimistic values that get returned instantly while background computation happens.
-   **Background Processing** - Heavy computations run asynchronously without blocking the user experience.
-   **Automatic Fallback** - Seamlessly fall back to computed values when optimistic values are cleared.

### ⚡ **Waterfall Management**

-   **Eager loading** - Use `preload: true` for immediate initialization on `assemble()` call
-   **Lazy loading** - Use `preload: false` for on-demand initialization when first accessed.
-   **Performance control** - Optimize loading in deeply nested dependency trees like React component hierarchies

## Installation

```bash
npm install supplier
```

## Quick Start

All resources and products are created from a `market`, which acts like a container in DI.

```typescript
import { createMarket } from "supplier"

const market = createMarket()
```

### Creating Products (formerly Services)

Products are factory functions that can depend on other resources or products. Factory functions can return anything (values, functions, etc.).

```typescript
import { createMarket, type $ } from "supplier"

const market = createMarket()

// A simple product with no dependencies.
const LoggerSupplier = market.offer("logger").asProduct({
    factory: () => (message: string) => console.log(`[LOG] ${message}`)
})

// A product that depends on another product and a resource.
const ApiClientSupplier = market.offer("api-client").asProduct({
    // Simply inject dependencies in-place! Simple, but this pattern unlocks a lot of unforeseen power!
    //
    // All product dependencies get automatically injected, but Resource dependencies
    //  will need to be supplied using assemble() at the entrypoint of your app
    suppliers: [LoggerSupplier, ConfigSupplier], // ConfigSupplier is defined in the next section
    // You can view $ as a shorthand for supplies.
    // Use $<> type utility to define the shape of the required supplies.
    factory: ($) => {
        return {
            async get(path: string) {
                const config = $(ConfigSupplier.name)
                const logger = $(LoggerSupplier.name)
                logger(`GET ${config.apiUrl}${path}`)
                // ... implementation
            }
            // ... other methods
        }
    }
})
```

### Creating Resources

Resources are simple values that can be injected into products in a type-safe way:

```typescript
import { createMarket } from "supplier"

const market = createMarket()

// Create a resource supplier with a type constraint
const ConfigSupplier = market.offer("config").asResource<{
    apiUrl: string
    timeout: number
}>()

// Instantiate a resource with a value
const config = ConfigSupplier.pack({
    apiUrl: "https://api.example.com",
    timeout: 5000
})

console.log(config.name) // "config"
console.log(config.unpack().apiUrl) // "https://api.example.com"
```

### Assembling at the entry point

You pass to the `assemble` method of a product supplier (e.g. `ApiClientSupplier.assemble(supplies)`) all resources it and its dependencies need (recursively). Typescript helps you if you miss any.

```typescript
//LoggerSupplier is injected automatically, but ConfigSupplier needs to be supplied
const apiClient = ApiClientSupplier.assemble({
    [ConfigSupplier.name]: ConfigSupplier.pack({
        apiUrl: "https://api.example.com",
        timeout: 5000
    })
})

// Use the resulting product
await apiClient.unpack().get("/users")
```

You can use `index()` utility as a shorthand to easily transform a list of resources to an object `assemble()` can easily typecheck.

```typescript
const apiClient = ApiClientSupplier.assemble(
    index(
        ConfigSupplier.pack({
            apiUrl: "https://api.example.com",
            timeout: 5000
        })
    )
)
```

#### Eager Preloading

For performance-critical scenarios and waterfall loading management, you can enable eager preloading:

```typescript
// These 2 products will be initialized immediately when assemble() is called
const DatabaseSupplier = market.offer("database").asProduct({
    factory: () => createDatabaseConnection(),
    preload: true // Eager initialization
})

const CacheSupplier = market.offer("cache").asProduct({
    factory: () => createCacheConnection(),
    preload: true // Eager initialization
})

const SomeProductSupplier = market.offer("product").asProduct({
    suppliers: [DatabaseSupplier, CacheSupplier],
    factory: ($) => {
        // DatabaseSupplier and CacheSupplier are already initialized,
        // so the $() call is instantaneous
        return someFn($(DatabaseSupplier.name), $(CacheSupplier.name))
    }
})

// Both DatabaseSupplier and CacheSupplier start initializing immediately
const product = SomeProductSupplier.assemble()
```

#### Testing and mocking

For easy testing and mocking, you can also easily overwrite a product by using `ProductSupplier.pack(value)`. The product's factory will not be called, the value will be used as-is, much like `ResourceSupplier.pack()`.

```typescript
// Override the logger for testing
const testApiClient = ApiClientSupplier.assemble(
    index(
        // Create a test logger that doesn't actually log
        LoggerSupplier.pack((message: string) => {
            /* silent */
        }),
        ConfigSupplier.pack({ apiUrl: "http://localhost", timeout: 1000 })
    )
)
```

### $ (Supplies) Object API

The `$` callable object provides access to a product's dependencies. `$[depName]` accesses the resource or product, and `$(depName)` is a shorthand to access the value stored in the resource, or built by the product. To remember, I view `$[]` as accessing the "box" that contains the value ([] looks like a box). The resource `$[resourceName]` is of type `{name, unpack, pack}` and the product `$[productName]` is of type `{name, unpack, pack, reassemble}` (see the use of `reassemble` below).

```typescript
const MyProductSupplier = market.offer("my-product").asProduct({
    suppliers: [SomeProductSupplier],
    factory: ($: $<[typeof SomeProductSupplier]>) => {
        // Both of these work:
        const product = $(SomeProductSupplier.name) // Function call
        const sameProduct = $[SomeProductSupplier.name].unpack() // Property access
        //...
    }
})
```

#### Type narrowing

The `narrow()` function allows you to specify additional type constraints on resources at runtime. This is very powerful, as it allows you to remove almost all runtime type guards. No more if (!user && !user.role==="...") throw ... at the top of all your functions!

The `narrow()` function:

-   **Does nothing at runtime** - It's just a pass-through function
-   **Applies type constraints** - When used in `deps`, it narrows the resource type
-   **Enables compile-time safety** - TypeScript ensures the resource satisfies the constraint

```typescript
type Session = { user: User; now: Date }

// Session resource can hold any object of type Session
const SessionSupplier = market.offer("session").asResource<Session>()

// But admin dashboard requires admin session
const AdminDashboardSupplier = market.offer("admin-dashboard").asProduct({
    // Use the narrow() function to specify that this service requires an admin session
    suppliers: [narrow(SessionSupplier)<{ user: { role: "admin" } }>()],
    // The factory automatically gets the narrowed type
    factory: ($: $<[typeof narrow<{ user: { role: "admin" } }>(SessionSupplier)]>) => {
        const session = $(SessionSupplier.name)
        // No runtime check needed - TypeScript ensures session.user.role === "admin"
        return {
            // Some admin only methods
        }
    }
})

// This will create a type error
const adminDashboard = AdminDashboardSupplier.assemble(
    index(
        SessionSupplier.pack({
            user: { id: "user123", role: "user" }, // TypeScript error: role "user" not assignable to role "admin"
            now: new Date()
        })
    )
)

//This will succeed
const adminDashboard = AdminDashboardSupplier.assemble(
    index(
        SessionSupplier.pack({
            user: { id: "admin456", role: "admin" }, // ✅ Compiles successfully
            now: new Date()
        })
    )
)
```

#### Context switching

Use `product.reassemble()` to load a product in a different context. Example use cases: Impersonate another user, or run a query in a db transaction instead of the default db session.
The parent supplies in `$` are preserved, you just need to overwrite what you want to change or add.

```typescript
// Wallet product that depends on user session
const WalletSupplier = market.offer("wallet-service").asProduct({
    suppliers: [SessionSupplier],
    factory: ($: $<[typeof SessionSupplier]>) => {
        const session = $(SessionSupplier.name)

        return (amount: number) => {
            // Add entry into the current user's wallet
            // ...
        }
    }
})

// Money transfer product that switches contexts
const TransferSupplier = market.offer("transfer").asProduct({
    suppliers: [WalletSupplier, SessionSupplier],
    factory: ($: $<[typeof WalletSupplier, typeof SessionSupplier]>) => {
        function deductFromSender(amount: number) {
            const session = $(SessionSupplier.name)
            // Deduct from current user's wallet
        }

        return (toUserId: string, amount: number) => {
            // First, deduct from sender's wallet (current context)
            deductFromSender(amount)

            const fromUserId = $(SessionSupplier.name).user.id

            // Then, switch to recipient's context to accept the transfer
            const recipientWallet = $[WalletSupplier.name].reassemble(
                index(
                    SessionSupplier.pack({
                        user: { id: toUserId, role: "user" },
                        now: new Date()
                    })
                )
            )

            // Accept the transfer in recipient's wallet
            recipientWallet.unpack()(amount)

            return { success: true, amount, fromUserId, toUserId }
        }
    }
})
```

### Memoization and Performance

Memoization is not enabled by default. To enable it, you must provide a `memoFn` when creating your market. This function will be used to wrap the `unpack` method of each product. You can use any memoization library you like.

```typescript
import { createMarket } from "supplier"
import memo from "memoize"

// To enable memoization, provide a memoFn to createMarket
const market = createMarket({
    memoFn: ({ unpack }) => memo(unpack)
})

const ExpensiveProductSupplier = market.offer("expensive").asProduct({
    factory: () => {
        console.log("This will only run once per assembly context")
        return performExpensiveComputation()
    }
})

const ConsumerProductSupplier = market.offer("consumer").asProduct({
    suppliers: [ExpensiveProductSupplier],
    factory: ($) => {
        const result1 = $(ExpensiveProductSupplier.name) // Computed
        const result2 = $(ExpensiveProductSupplier.name) // Memoized
        const result3 = $(ExpensiveProductSupplier.name) // Memoized

        return { result1, result2, result3 } // All identical
    }
})

// You can also disable memoization for specific products
const NonMemoizedProductSupplier = market.offer("non-memoized").asProduct({
    factory: () => new Date().getTime(),
    memo: false
})
```

### Advanced Caching and Invalidation

Supplier provides a powerful caching mechanism that allows you to bring your own caching strategy and intelligently invalidate dependencies. This is managed through `memoFn` and `recallFn` when creating a market.

#### Custom Cache Implementation

Here's how you can implement a custom cache using a simple `Map`:

```typescript
import { createMarket } from "supplier"

// Create a simple cache using Map
const cache = new Map<string, any>()

const market = createMarket({
    memoFn: ({ id, unpack }) => {
        return () => {
            if (cache.has(id)) {
                return cache.get(id)
            }
            const product = unpack()
            cache.set(id, product)
            return product
        }
    },
    recallFn: (product) => {
        // Clear cache entries for this product when recalled
        cache.delete(product.id)
    }
})
```

-   `memoFn` wraps the `unpack` function of a product. It receives the product's unique `id`. You can use this `id` as a cache key.
-   `recallFn` is called when a product needs to be invalidated. It receives the `product` instance, and you can use `product.id` to remove it from your cache.

#### Recalling Products

You can manually invalidate a product's cache using the `.recall()` method on an assembled product. This will also recursively invalidate all products that depend on it.

```typescript
const UserDataSupplier = market.offer("user-data").asProduct({
    factory: async () => fetchUserData()
})

const UserDashboardSupplier = market.offer("user-dashboard").asProduct({
    suppliers: [UserDataSupplier],
    factory: ($) => {
        const userData = $(UserDataSupplier.name)
        return createDashboard(userData)
    }
})

const dashboardProduct = UserDashboardSupplier.assemble({})

// initial fetch
await dashboardProduct.unpack()

// ... user performs an action that changes their data ...

// now we need to refresh the data.
// This will clear the cache for UserDataSupplier and UserDashboardSupplier
dashboardProduct.recall()

// this will re-fetch the user data upon next access
await dashboardProduct.unpack()
```

By default, all products created in a market with a `recallFn` are `recallable`. You can opt-out a specific product from being recalled by setting `recallable: false`.

```typescript
const NonRecallableSupplier = market.offer("non-recallable").asProduct({
    factory: () => "some static value",
    recallable: false // This product's cache will not be cleared by recall()
})
```

### Optimistic Mutations

Optimistic mutations allow you to provide immediate feedback to users while heavy computations happen in the background. This is perfect for scenarios where you want to show a loading state or optimistic result instantly.

#### Basic Optimistic Updates

```typescript
const UserProfileSupplier = market.offer("user-profile").asProduct({
    factory: async () => {
        // Simulate slow API call
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return { name: "John Doe", email: "john@example.com" }
    }
})

const profileProduct = UserProfileSupplier.assemble({})

// Set optimistic value for immediate UI update
profileProduct.setOptimistic({ name: "John Doe", email: "john@example.com" })

// Returns immediately - no waiting!
const profile = profileProduct.unpack()
console.log(profile.name) // "John Doe"

// Background computation happens automatically
// After 1 second, the factory completes and updates the internal state
```

#### Form Submissions with Optimistic Updates

```typescript
const FormSubmissionSupplier = market.offer("form-submission").asProduct({
    factory: async (formData) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000))
        return { success: true, id: "form-123" }
    }
})

const submissionProduct = FormSubmissionSupplier.assemble({})

// User submits form
const handleSubmit = async (formData) => {
    // Show optimistic success immediately
    submissionProduct.setOptimistic({ success: true, id: "pending" })

    // UI updates instantly with "Form submitted successfully!"
    const result = submissionProduct.unpack()

    // Background processing continues
    // When complete, the optimistic value is automatically replaced
}
```

#### Optimistic Updates with Error Handling

```typescript
const DataUpdateSupplier = market.offer("data-update").asProduct({
    factory: async (data) => {
        try {
            const response = await api.updateData(data)
            return { success: true, data: response }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
})

const updateProduct = DataUpdateSupplier.assemble({})

const handleUpdate = async (data) => {
    // Show optimistic success
    updateProduct.setOptimistic({ success: true, data })

    // UI shows success immediately
    const result = updateProduct.unpack()

    // If the background computation fails, the optimistic value is cleared
    // and the error result is returned on next access
    // You can handle this by checking result.success
}
```

#### Integration with React and Other Frameworks

```typescript
// React example
function UserProfile() {
    const [profile, setProfile] = useState(null)

    useEffect(() => {
        const profileProduct = UserProfileSupplier.assemble({})

        // Set optimistic value for immediate render
        profileProduct.setOptimistic({ name: "Loading...", email: "..." })

        // Access the product
        const result = profileProduct.unpack()
        setProfile(result)

        // Background computation will update the product
        // You can poll or use a callback to get the final result
    }, [])

    return <div>{profile?.name}</div>
}
```

**Important Notes:**

-   Only one optimistic value can be set at a time per product
-   Setting a new optimistic value throws an error if one is already set
-   Use `product.recall()` to clear optimistic values and force recomputation
-   Optimistic values are automatically cleared when background computation completes
-   This feature works best with `recallable: true` products

## 🌐 Website & Examples

**[supplier-js.github.io/supplier](https://supplier-js.github.io/supplier)**

## License

MIT © [Supplier.js](https://github.com/supplier-js/supplier)

## Contributing

Issues and pull requests welcome on [GitHub](https://github.com/supplier-js/supplier).
