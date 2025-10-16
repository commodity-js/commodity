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
    NAME extends string = string,
    VALUE = any,
    CONSTRAINT = VALUE
> = {
    /** The name/identifier of this resource */
    name: NAME
    /** Packs a new value into this resource, returning a new resource instance */
    pack: <NEW_VALUE extends CONSTRAINT>(
        value: NEW_VALUE
    ) => Resource<NAME, NEW_VALUE, CONSTRAINT>
    /** Unpacks and returns the current value of this resource */
    unpack(): VALUE
    /** Type marker indicating this is a resource */
    _resource: true
    /** The constraint type for values this resource can pack */
    _constraint: CONSTRAINT
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
export type ResourceSupplier<
    NAME extends string = string,
    VALUE = any,
    CONSTRAINT = VALUE
> = {
    /** The name/identifier of this resource supplier */
    name: NAME
    /** Packs a value into a resource, creating a new resource instance */
    pack: <NEW_VALUE extends CONSTRAINT>(
        value: NEW_VALUE
    ) => Resource<NAME, NEW_VALUE, CONSTRAINT>
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
    NAME extends string = string,
    VALUE extends CONSTRAINT = any,
    CONSTRAINT = VALUE,
    SUPPLIES = unknown
> = {
    /** The name/identifier of this product */
    name: NAME
    supplies: SUPPLIES
    /** Packs a new value into this product, returning a new product instance */
    pack: <NEW_VALUE extends CONSTRAINT>(
        value: NEW_VALUE
    ) => Product<NAME, NEW_VALUE, CONSTRAINT>
    /** Unpacks and returns the current value of this product */
    unpack: () => VALUE
    /** Reassembles this product with new dependency overrides */
    reassemble: (
        overrides: SupplyMap
    ) => Product<NAME, VALUE, CONSTRAINT, SUPPLIES>
    /** Checks if this product depends on any of the given overrides */
    _dependsOnOneOf: (overrides: SupplyMap) => boolean
    _constraint: CONSTRAINT
    /** Type marker indicating this is a product */
    _product: true
}

export type ProductSupplierConfig<
    VALUE = any,
    SUPPLIERS extends BaseSupplier[] = BaseSupplier[],
    OPTIONALS extends ResourceSupplier[] = ResourceSupplier[],
    ASSEMBLERS extends BaseProductSupplier[] = BaseProductSupplier[]
> = {
    suppliers?: [...SUPPLIERS]
    optionals?: [...OPTIONALS]
    assemblers?: [...ASSEMBLERS]
    factory: (
        $: $<SUPPLIERS, OPTIONALS>,
        $$: MapFromList<[...ASSEMBLERS, ...OPTIONALS]>
    ) => VALUE
    init?: (value: VALUE, $: $<SUPPLIERS, OPTIONALS>) => void
    lazy?: boolean
    _allowPrototypes?: never
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
    VALUE extends CONSTRAINT = any,
    CONSTRAINT = VALUE,
    SUPPLIERS extends BaseSupplier[] = BaseSupplier[],
    OPTIONALS extends ResourceSupplier[] = ResourceSupplier[],
    ASSEMBLERS extends BaseProductSupplier[] = any[],
    $_MAP extends $<SUPPLIERS, OPTIONALS> = any,
    TO_SUPPLY extends ToSupply<SUPPLIERS, OPTIONALS> = any,
    $$_MAP extends MapFromList<[...ASSEMBLERS, ...OPTIONALS]> = any
> = {
    /** The name/identifier of this product supplier */
    name: NAME
    /** Array of suppliers this product depends on */
    suppliers: SUPPLIERS
    /** Array of optional suppliers this product may depend on */
    optionals: OPTIONALS
    /** Array of assemblers (lazy unassembled suppliers) */
    assemblers: ASSEMBLERS
    /** Factory function that creates the product value from its dependencies */
    factory: ($: $_MAP, $$: $$_MAP) => VALUE
    /** Assembles the product by resolving dependencies */
    assemble: (toSupply: TO_SUPPLY) => Product<NAME, VALUE, CONSTRAINT>
    /** Packs a value into a product without dependencies */
    pack: <NEW_VALUE extends CONSTRAINT>(
        value: NEW_VALUE
    ) => Product<NAME, NEW_VALUE, CONSTRAINT>
    /** Tries alternative implementations of suppliers */
    /** Creates a prototype variant with different implementation */
    prototype?: ({
        factory,
        suppliers,
        assemblers,
        init,
        lazy
    }: {
        factory: ($: $_MAP, $$: $$_MAP) => VALUE
        suppliers?: BaseSupplier[]
        optionals?: ResourceSupplier[]
        assemblers?: BaseProductSupplier[]
        init?: (value: VALUE, $: $_MAP) => void
        lazy?: boolean
    }) => PrototypeSupplier
    with: (
        suppliers: BaseProductSupplier[],
        assemblers?: BaseProductSupplier[]
    ) => CompositeSupplier
    /** Optional initialization function called after factory */
    init?: (value: VALUE, $: $_MAP) => void
    /** Whether this supplier should be lazily evaluated */
    lazy?: boolean
    /** Type marker indicating this is a product supplier */
    _product: true
    /** The constraint type for values this supplier can pack */
    _constraint: CONSTRAINT
}

export type BaseProductSupplier<PS extends ProductSupplier = ProductSupplier> =
    Omit<PS, "_isPrototype" | "_isComposite" | "_isCompatible"> & {
        _isPrototype: false
        _isComposite: false
        _isCompatible: true
    }

export type PrototypeSupplier<
    IS_COMPATIBLE extends boolean = boolean,
    BASE = ProductSupplier
> = Omit<
    BASE,
    "_isPrototype" | "_isComposite" | "_isCompatible" | "prototype"
> & {
    _isPrototype: true
    _isCompatible: IS_COMPATIBLE
    _isComposite: false
}

export type CompositeSupplier<
    BASE extends ProductSupplier = ProductSupplier,
    WITH_SUPPLIERS extends (BaseProductSupplier | PrototypeSupplier)[] = (
        | BaseProductSupplier
        | PrototypeSupplier
    )[]
> = Omit<
    BASE,
    "prototype" | "_isPrototype" | "_isComposite" | "_isCompatible" | "assemble"
> & {
    _isPrototype: false
    _isComposite: true
    _isCompatible: false
    assemble: (
        toSupply: ToSupply<
            MergeSuppliers<BASE["suppliers"], WITH_SUPPLIERS>,
            BASE["optionals"]
        >
    ) => Product<
        BASE["name"],
        ReturnType<BASE["factory"]>,
        BASE["_constraint"],
        $<MergeSuppliers<BASE["suppliers"], WITH_SUPPLIERS>, BASE["optionals"]>
    >
}

/**
 * Union type representing any kind of supplier.
 * A supplier can be either a product supplier (complex objects with dependencies)
 * or a resource supplier (simple value containers).
 * This is the base type used throughout the commodity system for dependency injection.
 *
 * @typeParam NAME - The unique identifier name for this supplier
 * @typeParam VALUE - The type of value this supplier provides
 * @typeParam SUPPLIERS - Array of suppliers this depends on (for product suppliers)
 * @typeParam OPTIONALS - Array of optional suppliers this may depend on (for product suppliers)
 * @typeParam ASSEMBLERS - Array of assemblers (for product suppliers)
 * @typeParam SUPPLIES - The resolved supply map (for product suppliers)
 * @typeParam ASSEMBLERS_MAP - The map of assemblers (for product suppliers)
 * @public
 */
export type Supplier<
    NAME extends string = string,
    VALUE extends CONSTRAINT = any,
    CONSTRAINT = VALUE,
    SUPPLIERS extends BaseSupplier[] = any[],
    OPTIONALS extends ResourceSupplier[] = any[],
    ASSEMBLERS extends BaseProductSupplier[] = any[]
> =
    | ProductSupplier<NAME, VALUE, CONSTRAINT, SUPPLIERS, OPTIONALS, ASSEMBLERS>
    | ResourceSupplier<NAME, VALUE, CONSTRAINT>

export type BaseSupplier<SUPPLIER extends Supplier = Supplier> =
    SUPPLIER extends ResourceSupplier
        ? SUPPLIER
        : SUPPLIER & {
              _isPrototype: false
              _isComposite: false
              _isCompatible: true
          }

/**
 * Converts an array of objects with name properties into a map where keys are the names.
 * This is used internally to create lookup maps from supplier arrays for type-safe access.
 *
 * @typeParam LIST - An array of objects that have a `name` property
 * @returns A map type where each key is a name from the list and values are the corresponding objects
 * @public
 */
export type MapFromList<LIST extends { name: string }[]> = LIST extends []
    ? Record<string, never>
    : Merge<
          {
              [K in keyof LIST]: {
                  [NAME in LIST[K]["name"]]: LIST[K]
              }
          }[number]
      >

/**
 * A generic map of supplies where keys are supplier names and values are products or resources.
 *
 * @public
 */
export type SupplyMap = Record<string, Product | Resource | undefined>

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
        : SUPPLIER["name"]]: SUPPLIER extends ProductSupplier<
        infer NAME,
        infer VALUE
    >
        ? Product<NAME, VALUE>
        : SUPPLIER extends ResourceSupplier<infer NAME, infer VALUE>
        ? Resource<NAME, VALUE>
        : never
} & {
    [OPTIONAL in OPTIONALS[number] as string extends OPTIONAL["name"]
        ? never
        : OPTIONAL["name"]]?: OPTIONAL extends ResourceSupplier<
        infer NAME,
        infer VALUE
    >
        ? Resource<NAME, VALUE>
        : OPTIONAL extends ProductSupplier<infer NAME, infer VALUE>
        ? Product<NAME, VALUE>
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
export type $<SUPPLIERS extends Supplier[], OPTIONALS extends Supplier[]> = (<
    NAME extends keyof SupplyMapFromSuppliers<SUPPLIERS, OPTIONALS>
>(supplier: {
    name: NAME
}) => SupplyMapFromSuppliers<SUPPLIERS, OPTIONALS>[NAME] extends {
    unpack(): infer VALUE
}
    ? VALUE
    : SupplyMapFromSuppliers<SUPPLIERS, OPTIONALS>[NAME] extends
          | {
                unpack(): infer VALUE
            }
          | undefined
    ? VALUE | undefined
    : never) &
    SupplyMapFromSuppliers<SUPPLIERS, OPTIONALS>

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
        ? FIRST extends ProductSupplier<string, any, any, infer CHILD_SUPPLIERS>
            ? [
                  FIRST,
                  ...TransitiveSuppliers<CHILD_SUPPLIERS>,
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
 * Determines which suppliers need to be supplied externally when assembling a product.
 * This type computes the set of resource suppliers that must be provided because they
 * cannot be automatically assembled. It excludes product suppliers (which can be assembled)
 * and returns only the resource suppliers from the transitive dependency tree.
 *
 * @typeParam SUPPLIERS - The array of suppliers to analyze
 * @returns A supply map of only the resource suppliers that must be provided
 * @public
 */
export type ToSupply<
    SUPPLIERS extends Supplier[],
    OPTIONALS extends Supplier[]
> = SupplyMapFromSuppliers<
    ExcludeSuppliersType<TransitiveSuppliers<SUPPLIERS>, ProductSupplier>,
    [...TransitiveSuppliers<SUPPLIERS>, ...OPTIONALS]
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
    SUPPLIER extends { name: string; suppliers: any[] }
> = SUPPLIER["name"] extends (
    TransitiveSuppliers<SUPPLIER["suppliers"]>[number] extends infer S
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
export type IsCompatible<
    PROTOTYPE extends ProductSupplier,
    ORIGINAL extends ProductSupplier
> = ToSupply<PROTOTYPE["suppliers"], PROTOTYPE["optionals"]> extends ToSupply<
    ORIGINAL["suppliers"],
    ORIGINAL["optionals"]
>
    ? true
    : false
