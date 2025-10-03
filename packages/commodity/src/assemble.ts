import { ProductSupplier } from "#types"
import { once } from "#utils"

/**
 * Hires a team of product suppliers and return the assemble function.
 *
 * @param suppliers - Array of product suppliers to hire
 * @returns An object with an assemble method for dependency resolution
 * @internal
 */
export function hire(suppliers: ProductSupplier<string, any, any, any>[]) {
    return {
        /**
         * Assembles all suppliers by resolving their dependencies.
         * Creates a supply map where each supplier can access its dependencies.
         *
         * @param supplied - Pre-supplied dependencies (resources or alreary assembled products)
         * @returns The $ supply map
         */
        assemble: (supplied: Record<string, any>) => {
            const $: any = (supplier: { name: string }) => {
                const supply = $[supplier.name]
                if (!supply?.unpack) {
                    throw new Error(`Unsatisfied dependency: ${supplier.name}`)
                }
                return supply.unpack()
            }

            Object.defineProperties(
                $,
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

                Object.defineProperty($, supplier.name, {
                    get: once(() => supplier.assemble($)),
                    enumerable: true,
                    configurable: true
                })
            }

            // Prerun supplier factories
            for (const supplier of suppliers) {
                if (supplier.lazy) continue
                try {
                    $(supplier)
                } catch (e) {
                    // If prerun fails, we don't want to break the entire supply chain
                    // The error will be thrown again when the dependency is actually needed
                }
            }

            return $
        }
    }
}
