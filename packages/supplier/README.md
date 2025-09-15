# supplier

Functional, <u>fully type-safe</u> and <u>stateless</u> dependency and Context injector for TypeScript. Enter the containerless DI revolution! No OOP, reflect-metadata, decorators, annotations or compiler magic, just functions and closures!

## Why Supplier?

✅ **Fully type-safe** - Compile-time dependency validation and circular dependency detection  
✅ **No magic** - Just functions and closures, no OOP, reflect-metadata, decorators, annotations or compiler magic.
✅ **Framework agnostic** - Works everywhere TypeScript works  
✅ **Testing friendly** - Easy mocking and dependency swapping  
✅ **Performance focused** - Smart memoization, lazy loading, tree-shakeable  
✅ **Stateless** - Dependencies resolved via closures, not global state

## Installation

```bash
npm install supplier
```

## When to Use Supplier

-   **Complex TypeScript applications** with deep function call hierarchies
-   **Avoiding prop-drilling** in React (works in both Client and Server Components)
-   **Microservices** that need shared context propagation
-   **Testing scenarios** requiring easy mocking and dependency swapping
-   **A/B testing**, feature flagging and prototyping.
-   **Any project** wanting DI without the complexity of traditional containers

## Performance

-   **Bundle size**: ~15KB minified, tree-shakeable
-   **Tree-shakable and code-splittable**: Helps you create hyper-specialized suppliers: One function or piece of data per supplier
-   **Memory usage**: Smart memoization prevents duplicate dependency resolution
-   **Optimal waterfalls**: Preloads as much as it can to prevent waterfalls (customizable with `preload: false`)

## Quick Example

```ts
import { createMarket, index } from "supplier"

// 1. Create a market
const market = createMarket()

// 2. Define data (resources) and services (products)
const sessionSupplier = market.offer("session").asResource<{ userId: string }>()
const todosDbSupplier = market.offer("todosDb").asProduct({
    suppliers: [],
    factory: () => new Map<string, string[]>() // Simple in-memory DB
})
const addTodoSupplier = market.offer("addTodo").asProduct({
    suppliers: [sessionSupplier, todosDbSupplier],
    factory: ($) => (todo: string) => {
        const session = $(sessionSupplier)
        const db = $(todosDbSupplier)
        const userTodos = db.get(session.userId) || []
        db.set(session.userId, [...userTodos, todo])
        return db.get(session.userId)
    }
})

const session = { userId: "user123" }

// 3. Assemble and use
const addTodo = addTodoSupplier
    .assemble(index(sessionSupplier.pack(session)))
    .unpack()

console.log(addTodo("Learn Supplier")) // ["Learn Supplier"]
console.log(addTodo("Build app")) // ["Learn Supplier", "Build app"]
```

## Intuitive, opinionated terminology

The ideas of DI make more sense to me when tied to the mental model of a supply chain. You split your code into fully-decoupled hyper-specialized suppliers, that exchange their resources and products in a free-market like fashion to assemble new products with ever-growing complexity.

Here's an equivalence table to more classical, technical terms

| Term                        | Classical DI equivalent |
| --------------------------- | ----------------------- |
| **createMarket()**          | createContainer()       |
| **Resource**                | Value service           |
| **Product**                 | Factory service         |
| **Supplier**                | Resolver                |
| **assemble()**              | resolve()               |
| **supplies (abbrev. to $)** | app/container           |

## Full features list

☀️ General

-   Fully typesafe and type-inferred - Full TypeScript support with compile-time circular dependency detection.
-   Fluent and expressive API - Learn in minutes, designed for both developers and AI usage.
-   Fully framework-agnostic - Complements both back-end and front-end frameworks.

🔧 Dependency Injection

-   Functions only - No OOP, classes, decorators, annotations, or compiler magic.
-   Declarative, immutable, functionally pure.
-   Stateless - Dependencies are resolved via closures, not state. Some memoized state is kept for validation and optimization purposes only.
-   Auto-wired - All products are built by the Supply Chain and resolve their dependencies automatically.
-   Maximal colocation - All product suppliers are registered right next to the function that uses them, not at the entry point.

📦 Context Propagation

-   Shared context - Assemble the context once at the entry point, access everywhere without prop-drilling.
-   Smart memoization - Dependencies injected once per assemble() context for optimal performance.
-   Context switching - Override context anywhere in the call stack using reassemble().
-   Context enrichment - Add new context and products depending on new context deep in the call stack by using just-in-time suppliers.

⚡ Waterfall Management

-   Eager loading - Use preload: true for immediate initialization of a product on entry point's assemble() call (default).
-   Lazy loading - Use preload: false for on-demand initialization of a product when its value is first accessed.

