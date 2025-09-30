# Performance

Commodity is designed for optimal performance, featuring a minimal bundle size, smart memory management, and powerful preloading strategies.

## Bundle Size & Footprint

-   **~3KB minified, ~1KB minzipped**: Hyper-minimalistic bundle size. Most of the package is type definitions.
-   **Zero dependencies**: Adds no external runtime dependencies to your project.
-   **Tree-shakable and code-splittable architecture**: Helps you create hyper-specialized suppliers: One function or piece of data per supplier.

## Factory Lifecycle & Memoization

**Important**: Your factory function will only ever be called **once per `assemble()` call**. This eliminates the need for traditional DI service lifecycles (transient, scoped, singleton, etc.).

-   **Need something called multiple times?** Return a function from your factory instead of a value

```typescript
// ✅ Good: Factory called once, returns a function for multiple calls
const createUserService = market.offer("createUserService").asProduct({
    suppliers: [dbSupplier],
    factory: ($) => {
        const db = $(dbSupplier)
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

// Usage: createUserService() can be called multiple times
const createUser = createUserService
    .assemble(index(dbSupplier.pack(db)))
    .unpack()
const user1 = createUser("123") // Fresh call
const user2 = createUser("123") // Cached result
```

## Factories run in parallel

### Eager loading by default

By default, all products are constructed in parallel and cached as soon as `.assemble()` is called. This is the best strategy for optimal performance in most cases, especially in the presence of async factories.

```typescript
// Both of these services will be constructed immediately and in parallel
const dbSupplier = market.offer("database").asProduct({
    factory: async () => await db.connect()
})
const cacheSupplier = market.offer("cache").asProduct({
    factory: () => new Map()
})

const app = appSupplier.assemble(supplies) // Starts constructing both at once
```

### Lazy Loading with `lazy: true`

For expensive services that are only used in certain situations (e.g., an admin panel service or a PDF export tool), you can enable lazy loading by setting `lazy: true`. The product will only be constructed the first time its value is accessed via `$(...)` or `unpack()`.

```typescript
const lazyServiceSupplier = market.offer("lazyService").asProduct({
    suppliers: [dbSupplier],
    // Will only be loaded when `$(lazyServiceSupplier)` is called in another service,
    // or when `lazyServiceSupplier.assemble().unpack()` is called at the entry point.
    factory: ($) => new ExpensiveService($(dbSupplier)),
    lazy: true
})
```

## Initialization with `init()`

For products that need to perform side-effects upon creation (like connecting to a database or logging), you can use the `init` function. It runs immediately after the `factory` function returns, and receives the constructed value and the $ supplies as its 2 first arguments

This is useful for pre-warming caches or running setup logic without cluttering your factory.

For example, you can easily implement the preload pattern:

```typescript
const profileSupplier = market.offer("profileSupplier").asProduct({
    suppliers: [currentUser]
    factory: () => memo((userId) => db.profiles.get(userId))
    init: (getProfile, $) => {
        // Allows to preload the current logged in user's profile.
        // the memoization cache will be prepopulated with the current user's profile if requested later.
        await getProfile($(currentUser).id)
    }
})
```
