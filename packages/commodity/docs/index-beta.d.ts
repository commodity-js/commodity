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
export declare type $<SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[]> = (<NAME extends keyof SupplyMapFromSuppliers<SUPPLIERS>>(supplier: {
    name: NAME;
}) => SupplyMapFromSuppliers<SUPPLIERS>[NAME] extends {
    unpack(): infer VALUE;
} ? VALUE : never) & SupplyMapFromSuppliers<SUPPLIERS>;

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
 * @public
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
export declare const createMarket: () => {
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
    offer<NAME extends string>(name: NAME): {
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
            name: NAME;
            pack<THIS extends ResourceSupplier<NAME, CONSTRAINT>, NEW_VALUE extends CONSTRAINT>(this: THIS, value: NEW_VALUE): {
                name: NAME;
                pack<THIS_1 extends Resource<NAME, CONSTRAINT>, NEW_VALUE_1 extends CONSTRAINT>(this: THIS_1, value: NEW_VALUE_1): {
                    name: NAME;
                    pack: (value: CONSTRAINT) => Resource<NAME, CONSTRAINT>;
                    _resource: true;
                    unpack: () => NEW_VALUE_1;
                };
                _resource: true;
                unpack: () => NonNullable<NEW_VALUE>;
            };
            _constraint: CONSTRAINT;
            _resource: true;
        };
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
        asProduct: <VALUE, SUPPLIERS extends Supplier<string, any, any, any, any, any, IS_PROTOTYPE extends false ? false : boolean>[] = [], JUST_IN_TIME extends Supplier<string, any, any, any, any, any, IS_PROTOTYPE extends false ? false : boolean>[] = [], IS_PROTOTYPE extends boolean = false>(config: {
            suppliers?: [...SUPPLIERS];
            justInTime?: [...JUST_IN_TIME];
            factory: (supplies: $<SUPPLIERS>, justInTime: MapFromList<[...JUST_IN_TIME]>) => VALUE;
            init?: (value: VALUE, supplies: $<SUPPLIERS>) => void;
            lazy?: boolean;
            isPrototype?: IS_PROTOTYPE;
        }) => HasCircularDependency<{
            name: NAME;
            suppliers: SUPPLIERS;
            justInTime: JUST_IN_TIME;
            factory: (supplies: $<SUPPLIERS>, justInTime: MapFromList<[...JUST_IN_TIME]>) => VALUE;
            lazy: boolean;
            init: ((value: VALUE, supplies: $<SUPPLIERS>) => void) | undefined;
            pack: <THIS extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS, value: NEW_VALUE_2) => {
                name: NAME;
                supplies: {};
                pack: <THIS_1 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_1, value: NEW_VALUE_3) => {
                    name: NAME;
                    supplies: {};
                    pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                    unpack: () => NEW_VALUE_3;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                    _product: true;
                    _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                };
                _dependsOnOneOf: () => boolean;
                unpack: () => NonNullable<NEW_VALUE_2>;
                reassemble<THIS_1 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_1): THIS_1;
                _product: true;
                _supplier: THIS;
            };
            assemble: <THIS extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS, toSupply: ToSupply<THIS["suppliers"]>) => {
                name: NAME;
                supplies: $<THIS["suppliers"]>;
                pack: <THIS_1 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_1, value: NEW_VALUE_3) => {
                    name: NAME;
                    supplies: {};
                    pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                    unpack: () => NEW_VALUE_3;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                    _product: true;
                    _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                };
                unpack: () => ReturnType<THIS["factory"]>;
                reassemble<THIS_1 extends Product<NAME, VALUE, any>>(this: THIS_1, overrides: SupplyMap): THIS_1 & {
                    supplies: $<THIS["suppliers"]>;
                    unpack: () => ReturnType<THIS["factory"]>;
                };
                _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                _product: true;
                _supplier: THIS;
            };
            try: <THIS extends ProductSupplier<NAME, VALUE, SUPPLIERS_1, JUST_IN_TIME_1, any, any, any> & {
                _jitOnly?: true;
            }, SUPPLIERS_1 extends ProductSupplier<string, any, any, any, any, any, any>[], JUST_IN_TIME_1 extends ProductSupplier<string, any, any, any, any, any, any>[], TRIED_SUPPLIERS extends ProductSupplier<string, any, any, any, any, any, true>[]>(this: THIS, ...suppliers: TRIED_SUPPLIERS) => HasCircularDependency<{
                name: NAME;
                suppliers: SUPPLIERS_1 | TrySuppliers<THIS["suppliers"], TRIED_SUPPLIERS>;
                justInTime: TrySuppliers<THIS["justInTime"], TRIED_SUPPLIERS>;
                factory: (supplies: any, justInTime: any) => VALUE;
                init: ((value: VALUE, supplies: any) => void) | undefined;
                lazy: boolean | undefined;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            }> extends true ? unknown : {
                name: NAME;
                suppliers: SUPPLIERS_1 | TrySuppliers<THIS["suppliers"], TRIED_SUPPLIERS>;
                justInTime: TrySuppliers<THIS["justInTime"], TRIED_SUPPLIERS>;
                factory: (supplies: any, justInTime: any) => VALUE;
                init: ((value: VALUE, supplies: any) => void) | undefined;
                lazy: boolean | undefined;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            };
            with: <THIS extends ProductSupplier<NAME, VALUE, SUPPLIERS_2, any, any, any, any>, SUPPLIERS_2 extends Supplier<string, any, any, any, any, any, any>[], WITH_SUPPLIERS extends ProductSupplier<string, any, any, any, any, any, any>[]>(this: THIS, ...suppliers: WITH_SUPPLIERS) => HasCircularDependency<{
                name: NAME;
                suppliers: [...FilterSuppliers<THIS["suppliers"], WITH_SUPPLIERS>, ...WITH_SUPPLIERS];
                justInTime: any;
                factory: (supplies: any, justInTime: any) => VALUE;
                init: ((value: VALUE, supplies: any) => void) | undefined;
                lazy: boolean | undefined;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            }> extends true ? unknown : {
                name: NAME;
                suppliers: [...FilterSuppliers<THIS["suppliers"], WITH_SUPPLIERS>, ...WITH_SUPPLIERS];
                justInTime: any;
                factory: (supplies: any, justInTime: any) => VALUE;
                init: ((value: VALUE, supplies: any) => void) | undefined;
                lazy: boolean | undefined;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            };
            jitOnly: <THIS>(this: THIS) => THIS & {
                _jitOnly: true;
            };
            prototype: <THIS extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, SUPPLIERS_OF_PROTOTYPE extends Supplier<string, any, any, any, any, any, false>[] = [], JUST_IN_TIME_OF_PROTOTYPE extends Supplier<string, any, any, any, any, any, false>[] = []>(this: THIS, config: {
                factory: (supplies: $<SUPPLIERS_OF_PROTOTYPE>, justInTime: MapFromList<[...JUST_IN_TIME_OF_PROTOTYPE]>) => VALUE;
                suppliers?: [...SUPPLIERS_OF_PROTOTYPE];
                justInTime?: [...JUST_IN_TIME_OF_PROTOTYPE];
                init?: (value: VALUE, supplies: $<SUPPLIERS_OF_PROTOTYPE>) => void;
                lazy?: boolean;
            }) => HasCircularDependency<{
                name: NAME;
                suppliers: SUPPLIERS_OF_PROTOTYPE;
                justInTime: JUST_IN_TIME_OF_PROTOTYPE;
                factory: (supplies: $<SUPPLIERS_OF_PROTOTYPE>, justInTime: MapFromList<[...JUST_IN_TIME_OF_PROTOTYPE]>) => VALUE;
                init: ((value: VALUE, supplies: $<SUPPLIERS_OF_PROTOTYPE>) => void) | undefined;
                lazy: boolean;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            }> extends true ? unknown : {
                name: NAME;
                suppliers: SUPPLIERS_OF_PROTOTYPE;
                justInTime: JUST_IN_TIME_OF_PROTOTYPE;
                factory: (supplies: $<SUPPLIERS_OF_PROTOTYPE>, justInTime: MapFromList<[...JUST_IN_TIME_OF_PROTOTYPE]>) => VALUE;
                init: ((value: VALUE, supplies: $<SUPPLIERS_OF_PROTOTYPE>) => void) | undefined;
                lazy: boolean;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            };
            _isPrototype: IS_PROTOTYPE;
            _product: true;
        }> extends true ? unknown : {
            name: NAME;
            suppliers: SUPPLIERS;
            justInTime: JUST_IN_TIME;
            factory: (supplies: $<SUPPLIERS>, justInTime: MapFromList<[...JUST_IN_TIME]>) => VALUE;
            lazy: boolean;
            init: ((value: VALUE, supplies: $<SUPPLIERS>) => void) | undefined;
            pack: <THIS extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS, value: NEW_VALUE_2) => {
                name: NAME;
                supplies: {};
                pack: <THIS_1 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_1, value: NEW_VALUE_3) => {
                    name: NAME;
                    supplies: {};
                    pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                    unpack: () => NEW_VALUE_3;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                    _product: true;
                    _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                };
                _dependsOnOneOf: () => boolean;
                unpack: () => NonNullable<NEW_VALUE_2>;
                reassemble<THIS_1 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_1): THIS_1;
                _product: true;
                _supplier: THIS;
            };
            assemble: <THIS extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS, toSupply: ToSupply<THIS["suppliers"]>) => {
                name: NAME;
                supplies: $<THIS["suppliers"]>;
                pack: <THIS_1 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_1, value: NEW_VALUE_3) => {
                    name: NAME;
                    supplies: {};
                    pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                    unpack: () => NEW_VALUE_3;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                    _product: true;
                    _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                };
                unpack: () => ReturnType<THIS["factory"]>;
                reassemble<THIS_1 extends Product<NAME, VALUE, any>>(this: THIS_1, overrides: SupplyMap): THIS_1 & {
                    supplies: $<THIS["suppliers"]>;
                    unpack: () => ReturnType<THIS["factory"]>;
                };
                _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                _product: true;
                _supplier: THIS;
            };
            try: <THIS extends ProductSupplier<NAME, VALUE, SUPPLIERS_1, JUST_IN_TIME_1, any, any, any> & {
                _jitOnly?: true;
            }, SUPPLIERS_1 extends ProductSupplier<string, any, any, any, any, any, any>[], JUST_IN_TIME_1 extends ProductSupplier<string, any, any, any, any, any, any>[], TRIED_SUPPLIERS extends ProductSupplier<string, any, any, any, any, any, true>[]>(this: THIS, ...suppliers: TRIED_SUPPLIERS) => HasCircularDependency<{
                name: NAME;
                suppliers: SUPPLIERS_1 | TrySuppliers<THIS["suppliers"], TRIED_SUPPLIERS>;
                justInTime: TrySuppliers<THIS["justInTime"], TRIED_SUPPLIERS>;
                factory: (supplies: any, justInTime: any) => VALUE;
                init: ((value: VALUE, supplies: any) => void) | undefined;
                lazy: boolean | undefined;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            }> extends true ? unknown : {
                name: NAME;
                suppliers: SUPPLIERS_1 | TrySuppliers<THIS["suppliers"], TRIED_SUPPLIERS>;
                justInTime: TrySuppliers<THIS["justInTime"], TRIED_SUPPLIERS>;
                factory: (supplies: any, justInTime: any) => VALUE;
                init: ((value: VALUE, supplies: any) => void) | undefined;
                lazy: boolean | undefined;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            };
            with: <THIS extends ProductSupplier<NAME, VALUE, SUPPLIERS_2, any, any, any, any>, SUPPLIERS_2 extends Supplier<string, any, any, any, any, any, any>[], WITH_SUPPLIERS extends ProductSupplier<string, any, any, any, any, any, any>[]>(this: THIS, ...suppliers: WITH_SUPPLIERS) => HasCircularDependency<{
                name: NAME;
                suppliers: [...FilterSuppliers<THIS["suppliers"], WITH_SUPPLIERS>, ...WITH_SUPPLIERS];
                justInTime: any;
                factory: (supplies: any, justInTime: any) => VALUE;
                init: ((value: VALUE, supplies: any) => void) | undefined;
                lazy: boolean | undefined;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            }> extends true ? unknown : {
                name: NAME;
                suppliers: [...FilterSuppliers<THIS["suppliers"], WITH_SUPPLIERS>, ...WITH_SUPPLIERS];
                justInTime: any;
                factory: (supplies: any, justInTime: any) => VALUE;
                init: ((value: VALUE, supplies: any) => void) | undefined;
                lazy: boolean | undefined;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            };
            jitOnly: <THIS>(this: THIS) => THIS & {
                _jitOnly: true;
            };
            prototype: <THIS extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, SUPPLIERS_OF_PROTOTYPE extends Supplier<string, any, any, any, any, any, false>[] = [], JUST_IN_TIME_OF_PROTOTYPE extends Supplier<string, any, any, any, any, any, false>[] = []>(this: THIS, config: {
                factory: (supplies: $<SUPPLIERS_OF_PROTOTYPE>, justInTime: MapFromList<[...JUST_IN_TIME_OF_PROTOTYPE]>) => VALUE;
                suppliers?: [...SUPPLIERS_OF_PROTOTYPE];
                justInTime?: [...JUST_IN_TIME_OF_PROTOTYPE];
                init?: (value: VALUE, supplies: $<SUPPLIERS_OF_PROTOTYPE>) => void;
                lazy?: boolean;
            }) => HasCircularDependency<{
                name: NAME;
                suppliers: SUPPLIERS_OF_PROTOTYPE;
                justInTime: JUST_IN_TIME_OF_PROTOTYPE;
                factory: (supplies: $<SUPPLIERS_OF_PROTOTYPE>, justInTime: MapFromList<[...JUST_IN_TIME_OF_PROTOTYPE]>) => VALUE;
                init: ((value: VALUE, supplies: $<SUPPLIERS_OF_PROTOTYPE>) => void) | undefined;
                lazy: boolean;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            }> extends true ? unknown : {
                name: NAME;
                suppliers: SUPPLIERS_OF_PROTOTYPE;
                justInTime: JUST_IN_TIME_OF_PROTOTYPE;
                factory: (supplies: $<SUPPLIERS_OF_PROTOTYPE>, justInTime: MapFromList<[...JUST_IN_TIME_OF_PROTOTYPE]>) => VALUE;
                init: ((value: VALUE, supplies: $<SUPPLIERS_OF_PROTOTYPE>) => void) | undefined;
                lazy: boolean;
                pack: <THIS_1 extends ProductSupplier<NAME, VALUE, any, any, any, any, any>, NEW_VALUE_2 extends VALUE>(this: THIS_1, value: NEW_VALUE_2) => {
                    name: NAME;
                    supplies: {};
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    _dependsOnOneOf: () => boolean;
                    unpack: () => NonNullable<NEW_VALUE_2>;
                    reassemble<THIS_2 extends Product<NAME, NEW_VALUE_2, $<SUPPLIERS>>>(this: THIS_2): THIS_2;
                    _product: true;
                    _supplier: THIS_1;
                };
                assemble: <THIS_1 extends ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], any, any, any, any>>(this: THIS_1, toSupply: ToSupply<THIS_1["suppliers"]>) => {
                    name: NAME;
                    supplies: $<THIS_1["suppliers"]>;
                    pack: <THIS_2 extends Product<NAME, VALUE, $<SUPPLIERS>>, NEW_VALUE_3 extends VALUE>(this: THIS_2, value: NEW_VALUE_3) => {
                        name: NAME;
                        supplies: {};
                        pack: (value: VALUE) => Product<NAME, VALUE, $<SUPPLIERS>>;
                        unpack: () => NEW_VALUE_3;
                        reassemble<THIS_3 extends Product<NAME, NEW_VALUE_3, $<SUPPLIERS>>>(this: THIS_3): THIS_3;
                        _dependsOnOneOf: (overrides: SupplyMap) => boolean;
                        _product: true;
                        _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
                    };
                    unpack: () => ReturnType<THIS_1["factory"]>;
                    reassemble<THIS_2 extends Product<NAME, VALUE, any>>(this: THIS_2, overrides: SupplyMap): THIS_2 & {
                        supplies: $<THIS_1["suppliers"]>;
                        unpack: () => ReturnType<THIS_1["factory"]>;
                    };
                    _dependsOnOneOf(this: Product<any, any, any>, overrides: SupplyMap): boolean;
                    _product: true;
                    _supplier: THIS_1;
                };
                jitOnly: <THIS_1>(this: THIS_1) => THIS_1 & {
                    _jitOnly: true;
                };
                _isPrototype: true;
                _product: true;
            };
            _isPrototype: IS_PROTOTYPE;
            _product: true;
        };
    };
};

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
export declare type ExcludeSuppliersType<SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[], TYPE extends ProductSupplier<string, any, any, any, any, any> | ResourceSupplier<string, any>> = SUPPLIERS extends readonly [infer Head, ...infer Tail] ? Head extends TYPE ? Tail extends Supplier<string, any, any, any, any, any, any>[] ? ExcludeSuppliersType<Tail, TYPE> : [] : Tail extends Supplier<string, any, any, any, any, any, any>[] ? [Head, ...ExcludeSuppliersType<Tail, TYPE>] : [Head] : [];

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
export declare type FilterSuppliers<OLD extends Supplier<string, any, any, any, any, any, any>[], NEW extends ProductSupplier<string, any, any, any, any, any, any>[]> = OLD extends [infer Head, ...infer Tail] ? Tail extends Supplier<string, any, any, any, any, any, any>[] ? Head extends {
    name: NEW[number]["name"];
} ? FilterSuppliers<Tail, NEW> : [Head, ...FilterSuppliers<Tail, NEW>] : Head extends {
    name: NEW[number]["name"];
} ? [] : [Head] : [];

