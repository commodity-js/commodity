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
 * @example
 * ```typescript
 * const configResource: Resource<"config", AppConfig> = {
 *   name: "config",
 *   pack: (value) => configResource,
 *   unpack: () => ({ apiUrl: "https://api.example.com" }),
 *   _resource: true
 * }
 * ```
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
 * They ensure type safety by constraining the values that can be supplied.
 *
 * @typeParam NAME - The unique identifier name for this resource supplier
 * @typeParam CONSTRAINT - The type constraint for values this supplier can accept
 * @public
 * @example
 * ```typescript
 * const configSupplier: ResourceSupplier<"config", AppConfig> = {
 *   name: "config",
 *   pack: (value: AppConfig) => ({ name: "config", pack: configSupplier.pack, unpack: () => value, _resource: true }),
 *   _resource: true,
 *   _constraint: null as unknown as AppConfig
 * }
 * ```
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
 * They represent fully constructed instances with resolved dependencies.
 *
 * @typeParam NAME - The unique identifier name for this product
 * @typeParam VALUE - The type of value this product produces
 * @typeParam SUPPLIES - The map of resolved dependencies this product uses
 * @public
 * @example
 * ```typescript
 * const userService: Product<"userService", UserService, { userRepo: Resource<"userRepo", UserRepository> }> = {
 *   name: "userService",
 *   supplies: { userRepo: userRepoResource },
 *   unpack: () => new UserService(userRepoResource.unpack()),
 *   pack: (value) => ({ ...userService, unpack: () => value }),
 *   reassemble: (overrides) => userServiceSupplier.assemble(overrides),
 *   _dependsOnOneOf: (overrides) => "userRepo" in overrides,
 *   _product: true,
 *   _supplier: userServiceSupplier
 * }
 * ```
 */
