# Context Switching & Enrichment

Supplier provides powerful, type-safe mechanisms for altering or adding to the dependency context at runtime.

## Override Context with `reassemble()`

Any assembled **Product** can be `.reassemble()`'d with new resources. This is perfect for scenarios where you need to change context deep within your application, such as impersonating a user or switching tenants.

When you reassemble, you only need to provide the resources you want to change. All other original dependencies from the initial `.assemble()` call are carried over automatically.

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

            // 3. Runs in the receiver's account context
            addTargetWalletEntry(amount)
        }
    }
})
```

## Enrich Context with Just-in-Time Suppliers

Sometimes, a dependency is only needed _after_ some initial work is done, and it may require new context that wasn't available at the application's entry point. This is the use case for **Just-in-Time (JIT) Suppliers**.

A common example is handling role-based access, where an admin-only service should only be available after a user's session has been validated.

1.  **Define JIT Suppliers**: In your product definition, list any JIT suppliers in the `justInTime` array.
2.  **Access in Factory**: The factory function receives a second argument (`$$`) containing the unresolved JIT suppliers.
3.  **Assemble When Needed**: When you're ready, call `.assemble()` on the JIT supplier, providing any new context required.

```typescript
const adminDashboardSupplier = market.offer("admin-dashboard").asProduct({
    suppliers: [adminSessionSupplier], // Depends on a specific admin session
    factory: ($) => {
        /* ... returns the admin dashboard ... */
    }
})

const AppSupplier = market.offer("app").asProduct({
    suppliers: [sessionSupplier], // Regular dependency
    justInTime: [adminDashboardSupplier, adminSessionSupplier], // JIT dependencies
    factory: ($, $$) => {
        // `$$` contains the JIT suppliers
        const session = $(sessionSupplier)

        if (session.user.role === "admin") {
            // Now that we have admin context, we can assemble the dashboard
            return $$[adminDashboardSupplier.name]
                .assemble({
                    ...$, // Pass along existing supplies
                    ...index(
                        // Add the new, more specific admin session
                        $$[adminSessionSupplier.name].pack({
                            ...session,
                            user: { ...session.user, role: "admin" }
                        })
                    )
                })
                .unpack()
        }

        return <UserDashboard />
    }
})
```
