/**
 * @beta
 */

export type Merge<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never

/**
 * Represents a resource - a simple value container that can be packed and unpacked.
 * Resources are immutable value holders that don't depend on other suppliers.
 * @beta
 */
export type Resource<NAME extends string, VALUE> = {
    /** The name/identifier of this resource */
    name: NAME
    /** Packs a new value into this resource, returning a new resource instance */
    pack: (value: VALUE) => Resource<NAME, VALUE>
    /** Unpacks and returns the current value of this resource */
    unpack(): VALUE
    /** Type marker indicating this is a resource */
    _resource: true
}

/**
 * Represents a resource supplier - a factory for creating resources of a specific constraint type.
 * Resource suppliers define the contract for what values can be packed into a resource.
 * @beta
 */
export type ResourceSupplier<NAME extends string, CONSTRAINT> = {
    /** The name/identifier of this resource supplier */
    name: NAME
    /** Packs a value into a resource, creating a new resource instance */
    pack: (value: CONSTRAINT) => Resource<NAME, CONSTRAINT>
    /** Type marker indicating this is a resource supplier */
    _resource: true
    /** The constraint type for values this supplier can pack */
    _constraint: CONSTRAINT
}

/**
 * Represents a product - a complex object that can be assembled from dependencies.
 * Products can depend on other suppliers and support reassembly with overrides.
 * @beta
 */
export type Product<NAME extends string, VALUE> = {
    /** The name/identifier of this product */
    name: NAME
    /** Unpacks and returns the current value of this product */
    unpack: () => VALUE
    /** Packs a new value into this product, returning a new product instance */
    pack: (value: VALUE) => Product<NAME, VALUE>
    /** Reassembles this product with new dependency overrides */
    reassemble: (overrides: SupplyMap) => Product<NAME, VALUE>
    /** Checks if this product depends on any of the given overrides */
    _dependsOnOneOf: (overrides: SupplyMap) => boolean
    /** Type marker indicating this is a product */
    _product: true
}
/**
 * Represents a product supplier - a factory for creating products with dependencies.
 * Product suppliers define how to assemble complex objects from their dependencies.
 * @beta
 */
export type ProductSupplier<
    NAME extends string,
    VALUE,
    SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[] = [],
    JUST_IN_TIME extends Supplier<string, any, any, any, any, any, any>[] = [],
    SUPPLIES extends $<SUPPLIERS> = $<SUPPLIERS>,
    JUST_IN_TIME_MAP extends MapFromList<[...JUST_IN_TIME]> = MapFromList<
        [...JUST_IN_TIME]
    >,
    IS_PROTOTYPE extends boolean = false
> = {
    name: NAME
    suppliers: SUPPLIERS
    justInTime: JUST_IN_TIME
    factory: (supplies: SUPPLIES, justInTime: JUST_IN_TIME_MAP) => VALUE
    assemble: (toSupply: ToSupply<SUPPLIERS>) => Product<NAME, VALUE>
    pack: (value: VALUE) => Product<NAME, VALUE>
    try: (
        ...suppliers: ProductSupplier<string, any, any, any, any, any, true>[]
    ) => ProductSupplier<NAME, VALUE, any, any, any, any, true>
    jitOnly: () => ProductSupplier<NAME, VALUE, any, any, any, any, true>
    prototype: ({
        factory,
        suppliers,
        justInTime,
        preload
    }: {
        factory: (
            supplies: $<Supplier<string, any, any, any, any, any, any>[]>,
            justInTime: MapFromList<
                Supplier<string, any, any, any, any, any, any>[]
            >
        ) => VALUE
        suppliers?: Supplier<string, any, any, any, any, any, any>[]
        justInTime?: Supplier<string, any, any, any, any, any, any>[]
        preload: boolean
    }) => ProductSupplier<
        NAME,
        VALUE,
        Supplier<string, any, any, any, any, any, any>[],
        Supplier<string, any, any, any, any, any, any>[],
        any,
        any,
        true
    >
    preload: boolean
    _isPrototype: IS_PROTOTYPE
    _product: true
}

/**
 * Union type representing any kind of supplier.
 * A supplier can be either a product supplier (complex objects with dependencies)
 * or a resource supplier (simple value containers).
 * @beta
 */
export type Supplier<
    NAME extends string,
    VALUE,
    SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[],
    JUST_IN_TIME extends Supplier<string, any, any, any, any, any, any>[],
    SUPPLIES extends $<SUPPLIERS>,
    JUST_IN_TIME_MAP extends MapFromList<[...JUST_IN_TIME]>,
    IS_PROTOTYPE extends boolean
> =
    | ProductSupplier<
          NAME,
          VALUE,
          SUPPLIERS,
          JUST_IN_TIME,
          SUPPLIES,
          JUST_IN_TIME_MAP,
          IS_PROTOTYPE
      >
    | ResourceSupplier<NAME, VALUE>

