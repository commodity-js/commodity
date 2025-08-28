import { nanoid } from "nanoid"

type Merge<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never

type Resource<NAME extends string, VALUE> = {
    cacheKey: string
    name: NAME
    unpack(): VALUE
}

type ResourceActions<NAME extends string, VALUE> = {
    pack: (value: VALUE) => Resource<NAME, VALUE> & ResourceActions<NAME, VALUE>
}

type ResourceSupplier<NAME extends string, CONSTRAINT> = {
    name: NAME
    _resource: true
    _constraint: CONSTRAINT
} & ResourceActions<NAME, CONSTRAINT>

type Product<NAME extends string, VALUE> = Resource<NAME, VALUE> &
    ProductActions<NAME, VALUE>

type ProductActions<NAME extends string, VALUE> = {
    pack: (value: VALUE) => Product<NAME, VALUE>
    dependsOnOneOf: (overrides: SupplyMap) => boolean
    reassemble: ReassembleAction<NAME, VALUE>
    setOptimistic: (value: Awaited<VALUE>) => void
    recall: (soft?: boolean) => void
}

type AssembleAction<NAME extends string, VALUE, TOSUPPLY extends SupplyMap> = (
    toSupply: TOSUPPLY
) => Product<NAME, VALUE>

type ReassembleAction<NAME extends string, VALUE> = (
    overrides: SupplyMap
) => Product<NAME, VALUE>

type ProductSupplier<NAME extends string, TOSUPPLY extends SupplyMap, VALUE> = {
    name: NAME
    suppliers?: Supplier<string, any, any>[]
    assemble: AssembleAction<NAME, VALUE, TOSUPPLY>
    preload: boolean
    _product: true
} & Pick<ProductActions<NAME, VALUE>, "pack" | "dependsOnOneOf">

type Supplier<NAME extends string, TOSUPPLY extends SupplyMap, VALUE> =
    | ProductSupplier<NAME, TOSUPPLY, VALUE>
    | ResourceSupplier<NAME, VALUE>

type SupplyMapFromList<SUPPLIESLIST extends Resource<any, any>[]> =
    SUPPLIESLIST extends []
        ? Record<never, never>
        : Merge<
              {
                  [K in keyof SUPPLIESLIST]: {
                      [NAME in SUPPLIESLIST[K]["name"]]: SUPPLIESLIST[K]
                  }
              }[number]
          >

type SupplyMap = Record<string, Product<string, any> | Resource<string, any>>

type SupplyMapFromSuppliers<SUPPLIERS extends Supplier<string, any, any>[]> = {
    [SUPPLIER in SUPPLIERS[number] as SUPPLIER["name"]]: SUPPLIER extends ProductSupplier<
        string,
        any,
        any
    >
        ? ReturnType<SUPPLIER["assemble"]>
        : SUPPLIER extends ResourceSupplier<string, any>
        ? ReturnType<SUPPLIER["pack"]>
        : never
}

export type $<SUPPLIERS extends Supplier<string, any, any>[]> = (<
    TYPE extends keyof SupplyMapFromSuppliers<SUPPLIERS>
>(
    type: TYPE
) => SupplyMapFromSuppliers<SUPPLIERS>[TYPE] extends {
    unpack(): infer VALUE
}
    ? VALUE
    : never) &
    SupplyMapFromSuppliers<SUPPLIERS>

type ToSupply<TEAM extends ProductSupplier<string, any, any>[]> = Merge<
    {
        [I in keyof TEAM]: TEAM[I] extends ProductSupplier<
            string,
            infer TOSUPPLY,
            any
        >
            ? TOSUPPLY
            : never
    }[number]
>

