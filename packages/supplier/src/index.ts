import {
    Product,
    ProductSupplier,
    Supplier,
    SupplyMap,
    type Resource,
    type ResourceSupplier,
    type $,
    type Team,
    type ToSupply,
    type TrySuppliers
} from "./types"

import { hire } from "#assembler"
export * from "#utils"

function isProduct(
    supply: SupplyMap[keyof SupplyMap]
): supply is Product<string, any> {
    return "_product" in supply
}

export const createMarket = () => {
    const names = new Set<string>()
    const market = {
        offer<NAME extends string>(name: NAME) {
            if (names.has(name)) {
                throw new Error(`Name ${name} already exists`)
            }
            names.add(name)
            const offer = {
                asResource: <CONSTRAINT>() => {
                    const resourceSupplier = {
                        name,
                        _resource: true as const,
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
                        narrow: <VALUE>() => {
                            return offer.asResource<CONSTRAINT & VALUE>()
                        },
                        _constraint: null as unknown as CONSTRAINT
                    }

                    return resourceSupplier
                },
                asProduct: <
                    VALUE,
                    SUPPLIERS extends Supplier<
                        string,
                        any,
                        any,
                        any,
                        PROTOTYPE extends false ? false : boolean
                    >[] = [],
                    PROTOTYPE extends boolean = false
                >({
                    suppliers = [] as unknown as SUPPLIERS,
                    factory,
                    preload = false,
                    prototype = false as PROTOTYPE
                }: {
                    suppliers?: [...SUPPLIERS]
                    factory: (supplies: $<SUPPLIERS>) => VALUE
                    preload?: boolean
                    prototype?: PROTOTYPE
                }) => {
                    // Check for duplicate names in suppliers
                    const supplierNames = new Set<string>()
                    for (const supplier of suppliers) {
                        if (supplierNames.has(supplier.name)) {
                            throw new Error(
                                `Duplicate supplier name: ${supplier.name}`
                            )
                        }
                        supplierNames.add(supplier.name)
                    }

                    function assemble<
                        THIS extends ProductSupplier<
                            NAME,
                            any,
                            Supplier<string, any, any, any, any>[],
                            any,
                            any
                        >
                    >(this: THIS, toSupply: ToSupply<THIS["suppliers"]>) {
                        const team = this.suppliers.filter(
                            (supplier) =>
                                "_product" in supplier && supplier._product
                        ) as Team<THIS["suppliers"]>
                        /**
                         * A type assertion that tells TypeScript to trust us that the resulting
                         * supplies is compatible with the generic type `SUPPLIES`. This is a necessary
                         * type hole because TypeScript's static analysis can't remember that when you Omit properties
                         * and put them back, you end up with the original type. Here toSupply is type guarded to be $<DEPS> - Services<team>,
                         * and hire merges toSupply and team products together, so the result must extend $<DEPS>. But TS cannot guarantee it.
                         */
                        const fullSupplies = hire(team).assemble(
                            toSupply
                        ) as unknown as $<THIS["suppliers"]>

                        const unpack = () =>
                            this.factory(fullSupplies) as ReturnType<
                                THIS["factory"]
                            >

                        const product = {
                            name: this.name,
                            pack: productPack,
                            _dependsOnOneOf: (overrides: SupplyMap) => {
                                // Check if any dependencies need resupplying
                                for (const supplier of this.suppliers) {
                                    // Check if this dependency is directly overridden
                                    if (supplier.name in overrides) {
                                        return true
                                    }

                                    const supply = (fullSupplies as any)[
                                        supplier.name
                                    ]

                                    if (
                                        supply &&
                                        "_dependsOnOneOf" in supply &&
                                        supply._dependsOnOneOf(overrides)
                                    ) {
                                        return true
                                    }
                                }
                                return false
                            },
                            unpack,
                            reassemble: (overrides: SupplyMap) => {
                                // Create a mutable copy of overrides with flexible typing
                                const newSupplies: SupplyMap = {}

                                // Loop over all supplies and check if they need resupplying
                                for (const [name, supply] of Object.entries<
                                    SupplyMap[keyof SupplyMap]
                                >(fullSupplies)) {
                                    if (name in overrides && overrides[name]) {
                                        newSupplies[name] = overrides[name]
                                        continue
                                    }
                                    // If the supply is a resource, or doesn't depend on one of the overrides,
                                    // add it to newSupplies
                                    if (
                                        !isProduct(supply) ||
                                        !supply._dependsOnOneOf(overrides)
                                    ) {
                                        newSupplies[name] = supply
                                    }
                                }

                                return this.assemble(
                                    newSupplies as typeof toSupply
                                )
                            },
                            _product: true as const
                        }

                        return product
                    }

                    function productPack<
                        THIS extends Product<NAME, VALUE>,
                        NEW_VALUE extends VALUE
                    >(this: THIS, value: NEW_VALUE) {
                        return {
                            name: this.name,
                            pack: this.pack,
                            unpack: () => value,
                            reassemble<THIS extends Product<NAME, NEW_VALUE>>(
                                this: THIS
                            ) {
                                return this
                            },
                            _dependsOnOneOf: this._dependsOnOneOf,
                            _product: this._product
                        }
                    }

                    function pack<
                        THIS extends ProductSupplier<NAME, VALUE, any, any>,
                        NEW_VALUE extends VALUE
                    >(this: THIS, value: NEW_VALUE) {
                        return {
                            name: this.name,
                            pack: productPack,
                            // Packed value does not depend on anything.
                            _dependsOnOneOf: () => false,
                            unpack: () => value,
                            reassemble<THIS extends Product<NAME, NEW_VALUE>>(
                                this: THIS
                            ) {
                                return this
                            },
                            _product: true as const
                        }
                    }

                    function _try<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            SUPPLIERS,
                            $<SUPPLIERS>,
                            PROTOTYPE
                        >,
                        PROTOTYPE_SUPPLIERS extends ProductSupplier<
                            string,
                            any,
                            any,
                            any,
                            true
                        >[]
                    >(
                        this: THIS,
                        ...prototypeSuppliers: [...PROTOTYPE_SUPPLIERS]
                    ) {
                        type NEW_SUPPLIERS = TrySuppliers<
                            THIS["suppliers"],
                            PROTOTYPE_SUPPLIERS
                        >

                        return {
                            name: this.name,
                            suppliers: [
                                ...prototypeSuppliers,
                                ...this.suppliers.filter(
                                    (supplier) =>
                                        !prototypeSuppliers.some(
                                            (prototypeSupplier) =>
                                                prototypeSupplier.name ===
                                                supplier.name
                                        )
                                )
                            ] as unknown as NEW_SUPPLIERS,
                            factory: this.factory as (
                                supplies: $<NEW_SUPPLIERS>
                            ) => VALUE,
                            preload: this.preload,
                            pack,
                            assemble,
                            innovate: this.innovate,
                            try: this.try,
                            _prototype: true as const,
                            _product: true as const
                        }
                    }

                    function innovate<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            SUPPLIERS,
                            $<SUPPLIERS>,
                            PROTOTYPE
                        >,
                        NEW_VALUE extends VALUE,
                        NEW_SUPPLIERS extends Supplier<
                            string,
                            any,
                            any,
                            any,
                            false
                        >[] = []
                    >(
                        this: THIS,
                        {
                            factory,
                            suppliers,
                            preload
                        }: {
                            factory: (supplies: $<NEW_SUPPLIERS>) => NEW_VALUE
                            suppliers: [...NEW_SUPPLIERS]
                            preload: boolean
                        }
                    ) {
                        return {
                            name: this.name,
                            suppliers,
                            factory,
                            preload,
                            pack,
                            assemble,
                            innovate: this.innovate,
                            try: this.try,
                            _prototype: true as const,
                            _product: true as const
                        }
                    }

                    const productSupplier = {
                        name,
                        suppliers,
                        factory,
                        preload,
                        pack,
                        assemble,
                        try: _try,
                        innovate,
                        _prototype: prototype,
                        _product: true as const
                    }

                    return productSupplier
                }
            }

            return offer
        }
    }

    return market
}