/**
 * Checks if a supplier has a circular dependency by seeing if its name appears
 * in the transitive dependencies of its own suppliers.
 * This prevents infinite loops during dependency resolution.
 * @public
 */
export declare type HasCircularDependency<SUPPLIER extends Pick<ProductSupplier<string, any, any, any, any, any, any>, "name" | "suppliers">> = SUPPLIER["name"] extends (TransitiveSuppliers<SUPPLIER["suppliers"]>[number] extends infer S ? S extends Supplier<string, any, any, any, any, any, any> ? S["name"] : never : never) ? true : false;

/**
 * Creates an indexed map from an array of objects with name properties.
 * This is used internally to convert supplier arrays into lookup maps for
 * type-safe access to just-in-time dependencies.
 *
 * The index function transforms an array into a map where each element is
 * keyed by its `name` property, enabling efficient lookup and type inference.
 *
 * @typeParam LIST - An array type where each element has a `name` property
 * @param list - Array of objects with name properties
 * @returns A map where keys are the name properties and values are the objects
 * @public
 * @example
 * ```typescript
 * const suppliers = [
 *   { name: "userRepo", type: "repository" },
 *   { name: "logger", type: "service" }
 * ]
 * const indexed = index(...suppliers)
 * // Result: {
 * //   userRepo: { name: "userRepo", type: "repository" },
 * //   logger: { name: "logger", type: "service" }
 * // }
 *
 * // Type-safe access
 * indexed.userRepo // { name: "userRepo", type: "repository" }
 * indexed.logger   // { name: "logger", type: "service" }
 * ```
 */