export const createMarket = (opts?: {
    onRecall?: (cacheKey: string) => void
}) => {
    const cacher = Cacher()
    // Statefulness only used for cache invalidation. Injections do not happen from instances container.
    // Each injection is scoped in its own assemble (or reassemble) context.
    const dependents = new WeakMap<object, Set<object>>()
    const instances = new WeakMap<object, Product<string, any>[]>()
    const names = new Set<string>()
    return {
        offer: <NAME extends string>(name: NAME) => {
            if (names.has(name)) {
                throw new Error(`Name ${name} already exists`)
            }
            names.add(name)
            return {
                asResource: <CONSTRAINT>() => {
                    const resourceSupplier = {
                        name,
                        _resource: true as const,
                        pack: <VALUE extends CONSTRAINT>(value: VALUE) => {
                            const cacheKey = `${name}-${nanoid()}`
                            return {
                                cacheKey,
                                name,
                                unpack: () => value,
                                pack: <VALUE extends CONSTRAINT>(
                                    value: VALUE
                                ) => {
                                    return resourceSupplier.pack(value)
                                }
                            }
                        },
                        _constraint: null as unknown as CONSTRAINT
                    }
                    return resourceSupplier
                },
                asProduct: <
                    VALUE,
                    SUPPLIERS extends Supplier<string, any, any>[] = [],
                    SUPPLIES extends $<SUPPLIERS> = $<SUPPLIERS>
                >({
                    factory,
                    suppliers = [] as unknown as SUPPLIERS,
                    preload = false,
                    onRecall,
                    timeout
                }: {
                    factory: (supplies: SUPPLIES) => VALUE
                    suppliers?: SUPPLIERS
                    preload?: boolean
                    onRecall?: (cacheKey: string) => void
                    timeout?: number
                }) => {
                    const team = suppliers.filter(
                        (supplier) =>
                            "_product" in supplier && supplier._product
                    ) as Extract<
                        SUPPLIERS[number],
                        ProductSupplier<string, any, any>
                    >[]

                    const actions = {
                        assemble: (
                            toSupply: Omit<
                                SUPPLIES,
                                keyof SupplyMapFromSuppliers<typeof team>
                            > &
                                ToSupply<typeof team> &
                                SupplyMap
                        ) => {
                            /**
                             * A type assertion that tells TypeScript to trust us that the resulting
                             * supplies is compatible with the generic type `$<DEPS>`. This is a necessary
                             * type hole because TypeScript's static analysis can't remember that when you Omit properties
                             * and put them back, you end up with the original type. Here toSupply is type guarded to be $<DEPS> - Services<team>,
                             * and hire merges toSupply and team products together, so the result must extend $<DEPS>. But TS cannot guarantee it.
                             */
                            const cacheKey = `${name}-${nanoid()}`
                            const fullSupplies = hire(team).assemble(
                                toSupply
                            ) as unknown as SUPPLIES

                            const memoedFactory = cacher.memo(() =>
                                factory(fullSupplies)
                            )

                            let optimistic: Awaited<VALUE> | undefined =
                                undefined
                            let timeoutId:
                                | ReturnType<typeof setTimeout>
                                | undefined = undefined
                            const unpack = () => {
                                // If we have an optimistic value, return it
                                if (optimistic !== undefined) {
                                    return optimistic
                                }
                                // No optimistic or computed value, call factory directly
                                return memoedFactory()
                            }

                            const setOptimistic = (value: Awaited<VALUE>) => {
                                if (optimistic !== undefined) {
                                    throw new Error(
                                        `Cannot set optimistic value when one is already set: ${optimistic}`
                                    )
                                }

                                if (product.recall) {
                                    product.recall()
                                }
                                optimistic = value
                                // Update optimistic value in background
                                Promise.resolve()
                                    .then(async () => {
                                        await memoedFactory()
                                    })
                                    .catch((error) => {
                                        // If factory fails, we don't want to keep the optimistic value
                                        // but we also don't want to throw - just clear optimistic
                                        console.warn(
                                            `Factory failed during optimistic update: ${error}`
                                        )
                                    })
                                    .finally(() => {
                                        optimistic = undefined
                                    })
                            }

                            const recall = (soft: boolean = false) => {
                                optimistic = undefined
                                if (timeoutId !== undefined) {
                                    clearTimeout(timeoutId)
                                    timeoutId = undefined
                                }
                                cacher.recall(memoedFactory)
                                try {
                                    productSupplier.onRecall?.(cacheKey)
                                } catch (error) {
                                    console.warn(
                                        `Error calling onRecall for ${name}: ${error}`
                                    )
                                }

                                if (soft) return

                                // First, collect all dependent products into a set
                                const allDependents = new Set<object>()
                                const collectDependents = (
                                    supplier: object
                                ) => {
                                    allDependents.add(supplier)
                                    const deps = dependents.get(supplier) ?? []
                                    deps.forEach(collectDependents)
                                }

                                collectDependents(productSupplier)
                                allDependents.delete(productSupplier)
                                Array.from(allDependents).map((supplier) => {
                                    const products = instances.get(supplier)
                                    if (!products) return
                                    products.forEach((product) => {
                                        product.recall(true)
                                    })
                                })
                            }

                            const product = {
                                cacheKey,
                                name,
                                unpack,
                                reassemble: (overrides: SupplyMap) => {
                                    // Create a mutable copy of overrides with flexible typing
                                    const newSupplies: SupplyMap = {}

                                    // Loop over all supplies and check if they need resupplying
                                    for (const [name, supply] of Object.entries(
                                        fullSupplies
                                    )) {
                                        if (
                                            !supply ||
                                            typeof supply !== "object"
                                        ) {
                                            continue
                                        }

                                        if (
                                            name in overrides &&
                                            overrides[name]
                                        ) {
                                            newSupplies[name] = overrides[name]
                                            continue
                                        }

                                        // If the supply is a resource, add it to newSupplies
                                        if (
                                            !("dependsOnOneOf" in supply) ||
                                            typeof supply.dependsOnOneOf !==
                                                "function" ||
                                            // If the supply doesn't need resupplying, keep it cached in newSupplies
                                            !supply.dependsOnOneOf(overrides)
                                        ) {
                                            newSupplies[name] =
                                                supply as SupplyMap[typeof name]
                                            continue
                                        }
                                    }

                                    return actions.assemble(
                                        newSupplies as typeof toSupply
                                    )
                                },
                                dependsOnOneOf: actions.dependsOnOneOf,
                                pack: actions.pack,
                                setOptimistic,
                                recall
                            }

                            // Schedule auto-recall if timeout is provided
                            if (typeof timeout === "number" && timeout > 0) {
                                timeoutId = setTimeout(() => {
                                    try {
                                        product.recall()
                                    } catch {
                                        // noop - recall should be safe
                                    }
                                }, timeout)
                            }

                            // Track instances of this product for recall
                            instances.set(productSupplier, [
                                ...(instances.get(productSupplier) || []),
                                product
                            ])

                            return product
                        },
                        pack: (value: VALUE) => {
                            const cacheKey = `${name}-${nanoid()}`
                            const product = {
                                cacheKey,
                                name,
                                unpack: () => value,
                                reassemble: () => product,
                                pack: actions.pack,
                                dependsOnOneOf: actions.dependsOnOneOf,
                                setOptimistic: () => {
                                    return
                                },
                                recall() {
                                    // Value is set and cannot change. Do Nothing
                                    return
                                }
                            }

                            return product
                        },
                        dependsOnOneOf: (overrides: SupplyMap) => {
                            // Check if any dependencies need resupplying
                            for (const supplier of suppliers) {
                                // Check if this dependency is directly overridden
                                if (supplier.name in overrides) {
                                    return true
                                }
                                // Recursively check if this dependency needs resupplying
                                if (
                                    "dependsOnOneOf" in supplier &&
                                    supplier.dependsOnOneOf(overrides)
                                ) {
                                    return true
                                }
                            }
                            return false
                        }
                    }

                    const productSupplier = {
                        name,
                        _product: true as const,
                        preload,
                        suppliers,
                        pack: actions.pack,
                        assemble: actions.assemble,
                        dependsOnOneOf: actions.dependsOnOneOf,
                        onRecall: onRecall ?? opts?.onRecall
                    }

                    //Set this supplier as a dependent of all its dependencies
                    for (const supplier of suppliers) {
                        dependents.set(
                            supplier,
                            (dependents.get(supplier) || new Set()).add(
                                productSupplier
                            )
                        )
                    }

                    return productSupplier
                }
            }
        }
    }
}

