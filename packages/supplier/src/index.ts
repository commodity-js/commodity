type Merge<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never

type Resource<NAME extends string, VALUE> = {
    name: NAME
    unpack(): VALUE
    _supplier: ResourceSupplier<NAME, VALUE>
}

type ResourceActions<NAME extends string, VALUE> = {
    pack: (value: VALUE) => Resource<NAME, VALUE> & ResourceActions<NAME, VALUE>
}

type ResourceSupplier<NAME extends string, CONSTRAINT> = {
    name: NAME
    _resource: true
    _constraint: CONSTRAINT
} & ResourceActions<NAME, CONSTRAINT>

type Product<NAME extends string, VALUE> = Omit<
    Resource<NAME, VALUE>,
    "_supplier"
> &
    ProductActions<NAME, VALUE> & {
        _supplier: ProductSupplier<NAME, any, VALUE>
    }

type ProductActions<NAME extends string, VALUE> = {
    pack: <PACK_VALUE extends VALUE>(
        value: PACK_VALUE
    ) => Product<NAME, PACK_VALUE>
    reassemble: ReassembleAction<NAME, VALUE>
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
    hire: (
        ...hiredTeam: ProductSupplier<string, any, any>[]
    ) => ProductSupplier<NAME, any, VALUE>
    preload: boolean
    _dependsOnOneOf: (overrides: SupplyMap) => boolean
    _product: true
} & Pick<ProductActions<NAME, VALUE>, "pack">

type Supplier<NAME extends string, TOSUPPLY extends SupplyMap, VALUE> =
    | ProductSupplier<NAME, TOSUPPLY, VALUE>
    | ResourceSupplier<NAME, VALUE>

type SupplyMapFromList<
    SUPPLIESLIST extends (Resource<any, any> | Product<any, any>)[]
> = SUPPLIESLIST extends []
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
    [SUPPLIER in SUPPLIERS[number] as SUPPLIER["name"]]: ReturnType<
        SUPPLIER["pack"]
    >
}

export type $<SUPPLIERS extends Supplier<string, any, any>[]> = (<
    NAME extends keyof SupplyMapFromSuppliers<SUPPLIERS>
>(
    name:
        | NAME
        | {
              name: NAME
          }
) => SupplyMapFromSuppliers<SUPPLIERS>[NAME] extends {
    unpack(): infer VALUE
}
    ? VALUE
    : never) &
    SupplyMapFromSuppliers<SUPPLIERS>

type ToSupply<TEAM extends ProductSupplier<string, any, any>[]> = Merge<
    TEAM[number] extends ProductSupplier<string, infer TOSUPPLY, any>
        ? TOSUPPLY
        : never
>

function isProduct(
    supply: SupplyMap[keyof SupplyMap]
): supply is Product<string, any> {
    return "_product" in supply._supplier
}