export declare function index<LIST extends {
    name: string;
}[]>(...list: LIST): MapFromList<LIST>;

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
export declare type MapFromList<LIST extends {
    name: string;
}[]> = LIST extends [] ? Record<never, never> : Merge<{
    [K in keyof LIST]: {
        [NAME in LIST[K]["name"]]: LIST[K];
    };
}[number]>;

/**
 * Merges a union type into a single intersection type.
 * This utility type is used internally to combine multiple types into one cohesive type.
 * @typeParam U - The union type to merge
 * @returns An intersection type that combines all members of the union
 * @public
 */
export declare type Merge<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

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
export declare type Product<NAME extends string, VALUE, SUPPLIES extends SupplyMap> = {
    /** The name/identifier of this product */
    name: NAME;
    /** The resolved dependencies this product was assembled with */
    supplies: SUPPLIES;
    /** Unpacks and returns the current value of this product */
    unpack: () => VALUE;
    /** Packs a new value into this product, returning a new product instance */
    pack: (value: VALUE) => Product<NAME, VALUE, SUPPLIES>;
    /** Reassembles this product with new dependency overrides */
    reassemble: (overrides: SupplyMap) => Product<NAME, VALUE, SUPPLIES>;
    /** Checks if this product depends on any of the given overrides */
    _dependsOnOneOf: (overrides: SupplyMap) => boolean;
    /** Type marker indicating this is a product */
    _product: true;
    /** The supplier that created this product */
    _supplier: ProductSupplier<NAME, VALUE, any, any, any, any, any>;
};

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
export declare type ProductSupplier<NAME extends string, VALUE, SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[] = [], JUST_IN_TIME extends Supplier<string, any, any, any, any, any, any>[] = [], SUPPLIES extends $<SUPPLIERS> = $<SUPPLIERS>, JUST_IN_TIME_MAP extends MapFromList<[...JUST_IN_TIME]> = MapFromList<[
...JUST_IN_TIME
]>, IS_PROTOTYPE extends boolean = false> = {
    /** The name/identifier of this product supplier */
    name: NAME;
    /** Array of suppliers this product depends on */
    suppliers: SUPPLIERS;
    /** Array of suppliers resolved just-in-time (not automatically assembled) */
    justInTime: JUST_IN_TIME;
    /** Factory function that creates the product value from its dependencies */
    factory: (supplies: SUPPLIES, justInTime: JUST_IN_TIME_MAP) => VALUE;
    /** Assembles the product by resolving dependencies */
    assemble: (toSupply: ToSupply<SUPPLIERS>) => Product<NAME, VALUE, SUPPLIES>;
    /** Packs a value into a product without dependencies */
    pack: (value: VALUE) => Product<NAME, VALUE, Record<never, never>>;
    /** Tries alternative suppliers for dependencies */
    try?: (...suppliers: ProductSupplier<string, any, any, any, any, any, true>[]) => ProductSupplier<NAME, VALUE, any, any, any, any, true>;
    /** Replaces specific dependencies with new ones */
    with?: (...suppliers: ProductSupplier<string, any, any, any, any, any, false>[]) => ProductSupplier<NAME, VALUE, any, any, any, any, true>;
    /** Marks this supplier as just-in-time only */
    jitOnly: () => ProductSupplier<NAME, VALUE, any, any, any, any, false>;
    /** Creates a prototype variant with different implementation */
    prototype?: ({ factory, suppliers, justInTime, init, lazy }: {
        factory: (supplies: $<Supplier<string, any, any, any, any, any, any>[]>, justInTime: MapFromList<Supplier<string, any, any, any, any, any, any>[]>) => VALUE;
        suppliers?: Supplier<string, any, any, any, any, any, any>[];
        justInTime?: Supplier<string, any, any, any, any, any, any>[];
        init?: (value: VALUE, supplies: $<Supplier<string, any, any, any, any, any, any>[]>) => void;
        lazy?: boolean;
    }) => ProductSupplier<NAME, VALUE, Supplier<string, any, any, any, any, any, any>[], Supplier<string, any, any, any, any, any, any>[], any, any, true>;
    /** Optional initialization function called after factory */
    init?: (value: VALUE, supplies: SUPPLIES) => void;
    /** Whether this supplier should be lazily evaluated */
    lazy?: boolean;
    /** Whether this supplier is a prototype variant */
    _isPrototype: IS_PROTOTYPE;
    /** Type marker indicating this is a product supplier */
    _product: true;
};

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
export declare type Resource<NAME extends string, VALUE> = {
    /** The name/identifier of this resource */
    name: NAME;
    /** Packs a new value into this resource, returning a new resource instance */
    pack: (value: VALUE) => Resource<NAME, VALUE>;
    /** Unpacks and returns the current value of this resource */
    unpack(): VALUE;
    /** Type marker indicating this is a resource */
    _resource: true;
};

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
export declare type ResourceSupplier<NAME extends string, CONSTRAINT> = {
    /** The name/identifier of this resource supplier */
    name: NAME;
    /** Packs a value into a resource, creating a new resource instance */
    pack: (value: CONSTRAINT) => Resource<NAME, CONSTRAINT>;
    /** Type marker indicating this is a resource supplier */
    _resource: true;
    /** The constraint type for values this supplier can pack */
    _constraint: CONSTRAINT;
};

