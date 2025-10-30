# Basic Usage

This guide covers the fundamental concepts of Architype in detail, providing you with everything you need to build applications with the dependency injection supply chain pattern.

## Understanding the Supply Chain Metaphor

Architype uses a supply chain metaphor to make dependency injection intuitive. Instead of abstract containers and providers, you work with:

-   **Markets** - Namespaces where suppliers are defined
-   **Suppliers** - Entities that provide either resources or products
-   **Resources** - Simple data containers (configuration, sessions, etc.)
-   **Products** - Complex services built from other suppliers
-   **Assembly** - The process of building products with their dependencies

Think of it like a real supply chain: raw materials (resources) are transformed by factories (products) into increasingly complex goods, all orchestrated in a marketplace.

## Step 1: Creating a Market

Every Architype application starts with a market. A market is a namespace that ensures all your suppliers have unique names and provides the foundation for type-safe dependency resolution.

```typescript
import { createMarket } from "architype"

const market = createMarket()
```

**Key Points:**

-   You typically create one market per application
-   Markets prevent name conflicts by maintaining a registry
-   The name registry is the only state a market manages
-   Markets are lightweight and have minimal overhead

## Step 2: Defining Resources

Resources are the simplest form of suppliers. They represent data and context that your application needs - configuration values, user sessions, database connections, or any other data your services depend on.

### Creating a Resource Supplier

```typescript
const $$config = market.offer("config").asResource<{
    apiUrl: string
    timeout: number
}>()
```

The `$$` prefix is a convention (not required) to distinguish supplier definitions from actual instances (resources or products).

### Packing Resources with Values

Resources are defined separately from their values. At runtime, you "pack" a resource supplier with a concrete value:

```typescript
const $config = $$config.pack({
    apiUrl: "https://api.example.com",
    timeout: 5000
})
```

The `$` prefix (also a convention) indicates an actual instance of a resource or product.

### Unpacking Resource Values

To access the value inside a resource:

```typescript
const config = $config.unpack()
console.log(config.apiUrl) // "https://api.example.com"
```

### Resources Can Hold Any Type

Resources aren't limited to objects. They can hold any TypeScript type:

```typescript
// Simple types
const $$apiKey = market.offer("apiKey").asResource<string>()
const $$port = market.offer("port").asResource<number>()
const $$isProduction = market.offer("isProduction").asResource<boolean>()

// Complex types
const $$database = market.offer("database").asResource<Database>()

// Even functions
const $$logger = market.offer("logger").asResource<{
    log: (message: string) => void
    error: (error: Error) => void
}>()
```

## Step 3: Defining Products

Products are where the real power of Architype shines. Products are factory functions that can depend on other suppliers (both resources and other products) to create services, components, or any complex functionality.

### Basic Product Definition

```typescript
const $$userService = market.offer("userService").asProduct({
    suppliers: [$$config, $$database],
    factory: ($) => {
        const config = $($$config).unpack()
        const db = $($$database).unpack()

        return {
            getUser: (id: string) => {
                return db.query(`${config.apiUrl}/users/${id}`)
            }
        }
    }
})
```

### Understanding the Factory Function

The factory function receives a special `$` parameter (pronounced "supplies") that provides access to all declared dependencies:

```typescript
factory: ($) => {
    // Use $($$supplier) to access a dependency
    const $resource = $($$resource)

    // Call .unpack() to get the actual value
    const value = $resource.unpack()

    // Or chain them together
    const value2 = $($$supplier).unpack()

    // Return whatever your product produces
    return myService
}
```

### Products Depending on Other Products

Products can depend on other products, creating a dependency tree:

