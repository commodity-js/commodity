import {
    Product,
    ProductSupplier,
    SupplyMap,
    type ResourceSupplier,
    type ToSupply,
    type HasCircularDependency,
    type $,
    CircularDependencyError,
    Supplier,
    AsProductParameters,
    Resource,
    MainSupplier,
    MainProductSupplier,
    MergeSuppliers,
    TransitiveSuppliers
} from "#types"

import { once, team as buildTeam, isProductSupplier } from "#utils"
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
                        _: {
                            constraint: null as unknown as CONSTRAINT,
                            resource: true as const
                        }
                    }
                },
                /**
                 * Creates a product supplier that can assemble complex objects from dependencies.
                 * Products can depend on other suppliers and have factory functions for creation.
                 * They represent complex objects that require dependency injection and orchestration.
                 *
                 * @typeParam CONSTRAINT - The type constraint for values this product produces
                 * @typeParam LAZY - Whether this product should be lazily evaluated
                 * @typeParam SUPPLIERS - Array of suppliers this product depends on
                 * @typeParam OPTIONALS - Array of optional resource suppliers this product may depend on
                 * @typeParam ASSEMBLERS - Array of assemblers (lazy unassembled product suppliers)
                 * @param config - Configuration object for the product
                 * @param config.suppliers - Array of suppliers this product depends on
                 * @param config.optionals - Array of optional resource suppliers
                 * @param config.assemblers - Array of assemblers (lazy unassembled suppliers)
                 * @param config.factory - Factory function that creates the product value from its dependencies
                 * @param config.init - Optional initialization function called after factory
                 * @param config.lazy - Whether the product should be lazily evaluated
                 *
                 * @returns A product supplier with methods like assemble, pack, mock, and hire
                 * @public
                 */
                asProduct<
                    CONSTRAINT,
                    LAZY extends boolean = false,
                    SUPPLIERS extends MainSupplier[] = [],
                    OPTIONALS extends ResourceSupplier[] = [],
                    ASSEMBLERS extends MainProductSupplier[] = []
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
                        SUPPLIERS extends MainSupplier[] = [],
                        OPTIONALS extends ResourceSupplier[] = [],
                        ASSEMBLERS extends MainProductSupplier[] = [],
                        HIRED_SUPPLIERS extends ProductSupplier[] = [],
                        HIRED_ASSEMBLERS extends ProductSupplier[] = []
                    >(
                        config: AsProductParameters<
                            CONSTRAINT,
                            LAZY,
                            SUPPLIERS,
                            OPTIONALS,
                            ASSEMBLERS
                        >,
                        hiredSuppliers: [
                            ...HIRED_SUPPLIERS
                        ] = [] as unknown as [...HIRED_SUPPLIERS],
                        hiredAssemblers: [
                            ...HIRED_ASSEMBLERS
                        ] = [] as unknown as [...HIRED_ASSEMBLERS]
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

                        type TEAM = [
                            ...TransitiveSuppliers<
                                MergeSuppliers<SUPPLIERS, HIRED_SUPPLIERS>
                            >
                        ]

                        const team = buildTeam(name, [
                            ...suppliers,
                            ...hiredSuppliers
                        ]) as TEAM

                        const assemblersTeam = buildTeam(name, [
                            ...assemblers,
                            ...hiredAssemblers
                        ])

                        const base = {
                            name,
                            suppliers,
                            optionals,
                            assemblers,
                            hiredSuppliers,
                            hiredAssemblers,
                            team,
                            lazy,
                            factory,
                            init,

                            /**
                             * Assembles the product by resolving all dependencies and creating the final instance.
                             * This method orchestrates the dependency resolution by building the transitive team
                             * of all suppliers, autowiring product dependencies, and calling the internal build method.
                             * Only resource dependencies need to be supplied; product dependencies are autowired.
                             *
                             * @param supplied - Map of resource supplies to use for dependency resolution
                             * @returns A product instance with unpack(), $, reassemble() methods and the supplier reference
                             * @public
                             */
                            assemble<
                                THIS,
                                HIRE,
                                ASSEMBLE,
                                TEAM extends Supplier[],
                                SUPPLIERS extends Supplier[],
                                OPTIONALS extends ResourceSupplier[],
                                HIRED_SUPPLIERS extends ProductSupplier[],
                                HIRED_ASSEMBLERS extends ProductSupplier[]
                            >(
                                this: THIS & {
                                    team: TEAM
                                    hire: HIRE &
                                        ((
                                            hiredSuppliers: ProductSupplier[],
                                            hiredAssemblers: ProductSupplier[]
                                        ) => {
                                            assemble: ASSEMBLE &
                                                ((...args: any[]) => any)
                                        })
                                    suppliers: SUPPLIERS
                                    optionals: OPTIONALS
                                    hiredSuppliers: HIRED_SUPPLIERS
                                    hiredAssemblers: HIRED_ASSEMBLERS
                                },
                                supplied: ToSupply<
                                    SUPPLIERS,
                                    OPTIONALS,
                                    HIRED_SUPPLIERS,
                                    HIRED_ASSEMBLERS
                                >
                            ) {
                                assertPlainObject("supplied", supplied)

                                const supplies: SupplyMap<ProductSupplier> =
                                    supplied

                                for (const supplier of Object.values(
                                    this.team
                                )) {
                                    if (
                                        !isProductSupplier(supplier) ||
                                        supplier.name in supplied
                                    )
                                        continue
                                    supplies[supplier.name] = once(() =>
                                        supplier._.build(supplier, $)
                                    )
                                }

                                const $ = (supplier: any) => {
                                    const supply = supplies[supplier.name]

                                    // A supply can only be a product, resource or function, so this is sufficient to discriminate.
                                    if (typeof supply === "function") {
                                        return supply()
                                    }
                                    return supply
                                }

                                $.keys = Object.keys(supplies)

                                // Prerun supplier factories
                                for (const supplier of Object.values(
                                    this.team
                                )) {
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

                                return base._.build(
                                    this,
                                    $ as $<TEAM, OPTIONALS, false>
                                )
                            },
                            /**
                             * Packs a pre-constructed value into a product without dependency resolution.
                             * This is useful for providing mock values or pre-configured instances.
                             *
                             * @param value - The value to pack (must satisfy the constraint type)
                             * @returns A product instance with the packed value and no-op reassemble method
                             * @public
                             */
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
                            _: {
                                /**
                                 * Internal build method that creates the actual product instance.
                                 * This is separated from assemble() to allow for internal reuse during
                                 * reassembly and recursive dependency resolution. It creates the factory
                                 * closure with the $ and $$ accessors and handles initialization.
                                 *
                                 * @param supplier - The supplier being built
                                 * @param $ - The supply accessor function providing resolved dependencies
                                 * @returns A product instance with unpack(), reassemble(), and $ methods
                                 * @internal
                                 */
                                build<
                                    SUPPLIER,
                                    TEAM extends Supplier[],
                                    HIRE,
                                    ASSEMBLE,
                                    $MAP extends $<TEAM, OPTIONALS, false>
                                >(
                                    supplier: SUPPLIER & {
                                        team: TEAM
                                        hire: HIRE &
                                            ((
                                                hiredSuppliers: ProductSupplier[],
                                                hiredAssemblers: ProductSupplier[]
                                            ) => {
                                                assemble: ASSEMBLE &
                                                    ((...args: any[]) => any)
                                            })
                                    },
                                    $: $MAP
                                ) {
                                    const $$ = (assembler: any) => {
                                        const actual =
                                            assemblersTeam.find(
                                                (member) =>
                                                    member.name ===
                                                    assembler.name
                                            ) ?? assembler

                                        if (!isProductSupplier(actual)) {
                                            return actual
                                        }

                                        return {
                                            ...actual,
                                            assemble: (supplied: any) =>
                                                actual.assemble({
                                                    ...Object.fromEntries(
                                                        $.keys.map((name) => [
                                                            name,
                                                            $({ name })
                                                        ])
                                                    ),
                                                    ...supplied
                                                })
                                        }
                                    }

                                    const product = {
                                        unpack: once(() => {
                                            const value = factory($ as any, $$)
                                            if (init) {
                                                init(value, $ as any)
                                            }
                                            return value
                                        }),
                                        $,
                                        reassemble: <
                                            HIRED_SUPPLIERS extends ProductSupplier[],
                                            HIRED_ASSEMBLERS extends ProductSupplier[]
                                        >(
                                            overrides: Partial<SupplyMap>,
                                            hiredSuppliers: [
                                                ...HIRED_SUPPLIERS
                                            ] = [] as unknown as [
                                                ...HIRED_SUPPLIERS
                                            ],
                                            hiredAssemblers: [
                                                ...HIRED_ASSEMBLERS
                                            ] = [] as unknown as [
                                                ...HIRED_ASSEMBLERS
                                            ]
                                        ) => {
                                            assertPlainObject(
                                                "overrides",
                                                overrides
                                            )
                                            const unassembled: SupplyMap = {}

                                            // Loop over all supplies and check if they need resupplying
                                            for (const name of $.keys) {
                                                if (name in overrides) {
                                                    unassembled[name] =
                                                        overrides[name]
                                                    continue
                                                }
                                                if (
                                                    hiredSuppliers.some(
                                                        (hiredS) =>
                                                            hiredS.name === name
                                                    )
                                                ) {
                                                    continue
                                                }

                                                const supply = $({ name }) as
                                                    | Product<
                                                          any,
                                                          ProductSupplier
                                                      >
                                                    | Resource

                                                // Save the old value of every resource supply not in overrides
                                                if (
                                                    !("team" in supply.supplier)
                                                ) {
                                                    unassembled[name] = supply
                                                    continue
                                                }
                                                // Save the old product supply value if it doesn't depend on any of the overrides
                                                if (
                                                    supply.supplier.team.every(
                                                        (s) =>
                                                            !(
                                                                s.name in
                                                                overrides
                                                            ) &&
                                                            !hiredSuppliers.some(
                                                                (hiredS) =>
                                                                    hiredS.name ===
                                                                    s.name
                                                            )
                                                    )
                                                ) {
                                                    unassembled[name] = supply
                                                }
                                            }

                                            return supplier
                                                .hire(
                                                    hiredSuppliers,
                                                    hiredAssemblers
                                                )
                                                .assemble(
                                                    unassembled
                                                ) as typeof product
                                        },
                                        supplier
                                    }

                                    return product
                                },
                                product: true as const,
                                isMock: false as const,
                                constraint: null as unknown as CONSTRAINT
                            }
                        }

                        return base
                    }

                    const supplier = {
                        /**
                         * Creates a mock version of this product supplier with different dependencies.
                         * Mocks are used for creating test variations of a product with different implementations
                         * while keeping the same name. This is useful for testing, stubbing, or providing
                         * alternative implementations without affecting the original supplier.
                         *
                         * @typeParam CONSTRAINT - The type constraint for the mock
                         * @typeParam LAZY - Whether the mock should be lazily evaluated
                         * @typeParam SUPPLIERS - Array of suppliers for the mock
                         * @typeParam OPTIONALS - Array of optional resource suppliers for the mock
                         * @typeParam ASSEMBLERS - Array of assemblers for the mock
                         * @param config - Configuration for the mock
                         * @param config.factory - Factory function for the mock
                         * @param config.suppliers - Dependencies for the mock (can be different from the original)
                         * @param config.optionals - Optional dependencies for the mock
                         * @param config.assemblers - Assemblers for the mock
                         * @param config.init - Optional initialization function for the mock
                         * @param config.lazy - Whether the mock should be lazily evaluated
                         * @returns A mock product supplier with isMock flag set to true
                         * @public
                         */
                        mock<
                            THIS,
                            MOCK,
                            HIRE,
                            CONSTRAINT,
                            LAZY extends boolean = false,
                            SUPPLIERS extends MainSupplier[] = [],
                            OPTIONALS extends ResourceSupplier[] = [],
                            ASSEMBLERS extends MainProductSupplier[] = []
                        >(
                            this: THIS & {
                                mock: MOCK
                                hire: HIRE
                            },
                            config: AsProductParameters<
                                CONSTRAINT,
                                LAZY,
                                SUPPLIERS,
                                OPTIONALS,
                                ASSEMBLERS
                            >
                        ) {
                            const base = _base(config)

                            const supplier = {
                                hire: this.hire,
                                mock: this.mock,
                                ...base,
                                _: {
                                    ...base._,
                                    isMock: true as const
                                }
                            }

                            return supplier as HasCircularDependency<
                                typeof supplier
                            > extends true
                                ? CircularDependencyError
                                : typeof supplier
                        },
                        /**
                         * Hires additional suppliers into the dependency chain of this product.
                         * This allows replacing or adding suppliers composition-root style for testing,
                         * mocking, or batch assembly. Hired suppliers override suppliers with matching
                         * names in the transitive dependency tree.
                         *
                         * @param hiredSuppliers - Product suppliers to hire (replace/add to the team)
                         * @param hiredAssemblers - Product assemblers to hire (replace/add to assemblers)
                         * @returns A new product supplier with the hired suppliers merged into the team
                         * @public
                         */
                        hire<
                            THIS,
                            MOCK,
                            HIRE,
                            CONSTRAINT,
                            LAZY extends boolean,
                            SUPPLIERS extends MainSupplier[],
                            OPTIONALS extends ResourceSupplier[],
                            ASSEMBLERS extends MainProductSupplier[],
                            HIRED_SUPPLIERS extends ProductSupplier[],
                            HIRED_ASSEMBLERS extends ProductSupplier[],
                            HIRED_SUPPLIERS_2 extends ProductSupplier[],
                            HIRED_ASSEMBLERS_2 extends ProductSupplier[]
                        >(
                            this: THIS &
                                AsProductParameters<
                                    CONSTRAINT,
                                    LAZY,
                                    SUPPLIERS,
                                    OPTIONALS,
                                    ASSEMBLERS
                                > & {
                                    hiredSuppliers: [...HIRED_SUPPLIERS]
                                    hiredAssemblers: [...HIRED_ASSEMBLERS]
                                    mock: MOCK
                                    hire: HIRE
                                },
                            hiredSuppliers: [...HIRED_SUPPLIERS_2],
                            hiredAssemblers?: [...HIRED_ASSEMBLERS_2]
                        ) {
                            const base = _base(
                                this,
                                [...this.hiredSuppliers, ...hiredSuppliers],
                                [
                                    ...this.hiredAssemblers,
                                    ...(hiredAssemblers ??
                                        ([] as unknown as [
                                            ...HIRED_ASSEMBLERS_2
                                        ]))
                                ]
                            )

                            const supplier = {
                                mock: this.mock,
                                hire: this.hire,
                                ...base,
                                _: {
                                    ...base._,
                                    isMock: false as const,
                                    isComposite: true as const
                                }
                            }

                            return supplier as HasCircularDependency<
                                typeof supplier
                            > extends true
                                ? CircularDependencyError
                                : typeof supplier
                        },
                        ..._base(config)
                    }

                    return supplier as HasCircularDependency<
                        typeof supplier
                    > extends true
                        ? CircularDependencyError
                        : typeof supplier
                }
            }
        }
    }

    return market
}

export { index, sleep } from "#utils"
export * from "#types"
