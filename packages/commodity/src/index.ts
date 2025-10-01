import {
    Product,
    ProductSupplier,
    Supplier,
    SupplyMap,
    type Resource,
    type ResourceSupplier,
    type $,
    type ToSupply,
    type HasCircularDependency,
    type ExcludeSuppliersType,
    type MapFromList,
    type TrySuppliers,
    type FilterSuppliers
} from "#types"

import { hire } from "#assemble"
import { index, once } from "#utils"
import {
    validateNonEmptyString,
    validatePlainObject,
    validateDefined,
    validateProductConfig,
    validatePrototypeConfig,
    validateSuppliers
} from "#validation"

/**
 * Type guard to check if a supply is a Product.
 * @param supply - The supply to check
 * @returns True if the supply is a Product, false otherwise
 * @internal
 */
function isProduct(
    supply: SupplyMap[keyof SupplyMap]
): supply is Product<string, any, any> {
    return "_product" in supply
}

/**
 * Creates a new market instance for managing suppliers and products.
 * A market provides a namespace for creating and managing suppliers without name conflicts.
 * Each market maintains its own registry of supplier names to prevent collisions.
 *
 * Markets are the entry point for the commodity dependency injection system. They allow you
 * to define resources (simple values) and products (complex objects with dependencies) in a
 * type-safe manner.
 *
 * @returns A market object with methods to create suppliers and products
 * @beta
 * @example
 * ```typescript
 * // Create a market
 * const market = createMarket()
 *
 * // Define a resource (simple value)
 * const config = market.offer("config").asResource<AppConfig>()
 * const packedConfig = config.pack({ apiUrl: "https://api.example.com", debug: true })
 *
 * // Define a product (complex object with dependencies)
 * const logger = market.offer("logger").asProduct({
 *   suppliers: [config],
 *   factory: (deps) => new Logger(deps.config.unpack())
 * })
 *
 * // Assemble the product
 * const loggerInstance = logger.assemble({ config: packedConfig })
 * const loggerValue = loggerInstance.unpack()
 * ```
 */
