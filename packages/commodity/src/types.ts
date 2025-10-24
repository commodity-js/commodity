/**
 * Merges a union type into a single intersection type.
 * This utility type is used internally to combine multiple types into one cohesive type.
 * @typeParam U - The union type to merge
 * @returns An intersection type that combines all members of the union
 * @public
 */

export type Merge<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never

/**
 * Represents a resource - a simple value container that can be packed and unpacked.
 * Resources are immutable value holders that don't depend on other suppliers.
 * They provide the simplest form of dependency injection for configuration values or constants.
 *
 * @typeParam NAME - The unique identifier name for this resource
 * @typeParam VALUE - The type of value this resource contains
 * @public
 */
export type Resource<
    VALUE = any,
    SUPPLIER extends ResourceSupplier = ResourceSupplier
> = {
    /** Unpacks and returns the current value of this resource */
    unpack(): VALUE
    supplier: SUPPLIER
}

/**
 * Represents a resource supplier - a factory for creating resources of a specific constraint type.
 * Resource suppliers define the contract for what values can be packed into a resource.
 * They ensure type safety by constraining the values that can be supplied.
 *
 * @typeParam NAME - The unique identifier name for this resource supplier
 * @typeParam CONSTRAINT - The type constraint for values this supplier can accept
 * @public
 */
export type ResourceSupplier<NAME extends string = string, CONSTRAINT = any> = {
    /** The name/identifier of this resource supplier */
    name: NAME
    /** Packs a value into a resource, creating a new resource instance */
    pack: <VALUE extends CONSTRAINT>(
        value: VALUE
    ) => Resource<VALUE, ResourceSupplier<NAME, CONSTRAINT>>
    /** Type marker indicating this is a resource supplier */
    _resource: true
    /** The constraint type for values this supplier can pack */
    _constraint: CONSTRAINT
}

/**
 * Represents a product - a complex object that can be assembled from dependencies.
 * Products can depend on other suppliers and support reassembly with overrides.
 * They represent fully constructed instances with resolved dependencies.
 *
 * @typeParam NAME - The unique identifier name for this product
 * @typeParam VALUE - The type of value this product produces
 * @public
 */
export type Product<
    VALUE = any,
    SUPPLIER extends ProductSupplier = ProductSupplier,
    SUPPLIES extends (supplier: {
        name: [
            ...SUPPLIER["suppliers"],
            ...SUPPLIER["optionals"],
            ...SUPPLIER["withSuppliers"]
        ][number]["name"]
    }) => any = (supplier: {
        name: [
            ...SUPPLIER["suppliers"],
            ...SUPPLIER["optionals"],
            ...SUPPLIER["withSuppliers"]
        ][number]["name"]
    }) => unknown
> = {
    /** Unpacks and returns the current value of this product */
    unpack: () => VALUE
    /** The $ supply map for this product */
    $: SUPPLIES
    /** Reassembles this product with new dependency overrides */
    reassemble: (overrides: SupplyMap) => Product<VALUE, SUPPLIER, SUPPLIES>
    supplier: SUPPLIER
}

/**
 * Represents a product supplier - a factory for creating products with dependencies.
 * Product suppliers define how to assemble complex objects from their dependencies.
 * They support various features like lazy loading, prototypes, and assemblers.
 *
 * @typeParam NAME - The unique identifier name for this product supplier
 * @typeParam VALUE - The type of value this supplier produces
 * @typeParam SUPPLIERS - Array of suppliers this product depends on
 * @typeParam OPTIONALS - Array of optional suppliers this product may depend on
 * @typeParam ASSEMBLERS - Array of assemblers (lazy unassembled suppliers)
 * @typeParam SUPPLIES - The resolved supply map for dependencies
 * @typeParam ASSEMBLERS_MAP - Same as ASSEMBLERS, but formatted as a map with supplier names as keys.
 * @public
 */
