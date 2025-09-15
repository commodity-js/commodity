export type Merge<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never

export type Resource<NAME extends string, VALUE> = {
    name: NAME
    pack: (value: VALUE) => Resource<NAME, VALUE>
    unpack(): VALUE
    _resource: true
}

export type ResourceSupplier<NAME extends string, CONSTRAINT> = {
    name: NAME
    pack: (value: CONSTRAINT) => Resource<NAME, CONSTRAINT>
    _resource: true
    _constraint: CONSTRAINT
}

export type Product<NAME extends string, VALUE> = {
    name: NAME
    unpack: () => VALUE
    pack: (value: VALUE) => Product<NAME, VALUE>
    reassemble: (overrides: SupplyMap) => Product<NAME, VALUE>
    _dependsOnOneOf: (overrides: SupplyMap) => boolean
    _product: true
}
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

export type MapFromList<LIST extends { name: string }[]> = LIST extends []
    ? Record<never, never>
    : Merge<
          {
              [K in keyof LIST]: {
                  [NAME in LIST[K]["name"]]: LIST[K]
              }
          }[number]
      >

export type SupplyMap = Record<
    string,
    Product<string, any> | Resource<string, any>
>

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

export type ToSupply<
    SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[]
> = SupplyMapFromSuppliers<
    ExcludeSuppliersType<
        TransitiveSuppliers<SUPPLIERS>,
        ProductSupplier<string, any, any, any, any, any, any>
    >
>

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