🧪 Testing and Mocking

-   You can mock any product using pack(), which will use the provided value directly, bypassing the product's factory.
-   For more complex mocks which would benefit from a factory, see prototype() below.

🚀 Prototyping and A/B testing

-   Use `prototype()` to create alternative implementations of a product, that may depend on different suppliers than the original.
-   Prototypes' factories must return values of the same type than the original product's factory.
-   Define prototype suppliers or just-in-time suppliers to `try()` at the entry-point of your app
-   For example, you can easily try different versions of a UI component for A/B testing.

## Basic Usage

### 1. Create a Market

All suppliers are created from a `market`, which creates a scope shared by Resource and Product Suppliers.
You'll usually create one market per application. Markets register the names of the resources and products it `offers` so that no name conflicts occur. The name registry is the only state the market manages.

```ts
import { createMarket } from "supplier"

const market = createMarket()
```

### 2. Define Resources

Resources represent the data and context your application needs, like configuration or user sessions. You define a `ResourceSupplier` and then `.pack()` it with a value at runtime. The value can be anything you want, even functions. Just specify its type.

```tsx
// Define a supplier for the session
const sessionSupplier = market.offer("session").asResource<{
    userId: string
}>()

const sessionResource = sessionSupplier.pack({
    userId: "some-user-id"
})

const session = sessionResource.unpack()
```

### 3. Define Products (Services)

Products are your application's services, components or features. They are factory functions that can depend on other products or resources. Dependencies are accessed via the `$` object passed to the `factory` as argument. `$` is a shorthand for `supplies`, but it is just a suggestion, you can name the factory arg however you want. I like `$` because it is short and will be used a lot throughout the application.

Use `$[supplier.name]` to access the resource or product stored in supplies, and `$(supplier)` as a shorthand to access the unpacked value of the product or resource directly. As a mnemonic, `$[]` looks like a box, so it accesses the packed, the "boxed", resource or product.

```tsx
const userSupplier = market.offer("user").asProduct({
    suppliers: [sessionSupplier, dbSupplier], // Depends on session and db resources.
    factory: ($) => {
        const session = $[sessionSupplier.name].unpack() //Access the session value
        const session = $(sessionSupplier) // Shorthand for the above.
        const db = $(dbSupplier)
        return db.getUser(session.userId) // query the db to retrieve the user.
    }
})
```

### 4. Define Your Application

Your Application is just a `product` like the other ones. It's the main, most complex product at the top of the supply chain.

```tsx
const appSupplier = market.offer("app").asProduct({
    suppliers: [userSupplier], // Depends on User product
    factory: ($) => {
        // Access the user value. Its type will be automatically inferred from userSupplier's
        // factory's inferred return type.
        const user = $(userSupplier)
        return <h1>Hello, {user.name}! </h1>
    }
})
```

### 5. Assemble at Entry Point

At your application's entry point, you `assemble` your main AppProduct, providing just the resources (not the products) requested recursively by the AppProduct's suppliers chain. Typescript will tell you if any resource is missing.

```tsx
const db = //...Get your db connection
const req = //...Get the current http request

// Assemble the App, providing the Session and Db resources.
// Bad syntax for demonstration purposes only. See index() below for syntactic suger.
const appProduct = appSupplier.assemble({
    [sessionSupplier.name]: sessionSupplier.pack({
            userId: req.userId
    }),
    [dbSupplier.name]: dbSupplier.pack(db)
})

const res = appProduct.unpack()
// Return or render res...
```

The flow of the assemble call is as follows: raw data is obtained, which is provided to ResourceSuppliers using pack(). Then those resources are supplied to AppSupplier's suppliers recursively, which assemble their own product, and pass them up along the supply chain until they reach AppSupplier, which assembles the final AppProduct. All this work happens in the background, no matter the complexity of your application.

To simplify the assemble() call, you should use the index() utility, which transforms an array like
`...[resource1, resource2]` into an indexed object like
`{[resource1.name]: resource1, [resource2.name]:resource2}`. I unfortunately did not find a way to merge index() with assemble() without losing assemble's type-safety, because typescript doesn't have an unordered tuple type.

```tsx
import { index } from "supplier"

const appProduct = appSupplier.assemble(
    index(
        sessionSupplier.pack({
            userId: req.userId
        }),
        dbSupplier.pack(db)
    )
)
```

## Testing and Mocking

### 1. Mocking in tests with `.pack()`

You usually use `pack()` to provide resources to `assemble()`, but you can also use `pack()` on products. This allows to provide a value for that product directly, bypassing its factory. Perfect to override a product's implementation with a mock for testing.