export type ProductSupplier<
    NAME extends string = string,
    CONSTRAINT = any,
    SUPPLIERS extends Supplier[] = any[],
    OPTIONALS extends ResourceSupplier[] = ResourceSupplier[],
    ASSEMBLERS extends ProductSupplier[] = any[],
    WITH_SUPPLIERS extends ProductSupplier[] = any[],
    WITH_ASSEMBLERS extends ProductSupplier[] = any[],
    TO_SUPPLY extends ToSupply<
        SUPPLIERS,
        OPTIONALS,
        WITH_SUPPLIERS,
        WITH_ASSEMBLERS
    > = any,
    PRODUCT extends Product<CONSTRAINT, ProductSupplier, any> = any
> = {
    /** The name/identifier of this product supplier */
    name: NAME
    /** Array of suppliers this product depends on */
    suppliers: SUPPLIERS
    /** Array of optional suppliers this product may depend on */
    optionals: OPTIONALS
    /** Array of assemblers (lazy unassembled suppliers) */
    assemblers: ASSEMBLERS
    withSuppliers: WITH_SUPPLIERS
    withAssemblers: WITH_ASSEMBLERS

    team: Supplier[]
    /** Factory function that creates the product value from its dependencies */
    factory: (
        $: $<[...SUPPLIERS, ...WITH_SUPPLIERS], OPTIONALS>,
        $$: $$<[...ASSEMBLERS, ...WITH_ASSEMBLERS], OPTIONALS>
    ) => CONSTRAINT
    _build: ($: any) => PRODUCT
    /** Assembles the product by resolving dependencies */
    assemble: (supplied: TO_SUPPLY) => PRODUCT
    /** Packs a value into a product without dependencies */
    pack: <VALUE extends CONSTRAINT>(
        value: VALUE
    ) => Product<VALUE, ProductSupplier>
    /** Optional initialization function called after factory */
    init?: (value: CONSTRAINT, $: $<SUPPLIERS, OPTIONALS>) => void
    /** Whether this supplier should be lazily evaluated */
    lazy?: boolean
    /** Type marker indicating this is a product supplier */
    _product: true
    /** The constraint type for values this supplier can pack */
    _constraint: CONSTRAINT
}

/**
 * Union type representing any kind of supplier.
 * A supplier can be either a product supplier (complex objects with dependencies)
 * or a resource supplier (simple value containers).
 * This is the base type used throughout the commodity system for dependency injection.
 * @public
 */
export type Supplier = ProductSupplier | ResourceSupplier

export type BaseProductSupplier = ProductSupplier & {
    _isPrototype: false
    withSuppliers: []
    withAssemblers: []
}

export type BaseSupplier = BaseProductSupplier | ResourceSupplier

export type AsProductParameters<
    CONSTRAINT = any,
    LAZY extends boolean = false,
    SUPPLIERS extends BaseSupplier[] = BaseSupplier[],
    OPTIONALS extends ResourceSupplier[] = ResourceSupplier[],
    ASSEMBLERS extends BaseProductSupplier[] = BaseProductSupplier[]
> = {
    suppliers?: [...SUPPLIERS]
    optionals?: [...OPTIONALS]
    assemblers?: [...ASSEMBLERS]
    factory: (
        $: $<SUPPLIERS, OPTIONALS>,
        $$: $$<ASSEMBLERS, OPTIONALS>
    ) => CONSTRAINT
    init?: (value: CONSTRAINT, $: $<SUPPLIERS, OPTIONALS>) => void
    lazy?: LAZY
}

/**
 * A generic map of supplies where keys are supplier names and values are products or resources.
 * @public
 */
export type SupplyMap = Record<
    string,
    Product | Resource | (() => Product) | (() => Resource) | undefined
>

/**
 * Converts an array of suppliers and optionals into a corresponding $ supply map.
 *
 * @typeParam SUPPLIERS - Array of supplier types to convert into a supply map
 * @typeParam OPTIONALS - Array of optional supplier types to convert into a supply map
 * @returns A map where keys are supplier names and values are their assembled products/resources
 * @public
 */
export type SupplyMapFromSuppliers<
    SUPPLIERS extends Supplier[],
    OPTIONALS extends Supplier[]