export type Product<NAME extends string, VALUE, SUPPLIES extends SupplyMap> = {
    /** The name/identifier of this product */
    name: NAME
    /** The resolved dependencies this product was assembled with */
    supplies: SUPPLIES
    /** Unpacks and returns the current value of this product */
    unpack: () => VALUE
    /** Packs a new value into this product, returning a new product instance */
    pack: (value: VALUE) => Product<NAME, VALUE, SUPPLIES>
    /** Reassembles this product with new dependency overrides */
    reassemble: (overrides: SupplyMap) => Product<NAME, VALUE, SUPPLIES>
    /** Checks if this product depends on any of the given overrides */
    _dependsOnOneOf: (overrides: SupplyMap) => boolean
    /** Type marker indicating this is a product */
    _product: true
    /** The supplier that created this product */
    _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>
}
/**
 * Represents a product supplier - a factory for creating products with dependencies.
 * Product suppliers define how to assemble complex objects from their dependencies.
 * They support various features like lazy loading, prototypes, and just-in-time resolution.
 *
 * @typeParam NAME - The unique identifier name for this product supplier
 * @typeParam VALUE - The type of value this supplier produces
 * @typeParam SUPPLIERS - Array of suppliers this product depends on
 * @typeParam JUST_IN_TIME - Array of suppliers resolved just-in-time (lazy)
 * @typeParam SUPPLIES - The resolved supply map for dependencies
 * @typeParam JUST_IN_TIME_MAP - The map of just-in-time suppliers
 * @typeParam IS_PROTOTYPE - Whether this supplier is a prototype variant
 * @public
 * @example
 * ```typescript
 * const userServiceSupplier: ProductSupplier<"userService", UserService, [typeof userRepoSupplier]> = {
 *   name: "userService",
 *   suppliers: [userRepoSupplier],
 *   justInTime: [],
 *   factory: (supplies) => new UserService(supplies.userRepo.unpack()),
 *   assemble: (toSupply) => ({ ...productInstance }),
 *   pack: (value) => ({ ...packedProduct }),
 *   jitOnly: () => ({ ...this, _jitOnly: true }),
 *   _isPrototype: false,
 *   _product: true
 * }
 * ```
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
    /** The name/identifier of this product supplier */
    name: NAME
    /** Array of suppliers this product depends on */
    suppliers: SUPPLIERS
    /** Array of suppliers resolved just-in-time (not automatically assembled) */
    justInTime: JUST_IN_TIME
    /** Factory function that creates the product value from its dependencies */
    factory: (supplies: SUPPLIES, justInTime: JUST_IN_TIME_MAP) => VALUE
    /** Assembles the product by resolving dependencies */
    assemble: (toSupply: ToSupply<SUPPLIERS>) => Product<NAME, VALUE, SUPPLIES>
    /** Packs a value into a product without dependencies */
    pack: (value: VALUE) => Product<NAME, VALUE, Record<never, never>>
    /** Tries alternative suppliers for dependencies */
    try?: (
        ...suppliers: ProductSupplier<string, any, any, any, any, any, true>[]
    ) => ProductSupplier<NAME, VALUE, any, any, any, any, true>
    /** Replaces specific dependencies with new ones */
    with?: (
        ...suppliers: ProductSupplier<string, any, any, any, any, any, false>[]
    ) => ProductSupplier<NAME, VALUE, any, any, any, any, true>
    /** Marks this supplier as just-in-time only */
    jitOnly: () => ProductSupplier<NAME, VALUE, any, any, any, any, false>
    /** Creates a prototype variant with different implementation */
    prototype?: ({
        factory,
        suppliers,
        justInTime,
        init,
        lazy
    }: {
        factory: (
            supplies: $<Supplier<string, any, any, any, any, any, any>[]>,
            justInTime: MapFromList<
                Supplier<string, any, any, any, any, any, any>[]
            >
        ) => VALUE
        suppliers?: Supplier<string, any, any, any, any, any, any>[]
        justInTime?: Supplier<string, any, any, any, any, any, any>[]
        init?: (
            value: VALUE,
            supplies: $<Supplier<string, any, any, any, any, any, any>[]>
        ) => void
        lazy?: boolean
    }) => ProductSupplier<
        NAME,
        VALUE,
        Supplier<string, any, any, any, any, any, any>[],
        Supplier<string, any, any, any, any, any, any>[],
        any,
        any,
        true
    >
    /** Optional initialization function called after factory */
    init?: (value: VALUE, supplies: SUPPLIES) => void
    /** Whether this supplier should be lazily evaluated */
    lazy?: boolean
    /** Whether this supplier is a prototype variant */
    _isPrototype: IS_PROTOTYPE
    /** Type marker indicating this is a product supplier */
    _product: true
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
 * @typeParam JUST_IN_TIME - Array of just-in-time suppliers (for product suppliers)
 * @typeParam SUPPLIES - The resolved supply map (for product suppliers)
 * @typeParam JUST_IN_TIME_MAP - The map of just-in-time suppliers (for product suppliers)
 * @typeParam IS_PROTOTYPE - Whether this is a prototype variant (for product suppliers)
 * @public
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
 * This is used internally to create lookup maps from supplier arrays for type-safe access.
 *
 * @typeParam LIST - An array of objects that have a `name` property
 * @returns A map type where each key is a name from the list and values are the corresponding objects
 * @public
 * @example
 * ```typescript
 * type Services = [
 *   { name: "userRepo", type: UserRepository },
 *   { name: "logger", type: Logger }
 * ]
 * type ServiceMap = MapFromList<Services>
 * // Result: { userRepo: { name: "userRepo", type: UserRepository }, logger: { name: "logger", type: Logger } }
 * ```
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
 * The map enables dynamic lookup of dependencies at runtime while maintaining type safety.
 *
 * @public
 * @example
 * ```typescript
 * const supplies: SupplyMap = {
 *   userRepo: userRepoResource,
 *   logger: loggerProduct,
 *   config: configResource
 * }
 * ```
 */
export type SupplyMap = Record<
    string,
    Product<string, any, any> | Resource<string, any>
>