/**
 * Converts an array of objects with name properties into a map where keys are the names.
 * This is used internally to create lookup maps from supplier arrays.
 * @beta
 */
export type MapFromList<LIST extends { name: string }[]> = LIST extends []
    ? Record<never, never>
    : Merge<
          {
              [K in keyof LIST]: {
                  [NAME in LIST[K]["name"]]: LIST[K]
              }
          }[number]
      >

/**
 * A map of supplies where keys are supplier names and values are products or resources.
 * This is used for dependency resolution and reassembly operations.
 * @beta
 */
export type SupplyMap = Record<
    string,
    Product<string, any> | Resource<string, any>
>

/**
 * @beta
 */
export type SupplyMapFromSuppliers<
    SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[]
> = {
    [SUPPLIER in SUPPLIERS[number] as SUPPLIER["name"]]: SUPPLIER extends ProductSupplier<
        infer NAME,
        infer VALUE,
        any,
        any,
        any,
        any,
        any
    >
        ? Product<NAME, VALUE>
        : SUPPLIER extends ResourceSupplier<infer NAME, infer VALUE>
        ? Resource<NAME, VALUE>
        : never
}
/**
 * Creates a supplies object that provides both direct property access and function access.
 * This type represents the resolved dependencies that can be passed to factory functions.
 * @beta
 */
export type $<
    SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[]
> = (<NAME extends keyof SupplyMapFromSuppliers<SUPPLIERS>>(supplier: {
    name: NAME
}) => SupplyMapFromSuppliers<SUPPLIERS>[NAME] extends {
    unpack(): infer VALUE
}
    ? VALUE
    : never) &
    SupplyMapFromSuppliers<SUPPLIERS>

/**
 * @beta
 */
export type ExcludeSuppliersType<
    SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[],
    TYPE extends
        | ProductSupplier<string, any, any, any, any, any>
        | ResourceSupplier<string, any>
> = SUPPLIERS extends readonly [infer Head, ...infer Tail]
    ? Head extends TYPE
        ? Tail extends Supplier<string, any, any, any, any, any, any>[]
            ? ExcludeSuppliersType<Tail, TYPE>
            : []
        : Tail extends Supplier<string, any, any, any, any, any, any>[]
        ? [Head, ...ExcludeSuppliersType<Tail, TYPE>]
        : [Head]
    : []

/**
 * @beta
 */
export type TransitiveSuppliers<
    SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[]
> = SUPPLIERS extends [infer FIRST, ...infer REST]
    ? FIRST extends ProductSupplier<
          string,
          any,
          infer CHILD_SUPPLIERS,
          any,
          any,
          any,
          any
      >
        ? [
              FIRST,
              ...TransitiveSuppliers<CHILD_SUPPLIERS>,
              ...TransitiveSuppliers<
                  REST extends Supplier<string, any, any, any, any, any, any>[]
                      ? REST
                      : []
              >
          ]
        : FIRST extends ResourceSupplier<string, any>
        ? [
              FIRST,
              ...TransitiveSuppliers<
                  REST extends Supplier<string, any, any, any, any, any, any>[]
                      ? REST
                      : []
              >
          ]
        : never
    : []

/**
 * @beta
 */
export type ToSupply<
    SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[]
> = SupplyMapFromSuppliers<
    ExcludeSuppliersType<
        TransitiveSuppliers<SUPPLIERS>,
        ProductSupplier<string, any, any, any, any, any, any>
    >
>

/**
 * @beta
 */
export type MergeSuppliers<
    OLD extends Supplier<string, any, any, any, any, any, any>[],
    NEW extends ProductSupplier<string, any, any, any, any, any, true>[]
> = OLD extends [infer Head, ...infer Tail]
    ? Tail extends Supplier<string, any, any, any, any, any, any>[]
        ? Head extends { name: NEW[number]["name"] }
            ? // Head matches a NEW supplier, use the NEW one
              [
                  Extract<NEW[number], { name: Head["name"] }>,
                  ...MergeSuppliers<Tail, NEW>
              ]
            : // Head doesn't match, keep the original
              [Head, ...MergeSuppliers<Tail, NEW>]
        : Head extends { name: NEW[number]["name"] }
        ? [Extract<NEW[number], { name: Head["name"] }>]
        : [Head]
    : []

/**
 * Checks if a supplier has a circular dependency by seeing if its name appears
 * in the transitive dependencies of its own suppliers.
 * This prevents infinite loops during dependency resolution.
 * @beta
 */
export type HasCircularDependency<
    SUPPLIER extends Pick<
        ProductSupplier<string, any, any, any, any, any, any>,
        "name" | "suppliers"
    >
> = SUPPLIER["name"] extends (
    TransitiveSuppliers<SUPPLIER["suppliers"]>[number] extends infer S
        ? S extends Supplier<string, any, any, any, any, any, any>
            ? S["name"]
            : never
        : never
)
    ? true
    : false