function hire(suppliers: ProductSupplier<string, any, any>[]) {
    return {
        assemble: (supplied: Record<string, any>) => {
            const supplies: any = (id: string) => {
                const supply = supplies[id]
                if (!supply?.unpack) {
                    throw new Error(`Unsatisfied dependency: ${id}`)
                }
                return supply.unpack()
            }

            Object.defineProperties(
                supplies,
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

                Object.defineProperty(supplies, supplier.name, {
                    get: once(() => supplier.assemble(supplies)),
                    enumerable: true,
                    configurable: true
                })
            }

            // Preload products that have preload: true
            const preloadPromises = suppliers
                .filter(
                    (supplier) =>
                        supplier.preload &&
                        !Object.prototype.hasOwnProperty.call(
                            supplied,
                            supplier.name
                        )
                )
                .map((supplier) => {
                    // Access the getter to trigger memoization
                    try {
                        return Promise.resolve(supplies(supplier.name))
                    } catch (error) {
                        // If preloading fails, we don't want to break the entire supply chain
                        // The error will be thrown again when the dependency is actually needed
                        return Promise.resolve(null)
                    }
                })

            // Execute preloading in parallel (non-blocking)
            if (preloadPromises.length > 0) {
                Promise.all(preloadPromises).catch(() => {
                    // Silently ignore preload errors - they'll be thrown when actually accessed
                })
            }

            return supplies
        }
    }
}

// Utilities
function once<T extends () => any>(func: T) {
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

export function index<SUPPLIESLIST extends Resource<any, any>[]>(
    ...suppliesList: SUPPLIESLIST
) {
    return suppliesList.reduce(
        (acc, r) => ({ ...acc, [r.name]: r }),
        {}
    ) as SupplyMapFromList<SUPPLIESLIST>
}

export function narrow<
    RESOURCESUPPLIER extends {
        name: string
        _constraint: any
    }
>(supplier: RESOURCESUPPLIER) {
    return <VALUE>() =>
        supplier as unknown as ResourceSupplier<
            RESOURCESUPPLIER["name"],
            RESOURCESUPPLIER["_constraint"] & VALUE
        >
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function Cacher() {
    const cacheStore = new WeakMap<object, any>()
    const cacher = {
        memo: <T>(factory: () => T) => {
            const cache: any[] = [undefined]
            const memoized = (): T => {
                if (cache[0] !== undefined) {
                    return cache[0]
                }
                const value = factory()
                cache[0] = value
                return value
            }

            cacheStore.set(memoized, cache)
            return memoized
        },
        recall: <T>(factory: () => T) => {
            const cache = cacheStore.get(factory)
            if (cache) {
                cache[0] = undefined
            }
        }
    }

    return cacher
}