> = {
    [SUPPLIER in SUPPLIERS[number] as string extends SUPPLIER["name"]
        ? never
        : SUPPLIER["name"]]: SUPPLIER extends ProductSupplier
        ? Product<
              SUPPLIER["_constraint"],
              ProductSupplier<SUPPLIER["name"], SUPPLIER["_constraint"]>
          >
        : SUPPLIER extends ResourceSupplier
        ? Resource<
              SUPPLIER["_constraint"],
              ResourceSupplier<SUPPLIER["name"], SUPPLIER["_constraint"]>
          >
        : never
} & {
    [OPTIONAL in OPTIONALS[number] as string extends OPTIONAL["name"]
        ? never
        : OPTIONAL["name"]]?: OPTIONAL extends ProductSupplier
        ? Product<
              OPTIONAL["_constraint"],
              ProductSupplier<OPTIONAL["name"], OPTIONAL["_constraint"]>
          >
        : OPTIONAL extends ResourceSupplier
        ? Resource<
              OPTIONAL["_constraint"],
              ResourceSupplier<OPTIONAL["name"], OPTIONAL["_constraint"]>
          >
        : never
}
/**
 * Adds callable access to SupplyMapFromSuppliers type defined above.
 * This type represents the resolved dependencies that can be passed to factory functions.
 * It enables accessing dependencies either as properties or by calling with a supplier object.
 *
 * @typeParam SUPPLIERS - Array of suppliers to create the $ object from
 * @returns A callable object that provides both property access and function call access to supplies
 * @public
 */
export type $<SUPPLIERS extends Supplier[], OPTIONALS extends Supplier[]> = {
    keys: (keyof SupplyMapFromSuppliers<SUPPLIERS, OPTIONALS>)[]
} & (<
    SUPPLIER extends {
        name: keyof SupplyMapFromSuppliers<SUPPLIERS, OPTIONALS>
    }
>(
    supplier: SUPPLIER
) => SupplyMapFromSuppliers<SUPPLIERS, OPTIONALS>[SUPPLIER["name"]])

export type $$<
    ASSEMBLERS extends ProductSupplier[],
    OPTIONALS extends ResourceSupplier[]
> = <ASSEMBLER extends ASSEMBLERS[number] | OPTIONALS[number]>(
    assembler: ASSEMBLER
) => ASSEMBLER

/**
 * Recursively filters out suppliers of a specific type from a supplier array.
 * This is used internally to separate product suppliers from resource suppliers
 * during dependency resolution.
 *
 * @typeParam SUPPLIERS - The array of suppliers to filter
 * @typeParam TYPE - The supplier type to exclude (ProductSupplier or ResourceSupplier)
 * @returns A new array with the specified supplier type removed
 * @public
 */
export type ExcludeSuppliersType<
    SUPPLIERS extends Supplier[],
    TYPE extends Supplier
> = SUPPLIERS extends readonly [infer Head, ...infer Tail]
    ? Head extends TYPE
        ? Tail extends Supplier[]
            ? ExcludeSuppliersType<Tail, TYPE>
            : []
        : Tail extends Supplier[]
        ? [Head, ...ExcludeSuppliersType<Tail, TYPE>]
        : [Head]
    : []

/**
 * Recursively collects all transitive dependencies of a supplier array.
 * This type walks through the dependency tree, collecting each supplier and all of its
 * nested dependencies into a flattened array. This is essential for understanding
 * the complete dependency graph.
 *
 * @typeParam SUPPLIERS - The array of suppliers to collect transitive dependencies from
 * @returns A flattened array containing all suppliers and their transitive dependencies
 * @public
 */
export type TransitiveSuppliers<SUPPLIERS extends Supplier[]> =
    SUPPLIERS extends [infer FIRST, ...infer REST]
        ? FIRST extends ProductSupplier
            ? [
                  FIRST,
                  ...TransitiveSuppliers<FIRST["suppliers"]>,
                  ...TransitiveSuppliers<REST extends Supplier[] ? REST : []>
              ]
            : FIRST extends ResourceSupplier
            ? [
                  FIRST,
                  ...TransitiveSuppliers<REST extends Supplier[] ? REST : []>
              ]
            : never
        : []

