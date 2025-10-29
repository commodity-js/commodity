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
    _: {
        /** Type marker indicating this is a resource supplier */
        resource: true
        /** The constraint type for values this supplier can pack */
        constraint: CONSTRAINT
    }
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
    SUPPLIER extends BaseProductSupplier = BaseProductSupplier,
    SUPPLIES = unknown
> = {
    /** Unpacks and returns the current value of this product */
    unpack: () => VALUE
    $: SUPPLIES
    /** Reassembles this product with new dependency overrides */
    reassemble: <
        HIRED_SUPPLIERS extends ProductSupplier[] = [],
        HIRED_ASSEMBLERS extends ProductSupplier[] = []
    >(
        overrides: SupplyMap,
        hiredSuppliers?: [...HIRED_SUPPLIERS],
        hiredAssemblers?: [...HIRED_ASSEMBLERS]
    ) => Product<VALUE, SUPPLIER, $<[SUPPLIER, ...HIRED_SUPPLIERS], []>>
    supplier: SUPPLIER
}

export type BaseProductSupplier<
    NAME extends string = string,
    CONSTRAINT = any
> = {
    name: NAME
    pack: <VALUE extends CONSTRAINT>(
        value: VALUE
    ) => Product<VALUE, ProductSupplier<NAME, CONSTRAINT>>
    _: {
        constraint: CONSTRAINT
        product: true
    }
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
    SUPPLIERS extends MainSupplier[] = any[],
    OPTIONALS extends ResourceSupplier[] = ResourceSupplier[],
    ASSEMBLERS extends MainProductSupplier[] = any[],
    HIRED_SUPPLIERS extends ProductSupplier[] = any[],
    HIRED_ASSEMBLERS extends ProductSupplier[] = any[],
    TEAM extends Supplier[] = any[]
> = BaseProductSupplier<NAME, CONSTRAINT> & {
    /** Array of suppliers this product depends on */
    suppliers: SUPPLIERS
    /** Array of optional suppliers this product may depend on */
    optionals: OPTIONALS
    /** Array of assemblers (lazy unassembled suppliers) */
    assemblers: ASSEMBLERS
    hiredSuppliers: HIRED_SUPPLIERS
    hiredAssemblers: HIRED_ASSEMBLERS

    team: TEAM
    /** Factory function that creates the product value from its dependencies */
    factory: (
        $: $<[...SUPPLIERS, ...HIRED_SUPPLIERS], OPTIONALS>,
        $$: $$<[...ASSEMBLERS, ...HIRED_ASSEMBLERS], OPTIONALS>
    ) => CONSTRAINT
    /** Assembles the product by resolving dependencies */
    assemble: (
        supplied: ToSupply<
            SUPPLIERS,
            OPTIONALS,
            HIRED_SUPPLIERS,
            HIRED_ASSEMBLERS
        >
    ) => Product<CONSTRAINT, ProductSupplier>
    /** Optional initialization function called after factory */
    init?: (value: CONSTRAINT, $: $<SUPPLIERS, OPTIONALS>) => void
    /** Whether this supplier should be lazily evaluated */
    lazy?: boolean
    _: {
        build: (...args: any[]) => Product<CONSTRAINT, ProductSupplier>
    }
}

/**
 * Union type representing any kind of supplier.
 * A supplier can be either a product supplier (complex objects with dependencies)
 * or a resource supplier (simple value containers).
 * This is the base type used throughout the architype system for dependency injection.
 * @public
 */
export type Supplier = ProductSupplier | ResourceSupplier
export type BaseSupplier = BaseProductSupplier | ResourceSupplier

export type MainProductSupplier = ProductSupplier & {
    _: {
        isMock: false
    }
    hiredSuppliers: []
    hiredAssemblers: []
}

export type MainSupplier = MainProductSupplier | ResourceSupplier

export type AsProductParameters<
    CONSTRAINT = any,
    LAZY extends boolean = false,
    SUPPLIERS extends MainSupplier[] = MainSupplier[],
    OPTIONALS extends ResourceSupplier[] = ResourceSupplier[],
    ASSEMBLERS extends ProductSupplier[] = ProductSupplier[]
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
export type SupplyMap<
    SUPPLIER extends BaseProductSupplier = BaseProductSupplier
> = Record<
    string,
    | Product<any, SUPPLIER>
    | Resource
    | (() => Product<any, SUPPLIER>)
    | (() => Resource)
    | undefined
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
    SUPPLIERS extends BaseSupplier[],
    OPTIONALS extends BaseSupplier[],
    WIDE extends boolean = true
> = {
    [SUPPLIER in SUPPLIERS[number] as string extends SUPPLIER["name"]
        ? never
        : SUPPLIER["name"]]: SUPPLIER extends ProductSupplier
        ? Product<
              SUPPLIER["_"]["constraint"],
              WIDE extends true
                  ? BaseProductSupplier<
                        SUPPLIER["name"],
                        SUPPLIER["_"]["constraint"]
                    >
                  : SUPPLIER
          >
        : SUPPLIER extends ResourceSupplier
        ? Resource<SUPPLIER["_"]["constraint"], SUPPLIER>
        : never
} & {
    [OPTIONAL in OPTIONALS[number] as string extends OPTIONAL["name"]
        ? never
        : OPTIONAL["name"]]?: OPTIONAL extends ProductSupplier
        ? Product<
              OPTIONAL["_"]["constraint"],
              WIDE extends true
                  ? BaseProductSupplier<
                        OPTIONAL["name"],
                        OPTIONAL["_"]["constraint"]
                    >
                  : OPTIONAL
          >
        : OPTIONAL extends ResourceSupplier
        ? Resource<OPTIONAL["_"]["constraint"], OPTIONAL>
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
export type $<
    SUPPLIERS extends BaseSupplier[],
    OPTIONALS extends BaseSupplier[],
    WIDE extends boolean = true
> = {
    keys: (keyof SupplyMapFromSuppliers<SUPPLIERS, OPTIONALS> & string)[]
} & (<
    SUPPLIER extends {
        name: keyof SupplyMapFromSuppliers<SUPPLIERS, OPTIONALS> & string
    }
>(
    supplier: SUPPLIER
) => SupplyMapFromSuppliers<SUPPLIERS, OPTIONALS, WIDE>[SUPPLIER["name"]])

/**
 * Assembler accessor type used in factory functions for lazy dependency assembly.
 * Unlike $, which provides fully assembled products, $$ provides unassembled suppliers
 * that can be assembled on-demand with custom supplies. This enables lazy evaluation
 * and dynamic dependency injection within a product's factory.
 *
 * @typeParam ASSEMBLERS - Array of product suppliers available as assemblers
 * @typeParam OPTIONALS - Array of optional resource suppliers
 * @returns A function that takes an assembler and returns it with an assemble method
 * @public
 */
export type $$<
    ASSEMBLERS extends ProductSupplier[],
    OPTIONALS extends ResourceSupplier[]
> = <ASSEMBLER extends ASSEMBLERS[number] | OPTIONALS[number]>(
    assembler: ASSEMBLER
) => BaseProductSupplier<ASSEMBLER["name"], ASSEMBLER["_"]["constraint"]> &
    (ASSEMBLER extends ProductSupplier
        ? {
              hire: <
                  HIRED_SUPPLIERS extends BaseProductSupplier[],
                  HIRED_ASSEMBLERS extends BaseProductSupplier[]
              >(
                  hiredSuppliers: [...HIRED_SUPPLIERS],
                  hiredAssemblers?: [...HIRED_ASSEMBLERS]
              ) => {
                  assemble: (
                      supplied: ToSupply<
                          ASSEMBLER["suppliers"],
                          ASSEMBLER["optionals"],
                          ASSEMBLER["hiredSuppliers"],
                          ASSEMBLER["hiredAssemblers"]
                      >
                  ) => Product<
                      ASSEMBLER["_"]["constraint"],
                      BaseProductSupplier<
                          ASSEMBLER["name"],
                          ASSEMBLER["_"]["constraint"]
                      >,
                      $<[ASSEMBLER, ...HIRED_SUPPLIERS], []>
                  >
              }
              assemble: (
                  supplied: ToSupply<
                      ASSEMBLER["suppliers"],
                      ASSEMBLER["optionals"],
                      ASSEMBLER["hiredSuppliers"],
                      ASSEMBLER["hiredAssemblers"]
                  >
              ) => Product<
                  ASSEMBLER["_"]["constraint"],
                  BaseProductSupplier<
                      ASSEMBLER["name"],
                      ASSEMBLER["_"]["constraint"]
                  >
              >
          }
        : ASSEMBLER)

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
> = SUPPLIERS extends [infer Head, ...infer Tail]
    ? Head extends TYPE
        ? Tail extends Supplier[]
            ? ExcludeSuppliersType<Tail, TYPE>
            : []
        : Tail extends Supplier[]
        ? [Head, ...ExcludeSuppliersType<Tail, TYPE>]
        : [Head]
    : []

/**
 * Recursively collects all transitive dependencies of a supplier array into a team.
 * This type walks through the dependency tree, collecting each supplier and all of its
 * nested dependencies into a flattened array. This forms the "team" - the complete
 * set of suppliers needed to assemble a product. The runtime equivalent is the `team()` utility.
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

/**
 * Recursively collects all optional suppliers from a supplier array.
 * This type walks through the dependency tree and accumulates all optional resource
 * suppliers declared by product suppliers in the tree.
 *
 * @typeParam SUPPLIERS - The array of suppliers to collect optionals from
 * @returns A flattened array of all optional resource suppliers
 * @internal
 */
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
 * cannot be automatically assembled. It excludes product suppliers (which are autowired)
 * and returns only the resource suppliers from the transitive dependency tree.
 * Resources are merged from suppliers, hired suppliers, and hired assemblers.
 *
 * @typeParam SUPPLIERS - The array of suppliers to analyze
 * @typeParam OPTIONALS - The array of optional resource suppliers
 * @typeParam HIRED_SUPPLIERS - The array of hired suppliers
 * @typeParam HIRED_ASSEMBLERS - The array of hired assemblers
 * @returns A supply map of only the resource suppliers that must be provided
 * @public
 */
export type ToSupply<
    SUPPLIERS extends Supplier[],
    OPTIONALS extends ResourceSupplier[],
    HIRED_SUPPLIERS extends ProductSupplier[],
    HIRED_ASSEMBLERS extends ProductSupplier[]
> = SupplyMapFromSuppliers<
    ExcludeSuppliersType<
        TransitiveSuppliers<
            [...MergeSuppliers<SUPPLIERS, HIRED_SUPPLIERS>, ...HIRED_ASSEMBLERS]
        >,
        ProductSupplier
    >,
    [
        ...OPTIONALS,
        ...Optionals<
            ExcludeSuppliersType<
                TransitiveSuppliers<
                    [
                        ...MergeSuppliers<SUPPLIERS, HIRED_SUPPLIERS>,
                        ...HIRED_ASSEMBLERS
                    ]
                >,
                ResourceSupplier
            >
        >,
        ...ExcludeSuppliersType<
            TransitiveSuppliers<
                [
                    ...MergeSuppliers<SUPPLIERS, HIRED_SUPPLIERS>,
                    ...HIRED_ASSEMBLERS
                ]
            >,
            ResourceSupplier
        >
    ]
>

/**
 * Filters out suppliers from OLD that have matching names in NEW.
 * This is used by the `hire` method to remove old suppliers before adding new ones,
 * allowing hired suppliers to override existing suppliers in the team.
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

/**
 * Merges two supplier arrays by filtering out OLD suppliers that match NEW supplier names,
 * then appending NEW suppliers. This ensures hired suppliers override existing ones.
 * Used internally by the `hire` method to create the merged team.
 *
 * @typeParam OLD - The original array of suppliers
 * @typeParam NEW - The array of new suppliers to merge in (overriding matching names)
 * @returns A merged array with NEW suppliers replacing matching OLD suppliers
 * @public
 */
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
        | "hiredSuppliers"
        | "hiredAssemblers"
    >
> = SUPPLIER["name"] extends (
    TransitiveSuppliers<
        [
            ...SUPPLIER["suppliers"],
            ...SUPPLIER["optionals"],
            ...SUPPLIER["assemblers"],
            ...SUPPLIER["hiredSuppliers"],
            ...SUPPLIER["hiredAssemblers"]
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
