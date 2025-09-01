<style>
details summary {
    font-size: 1.2em;
    font-weight: bold;
    cursor: pointer;
}
</style>

# supplier

Let the market and the supply chain deliver the resources and services ("products") you need, where you need them.

A powerful, type-inferred, and hyper-minimalistic library for Context Propagation, Reactive Caching, Optimistic Mutations, Waterfall Management, and Dependency Injection (DI).

## Background

I created this library to solve multiple pain points I had while working with complex dependency graphs and deeply nested function call chains in applications. The more decoupled, dry and SOLID your application becomes, the more the dependency graph becomes hard to manage, and the easier the chance of creating a chain of functions that call each other in a deeply nested fashion. And when that happens, problems like prop-drilling, context propagation, waterfall management (managing what functions to preload or not for optimization) and caching management (determining what functions and results to uncache when one result is invalidated) become very tedious, and no solution really exist to address them all at once, even if the root cause of all of them is the same: deeply nested function calls and dependency graphs.

I encountered these pain points working on a big React application, trying to convert my deep component tree to server components without the help of React Context to ease the pains of prop-drilling :'(. But the problems are more general and arise in other contexts, like complex backends with intertwined data dependencies, so this package is completely framework-agnostic.

It is inspired by Dependency Injection frameworks (DI), but don't be scared! I removed all OOP paradigms, all classes, decorators, annotations, reflect-metadata and compiler magic, and I added full type-safety and type-inference. I had the intuition that DI got this complex in OOP world because of the absence of first-class functions and Typescript in the languages it was most used. But TS DI frameworks currently on the market seem to have been built by imitating how they were built for languages without first-class functions. And I get why, even with first-class functions, DI is a hard and confusing pattern, full of potential recursions and circular dependencies. But once you manage to untangle all of that, it becomes really powerful! I only created this library to solve prop-drilling and context propagation initially, but then I kept seeing pain points of other developers and even frameworks that I could solve easily with my library, so I added caching, preloading and optimistic mutations.

STILL IN VERY UNSTABLE, PRE-ALPHA, PLEASE DON'T INSTALL VERSIONS v0.0.x

## Features

### ☀️ **General**

-   **Fully typesafe and type-inferred** - Full TypeScript support with compile-time circular dependency detection.
-   **Fluent and expressive API** - Learn in minutes, designed for both developers and AI usage.
-   **Fully framework-agnostic** - Complements back-end and front-end frameworks.

### 🔧 **Dependency Injection**

-   **Functions only** - No OOP, classes, decorators, or compiler magic,
-   **Stateless Injection** - Dependencies are resolved via closures, not state.
-   **Maximal colocation** - Declare most of your injections (supplies) right next to your functions, not at the entry-point. No compostion root.
-   **Runtime overrides** - Easily mock dependencies for testing.

### 📦 **Context Propagation**

-   **Shared context** - Assemble the context once at the entry point, access everywhere without prop-drilling.
-   **Smart memoization** - Dependencies injected once per context for optimal performance.
-   **Context switching** - Add or override context anywhere in the call stack.

### ⚡ **Waterfall Management**

-   **Eager loading** - Use `preload: true` for immediate initialization on `assemble()` call
-   **Lazy loading** - Use `preload: false` for on-demand initialization when first accessed.
-   **Performance control** - Optimize loading in deeply nested dependency trees like React component hierarchies

## Installation

```bash
npm install supplier
```

## Quick Start

### Create a market

All resources and products are created from a `market`, which acts like a container in DI.

```typescript
import { createMarket } from "supplier"

const market = createMarket()
```

### Creating Product (aka Service) Suppliers

Product suppliers are factory functions that can depend on other resources or product suppliers. Factory functions can return anything (values, functions, etc.).

```typescript
import { createMarket, type $ } from "supplier"

const market = createMarket()

// A simple product with no dependencies.
// "logger" is the unique trademark name to identify this product on the market.
const LoggerSupplier = market.offer("logger").asProduct({
    factory: ($) => (message: string) => console.log(`[LOG] ${message}`)
})

// A product that depends on another product and a resource.
const ApiSupplier = market.offer("api").asProduct({
    // Simply inject dependencies in-place! Simple, but this pattern unlocks a lot of unforeseen power!
    // All product dependencies get automatically injected, but Resource dependencies
    // will need to be supplied using assemble() at the entrypoint of your app
    suppliers: [LoggerSupplier, ConfigSupplier], // ConfigSupplier is defined in the next section
    // You can view $ as a shorthand for supplies.
    factory: ($) => {
        return {
            async get(path: string) {
                const config = $(ConfigSupplier.name) //Access any supply using $()
                const logger = $(LoggerSupplier.name)
                logger(`GET ${config.apiUrl}${path}`)
                // ... implementation
            }
            // ... other methods
        }
    }
})
```

