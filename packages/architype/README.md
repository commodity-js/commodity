# architype

IN CONSTRUCTION, please do not install versions v0.0.x!!!

First fully type-inferred, type-safe and hyper-minimalistic DI solution for Typescript! No OOP, reflect-metadata, decorators, annotations or compiler magic, just pure functions!

## Why Architype?

-   ✅ **Scalable architecture** - Promotes SOLID, clean, and code-splittable design patterns.
-   ✅ **Fully type-inferred** - Compile-time dependency validation.
-   ✅ **Minimal boilerplate** - Trade-off: a bit more runtime boilerplate for much less type boilerplate.
-   ✅ **Framework agnostic** - Accommodates all codebases where TypeScript works
-   ✅ **No magic** - Just functions and closures, no OOP, reflect-metadata, decorators, annotations or compiler magic.
-   ✅ **Testing friendly** - Easy mocking and dependency swapping
-   ✅ **Performance focused** - Smart memoization, lazy loading, code-splittable architecture.
-   ✅ **Stateless** - Dependencies resolved via closures, not global state.
-   ✅ **A new DI paradigm** - Don't let your past experiences with DI prevent you from trying this one!
-   ✅ **Intuitive, opinionated terminology** - The supply chain metaphor helps DI finally make intuitive sense.

## Installation

```bash
npm install architype
```

## When to Use Architype

-   **Complex TypeScript applications** with deep function call hierarchies
-   **Avoiding prop-drilling and waterfalls** in React (works in both Client and Server Components)
    -   Full alternative to React Context.
-   **Microservices** that need shared context propagation
-   **Testing scenarios** requiring easy mocking and dependency swapping
-   **A/B testing**, feature flagging and prototyping.
-   **Any project** wanting DI without the complexity of traditional containers

## Performance

-   **Hyper-minimalistic bundle size**: ~5KB minified, ~2KB minzipped. Most of the package is type definitions.
-   **Tree-shakable and code-splittable architecture**: Helps you create hyper-specialized suppliers: One function or piece of data per supplier
-   **Memory usage**: Smart memoization prevents duplicate dependency resolution
-   **Options to optimize dependency chain waterfalls**: Define suppliers as lazy or eager, call init() to preload some values as soon as possible.

## Quick Example

```ts
import { createMarket, index } from "architype"

// 1. Create a market
const market = createMarket()

// 2. Define data (resources) and services (products)
const $$session = market.offer("session").asResource<{ userId: string }>()
const $$todosDb = market.offer("todosDb").asProduct({
    suppliers: [],
    factory: () => new Map<string, string[]>() // Simple in-memory DB
})
const $$addTodo = market.offer("addTodo").asProduct({
    suppliers: [$$session, $$todosDb],
    factory: ($) => (todo: string) => {
        const session = $($$session).unpack()
        const db = $($$todosDb).unpack()
        const userTodos = db.get(session.userId) || []
        db.set(session.userId, [...userTodos, todo])
        return db.get(session.userId)
    }
})

const session = { userId: "user123" }

// 3. Assemble and use
const addTodo = $$addTodo.assemble(index($session.pack(session))).unpack()

console.log(addTodo("Learn Architype")) // ["Learn Architype"]
console.log(addTodo("Build app")) // ["Learn Architype", "Build app"]
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
-   Maximal colocation - All product suppliers are registered right next to the factory that uses them, not at the entry point.

📦 Context Propagation

-   Shared context - Assemble the context once at the entry point, access everywhere without prop-drilling.
-   Smart memoization - Dependencies injected once per assemble() context for optimal performance.
-   Context switching - Override context anywhere in the call stack using reassemble().
-   Context enrichment - Add new context and products deep in the call stack by using assemblers.

⚡ Waterfall Management

-   Eager loading - Use lazy: false for immediate construction of all supplies in parallel in assemble() call (default).
-   Lazy loading - Use lazy: true for on-demand construction of a product when its value is first accessed in a factory.

🧪 Testing and Packing

-   You can mock any product using pack(), which will use the provided value directly, bypassing the product's factory.
-   For more complex mocks which would benefit from a factory, see mock() below.

🚀 Mocking and A/B testing

-   Use `mock()` to create alternative implementations of a product, that may depend on different suppliers than the original.
-   Mocks' factories must return values of the same type than the original product's factory.
-   Define mock suppliers or assemblers to `hire()` at the entry-point of your app
-   For example, you can easily hire different versions of a UI component for A/B testing.

## Basic Usage

### 1. Create a Market

All suppliers are created from a `market`, which creates a scope shared by Resource and Product Suppliers.
You'll usually create one market per application. Markets register the names of the resources and products it `offers` so that no name conflicts occur. The name registry is the only state the market manages.

```ts
import { createMarket } from "architype"