/**
 * Converts an array of suppliers into a supply map with the correct product/resource types.
 * This type transformation ensures that each supplier is mapped to its corresponding
 * assembled product or resource, maintaining full type safety.
 *
 * @typeParam SUPPLIERS - Array of supplier types to convert into a supply map
 * @returns A map where keys are supplier names and values are their assembled products/resources
 * @public
 */
export type SupplyMapFromSuppliers<
    SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[]
> = {
    [SUPPLIER in SUPPLIERS[number] as SUPPLIER["name"]]: SUPPLIER extends ProductSupplier<
        infer NAME,
        infer VALUE,
        any,
        any,
        infer SUPPLIES,
        any,
        any
    >
        ? Product<NAME, VALUE, SUPPLIES>
        : SUPPLIER extends ResourceSupplier<infer NAME, infer VALUE>
        ? Resource<NAME, VALUE>
        : never
}
/**
 * Creates a supplies object that provides both direct property access and function access.
 * This type represents the resolved dependencies that can be passed to factory functions.
 * It enables accessing dependencies either as properties or by calling with a supplier object.
 *
 * @typeParam SUPPLIERS - Array of suppliers to create the supply object from
 * @returns A callable object that provides both property access and function call access to supplies
 * @public
 * @example
 * ```typescript
 * function factory(supplies: $<[typeof userRepoSupplier, typeof loggerSupplier]>) {
 *   // Property access
 *   const repo = supplies.userRepo.unpack()
 *   // Function access
 *   const logger = supplies(loggerSupplier)
 *   return new UserService(repo, logger)
 * }
 * ```
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
 * Recursively collects all transitive dependencies of a supplier array.
 * This type walks through the dependency tree, collecting each supplier and all of its
 * nested dependencies into a flattened array. This is essential for understanding
 * the complete dependency graph.
 *
 * @typeParam SUPPLIERS - The array of suppliers to collect transitive dependencies from
 * @returns A flattened array containing all suppliers and their transitive dependencies
 * @public
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
    SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[]
> = SupplyMapFromSuppliers<
    ExcludeSuppliersType<
        TransitiveSuppliers<SUPPLIERS>,
        ProductSupplier<string, any, any, any, any, any, any>
    >
>

/**
 * Merges two supplier arrays, replacing old suppliers with new ones when names match.
 * This is used by the `try` method to provide alternative implementations for dependencies.
 * When a supplier name exists in both arrays, the new supplier takes precedence.
 *
 * @typeParam OLD - The original array of suppliers
 * @typeParam NEW - The new array of suppliers to merge in
 * @returns A merged array where matching names from NEW replace those in OLD
 * @public
 */
export type TrySuppliers<
    OLD extends Supplier<string, any, any, any, any, any, any>[],
    NEW extends ProductSupplier<string, any, any, any, any, any, any>[]
> = OLD extends [infer Head, ...infer Tail]
    ? Tail extends Supplier<string, any, any, any, any, any, any>[]
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

/**
 * Filters out suppliers from OLD that have matching names in NEW.
 * This is used by the `with` method to remove old suppliers before adding new ones.
 * Unlike `TrySuppliers`, this completely removes matching suppliers instead of replacing them.
 *
 * @typeParam OLD - The original array of suppliers to filter
 * @typeParam NEW - The array of suppliers whose names should be removed from OLD
 * @returns A filtered array with suppliers whose names appear in NEW removed
 * @public
 */
export type FilterSuppliers<
    OLD extends Supplier<string, any, any, any, any, any, any>[],
    NEW extends ProductSupplier<string, any, any, any, any, any, any>[]
> = OLD extends [infer Head, ...infer Tail]
    ? Tail extends Supplier<string, any, any, any, any, any, any>[]
        ? Head extends { name: NEW[number]["name"] }
            ? FilterSuppliers<Tail, NEW>
            : [Head, ...FilterSuppliers<Tail, NEW>]
        : Head extends { name: NEW[number]["name"] }
        ? []
        : [Head]
    : []

/**
 * Checks if a supplier has a circular dependency by seeing if its name appears
 * in the transitive dependencies of its own suppliers.
 * This prevents infinite loops during dependency resolution.
 * @public
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
