import { ProductSupplier } from "#types"
import { once } from "#utils"

/**
 * Hires a team of product suppliers and return the assemble function.
 *
 * @param suppliers - Array of product suppliers to hire
 * @returns An object with an assemble method for dependency resolution
 * @internal
 */
export function hire(suppliers: ProductSupplier[]) {
    return {
        /**
         * Assembles all suppliers by resolving their dependencies.
         * Creates a supply map where each supplier can access its dependencies.
         *
         * @param supplied - Pre-supplied dependencies (resources or alreary assembled products)
         * @returns The $ supply map
         */
        assemble: (supplied: Record<string, any>) => {
            const supplies: Record<string, any> = {}

            Object.defineProperties(
                supplies,
                Object.getOwnPropertyDescriptors(supplied)
            )

            // Reverse the suppliers to respect last supplier in array wins convention.
            for (const supplier of suppliers.toReversed()) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        supplies,
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

            // Prerun supplier factories
            for (const supplier of suppliers.toReversed()) {
                if (supplier.lazy) continue
                try {
                    supplies[supplier.name]?.unpack()
                } catch (e) {
                    // console.error(e)
                    // If prerun fails, we don't want to break the entire supply chain
                    // The error will be thrown again when the dependency is actually needed
                }
            }

            return supplies
        }
    }
}
