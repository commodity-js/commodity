import { Product, ProductSupplier, Supplier } from "#types"

/**
 * Minimal once implementation for memoizing function results.
 * Caches both successful results and errors, ensuring the wrapped function
 * executes only once and subsequent calls return/throw the cached value.
 *
 * @typeParam T - The function type to wrap
 * @param func - The function to execute only once
 * @returns A memoized version of the function that caches both results and errors
 * @internal
 */
export function once<T extends () => any>(func: T) {
    let called = false
    let result: ReturnType<T>
    let error: Error | undefined

    return function () {
        if (!called) {
            called = true
            try {
                result = func()
            } catch (e) {
                error = e as Error
                throw e
            }
        }
        if (error) {
            throw error
        }
        return result
    }
}

/**
 * Transforms an array of products/resources into a map keyed by supplier names.
 * This provides type-safe access to assembled products by their supplier names.
 *
 * @typeParam LIST - An array type where each element has a `supplier` property with a `name`
 * @param list - Array of products/resources to index
 * @returns A map where keys are supplier names and values are the products/resources
 * @public
 */
export function index<LIST extends { supplier: { name: string } }[]>(
    ...list: LIST
) {
    return list.reduce(
        (acc, r) => ({ ...acc, [r.supplier.name]: r }),
        {}
    ) as MapFromList<LIST>
}

/**
 * Converts an array of objects with name properties into a map where keys are the names.
 * This is used internally to create lookup maps from supplier arrays for type-safe access.
 *
 * @typeParam LIST - An array of objects that have a `name` property
 * @returns A map type where each key is a name from the list and values are the corresponding objects
 * @public
 */
export type MapFromList<LIST extends { supplier: { name: string } }[]> =
    LIST extends []
        ? Record<string, never>
        : Merge<
              {
                  [K in keyof LIST]: {
                      [NAME in LIST[K]["supplier"]["name"]]: LIST[K]
                  }
              }[number]
          >

/**
 * @param ms - Number of milliseconds to wait
 * @returns A promise that resolves after the delay with undefined
 * @internal
 */
export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Builds the transitive team of suppliers by recursively collecting all dependencies.
 * This centralizes recursion through the dependency graph, flattening the tree into
 * a deduped array. It also detects circular dependencies at runtime.
 *
 * @param name - The name of the supplier being built (for circular dependency detection)
 * @param suppliers - The array of direct suppliers to build a team from
 * @returns A flattened, deduplicated array of all transitive suppliers
 * @throws Error if a circular dependency is detected
 * @internal
 */
export function team(name: string, suppliers: Supplier[]) {
    const team = suppliers
        .flatMap((supplier): Supplier[] => {
            if (!("team" in supplier)) return [supplier]
            return [supplier, ...supplier.team]
        })
        .filter((supplier) => supplier !== undefined)

    const deduped: Record<string, Supplier> = {}
    for (const supplier of team) {
        if (supplier.name === name)
            throw new Error("Circular dependency detected")
        deduped[supplier.name] = supplier
    }

    return Object.values(deduped)
}

/**
 * Type guard to check if a supply is a Product.
 * @param supply - The supply to check
 * @returns True if the supply is a Product, false otherwise
 * @internal
 */
export function isProduct(supply: any): supply is Product {
    return supply.supplier._.product === true
}

/**
 * Type guard to check if a supplier is a ProductSupplier.
 * @param supplier - The supplier to check
 * @returns True if the supplier is a ProductSupplier, false if it's a ResourceSupplier
 * @internal
 */
export function isProductSupplier(supplier: any): supplier is ProductSupplier {
    return supplier._.product === true
}

/**
 * Merges a union type into a single intersection type.
 * This utility type is used internally to combine multiple types into one cohesive type.
 * @typeParam U - The union type to merge
 * @returns An intersection type that combines all members of the union
 * @public
 */

export type Merge<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never
