# Testing and Mocking

Architype makes testing easy by providing two powerful mocking strategies, allowing you to isolate components and control dependencies during tests.

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
    factory: ($) => new UserRepo($($$db).unpack())
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

**Note**: When you `.pack()` a product, you must still pass to its assemble() method all the resources it depends on recursively, even if they aren't used by the mock. You can often provide `undefined` if the types allow. For more complex cases, consider using a mock.

## Method 2: Mocking with `.mock()` and `.hire()`

For more complex scenarios where your mock needs its own logic, state, or dependencies, you can create a **mock**. A mock is a complete, alternative implementation of a product supplier.

**Use this for:**

-   Complex mocks that need their own factories.
-   Swapping a dependency and its entire sub-tree of dependencies.
-   A/B testing and feature flagging.

```typescript
// Production user supplier
const $$user = market.offer("user").asProduct({
    suppliers: [$$db, $$session],
    factory: ($) => $($$db).unpack().findUserById($($$session).unpack().userId)
})

// Create a mock with a different factory and NO dependencies
const $$userMock = $$user.mock({
    suppliers: [], // No dependencies for this mock
    factory: () => ({ name: "Mock John Doe" })
})

// The product supplier to test
const $$profile = market.offer("profile").asProduct({
    suppliers: [$$user],
    factory: ($) => `<h1>Profile of ${$($$user).unpack().name}</h1>`
})

const profile = $$profile
    .hire($$userMock) // Swaps the original $$user with the mock
    .assemble() // No resources needed, as the mock has no dependencies
    .unpack()

// profile === "<h1>Profile of Mock John Doe</h1>"
```

By using `.hire($$userMock)`, you instruct the `$$profile` to use the mock implementation instead of the real one. Because the mock has no dependencies, the final `.assemble()` call is much simpler.
