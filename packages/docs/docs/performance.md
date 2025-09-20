# Performance

Supplier is designed for optimal performance, featuring a minimal bundle size, smart memory management, and powerful preloading strategies.

## Bundle Size & Footprint

-   **~15KB minified and tree-shakeable**: Only the suppliers you use are included in your final bundle, keeping your application lean.
-   **Zero dependencies**: Adds no external runtime dependencies to your project.
-   **Code-splitting friendly**: Suppliers can be defined in separate modules, allowing bundlers to split code effectively.

## Memory and Execution Efficiency

-   **Smart Memoization**: Within a single `.assemble()` call, each dependency is created only once. This instance is then shared with any other service that requires it, preventing duplicate instantiations and saving memory.
-   **Stateless by Design**: Dependencies are resolved via closures, not a global state container. Each assembly creates a clean, isolated context that can be garbage-collected, preventing memory leaks.
-   **Compile-time Safety**: All dependency validation and circular dependency checks happen at compile-time, adding zero runtime overhead.

## Waterfall Management

Supplier helps you avoid network or initialization waterfalls by giving you control over when your services are loaded.

### Eager Loading (Default)

By default, all products are preloaded in parallel as soon as `.assemble()` is called. This is the best strategy for optimal performance in most cases, as it initiates all necessary async work (like database connections or API calls) immediately.

```typescript
// Both of these services will be initialized immediately and in parallel
const dbSupplier = market.offer("database").asProduct({
    /* ... */
})
const cacheSupplier = market.offer("cache").asProduct({
    /* ... */
})

const app = appSupplier.assemble(supplies) // Starts loading both at once
```

### Lazy Loading with `preload: false`

For expensive services that are only used in certain situations (e.g., an admin panel service or a PDF export tool), you can disable preloading. The service will only be initialized the first time it is accessed.

```typescript
const lazyServiceSupplier = market.offer("lazyService").asProduct({
    suppliers: [dbSupplier],
    factory: ($) => new ExpensiveService($(dbSupplier)),
    preload: false // Will only be loaded when `$(lazyServiceSupplier)` is called
})
```
