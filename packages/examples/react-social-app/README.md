# Supplier React Social App Example

A comprehensive React application demonstrating all features of the **Supplier** library - a functional, fully type-safe, and stateless dependency injection system for TypeScript.

## 🚀 Live Demo

This example showcases a social media application built entirely with Supplier's dependency injection patterns, demonstrating how to eliminate prop-drilling while maintaining type safety and testability.

## ✨ Features Demonstrated

### Core Supplier Features

-   **📦 Markets and Suppliers** - Organized dependency scopes
-   **🔄 Resources and Products** - Data and service containers
-   **🎯 Context Switching** - Dynamic dependency resolution with `reassemble()`
-   **⚡ Just-in-Time Suppliers** - Lazy loading and conditional assembly
-   **🧪 Mocking and Prototypes** - Testing with alternative implementations
-   **🔗 Deep Nesting** - No prop-drilling throughout the component tree

### React Integration

-   **🎛️ Hook Supplier Pattern** - React hooks as first-class Supplier products
-   **🎯 React Query Integration** - Data fetching with dependency injection
-   **🎨 Theme Switching** - Resource updates propagating automatically
-   **👥 Role-based Access Control** - Admin vs regular user contexts
-   **🔧 Feature Toggles** - Configuration-driven functionality
-   **📱 Modern JSX Components** - Clean, readable component syntax

## 🏗️ Architecture Overview

```
src/
├── services/           # Supplier markets and service definitions
│   ├── market.ts      # Main market with resources and products
│   └── queryIntegration.ts  # Hook suppliers for React Query
├── components/        # UI components as Supplier products
│   ├── market.tsx     # UI component market (JSX components)
│   ├── postComponents.tsx   # Post-related components
│   └── appComponents.tsx    # Layout and app components
├── types/            # TypeScript interfaces
├── utils/            # Utilities and mock data
├── test/             # Comprehensive test examples
├── App.tsx           # Main application component
└── main.tsx          # Entry point
```

## 🔧 How It Works

### 1. Market Creation

```typescript
// Create the main market for dependency injection
export const market = createMarket()

// Define resources (data/configuration)
export const sessionSupplier = market.offer("session").asResource<Session>()
export const configSupplier = market.offer("config").asResource<AppConfig>()
export const themeSupplier = market.offer("theme").asResource<Theme>()
```

### 2. Service Products

```typescript
// API client service that depends on config
export const apiClientSupplier = market.offer("apiClient").asProduct({
    suppliers: [configSupplier],
    factory: ($) => {
        const config = $(configSupplier)
        return {
            async get<T>(endpoint: string): Promise<ApiResponse<T>> {
                return fetch(`${config.api.baseUrl}${endpoint}`)
            }
            // ... other methods
        }
    }
})

// Post service that depends on API client and session
export const postServiceSupplier = market.offer("postService").asProduct({
    suppliers: [apiClientSupplier, sessionSupplier, configSupplier],
    factory: ($) => {
        const apiClient = $(apiClientSupplier)
        const session = $(sessionSupplier)

        return {
            async getPosts(): Promise<Post[]> {
                return apiClient.get("/posts")
            },
            canEdit(post: Post): boolean {
                return (
                    session.user.id === post.authorId ||
                    session.user.role === "admin"
                )
            }
        }
    }
})
```

### 3. React Components as Products

```typescript
// UI components that return JSX elements
export const postCardSupplier = uiMarket.offer("postCard").asProduct({
    suppliers: [themeSupplier, userBadgeSupplier, postActionsSupplier],
    factory: ($) => {
        const theme = $(themeSupplier)
        const UserBadge = $(userBadgeSupplier)
        const PostActions = $(postActionsSupplier)

        return ({ post }: { post: Post }) => {
            return (
                <article
                    className="bg-white border rounded-lg p-6 space-y-4"
                    style={{
                        backgroundColor: theme.backgroundColor,
                        borderColor: theme.borderColor
                    }}
                >
                    <div className="flex items-start justify-between">
                        <UserBadge user={post.author} />
                        <PostMenu post={post} />
                    </div>

                    <div>{post.content}</div>

                    <PostActions post={post} />
                </article>
            )
        }
    }
})
```

### 4. Context Switching

