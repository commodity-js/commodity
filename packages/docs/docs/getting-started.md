# Getting Started

## Quick Start in 4 Steps

Get up and running with Commodity in just a few minutes.

### 1. Installation

```bash
npm install commodity
```

### 2. Create a Market

A `market` is a namespace where your suppliers are defined. You'll usually create one per application.

```typescript
import { createMarket } from "commodity"

const market = createMarket()
```

### 3. Define Suppliers

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

### 4. Assemble at Your Entry Point

At your application's entry point, `assemble` your main product, providing any required resources. The `index()` utility simplifies this process.

```typescript
import { index } from "commodity"

const session = { userId: "user-123" }

// Assemble the user service with a concrete session
const userService = userServiceSupplier
    .assemble(index(sessionSupplier.pack(session)))
    .unpack()

console.log(userService.id) // "user-123"
```

## Next Steps

-   Walk through a **[Basic Example](examples/simple-example)** of a complete application.
-   Learn about **[Testing and Mocking](guides/testing)** strategies.
-   Dive into the **[Design philosophy and semantics](guides/design-philosophy)** of Commodity.