<details>
<summary> asProduct() API
</summary>

```typescript
const asProduct = ({
    factory:
        "Function that creates the product value using injected supplies" as (
            $: SUPPLIES
        ) => VALUE,
    suppliers:
        "Array of suppliers this product depends on (defaults to empty array)" as Supplier[],
    preload:
        "Whether to eagerly initialize this product when assemble() is called (defaults to false)" as boolean,
}) => ProductSupplier

```

</details>

<details>
<summary> Product supplier API
</summary>

```typescript
const ProductSupplier = {
    name: "Trademark name (type) of the product this supplier provides" as string,
    suppliers: "Array of other suppliers this product depends on" as Supplier[],
    assemble(toSupply: $): Product ("Assembles the product with the required resources and dependencies"),
    preload: "Whether to eagerly initialize this product when assemble() is called" as boolean,
    pack(value: VALUE): Product ("Creates a product instance with a predefined value, bypassing the factory"),
    // Internals
    _dependsOnOneOf(overrides: $): boolean ("Checks if any dependencies need resupplying"),
    _product: "Flag for discriminated unions with resource suppliers" as true
}
```

</details>

<details>
<summary> Product  API
</summary>

```typescript
const product = {
    cacheKey: "Unique id for this instance. Use for your caching" as string,
    name: "Same as productSupplier.name" as string,
    unpack(): VALUE ("Returns the computed value from the factory or optimistic value"),
    pack(value: VALUE): Product ("Same as productSupplier.pack(), to create a new product instance with a predefined value"),
    reassemble(overrides: SupplyMap): Product ("Reassembles the product with new context overrides"),
}
```

</details>S

### Creating Resources

Resources are simple values that can be assembled into products in a type-safe way:

```typescript
import { createMarket } from "supplier"

const market = createMarket()

// Create a resource supplier with a type constraint
const ConfigSupplier = market.offer("config").asResource<{
    apiUrl: string
    timeout: number
}>()

// Instantiate a resource with a value
const configResource = ConfigSupplier.pack({
    apiUrl: "https://api.example.com",
    timeout: 5000
})

console.log(configResource.name) // "config"
console.log(configResource.unpack().apiUrl) // "https://api.example.com"
```

<details>
<summary> Resource Supplier API
</summary>

```typescript
const ResourceSupplier = {
    name: "Trademark name (type) of the resource this supplier provides" as string,
    pack(value: CONSTRAINT): Resource ("Instantiates a resource of this type of value `value`."),
    // Internals
    _resource: "Flag for discriminated unions with product suppliers" as true
    _constraint: "Store for the constraint needed as reference for further type manipulations" as CONSTRAINT
}
```

</details>
<details>
<summary> Resource  API
</summary>

```typescript
const resource = {
    id: "Unique id for this instance. Used for caching" as string,
    name: "Same as resourceSupplier.name" as string,
    pack(value: CONSTRAINT): Resource ("Same as resourceSupplier.pack(), to create a new resource of type `name` with a new value"),
    unpack(): CONSTRAINT ("Returns the value")
}
```

</details>

### Assembling at the entry point

You pass to the `assemble` method of a product supplier all resources it and the dependencies it needs (recursively). Typescript helps you if you miss any.

Here is how to instantiate the ApiSupplier defined above:

```typescript
//LoggerSupplier's product is supplied automatically, but ConfigSupplier's resource needs to be supplied in assemble at the entry-point. Resources can be viewed as the "context" of your app: global values that need to be accessed anywhere, like the db client, or the http request.
const apiProduct = ApiSupplier.assemble({
    [ConfigSupplier.name]: ConfigSupplier.pack({
        apiUrl: "https://api.example.com",
        timeout: 5000
    })
})

// Use the resulting product
await apiProduct.unpack().get("/users")
```

You can use `index()` utility as a shorthand to easily transform a list of resources to an object `assemble()` can easily typecheck.

```typescript
// This is the same as above
const api = ApiSupplier.assemble(
    index(
        ConfigSupplier.pack({
            apiUrl: "https://api.example.com",
            timeout: 5000
        })
    )
)
```

