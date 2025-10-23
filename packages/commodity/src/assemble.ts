import { ProductSupplier, Supplier } from "#types"
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
         *
         * @param supplied - Pre-supplied dependencies (resources or alreary assembled products)
         * @returns The $ supply map
         */
        assemble: (supplied: Record<string, any>) => {
            let supplies: Record<string, any> = {}

            for (const supplier of Object.values(suppliers)) {
                supplies[supplier.name] = once(() =>
                    supplier.assemble(supplies)
                )
            }

            supplies = { ...supplies, ...supplied }

            const $ = (supplier: { name: string }) => {
                const supply = supplies[supplier.name]
                // A supply can only be a product, resource or function, so this is sufficient to discriminate.
                if (typeof supply === "function") {
                    return supply()
                }
                return supply
            }

            $.obj = once(() =>
                Object.fromEntries(
                    Object.keys(supplies).map((name) => [name, $({ name })])
                )
            )

            // Prerun supplier factories
            for (const supplier of Object.values(suppliers)) {
                if (supplier.lazy) continue
                try {
                    $(supplier)?.unpack()
                } catch (e) {
                    // console.error(e)
                    // If prerun fails, we don't want to break the entire supply chain
                    // The error will be thrown again when the dependency is actually needed
                }
            }

            return $
        }
    }
}