```typescript
// Switch between user and admin contexts
const regularSupplies = index(
    sessionSupplier.pack(regularUserSession),
    configSupplier.pack(appConfig)
)

const adminSupplies = index(
    sessionSupplier.pack(adminUserSession),
    configSupplier.pack(appConfig)
)

// Same component, different context
const regularLayout = mainLayoutSupplier.assemble(regularSupplies)
const adminLayout = mainLayoutSupplier.assemble(adminSupplies)
```

### 5. Just-in-Time Suppliers

```typescript
export const mainLayoutSupplier = market.offer("mainLayout").asProduct({
    suppliers: [navigationSupplier, sidebarSupplier],
    justInTime: [adminPanelSupplier], // Only loaded when needed
    factory: ($, $$) => {
        const session = $(sessionSupplier)
        const Navigation = $(navigationSupplier)
        const Sidebar = $(sidebarSupplier)
        const PostsFeed = $(postsFeedSupplier)

        return ({ posts, loading, onThemeToggle }) => {
            const showAdminPanel =
                session.user.role === "admin" &&
                config.features.adminPanelEnabled

            return (
                <div
                    className="min-h-screen"
                    style={{ backgroundColor: theme.backgroundColor }}
                >
                    <Navigation onThemeToggle={onThemeToggle} />

                    <div className="flex">
                        <Sidebar />

                        <main className="flex-1 p-6">
                            <div className="max-w-2xl mx-auto space-y-6">
                                {/* Just-in-time assembly with admin context */}
                                {showAdminPanel && (
                                    <div>
                                        {(() => {
                                            const adminPanel = $$[
                                                adminPanelSupplier.name
                                            ].assemble(
                                                index(
                                                    adminSessionSupplier.pack({
                                                        ...session,
                                                        user: {
                                                            ...session.user,
                                                            role: "admin"
                                                        }
                                                    }),
                                                    configSupplier.pack(config)
                                                )
                                            )
                                            const AdminPanel =
                                                adminPanel.unpack()
                                            return <AdminPanel />
                                        })()}
                                    </div>
                                )}

                                <PostsFeed posts={posts} loading={loading} />
                            </div>
                        </main>
                    </div>
                </div>
            )
        }
    }
})
```

## 🧪 Testing Features

### Service Mocking with `.pack()`

```typescript
it("should handle API errors", async () => {
    const mockApiClient = {
        get: vi.fn().mockRejectedValue(new Error("Network error")),
        post: vi.fn().mockResolvedValue({ data: null })
    }

    const supplies = index(
        sessionSupplier.pack(mockSession),
        configSupplier.pack(mockConfig),
        apiClientSupplier.pack(mockApiClient) // Override with mock
    )

    const postService = postServiceSupplier.assemble(supplies).unpack()

    await expect(postService.getPosts()).rejects.toThrow("Network error")
})
```

### Alternative Implementations with `.prototype()`

```typescript
// Create test version of notification service
const testNotificationService = notificationServiceSupplier.prototype({
    suppliers: [], // No dependencies
    factory: () => ({
        success: vi.fn(),
        error: vi.fn(),
        // Test-specific methods
        getMessages: () => ["test message"]
    })
})

// Use .try() to merge prototypes
const testPostService = postServiceSupplier.try(testNotificationService)
```

### Context Testing

```typescript
it("should show admin features for admin users", () => {
    const adminSupplies = index(
        sessionSupplier.pack(adminSession),
        configSupplier.pack(mockConfig)
    )

    const layout = mainLayoutSupplier.assemble(adminSupplies)
    const Layout = layout.unpack()

    render(<Layout posts={[]} />)

    expect(screen.getByText("Admin Panel")).toBeInTheDocument()
})
```

## 🎯 Key Benefits Shown

### 1. **No Prop Drilling**

Components access all dependencies through Supplier without manual prop passing through intermediate components.

### 2. **Type Safety**

Full TypeScript support with compile-time dependency validation and circular dependency detection.

### 3. **Easy Testing**

Mock any service or component using `.pack()` or create alternative implementations with `.prototype()`.

### 4. **Dynamic Context**

Switch between different user roles, themes, or configurations using `reassemble()`.

### 5. **Performance**

Smart memoization prevents duplicate dependency resolution within the same assembly context.

### 6. **Feature Toggles**

Enable/disable functionality based on configuration without code changes.

## 🚀 Getting Started

### Prerequisites

-   Node.js 18+
-   npm or yarn

### Installation

```bash
# Navigate to the example directory
cd packages/examples/react-social-app

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Development

The app will start on `http://localhost:3000` with:

-   **Demo controls** in the top-right corner
-   **Auto context switching** every 15 seconds (user ↔ admin)
-   **Interactive features** throughout the UI
-   **Feature explanations** in the bottom-left corner

## 📚 Learning Path

1. **Start with `src/services/market.ts`** - See how markets, resources, and products are defined
2. **Study `src/services/queryIntegration.ts`** - Learn the revolutionary hook supplier pattern
3. **Explore `src/components/market.tsx`** - Understand UI components as products with JSX
4. **Check `src/App.tsx`** - See how hook suppliers are assembled and used
5. **Review tests in `src/test/`** - Learn testing patterns with hook mocking and prototypes
6. **Experiment with the live demo** - Toggle themes, switch user roles, interact with posts

## 🔍 Code Highlights

### Hook Supplier Pattern

The most powerful pattern in this example is **treating React hooks as Supplier products**. This enables dependency injection at the hook level:

```typescript
// Define hook suppliers that encapsulate React Query hooks
export const usePostsQuerySupplier = hooksMarket
    .offer("usePostsQuery")
    .asProduct({
        suppliers: [postServiceSupplier],
        factory: ($) => {
            const postService = $(postServiceSupplier)

            // Return the actual React hook function
            return (page = 1) => {
                return useQuery({
                    queryKey: ["posts", page],
                    queryFn: async () => {
                        const response = await postService.getPosts(page)
                        return response.data
                    }
                })
            }
        }
    })

// Use in components: assemble and unpack the hook
function App() {
    const supplies = React.useMemo(
        () =>
            index(
                sessionSupplier.pack(currentSession),
                configSupplier.pack(appConfig)
            ),
        [currentSession]
    )

    // Assemble the hook supplier with current context
    const usePostsQueryAssembled = React.useMemo(() => {
        return usePostsQuerySupplier.assemble(supplies)
    }, [supplies])

    // Extract and call the hook
    const usePostsQuery = usePostsQueryAssembled.unpack()
    const { data: posts, isLoading } = usePostsQuery(1)

    // ... rest of component
}
```

**Benefits of Hook Suppliers:**

1. **Dependency Injection**: Hooks can access services without prop drilling
2. **Testable**: Mock hooks using `.pack()` and `.prototype()` just like services
3. **Contextual**: Same hook, different services based on assembly context
4. **Type Safe**: Full TypeScript support for hook parameters and return types

### Testing Hook Suppliers

```typescript
it("should handle like button interactions", async () => {
    // Mock the hook supplier directly
    const mockToggleLikeMutation = {
        mutate: vi.fn(),
        isPending: false,
        isError: false
        // ... other react-query properties
    } as any

    const mockUseTogglePostLikeMutation = vi.fn(() => mockToggleLikeMutation)

    const supplies = index(
        sessionSupplier.pack(mockSession),
        useTogglePostLikeMutationSupplier.pack(mockUseTogglePostLikeMutation)
    )

    const postCard = postCardSupplier.assemble(supplies)
    const PostCard = postCard.unpack()

    render(<PostCard post={testPost} />)

    fireEvent.click(screen.getByRole("button", { name: /like/i }))

    expect(mockToggleLikeMutation.mutate).toHaveBeenCalled()
})
```

### Theme Switching

```typescript
// Theme updates automatically propagate to all components
const handleThemeToggle = () => {
    setCurrentTheme((current) =>
        current.mode === "light" ? mockDarkTheme : mockLightTheme
    )
}
```

### Role-Based Access

```typescript
// Services automatically respect user permissions
const PostActions = ({ post }) => {
    const postService = $(postServiceSupplier)
    const canEdit = postService.canEdit(post)
    const canDelete = postService.canDelete(post)

    return (
        <div>
            {canEdit && <EditButton />}
            {canDelete && <DeleteButton />}
        </div>
    )
}
```

## 🤝 Contributing

This example demonstrates best practices for using Supplier in React applications. Feel free to:

-   **Suggest improvements** to the architecture
-   **Add new features** that showcase Supplier capabilities
-   **Enhance testing examples** with additional patterns
-   **Improve documentation** and code comments

## 📖 Related Documentation

-   [Supplier Core Concepts](/docs/core-concepts.md)
-   [Testing Guide](/docs/testing.md)
-   [Context Switching](/docs/context-switching.md)
-   [Performance Tips](/docs/performance.md)

---

**Built with ❤️ using [Supplier](https://github.com/supplier) - Containerless DI for TypeScript**
