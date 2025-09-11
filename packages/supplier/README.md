<style>
details summary {
    font-size: 1.2em;
    font-weight: bold;
    cursor: pointer;
}
</style>

# supplier

Let the market and the supply chain deliver the resources and services ("products") you need, where you need them.

Supplier is a small TypeScript library that helps you build a Dependency Injection Supply Chain (DISC) for your app: a new construct that provides full Dependency Injection and Context Propagation capabilities without statefulness. Think of it as Containerless DI.

# The Problem

DI containers have always felt abstract, technical, almost magical in how they work. Like a black box, you often have to dig into the source code of a third-party library to understand how data flows in your own application. It feels like you lose control of your own data when you use one, and your entire app becomes dependent on the container to even work. Supplier aims to make DI cool again! The pattern has real power, even if current implementations on the open-source market hide that power under a lot of complexity.

DI was complex to achieve in OOP world because of the absence of first-class functions in OOP languages. But in modern functional languages, DI should be easier, since DI itself is a functional concept. However, TypeScript DI frameworks currently available seem to have been built by imitating how they were built in OOP languages...

The problem DI was solving in OOP world still exists in the functional world. In OOP world, DI helped inject data and services freely within deeply nested class hierarchies and architectures. In the functional world, DI achieves the same: inject data and services freely in deeply nested function calls. Deeply nested function calls naturally emerge when trying to decouple and implement SOLID principles in medium to highly complex applications. Without DI, you cannot achieve maximal decoupling. Even if in principle you can reuse a function elsewhere, the function is still bound in some way to the particular call stack in which it finds itself, simply by the fact that it can only be called from a parent function that has access to all the data and dependencies it needs.

DISCs can do everything containers do, but in a more elegant, simpler, and easier-to-reason-about manner.

<details>
<summary>A framework-agnostic React Context, usable for both Client and Server Components (Advanced)</summary>

Supplier also solves the problem of Context Propagation, so it can be used in React applications as an alternative to React Context, given a little initial refactoring. Notably, it can be used in both Client and Server components to avoid prop-drilling through multiple layers of nested components. Parallels can be drawn between React Context's API and Supplier's API. createContext() is handled by asResource() and asProduct() registration methods in Supplier. Context providers are modeled by the assemble()/reassemble() methods, and finally useContext() is analogous to the $() function. The only difference between the two is that $() is passed via the factory function's arguments, whereas useContext() is imported from the global scope. This means React Context implements the Service Locator pattern, whereas Supplier implements full DI. This enables the statelessness of Supplier: React Context must read its data as state stored somewhere in the global scope, whereas Supplier's products simply receive their dependencies in their function arguments.

</details>

# Features

☀️ General

-   Fully typesafe and type-inferred - Full TypeScript support with compile-time circular dependency detection.
-   Fluent and expressive API - Learn in minutes, designed for both developers and AI usage.
-   Fully framework-agnostic - Complements both back-end and front-end frameworks.

🔧 Dependency Injection

-   Functions only - No OOP, classes, decorators, anntations, or compiler magic.
-   Declarative, immutable, functionally pure.
-   Stateless - Dependencies are resolved via closures, not state. Some memoized state is kept for validation and optimization purposes only.
-   Auto-wired - All products are built by the Supply Chain and resolve their dependencies automatically.
-   Maximal colocation - All product dependencies (suppliers) are registered right next to the function that uses them, not at the entry point.
-   Runtime overrides - Use pack() to mock dependencies for testing.
-   Feature swapping - Use try() to "swap" a product with another of the same type, but requiring different supplies. Perfect for prototyping, feature flagging, A/B testing, etc.

📦 Context Propagation

-   Shared context - Assemble the context once at the entry point, access everywhere without prop-drilling.
-   Smart memoization - Dependencies injected once per assemble() context for optimal performance.
-   Context switching - Add or override context anywhere in the call stack using reassemble().

⚡ Waterfall Management

-   Eager loading - Use preload: true for immediate initialization of a product on entry point's assemble() call.
-   Lazy loading - Use preload: false for on-demand initialization of a product when its value is first accessed.

🧪 Testing and Mocking

-   You can mock any product using pack(), which will use the provided value directly, bypassing the product's factory.
-   For more complex mocks which would benefit from a factory, see prototype() below.

🚀 Prototyping and A/B testing

-   Use `prototype()` to create alternative implementations of a product, that may depend on different suppliers than the original.
-   Prototypes' factories must return values of the same type than the original product's factory.
-   Define prototypes to `try()` at the entry-point of your app
-   For example, you can easily try different versions of a UI component for A/B testing.

## Installation

```bash
npm install supplier
```

## Basic usage