const market = createMarket()
```

### 2. Define Resources

Resources represent the data and context your application needs, like configuration or user sessions. You define a `$$resource` supplier and then `.pack()` it with a value at runtime. The value can be anything you want, even functions. Just specify its type.

```tsx
// I like calling suppliers with $$ prefix, but this is up to you.
const $$session = market.offer("session").asResource<{
    userId: string
}>()

// I like calling products and resources with $ prefix, but this is up to you.
const $session = $$session.pack({
    userId: "some-user-id"
})

const session = $session.unpack()
```

### 3. Define Products (Services)

Products are your application's services, components or features. They are factory functions that can depend on other products or resources. Factories can return anything: simple values, promises or other functions.

Dependencies are accessed via the `$` function passed to the `factory` as argument. `$` is a shorthand for `supplies`, but it is just a suggestion, you can name the factory arg however you want. I like `$` because it is short and will be used a lot throughout the application.

Use `$($$supplier)` to access the resource or product stored in `$` supplies, and `$($$supplier).unpack()` to access the value of the product or resource directly.

```tsx
const $$user = market.offer("user").asProduct({
    suppliers: [$$session, $$db], // Depends on session and db resources.
    factory: ($) => {
        const session = $($$session).unpack() //Access the session value
        const db = $($$db).unpack()
        return db.getUser(session.userId) // query the db to retrieve the user.
    }
})
```

#### Factory Lifecycle & Memoization

**Important**: Your factory function will only ever be called **once per `assemble()` or `reassemble()` call**. This eliminates the need for traditional DI service lifecycles (transient, scoped, singleton, etc.).

-   **Need something called multiple times?** Return a function from your factory instead of a value

```ts
// ✅ Good: Factory called once, returns a function for multiple calls or side-effects
const $$createUser = market.offer("createUser").asProduct({
    suppliers: [$$db],
    factory: ($) => {
        const db = $($$db).unpack()
        // This setup code runs only once per assemble()
        const cache = new Map()

        // Return a function that can be called multiple times
        return (userId: string) => {
            if (cache.has(userId)) return cache.get(userId)
            const user = db.findUser(userId)
            cache.set(userId, user)
            return user
        }
    }
})

const createUser = $$createUser.assemble(index($$db.pack(db))).unpack()
// Usage: createUser() can be called multiple times
const user1 = createUser("123") // Fresh call
const user2 = createUser("123") // Cached result
```

#### Lazy vs Eager Loading

By default, all products are constructed on `assemble()` call immediately in the background and in parallel, no matter how deep in the supply chain. This means no waterfalls happen. You can disable this for specific products with `lazy: true`.

```ts
// Eager loading - constructed immediately when assemble() is called
const $$eagerService = market.offer("eagerService").asProduct({
    suppliers: [$$db],
    factory: ($) => buildExpensiveService($($$db))
    lazy: false // default
})

// Lazy loading - constructed only when accessed
const $$lazyService = market.offer("lazyService").asProduct({
    suppliers: [$$db],
    factory: ($) => buildExpensiveService($($$db)),
    lazy: true // Loaded when first accessed via $()
})
```

### 4. Define Your Application

Your Application is just a `$product` like the other ones. It's the main, most complex product at the top of the supply chain.

```tsx
const $$app = market.offer("app").asProduct({
    suppliers: [$$user], // Depends on User product
    factory: ($) => {
        // Access the user value. Its type will be automatically inferred from $$user's
        // factory's inferred return type.
        const user = $($$user).unpack()
        return <h1>Hello, {user.name}! </h1>
    }
})
```

### 5. Assemble at Entry Point

At your application's entry point, you `assemble` your main $appProduct, providing just the resources (not the products) requested recursively by the $appProduct's suppliers chain. Typescript will tell you if any resource is missing.

```tsx
const db = //...Get your db connection
const req = //...Get the current http request

// Assemble the App, providing the Session and Db resources.
// Bad but working syntax for demonstration purposes only. See index() below for syntactic sugar.
const $app = $$app.assemble({
    [$$session.supplier.name]: $$session.pack({
        userId: req.userId
    }),
    [$$db.supplier.name]: $$db.pack(db)
})

const res = $app.unpack()
// Return or render res...
```

The flow of the assemble call is as follows: raw data is obtained, which is provided to `$$resource` suppliers using pack(). Then those resources are supplied to `$$app`'s suppliers recursively, which assemble their own product, and pass them up along the supply chain until they reach `$$app`, which assembles the final `$app` product. All this work happens in the background, no matter the complexity of your application.

To simplify the assemble() call, you should use the index() utility, which just transforms an array like
`...[$resource1, $product1]` into an indexed object like
`{[$resource1.supplier.name]: $resource1, [$product1.name]: $product1}`. I unfortunately did not find a way to merge index() with assemble() without losing assemble's type-safety, because typescript doesn't have an unordered tuple type.

```tsx
import { index } from "architype"

