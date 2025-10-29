# Context Switching & Enrichment

Architype provides powerful, type-safe mechanisms for altering or adding to the dependency context at runtime.

## Enrich Context with Assemblers

Assemblers allow you to use product suppliers in your factory that can't be assembled at the application's entry point because they depend on a resource (i.e., a piece of context) that is only known or computed deeper in the dependency chain.

Let's start with a simple example: an `AdminPanel`. An `AdminPanel` can't be built until the current session has been validated as having an "admin" role, which doesn't need to be known when the application starts. You might want to compute it lazily, only if the user requests to see the `AdminPanel`. Here's how to do it with assemblers:

```tsx
type Session = { user: User; now: Date }
type AdminSession = Session & { user: User & { role: "admin" } }

// Session resource can hold any object of type Session
const $$session = market.offer("session").asResource<Session>()

// Values of different types should be given different resources, even if in the end they might hold the same value.
const $$adminSession = market
    .offer("admin-session")
    .asResource<AdminSession>()

const $$adminPanel = market.offer("admin-dashboard").asProduct({
    suppliers: [$$adminSession], // Depends on an admin session
    factory: ($) => {
        /* Non-admin users already guarded out at this point, no need for a runtime guard here*/
        /* ... returns the admin dashboard ... */
        return <div>Admin Panel</div>
    }
})

//PascalCase convention for React component
const $$App = market.offer("app").asProduct({
    suppliers: [$$session],
    // Put in assemblers[] all product suppliers depending on new context (resources) computed in this factory
    assemblers: [$$adminPanel]
    // Pass that new context in optionals so you aren't forced to provide it at the entry point
    // Optionals can also be accessed via $$()
    optionals: [$$adminSession]
    // Factories receive assemblers as 2nd argument
    factory: ($, $$) => () => {
        const session = $($$session).unpack()
        const role = session.user.role
        if (role === "admin") {
            //Assemblers are not yet assembled, you need to assemble them with the new context.
            return $$($$adminPanel).assemble(
                {
                    ...$, // Keep all previous supplies if needed (not needed here, for example purpose only)
                    ...index(
                        // Notice $$adminSession is NOT listed either in suppliers nor assemblers.

                        // It is not listed in suppliers because its value and type is not known before the
                        // factory is called. You'd get a missing supply type error in assemble() call at the
                        // entry point if you list in suppliers but don't provide a compatible value when you
                        // assemble.

                        // It is not listed in assemblers because only products benefit from being listed in
                        // assemblers, to allow mocking them or trying different prototype implementations.
                        // Resource suppliers can just be hard-coded via closure without losing any decoupling.
                        $$($$adminSession).pack(session as AdminSession)

                        // Or, even better, rebuild the session for full type-safety without assertions now that role has been
                        // type guarded.

                        // $$adminSession.pack({
                        //     ...session,
                        //     user: {
                        //         ...session.user,
                        //         role
                        //     }
                        // })
                    )
                }
            )
        }

        return <h1>User Panel - {session.user.name}</h1>
    }
})

const session = ...//read session
const App = $$app.assemble(index($$session.pack(session))).unpack()
```

> **Analogy with React Context**
>
> If you're familiar with React, you can think of an `Assembler` as being similar to a ContextProvider.
> Assemblers work similarly by allowing you to provide new dependencies that are only available to children
> deeper in the call-stack.

## Shorthand: `reassemble()`

Sometimes, you don't need to build a new product from scratch based on new context, like in the `AdminPanel` example. Instead, you may just need to rebuild an _already assembled_ product with a different context. In that case, you don't need assemblers; you can just use `$product.reassemble()`.

When you reassemble, you only need to provide the resources you want to change. All other original dependencies from the initial `.assemble()` call are carried over automatically.

Here is a classic problem `.reassemble()` solves: how can a user safely send money to another user when the sender does not have access to the receiver's account, without having to bypass the receiver's access control layer? Just impersonate the receiver with `.reassemble()`!

```typescript
const $$sendMoney = market.offer("send-money").asProduct({
    suppliers: [$$addWalletEntry, $$session],
    factory: ($) => {
        return (toUserId: string, amount: number) => {
            const addWalletEntry = $($$addWalletEntry).unpack()

            // 1. Runs with the original session's account
            addWalletEntry(-amount)

            // 2. Reassemble the dependency with a new session context
            const addTargetWalletEntry = $($$addWalletEntry)
                .reassemble(index($$session.pack({ userId: toUserId })))
                .unpack()

            // 3. Runs in the receiver's account context, so all security checks can still run.
            addTargetWalletEntry(amount)
        }
    }
})
```

> **Analogy with React Context**
>
> Continuing the React analogy, `.reassemble()` is like calling `<ContextProvider />` a second time on the same
> context with a new value deeper in the call stack.

## Performance: Assembling Multiple Assemblers with `.hire()` and `.$()`

Let's say you have multiple admin-only components to render in React now that you know the user is an admin.

```tsx
const $$App = market.offer("app").asProduct({
    suppliers: [$$session],
    assemblers: [$$adminPanel, $$adminDashboard, $$adminProfile],
    factory: ($, $$) => () => {
        const session = $($$session).unpack()
        const role = session.user.role
        if (role === "admin") {
            const newSupplies = {
                ...$,
                ...index($$adminSession.pack(session as AdminSession))
            }

            const Panel = $$($$adminPanel).assemble(newSupplies).unpack()
            const Dashboard = $$($$adminDashboard)
                .assemble(newSupplies)
                .unpack()
            const Profile = $$($$adminProfile).assemble(newSupplies).unpack()

            return (
                <>
                    <Panel />
                    <Dashboard />
                    <Profile />
                </>
            )
        }

        return <h1>User Panel - {session.user.name}</h1>
    }
})
```

This is not efficient, as the assemble() context needs to be built three times independently. A better way is to use `hire()`

```tsx
const $$App = market.offer("app").asProduct({
    suppliers: [$$session],
    assemblers: [$$adminPanel, $$adminDashboard, $$adminProfile],
    factory: ($, $$) => () => {
        const session = $($$session).unpack()
        const role = session.user.role
        if (role === "admin") {
            const $Panel = $$($$adminPanel)
                .hire($$adminDashboard, $$adminProfile)
                .assemble({
                    ...$,
                    ...index(
                        $$adminSession.pack(session as AdminSession)
                        // + Other supplies required by any of the suppliers in the list.
                        // The assemble() call is type-safe and will ensure all necessary
                        // dependencies for all listed suppliers are provided.
                    )
                })

            const Panel = $Panel.unpack()
            // Since they were built together, Dashboard and Profile are available in Panel's supplies ($) even
            // if Panel does not need them in their factory. product.$() is the same as $(), but for usage outside
            // the factory, after the product has been built.
            const Dashboard = $Panel.$($$adminDashboard).unpack()
            const Profile = $Panel.$($$adminProfile).unpack()

            return (
                <>
                    <Panel />
                    <Dashboard />
                    <Profile />
                </>
            )
        }

        return <h1>User Panel - {session.user.name}</h1>
    }
})
```
