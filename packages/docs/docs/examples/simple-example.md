# Simple example

Dummy todo app built with Architype.

```typescript
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

/*Here, we define two types of suppliers:

-   `$$session`: A **Resource** supplier that will hold the current user's session data.
-   `$$todosDb`: A **Product** supplier that provides an in-memory `Map` to act as a database. It has no dependencies.
-   `$$addTodo`: A **Product** supplier Sthat creates our main `addTodo` function. It depends on both the `$$session` and `$$todosDb`. */

const session = { userId: "user123" }

// 3. Assemble and use
const addTodo = $$addTodo
    // We only need to provide resource dependencies to assemble(). Products are auto-wired
    .assemble(index($$session.pack(session)))
    .unpack()

console.log(addTodo("Learn Architype")) // ["Learn Architype"]
console.log(addTodo("Build app")) // ["Learn Architype", "Build app"]
```
