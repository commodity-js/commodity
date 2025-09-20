# Core Concepts

This section explains the philosophy behind Supplier, its terminology, and how the core components work together.

## The Supply Chain Metaphor

Supplier uses an intuitive supply chain metaphor to make dependency injection easier to understand. You create fully-decoupled, hyper-specialized **suppliers** that exchange **resources** and **products** in a free-market fashion to assemble new, more complex products.

| Term                   | Classical DI Equivalent | Description                                                     |
| ---------------------- | ----------------------- | --------------------------------------------------------------- |
| **`createMarket()`**   | `createContainer()`     | A namespace/scope for all your suppliers.                       |
| **Resource**           | Value Service           | A simple container for data or configuration.                   |
| **Product**            | Factory Service         | A complex object, often with its own dependencies.              |
| **Supplier**           | Resolver                | A factory for creating a resource or a product.                 |
| **`assemble()`**       | `resolve()`             | The process of creating an instance with all its dependencies.  |
| **Supplies (or `$` )** | Container / Context     | The collection of resolved dependencies available at any point. |

## The Assembly Process

1.  **A Market is Created**: You start by creating a `market` to serve as a namespace for your suppliers, preventing name collisions.

2.  **Suppliers are Defined**: You define `ResourceSuppliers` for raw data (e.g., config, user session) and `ProductSuppliers` for services (e.g., a database client, a logger). Products can declare dependencies on other suppliers.

3.  **Assembly Begins at the Entry Point**: You call `.assemble()` on your top-level product (e.g., your main application component). You must provide all the raw `Resources` that the entire dependency tree requires.

4.  **Dependencies are Resolved Recursively**: Supplier walks down the dependency tree, assembling each required product. It provides each product's factory with a `$` object, which gives it access to its own resolved dependencies.

5.  **Instances are Memoized**: Within a single `.assemble()` call, each supplier is instantiated only once. If `UserService` and `OrderService` both depend on `DatabaseClient`, they will both receive the exact same `DatabaseClient` instance.

6.  **The Final Product is Returned**: Once the entire dependency graph is resolved, the fully-formed, top-level product instance is returned.

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
