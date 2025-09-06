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
    narrow: <VALUE>() => ResourceSupplier<string, CONSTRAINT & VALUE>
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
    SUPPLIERS extends Supplier<string, any, any, any, any>[] = [],
    SUPPLIES extends $<SUPPLIERS> = $<SUPPLIERS>,
    PROTOTYPE extends boolean = false
> = {
    name: NAME
    suppliers: SUPPLIERS
    factory: (supplies: SUPPLIES) => VALUE
    assemble: (toSupply: ToSupply<SUPPLIERS>) => Product<NAME, VALUE>
    pack: (value: VALUE) => Product<NAME, VALUE>
    try: (
        ...prototypeSuppliers: ProductSupplier<string, any, any, any, true>[]
    ) => ProductSupplier<NAME, VALUE, any, any, true>
    innovate: ({
        factory,
        suppliers,
        preload
    }: {
        factory: (supplies: $<Supplier<string, any, any, any, any>[]>) => VALUE
        suppliers: Supplier<string, any, any, any, any>[]
        preload: boolean
    }) => ProductSupplier<
        NAME,
        VALUE,
        Supplier<string, any, any, any, any>[],
        any,
        true
    >
    preload: boolean
    _prototype: PROTOTYPE
    _product: true
}

export type Supplier<
    NAME extends string,
    VALUE,
    SUPPLIERS extends Supplier<string, any, any, any, any>[],
    SUPPLIES extends $<SUPPLIERS>,
    PROTOTYPE extends boolean
> =
    | ProductSupplier<NAME, VALUE, SUPPLIERS, SUPPLIES, PROTOTYPE>
    | ResourceSupplier<NAME, VALUE>

export type SupplyMapFromList<
    SUPPLIESLIST extends (Resource<any, any> | Product<any, any>)[]
> = SUPPLIESLIST extends []
    ? Record<never, never>
    : Merge<
          {
              [K in keyof SUPPLIESLIST]: {
                  [NAME in SUPPLIESLIST[K]["name"]]: SUPPLIESLIST[K]
              }
          }[number]
      >

export type SupplyMap = Record<
    string,
    Product<string, any> | Resource<string, any>
>
export type SupplyMapFromSuppliers<
    SUPPLIERS extends Supplier<string, any, any, any, any>[]
> = {
    [SUPPLIER in SUPPLIERS[number] as SUPPLIER["name"]]: SUPPLIER extends ProductSupplier<
        infer NAME,
        infer VALUE,
        any,
        any
    >
        ? Product<NAME, VALUE>
        : SUPPLIER extends ResourceSupplier<infer NAME, infer VALUE>
        ? Resource<NAME, VALUE>
        : never
}
export type $<SUPPLIERS extends Supplier<string, any, any, any, any>[]> = (<
    NAME extends keyof SupplyMapFromSuppliers<SUPPLIERS>
>(
    name:
        | NAME
        | {
              name: NAME
          }
) => SupplyMapFromSuppliers<SUPPLIERS>[NAME] extends {
    unpack(): infer VALUE
}
    ? VALUE
    : never) &
    SupplyMapFromSuppliers<SUPPLIERS>

export type Team<SUPPLIERS extends Supplier<string, any, any, any, any>[]> =
    SUPPLIERS extends readonly [infer Head, ...infer Tail]
        ? Head extends ProductSupplier<string, any, any, any>
            ? Tail extends Supplier<string, any, any, any, any>[]
                ? [Head, ...Team<Tail>]
                : [Head]
            : Tail extends Supplier<string, any, any, any, any>[]
            ? Team<Tail>
            : []
        : []
export type ToSupplyList<
    SUPPLIERS extends Supplier<string, any, any, any, any>[]
> = SUPPLIERS extends [infer FIRST, ...infer REST]
    ? FIRST extends ProductSupplier<string, any, infer CHILD_SUPPLIERS, any>
        ? [
              ...ToSupplyList<CHILD_SUPPLIERS>,
              ...ToSupplyList<
                  REST extends Supplier<string, any, any, any, any>[]
                      ? REST
                      : []
              >
          ]
        : FIRST extends ResourceSupplier<string, any>
        ? [
              FIRST,
              ...ToSupplyList<
                  REST extends Supplier<string, any, any, any, any>[]
                      ? REST
                      : []
              >
          ]
        : never
    : []

export type ToSupply<SUPPLIERS extends Supplier<string, any, any, any, any>[]> =
    SupplyMapFromSuppliers<ToSupplyList<SUPPLIERS>>

export type TrySuppliers<
    OLD extends Supplier<string, any, any, any, any>[],
    NEW extends ProductSupplier<string, any, any, any, true>[]
> = OLD extends [infer Head, ...infer Tail]
    ? Tail extends Supplier<string, any, any, any, any>[]
        ? Head extends { name: NEW[number]["name"] }
            ? // Head matches a NEW supplier, use the NEW one
              [
                  Extract<NEW[number], { name: Head["name"] }>,
                  ...TrySuppliers<Tail, NEW>
              ]
            : // Head doesn't match, keep the original
              [Head, ...TrySuppliers<Tail, NEW>]
        : Head extends { name: NEW[number]["name"] }
        ? [Extract<NEW[number], { name: Head["name"] }>]
        : [Head]
    : []