```tsx
const profileSupplier = market.offer("profile").asProduct({
    suppliers: [userSupplier],
    factory: () => {
        return <h1>Profile of {$(userSupplier).name}</h1>
    }
})

const userSupplier = market.offer("user").asProduct({
    suppliers: [dbSupplier, sessionSupplier],
    factory: () => {
        return $(dbSupplier).findUserById($(sessionSupplier).userId)
    }
})

//Test the profile
const profile = profileSupplier.assemble(
    index(
        //userSupplier's factory will not be called, but...
        userSupplier.pack({ name: "John Doe" })
         //assemble still requires a valid value for db and session when using pack(), since userSupplier is
         // in the supply chain...
        dbSupplier.pack(undefined),
        // if you can't pass undefined, or some mock for them, prefer using `.prototype()` and `.try()` instead.
        sessionSupplier.pack(undefined),
    )
)

profile === <h1>Profile of John Doe</h1>
```

### 2. `.prototype()` and `.try()` alternative implementations

For more complete alternative implementations, with complex dependency and context needs, you can use `.prototype()` and `.try()` instead of `.pack()` to access the whole power of your supply chain. The same example as above could be:

```tsx
const profileSupplier = market.offer("profile").asProduct({
    suppliers: [userSupplier],
    factory: () => {
        return <h1>Profile of {$(userSupplier).name}</h1>
    }
})

const userSupplier = market.offer("user").asProduct({
    suppliers: [dbSupplier, sessionSupplier],
    factory: () => {
        return $(dbSupplier).findUserById($(sessionSupplier).userId)
    }
})

const userPrototype = userSupplier.prototype({
    suppliers: []
    factory: ()=>"John Doe"
})

//You no longer need to pass some value for db and session, since userPrototype removes them from the supply chain.
const profile = profileSupplier.try(userPrototype).assemble()

profile === <h1>Profile of John Doe</h1>
```

`.prototype()` and `.try()` can be used for testing, but also to swap implementations for sandboxing or A/B testing.

## Context overrides and enrichment

### 1. Override context with `reassemble()`

Any product can be `reassembled` with new resources deeper in the call stack. This is useful for changing the context, like impersonating a different user. You don't need to provide all resources needed, just the ones you want to overwrite. The original resources from the `assemble()` call will be reused if not overwritten.

```tsx
const sendMoneySupplier = market.offer("send-money").asProduct({
    suppliers: [addWalletEntrySupplier, sessionSupplier],
    factory: ($) => {
        return (toUserId: string, amount: number) => {
            const addWalletEntry = $(addWalletEntrySupplier)

            addWalletEntry(-amount) // Runs in the current session's account

            const addTargetWalletEntry = $[addWalletEntrySupplier.name]
                .reassemble(index(sessionSupplier.pack({ userId: toUserId })))
                .unpack()

            addTargetWalletEntry(amount) // Runs in the receiver's account.
        }
    }
})
```

### 2. Enriching context using just-in-time suppliers

Most of the time, all context is not known at the entry point of the app. A product supplier might read user input, or a condition might narrow a resource's type. In these cases, you need just-in-time suppliers. Best example is an admin dashboard reserved to admin sessions:

```tsx
type Session = { user: User; now: Date }

// Session resource can hold any object of type Session
const sessionSupplier = market.offer("session").asResource<Session>()
const adminSessionSupplier = market
    .offer("admin-session")
    .asResource<Session & { user: User & { role: "admin" } }>()

const adminDashboardSupplier = market.offer("admin-dashboard").asProduct({
    suppliers: [adminSessionSupplier],
    factory: ($) => {
        // No runtime check needed - TypeScript ensures session.user.role === "admin"
        const session = $(adminSessionSupplier)
        return <h1>Admin Dashboard - {session.user.name}</h1>
    }
})

const AppSupplier = market.offer("app").asProduct({
    suppliers: [sessionSupplier],
    // New context computed in this factory ++ all products dependent on that new context
    //  should be in justInTime[]
    justInTime: [adminSessionSupplier, adminDashboardSupplier]
    // Factories receive just-in-time suppliers as 2nd argument
    factory: ($, $$) => {
        const role = $(sessionSupplier).user.role
        if (role === "admin") {
            //Just-in-time suppliers are not yet assmbled, you need to assemble them with the new context.
            return $$[adminDashboardSupplier].assemble(
                {
                    ...$, // Keep all previous supplies
                    ...index(
                        $$[adminSessionSupplier.name].pack({
                            ...session,
                            user: {
                                ...session.user,
                                role
                            }
                        })
                    )
                }
            )
        }

        return <h1>User Dashboard - {session.user.name}</h1>
    }
})

const session = ...//read session
const res = appSupplier.assemble(index(sessionSupplier.pack(session))).unpack()
```

