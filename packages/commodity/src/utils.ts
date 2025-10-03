import { type MapFromList } from "#types"

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
