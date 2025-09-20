# Quick Example

This page shows a complete, runnable example of a simple todo application built with Supplier.

```typescript
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

## Explanation

### Step 1: Create a Market

```typescript
const market = createMarket()
```

We start by creating a `market`, which acts as a namespace for all our suppliers.

### Step 2: Define Suppliers

```typescript
// A Resource for session data
const sessionSupplier = market.offer("session").asResource<{ userId: string }>()

// A Product for our in-memory database
const todosDbSupplier = market.offer("todosDb").asProduct({
    suppliers: [],
    factory: () => new Map<string, string[]>()
})

// A Product that depends on the other two suppliers
const addTodoSupplier = market.offer("addTodo").asProduct({
    suppliers: [sessionSupplier, todosDbSupplier],
    factory: ($) => (todo: string) => {
        // ... implementation
    }
})
```

Here, we define two types of suppliers:

-   `sessionSupplier`: A **Resource** that will hold the current user's session data.
-   `todosDbSupplier`: A **Product** that provides an in-memory `Map` to act as a database. It has no dependencies.
-   `addTodoSupplier`: A **Product** that creates our main `addTodo` function. It depends on both the `sessionSupplier` and `todosDbSupplier`.

### Step 3: Assemble and Use

```typescript
const session = { userId: "user123" }

const addTodo = addTodoSupplier
    .assemble(index(sessionSupplier.pack(session)))
    .unpack()
```

At our application's entry point, we:

1.  Define the concrete data for our `session` resource.
2.  Call `.assemble()` on our `addTodoSupplier`.
3.  Provide the required `sessionSupplier` resource, packed with our session data. We use the `index()` helper for convenience. `todosDbSupplier` is also a dependency, but because it is a Product with no _external resource_ dependencies of its own, Supplier can create it automatically.
4.  Call `.unpack()` to get the final, ready-to-use `addTodo` function.

Now `addTodo` can be called, and it will have access to the session and database it needs to do its job.
