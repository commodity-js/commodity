import { Merge, ProductSupplier, Supplier } from "#types"

/**
 * Minimal once implemetation
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
 * transforms an array into a map where each element is
 * keyed by its suppliers's `name` property.
 *
 * @typeParam LIST - An array type where each element has a `supplier` property
 * @param list - Array of objects with name properties
 * @returns A map where keys are the name properties and values are the objects
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
 * Recursively collects all transitive dependencies of a supplier array.
 * This walks through the dependency tree, collecting each supplier and all of its
 * nested dependencies into a flattened array. This is essential for understanding
 * the complete dependency graph.
 *
 * @param suppliers - The array of suppliers to collect transitive dependencies from
 * @returns A flattened array containing all suppliers and their transitive dependencies
 * @public
 */
export function assertNoCircularDependency(
    root: Pick<
        ProductSupplier,
        | "name"
        | "suppliers"
        | "optionals"
        | "assemblers"
        | "withSuppliers"
        | "withAssemblers"
    >,
    visited = new Set<string>(),
    suppliers?: Supplier[]
) {
    for (const supplier of suppliers ?? [
        ...root.suppliers,
        ...root.optionals,
        ...root.assemblers,
        ...root.withSuppliers,
        ...root.withAssemblers
    ]) {
        if (supplier.name === root.name) {
            throw new Error("Circular dependency detected")
        }
        if (visited.has(supplier.name)) {
            continue
        }
        visited.add(supplier.name)
        // If the supplier itself is a resource, add it directly
        if (!("suppliers" in supplier) && "_resource" in supplier) {
            continue
        } else {
            // Otherwise, collect its transitive dependencies
            assertNoCircularDependency(root, visited, [
                ...supplier.suppliers,
                ...supplier.optionals,
                ...supplier.assemblers,
                ...supplier.withSuppliers,
                ...supplier.withAssemblers
            ])
        }
    }
}