/**
 * Creates a promise that resolves after the specified number of milliseconds.
 * This is useful for adding delays in async operations or testing time-dependent behavior.
 *
 * Note: This is a simple utility function and not directly related to the core commodity
 * dependency injection functionality.
 *
 * @param ms - Number of milliseconds to wait
 * @returns A promise that resolves after the delay with undefined
 * @internal
 * @example
 * ```typescript
 * // Simple delay
 * await sleep(1000) // Wait for 1 second
 * console.log("1 second later")
 *
 * // In async initialization
 * const service = market.offer("service").asProduct({
 *   suppliers: [],
 *   factory: () => new Service(),
 *   init: async (service) => {
 *     await sleep(100) // Small delay before initialization
 *     await service.connect()
 *   }
 * })
 * ```
 */
export declare function sleep(ms: number): Promise<unknown>;

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
export declare type Supplier<NAME extends string, VALUE, SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[], JUST_IN_TIME extends Supplier<string, any, any, any, any, any, any>[], SUPPLIES extends $<SUPPLIERS>, JUST_IN_TIME_MAP extends MapFromList<[...JUST_IN_TIME]>, IS_PROTOTYPE extends boolean> = ProductSupplier<NAME, VALUE, SUPPLIERS, JUST_IN_TIME, SUPPLIES, JUST_IN_TIME_MAP, IS_PROTOTYPE> | ResourceSupplier<NAME, VALUE>;

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
export declare type SupplyMap = Record<string, Product<string, any, any> | Resource<string, any>>;