export type Optionals<SUPPLIERS extends Supplier[]> = SUPPLIERS extends [
    infer FIRST,
    ...infer REST
]
    ? FIRST extends ProductSupplier
        ? [
              ...FIRST["optionals"],
              ...Optionals<REST extends Supplier[] ? REST : []>
          ]
        : FIRST extends ResourceSupplier
        ? Optionals<REST extends Supplier[] ? REST : []>
        : never
    : []

/**
 * Determines which suppliers need to be supplied externally when assembling a product.
 * This type computes the set of resource suppliers that must be provided because they
 * cannot be automatically assembled. It excludes product suppliers (which can be autowired)
 * and returns only the resource suppliers from the transitive dependency tree. Resource needed
 * by assemblers can be omitted, as they'll be provided later, but withAssemblers resources must be provided
 * now as the resources provided later might not be compatible anymore.
 *
 * @typeParam SUPPLIERS - The array of suppliers to analyze
 * @returns A supply map of only the resource suppliers that must be provided
 * @public
 */
export type ToSupply<
    SUPPLIERS extends Supplier[],
    OPTIONALS extends ResourceSupplier[],
    WITH_SUPPLIERS extends ProductSupplier[],
    WITH_ASSEMBLERS extends ProductSupplier[]
> = SupplyMapFromSuppliers<
    ExcludeSuppliersType<
        TransitiveSuppliers<
            [...MergeSuppliers<SUPPLIERS, WITH_SUPPLIERS>, ...WITH_ASSEMBLERS]
        >,
        ProductSupplier
    >,
    [
        ...OPTIONALS,
        ...Optionals<
            ExcludeSuppliersType<
                TransitiveSuppliers<
                    [
                        ...MergeSuppliers<SUPPLIERS, WITH_SUPPLIERS>,
                        ...WITH_ASSEMBLERS
                    ]
                >,
                ResourceSupplier
            >
        >,
        ...ExcludeSuppliersType<
            TransitiveSuppliers<
                [
                    ...MergeSuppliers<SUPPLIERS, WITH_SUPPLIERS>,
                    ...WITH_ASSEMBLERS
                ]
            >,
            ResourceSupplier
        >
    ]
>

/**
 * Filters out suppliers from OLD that have matching names in NEW.
 * This is used by the `with` method to remove old suppliers before adding new ones.
 *
 * @typeParam OLD - The original array of suppliers to filter
 * @typeParam NEW - The array of suppliers whose names should be removed from OLD
 * @returns OLD suppliers without matching names in NEW
 * @public
 */
export type FilterSuppliers<
    OLD extends Supplier[],
    NEW extends ProductSupplier[]
> = OLD extends [infer Head, ...infer Tail]
    ? Tail extends Supplier[]
        ? Head extends { name: NEW[number]["name"] }
            ? FilterSuppliers<Tail, NEW>
            : [Head, ...FilterSuppliers<Tail, NEW>]
        : Head extends { name: NEW[number]["name"] }
        ? []
        : [Head]
    : []

export type MergeSuppliers<
    OLD extends Supplier[],
    NEW extends ProductSupplier[]
> = [...FilterSuppliers<OLD, NEW>, ...NEW]

/**
 * Checks if a supplier has a circular dependency by seeing if its name appears
 * in the transitive dependencies of its own suppliers.
 * @public
 */
export type HasCircularDependency<
    SUPPLIER extends Pick<
        ProductSupplier,
        | "name"
        | "suppliers"
        | "optionals"
        | "assemblers"
        | "withSuppliers"
        | "withAssemblers"
    >
> = SUPPLIER["name"] extends (
    TransitiveSuppliers<
        [
            ...SUPPLIER["suppliers"],
            ...SUPPLIER["optionals"],
            ...SUPPLIER["assemblers"],
            ...SUPPLIER["withSuppliers"],
            ...SUPPLIER["withAssemblers"]
        ]
    >[number] extends infer S
        ? S extends Supplier
            ? S["name"]
            : never
        : never
)
    ? true
    : false

export type CircularDependencyError = {
    ERROR: "Circular dependency detected"
}
