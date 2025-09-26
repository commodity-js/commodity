import { type MapFromList } from "#types"

/**
 * Creates a function that will only execute once, caching the result for subsequent calls.
 * This is useful for memoization and ensuring expensive operations are only performed once.
 * @param func - The function to execute only once
 * @returns A memoized version of the function
 * @internal
 * @example
 * ```typescript
 * const expensiveOperation = once(() => {
 *   console.log("This only runs once")
 *   return Math.random()
 * })
 *
 * expensiveOperation() // Executes and logs
 * expensiveOperation() // Returns cached result, no log
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
 * This is used internally to convert supplier arrays into lookup maps.
 * @param list - Array of objects with name properties
 * @returns A map where keys are the name properties and values are the objects
 * @beta
 * @example
 * ```typescript
 * const suppliers = [
 *   { name: "userRepo", value: userRepository },
 *   { name: "logger", value: logger }
 * ]
 * const indexed = index(...suppliers)
 * // Result: { userRepo: { name: "userRepo", value: userRepository }, logger: { name: "logger", value: logger } }
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
 * This is useful for adding delays in async operations or testing.
 * @param ms - Number of milliseconds to wait
 * @returns A promise that resolves after the delay
 * @internal
 * @example
 * ```typescript
 * await sleep(1000) // Wait for 1 second
 * console.log("1 second later")
 * ```
 */
export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