```typescript
const $$authService = market.offer("authService").asProduct({
    suppliers: [$$config],
    factory: ($) => {
        const config = $($$config).unpack()
        return {
            authenticate: (token: string) => {
                // Authentication logic
                return { userId: "123", token }
            }
        }
    }
})

const $$userProfile = market.offer("userProfile").asProduct({
    suppliers: [$$authService, $$database],
    factory: ($) => {
        const auth = $($$authService).unpack()
        const db = $($$database).unpack()

        return {
            getProfile: (token: string) => {
                const session = auth.authenticate(token)
                return db.getUser(session.userId)
            }
        }
    }
})
```

## Step 4: The Factory Lifecycle

Understanding how and when factories are called is crucial for effective use of Architype.

### One Factory Call Per Assembly

**Important:** Your factory function is called exactly **once per `assemble()` call**. This eliminates the need to explicitely configure traditional DI service lifecycles (transient, scoped, singleton).

```typescript
const $$service = market.offer("service").asProduct({
    suppliers: [],
    factory: ($) => {
        console.log("Factory called!")
        return { value: Math.random() }
    }
})

const $service1 = $$service.assemble({})
console.log($service1.unpack()) // Factory called! { value: 0.123 }

const $service2 = $$service.assemble({})
console.log($service2.unpack()) // Factory called! { value: 0.456 }

// But within the same assembly:
const $service3 = $$service.assemble({})
const value1 = $service3.unpack() // Factory called! { value: 0.789 }
const value2 = $service3.unpack() // { value: 0.789 } (same instance, no new call)
```

### Returning Functions for Multiple Calls

If you need something that can be called multiple times or needs to run side-effects, return a function from your factory:

```typescript
const $$userRepository = market.offer("userRepository").asProduct({
    suppliers: [$$database],
    factory: ($) => {
        const db = $($$database).unpack()

        // Setup code runs once
        const cache = new Map()
        console.log("Repository initialized")

        // Return a function that can be called many times
        return {
            getUser: (id: string) => {
                if (cache.has(id)) {
                    console.log(`Cache hit for ${id}`)
                    return cache.get(id)
                }

                console.log(`Fetching user ${id}`)
                const user = db.findUser(id)
                cache.set(id, user)
                return user
            }
        }
    }
})

// Later in your code:
const repo = $$userRepository.assemble(index($$database.pack(db))).unpack()

repo.getUser("123") // Repository initialized, Fetching user 123
repo.getUser("456") // Fetching user 456
repo.getUser("123") // Cache hit for 123
```

### Products Can Return Anything

Factories can return any TypeScript value, even Promises, so nothing special is required to handle async code.

```typescript
// Return objects
const $$api = market.offer("api").asProduct({
    factory: ($) => ({ get: () => {}, post: () => {} })
})

// Return functions
const $$handler = market.offer("handler").asProduct({
    factory: ($) => (request: Request) => new Response()
})

// Return promises
const $$asyncData = market.offer("asyncData").asProduct({
    factory: async ($) => {
        const data = await fetch("...")
        return data.json()
    }
})

// Return React components
const $$Header = market.offer("Header").asProduct({
    factory: ($) => () => <header>My App</header>
})
```

## Step 5: Assembly at the Entry Point

Assembly is where everything comes together. At your application's entry point, you assemble your main product by providing the required resources.

### Basic Assembly

```typescript
const db = await connectToDatabase()
const session = { userId: "user-123" }

const $app = $$app.assemble({
    [$$database.name]: $$database.pack(db),
    [$$session.name]: $$session.pack(session)
})

const app = $app.unpack()
```

This syntax works, but it's verbose. That's why Architype provides the `index()` utility.

### Using the `index()` Helper

The `index()` function simplifies assembly by converting an array of packed resources into the object format `assemble()` expects:

```typescript
import { index } from "architype"

const $app = $$app.assemble(index($$database.pack(db), $$session.pack(session)))

const app = $app.unpack()
```

Much cleaner! The `index()` function automatically maps each resource to its supplier name.

### Type Safety in Assembly

TypeScript will enforce that you provide all required resources:

