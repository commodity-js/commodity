# 🚀 Commodity + React (Client components) Demo

This example showcases a basic social media wireframe built entirely with Commodity's dependency injection patterns, demonstrating how to eliminate prop-drilling while maintaining type safety and testability.

A preview browser should automatically show up, but if it doesn't, simply click on the Terminal icon in the sidebar, then click on 3001 under PREVIEWS.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

# Tips for using Commodity with React

-   **Rules of Hooks** - Don't call hooks in the factory's function body! If you call hooks, either in a component or custon hooks, be sure to call it in a function **returned** by the factory, like so:

```tsx
{
    factory: ($, $$) => () => {
        // useXYZ() or $(useXYZ)() if hook part of supplies
    }
}
```

-   **React Context alternative** - All you can achieve with React Context can be achieved using Commodity's API:

    -   `createContext()` → define a new resource with `asResource()`
    -   `useContext()` → access it through supplies with `$(someContextResourceSupplier)`
    -   <Provider > → call `reassemble()` on already supplied products, or use assemblers otherwise.

    The current demo has been designed to showcase this, via a deeply nested component tree. See [Context Switching and Enrichment](https://commodity-js.github.io/commodity/docs/guides/context-switching) for full documentation.

-   **Elements** - If your component is pure and doesn't need to receive additional props (outside $ supplies) or call hooks, returning JSX elements from the factory directly works.

-   **Preload pattern** - All factories are eagerly prerun in parallel by default, so preloading is very easy. To preload data, look at file src/api.ts in the demo to see how data prefetching has been achieved with react-query to avoid waterfall loading. To preload components, you can simply return JSX from the factory if possible (pure, no props, no hooks), or use the preload pattern like this:

```tsx
market.offer("Component").asProduct({
    factory: ($, $$) =>
        React.memo((props) => {
            // return jsx
        }),
    // Init is always called right after the factory, no matter if lazy is true or false
    init: (Component, $) => {
        <Component props={propSetToPreload1} />
        <Component props={propSetToPreload2} />
        <Component props={propSetToPreload3} />
    }
    lazy: false // false is the default, so can be omitted
})
```

-   **ESLint** - If you create hooks as products as described above, you'd call it like $(useXYZ)() which ESLint can't detect for the rules-of-hooks rule. You could store the hook in a temporary variable instead:

```tsx
{
    factory: ($, $$) => () => {
        const useXYZ = $(useXYZ)
        useXYZ() // ESLint rules-of-hooks should work
    }
}
```

## 🏗️ Architecture Overview

```
src/
├── components/        # UI components as Supplier products
│   ├── app.tsx       # Main app component
│   ├── comment.tsx   # Comment component
│   ├── feed.tsx      # Feed component
│   ├── post.tsx      # Post component
│   ├── reply.tsx     # Reply component
│   └── session.tsx   # Session management component
├── api.ts            # API service definitions and data fetching
├── context.ts        # React context for dependency injection
├── index.css         # Global styles
├── main.tsx          # Application entry point
├── market.ts         # Main market with resources and products
└── query.ts          # React Query integration and hooks
```

## 📚 Learning Path

1. **Explore `src/api.ts`** - See how to integrate react-query for data loading and preloading
2. **Check `src/context.ts`** - See how to aggregate resource definitions in a ctx to replace React Context.
3. **Review `src/components/`** - Understand how to create components as products with JSX
4. **Examine `src/main.tsx`** - See how everything is assembled and used
5. **Experiment with the live demo** - Notice the absence of waterfall loading

## 📖 Related Documentation

-   [Commodity Core Library](https://github.com/commodity-js/commodity)
-   [Commodity Documentation](https://github.com/commodity-js/commodity#readme)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using [Commodity](https://github.com/commodity-js/commodity) - First fully type-inferred DI for TypeScript**