export const createMarket = () => {
    return {
        offer<
            MARKET extends { offer: (name: string) => any },
            NAME extends string
        >(this: MARKET, name: NAME) {
            return {
                asResource: <CONSTRAINT>() => {
                    const resourceSupplier = {
                        name,
                        _resource: true as const,
                        pack<
                            RESOURCE_SUPPLIER extends {
                                pack: (value: any) => any
                            },
                            VALUE extends CONSTRAINT
                        >(this: RESOURCE_SUPPLIER, value: VALUE) {
                            return {
                                name,
                                unpack: () => value,
                                pack<
                                    RESOURCE extends {
                                        _supplier: any
                                    },
                                    INNER_VALUE extends CONSTRAINT
                                >(this: RESOURCE, value: INNER_VALUE) {
                                    return {
                                        ...resourceSupplier.pack(value),
                                        _supplier: this._supplier
                                    }
                                },
                                _supplier: this
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
                    preload = false
                }: {
                    factory: (supplies: SUPPLIES) => VALUE
                    suppliers?: SUPPLIERS
                    preload?: boolean
                }) => {
                    const team = suppliers.filter(
                        (supplier) =>
                            "_product" in supplier && supplier._product
                    ) as Extract<
                        SUPPLIERS[number],
                        ProductSupplier<string, any, any>
                    >[]

                    type TOSUPPLY = Omit<
                        SUPPLIES,
                        keyof SupplyMapFromSuppliers<typeof team>
                    > &
                        ToSupply<typeof team> &
                        SupplyMap

                    function pack<
                        THIS extends { _supplier: any },
                        PACK_VALUE extends VALUE
                    >(this: THIS, value: PACK_VALUE) {
                        return {
                            ...actions.pack(value),
                            _supplier: this._supplier
                        }
                    }
                    const actions = {
                        assemble<
                            PRODUCT_SUPPLIER extends {
                                pack: (value: any) => any
                                assemble: (toSupply: TOSUPPLY) => any
                            }
                        >(this: PRODUCT_SUPPLIER, toSupply: TOSUPPLY) {
                            /**
                             * A type assertion that tells TypeScript to trust us that the resulting
                             * supplies is compatible with the generic type `SUPPLIES`. This is a necessary
                             * type hole because TypeScript's static analysis can't remember that when you Omit properties
                             * and put them back, you end up with the original type. Here toSupply is type guarded to be $<DEPS> - Services<team>,
                             * and hire merges toSupply and team products together, so the result must extend $<DEPS>. But TS cannot guarantee it.
                             */
                            const fullSupplies = hire(team).assemble(
                                toSupply
                            ) as unknown as SUPPLIES

                            const unpack = () => factory(fullSupplies)

                            const product = {
                                name,
                                unpack,
                                reassemble<
                                    PRODUCT extends {
                                        _supplier: {
                                            assemble: (
                                                toSupply: TOSUPPLY
                                            ) => any
                                        }
                                    }
                                >(this: PRODUCT, overrides: SupplyMap) {
                                    // Create a mutable copy of overrides with flexible typing
                                    const newSupplies: SupplyMap = {}

                                    // Loop over all supplies and check if they need resupplying
                                    for (const [name, supply] of Object.entries<
                                        SupplyMap[keyof SupplyMap]
                                    >(fullSupplies)) {
                                        if (
                                            name in overrides &&
                                            overrides[name]
                                        ) {
                                            newSupplies[name] = overrides[name]
                                            continue
                                        }

                                        // If the supply is a resource, add it to newSupplies
                                        if (
                                            !isProduct(supply) ||
                                            !supply._supplier._dependsOnOneOf(
                                                overrides
                                            )
                                        ) {
                                            newSupplies[name] = supply
                                        }
                                    }

                                    return this._supplier.assemble(
                                        newSupplies as typeof toSupply
                                    )
                                },
                                pack,
                                _supplier: this
                            }

                            return product
                        },
                        pack<PRODUCT_SUPPLIER, PACK_VALUE extends VALUE>(
                            this: PRODUCT_SUPPLIER,
                            value: PACK_VALUE
                        ) {
                            const product = {
                                name,
                                unpack: () => value,
                                reassemble<
                                    PRODUCT extends {
                                        _supplier: any
                                    }
                                >(this: PRODUCT) {
                                    return this
                                },
                                pack,
                                _supplier: this
                            }

                            return product
                        },
                        hire<
                            PRODUCT_SUPPLIER extends {
                                _market: MARKET
                            },
                            HIRED_TEAM extends ProductSupplier<
                                string,
                                any,
                                any
                            >[]
                        >(this: PRODUCT_SUPPLIER, ...hiredTeam: HIRED_TEAM) {
                            // Combine and deduplicate using "last wins" strategy
                            const combinedSuppliers = [...team, ...hiredTeam]

                            const supplierMap = new Map()
                            combinedSuppliers.forEach((supplier) => {
                                supplierMap.set(supplier.name, supplier)
                            })
                            const deduplicatedHiredSuppliers = Array.from(
                                supplierMap.values()
                            )

                            return this._market.offer(name).asProduct({
                                factory,
                                suppliers: deduplicatedHiredSuppliers as [
                                    ...Exclude<
                                        (typeof team)[number],
                                        { name: HIRED_TEAM[number]["name"] }
                                    >[],
                                    ...HIRED_TEAM
                                ],
                                preload
                            })
                        },
                        _dependsOnOneOf: (overrides: SupplyMap) => {
                            // Check if any dependencies need resupplying
                            for (const supplier of suppliers) {
                                // Check if this dependency is directly overridden
                                if (supplier.name in overrides) {
                                    return true
                                }
                                // Recursively check if this dependency needs resupplying
                                if (
                                    "_dependsOnOneOf" in supplier &&
                                    supplier._dependsOnOneOf(overrides)
                                ) {
                                    return true
                                }
                            }
                            return false
                        }
                    }

                    const productSupplier = {
                        name,
                        preload,
                        suppliers,
                        pack: actions.pack,
                        assemble: actions.assemble,
                        hire: actions.hire,
                        _market: this,
                        _dependsOnOneOf: actions._dependsOnOneOf,
                        _product: true as const
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
            const supplies: any = (name: string | { name: string }) => {
                const actualName = typeof name === "string" ? name : name.name
                const supply = supplies[actualName]
                if (!supply?.unpack) {
                    throw new Error(`Unsatisfied dependency: ${actualName}`)
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

export function narrow<
    RESOURCESUPPLIER extends {
        name: string
        _constraint: any
    }
>(supplier: RESOURCESUPPLIER) {
    return <VALUE>() => {
        type NarrowedSupplier = ResourceSupplier<
            RESOURCESUPPLIER["name"],
            RESOURCESUPPLIER["_constraint"] & VALUE
        >
        return supplier as unknown as Omit<NarrowedSupplier, "pack"> & {
            pack: (value: VALUE) => Omit<
                ReturnType<NarrowedSupplier["pack"]>,
                "_supplier"
            > & {
                _supplier: RESOURCESUPPLIER
            }
        }
    }
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