```typescript
const $$service = market.offer("service").asProduct({
    suppliers: [$$config, $$database],
    factory: ($) => ({
        /* ... */
    })
})

// ❌ Type error: Missing required resources
$$service.assemble({})

// ❌ Type error: Missing $$database
$$service.assemble(index($$config.pack(config)))

// ✅ All required resources provided
$$service.assemble(index($$config.pack(config), $$database.pack(db)))
```

### You Only Supply Resources

Notice that you only provide resources during assembly, not products. Products are automatically "auto-wired" - they assemble themselves by recursively resolving their dependencies:

```typescript
const $$db = market.offer("db").asResource<Database>()
const $$session = market.offer("session").asResource<Session>()

const $$userService = market.offer("userService").asProduct({
    suppliers: [$$db, $$session],
    factory: ($) => ({
        /* ... */
    })
})

const $$app = market.offer("app").asProduct({
    suppliers: [$$userService], // Product dependency
    factory: ($) => {
        const userService = $($$userService).unpack()
        return {
            /* ... */
        }
    }
})

// You only provide the resources ($$db and $$session)
// $$userService is assembled automatically
const $app = $$app.assemble(index($$db.pack(database), $$session.pack(session)))
```

## Performance: Eager vs Lazy Loading

By default, Architype eagerly constructs all products in parallel when you call `assemble()`. This eliminates waterfall loading issues common in traditional DI systems.

### Eager Loading (Default)

```typescript
const $$eagerService = market.offer("eagerService").asProduct({
    suppliers: [$$database],
    factory: ($) => {
        console.log("Eager service factory called")
        return buildService($($$database))
    }
    // lazy: false is the default
})

const $app = $$app.assemble(index($$database.pack(db)))
// "Eager service factory called" - happens immediately
```

### Lazy Loading

For expensive products that might not always be needed, use lazy loading:

```typescript
const $$expensiveService = market.offer("expensiveService").asProduct({
    suppliers: [$$database],
    factory: ($) => {
        console.log("Expensive service factory called")
        return buildExpensiveService($($$database))
    },
    lazy: true // Only construct when first accessed
})

const $$app = market.offer("app").asProduct({
    suppliers: [$$expensiveService],
    factory: ($) => {
        // Factory not called yet

        return (useExpensive: boolean) => {
            if (useExpensive) {
                // NOW the factory is called
                const service = $($$expensiveService).unpack()
                return service.doWork()
            }
            return "Skipped expensive work"
        }
    }
})
```

**When to use lazy loading:**

-   The product is expensive to construct
-   The product might not be needed in every execution path
-   You want to defer initialization until actual use

**When to use eager loading (default):**

-   The product will likely be needed
-   You want to parallelize construction

## Practical Example: Building a Blog API

Let's put everything together with a realistic example:

```typescript
import { createMarket, index } from "architype"

// 1. Create the market
const market = createMarket()

// 2. Define resources
const $$database = market.offer("database").asResource<Database>()
const $$config = market.offer("config").asResource<{
    postsPerPage: number
    cacheEnabled: boolean
}>()
const $$currentUser = market.offer("currentUser").asResource<{
    id: string
    role: "admin" | "user"
}>()

// 3. Define products (services)
const $$postsRepository = market.offer("postsRepository").asProduct({
    suppliers: [$$database],
    factory: ($) => {
        const db = $($$database).unpack()

        return {
            findById: (id: string) => db.posts.findOne({ id }),
            findAll: (page: number, limit: number) =>
                db.posts
                    .find()
                    .skip(page * limit)
                    .limit(limit),
            create: (post: Post) => db.posts.insert(post),
            update: (id: string, post: Partial<Post>) =>
                db.posts.update({ id }, post),
            delete: (id: string) => db.posts.delete({ id })
        }
    }
})

const $$authorizationService = market.offer("authorizationService").asProduct({
    suppliers: [$$currentUser],
    factory: ($) => {
        const user = $($$currentUser).unpack()

        return {
            canCreate: () => user.role === "admin",
            canEdit: (post: Post) =>
                user.role === "admin" || post.authorId === user.id,
            canDelete: (post: Post) =>
                user.role === "admin" || post.authorId === user.id
        }
    }
})

const $$postsService = market.offer("postsService").asProduct({
    suppliers: [$$postsRepository, $$authorizationService, $$config],
    factory: ($) => {
        const repo = $($$postsRepository).unpack()
        const auth = $($$authorizationService).unpack()
        const config = $($$config).unpack()

        return {
            getPosts: async (page: number = 0) => {
                return repo.findAll(page, config.postsPerPage)
            },

            getPost: async (id: string) => {
                return repo.findById(id)
            },

            createPost: async (post: Post) => {
                if (!auth.canCreate()) {
                    throw new Error("Unauthorized")
                }
                return repo.create(post)
            },

            updatePost: async (id: string, updates: Partial<Post>) => {
                const post = await repo.findById(id)
                if (!auth.canEdit(post)) {
                    throw new Error("Unauthorized")
                }
                return repo.update(id, updates)
            },

            deletePost: async (id: string) => {
                const post = await repo.findById(id)
                if (!auth.canDelete(post)) {
                    throw new Error("Unauthorized")
                }
                return repo.delete(id)
            }
        }
    }
})

// 4. Define the API handler
const $$apiHandler = market.offer("apiHandler").asProduct({
    suppliers: [$$postsService],
    factory: ($) => {
        const posts = $($$postsService).unpack()

        return async (request: Request) => {
            const url = new URL(request.url)
            const path = url.pathname

            if (path.startsWith("/posts")) {
                if (request.method === "GET") {
                    const page = parseInt(url.searchParams.get("page") || "0")
                    const data = await posts.getPosts(page)
                    return Response.json(data)
                }

                if (request.method === "POST") {
                    const post = await request.json()
                    const created = await posts.createPost(post)
                    return Response.json(created, { status: 201 })
                }
            }

            return new Response("Not Found", { status: 404 })
        }
    }
})

// 5. Assembly at request time
export async function handleRequest(request: Request) {
    const db = await getDatabase()
    const user = await authenticateRequest(request)
    const config = {
        postsPerPage: 10,
        cacheEnabled: true
    }

    const handler = $$apiHandler
        .assemble(
            index(
                $$database.pack(db),
                $$currentUser.pack(user),
                $$config.pack(config)
            )
        )
        .unpack()

    return handler(request)
}
```

Notice how:

-   Each service has clear, single responsibilities
-   Dependencies are explicit and type-safe
-   Authorization logic is separated from data access
-   The handler doesn't need to know about the database or config
-   Different requests can have different users without any global state

## Naming Conventions

While not required, the Architype community follows these conventions:

-   `$$supplier` - Supplier definitions (double dollar sign)
-   `$$` - 2nd argument received by a factory, which provided in-factory access to suppliers (optionals or assemblers)
-   `$instance` - Assembled products/resources (single dollar sign)
-   `$` - 1st argument received by a factory, which provided in-factory access to supplies from suppliers or optionals.
-   `value` - Unpacked values (no prefix)

```typescript
const $$config = market.offer("config").asResource<Config>() // Supplier
const $config = $$config.pack({
    /* ... */
}) // Instance
const config = $config.unpack() // Value
```

This makes it immediately clear what type of entity you're working with at a glance.

## Next Steps

Now that you understand the basics, explore these advanced features:

-   **[Testing and Mocking](testing)** - Learn how to test your products with mocks
-   **[Performance Optimization](performance)** - Advanced lazy loading and initialization strategies
-   **[Design Philosophy](design-philosophy)** - Understanding the principles behind Architype

For more advanced patterns:

-   **[Optionals](optionals)** - Handle dependencies that may or may not be present
-   **[Assemblers](assemblers)** - For Just-in-time product assembly.