const $appProduct = $$app.assemble(
    index(
        $$session.pack({
            userId: req.userId
        }),
        $$db.pack(db)
    )
)
```

## Context propagation, switching and enrichment

It is often a good architectural pattern to `hoist` pieces of data used multiple times throughout your application, such as user sessions or database connections, in a context object. But achieving it statelessly and immutably, without global variables, while maintaining full flexibility, can be a bit tricky. This is what React Context achieved for React components, but Architype provides mechanisms to achieve this in a framework agnostic way using its DI primitives.

For brevity of this README, please consult [the docs](https://architype-js.github.io/architype/docs/guides/context-switching) for more details.

## Testing and Packing

### 1. Mocking in tests with `.pack()`

You usually use `pack()` to provide resources to `assemble()`, but you can also use `pack()` on products. This allows to provide a value for that product directly, bypassing its factory. Perfect to override a product's implementation with a mock for testing.

```tsx
const $$profile = market.offer("profile").asProduct({
    suppliers: [$$user],
    factory: () => {
        return <h1>Profile of {$($$user)unpack().name}</h1>
    }
})

const $$user = market.offer("user").asProduct({
    suppliers: [$$db, $$session],
    factory: () => {
        return $($$db).unpack().findUserById($($$session).userId)
    }
})

//Test the profile
const $profile = $$profile.assemble(
    index(
        //$$user's factory will not be called, but...
        $$user.pack({ name: "John Doe" })
         //assemble still requires a valid value for db and session when using pack(),
         // since $$db and $session are in the supply chain...
        $$db.pack(undefined),
        // if you can't pass undefined, or some mock for them,
        // prefer using `.mock()` and `.hire()` instead.
        $$session.pack(undefined),
    )
)

// profile === <h1>Profile of John Doe</h1>
```

### 2. `.mock()` and `.hire()` alternative implementations

For more complete alternative implementations, with complex dependency and context needs, you can use `.mock()` and `.hire()` instead of `.pack()` to access the whole power of your supply chain. The same example as above could be:

```tsx
const $$profile = market.offer("profile").asProduct({
    suppliers: [$$user],
    factory: () => {
        return <h1>Profile of {$($$user).unpack().name}</h1>
    }
})

const $$user = market.offer("user").asProduct({
    suppliers: [$$db, $$session],
    factory: () => {
        return $($$db).unpack()findUserById($($$session).userId)
    }
})

const userMock = $$user.mock({
    suppliers: [],
    factory: () => "John Doe"
})

//You no longer need to pass some value for db and session, since userMock removes them from the supply chain.
const profile = $$profile.hire(userMock).assemble()

profile === <h1>Profile of John Doe</h1>
```

`.mock()` and `.hire()` can be used for testing, but also to swap implementations at runtime for sandboxing or A/B testing.

## Design Philosophy: The Problem with Traditional DI

DI containers have always felt abstract, technical, almost magical in how they work. Like a black box, you often have to dig into the source code of a third-party library to understand how data flows in your own application. It feels like you lose control of your own data when you use one, and your entire app becomes dependent on the container to even work. Architype aims to make DI cool again! The pattern has real power, even if current implementations on the open-source market hide that power under a lot of complexity.

DI was complex to achieve in OOP world because of the absence of first-class functions in OOP languages. But in modern functional languages, DI should be easier, since DI itself is a functional pattern. However, TypeScript DI frameworks currently available seem to have been built by imitating how they were built in OOP languages...

The problem DI was solving in OOP world still exists in the functional world. In OOP world, DI helped inject data and services freely within deeply nested class hierarchies and architectures. In the functional world, DI achieves the same: inject data and services freely in deeply nested function calls. Deeply nested function calls naturally emerge when trying to decouple and implement SOLID principles in medium to highly complex applications. Without DI, you cannot achieve maximal decoupling. Even if in principle you can reuse a function elsewhere, the function is still bound in some way to the particular call stack in which it finds itself, simply by the fact that it can only be called from a parent function that has access to all the data and dependencies it needs.

Architype's "Dependency Injection Supply Chain" (DISC) model can do everything containers do, but in a more elegant, simpler, and easier-to-reason-about manner.

## Under the hood

Injections happens statelessly via a memoized recursive self-referential lazy object. Here is a simplified example:

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

## API reference

See [the docs](https://architype-js.github.io/architype/docs/api-reference) for the full API reference!

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## License

MIT

---
