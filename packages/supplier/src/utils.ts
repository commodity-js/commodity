import { type MapFromList } from "#types"

export function once<T extends () => any>(func: T) {
    let called = false
    let result: ReturnType<T>

    return function () {
        if (!called) {
            called = true
            result = func()
        }
        return result
    }
}

export function index<LIST extends { name: string }[]>(...list: LIST) {
    return list.reduce(
        (acc, r) => ({ ...acc, [r.name]: r }),
        {}
    ) as MapFromList<LIST>
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
