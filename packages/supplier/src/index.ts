import {
    Product,
    ProductSupplier,
    Supplier,
    SupplyMap,
    type Resource,
    type ResourceSupplier,
    type $,
    type ToSupply,
    type MergeSuppliers,
    type HasCircularDependency,
    type ExcludeSuppliersType,
    type MapFromList
} from "#types"

import { hire } from "#assemble"
import { index } from "#utils"
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
                        any,
                        any,
                        IS_PROTOTYPE extends false ? false : boolean
                    >[] = [],
                    JUSTINTIME extends Supplier<
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
                    justInTime = [] as unknown as JUSTINTIME,
                    factory,
                    preload = true,
                    isPrototype = false as IS_PROTOTYPE
                }: {
                    suppliers?: [...SUPPLIERS]
                    justInTime?: [...JUSTINTIME]
                    factory: (
                        supplies: $<SUPPLIERS>,
                        justInTime: MapFromList<[...JUSTINTIME]>
                    ) => VALUE
                    preload?: boolean
                    isPrototype?: IS_PROTOTYPE
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
                            VALUE,
                            Supplier<string, any, any, any, any, any, any>[],
                            Supplier<string, any, any, any, any, any, any>[],
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
                            this.factory(
                                fullSupplies,
                                index(...this.justInTime)
                            ) as ReturnType<THIS["factory"]>

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

                    function prototype<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            SUPPLIERS,
                            JUSTINTIME,
                            $<SUPPLIERS>,
                            MapFromList<[...JUSTINTIME]>,
                            IS_PROTOTYPE
                        >,
                        NEW_VALUE extends VALUE,
                        SUPPLIERS_OF_PROTOTYPE extends Supplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            false
                        >[] = [],
                        ASSEMBLERS_OF_PROTOTYPE extends Supplier<
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
                            justInTime = [] as unknown as ASSEMBLERS_OF_PROTOTYPE,
                            preload = true as boolean
                        }: {
                            factory: (
                                supplies: $<SUPPLIERS_OF_PROTOTYPE>,
                                justInTime: MapFromList<
                                    [...ASSEMBLERS_OF_PROTOTYPE]
                                >
                            ) => NEW_VALUE
                            suppliers?: [...SUPPLIERS_OF_PROTOTYPE]
                            justInTime?: [...ASSEMBLERS_OF_PROTOTYPE]
                            preload?: boolean
                        }
                    ) {
                        const supplier = {
                            name: this.name,
                            suppliers,
                            justInTime,
                            factory,
                            preload,
                            pack,
                            assemble,
                            prototype: this.prototype,
                            try: this.try,
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

                    function _try<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            SUPPLIERS,
                            JUSTINTIME,
                            $<SUPPLIERS>,
                            MapFromList<[...JUSTINTIME]>,
                            IS_PROTOTYPE
                        > & { _jitOnly?: boolean },
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
                        type MERGED_SUPPLIERS = MergeSuppliers<
                            THIS["suppliers"],
                            TRIED_SUPPLIERS
                        >

                        type MERGED_JUST_IN_TIME_SUPPLIERS = MergeSuppliers<
                            THIS["justInTime"],
                            TRIED_SUPPLIERS
                        >

                        const supplier = {
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
                            factory: this.factory as unknown as (
                                supplies: $<MERGED_SUPPLIERS>,
                                justInTime: MapFromList<
                                    [...MERGED_JUST_IN_TIME_SUPPLIERS]
                                >
                            ) => VALUE,
                            preload: this.preload,
                            pack,
                            assemble,
                            prototype: this.prototype,
                            try: this.try,
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

                    function jitOnly<THIS>(this: THIS) {
                        // Set the flag and return this for chaining
                        return {
                            ...this,
                            _jitOnly: true
                        }
                    }

                    const productSupplier = {
                        name,
                        suppliers,
                        justInTime,
                        factory,
                        preload,
                        pack,
                        assemble,
                        try: _try,
                        jitOnly,
                        prototype,
                        _isPrototype: isPrototype,
                        _product: true as const
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
