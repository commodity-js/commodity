# Simple example

Dummy todo app built with Commodity.

```typescript
import { createMarket, index } from "commodity"

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

/*Here, we define two types of suppliers:

-   `sessionSupplier`: A **Resource** that will hold the current user's session data.
-   `todosDbSupplier`: A **Product** that provides an in-memory `Map` to act as a database. It has no dependencies.
-   `addTodoSupplier`: A **Product** that creates our main `addTodo` function. It depends on both the `sessionSupplier` and `todosDbSupplier`. */

const session = { userId: "user123" }

// 3. Assemble and use
const addTodo = addTodoSupplier
    // We only need to provide resource dependencies to assemble(). Products are auto-wired
    .assemble(index(sessionSupplier.pack(session)))
    .unpack()

console.log(addTodo("Learn Commodity")) // ["Learn Commodity"]
console.log(addTodo("Build app")) // ["Learn Commodity", "Build app"]
```