### $ (Supplies) Object API

The `$` callable object provides access to a product's supplies. `$[supplyName]` accesses the resource or product (see Product and Resource API above), and `$(supplyName)` is a shorthand to access the value packed in the resource or product. To remember, I view `$[]` as accessing the pack, the "box", that contains the value ([] looks like a box).

```typescript
const MyProductSupplier = market.offer("my-product").asProduct({
    suppliers: [SomeProductSupplier],
    factory: ($) => {
        // Both of these are equivalent:
        const product = $(SomeProductSupplier.name) // Function call
        const sameProduct = $[SomeProductSupplier.name].unpack() // Property access
        //...
    }
})
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

#### Eager Preloading

For performance-critical scenarios and waterfall loading management, you can enable eager preloading:

```typescript
// DatabaseSupplier will be initialized immediately when assemble() is called
const DatabaseSupplier = market.offer("database").asProduct({
    factory: () => createDatabaseConnection(),
    preload: true // Eager initialization
})

const SomeProductSupplier = market.offer("product").asProduct({
    suppliers: [DatabaseSupplier],
    factory: ($) => {
        // DatabaseSupplier and CacheSupplier are already initialized,
        // so the $() call is instantaneous
        return someFn($(DatabaseSupplier.name))
    }
})

// Both DatabaseSupplier starts initializing immediately
const product = SomeProductSupplier.assemble()
```

#### Type narrowing

The `narrow()` function allows you to specify additional type constraints on resources. This is very powerful, as it allows you to remove almost all runtime type guards. No more if (!user && !user.role==="...") throw ... at the top of all your functions!

```typescript
type Session = { user: User; now: Date }

// Session resource can hold any object of type Session
const SessionSupplier = market.offer("session").asResource<Session>()

// But admin dashboard requires admin session
const AdminDashboardSupplier = market.offer("admin-dashboard").asProduct({
    // Use the narrow() function to specify that this service requires an admin session
    // Does nothing at runtime, just a pass-through function.
    suppliers: [narrow(SessionSupplier)<{ user: { role: "admin" } }>()],
    // The factory automatically gets the narrowed type
    factory: ($) => {
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

#### Context switching (Reassembling)

Use `product.reassemble()` to load a product in a different context. Example use cases: Impersonate another user, or run a query in a db transaction instead of the default db session.
The parent supplies in `$` are preserved, you just need to overwrite what you want to change or add.

```typescript
const CreateWalletEntrySupplier = market
    .offer("create-wallet-entry")
    .asProduct({
        suppliers: [SessionSupplier],
        factory: ($) => {
            const session = $(SessionSupplier.name)

            return (amount: number) => {
                // Add entry into the current user's wallet
                // ...
            }
        }
    })

// Money transfer product that switches contexts
const TransferSupplier = market.offer("transfer").asProduct({
    suppliers: [CreateWalletEntrySupplier, SessionSupplier],
    factory: ($) => {
        return (toUserId: string, amount: number) => {
            // First, deduct from sender's wallet (current context)
            $(CreateWalletEntry.name)(-amount)

            // Then, switch to recipient's context to accept the transfer
            const createRecipientWalletEntryProduct = $[
                CreateWalletEntrySupplier.name
            ].reassemble(
                index(
                    SessionSupplier.pack({
                        user: { id: toUserId, role: "user" },
                        now: new Date()
                    })
                )
            )

            // Accept the transfer in recipient's wallet
            createRecipientWalletEntryProduct.unpack()(amount)
        }
    }
})
```

#### Recalling Products

You can manually invalidate a product's internal cache using the `.recall()` method on an assembled product. This will also recursively recall all products that depend on it. All recalled products in the dependency chain will call their supplier's `onRecall()` function (if provided), or the global `onRecall()` if provided on the createMarket() call. You implement the onRecall function yourself to invalidate your own cache.

```typescript
const SomeProductSupplier = market.offer("some-product").asProduct({
    factory: ($) => {
        const userData = $(UserDataSupplier.name)
        return createDashboard(userData)
    }
})

const someProduct = SomeProductSupplier.assemble({})

// initial fetch
await dashboardProduct.unpack()

// ... user performs an action that changes their data ...

// now we need to refresh the data.
// This will clear the cache for UserDataSupplier and UserDashboardSupplier
dashboardProduct.recall()

// this will re-fetch the user data upon next access
await dashboardProduct.unpack()
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
