# Getting Started

Welcome to Supplier: a functional, fully type-safe, and stateless dependency and context injector for TypeScript.

Enter the containerless DI revolution! No OOP, `reflect-metadata`, decorators, annotations, or compiler magic—just functions and closures.

## Why Supplier?

Supplier is designed to be a modern, intuitive solution for dependency injection, offering several key advantages:

| Feature                    | Description                                                                              |
| :------------------------- | :--------------------------------------------------------------------------------------- |
| ✅ **Fully Type-Safe**     | Get compile-time dependency validation and circular dependency detection.                |
| ✅ **No Magic**            | Uses only functions and closures. The code is explicit and easy to trace.                |
| ✅ **Framework Agnostic**  | Works anywhere TypeScript works: frontend, backend, React, Node.js, etc.                 |
| ✅ **Testing Friendly**    | Provides simple and powerful APIs for mocking and dependency swapping.                   |
| ✅ **Performance Focused** | Features smart memoization, lazy loading, and is fully tree-shakeable.                   |
| ✅ **Stateless**           | Dependencies are resolved via closures, not global state, ensuring predictable behavior. |

## When to Use Supplier

Supplier excels in a variety of scenarios:

-   **Complex TypeScript applications** with deep function call hierarchies.
-   **Avoiding prop-drilling** in React (works in both Client and Server Components).
-   **Microservices** that need shared context propagation.
-   **Testing scenarios** requiring easy mocking and dependency swapping.
-   **A/B testing**, feature flagging, and prototyping.
-   **Any project** wanting powerful DI without the complexity of traditional containers.

## Quick Start in 3 Steps

Get up and running with Supplier in just a few minutes.

### 1. Create a Market

A `market` is a namespace where your suppliers are defined. You'll usually create one per application.

```typescript
import { createMarket } from "supplier"

const market = createMarket()
```

### 2. Define Suppliers

Suppliers create your app's dependencies. **Resources** hold data (like config or user sessions), while **Products** are services that can depend on other suppliers.

```typescript
// A Resource supplier for the user session
const sessionSupplier = market.offer("session").asResource<{ userId: string }>()

// A Product supplier that depends on the session
const userServiceSupplier = market.offer("userService").asProduct({
    suppliers: [sessionSupplier],
    factory: ($) => {
        const session = $(sessionSupplier) // Access the session data
        return {
            id: session.userId,
            name: "Jane Doe"
        }
    }
})
```

### 3. Assemble at Your Entry Point

At your application's entry point, `assemble` your main product, providing any required resources. The `index()` utility simplifies this process.

```typescript
import { index } from "supplier"

const session = { userId: "user-123" }

// Assemble the user service with a concrete session
const userService = userServiceSupplier
    .assemble(index(sessionSupplier.pack(session)))
    .unpack()

console.log(userService.id) // "user-123"
```

## Next Steps

-   Dive into the **[Core Concepts](core-concepts)** to understand the philosophy.
-   Walk through a **[Quick Example](quick-example)** of a complete application.
-   Learn about **[Testing and Mocking](testing)** strategies.