export const createMarket = () => {
    const names = new Set<string>()
    const market = {
        /**
         * Offers a new supplier or product with the given name.
         * This is the first step in defining a new dependency in the market.
         * The name must be unique within this market.
         *
         * @param name - The unique name for this supplier/product
         * @returns An offer object with methods to define the supplier type (asResource or asProduct)
         * @throws Error if the name already exists in this market
         * @example
         * ```typescript
         * // Offer a resource
         * const config = market.offer("config").asResource<Config>()
         *
         * // Offer a product
         * const service = market.offer("service").asProduct({...})
         * ```
         */
        offer<NAME extends string>(name: NAME) {
            validateNonEmptyString(name, "name")
            if (names.has(name)) {
                throw new Error(`Name ${name} already exists`)
            }
            names.add(name)
            const offer = {
                /**
                 * Creates a resource supplier that can provide values of a specific constraint type.
                 * Resources are simple value containers that can be packed and unpacked.
                 * They're ideal for configuration values, constants, or any simple data that doesn't
                 * have dependencies on other suppliers.
                 *
                 * @typeParam CONSTRAINT - The type constraint for values this resource can hold
                 * @returns A resource supplier configuration object with a `pack` method
                 * @example
                 * ```typescript
                 * // Define a config resource
                 * interface AppConfig {
                 *   apiUrl: string
                 *   debug: boolean
                 * }
                 * const config = market.offer("config").asResource<AppConfig>()
                 *
                 * // Pack a value into the resource
                 * const packedConfig = config.pack({
                 *   apiUrl: "https://api.example.com",
                 *   debug: true
                 * })
                 *
                 * // Unpack the value
                 * const configValue = packedConfig.unpack()
                 * ```
                 */
                asResource: <CONSTRAINT>() => {
                    return {
                        name,
                        pack<
                            THIS extends ResourceSupplier<NAME, CONSTRAINT>,
                            NEW_VALUE extends CONSTRAINT
                        >(this: THIS, value: NEW_VALUE) {
                            validateDefined(value, "value")
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
                        _constraint: null as unknown as CONSTRAINT,
                        _resource: true as const
                    }
                },
                /**
                 * Creates a product supplier that can assemble complex objects from dependencies.
                 * Products can depend on other suppliers and have factory functions for creation.
                 * They represent complex objects that require dependency injection and orchestration.
                 *
                 * @typeParam VALUE - The type of value this product produces
                 * @typeParam SUPPLIERS - Array of suppliers this product depends on
                 * @typeParam JUST_IN_TIME - Array of suppliers that are resolved just-in-time (lazy)
                 * @typeParam IS_PROTOTYPE - Whether this is a prototype supplier
                 * @param config - Configuration object for the product
                 * @param config.suppliers - Array of suppliers this product depends on (resolved eagerly)
                 * @param config.justInTime - Array of suppliers resolved just-in-time (available but not auto-assembled)
                 * @param config.factory - Factory function that creates the product value from dependencies
                 * @param config.init - Optional initialization function called after the factory
                 * @param config.lazy - Whether this product should be lazily evaluated
                 * @param config.isPrototype - Whether this supplier is a prototype variant
                 * @returns A product supplier configuration object with methods like assemble, pack, try, with, etc.
                 * @example
                 * ```typescript
                 * // Simple product with dependencies
                 * const userService = market.offer("userService").asProduct({
                 *   suppliers: [userRepository, logger],
                 *   factory: (deps) => new UserService(deps.userRepository.unpack(), deps.logger.unpack())
                 * })
                 *
                 * // Product with initialization
                 * const database = market.offer("database").asProduct({
                 *   suppliers: [config],
                 *   factory: (deps) => new Database(deps.config.unpack()),
                 *   init: (db) => db.connect()
                 * })
                 *
                 * // Lazy product
                 * const heavyService = market.offer("heavyService").asProduct({
                 *   suppliers: [],
                 *   factory: () => new HeavyService(),
                 *   lazy: true  // Only instantiated when needed
                 * })
                 * ```
                 */
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
                    JUST_IN_TIME extends Supplier<
                        string,
                        any,
                        any,
                        any,
                        any,
                        any,
                        IS_PROTOTYPE extends false ? false : boolean
                    >[] = [],
                    IS_PROTOTYPE extends boolean = false
                >(config: {
                    suppliers?: [...SUPPLIERS]
                    justInTime?: [...JUST_IN_TIME]
                    factory: (
                        supplies: $<SUPPLIERS>,
                        justInTime: MapFromList<[...JUST_IN_TIME]>
                    ) => VALUE
                    init?: (value: VALUE, supplies: $<SUPPLIERS>) => void
                    lazy?: boolean
                    isPrototype?: IS_PROTOTYPE
                }) => {
                    validateProductConfig(config)
                    const {
                        suppliers = [] as unknown as SUPPLIERS,
                        justInTime = [] as unknown as JUST_IN_TIME,
                        factory,
                        init,
                        lazy = false,
                        isPrototype = false as IS_PROTOTYPE
                    } = config
                    const productSupplier = {
                        name,
                        suppliers,
                        justInTime,
                        factory,
                        lazy,
                        init,
                        pack,
                        assemble,
                        try: _try,
                        with: _with,
                        jitOnly,
                        prototype,
                        _isPrototype: isPrototype,
                        _product: true as const
                    }

                    /**
                     * Assembles the product by resolving all dependencies and creating the final instance.
                     * This method orchestrates the dependency resolution and calls the factory function.
                     * It automatically assembles all product dependencies and requires only resource
                     * dependencies to be supplied.
                     *
                     * @param toSupply - Map of resource supplies to use for dependency resolution
                     * @returns A product instance with the resolved dependencies and unpack method
                     * @throws Error if any required resource dependency cannot be resolved
                     * @example
                     * ```typescript
                     * const userService = market.offer("userService").asProduct({
                     *   suppliers: [config, database],
                     *   factory: (deps) => new UserService(deps.config.unpack(), deps.database.unpack())
                     * })
                     *
                     * // Assemble with required resources
                     * const instance = userService.assemble({
                     *   config: packedConfig
                     * })
                     *
                     * // Get the value
                     * const service = instance.unpack()
                     * ```
                     */
                    function assemble<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            Supplier<string, any, any, any, any, any, any>[],
                            any,
                            any,
                            any,
                            any
                        >
                    >(this: THIS, toSupply: ToSupply<THIS["suppliers"]>) {
                        // Only validate if it's not the internal $ callable object
                        if (typeof toSupply !== "function") {
                            validatePlainObject(toSupply, "toSupply")
                        }
                        const team = this.suppliers.filter(
                            (supplier) =>
                                "_product" in supplier && supplier._product
                        ) as ExcludeSuppliersType<
                            THIS["suppliers"],
                            ResourceSupplier<string, any>
                        >
                        /*
                         * A type assertion that tells TypeScript to trust us that the resulting
                         * supplies is compatible with the generic type `SUPPLIES`. This is a necessary
                         * type hole because TypeScript's static analysis can't remember that when you Omit properties
                         * and put them back, you end up with the original type. Here toSupply is type guarded to be $<DEPS> - Services<team>,
                         * and hire merges toSupply and team products together, so the result must extend $<DEPS>. But TS cannot guarantee it.
                         */
                        const assemble = (toSupply: SupplyMap) =>
                            hire(team).assemble(toSupply) as unknown as $<
                                THIS["suppliers"]
                            >

                        const supplies = assemble(toSupply)

                        const buildUnpack = (
                            supplies: $<THIS["suppliers"]>
                        ) => {
                            return once(() => {
                                const value = this.factory(
                                    supplies,
                                    index(...this.justInTime)
                                ) as ReturnType<THIS["factory"]>
                                if (this.init) {
                                    this.init(value, supplies)
                                }
                                return value
                            })
                        }

                        return {
                            name: this.name,
                            supplies,
                            pack: productPack,
                            unpack: buildUnpack(supplies),
                            reassemble<THIS extends Product<NAME, VALUE, any>>(
                                this: THIS,
                                overrides: SupplyMap
                            ) {
                                validatePlainObject(overrides, "overrides")
                                // Create a mutable copy of overrides with flexible typing
                                const unassembled: SupplyMap = {}

                                // Loop over all supplies and check if they need resupplying
                                for (const [name, supply] of Object.entries<
                                    SupplyMap[keyof SupplyMap]
                                >(this.supplies)) {
                                    if (name in overrides && overrides[name]) {
                                        unassembled[name] = overrides[name]
                                        continue
                                    }
                                    // If the supply is a resource, or doesn't depend on one of the overrides,
                                    // add it to newSupplies
                                    if (
                                        !isProduct(supply) ||
                                        !supply._dependsOnOneOf(overrides)
                                    ) {
                                        unassembled[name] = supply
                                    }
                                }

                                const newSupplies = assemble(unassembled)

                                return {
                                    ...this,
                                    supplies: newSupplies,
                                    unpack: buildUnpack(newSupplies)
                                }
                            },
                            _dependsOnOneOf(
                                this: Product<any, any, any>,
                                overrides: SupplyMap
                            ) {
                                // Check if any dependencies need resupplying
                                for (const supplier of this._supplier
                                    .suppliers) {
                                    // Check if this dependency is directly overridden
                                    if (supplier.name in overrides) {
                                        return true
                                    }

                                    const supply =
                                        this.supplies[
                                            supplier.name as keyof $<SUPPLIERS>
                                        ]

                                    if (
                                        supply &&
                                        isProduct(supply) &&
                                        supply._dependsOnOneOf(overrides)
                                    ) {
                                        return true
                                    }
                                }
                                return false
                            },
                            _product: true as const,
                            _supplier: this
                        }
                    }

                    /**
                     * Packs a new value into an existing product, creating a new product instance.
                     * This is used internally by the pack method to create packed products.
                     * Packed products have no dependencies and always return the packed value.
                     *
                     * @param value - The new value to pack into the product
                     * @returns A new product instance with the packed value and no dependencies
                     * @internal
                     */
                    function productPack<
                        THIS extends Product<NAME, VALUE, $<SUPPLIERS>>,
                        NEW_VALUE extends VALUE
                    >(this: THIS, value: NEW_VALUE) {
                        return {
                            name: this.name,
                            supplies: {},
                            pack: this.pack,
                            unpack: () => value,
                            reassemble<
                                THIS extends Product<
                                    NAME,
                                    NEW_VALUE,
                                    $<SUPPLIERS>
                                >
                            >(this: THIS) {
                                return this
                            },
                            _dependsOnOneOf: this._dependsOnOneOf,
                            _product: this._product,
                            _supplier: this._supplier
                        }
                    }

                    /**
                     * Packs a value into this product supplier, creating a product with the given value.
                     * Packed products do not depend on any suppliers and always return the packed value.
                     * This is useful for testing or providing mock implementations.
                     *
                     * @param value - The value to pack into the product
                     * @returns A product instance containing the packed value with no dependencies
                     * @example
                     * ```typescript
                     * const userService = market.offer("userService").asProduct({
                     *   suppliers: [userRepository],
                     *   factory: (deps) => new UserService(deps.userRepository.unpack())
                     * })
                     *
                     * // Pack a pre-instantiated value for testing
                     * const mockService = new MockUserService()
                     * const packedService = userService.pack(mockService)
                     *
                     * // Use it without needing to assemble dependencies
                     * const service = packedService.unpack() // Returns mockService directly
                     * ```
                     */
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
                        validateDefined(value, "value")
                        return {
                            name: this.name,
                            supplies: {},
                            pack: productPack,
                            // Packed value does not depend on anything.
                            _dependsOnOneOf: () => false,
                            unpack: () => value,
                            reassemble<
                                THIS extends Product<
                                    NAME,
                                    NEW_VALUE,
                                    $<SUPPLIERS>
                                >
                            >(this: THIS) {
                                return this
                            },

                            _product: true as const,
                            _supplier: this
                        }
                    }

                    /**
                     * Creates a prototype version of this product supplier with different dependencies.
                     * Prototypes are used for creating variations of a product with different implementations
                     * while keeping the same name. This is useful for testing, mocking, or providing
                     * alternative implementations.
                     *
                     * @typeParam SUPPLIERS_OF_PROTOTYPE - Array of suppliers for the prototype
                     * @typeParam JUST_IN_TIME_OF_PROTOTYPE - Array of just-in-time suppliers for the prototype
                     * @param config - Configuration for the prototype
                     * @param config.factory - Factory function for the prototype
                     * @param config.suppliers - Dependencies for the prototype (can be different from the original)
                     * @param config.justInTime - Just-in-time dependencies for the prototype
                     * @param config.init - Optional initialization function for the prototype
                     * @param config.lazy - Whether the prototype should be lazily evaluated
                     * @returns A prototype product supplier marked as IS_PROTOTYPE = true
                     * @example
                     * ```typescript
                     * // Original service with database dependency
                     * const userService = market.offer("userService").asProduct({
                     *   suppliers: [database, logger],
                     *   factory: (deps) => new UserService(deps.database.unpack(), deps.logger.unpack())
                     * })
                     *
                     * // Mock version for testing (no dependencies)
                     * const mockUserService = userService.prototype({
                     *   factory: () => new MockUserService(),
                     *   suppliers: []
                     * })
                     *
                     * // Both have the same name "userService" but different implementations
                     * ```
                     */
                    function prototype<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            any,
                            any,
                            any,
                            any,
                            any
                        >,
                        SUPPLIERS_OF_PROTOTYPE extends Supplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            false
                        >[] = [],
                        JUST_IN_TIME_OF_PROTOTYPE extends Supplier<
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
                        config: {
                            factory: (
                                supplies: $<SUPPLIERS_OF_PROTOTYPE>,
                                justInTime: MapFromList<
                                    [...JUST_IN_TIME_OF_PROTOTYPE]
                                >
                            ) => VALUE
                            suppliers?: [...SUPPLIERS_OF_PROTOTYPE]
                            justInTime?: [...JUST_IN_TIME_OF_PROTOTYPE]
                            init?: (
                                value: VALUE,
                                supplies: $<SUPPLIERS_OF_PROTOTYPE>
                            ) => void
                            lazy?: boolean
                        }
                    ) {
                        validatePrototypeConfig(config)
                        const {
                            factory,
                            suppliers = [] as unknown as SUPPLIERS_OF_PROTOTYPE,
                            justInTime = [] as unknown as JUST_IN_TIME_OF_PROTOTYPE,
                            init,
                            lazy = false
                        } = config
                        const supplier = {
                            name: this.name,
                            suppliers,
                            justInTime,
                            factory,
                            init,
                            lazy,
                            pack,
                            assemble,
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

                    /**
                     * Tries alternative suppliers for this product, merging them with existing dependencies.
                     * This allows for fallback or alternative implementations of dependencies.
                     * When a supplied name matches an existing dependency, the new supplier takes precedence.
                     *
                     * The `try` method is useful for testing or providing alternative implementations
                     * without changing the original supplier definition.
                     *
                     * @param suppliers - Alternative suppliers to try (must be prototypes)
                     * @returns A new product supplier with merged dependencies marked as prototype
                     * @example
                     * ```typescript
                     * // Original service with real dependencies
                     * const userService = market.offer("userService").asProduct({
                     *   suppliers: [database, emailService],
                     *   factory: (deps) => new UserService(deps.database.unpack(), deps.emailService.unpack())
                     * })
                     *
                     * // Create mock versions of dependencies
                     * const mockDatabase = database.prototype({
                     *   factory: () => new MockDatabase(),
                     *   suppliers: []
                     * })
                     * const mockEmailService = emailService.prototype({
                     *   factory: () => new MockEmailService(),
                     *   suppliers: []
                     * })
                     *
                     * // Try with mocks - replaces database and emailService
                     * const testUserService = userService.try(mockDatabase, mockEmailService)
                     * ```
                     */
                    function _try<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            SUPPLIERS,
                            JUST_IN_TIME,
                            any,
                            any,
                            any
                        > & {
                            _jitOnly?: true
                        },
                        SUPPLIERS extends ProductSupplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            any
                        >[],
                        JUST_IN_TIME extends ProductSupplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            any
                        >[],
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
                        validateSuppliers(suppliers, "suppliers")
                        type MERGED_SUPPLIERS = TrySuppliers<
                            THIS["suppliers"],
                            TRIED_SUPPLIERS
                        >

                        type MERGED_JUST_IN_TIME_SUPPLIERS = TrySuppliers<
                            THIS["justInTime"],
                            TRIED_SUPPLIERS
                        >

                        const newSupplier = {
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
                            factory: this.factory,
                            init: this.init,
                            lazy: this.lazy,
                            pack,
                            assemble,
                            jitOnly,
                            _isPrototype: true as const,
                            _product: true as const
                        }

                        return newSupplier as HasCircularDependency<
                            typeof newSupplier
                        > extends true
                            ? unknown
                            : typeof newSupplier
                    }

                    /**
                     * Replaces specific dependencies with new implementations.
                     * Unlike `try`, this method completely removes old suppliers and adds new ones,
                     * allowing for controlled dependency replacement.
                     * @param suppliers - New suppliers to replace existing ones with matching names
                     * @returns A new product supplier with replaced dependencies
                     * @example
                     * ```typescript
                     * const userService = market.offer("userService").asProduct({
                     *   suppliers: [oldUserRepository, logger]
                     * })
                     * const updatedService = userService.with(newUserRepository)
                     * // oldUserRepository is removed, newUserRepository is added
                     * ```
                     */
                    function _with<
                        THIS extends ProductSupplier<
                            NAME,
                            VALUE,
                            SUPPLIERS,
                            any,
                            any,
                            any,
                            any
                        >,
                        SUPPLIERS extends Supplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            any
                        >[],
                        WITH_SUPPLIERS extends ProductSupplier<
                            string,
                            any,
                            any,
                            any,
                            any,
                            any,
                            any
                        >[]
                    >(this: THIS, ...suppliers: [...WITH_SUPPLIERS]) {
                        validateSuppliers(suppliers, "suppliers")
                        type FILTERED_SUPPLIERS = FilterSuppliers<
                            THIS["suppliers"],
                            WITH_SUPPLIERS
                        >

                        const oldSuppliers = this.suppliers.filter(
                            (supplier) =>
                                !suppliers.some(
                                    (newSupplier) =>
                                        newSupplier.name === supplier.name
                                )
                        )
                        const newSupplier = {
                            name: this.name,
                            suppliers: [
                                ...oldSuppliers,
                                ...suppliers
                            ] as unknown as [
                                ...FILTERED_SUPPLIERS,
                                ...WITH_SUPPLIERS
                            ],
                            justInTime: this.justInTime,
                            factory: this.factory,
                            init: this.init,
                            lazy: this.lazy,
                            pack,
                            assemble,
                            jitOnly,
                            _isPrototype: true as const,
                            _product: true as const
                        }

                        return newSupplier as HasCircularDependency<
                            typeof newSupplier
                        > extends true
                            ? unknown
                            : typeof newSupplier
                    }

                    /**
                     * Marks this product as just-in-time only, meaning it will only be resolved when needed.
                     * This is useful for lazy loading or optional dependencies. Just-in-time suppliers
                     * are not automatically assembled but can be accessed through the justInTime parameter
                     * in factory functions.
                     *
                     * @returns A product supplier marked as just-in-time only with _jitOnly flag
                     * @example
                     * ```typescript
                     * // Define an optional/expensive service
                     * const analyticsService = market.offer("analyticsService").asProduct({
                     *   suppliers: [config],
                     *   factory: (deps) => new AnalyticsService(deps.config.unpack())
                     * }).jitOnly()
                     *
                     * // Use it in another product
                     * const userService = market.offer("userService").asProduct({
                     *   suppliers: [database],
                     *   justInTime: [analyticsService],
                     *   factory: (deps, jit) => {
                     *     const service = new UserService(deps.database.unpack())
                     *     // analyticsService is only assembled if accessed
                     *     if (needsAnalytics) {
                     *       service.setAnalytics(jit.analyticsService.unpack())
                     *     }
                     *     return service
                     *   }
                     * })
                     * ```
                     */
                    function jitOnly<THIS>(this: THIS) {
                        // Set the flag and return this for chaining
                        return {
                            ...this,
                            _jitOnly: true as const
                        }
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

export { index, sleep } from "#utils"
export * from "#types"
