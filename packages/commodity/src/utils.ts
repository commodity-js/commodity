import { type MapFromList } from "#types"

/**
 * Creates a function that will only execute once, caching the result for subsequent calls.
 * This is useful for memoization and ensuring expensive operations are only performed once.
 * The function also caches any errors thrown during execution, ensuring consistent behavior.
 *
 * This utility is used internally by the commodity system to ensure that product factories
 * are only called once, even if multiple dependencies request the same product.
 *
 * @typeParam T - The function type to wrap
 * @param func - The function to execute only once
 * @returns A memoized version of the function that caches both results and errors
 * @internal
 * @example
 * ```typescript
 * const expensiveOperation = once(() => {
 *   console.log("This only runs once")
 *   return Math.random()
 * })
 *
 * expensiveOperation() // Executes and logs: "This only runs once"
 * expensiveOperation() // Returns cached result, no log
 * expensiveOperation() // Still returns same cached result
 *
 * // Errors are also cached
 * const failingOperation = once(() => {
 *   throw new Error("Failed!")
 * })
 * failingOperation() // Throws error
 * failingOperation() // Throws the same cached error
 * ```
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
 * Creates an indexed map from an array of objects with name properties.
 * This is used internally to convert supplier arrays into lookup maps for
 * type-safe access to just-in-time dependencies.
 *
 * The index function transforms an array into a map where each element is
 * keyed by its `name` property, enabling efficient lookup and type inference.
 *
 * @typeParam LIST - An array type where each element has a `name` property
 * @param list - Array of objects with name properties
 * @returns A map where keys are the name properties and values are the objects
 * @beta
 * @example
 * ```typescript
 * const suppliers = [
 *   { name: "userRepo", type: "repository" },
 *   { name: "logger", type: "service" }
 * ]
 * const indexed = index(...suppliers)
 * // Result: {
 * //   userRepo: { name: "userRepo", type: "repository" },
 * //   logger: { name: "logger", type: "service" }
 * // }
 *
 * // Type-safe access
 * indexed.userRepo // { name: "userRepo", type: "repository" }
 * indexed.logger   // { name: "logger", type: "service" }
 * ```
 */
export function index<LIST extends { name: string }[]>(...list: LIST) {
    return list.reduce(
        (acc, r) => ({ ...acc, [r.name]: r }),
        {}
    ) as MapFromList<LIST>
}

/**
 * Creates a promise that resolves after the specified number of milliseconds.
 * This is useful for adding delays in async operations or testing time-dependent behavior.
 *
 * Note: This is a simple utility function and not directly related to the core commodity
 * dependency injection functionality.
 *
 * @param ms - Number of milliseconds to wait
 * @returns A promise that resolves after the delay with undefined
 * @internal
 * @example
 * ```typescript
 * // Simple delay
 * await sleep(1000) // Wait for 1 second
 * console.log("1 second later")
 *
 * // In async initialization
 * const service = market.offer("service").asProduct({
 *   suppliers: [],
 *   factory: () => new Service(),
 *   init: async (service) => {
 *     await sleep(100) // Small delay before initialization
 *     await service.connect()
 *   }
 * })
 * ```
 */
export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
