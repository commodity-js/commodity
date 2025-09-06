import { Product, Resource, SupplyMapFromList, ResourceSupplier } from "#types"

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

export function index<
    SUPPLIESLIST extends (Resource<any, any> | Product<any, any>)[]
>(...suppliesList: SUPPLIESLIST) {
    return suppliesList.reduce(
        (acc, r) => ({ ...acc, [r.name]: r }),
        {}
    ) as SupplyMapFromList<SUPPLIESLIST>
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
