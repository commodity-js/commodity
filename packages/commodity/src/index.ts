import {
    Product,
    ProductSupplier,
    SupplyMap,
    type ResourceSupplier,
    type $,
    type ToSupply,
    type HasCircularDependency,
    type ExcludeSuppliersType,
    CircularDependencyError,
    Supplier,
    AsProductParameters,
    BaseProductSupplier,
    BaseSupplier
} from "#types"

import { hire } from "#assemble"
import { once } from "#utils"
import {
    assertString,
    assertPlainObject,
    assertProductConfig
} from "#validation"

/**
 * Type guard to check if a supply is a Product.
 * @param supply - The supply to check
 * @returns True if the supply is a Product, false otherwise
 * @internal
 */
function isProduct(supply: any): supply is Product {
    return supply.supplier._product === true
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
            assertString("name", name)
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
                        pack<THIS, VALUE extends CONSTRAINT>(
                            this: THIS,
                            value: VALUE
                        ) {
                            return {
                                name,
                                unpack: () => value,
                                supplier: this
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
                    CONSTRAINT,
                    LAZY extends boolean = false,
                    SUPPLIERS extends BaseSupplier[] = [],
                    OPTIONALS extends ResourceSupplier[] = [],
                    ASSEMBLERS extends BaseProductSupplier[] = [],
                    WITH_SUPPLIERS extends ProductSupplier[] = [],
                    WITH_ASSEMBLERS extends ProductSupplier[] = []
                >(
                    config: AsProductParameters<
                        CONSTRAINT,
                        LAZY,
                        SUPPLIERS,
                        OPTIONALS,
                        ASSEMBLERS,
                        WITH_SUPPLIERS,
                        WITH_ASSEMBLERS
                    >
                ) {
                    assertProductConfig(name, config)
                    const {
                        suppliers = [] as unknown as SUPPLIERS,
                        optionals = [] as unknown as OPTIONALS,
                        assemblers = [] as unknown as ASSEMBLERS,
                        withSuppliers = [] as unknown as WITH_SUPPLIERS,
                        withAssemblers = [] as unknown as WITH_ASSEMBLERS,
                        factory,
                        init,
                        lazy = false as LAZY
                    } = config

                    const supplier = {
                        name,
                        _constraint: null as unknown as CONSTRAINT,
                        lazy,
                        factory,
                        init,
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
                        assemble<
                            THIS,
                            SUPPLIERS extends Supplier[],
                            OPTIONALS extends ResourceSupplier[],
                            WITH_SUPPLIERS extends ProductSupplier[],
                            WITH_ASSEMBLERS extends ProductSupplier[]
                        >(
                            this: THIS & {
                                suppliers: SUPPLIERS
                                optionals: OPTIONALS
                                withSuppliers: WITH_SUPPLIERS
                                withAssemblers: WITH_ASSEMBLERS
                            },
                            supplied: ToSupply<
                                SUPPLIERS,
                                OPTIONALS,
                                WITH_SUPPLIERS,
                                WITH_ASSEMBLERS
                            >
                        ) {
                            assertPlainObject("supplied", supplied)
                            const team = suppliers.filter(
                                (supplier) =>
                                    "_product" in supplier && supplier._product
                            ) as ExcludeSuppliersType<
                                SUPPLIERS,
                                ResourceSupplier
                            >

                            // TODO: Type hole, fix after type refactoring
                            const supplies = hire([
                                ...team,
                                ...withSuppliers
                            ]).assemble(supplied)

                            const $ = (supplier: any) => {
                                return supplies[supplier.name]
                            }

                            const $$ = (supplier: any) => {
                                if ("_resource" in supplier) {
                                    return supplier
                                }

                                const final =
                                    withAssemblers
                                        .toReversed()
                                        .find(
                                            (assembler) =>
                                                assembler.name === supplier.name
                                        ) ?? supplier

                                return {
                                    ...final,
                                    assemble: (supplied: any) =>
                                        final.assemble({
                                            ...supplies,
                                            ...supplied
                                        })
                                } as any
                            }

                            return {
                                unpack: once(() => {
                                    const value = factory($, $$)
                                    if (init) {
                                        init(value, $)
                                    }
                                    return value
                                }),
                                $,
                                reassemble<
                                    THIS,
                                    WITH,
                                    ASSEMBLE,
                                    WITH_SUPPLIERS extends ProductSupplier[],
                                    WITH_ASSEMBLERS extends ProductSupplier[]
                                >(
                                    this: THIS & {
                                        supplier: {
                                            with: WITH &
                                                ((...args: any[]) => {
                                                    assemble: ASSEMBLE &
                                                        ((
                                                            ...args: any[]
                                                        ) => any)
                                                })
                                        }
                                    },
                                    overrides: SupplyMap,
                                    withSuppliers: [
                                        ...WITH_SUPPLIERS
                                    ] = [] as unknown as [...WITH_SUPPLIERS],
                                    withAssemblers: [
                                        ...WITH_ASSEMBLERS
                                    ] = [] as unknown as [...WITH_ASSEMBLERS]
                                ) {
                                    assertPlainObject("overrides", overrides)
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

                                    return this.supplier
                                        .with(withSuppliers, withAssemblers)
                                        .assemble(unassembled) as THIS
                                },
                                _dependsOnOneOf: (overrides: SupplyMap) => {
                                    for (const supplier of [
                                        ...suppliers,
                                        ...optionals,
                                        ...withSuppliers
                                    ]) {
                                        if (supplier.name in overrides) {
                                            return true
                                        }

                                        const supply = supplies[supplier.name]

                                        if (
                                            isProduct(supply) &&
                                            supply._dependsOnOneOf(overrides)
                                        ) {
                                            return true
                                        }
                                    }
                                    return false
                                },
                                supplier
                            }
                        },
                        pack<THIS, VALUE extends CONSTRAINT>(
                            this: THIS,
                            value: VALUE
                        ) {
                            return {
                                unpack: () => value,
                                $: () => undefined,
                                // Packed value does not depend on anything.
                                _dependsOnOneOf: () => false,
                                reassemble<THIS>(this: THIS) {
                                    return this
                                },
                                supplier: this
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
                            THIS,
                            LAZY extends boolean = false,
                            SUPPLIERS extends BaseSupplier[] = [],
                            OPTIONALS extends ResourceSupplier[] = [],
                            ASSEMBLERS extends BaseProductSupplier[] = [],
                            WITH_SUPPLIERS extends ProductSupplier[] = [],
                            WITH_ASSEMBLERS extends ProductSupplier[] = []
                        >(
                            this: THIS & {
                                offer: {
                                    asProduct: (config: any) => any
                                }
                            },
                            config: AsProductParameters<
                                CONSTRAINT,
                                LAZY,
                                SUPPLIERS,
                                OPTIONALS,
                                ASSEMBLERS,
                                WITH_SUPPLIERS,
                                WITH_ASSEMBLERS
                            >
                        ) {
                            const p = this.offer.asProduct(
                                config
                            ) as ProductSupplier<
                                NAME,
                                CONSTRAINT,
                                SUPPLIERS,
                                OPTIONALS,
                                ASSEMBLERS,
                                WITH_SUPPLIERS,
                                WITH_ASSEMBLERS
                            >

                            const prototype = {
                                ...p,
                                _isPrototype: true as const
                            }

                            return prototype as HasCircularDependency<
                                typeof prototype
                            > extends true
                                ? CircularDependencyError
                                : typeof prototype
                        },
                        /**
                         * Allows replacing or adding suppliers in the dependency chain of this product,
                         * composition-root style.
                         * This allows for mocking or prototyping suppliers, or allows to batch assemble
                         * suppliers at once.
                         *
                         * @param suppliers - New suppliers to add
                         * @param assemblers - New assemblers to add
                         * @returns A new product supplier with merged dependencies
                         * @public
                         */
                        with<
                            THIS,
                            NAME extends string,
                            CONSTRAINT,
                            SUPPLIERS extends BaseSupplier[],
                            OPTIONALS extends ResourceSupplier[],
                            ASSEMBLERS extends BaseProductSupplier[],
                            WITH_SUPPLIERS extends ProductSupplier[],
                            WITH_ASSEMBLERS extends ProductSupplier[],
                            WITH_SUPPLIERS_2 extends ProductSupplier[],
                            WITH_ASSEMBLERS_2 extends ProductSupplier[]
                        >(
                            this: THIS &
                                ProductSupplier<
                                    NAME,
                                    any,
                                    SUPPLIERS,
                                    OPTIONALS,
                                    ASSEMBLERS,
                                    WITH_SUPPLIERS,
                                    WITH_ASSEMBLERS
                                > & {
                                    _constraint: CONSTRAINT
                                    offer: {
                                        asProduct: (config: any) => any
                                    }
                                },
                            withSuppliers: [...WITH_SUPPLIERS_2],
                            withAssemblers?: [...WITH_ASSEMBLERS_2]
                        ) {
                            const c = this.offer.asProduct({
                                ...this,
                                withSuppliers: [
                                    ...this.withSuppliers,
                                    ...withSuppliers
                                ],
                                withAssemblers: [
                                    ...this.withAssemblers,
                                    ...(withAssemblers ?? [])
                                ]
                            }) as ProductSupplier<
                                NAME,
                                CONSTRAINT,
                                SUPPLIERS,
                                OPTIONALS,
                                ASSEMBLERS,
                                [...WITH_SUPPLIERS, ...WITH_SUPPLIERS_2],
                                [...WITH_ASSEMBLERS, ...WITH_ASSEMBLERS_2]
                            >

                            const composite = {
                                ...c,
                                _isPrototype: false as const
                            }

                            return composite as HasCircularDependency<
                                typeof composite
                            > extends true
                                ? CircularDependencyError
                                : typeof composite
                        },
                        _product: true as const,
                        _isPrototype: false as const,
                        suppliers,
                        optionals,
                        assemblers,
                        withSuppliers,
                        withAssemblers,
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
