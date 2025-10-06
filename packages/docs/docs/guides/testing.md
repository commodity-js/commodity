# Testing and Mocking

Commodity makes testing easy by providing two powerful mocking strategies, allowing you to isolate components and control dependencies during tests.

## Method 1: Mocking with `.pack()`

The simplest way to mock a dependency is to use `.pack()` on a **Product Supplier**. This provides a direct value or object for that dependency, completely bypassing its factory function and its own dependencies.

**Use this for:** Simple mocks with simple known values

```typescript
// Production services
const $$db = market.offer("db").asProduct({
    /* ... */
})
const $$userRepo = market.offer("userRepo").asProduct({
    suppliers: [$$db],
    factory: ($) => new UserRepo($($$db))
})

// In your test file
it("should return user data", async () => {
    const mockDb = {
        findUser: jest.fn().mockResolvedValue({ id: "user-123", name: "John" })
    }

    // Assemble the service, packing the mock db directly
    const userRepo = $$userRepo.assemble(index($$db.pack(mockDb))).unpack()

    const user = await userRepo.getUser("user-123")

    expect(mockDb.findUser).toHaveBeenCalledWith("user-123")
    expect(user.name).toBe("John")
})
```

**Note**: When you `.pack()` a product, you must still pass to its assemble() method all the resources it depends on recursively, even if they aren't used by the mock. You can often provide `undefined` if the types allow. For more complex cases, consider using a prototype.

## Method 2: Prototypes with `.prototype()` and `.try()`

For more complex scenarios where your mock needs its own logic, state, or dependencies, you can create a **prototype**. A prototype is a complete, alternative implementation of a product supplier.

**Use this for:**

-   Complex mocks that need their own factories.
-   Swapping a dependency and its entire sub-tree of dependencies.
-   A/B testing and feature flagging.

```typescript
// Production user supplier
const $$user = market.offer("user").asProduct({
    suppliers: [$$db, $$session],
    factory: ($) => $($$db).findUserById($($$session).userId)
})

// Create a prototype with a different factory and NO dependencies
const $$userPrototype = $$user.prototype({
    suppliers: [], // No dependencies for this mock
    factory: () => ({ name: "Mock John Doe" })
})

// The product spplier to test
const $$profile = market.offer("profile").asProduct({
    suppliers: [$$user],
    factory: ($) => `<h1>Profile of ${$($$user).name}</h1>`
})

const profile = $$profile
    .try($$userPrototype) // Swaps the original $$user with the prototype
    .assemble() // No resources needed, as the prototype has no dependencies
    .unpack()

// profile === "<h1>Profile of Mock John Doe</h1>"
```

By using `.try($$userPrototype)`, you instruct the `$$profile` to use the mock implementation instead of the real one. Because the prototype has no dependencies, the final `.assemble()` call is much simpler.
