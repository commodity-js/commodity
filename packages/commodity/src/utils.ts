import {
    IsCompatible,
    ProductSupplier,
    Supplier,
    type MapFromList
} from "#types"

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
 * keyed by its `name` property.
 *
 * @typeParam LIST - An array type where each element has a `name` property
 * @param list - Array of objects with name properties
 * @returns A map where keys are the name properties and values are the objects
 * @public
 */
export function index<LIST extends { name: string }[]>(...list: LIST) {
    return list.reduce(
        (acc, r) => ({ ...acc, [r.name]: r }),
        {}
    ) as MapFromList<LIST>
}

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
export function transitiveSuppliers(
    root: Pick<ProductSupplier, "name" | "suppliers">,
    visited = new Set<string>(),
    suppliers?: Supplier[]
) {
    const transitive = new Set<Supplier>()

    for (const supplier of suppliers ?? root.suppliers) {
        if (supplier.name === root.name) {
            throw new Error("Circular dependency detected")
        }
        if (visited.has(supplier.name)) {
            continue
        }
        visited.add(supplier.name)
        // If the supplier itself is a resource, add it directly
        if (!("suppliers" in supplier) && "_resource" in supplier) {
            transitive.add(supplier)
            continue
        } else {
            // Otherwise, collect its transitive dependencies
            const deps = transitiveSuppliers(root, visited, supplier.suppliers)
            deps.forEach((dep) => transitive.add(dep))
        }
    }

    return transitive
}

/**
 * Checks if a prototype has compatible dependencies with the original.
 * Compatible means the prototype requires the same or fewer resource dependencies.
 * @param original - The original product supplier
 * @param prototype - The prototype product supplier
 * @returns true if compatible (same or fewer deps), false otherwise
 * @export
 */
export function isCompatible(
    original: ProductSupplier,
    prototype: ProductSupplier
) {
    const toSupplyOriginal = Array.from(transitiveSuppliers(original))
        .filter((dep) => "_resource" in dep)
        .map((dep) => dep.name)
    const toSupplyPrototype = Array.from(transitiveSuppliers(prototype))
        .filter((dep) => "_resource" in dep)
        .map((dep) => dep.name)

    return toSupplyPrototype.every((name) =>
        toSupplyOriginal.includes(name)
    ) as IsCompatible<typeof prototype, typeof original>
}
