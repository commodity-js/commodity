import {
    Product,
    ProductSupplier,
    SupplyMap,
    type ResourceSupplier,
    type $,
    type ToSupply,
    type HasCircularDependency,
    type ExcludeSuppliersType,
    type MapFromList,
    ProductSupplierConfig,
    PrototypeSupplier,
    CompositeSupplier,
    BaseSupplier,
    BaseProductSupplier,
    CircularDependencyError
} from "#types"

import { hire } from "#assemble"
import { index, isCompatible, once } from "#utils"
import {
    validateString,
    validatePlainObject,
    validateDefined,
    validateProductConfig,
    validateSuppliers
} from "#validation"

/**
 * Type guard to check if a supply is a Product.
 * @param supply - The supply to check
 * @returns True if the supply is a Product, false otherwise
 * @internal
 */
function isProduct(supply: unknown): supply is Product {
    return (
        typeof supply === "object" &&
        supply !== null &&
        "_product" in supply &&
        "name" in supply &&
        "pack" in supply &&
        "unpack" in supply &&
        "reassemble" in supply &&
        "_dependsOnOneOf" in supply &&
        "_constraint" in supply
    )
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
                asResource<CONSTRAINT>() {
                    return {
                        name,
                        pack<THIS, NEW_VALUE extends CONSTRAINT>(
                            this: THIS,
                            value: NEW_VALUE
                        ) {
                            validateDefined(value, "value")
                            return {
                                ...this,
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
                 *
                 * @returns A product supplier configuration object with methods like assemble, pack, try, with, etc.
                 * @public
                 */
                asProduct<
                    THIS,
                    VALUE extends CONSTRAINT,
                    SUPPLIERS extends BaseSupplier[] = [],
                    OPTIONALS extends ResourceSupplier[] = [],
                    ASSEMBLERS extends BaseProductSupplier[] = [],
                    CONSTRAINT = VALUE
                >(
                    this: THIS,
                    config: ProductSupplierConfig<
                        VALUE,
                        SUPPLIERS,
                        OPTIONALS,
                        ASSEMBLERS
                    >
                ) {
                    validateProductConfig(name, config)
                    const {
                        suppliers = [] as unknown as SUPPLIERS,
                        optionals = [] as unknown as OPTIONALS,
                        assemblers = [] as unknown as ASSEMBLERS,
                        factory,
                        init,
                        lazy = false
                    } = config

                    const supplier = {
                        name,
                        suppliers,
                        optionals,
                        assemblers,
                        factory,
                        lazy,
                        init,
                        pack<THIS, NEW_VALUE extends CONSTRAINT>(
                            this: THIS,
                            value: NEW_VALUE
                        ) {
                            validateDefined(value, "value")
                            return {
                                ...this,
                                unpack: () => value,
                                supplies: {},
                                // Packed value does not depend on anything.
                                _dependsOnOneOf: () => false,
                                reassemble<THIS>(this: THIS) {
                                    return this
                                }
                            }
                        },
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
                        assemble<THIS>(
                            this: THIS,
                            toSupply: ToSupply<SUPPLIERS, OPTIONALS>
                        ) {
                            // Only validate if it's not the internal $ callable object
                            if (typeof toSupply !== "function") {
                                validatePlainObject(toSupply, "toSupply")
                            }
                            const team = suppliers.filter(
                                (supplier) =>
                                    "_product" in supplier && supplier._product
                            ) as ExcludeSuppliersType<
                                SUPPLIERS,
                                ResourceSupplier
                            >

                            // TODO: Type hole, fix after type refactoring
                            const supplies = hire(team).assemble(toSupply) as $<
                                SUPPLIERS,
                                OPTIONALS
                            >

                            return {
                                ...this,
                                supplies,
                                unpack: once(() => {
                                    const value = factory(
                                        supplies,
                                        index(
                                            ...assemblers,
                                            ...optionals
                                        ) as MapFromList<
                                            [...ASSEMBLERS, ...OPTIONALS]
                                        >
                                    )
                                    if (init) {
                                        init(value, supplies)
                                    }
                                    return value
                                }),
                                reassemble<
                                    THIS extends Product<
                                        NAME,
                                        VALUE,
                                        CONSTRAINT,
                                        SUPPLIES
                                    > & { with: WITH },
                                    SUPPLIES,
                                    WITH extends (...args: any[]) => {
                                        assemble: ASSEMBLE
                                    },
                                    ASSEMBLE extends (...args: any[]) => any,
                                    WITH_SUPPLIERS extends (
                                        | BaseProductSupplier
                                        | PrototypeSupplier
                                    )[],
                                    WITH_ASSEMBLERS extends (
                                        | BaseProductSupplier
                                        | PrototypeSupplier<true>
                                    )[]
                                >(
                                    this: THIS,
                                    overrides: SupplyMap,
                                    withSuppliers: [
                                        ...WITH_SUPPLIERS
                                    ] = [] as unknown as [...WITH_SUPPLIERS],
                                    withAssemblers: [
                                        ...WITH_ASSEMBLERS
                                    ] = [] as unknown as [...WITH_ASSEMBLERS]
                                ) {
                                    validatePlainObject(overrides, "overrides")
                                    const unassembled: SupplyMap = overrides

                                    // Loop over all supplies and check if they need resupplying
                                    for (const [name, supply] of Object.entries<
                                        SupplyMap[keyof SupplyMap]
                                    >(supplies)) {
                                        if (name in overrides) {
                                            continue
                                        }

                                        // Save the old value if it doesn't depend on any of the overrides
                                        if (
                                            !isProduct(supply) ||
                                            !supply._dependsOnOneOf(overrides)
                                        ) {
                                            unassembled[name] = supply
                                        }
                                    }

                                    return this.with(
                                        withSuppliers,
                                        withAssemblers
                                    ).assemble(unassembled) as Product<
                                        NAME,
                                        VALUE,
                                        CONSTRAINT,
                                        SUPPLIES & $<WITH_SUPPLIERS, []>
                                    >
                                },
                                _dependsOnOneOf: (overrides: SupplyMap) => {
                                    for (const supplier of suppliers) {
                                        if (supplier.name in overrides) {
                                            return true
                                        }

                                        const supply =
                                            supplies[
                                                supplier.name as keyof $<
                                                    SUPPLIERS,
                                                    OPTIONALS
                                                >
                                            ]

                                        if (
                                            isProduct(supply) &&
                                            supply._dependsOnOneOf(overrides)
                                        ) {
                                            return true
                                        }
                                    }
                                    return false
                                }
                            }
                        },
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
                         * @returns A prototype product supplier
                         * @public
                         * @example
                         */
                        prototype<
                            THIS extends ProductSupplier & {
                                offer: {
                                    asProduct: (
                                        config: ProductSupplierConfig<
                                            VALUE,
                                            SUPPLIERS_OF_PROTOTYPE,
                                            OPTIONALS_OF_PROTOTYPE,
                                            ASSEMBLERS_OF_PROTOTYPE
                                        >
                                    ) => Omit<
                                        ProductSupplier<
                                            NAME,
                                            VALUE,
                                            CONSTRAINT,
                                            SUPPLIERS_OF_PROTOTYPE,
                                            OPTIONALS_OF_PROTOTYPE,
                                            ASSEMBLERS_OF_PROTOTYPE,
                                            $<
                                                SUPPLIERS_OF_PROTOTYPE,
                                                OPTIONALS_OF_PROTOTYPE
                                            >,
                                            ToSupply<
                                                SUPPLIERS_OF_PROTOTYPE,
                                                OPTIONALS_OF_PROTOTYPE
                                            >,
                                            MapFromList<
                                                [
                                                    ...ASSEMBLERS_OF_PROTOTYPE,
                                                    ...OPTIONALS_OF_PROTOTYPE
                                                ]
                                            >
                                        >,
                                        "prototype"
                                    >
                                }
                            },
                            SUPPLIERS_OF_PROTOTYPE extends BaseSupplier[] = [],
                            OPTIONALS_OF_PROTOTYPE extends ResourceSupplier[] = [],
                            ASSEMBLERS_OF_PROTOTYPE extends BaseProductSupplier[] = []
                        >(
                            this: THIS,
                            config: {
                                factory: (
                                    $: $<
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
                                    $: $<
                                        SUPPLIERS_OF_PROTOTYPE,
                                        OPTIONALS_OF_PROTOTYPE
                                    >
                                ) => void
                                lazy?: boolean
                            }
                        ) {
                            validateProductConfig(name, config)
                            const prototype = this.offer.asProduct(config)
                            return {
                                ...prototype,
                                _isPrototype: true as const,
                                _isComposite: false as const,
                                _isCompatible: isCompatible(this, prototype)
                            }
                        },
                        /**
                         * Allows replacing or adding suppliers in the dependency chain of this product,
                         * composition-root style.
                         * This allows for mocking or prototyping suppliers, or allows to batch assemble
                         * suppliers at once.
                         *
                         * @param suppliers - New suppliers to add
                         * @param assemblers - New assemblers to add (must be compatible prototypes if replacing existing assemblers)
                         * @returns A new product supplier with merged dependencies
                         * @public
                         */
                        with<
                            THIS extends ProductSupplier & {
                                offer: {
                                    asProduct: (
                                        config: ProductSupplierConfig<VALUE>
                                    ) => Omit<ProductSupplier, "prototype">
                                }
                            },
                            WITH_SUPPLIERS extends (
                                | BaseProductSupplier
                                | PrototypeSupplier
                            )[],
                            WITH_ASSEMBLERS extends (
                                | BaseProductSupplier
                                | PrototypeSupplier<true>
                            )[]
                        >(
                            this: THIS,
                            withSuppliers: [...WITH_SUPPLIERS],
                            withAssemblers: [
                                ...WITH_ASSEMBLERS
                            ] = [] as unknown as [...WITH_ASSEMBLERS]
                        ) {
                            validateSuppliers(withSuppliers, "suppliers", true)
                            validateSuppliers(
                                withAssemblers,
                                "assemblers",
                                true
                            )

                            withAssemblers.forEach((assembler) => {
                                if (!assembler._isCompatible) {
                                    throw new Error(
                                        `Assembler (${assembler.name}) is incompatible: ` +
                                            `this prototype requires additional resources that ` +
                                            `the base supplier doesn't require. ` +
                                            `Incompatible prototypes cannot be used as assemblers.`
                                    )
                                }
                            })

                            const composite = this.offer.asProduct({
                                factory: ($, $$) => {
                                    return this.factory(
                                        $ as $<SUPPLIERS, OPTIONALS>,
                                        $$ as MapFromList<
                                            [...ASSEMBLERS, ...OPTIONALS]
                                        >
                                    )
                                },
                                suppliers: [
                                    ...this.suppliers.filter(
                                        (oldSupplier) =>
                                            !withSuppliers.some(
                                                (withSupplier) =>
                                                    withSupplier.name ===
                                                    oldSupplier.name
                                            )
                                    ),
                                    ...withSuppliers.map((supplier) => ({
                                        ...supplier,
                                        _isPrototype: false as const,
                                        _isComposite: false as const,
                                        _isCompatible: true as const
                                    }))
                                ],
                                optionals: [...this.optionals],
                                assemblers: [
                                    ...this.assemblers.filter(
                                        (oldAssembler) =>
                                            !withAssemblers.some(
                                                (withAssembler) =>
                                                    withAssembler.name ===
                                                    oldAssembler.name
                                            )
                                    ),
                                    ...(withAssemblers as unknown as ASSEMBLERS)
                                ],
                                init: (value: VALUE, $) =>
                                    this.init?.(
                                        value,
                                        $ as $<SUPPLIERS, OPTIONALS>
                                    ),
                                lazy: this.lazy,
                                _allowPrototypes: true as never
                            })

                            return {
                                ...composite,
                                _isComposite: true as const
                            } as CompositeSupplier<THIS, WITH_SUPPLIERS>
                        },
                        _product: true as const,
                        _isCompatible: true as const,
                        _isComposite: false as const,
                        _isPrototype: false as const,
                        _constraint: null as unknown as CONSTRAINT,
                        offer: this
                    }

                    return supplier as HasCircularDependency<
                        typeof supplier
                    > extends true
                        ? CircularDependencyError
                        : typeof supplier
                }
            }

            return offer
        }
    }

    return market
}

export { index, sleep } from "#utils"
export * from "#types"