`supplier` provides a functional take on Dependency Injection. You define your application's dependencies as `resources` (data) and `products` (services), and then `assemble` them at your application's entry point.

### 1. Create a Market

All suppliers are created from a `market`, which creates a scope shared by Resource and Product Suppliers.
You'll usually create one market per application. Markets register the names of the resources and products it `offers` so that no name conflicts occur. The name registry is the only state the market manages.

```tsx
import { createMarket } from "supplier"

const market = createMarket()
```

### 2. Define Resources

Resources represent the data and context your application needs, like configuration or user sessions. You define a `ResourceSupplier` and then `.pack()` it with a value at runtime. The value can be anything you want, even functions. Just specify its type.

```tsx
// Define a supplier for the session
const SessionSupplier = market.offer("session").asResource<{
    userId: string
}>()

const SessionResource = SessionSupplier.pack({
    userId: "some-user-id"
})

const session = SessionResource.unpack()
```

### 3. Define Products

Products are your application's services, components or features. They are factory functions that can depend on other products or resources. Dependencies are accessed via the `$` object passed to the `factory` as argument. $ is a shorthand for `supplies`, but it is just a suggestion, you can name the factory arg however you want. I like $ because it is short and will be used a lot throughout the application.

Use `$[name]` to access the resource or product stored in supplies, and `$(name)` as a shorthand to access the unpacked value of the product or resource directly. As a mnemonic, `$[]` looks like a box, so it accesses the packed, the "boxed", resource or product.

```tsx
const UserSupplier = market.offer("user").asProduct({
    suppliers: [SessionSupplier, DbSupplier], // Depends on session and db resources.
    factory: ($) => {
        const session = $[SessionSupplier.name].unpack() //Access the session value
        const session = $(SessionSupplier.name) // Shorthand for the above.
        const db = $(DbSupplier.name)
        return db.getUser(session.userId) // query the db to retrieve the user.
    }
})
```

### 4. Define your Application

Your Application is just a `product` like the other ones. It's the main product at the top of the supply chain.

```tsx
const AppSupplier = market.offer("app").asProduct({
    suppliers: [UserSupplier], // Depends on User product
    factory: ($) => {
        // Access the user value. Its type will be automatically inferred from UserSupplier's factory's
        // inferred return type.
        const user = $(UserSupplier.name)
        return <h1>Hello, {user.name}! </h1>
    }
})
```

### 5. Assemble at the Entry Point

At your application's entry point, you `assemble` your main AppProduct, providing just the resources (not the products) requested recursively by the AppProduct's suppliers chain. Typescript will tell you if any resource is missing.

```tsx
const db = //...Get your db connection
const req = //...Get the current http request

// Assemble the App, providing the Session and Db resources.
const AppProduct = AppSupplier.assemble({
    [SessionSupplier.name]: SessionSupplier.pack({
            userId: req.userId
    }),
    [DbSupplier.name]: DbSupplier.pack(db)
})

const res = AppProduct.unpack()
// Return or render res...
```

The flow of the assemble call is as follows: raw data is obtained, which is provided to ResourceSuppliers using pack(). Then those resources are supplied to AppSupplier's suppliers recursively, which assemble their own product, and pass them up along the supply chain until they reach AppSupplier, which assembles the final AppProduct. All this work happens in the background, no matter the complexity of your application.

To simplify the assemble() call, you should use the index() utility, which transforms an array like
`...[resource1, resource2]` into an indexed object like
`{[resource1.name]: resource1, [resource2.name]:resource2}`. I unfortunately did not find a way to merge index() with assemble() without losing assemble's type-safety, because typescript doesn't have an unordered tuple type.

```tsx
import { index } from "supplier"

const AppProduct = AppSupplier.assemble(
    index(
        SessionSupplier.pack({
            userId: req.userId
        }),
        DbSupplier.pack(db)
    )
)
```

## Advanced API

The `narrow()` function allows you to create variants of resources with a narrower type.

