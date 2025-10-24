import {
    Product,
    ProductSupplier,
    SupplyMap,
    type ResourceSupplier,
    type $,
    type ToSupply,
    type HasCircularDependency,
    CircularDependencyError,
    Supplier,
    AsProductParameters,
    BaseProductSupplier,
    BaseSupplier,
    Resource
} from "#types"

import { once, team as buildTeam } from "#utils"
import {
    assertString,
    assertPlainObject,
    assertProductConfig
} from "#validation"

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
            return {
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
                    ASSEMBLERS extends BaseProductSupplier[] = []
                >(
                    config: AsProductParameters<
                        CONSTRAINT,
                        LAZY,
                        SUPPLIERS,
                        OPTIONALS,
                        ASSEMBLERS
                    >
                ) {
                    function _base<
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
                            ASSEMBLERS
                        >,
                        withSuppliers: [...WITH_SUPPLIERS] = [] as unknown as [
                            ...WITH_SUPPLIERS
                        ],
                        withAssemblers: [
                            ...WITH_ASSEMBLERS
                        ] = [] as unknown as [...WITH_ASSEMBLERS]
                    ) {
                        assertProductConfig(name, config)

                        const {
                            suppliers = [] as unknown as SUPPLIERS,
                            optionals = [] as unknown as OPTIONALS,
                            assemblers = [] as unknown as ASSEMBLERS,
                            factory,
                            init,
                            lazy = false as LAZY
                        } = config

                        const team = buildTeam(name, [
                            ...suppliers,
                            ...withSuppliers
                        ])

                        const assemblersTeam = buildTeam(name, [
                            ...assemblers,
                            ...withAssemblers
                        ])

                        const supplier = {
                            name,
                            _constraint: null as unknown as CONSTRAINT,
                            lazy,
                            factory,
                            init,
                            _build<THIS, WITH, ASSEMBLE>(
                                this: THIS & {
                                    with: WITH &
                                        ((...args: any[]) => {
                                            assemble: ASSEMBLE &
                                                ((...args: any[]) => any)
                                        })
                                },
                                $: any
                            ) {
                                const $$ = (assembler: any) => {
                                    if ("_resource" in assembler) {
                                        return assembler
                                    }

                                    const actual =
                                        assemblersTeam.find(
                                            (member) =>
                                                member.name === assembler.name
                                        ) ?? assembler

                                    return {
                                        ...actual,
                                        assemble: (supplied: any) =>
                                            actual.assemble({
                                                ...Object.fromEntries(
                                                    $.keys.map(
                                                        (name: string) => [
                                                            name,
                                                            $({ name })
                                                        ]
                                                    )
                                                ),
                                                ...supplied
                                            })
                                    }
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
                                        ] = [] as unknown as [
                                            ...WITH_SUPPLIERS
                                        ],
                                        withAssemblers: [
                                            ...WITH_ASSEMBLERS
                                        ] = [] as unknown as [
                                            ...WITH_ASSEMBLERS
                                        ]
                                    ) {
                                        assertPlainObject(
                                            "overrides",
                                            overrides
                                        )
                                        const unassembled: SupplyMap = overrides

                                        // Loop over all supplies and check if they need resupplying
                                        for (const name of $.keys) {
                                            if (name in overrides) {
                                                continue
                                            }

                                            const supply = $({ name }) as
                                                | Product
                                                | Resource

                                            // Save the old value if it doesn't depend on any of the overrides
                                            if (
                                                !("team" in supply.supplier) ||
                                                supply.supplier.team.every(
                                                    (s) =>
                                                        !(s.name in overrides)
                                                )
                                            ) {
                                                unassembled[name] = supply
                                            }
                                        }

                                        return this.supplier
                                            .with(withSuppliers, withAssemblers)
                                            .assemble(unassembled) as THIS
                                    },
                                    supplier: this
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
                            assemble<
                                THIS,
                                RES,
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
                                    _build: (...args: any[]) => RES
                                },
                                supplied: ToSupply<
                                    SUPPLIERS,
                                    OPTIONALS,
                                    WITH_SUPPLIERS,
                                    WITH_ASSEMBLERS
                                >
                            ) {
                                assertPlainObject("supplied", supplied)

                                const supplies: SupplyMap = supplied

                                for (const supplier of Object.values(team)) {
                                    if (
                                        !("_build" in supplier) ||
                                        supplier.name in supplied
                                    )
                                        continue
                                    supplies[supplier.name] = once(() =>
                                        supplier._build($)
                                    )
                                }

                                const $ = (supplier: { name: string }) => {
                                    const supply = supplies[supplier.name]
                                    // A supply can only be a product, resource or function, so this is sufficient to discriminate.
                                    if (typeof supply === "function") {
                                        return supply()
                                    }
                                    return supply
                                }

                                $.keys = Object.keys(supplies)

                                // Prerun supplier factories
                                for (const supplier of Object.values(team)) {
                                    if ("lazy" in supplier && supplier.lazy)
                                        continue
                                    try {
                                        $(supplier)?.unpack()
                                    } catch (e) {
                                        // console.error(e)
                                        // If prerun fails, we don't want to break the entire supply chain
                                        // The error will be thrown again when the dependency is actually needed
                                    }
                                }

                                return this._build($)
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
                            _product: true as const,
                            _isPrototype: false as const,
                            suppliers,
                            optionals,
                            assemblers,
                            withSuppliers,
                            withAssemblers,
                            team
                        }

                        return supplier as HasCircularDependency<
                            typeof supplier
                        > extends true
                            ? CircularDependencyError
                            : typeof supplier
                    }

                    return {
                        ..._base(config),
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
                            CONSTRAINT,
                            LAZY extends boolean = false,
                            SUPPLIERS extends BaseSupplier[] = [],
                            OPTIONALS extends ResourceSupplier[] = [],
                            ASSEMBLERS extends BaseProductSupplier[] = []
                        >(
                            config: AsProductParameters<
                                CONSTRAINT,
                                LAZY,
                                SUPPLIERS,
                                OPTIONALS,
                                ASSEMBLERS
                            >
                        ) {
                            const base = _base(config)

                            if ("ERROR" in base) {
                                return base
                            }

                            return {
                                ...this,
                                ...base,
                                _isPrototype: true as const
                            }
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
                            CONSTRAINT,
                            LAZY extends boolean,
                            SUPPLIERS extends BaseSupplier[],
                            OPTIONALS extends ResourceSupplier[],
                            ASSEMBLERS extends BaseProductSupplier[],
                            WITH_SUPPLIERS extends ProductSupplier[],
                            WITH_ASSEMBLERS extends ProductSupplier[],
                            WITH_SUPPLIERS_2 extends ProductSupplier[],
                            WITH_ASSEMBLERS_2 extends ProductSupplier[]
                        >(
                            this: THIS &
                                AsProductParameters<
                                    CONSTRAINT,
                                    LAZY,
                                    SUPPLIERS,
                                    OPTIONALS,
                                    ASSEMBLERS
                                > & {
                                    withSuppliers: WITH_SUPPLIERS
                                    withAssemblers: WITH_ASSEMBLERS
                                },
                            withSuppliers: [...WITH_SUPPLIERS_2],
                            withAssemblers?: [...WITH_ASSEMBLERS_2]
                        ) {
                            const base = _base(
                                this,
                                [...this.withSuppliers, ...withSuppliers],
                                [
                                    ...this.withAssemblers,
                                    ...(withAssemblers ??
                                        ([] as unknown as [
                                            ...WITH_ASSEMBLERS_2
                                        ]))
                                ]
                            )

                            if ("ERROR" in base) {
                                return base
                            }

                            return {
                                ...this,
                                ...base,
                                _isPrototype: false as const
                            }
                        }
                    }
                }
            }
        }
    }

    return market
}

export { index, sleep } from "#utils"
export * from "#types"