### Lazy vs Eager Loading

By default, all products are preloaded on `assemble()` call immediately in the background and in parallel, no matter how deep in the supply chain. This means no waterfalls happen. You can disable preloading of a product with `preload: false`.

```ts
// Eager loading - initialized immediately when assemble() is called
const eagerServiceSupplier = market.offer("eagerService").asProduct({
    suppliers: [dbSupplier],
    factory: ($) => new ExpensiveService($(dbSupplier))
})

// Lazy loading - initialized only when accessed
const lazyServiceSupplier = market.offer("lazyService").asProduct({
    suppliers: [dbSupplier],
    factory: ($) => new ExpensiveService($(dbSupplier)),
    preload: false // Loaded when first accessed via $()
})
```

## Design Philosophy: The Problem with Traditional DI

DI containers have always felt abstract, technical, almost magical in how they work. Like a black box, you often have to dig into the source code of a third-party library to understand how data flows in your own application. It feels like you lose control of your own data when you use one, and your entire app becomes dependent on the container to even work. Supplier aims to make DI cool again! The pattern has real power, even if current implementations on the open-source market hide that power under a lot of complexity.

DI was complex to achieve in OOP world because of the absence of first-class functions in OOP languages. But in modern functional languages, DI should be easier, since DI itself is a functional concept. However, TypeScript DI frameworks currently available seem to have been built by imitating how they were built in OOP languages...

The problem DI was solving in OOP world still exists in the functional world. In OOP world, DI helped inject data and services freely within deeply nested class hierarchies and architectures. In the functional world, DI achieves the same: inject data and services freely in deeply nested function calls. Deeply nested function calls naturally emerge when trying to decouple and implement SOLID principles in medium to highly complex applications. Without DI, you cannot achieve maximal decoupling. Even if in principle you can reuse a function elsewhere, the function is still bound in some way to the particular call stack in which it finds itself, simply by the fact that it can only be called from a parent function that has access to all the data and dependencies it needs.

Supplier's "Dependency Injection Supply Chain" (DISC) model can do everything containers do, but in a more elegant, simpler, and easier-to-reason-about manner.

## Under the hood

Injection happens statelessly via a memoized recursive self-referential lazy object. Here is a simplified example:

```ts
const $ = {
    resourceA,
    resourceB,
    //Wrapped in a getter in the code to provide direct $[productA.name] access
    productA: once(() => productA.assemble($)),
    productB: once(() => productA.assemble($))
    //...
}
```

## API Reference

### `createMarket()`

Creates a new dependency injection scope.

```ts
const market = createMarket()
```

### `market.offer(name)`

Creates a new supplier with the given name.

```ts
const supplier = market.offer("serviceName")
```

### `.asResource<T>()`

Creates a resource supplier for data/configuration.

```ts
const resourceSupplier = market.offer("config").asResource<Config>()
```

### `.asProduct(options)`

Creates a product supplier for services.

```ts
const productSupplier = market.offer("service").asProduct({
    suppliers: [dep1, dep2], // Dependencies
    justInTime: [jit1, jit2], // Just-in-time suppliers
    preload: boolean, // Eager (true) or lazy (false) loading
    factory: ($, $$?) => {
        // Factory function
        // $ = regular supplies
        // $$ = just-in-time supplies (if any)
        return serviceImplementation
    }
})
```

### `.pack(value)`

Provides a concrete value for a supplier.

```ts
const resource = resourceSupplier.pack(actualValue)
const product = productSupplier.pack(mockValue) // For testing
```

### `.assemble(supplies)`

Resolves all dependencies and creates the product.

```ts
const product = productSupplier.assemble(suppliesObject)
const value = product.unpack()
```

### `.reassemble(newSupplies)`

Creates a new context with different supplies.

```ts
const newProduct = existingProduct.reassemble(newSuppliesObject)
```

### `.prototype(options)`

Creates an alternative implementation.

```ts
const alternativeSupplier = originalSupplier.prototype({
    suppliers: [differentDeps],
    factory: ($) => alternativeImplementation
})
```

### `.try(prototype)`

Swaps a supplier with its prototype.

```ts
const modifiedSupplier = originalSupplier.try(prototypeSupplier)
```

### `index(...supplies)`

Utility to convert supply array to indexed object.

```ts
const suppliesObject = index(supply1, supply2, supply3)
// Equivalent to: { [supply1.name]: supply1, [supply2.name]: supply2, ... }
```

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## License

MIT

---
