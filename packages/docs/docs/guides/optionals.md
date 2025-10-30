# Optionals

Optionals are resource suppliers that a product _may_ depend on, but doesn't _require_ to function. When you declare a resource supplier in the `optionals` array instead of the `suppliers` array, you're telling architype that:

1. The product can be assembled without providing this resource
2. The resource will be `undefined` if not provided
3. TypeScript will enforce proper undefined checks when accessing the optional

This is particularly useful for feature flags, authentication contexts, caching layers, or any dependency that might not always be present.

## Basic Usage

Here's a simple example of using an optional resource:

```typescript
import { createMarket, index } from "architype"

const market = createMarket()

// Define an optional configuration resource
const $$apiKey = market.offer("apiKey").asResource<string>()

// Use it as an optional dependency
const $$apiClient = market.offer("apiClient").asProduct({
    optionals: [$$apiKey],
    factory: ($) => {
        // Access the optional resource - it may be undefined
        const apiKey = $($$apiKey)?.unpack()

        return {
            makeRequest: async (endpoint: string) => {
                const headers: Record<string, string> = {
                    "Content-Type": "application/json"
                }

                // Use the API key if it's provided
                if (apiKey) {
                    headers["Authorization"] = `Bearer ${apiKey}`
                }

                return fetch(endpoint, { headers })
            }
        }
    }
})

// Assemble without the optional - works fine!
const $client = $$apiClient.assemble({})
const client = $client.unpack()

// Or provide it when available
const $authenticatedClient = $$apiClient.assemble(
    index($$apiKey.pack("secret-api-key-123"))
)
```

Notice how `$($$apiKey)` returns `Resource<string> | undefined`. The resource itself is optional, not just its value. You need to use optional chaining (`?.`) to safely unpack it.

## Use case: Optional Authentication

Create services that work differently for authenticated vs. anonymous users:

```typescript
const market = createMarket()

const $$userAuth = market.offer("userAuth").asResource<{
    userId: string
    token: string
}>()

const $$api = market.offer("api").asProduct({
    optionals: [$$userAuth],
    factory: ($) => {
        const auth = $($$userAuth)?.unpack()

        return {
            getPublicData: () => fetch("/api/public"),
            getPrivateData: () => {
                if (!auth) {
                    throw new Error("Authentication required")
                }
                return fetch("/api/private", {
                    headers: { Authorization: `Bearer ${auth.token}` }
                })
            }
        }
    }
})

// Public access
const $publicApi = $$api.assemble({})

// Authenticated access
const $authApi = $$api.assemble(
    index($$userAuth.pack({ userId: "123", token: "xyz" }))
)
```

## Optionals with Assemblers

[Learn more about using optionals and assemblers](assemblers)
