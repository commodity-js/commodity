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
import {
    validateString,
    validatePlainObject,
    validateDefined,
    validateProductConfig,
    validatePrototypeConfig,
    validateSuppliers
} from "#validation"

/**
 * Type guard to check if a supply is a Product.
 * @param supply - The supply to check
 * @returns True if the supply is a Product, false otherwise
 * @internal
 */
function isProduct(
    supply: SupplyMap[keyof SupplyMap]
): supply is Product<string, any, any> {
    if (supply === undefined) {
        return false
    }
    return "_product" in supply
}

/**
 * Creates a new market instance for managing suppliers and products.
 * A market provides a namespace for creating and managing suppliers without name conflicts.
 * Each market maintains its own registry of supplier names to prevent collisions.
 *
 * @returns A market object with methods to create suppliers and products
 * @public
 */
export const createMarket = () => {
    const names = new Set<string>()
    const market = {
        /**
         * Offers a new supplier or product with the given name.
         * The name must be unique within this market.
         *
         * @param name - The unique name for this supplier/product
         * @returns An offer object with methods to define the supplier type (asResource or asProduct)
         * @throws Error if the name already exists in this market
         * @public
         */
        offer<NAME extends string>(name: NAME) {
            validateString(name, "name")
            if (names.has(name)) {
                throw new Error(`Name ${name} already exists`)
            }
            names.add(name)
            const offer = {
                /**
                 * Creates a resource supplier that can provide values of a specific constraint type.
                 * Resources are simple value containers that can be packed and unpacked.
                 * They're ideal for configuration values, constants, or any simple data that doesn't
                 * have dependencies on other suppliers.
                 *
                 * @typeParam CONSTRAINT - The type constraint for values this resource can hold
                 * @returns A resource supplier configuration object with a `pack` method
                 * @public
                 */
                asResource: <CONSTRAINT>() => {
                    return {
                        name,
                        pack<
                            THIS extends ResourceSupplier<NAME, CONSTRAINT>,
                            NEW_VALUE extends CONSTRAINT
                        >(this: THIS, value: NEW_VALUE) {
                            validateDefined(value, "value")
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
                 * They represent complex objects that require dependency injection and orchestration.
                 *
                 * @typeParam VALUE - The type of value this product produces
                 * @typeParam SUPPLIERS - Array of suppliers this product depends on
                 * @typeParam OPTIONALS - Array of optional suppliers this product may depend on
                 * @typeParam ASSEMBLERS - Array of assemblers (lazy suppliers)
                 * @typeParam IS_PROTOTYPE - Whether this is a prototype supplier
                 * @param config - Configuration object for the product
                 * @param config.suppliers - Array of suppliers this product depends on
                 * @param config.assemblers - Array of assemblers (lazy suppliers)
                 * @param config.factory - Factory function that creates the product value from its dependencies
                 * @param config.init - Optional initialization function for the product
                 * @param config.lazy - Whether the product should be lazily evaluated
                 * @param config.isPrototype - Whether this is a prototype supplier
                 *
                 * @returns A product supplier configuration object with methods like assemble, pack, try, with, etc.
                 * @public
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
                        any,
                        IS_PROTOTYPE extends false ? false : boolean
                    >[] = [],
                    OPTIONALS extends ResourceSupplier<string, any>[] = [],
                    ASSEMBLERS extends ProductSupplier<
                        string,
                        any,
                        any,
                        any,
                        any,
                        any,
                        any,
                        IS_PROTOTYPE extends false ? false : boolean
                    >[] = [],
                    IS_PROTOTYPE extends boolean = false
                >(config: {
                    suppliers?: [...SUPPLIERS]
                    optionals?: [...OPTIONALS]
                    assemblers?: [...ASSEMBLERS]
                    factory: (
                        supplies: $<SUPPLIERS, OPTIONALS>,
                        assemblers: MapFromList<[...ASSEMBLERS, ...OPTIONALS]>
                    ) => VALUE
                    init?: (
                        value: VALUE,
                        supplies: $<SUPPLIERS, OPTIONALS>
                    ) => void
                    lazy?: boolean
                    isPrototype?: IS_PROTOTYPE
                }) => {
                    validateProductConfig(config)
                    const {
                        suppliers = [] as unknown as SUPPLIERS,
                        optionals = [] as unknown as OPTIONALS,
                        assemblers = [] as unknown as ASSEMBLERS,
                        factory,
                        init,
                        lazy = false,
                        isPrototype = false as IS_PROTOTYPE
                    } = config
                    const productSupplier = {
                        name,
                        suppliers,
                        optionals,
                        assemblers,
                        factory,
                        lazy,
                        init,
                        pack,
                        assemble,
                        try: _try,
                        with: _with,
                        assemblersOnly,
                        prototype,
                        _isPrototype: isPrototype,
                        _product: true as const
                    }

                    /**
                     * Assembles the product by resolving all dependencies and creating the final instance.
                     * This method orchestrates the dependency resolution.
                     * It autowires all product dependencies and requires only resource
                     * dependencies to be supplied.
                     *
                     * @param toSupply - Map of resource supplies to use for dependency resolution
                     * @returns A product instance with the resolved dependencies and unpack method
                     * @public
                     */
                    function assemble<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            Supplier<
                                string,
                                any,
                                any,
                                any,
                                any,
                                any,
                                any,
                                any
                            >[],
                            ResourceSupplier<string, any>[],
                            any,
                            any,
                            any,
                            any
                        >
                    >(
                        this: THIS,
                        toSupply: ToSupply<THIS["suppliers"], THIS["optionals"]>
                    ) {
                        // Only validate if it's not the internal $ callable object
                        if (typeof toSupply !== "function") {
                            validatePlainObject(toSupply, "toSupply")
                        }
                        const team = this.suppliers.filter(
                            (supplier) =>
                                "_product" in supplier && supplier._product
                        ) as ExcludeSuppliersType<
                            THIS["suppliers"],
                            ResourceSupplier<string, any>
                        >

                        const assemble = (toSupply: SupplyMap) =>
                            hire(team).assemble(toSupply) as unknown as $<
                                THIS["suppliers"],
                                THIS["optionals"]
                            >

                        const supplies = assemble(toSupply)

                        const buildUnpack = (
                            supplies: $<THIS["suppliers"], THIS["optionals"]>
                        ) => {
                            return once(() => {
                                const value = this.factory(
                                    supplies,
                                    index(...this.assemblers, ...this.optionals)
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
                                validatePlainObject(overrides, "overrides")

                                const unassembled: SupplyMap = {}

                                // Loop over all supplies and check if they need resupplying
                                for (const [name, supply] of Object.entries<
                                    SupplyMap[keyof SupplyMap]
                                >(this.supplies)) {
                                    if (name in overrides) {
                                        unassembled[name] = overrides[name]
                                        continue
                                    }

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
                                for (const supplier of this._supplier
                                    .suppliers) {
                                    if (supplier.name in overrides) {
                                        return true
                                    }

                                    const supply =
                                        this.supplies[
                                            supplier.name as keyof $<
                                                SUPPLIERS,
                                                OPTIONALS
                                            >
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
                     * Packed products have no dependencies and always return the packed value.
                     *
                     * @param value - The new value to pack into the product
                     * @returns A new product instance with the packed value and no dependencies
                     * @internal
                     */
                    function productPack<
                        THIS extends Product<
                            NAME,
                            VALUE,
                            $<SUPPLIERS, OPTIONALS>
                        >,
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
                                    $<SUPPLIERS, OPTIONALS>
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
                     * This is useful for testing or providing mock implementations.
                     *
                     * @param value - The value to pack into the product
                     * @returns A product instance containing the packed value with no dependencies
                     * @public
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
                        validateDefined(value, "value")
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
                                    $<SUPPLIERS, OPTIONALS>
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
                     * Prototypes are used for creating variations of a product with different implementations
                     * while keeping the same name. This is useful for testing, mocking, or providing
                     * alternative implementations.
                     *
                     * @typeParam SUPPLIERS_OF_PROTOTYPE - Array of suppliers for the prototype
                     * @typeParam ASSEMBLERS_OF_PROTOTYPE - Array of assemblers for the prototype
                     * @param config - Configuration for the prototype
                     * @param config.factory - Factory function for the prototype
                     * @param config.suppliers - Dependencies for the prototype (can be different from the original)
                     * @param config.assemblers - Assemblers for the prototype
                     * @param config.init - Optional initialization function for the prototype
                     * @param config.lazy - Whether the prototype should be lazily evaluated
                     * @returns A prototype product supplier marked as IS_PROTOTYPE = true
                     * @public
                     * @example
                     */
                    function prototype<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            any,
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
                            any,
                            false
                        >[] = [],
                        OPTIONALS_OF_PROTOTYPE extends ResourceSupplier<
                            string,
                            any
                        >[] = [],
                        ASSEMBLERS_OF_PROTOTYPE extends ProductSupplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            any,
                            false
                        >[] = []
                    >(
                        this: THIS,
                        config: {
                            factory: (
                                supplies: $<
                                    SUPPLIERS_OF_PROTOTYPE,
                                    OPTIONALS_OF_PROTOTYPE
                                >,
                                $$: MapFromList<
                                    [
                                        ...ASSEMBLERS_OF_PROTOTYPE,
                                        ...OPTIONALS_OF_PROTOTYPE
                                    ]
                                >
                            ) => VALUE
                            suppliers?: [...SUPPLIERS_OF_PROTOTYPE]
                            optionals?: [...OPTIONALS_OF_PROTOTYPE]
                            assemblers?: [...ASSEMBLERS_OF_PROTOTYPE]
                            init?: (
                                value: VALUE,
                                supplies: $<
                                    SUPPLIERS_OF_PROTOTYPE,
                                    OPTIONALS_OF_PROTOTYPE
                                >
                            ) => void
                            lazy?: boolean
                        }
                    ) {
                        validatePrototypeConfig(config)
                        const {
                            factory,
                            suppliers = [] as unknown as SUPPLIERS_OF_PROTOTYPE,
                            optionals = [] as unknown as OPTIONALS_OF_PROTOTYPE,
                            assemblers = [] as unknown as ASSEMBLERS_OF_PROTOTYPE,
                            init,
                            lazy = false
                        } = config
                        const supplier = {
                            name: this.name,
                            suppliers,
                            optionals,
                            assemblers,
                            factory,
                            init,
                            lazy,
                            pack,
                            assemble,
                            assemblersOnly,
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
                     * When a supplier name matches an existing dependency, the new supplier takes precedence.
                     *
                     * The `try` method is useful for testing or providing alternative implementations
                     * without changing the original supplier definition.
                     *
                     * @param suppliers - Alternative suppliers to try (must be prototypes)
                     * @returns A new product supplier with merged dependencies marked as prototype
                     * @public
                     */
                    function _try<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            SUPPLIERS,
                            OPTIONALS,
                            ASSEMBLERS,
                            any,
                            any,
                            any
                        > & {
                            _assemblersOnly?: true
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
                        ASSEMBLERS extends ProductSupplier<
                            string,
                            any,
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
                            any,
                            true
                        >[]
                    >(this: THIS, ...suppliers: [...TRIED_SUPPLIERS]) {
                        validateSuppliers(suppliers, "suppliers")
                        type MERGED_SUPPLIERS = TrySuppliers<
                            THIS["suppliers"],
                            TRIED_SUPPLIERS
                        >

                        type MERGED_ASSEMBLERS = TrySuppliers<
                            THIS["assemblers"],
                            TRIED_SUPPLIERS
                        >

                        const newSupplier = {
                            name: this.name,
                            suppliers: this._assemblersOnly
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
                            optionals: [],
                            assemblers: [
                                ...suppliers,
                                ...this.assemblers.filter(
                                    (oldSupplier) =>
                                        !suppliers.some(
                                            (newSupplier) =>
                                                newSupplier.name ===
                                                oldSupplier.name
                                        )
                                )
                            ] as unknown as MERGED_ASSEMBLERS,
                            factory: this.factory,
                            init: this.init,
                            lazy: this.lazy,
                            pack,
                            assemble,
                            assemblersOnly,
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
                     * Method designed to allow assembling multiple suppliers at once.
                     * @param suppliers - suppliers to assemble alongside `this` supplier
                     * @returns A new product supplier whose assemble() method requires all resources needed by all suppliers.
                     * @public
                     */
                    function _with<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            SUPPLIERS,
                            any,
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
                            any,
                            any
                        >[]
                    >(this: THIS, ...suppliers: [...WITH_SUPPLIERS]) {
                        validateSuppliers(suppliers, "suppliers")
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
                            optionals: [],
                            assemblers: this.assemblers,
                            factory: this.factory,
                            init: this.init,
                            lazy: this.lazy,
                            pack,
                            assemble,
                            assemblersOnly,
                            _isPrototype: this._isPrototype,
                            _product: true as const
                        }

                        return newSupplier as HasCircularDependency<
                            typeof newSupplier
                        > extends true
                            ? unknown
                            : typeof newSupplier
                    }

                    /**
                     * Sets a flag for the try method() to only replace assemblers, not suppliers,
                     * with the provided prototype,
                     *
                     * @returns A product supplier marked as assemblersOnly with _assemblersOnly flag
                     * @public
                     */
                    function assemblersOnly<THIS>(this: THIS) {
                        // Set the flag and return this for chaining
                        return {
                            ...this,
                            _assemblersOnly: true as const
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

export { index, sleep } from "#utils"
export * from "#types"
