# Context Switching & Enrichment

Commodity provides powerful, type-safe mechanisms for altering or adding to the dependency context at runtime.

## Override Context with `reassemble()`

Any assembled **Product** can be `.reassemble()`'d with new resources. This is perfect for scenarios where you need to change context deep within your application, such as impersonating a user or switching tenants.

When you reassemble, you only need to provide the resources you want to change. All other original dependencies from the initial `.assemble()` call are carried over automatically.

Here is a classic problem `reassemble()` solves: how can a user safely send money to another user if the sender does not have access to the receiver's account, without having to bypass the receiver's access control layer? Just impersonate the receiver with `reassemble()`!

```typescript
const sendMoneySupplier = market.offer("send-money").asProduct({
    suppliers: [addWalletEntrySupplier, sessionSupplier],
    factory: ($) => {
        return (toUserId: string, amount: number) => {
            const addWalletEntry = $(addWalletEntrySupplier)

            // 1. Runs with the original session's account
            addWalletEntry(-amount)

            // 2. Reassemble the dependency with a new session context
            const addTargetWalletEntry = $[addWalletEntrySupplier.name]
                .reassemble(index(sessionSupplier.pack({ userId: toUserId })))
                .unpack()

            // 3. Runs in the receiver's account context, so all security checks can still run.
            addTargetWalletEntry(amount)
        }
    }
})
```

## Enrich Context with Assemblers

Sometimes, a dependency is only needed _after_ some initial work is done, and it may require new context that wasn't available at the application's entry point. This is the use case for **Assemblers**.

A common example is handling role-based access, where an admin-only service should only be accessible after a user's session has been validated as being an admin.

1.  **Define Assemblers**: In your product definition, list any assemblers in the `assemblers` array.
2.  **Access in Factory**: The factory function receives a second argument (`$$`) containing the unresolved assemblers.
3.  **Assemble When Needed**: When you're ready, call `.assemble()` on the assembler, providing any new context required.

```tsx
type Session = { user: User; now: Date }
type AdminSession = Session & { user: User & { role: "admin" } }

// Session resource can hold any object of type Session
const sessionSupplier = market.offer("session").asResource<Session>()
const adminSessionSupplier = market
    .offer("admin-session")
    .asResource<AdminSession>()

const adminDashboardSupplier = market.offer("admin-dashboard").asProduct({
    suppliers: [adminSessionSupplier], // Depends on a specific admin session
    factory: ($) => {
        /* Non-admin users already guarded out at this point, no need for a runtime guard here*/
        /* ... returns the admin dashboard ... */
        return <div>Admin Dashboard</div>
    }
})

const AppSupplier = market.offer("app").asProduct({
    suppliers: [sessionSupplier],
    // Put in assemblers[] all product suppliers depending on new context (resources) computed in this factory
    assemblers: [adminDashboardSupplier]
    // Factories receive assemblers as 2nd argument
    factory: ($, $$) => () => {
        const session = $(sessionSupplier)
        const role = session.user.role
        if (role === "admin") {
            //Assemblers are not yet assembled, you need to assemble them with the new context.
            return $$[adminDashboardSupplier].assemble(
                {
                    ...$, // Keep all previous supplies
                    ...index(
                        // Notice adminSessionSupplier is NOT listed either in suppliers nor assemblers.

                        // It is not listed in suppliers because its value and type is not known before the
                        // factory is called. You'd get a missing supply type error in assemble() call at the
                        // entry point if you list in suppliers but don't provide a compatible value when you
                        // assemble.

                        // It is not listed in assemblers because only products benefit from being listed in
                        // assemblers, to allow mocking them or trying different prototype implementations.
                        // Resource suppliers can just be hard-coded via closure without losing any decoupling.
                        adminSessionSupplier.pack(session as AdminSession)

                        // Or rebuild the session for full type-safety without assertions now that role has been
                        // type guarded.

                        // adminSessionSupplier.pack({
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

        return <h1>User Dashboard - {session.user.name}</h1>
    }
})

const session = ...//read session
const App = appSupplier.assemble(index(sessionSupplier.pack(session))).unpack()
```
