# Design Philosophy

## The Problem with Traditional DI

DI containers have always felt abstract, technical, almost magical in how they work. Like a black box, you often have to dig into the source code of a third-party library to understand how data flows in your own application. It feels like you lose control of your own data when you use one, and your entire app becomes dependent on the container to even work. Commodity aims to make DI cool again! The pattern has real power, even if current implementations on the open-source market hide that power under a lot of complexity.

DI was complex to achieve in OOP world because of the absence of first-class functions in OOP languages. But in modern functional languages, DI should be easier, since DI itself is a functional pattern. However, TypeScript DI frameworks currently available seem to have been built by imitating how they were built in OOP languages...

The problem DI was solving in OOP world still exists in the functional world. In OOP world, DI helped inject data and services freely within deeply nested class hierarchies and architectures. In the functional world, DI achieves the same: inject data and services freely in deeply nested function calls. Deeply nested function calls naturally emerge when trying to decouple and implement SOLID principles in medium to highly complex applications. Without DI, you cannot achieve maximal decoupling. Even if in principle you can reuse a function elsewhere, the function is still bound in some way to the particular call stack in which it finds itself, simply by the fact that it can only be called from a parent function that has access to all the data and dependencies it needs.

Commodity's "Dependency Injection Supply Chain" (DISC) model can do everything containers do, but in a more elegant, simpler, and easier-to-reason-about manner.

## The Supply Chain Metaphor

Commodity uses an intuitive supply chain metaphor to make dependency injection easier to understand. You create fully-decoupled, hyper-specialized **suppliers** that exchange **resources** and **products** in a free-market fashion to assemble new, more complex products.

| Term                   | Classical DI Equivalent | Description                                                                     |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| **`createMarket()`**   | `createContainer()`     | A namespace/scope for all your suppliers.                                       |
| **Resource**           | Value Service           | A simple container for data or configuration.                                   |
| **Product**            | Factory Service         | A container for a value created via a factory function with dependencies.       |
| **Supplier**           | Resolver                | Provides access to a resource or product to an application or another supplier. |
| **`assemble()`**       | `resolve()`             | Build the product by aggregating and injecting all needed supplies.             |
| **Supplies (or `$` )** | Container / Context     | The collection of resolved dependencies available at any point.                 |

## How it Works Under the Hood

Injection happens statelessly via a memoized, recursive, self-referential, lazy object. Here is a simplified conceptual model:

```typescript
const $ = {
    // Resources are provided directly
    resourceA,
    resourceB,

    // Products are wrapped in a function to be lazily evaluated and memoized.
    // The `$` object is passed to assemble, creating a recursive structure.
    productA: once(() => productA.supplier.assemble($)),
    productB: once(() => productB.supplier.assemble($))
    // ...
}
```

This functional approach avoids the complexity of traditional DI containers while providing the same power in a more elegant and understandable way.
