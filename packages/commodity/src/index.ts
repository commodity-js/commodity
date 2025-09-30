import {
    Product,
    ProductSupplier,
    Supplier,
    SupplyMap,
    type Resource,
    type ResourceSupplier,
    type $,
    type ToSupply,
    type HasCircularDependency,
    type ExcludeSuppliersType,
    type MapFromList,
    type TrySuppliers,
    type FilterSuppliers
} from "#types"

import { hire } from "#assemble"
import { index, once } from "#utils"

/**
 * Type guard to check if a supply is a Product.
 * @param supply - The supply to check
 * @returns True if the supply is a Product, false otherwise
 * @internal
 */
function isProduct(
    supply: SupplyMap[keyof SupplyMap]
): supply is Product<string, any, any> {
    return "_product" in supply
}

/**
 * Creates a new market instance for managing suppliers and products.
 * A market provides a namespace for creating and managing suppliers without name conflicts.
 * @returns A market object with methods to create suppliers and products
 * @beta
 * @example
 * ```typescript
 * const market = createMarket()
 * const userService = market.offer("userService").asProduct({
 *   factory: () => new UserService(),
 *   suppliers: []
 * })
 * ```
 */
export const createMarket = () => {
    const names = new Set<string>()
    const market = {
        /**
         * Offers a new supplier or product with the given name.
         * @param name - The unique name for this supplier/product
         * @returns An offer object with methods to define the supplier type
         * @throws Error if the name already exists in this market
         */
        offer<NAME extends string>(name: NAME) {
            if (names.has(name)) {
                throw new Error(`Name ${name} already exists`)
            }
            names.add(name)
            const offer = {
                /**
                 * Creates a resource supplier that can provide values of a specific constraint type.
                 * Resources are simple value containers that can be packed and unpacked.
                 * @returns A resource supplier configuration object
                 * @example
                 * ```typescript
                 * const config = market.offer("config").asResource<Config>()
                 * const packedConfig = config.pack({ apiUrl: "https://api.example.com" })
                 * ```
                 */
                asResource: <CONSTRAINT>() => {
                    return {
                        name,
                        pack<
                            THIS extends ResourceSupplier<NAME, CONSTRAINT>,
                            NEW_VALUE extends CONSTRAINT
                        >(this: THIS, value: NEW_VALUE) {
                            return {
                                name: this.name,
                                pack<
                                    THIS extends Resource<NAME, CONSTRAINT>,
                                    NEW_VALUE extends CONSTRAINT
                                >(this: THIS, value: NEW_VALUE) {
                                    return {
                                        name: this.name,
                                        pack: this.pack,
                                        _resource: this._resource,
                                        unpack: () => value
                                    }
                                },
                                _resource: this._resource,
                                unpack: () => value
                            }
                        },
                        _constraint: null as unknown as CONSTRAINT,
                        _resource: true as const
                    }
                },
                /**
                 * Creates a product supplier that can assemble complex objects from dependencies.
                 * Products can depend on other suppliers and have factory functions for creation.
                 * @param config - Configuration object for the product
                 * @returns A product supplier configuration object
                 * @example
                 * ```typescript
                 * const userService = market.offer("userService").asProduct({
                 *   suppliers: [userRepository, logger],
                 *   factory: (deps) => new UserService(deps.userRepository, deps.logger)
                 * })
                 * ```
                 */
                asProduct: <
                    VALUE,
                    SUPPLIERS extends Supplier<
                        string,
                        any,
                        any,
                        any,
                        any,
                        any,
                        IS_PROTOTYPE extends false ? false : boolean
                    >[] = [],
                    JUST_IN_TIME extends Supplier<
                        string,
                        any,
                        any,
                        any,
                        any,
                        any,
                        IS_PROTOTYPE extends false ? false : boolean
                    >[] = [],
                    IS_PROTOTYPE extends boolean = false
                >({
                    suppliers = [] as unknown as SUPPLIERS,
                    justInTime = [] as unknown as JUST_IN_TIME,
                    factory,
                    init,
                    lazy = false,
                    isPrototype = false as IS_PROTOTYPE
                }: {
                    suppliers?: [...SUPPLIERS]
                    justInTime?: [...JUST_IN_TIME]
                    factory: (
                        supplies: $<SUPPLIERS>,
                        justInTime: MapFromList<[...JUST_IN_TIME]>
                    ) => VALUE
                    init?: (value: VALUE, supplies: $<SUPPLIERS>) => void
                    lazy?: boolean
                    isPrototype?: IS_PROTOTYPE
                }) => {
                    const productSupplier = {
                        name,
                        suppliers,
                        justInTime,
                        factory,
                        lazy,
                        init,
                        pack,
                        assemble,
                        try: _try,
                        with: _with,
                        jitOnly,
                        prototype,
                        _isPrototype: isPrototype,
                        _product: true as const
                    }

                    /**
                     * Assembles the product by resolving all dependencies and creating the final instance.
                     * This method orchestrates the dependency resolution and calls the factory function.
                     * @param toSupply - Map of supplies to use for dependency resolution
                     * @returns A product instance with the resolved dependencies
                     * @throws Error if any required dependency cannot be resolved
                     */
                    function assemble<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            Supplier<string, any, any, any, any, any, any>[],
                            any,
                            any,
                            any,
                            any
                        >
                    >(this: THIS, toSupply: ToSupply<THIS["suppliers"]>) {
                        const team = this.suppliers.filter(
                            (supplier) =>
                                "_product" in supplier && supplier._product
                        ) as ExcludeSuppliersType<
                            THIS["suppliers"],
                            ResourceSupplier<string, any>
                        >
                        /*
                         * A type assertion that tells TypeScript to trust us that the resulting
                         * supplies is compatible with the generic type `SUPPLIES`. This is a necessary
                         * type hole because TypeScript's static analysis can't remember that when you Omit properties
                         * and put them back, you end up with the original type. Here toSupply is type guarded to be $<DEPS> - Services<team>,
                         * and hire merges toSupply and team products together, so the result must extend $<DEPS>. But TS cannot guarantee it.
                         */
                        const assemble = (toSupply: SupplyMap) =>
                            hire(team).assemble(toSupply) as unknown as $<
                                THIS["suppliers"]
                            >

                        const supplies = assemble(toSupply)

                        const buildUnpack = (
                            supplies: $<THIS["suppliers"]>
                        ) => {
                            return once(() => {
                                const value = this.factory(
                                    supplies,
                                    index(...this.justInTime)
                                ) as ReturnType<THIS["factory"]>
                                if (this.init) {
                                    this.init(value, supplies)
                                }
                                return value
                            })
                        }

                        return {
                            name: this.name,
                            supplies,
                            pack: productPack,
                            unpack: buildUnpack(supplies),
                            reassemble<THIS extends Product<NAME, VALUE, any>>(
                                this: THIS,
                                overrides: SupplyMap
                            ) {
                                // Create a mutable copy of overrides with flexible typing
                                const unassembled: SupplyMap = {}

                                // Loop over all supplies and check if they need resupplying
                                for (const [name, supply] of Object.entries<
                                    SupplyMap[keyof SupplyMap]
                                >(this.supplies)) {
                                    if (name in overrides && overrides[name]) {
                                        unassembled[name] = overrides[name]
                                        continue
                                    }
                                    // If the supply is a resource, or doesn't depend on one of the overrides,
                                    // add it to newSupplies
                                    if (
                                        !isProduct(supply) ||
                                        !supply._dependsOnOneOf(overrides)
                                    ) {
                                        unassembled[name] = supply
                                    }
                                }

                                const newSupplies = assemble(unassembled)

                                return {
                                    ...this,
                                    supplies: newSupplies,
                                    unpack: buildUnpack(newSupplies)
                                }
                            },
                            _dependsOnOneOf(
                                this: Product<any, any, any>,
                                overrides: SupplyMap
                            ) {
                                // Check if any dependencies need resupplying
                                for (const supplier of this._supplier
                                    .suppliers) {
                                    // Check if this dependency is directly overridden
                                    if (supplier.name in overrides) {
                                        return true
                                    }

                                    const supply =
                                        this.supplies[
                                            supplier.name as keyof $<SUPPLIERS>
                                        ]

                                    if (
                                        supply &&
                                        isProduct(supply) &&
                                        supply._dependsOnOneOf(overrides)
                                    ) {
                                        return true
                                    }
                                }
                                return false
                            },
                            _product: true as const,
                            _supplier: this
                        }
                    }

                    /**
                     * Packs a new value into an existing product, creating a new product instance.
                     * This is used internally by the pack method to create packed products.
                     * @param value - The new value to pack into the product
                     * @returns A new product instance with the packed value
                     */
                    function productPack<
                        THIS extends Product<NAME, VALUE, $<SUPPLIERS>>,
                        NEW_VALUE extends VALUE
                    >(this: THIS, value: NEW_VALUE) {
                        return {
                            name: this.name,
                            supplies: {},
                            pack: this.pack,
                            unpack: () => value,
                            reassemble<
                                THIS extends Product<
                                    NAME,
                                    NEW_VALUE,
                                    $<SUPPLIERS>
                                >
                            >(this: THIS) {
                                return this
                            },
                            _dependsOnOneOf: this._dependsOnOneOf,
                            _product: this._product,
                            _supplier: this._supplier
                        }
                    }

                    /**
                     * Packs a value into this product supplier, creating a product with the given value.
                     * Packed products do not depend on any suppliers and always return the packed value.
                     * @param value - The value to pack into the product
                     * @returns A product instance containing the packed value
                     * @example
                     * ```typescript
                     * const userService = market.offer("userService").asProduct({...})
                     * const packedService = userService.pack(new UserService())
                     * ```
                     */
                    function pack<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            any,
                            any,
                            any,
                            any,
                            any
                        >,
                        NEW_VALUE extends VALUE
                    >(this: THIS, value: NEW_VALUE) {
                        return {
                            name: this.name,
                            supplies: {},
                            pack: productPack,
                            // Packed value does not depend on anything.
                            _dependsOnOneOf: () => false,
                            unpack: () => value,
                            reassemble<
                                THIS extends Product<
                                    NAME,
                                    NEW_VALUE,
                                    $<SUPPLIERS>
                                >
                            >(this: THIS) {
                                return this
                            },

                            _product: true as const,
                            _supplier: this
                        }
                    }

                    /**
                     * Creates a prototype version of this product supplier with different dependencies.
                     * Prototypes are used for creating variations of a product with different implementations.
                     * @param config - Configuration for the prototype
                     * @param config.factory - Factory function for the prototype
                     * @param config.suppliers - Dependencies for the prototype
                     * @param config.justInTime - Just-in-time dependencies for the prototype
                     * @param config.init - Whether to init the prototype
                     * @returns A prototype product supplier
                     * @example
                     * ```typescript
                     * const userService = market.offer("userService").asProduct({...})
                     * const mockUserService = userService.prototype({
                     *   factory: () => new MockUserService(),
                     *   suppliers: []
                     * })
                     * ```
                     */
                    function prototype<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            any,
                            any,
                            any,
                            any,
                            any
                        >,
                        SUPPLIERS_OF_PROTOTYPE extends Supplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            false
                        >[] = [],
                        JUST_IN_TIME_OF_PROTOTYPE extends Supplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            false
                        >[] = []
                    >(
                        this: THIS,
                        {
                            factory,
                            suppliers = [] as unknown as SUPPLIERS_OF_PROTOTYPE,
                            justInTime = [] as unknown as JUST_IN_TIME_OF_PROTOTYPE,
                            init,
                            lazy = false
                        }: {
                            factory: (
                                supplies: $<SUPPLIERS_OF_PROTOTYPE>,
                                justInTime: MapFromList<
                                    [...JUST_IN_TIME_OF_PROTOTYPE]
                                >
                            ) => VALUE
                            suppliers?: [...SUPPLIERS_OF_PROTOTYPE]
                            justInTime?: [...JUST_IN_TIME_OF_PROTOTYPE]
                            init?: (
                                value: VALUE,
                                supplies: $<SUPPLIERS_OF_PROTOTYPE>
                            ) => void
                            lazy?: boolean
                        }
                    ) {
                        const supplier = {
                            name: this.name,
                            suppliers,
                            justInTime,
                            factory,
                            init,
                            lazy,
                            pack,
                            assemble,
                            jitOnly,
                            _isPrototype: true as const,
                            _product: true as const
                        }
                        return supplier as HasCircularDependency<
                            typeof supplier
                        > extends true
                            ? unknown
                            : typeof supplier
                    }

                    /**
                     * Tries alternative suppliers for this product, merging them with existing dependencies.
                     * This allows for fallback or alternative implementations of dependencies.
                     * @param suppliers - Alternative suppliers to try
                     * @returns A new product supplier with merged dependencies
                     * @example
                     * ```typescript
                     * const userService = market.offer("userService").asProduct({...})
                     * const fallbackUserService = userService.try(mockUserRepository, testLogger)
                     * ```
                     */
                    function _try<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            SUPPLIERS,
                            JUST_IN_TIME,
                            any,
                            any,
                            any
                        > & {
                            _jitOnly?: true
                        },
                        SUPPLIERS extends ProductSupplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            any
                        >[],
                        JUST_IN_TIME extends ProductSupplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            any
                        >[],
                        TRIED_SUPPLIERS extends ProductSupplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            true
                        >[]
                    >(this: THIS, ...suppliers: [...TRIED_SUPPLIERS]) {
                        type MERGED_SUPPLIERS = TrySuppliers<
                            THIS["suppliers"],
                            TRIED_SUPPLIERS
                        >

                        type MERGED_JUST_IN_TIME_SUPPLIERS = TrySuppliers<
                            THIS["justInTime"],
                            TRIED_SUPPLIERS
                        >

                        const newSupplier = {
                            name: this.name,
                            suppliers: this._jitOnly
                                ? this.suppliers
                                : ([
                                      ...suppliers,
                                      ...this.suppliers.filter(
                                          (oldSupplier) =>
                                              !suppliers.some(
                                                  (newSupplier) =>
                                                      newSupplier.name ===
                                                      oldSupplier.name
                                              )
                                      )
                                  ] as unknown as MERGED_SUPPLIERS),
                            justInTime: [
                                ...suppliers,
                                ...this.justInTime.filter(
                                    (oldSupplier) =>
                                        !suppliers.some(
                                            (newSupplier) =>
                                                newSupplier.name ===
                                                oldSupplier.name
                                        )
                                )
                            ] as unknown as MERGED_JUST_IN_TIME_SUPPLIERS,
                            factory: this.factory,
                            init: this.init,
                            lazy: this.lazy,
                            pack,
                            assemble,
                            jitOnly,
                            _isPrototype: true as const,
                            _product: true as const
                        }

                        return newSupplier as HasCircularDependency<
                            typeof newSupplier
                        > extends true
                            ? unknown
                            : typeof newSupplier
                    }

                    function _with<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            SUPPLIERS,
                            any,
                            any,
                            any,
                            any
                        >,
                        SUPPLIERS extends Supplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            any
                        >[],
                        WITH_SUPPLIERS extends ProductSupplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            any
                        >[]
                    >(this: THIS, ...suppliers: [...WITH_SUPPLIERS]) {
                        type FILTERED_SUPPLIERS = FilterSuppliers<
                            THIS["suppliers"],
                            WITH_SUPPLIERS
                        >

                        const oldSuppliers = this.suppliers.filter(
                            (supplier) =>
                                !suppliers.some(
                                    (newSupplier) =>
                                        newSupplier.name === supplier.name
                                )
                        )
                        const newSupplier = {
                            name: this.name,
                            suppliers: [
                                ...oldSuppliers,
                                ...suppliers
                            ] as unknown as [
                                ...FILTERED_SUPPLIERS,
                                ...WITH_SUPPLIERS
                            ],
                            justInTime: this.justInTime,
                            factory: this.factory,
                            init: this.init,
                            lazy: this.lazy,
                            pack,
                            assemble,
                            jitOnly,
                            _isPrototype: true as const,
                            _product: true as const
                        }

                        return newSupplier as HasCircularDependency<
                            typeof newSupplier
                        > extends true
                            ? unknown
                            : typeof newSupplier
                    }

                    /**
                     * Marks this product as just-in-time only, meaning it will only be resolved when needed.
                     * This is useful for lazy loading or optional dependencies.
                     * @returns A product supplier marked as just-in-time only
                     * @example
                     * ```typescript
                     * const optionalService = market.offer("optionalService").asProduct({...}).jitOnly()
                     * ```
                     */
                    function jitOnly<THIS>(this: THIS) {
                        // Set the flag and return this for chaining
                        return {
                            ...this,
                            _jitOnly: true as const
                        }
                    }

                    return productSupplier as HasCircularDependency<
                        typeof productSupplier
                    > extends true
                        ? unknown
                        : typeof productSupplier
                }
            }

            return offer
        }
    }

    return market
}

export { index } from "#utils"
export * from "#types"