/**
 * Converts an array of suppliers into a supply map with the correct product/resource types.
 * This type transformation ensures that each supplier is mapped to its corresponding
 * assembled product or resource, maintaining full type safety.
 *
 * @typeParam SUPPLIERS - Array of supplier types to convert into a supply map
 * @returns A map where keys are supplier names and values are their assembled products/resources
 * @public
 */
export declare type SupplyMapFromSuppliers<SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[]> = {
    [SUPPLIER in SUPPLIERS[number] as SUPPLIER["name"]]: SUPPLIER extends ProductSupplier<infer NAME, infer VALUE, any, any, infer SUPPLIES, any, any> ? Product<NAME, VALUE, SUPPLIES> : SUPPLIER extends ResourceSupplier<infer NAME, infer VALUE> ? Resource<NAME, VALUE> : never;
};

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
export declare type ToSupply<SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[]> = SupplyMapFromSuppliers<ExcludeSuppliersType<TransitiveSuppliers<SUPPLIERS>, ProductSupplier<string, any, any, any, any, any, any>>>;

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
export declare type TransitiveSuppliers<SUPPLIERS extends Supplier<string, any, any, any, any, any, any>[]> = SUPPLIERS extends [infer FIRST, ...infer REST] ? FIRST extends ProductSupplier<string, any, infer CHILD_SUPPLIERS, any, any, any, any> ? [
FIRST,
...TransitiveSuppliers<CHILD_SUPPLIERS>,
...TransitiveSuppliers<REST extends Supplier<string, any, any, any, any, any, any>[] ? REST : []>
] : FIRST extends ResourceSupplier<string, any> ? [
FIRST,
...TransitiveSuppliers<REST extends Supplier<string, any, any, any, any, any, any>[] ? REST : []>
] : never : [];

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
export declare type TrySuppliers<OLD extends Supplier<string, any, any, any, any, any, any>[], NEW extends ProductSupplier<string, any, any, any, any, any, any>[]> = OLD extends [infer Head, ...infer Tail] ? Tail extends Supplier<string, any, any, any, any, any, any>[] ? Head extends {
    name: NEW[number]["name"];
} ? [
Extract<NEW[number], {
    name: Head["name"];
}>,
...TrySuppliers<Tail, NEW>
] : [
Head,
...TrySuppliers<Tail, NEW>
] : Head extends {
    name: NEW[number]["name"];
} ? [Extract<NEW[number], {
    name: Head["name"];
}>] : [Head] : [];

export { }
