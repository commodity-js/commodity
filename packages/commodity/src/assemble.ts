import { ProductSupplier } from "#types"
import { once } from "#utils"

/**
 * Hires a team of product suppliers and provides an assembly function.
 * This function creates a dependency resolution system that can assemble products
 * by resolving their dependencies in the correct order. It handles circular dependency
 * detection and lazy evaluation through property getters.
 *
 * The hire function is the core of the commodity dependency injection system. It creates
 * a proxy-like object that lazily assembles products as they're accessed, ensuring that
 * each product is only assembled once even if multiple products depend on it.
 *
 * @param suppliers - Array of product suppliers to hire
 * @returns An object with an assemble method for dependency resolution
 * @internal
 * @example
 * ```typescript
 * const team = hire([userService, logger, database])
 * const assembled = team.assemble({ config: packedConfig })
 *
 * // Access products - they're assembled on first access
 * const userServiceInstance = assembled.userService
 * const loggerInstance = assembled.logger
 * ```
 */
export function hire(suppliers: ProductSupplier<string, any, any, any>[]) {
    return {
        /**
         * Assembles all suppliers by resolving their dependencies.
         * Creates a supply map where each supplier can access its dependencies.
         * Uses lazy evaluation via property getters to handle circular dependencies
         * and ensure each product is only assembled once.
         *
         * @param supplied - Pre-supplied dependencies (resources that must be provided)
         * @returns A supply map with all resolved dependencies, accessible as properties
         * @throws Error if any required dependency cannot be resolved
         * @example
         * ```typescript
         * const supplies = team.assemble({
         *   config: packedConfig,
         *   apiKey: packedApiKey
         * })
         *
         * // Access assembled products
         * const service = supplies.userService.unpack()
         * ```
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
