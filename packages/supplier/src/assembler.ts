import { ProductSupplier } from "#types"
import { once } from "#utils"

export function hire(suppliers: ProductSupplier<string, any, any, any>[]) {
    return {
        assemble: (supplied: Record<string, any>) => {
            const supplies: any = (name: string | { name: string }) => {
                const actualName = typeof name === "string" ? name : name.name
                const supply = supplies[actualName]
                if (!supply?.unpack) {
                    throw new Error(`Unsatisfied dependency: ${actualName}`)
                }
                return supply.unpack()
            }

            Object.defineProperties(
                supplies,
                Object.getOwnPropertyDescriptors(supplied)
            )

            for (const supplier of suppliers) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        supplied,
                        supplier.name
                    )
                ) {
                    continue
                }

                Object.defineProperty(supplies, supplier.name, {
                    get: once(() => supplier.assemble(supplies)),
                    enumerable: true,
                    configurable: true
                })
            }

            // Preload products that have preload: true
            const preloadPromises = suppliers
                .filter(
                    (supplier) =>
                        supplier.preload &&
                        !Object.prototype.hasOwnProperty.call(
                            supplied,
                            supplier.name
                        )
                )
                .map((supplier) => {
                    // Access the getter to trigger memoization
                    try {
                        return Promise.resolve(supplies(supplier.name))
                    } catch (error) {
                        // If preloading fails, we don't want to break the entire supply chain
                        // The error will be thrown again when the dependency is actually needed
                        return Promise.resolve(null)
                    }
                })

            // Execute preloading in parallel (non-blocking)
            if (preloadPromises.length > 0) {
                Promise.all(preloadPromises).catch(() => {
                    // Silently ignore preload errors - they'll be thrown when actually accessed
                })
            }

            return supplies
        }
    }
}
