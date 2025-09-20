# Testing and Mocking

Supplier makes testing easy by providing two powerful mocking strategies, allowing you to isolate components and control dependencies during tests.

## Method 1: Mocking with `.pack()`

The simplest way to mock a dependency is to use `.pack()` on a **Product Supplier**. This provides a direct value or object for that dependency, completely bypassing its factory function and its own dependencies.

**Use this for:** Simple, stateless mocks where you just need to provide a specific value or a simple object with mocked methods.

```typescript
// Production services
const dbSupplier = market.offer("db").asProduct({
    /* ... */
})
const userServiceSupplier = market.offer("userService").asProduct({
    suppliers: [dbSupplier],
    factory: ($) => new UserService($(dbSupplier))
})

// In your test file
it("should return user data", async () => {
    const mockDb = {
        findUser: jest.fn().mockResolvedValue({ id: "user-123", name: "John" })
    }

    // Assemble the service, packing the mock db directly
    const userService = userServiceSupplier
        .assemble(index(dbSupplier.pack(mockDb)))
        .unpack()

    const user = await userService.getUser("user-123")

    expect(mockDb.findUser).toHaveBeenCalledWith("user-123")
    expect(user.name).toBe("John")
})
```

**Note**: When you `.pack()` a product, you must still satisfy the resource dependencies of its _entire_ dependency tree in the `.assemble()` call, even if they aren't used by the mock. You can often provide `undefined` if the types allow. For more complex cases, consider using a prototype.

## Method 2: Prototypes with `.prototype()` and `.try()`

For more complex scenarios where your mock needs its own logic, state, or dependencies, you can create a **prototype**. A prototype is a complete, alternative implementation of a supplier.

**Use this for:**

-   Complex mocks that need their own factories.
-   Swapping a dependency and its entire sub-tree of dependencies.
-   A/B testing and feature flagging.

```typescript
// Production user supplier
const userSupplier = market.offer("user").asProduct({
    suppliers: [dbSupplier, sessionSupplier],
    factory: ($) => $(dbSupplier).findUserById($(sessionSupplier).userId)
})

// Create a prototype with a different factory and NO dependencies
const userPrototype = userSupplier.prototype({
    suppliers: [], // No dependencies for this mock
    factory: () => ({ name: "Mock John Doe" })
})

// In your test, `try` the prototype
const profileSupplier = market.offer("profile").asProduct({
    suppliers: [userSupplier],
    factory: ($) => `<h1>Profile of ${$(userSupplier).name}</h1>`
})

const profile = profileSupplier
    .try(userPrototype) // Swaps the original userSupplier with the prototype
    .assemble() // No resources needed, as the prototype has no dependencies
    .unpack()

// profile === "<h1>Profile of Mock John Doe</h1>"
```

By using `.try(userPrototype)`, you instruct the `profileSupplier` to use the mock implementation instead of the real one. Because the prototype has no dependencies, the final `.assemble()` call is much simpler.
