# Tips for using Typearch with React

-   **Rules of Hooks** - Don't call hooks in the factory's function body! If you call hooks, either in a component or custon hooks, be sure to call it in a function **returned** by the factory, like so:

```tsx
{
    factory: ($, $$) => () => {
        // useXYZ() or $($$useXYZ).unpack()() if hook part of supplies
    }
}
```

-   **React Context alternative** - All you can achieve with React Context can be achieved using Typearch's API:

    -   `createContext()` → define a new resource with `asResource()`
    -   `useContext()` → access it through supplies with `$(someContextResourceSupplier).unpack()`
    -   `<Provider >` → call `reassemble()` on already supplied products, or use assemblers otherwise.

    The [React demo](/examples/react-client) has been designed to showcase this, via a deeply nested component tree. See [Assemblers](assemblers) for full documentation.

-   **Elements** - If your component is pure and doesn't need to receive additional props (outside $ supplies) or call hooks, returning JSX elements from the factory directly works.

-   **Preload pattern** - All factories are eagerly prerun in parallel by default, so preloading is very easy. To preload data, look at file src/api.ts in the [demo](/examples/react-client) to see how data prefetching has been achieved with react-query to avoid waterfall loading. To preload components, you can simply return JSX from the factory if possible (pure, no props, no hooks), or use the preload pattern like this:

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

-   **ESLint** - If you create hooks as products as described above, you'd call it like $(useXYZ).unpack()() which ESLint can't detect for the rules-of-hooks rule. You could store the hook in a temporary variable instead:

```tsx
{
    factory: ($, $$) => () => {
        const useXYZ = $(useXYZ).unpack()
        useXYZ() // ESLint rules-of-hooks should work
    }
}
```