```tsx
type Session = { user: User; now: Date }

// Session resource can hold any object of type Session
const SessionSupplier = market.offer("session").asResource<Session>()
const AdminSessionSupplier = SessionSupplier.narrow<{
    user: { role: "admin" }
}>()

// But admin dashboard requires admin session
const AdminDashboardSupplier = market.offer("admin-dashboard").asProduct({
    suppliers: [AdminSessionSupplier],
    // The factory automatically gets the narrowed type
    factory: ($) => {
        // No runtime check needed - TypeScript ensures session.user.role === "admin"
        const session = $(AdminSessionSupplier.name)
        return <h1>Admin Dashboard</h1>
    }
})

const AppSupplier = market.offer("admin-dashboard").asProduct({
    suppliers: [SessionSupplier, AdminDashboardSupplier],
    // The factory automatically gets the narrowed type
    factory: ($) => {
        // No runtime check needed - TypeScript ensures session.user.role === "admin"
        const session = $(AdminSessionSupplier.name)
        return <h1>Admin Dashboard</h1>
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

### Context Switching with `reassemble()`

Any product can be `reassembled` with new resources deeper in the call stack. This is useful for changing the context, like impersonating a different user. You don't need to provide all resources needed, just the ones you want to add/overwrite. The original resources from the `assemble()` call will be reused if not overwritten.

```tsx
const SendMoneySupplier = market.offer("send-money").asProduct({
    suppliers: [WalletEntrySupplier, SessionSupplier],
    factory: ($) => {
        return (toUserId: string, amount: number) => {
            const walletEntry = $(WalletEntrySupplier.name)

            walletEntry(-amount) // Runs in the current session's account

            const targetWalletEntry = $[WalletEntrySupplier].reassemble(
                index(SessionSupplier.pack({ userId: toUserId }))
            ).unpack()

            targetWalletEntry(amount) // Runs in the receiver's account.

            // With such a context swithing capability, it is possible to write a much simpler and safer
            // ReceiveMoneySupplier implementation, that just needs to check that the current session running the
            // function owns the account it is adding an entry to..
        }
    }
})
```

## Experimentation: Prototypes and Feature Flags

This is where `supplier` evolves beyond traditional DI. You can create variations of your products (`prototypes`) and swap them in at runtime (`try`), making it easy to implement feature flags, A/B tests, and other experiments.

### 1. Create a Variant with `.prototype()`

A `.prototype()` is a new, isolated implementation of a product. It's a safe way to build a new version of a feature without affecting the original.

```tsx
const Greeter = market.offer("greeter").asProduct({
    factory: () => ({ greet: (name: string) => `Hello, ${name}!` })
})

// Create an "enthusiastic" version of the greeter
const EnthusiasticGreeter = Greeter.prototype({
    factory: () => ({ greet: (name: string) => `Hello, ${name}!!! 🎉` }),
    suppliers: [],
    preload: false
})
```

### 2. Swap Implementations with `.try()` for Feature Flags

Use `.try()` on a product to create a variant of it that uses different underlying dependencies. This is your feature flag/A-B lever at the composition level.

```tsx
const Notifier = market.offer("notifier").asProduct({
    suppliers: [Greeter], // Depends on the base Greeter
    factory: ($) => ({
        sendGreeting: (name: string) => {
            const greeter = $(Greeter.name)
            console.log("Sending greeting...")
            console.log(greeter.greet(name))
        }
    })
})

// In your application, check a feature flag to decide which notifier to use
const useEnthusiasticGreeting = true // This could come from your config

const NotifierToUse = useEnthusiasticGreeting
    ? Notifier.try(EnthusiasticGreeter) // This version of Notifier will use the prototype
    : Notifier

// The assembly is the same, regardless of which version is used
const notifier = NotifierToUse.assemble({})
notifier.unpack().sendGreeting("world")

// If the flag is true, it logs:
// Sending greeting...
// Hello, world!!! 🎉
```

## Advanced Patterns

### Type Narrowing with `.narrow()`

For greater type safety, you can use `.narrow()` on a `ResourceSupplier` to require a more specific version of that resource.

```tsx
const Session = market
    .offer("session")
    .asResource<{ user: { role: "user" | "admin" } }>()

// Create a narrowed supplier that requires an admin
const AdminSession = Session.narrow<{ user: { role: "admin" } }>()

const AdminDashboard = market.offer("admin-dashboard").asProduct({
    suppliers: [AdminSession], // Now requires the admin session
    factory: ($) => {
        const session = $(AdminSession.name)
        // TypeScript knows session.user.role is "admin"
        return `Welcome, admin!`
    }
})
```

### Mocking in Tests with `.pack()`

While `.prototype()` and `.try()` are great for complex test scenarios, the simplest way to mock a dependency is to use `.pack()` during assembly. This bypasses the factory function entirely and provides a direct value.

```tsx
// In your vitest test file:
it("should use the mock api client", async () => {
    const mockApiClient = {
        get: async (path: string) => ({ mocked: true, path })
    }

    // Assemble the feature with a mocked ApiClient
    const featureProduct = Feature.assemble(
        index(ApiClient.pack(mockApiClient))
    )

    const result = await featureProduct.unpack().fetchData()
    // expect(result).toEqual({ mocked: true, path: "/data" });
})
```

## API Reference

The full API reference can be found in the original `README.md`. The core concepts are explained above.
_The user can refer to the detailed API documentation that was previously generated if needed._

## License

MIT
