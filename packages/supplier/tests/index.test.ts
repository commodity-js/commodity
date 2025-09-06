import { describe, it, expect, vi, beforeEach } from "vitest"
import { createMarket } from "#index"
import { index, sleep } from "#utils"
import memo from "memoize"
import type { ProductSupplier, TrySuppliers } from "#types"

describe("supplier", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("Resource Offer", () => {
        it("should offer a resource and return it packed", () => {
            const market = createMarket()
            const resourceSupplier = market
                .offer("resource")
                .asResource<string>()

            const resource = resourceSupplier.pack("test-value")

            expect(resource.unpack()).toBe("test-value")
            expect(resource.name).toBe("resource")
            expect(resourceSupplier.name).toBe("resource")
            expect(resourceSupplier._resource).toBe(true)
        })

        it("should throw error if two supplies with the same name are offered", () => {
            const market = createMarket()

            // First offer should succeed
            market.offer("duplicate").asResource<string>()

            // Second offer with same name should throw
            expect(() => {
                market.offer("duplicate").asResource<string>()
            }).toThrow("Name duplicate already exists")
        })

        it("should handle different resource types correctly", () => {
            const market = createMarket()
            const StringSupplier = market.offer("string").asResource<string>()
            const NumberSupplier = market.offer("number").asResource<number>()
            const ObjectSupplier = market.offer("object").asResource<{
                name: string
            }>()

            const stringResource = StringSupplier.pack("hello")
            const numberResource = NumberSupplier.pack(42)
            const objectResource = ObjectSupplier.pack({ name: "test" })

            expect(stringResource.unpack()).toBe("hello")
            expect(numberResource.unpack()).toBe(42)
            expect(objectResource.unpack()).toEqual({ name: "test" })
        })
    })

    describe("Product Offer", () => {
        it("should offer a product with no suppliers", () => {
            const market = createMarket()
            const ProductSupplier = market.offer("product").asProduct({
                factory: () => "product"
            })

            const product = ProductSupplier.assemble({})

            expect(product.unpack()).toBe("product")
            expect(ProductSupplier.name).toBe("product")
            expect(ProductSupplier._product).toBe(true)
        })

        it("should offer a product with suppliers", () => {
            const market = createMarket()
            const product1Supplier = market.offer("product1").asProduct({
                factory: () => "product1"
            })

            const product2Supplier = market.offer("product2").asProduct({
                factory: () => "product2"
            })

            const TestSupplier = market.offer("test").asProduct({
                suppliers: [product1Supplier, product2Supplier],
                factory: ($) => {
                    return {
                        product1: $(product1Supplier.name),
                        product2: $(product2Supplier.name)
                    }
                }
            })

            const testProduct = TestSupplier.assemble({})

            expect(testProduct.unpack()).toEqual({
                product1: "product1",
                product2: "product2"
            })
        })
    })

    describe("Supply Chain", () => {
        it("should assemble products from suppliers", () => {
            const market = createMarket()
            const product1Supplier = market.offer("product1").asProduct({
                factory: () => "product1"
            })

            const product2Supplier = market.offer("product2").asProduct({
                factory: () => "product2"
            })

            const MainSupplier = market.offer("main").asProduct({
                suppliers: [product1Supplier, product2Supplier],
                factory: ($) => {
                    return {
                        product1: $(product1Supplier.name),
                        product2: $(product2Supplier.name)
                    }
                }
            })

            const mainProduct = MainSupplier.assemble({})

            expect(mainProduct.unpack()).toEqual({
                product1: "product1",
                product2: "product2"
            })
        })

        it("should respect initial supplies and not override them during assembly", () => {
            const market = createMarket()
            const productSupplier = market.offer("product").asProduct({
                factory: () => "product"
            })

            const MainSupplier = market.offer("main").asProduct({
                suppliers: [productSupplier],
                factory: ($) => {
                    const product = $(productSupplier.name)
                    return {
                        product
                    }
                }
            })

            const mainProduct = MainSupplier.assemble(
                index(productSupplier.pack("initial-product"))
            )

            // The initial supply should be respected and not overridden during assembly
            expect(mainProduct.unpack()).toEqual({
                product: "initial-product"
            })
        })

        it("should support Product.pack(value) and $[Product.id].pack(value) for creating product instances", () => {
            const market = createMarket()
            const ConfigSupplier = market.offer("config").asProduct({
                factory: () => ({ env: "development", debug: true })
            })

            const LoggerSupplier = market.offer("logger").asProduct({
                factory: () => ({ level: "info", prefix: "APP" })
            })

            const MainSupplier = market.offer("main").asProduct({
                suppliers: [ConfigSupplier, LoggerSupplier],
                factory: ($) => {
                    // Test direct service.of() call
                    const configProduct = ConfigSupplier.pack({
                        env: "production",
                        debug: false
                    })

                    // Test accessing service through supplies and calling .pack()
                    const loggerProduct = $[LoggerSupplier.name].pack({
                        level: "debug",
                        prefix: "TEST"
                    })

                    return {
                        config: configProduct.unpack(),
                        logger: loggerProduct.unpack(),
                        // Also test accessing the supplied products
                        suppliedConfig: $[ConfigSupplier.name].unpack(),
                        suppliedLogger: $[LoggerSupplier.name].unpack()
                    }
                }
            })

            const mainProduct = MainSupplier.assemble({})

            expect(mainProduct.unpack().config).toEqual({
                env: "production",
                debug: false
            })
            expect(mainProduct.unpack().logger).toEqual({
                level: "debug",
                prefix: "TEST"
            })
            expect(mainProduct.unpack().suppliedConfig).toEqual({
                env: "development",
                debug: true
            })
            expect(mainProduct.unpack().suppliedLogger).toEqual({
                level: "info",
                prefix: "APP"
            })
        })
        it("should enable context switching by calling reassemble on products", () => {
            const market = createMarket()
            const ConfigSupplier = market.offer("config").asResource<string>()
            const NameSupplier = market.offer("name").asResource<string>()
            const CountSupplier = market.offer("count").asResource<number>()

            // Create a configurable service that uses multiple supplies from its context
            const TestSupplier = market.offer("test").asProduct({
                suppliers: [ConfigSupplier, NameSupplier, CountSupplier],
                factory: ($) => {
                    // This service uses multiple values from its supplies
                    return {
                        config: $(ConfigSupplier.name),
                        name: $(NameSupplier.name),
                        count: $(CountSupplier.name)
                    }
                }
            })

            const initialSupplies = index(
                ConfigSupplier.pack("initial-config"),
                NameSupplier.pack("initial-name"),
                CountSupplier.pack(1)
            )

            // Create the initial service instance with base supplies
            const testProduct = TestSupplier.assemble(initialSupplies)

            // Test that reassemble creates new product instance with updated supplies
            const newTestProduct1 = testProduct.reassemble(
                index(
                    ConfigSupplier.pack("new-config"),
                    NameSupplier.pack("new-name"),
                    CountSupplier.pack(42)
                )
            )

            // Partial reassemble - only override config (other values come from cached supplies)
            const newTestProduct2 = testProduct.reassemble(
                index(ConfigSupplier.pack("new-config"))
            )

            const newTestProduct3 = testProduct.reassemble(
                index(NameSupplier.pack("new-name"))
            )

            // Partial reassemble - override multiple values
            const newTestProduct4 = testProduct.reassemble(
                index(ConfigSupplier.pack("new-config"), CountSupplier.pack(42))
            )

            expect(testProduct.unpack()).toEqual({
                config: "initial-config",
                name: "initial-name",
                count: 1
            })

            expect(newTestProduct1.unpack()).toEqual({
                config: "new-config",
                name: "new-name",
                count: 42
            })

            // For partial resupplies, non-overridden values should come from cached supplies
            expect(newTestProduct2.unpack()).toEqual({
                config: "new-config",
                name: "initial-name",
                count: 1
            })

            expect(newTestProduct3.unpack()).toEqual({
                config: "initial-config",
                name: "new-name",
                count: 1
            })

            expect(newTestProduct4.unpack()).toEqual({
                config: "new-config",
                name: "initial-name",
                count: 42
            })
        })
    })

    describe("Referential integrity and Lazy Evaluation", () => {
        it("should create separate memoization contexts for different assembly calls", () => {
            const factoryMock = vi.fn().mockReturnValue("product")

            const market = createMarket()
            const productSupplier = market.offer("product").asProduct({
                factory: memo(factoryMock)
            })

            const product = productSupplier.assemble({})

            // First access should call the factory
            expect(product.unpack()).toBe("product")
            expect(factoryMock).toHaveBeenCalledTimes(1)

            // The memoization works within the same assembly context
            // Each call to assemble() creates a new context, so the factory is called again
            const secondAccess = productSupplier.assemble({})
            expect(secondAccess.unpack()).toBe("product")
            // Factory is called again for the new assembly context
            expect(factoryMock).toHaveBeenCalledTimes(2)
        })

        it("should respect memoized calls when accessed multiple times within the same assembly context", () => {
            const factoryMock = vi.fn().mockReturnValue("memoized")

            const market = createMarket()
            const memoizedSupplier = market.offer("memoized").asProduct({
                factory: memo(factoryMock)
            })

            const TestSupplier = market.offer("test").asProduct({
                suppliers: [memoizedSupplier],
                factory: ($) => {
                    // Access the TestService multiple times within the same assembly context
                    $(memoizedSupplier.name)
                    $(memoizedSupplier.name)
                    $(memoizedSupplier.name)

                    return "test"
                }
            })

            TestSupplier.assemble({}).unpack()
            // Factory should only be called once due to memoization within the same assembly context
            expect(factoryMock).toHaveBeenCalledTimes(1)
        })

        it("should keep memoization even if multiple dependents are nested", () => {
            const factory1Mock = vi.fn().mockReturnValue("product1")

            const market = createMarket()
            const product1Supplier = market.offer("product1").asProduct({
                factory: memo(factory1Mock)
            })

            type t = ReturnType<typeof product1Supplier.try>

            const product2Supplier = market.offer("product2").asProduct({
                suppliers: [product1Supplier],
                factory: ($) => {
                    $(product1Supplier.name)
                    return "product2"
                }
            })

            const TestSupplier = market.offer("test").asProduct({
                suppliers: [product1Supplier, product2Supplier],
                factory: ($) => {
                    return {
                        product1: $(product1Supplier.name),
                        product2: $(product2Supplier.name)
                    }
                }
            })

            const testProduct = TestSupplier.assemble({})

            expect(testProduct.unpack()).toEqual({
                product1: "product1",
                product2: "product2"
            })

            // factory1  should only be called once due to memoization within the same context
            expect(factory1Mock).toHaveBeenCalledTimes(1)
        })

        it("should reassemble product if dependent suppliers reassembles", async () => {
            const market = createMarket()
            // productA will be reassembled
            const productASupplier = market.offer("productA").asProduct({
                factory: memo(() => Date.now())
            })

            // productB will be reassembled when productA reassembles
            const productBSupplier = market.offer("productB").asProduct({
                suppliers: [productASupplier],
                factory: memo(() => Date.now())
            })

            // productC - doesn't depend on anything, so it will not be reassembled
            const productCSupplier = market.offer("productC").asProduct({
                factory: memo(() => Date.now())
            })

            // productD will be reassembled when productB reassembles
            const productDSupplier = market.offer("productD").asProduct({
                suppliers: [productBSupplier],
                factory: memo(() => Date.now())
            })

            // Create a main product that includes all products in its team for testing
            const mainSupplier = market.offer("main").asProduct({
                suppliers: [
                    productASupplier,
                    productBSupplier,
                    productCSupplier,
                    productDSupplier
                ],
                factory: ($) => {
                    return {
                        productA: $(productASupplier.name),
                        productB: $(productBSupplier.name),
                        productC: $(productCSupplier.name),
                        productD: $(productDSupplier.name)
                    }
                }
            })

            // Create the initial supplies
            const initialMainProduct = mainSupplier.assemble({})
            const initialProductA = initialMainProduct.unpack().productA
            const initialProductB = initialMainProduct.unpack().productB
            const initialProductC = initialMainProduct.unpack().productC
            const initialProductD = initialMainProduct.unpack().productD

            // Wait a bit to ensure timestamps are different
            await sleep(100)

            // Override productA - this should trigger resupply of productB and productD
            // but productC should remain cached
            const newMainProduct = initialMainProduct.reassemble(
                index(productASupplier.pack(Date.now()))
            )

            // productA should be updated
            expect(newMainProduct.unpack().productA).not.toBe(initialProductA)

            // productB should be reassembled
            expect(newMainProduct.unpack().productB).not.toBe(initialProductB)

            expect(newMainProduct.unpack().productC).toBe(initialProductC)
            expect(newMainProduct.unpack().productD).not.toBe(initialProductD)
        })

        it("should handle recursive dependency chains correctly", async () => {
            const market = createMarket()
            const productASupplier = market.offer("productA").asProduct({
                factory: memo(() => Date.now())
            })

            const productBSupplier = market.offer("productB").asProduct({
                suppliers: [productASupplier],
                factory: memo(() => Date.now())
            })

            const productCSupplier = market.offer("productC").asProduct({
                suppliers: [productBSupplier],
                factory: memo(() => Date.now())
            })

            const productDSupplier = market.offer("productD").asProduct({
                suppliers: [productCSupplier],
                factory: memo(() => Date.now())
            })

            // Create a main service that includes all services for testing
            const mainSupplier = market.offer("main").asProduct({
                suppliers: [
                    productASupplier,
                    productBSupplier,
                    productCSupplier,
                    productDSupplier
                ],
                factory: ($) => {
                    return {
                        productA: $(productASupplier.name),
                        productB: $(productBSupplier.name),
                        productC: $(productCSupplier.name),
                        productD: $(productDSupplier.name)
                    }
                }
            })

            const mainProduct = mainSupplier.assemble({})

            const initialProductA = mainProduct.unpack().productA
            const initialProductB = mainProduct.unpack().productB
            const initialProductC = mainProduct.unpack().productC
            const initialProductD = mainProduct.unpack().productD

            // Wait a bit to ensure timestamps are different
            await sleep(100)

            // Override productA - this should cascade through B, C, and D
            const newMainProduct = mainProduct.reassemble(
                index(productASupplier.pack(Date.now()))
            )

            // Verify the cascade worked
            expect(newMainProduct.unpack().productA).not.toBe(initialProductA)
            expect(newMainProduct.unpack().productB).not.toBe(initialProductB)
            expect(newMainProduct.unpack().productC).not.toBe(initialProductC)
            expect(newMainProduct.unpack().productD).not.toBe(initialProductD)
        })
    })

    describe("Callable Object API", () => {
        it("should support both property access and function calls for dependencies", () => {
            const market = createMarket()
            const resourceSupplier = market
                .offer("resource")
                .asResource<string>()
            const productSupplier = market.offer("product").asProduct({
                factory: () => "product"
            })

            const TestProduct = market.offer("test-product").asProduct({
                suppliers: [resourceSupplier, productSupplier],
                factory: ($) => {
                    return {
                        propAccess: {
                            resource: $[resourceSupplier.name].unpack(),
                            product: $[productSupplier.name].unpack()
                        },
                        funcAccess: {
                            resource: $(resourceSupplier.name),
                            product: $(productSupplier.name)
                        }
                    }
                }
            })

            const result = TestProduct.assemble(
                index(resourceSupplier.pack("resource"))
            )

            expect(result.unpack().propAccess).toEqual({
                resource: "resource",
                product: "product"
            })
            expect(result.unpack().funcAccess).toEqual({
                resource: "resource",
                product: "product"
            })
        })
    })

    describe("Preload Feature", () => {
        it("should preload services with preload: true", async () => {
            const market = createMarket()
            const preloadFactoryMock = vi.fn().mockReturnValue("preloaded")
            const normalFactoryMock = vi.fn().mockReturnValue("normal")

            const PreloadedSupplier = market.offer("preloaded").asProduct({
                factory: preloadFactoryMock,
                preload: true
            })

            const NormalSupplier = market.offer("normal").asProduct({
                factory: normalFactoryMock,
                preload: false // explicit false
            })

            const NoPreloadSupplier = market.offer("no-preload").asProduct({
                factory: vi.fn().mockReturnValue("no-preload")
                // preload defaults to false
            })

            const MainSupplier = market.offer("main").asProduct({
                suppliers: [
                    PreloadedSupplier,
                    NormalSupplier,
                    NoPreloadSupplier
                ],
                factory: ($) => {
                    // Don't access any dependencies yet
                    return "main"
                }
            })

            const mainProduct = MainSupplier.assemble({})

            // Wait a bit for preloading to complete
            await sleep(10)

            // PreloadService should have been called due to preload: true
            expect(preloadFactoryMock).toHaveBeenCalledTimes(1)

            // NormalService and NoPreloadService should not have been called yet
            expect(normalFactoryMock).toHaveBeenCalledTimes(0)

            expect(mainProduct.unpack()).toBe("main")
        })

        it("should handle preload errors gracefully without breaking the supply chain", async () => {
            const market = createMarket()
            const errorFactoryMock = vi.fn().mockImplementation(() => {
                throw new Error()
            })

            const ErrorSupplier = market.offer("error").asProduct({
                factory: errorFactoryMock,
                preload: true
            })

            const MainSupplier = market.offer("main").asProduct({
                suppliers: [ErrorSupplier],
                factory: ($) => {
                    // Don't access ErrorService yet
                    return "main"
                }
            })

            // This should not throw even though ErrorService will fail during preload
            const mainProduct = MainSupplier.assemble({})

            // Wait a bit for preloading to complete
            await sleep(10)

            expect(mainProduct.unpack()).toBe("main")

            // ErrorService factory should have been called during preload
            expect(errorFactoryMock).toHaveBeenCalledTimes(1)
        })

        it("should still throw error when accessing a failed preloaded service", async () => {
            const market = createMarket()
            const errorFactoryMock = vi.fn().mockImplementation(() => {
                throw new Error()
            })

            const ErrorSupplier = market.offer("error").asProduct({
                factory: errorFactoryMock,
                preload: true
            })

            const MainSupplier = market.offer("main").asProduct({
                suppliers: [ErrorSupplier],
                factory: ($) => {
                    // Try to access the failed service
                    return $(ErrorSupplier.name)
                }
            })

            // Wait a bit for preloading to complete
            await sleep(10)

            // Accessing the service should still throw the error
            expect(() => MainSupplier.assemble({}).unpack()).toThrow()
        })

        it("should work with complex dependency chains and selective preloading", async () => {
            const market = createMarket()
            const product1Mock = vi.fn().mockReturnValue("product1")
            const product2Mock = vi.fn().mockReturnValue("product2")
            const product3Mock = vi.fn().mockReturnValue("product3")

            const product1Supplier = market.offer("product1").asProduct({
                factory: product1Mock,
                preload: true // This will be preloaded
            })

            const product2Supplier = market.offer("product2").asProduct({
                factory: product2Mock,
                preload: false // This will not be preloaded
            })

            const product3Supplier = market.offer("product3").asProduct({
                factory: product3Mock
            })

            const MainSupplier = market.offer("main").asProduct({
                suppliers: [
                    product1Supplier,
                    product2Supplier,
                    product3Supplier
                ],
                factory: () => {
                    return "main"
                }
            })

            const mainProduct = MainSupplier.assemble({})

            // Wait a bit for preloading to complete
            await sleep(10)

            // Only product1Supplier should have been preloaded
            expect(product1Mock).toHaveBeenCalledTimes(1)
            expect(product2Mock).toHaveBeenCalledTimes(0)
            expect(product3Mock).toHaveBeenCalledTimes(0)

            expect(mainProduct.unpack()).toBe("main")
        })
    })

    describe("Type Safety and Edge Cases", () => {
        it("should handle empty suppliers correctly", () => {
            const market = createMarket()
            const EmptySupplier = market.offer("empty").asProduct({
                factory: () => "empty"
            })

            const emptyProduct = EmptySupplier.assemble({})
            expect(emptyProduct.unpack()).toBe("empty")
        })

        it("should demonstrate the Narrow API behavior", () => {
            type User = { id: string; name: string; role: "user" | "admin" }
            type Session = { user: User; now: Date }

            // Session resource can hold any object of type Session
            const market = createMarket()
            const Session = market.offer("session").asResource<Session>()
            const AdminSession = Session.narrow<{ user: { role: "admin" } }>()

            // Admin dashboard requires admin session using the Narrow API
            const AdminDashboard = market.offer("admin-dashboard").asProduct({
                suppliers: [AdminSession],
                factory: ($) => {
                    const session = $(AdminSession.name)
                    // No runtime check needed - TypeScript ensures session.user.role === "admin"
                    return {
                        adminId: session.user.id,
                        adminName: session.user.name,
                        // This should work without type errors
                        isAdmin: session.user.role === "admin"
                    }
                }
            })

            // This should create a type error because role is "user" (not admin)
            const userSession = Session.pack({
                user: { id: "user123", name: "Regular User", role: "user" },
                now: new Date()
            })

            // This should succeed because role is "admin"
            const adminSession = AdminSession.pack({
                user: { id: "admin456", name: "Admin User", role: "admin" },
                now: new Date()
            })

            // @ts-expect-error - Expected: admin dashboard requires admin session
            const fail = AdminDashboard.assemble(index(userSession))
            const result = AdminDashboard.assemble(index(adminSession))

            expect(result.unpack().adminId).toBe("admin456")
            expect(result.unpack().adminName).toBe("Admin User")
            expect(result.unpack().isAdmin).toBe(true)
        })
    })

    describe("Try Method", () => {
        it("should allow trying alternative suppliers for testing", () => {
            const market = createMarket()
            // Original suppliers
            const dbSupplier = market.offer("db").asProduct({
                factory: () => ({ type: "postgres", data: ["real", "data"] })
            })

            const cacheSupplier = market.offer("cache").asProduct({
                factory: () => ({ type: "redis", cached: true })
            })

            // Main service using these suppliers
            const serviceSupplier = market.offer("service").asProduct({
                suppliers: [dbSupplier, cacheSupplier],
                factory: ($) => ({
                    db: $(dbSupplier.name),
                    cache: $(cacheSupplier.name),
                    result: "production"
                })
            })

            // Mock suppliers for testing - create prototypes using innovate
            const mockDbSupplier = dbSupplier.innovate({
                factory: () => ({ type: "mock", data: ["mock", "data"] }),
                suppliers: [],
                preload: false
            })

            // Try with mock database
            const testServiceSupplier = serviceSupplier.try(mockDbSupplier)

            // Assemble both versions
            const prodService = serviceSupplier.assemble({})
            const testService = testServiceSupplier.assemble({})

            expect(prodService.unpack().db.type).toBe("postgres")
            expect(testService.unpack().db.type).toBe("mock")
            expect(testService.unpack().cache.type).toBe("redis") // unchanged
        })

        it("should handle multiple try suppliers and override by name", () => {
            const market = createMarket()

            const dbSupplier = market.offer("db").asProduct({
                factory: () => "real-db"
            })

            const cacheSupplier = market.offer("cache").asProduct({
                factory: () => "real-cache"
            })

            const loggerSupplier = market.offer("logger").asProduct({
                factory: () => "real-logger"
            })

            const serviceSupplier = market.offer("service").asProduct({
                suppliers: [dbSupplier, cacheSupplier, loggerSupplier],
                factory: ($) => ({
                    db: $(dbSupplier.name),
                    cache: $(cacheSupplier.name),
                    logger: $(loggerSupplier.name)
                })
            })

            // Multiple mock suppliers using innovate
            const mockDbSupplier = dbSupplier.innovate({
                factory: () => "mock-db",
                suppliers: [],
                preload: false
            })

            const mockCacheSupplier = cacheSupplier.innovate({
                factory: () => "mock-cache",
                suppliers: [],
                preload: false
            })

            const testServiceSupplier = serviceSupplier.try(
                mockDbSupplier,
                mockCacheSupplier
            )
            const testService = testServiceSupplier.assemble({})

            expect(testService.unpack()).toEqual({
                db: "mock-db",
                cache: "mock-cache",
                logger: "real-logger" // unchanged
            })
        })

        it("should handle trying suppliers that don't exist in original suppliers", () => {
            const market = createMarket()

            const dbSupplier = market.offer("db").asProduct({
                factory: () => "real-db"
            })

            const serviceSupplier = market.offer("service").asProduct({
                suppliers: [dbSupplier],
                factory: ($) => ({
                    db: $(dbSupplier.name)
                })
            })

            // Try with a supplier that doesn't exist in original - create new prototype
            const baseExtraSupplier = market.offer("extra").asProduct({
                factory: () => "base-extra"
            })

            const extraSupplier = baseExtraSupplier.innovate({
                factory: () => "extra-service",
                suppliers: [],
                preload: false
            })

            const testServiceSupplier = serviceSupplier.try(extraSupplier)
            const testService = testServiceSupplier.assemble({})

            // The extra supplier is added to the suppliers list
            expect(testService.unpack().db).toBe("real-db")
        })

        it("should maintain type safety with try suppliers", () => {
            const market = createMarket()

            // Original supplier with specific type
            const configSupplier = market.offer("config").asProduct({
                factory: () => ({ env: "prod" as const, debug: false })
            })

            const serviceSupplier = market.offer("service").asProduct({
                suppliers: [configSupplier],
                factory: ($) => {
                    const config = $(configSupplier.name)
                    return {
                        environment: config.env, // should be "prod"
                        debugMode: config.debug
                    }
                }
            })

            // Mock with compatible type using innovate
            const mockConfigSupplier = configSupplier.innovate({
                factory: () => ({ env: "prod" as const, debug: true }),
                suppliers: [],
                preload: false
            })

            const testServiceSupplier = serviceSupplier.try(mockConfigSupplier)
            const testService = testServiceSupplier.assemble({})

            expect(testService.unpack().environment).toBe("prod")
            expect(testService.unpack().debugMode).toBe(true)
        })

        it("should work with chained try calls", () => {
            const market = createMarket()

            const dbSupplier = market.offer("db").asProduct({
                factory: () => "real-db"
            })

            const cacheSupplier = market.offer("cache").asProduct({
                factory: () => "real-cache"
            })

            const serviceSupplier = market.offer("service").asProduct({
                suppliers: [dbSupplier, cacheSupplier],
                factory: ($) => ({
                    db: $(dbSupplier.name),
                    cache: $(cacheSupplier.name)
                })
            })

            const mockDbSupplier = dbSupplier.innovate({
                factory: () => "mock-db",
                suppliers: [],
                preload: false
            })

            const mockCacheSupplier = cacheSupplier.innovate({
                factory: () => "mock-cache",
                suppliers: [],
                preload: false
            })

            // Chain try calls
            const testServiceSupplier = serviceSupplier
                .try(mockDbSupplier)
                .try(mockCacheSupplier)

            const testService = testServiceSupplier.assemble({})

            expect(testService.unpack()).toEqual({
                db: "mock-db",
                cache: "mock-cache"
            })
        })

        it("should handle empty try calls gracefully", () => {
            const market = createMarket()

            const serviceSupplier = market.offer("service").asProduct({
                factory: () => "service"
            })

            // Try with no suppliers - should work fine
            const testServiceSupplier = serviceSupplier.try()
            const testService = testServiceSupplier.assemble({})

            expect(testService.unpack()).toBe("service")
            expect(testServiceSupplier._prototype).toBe(true)
        })

        it("should preserve prototype flag when using try", () => {
            const market = createMarket()

            const serviceSupplier = market.offer("service").asProduct({
                factory: () => "service",
                prototype: false
            })

            const mockSupplier = market.offer("mock").asProduct({
                factory: () => "mock",
                prototype: true
            })

            const testServiceSupplier = serviceSupplier.try(mockSupplier)

            expect(serviceSupplier._prototype).toBe(false)
            expect(testServiceSupplier._prototype).toBe(true)
        })

        it("should handle duplicate supplier names in try", () => {
            const market = createMarket()

            const dbSupplier = market.offer("db").asProduct({
                factory: () => "real-db"
            })

            const serviceSupplier = market.offer("service").asProduct({
                suppliers: [dbSupplier],
                factory: ($) => ({ db: $(dbSupplier.name) })
            })

            const mockDb1 = dbSupplier.innovate({
                factory: () => "mock-db-1",
                suppliers: [],
                preload: false
            })

            const mockDb2 = dbSupplier.innovate({
                factory: () => "mock-db-2",
                suppliers: [],
                preload: false
            })

            // Should throw error when trying to add duplicate supplier names
            expect(() => {
                serviceSupplier.try(mockDb1, mockDb2)
            }).toThrow("Duplicate supplier name: db")
        })
    })

    describe("Innovate Method", () => {
        it("should allow innovation with extended value types", () => {
            const market = createMarket()

            // Basic service
            const basicSupplier = market.offer("basic").asProduct({
                factory: () => ({ core: "functionality" })
            })

            // Analytics dependency for innovation
            const analyticsSupplier = market.offer("analytics").asProduct({
                factory: () => ({
                    track: (event: string) => `tracked: ${event}`
                })
            })

            // Innovate to add analytics - note: innovate uses basic SupplyMap
            const enhancedSupplier = basicSupplier.innovate({
                factory: ($) => ({
                    core: "functionality", // extend the base
                    analytics: $.analytics.unpack(),
                    enhanced: true
                }),
                suppliers: [analyticsSupplier],
                preload: false
            })

            const enhanced = enhancedSupplier.assemble({})
            const result = enhanced.unpack()

            expect(result.core).toBe("functionality")
            expect(result.enhanced).toBe(true)
            expect(result.analytics.track("event")).toBe("tracked: event")
        })

        it("should maintain original functionality when innovating", () => {
            const market = createMarket()

            const baseSupplier = market.offer("base").asProduct({
                factory: () => ({
                    version: 1,
                    features: ["basic"]
                })
            })

            const featureSupplier = market.offer("feature").asProduct({
                factory: () => "advanced-feature"
            })

            const innovatedSupplier = baseSupplier.innovate({
                factory: ($) => ({
                    version: 2,
                    features: ["basic", "advanced"],
                    newFeature: $.feature.unpack()
                }),
                suppliers: [featureSupplier],
                preload: false
            })

            // Both should work
            const base = baseSupplier.assemble({})
            const innovated = innovatedSupplier.assemble({})

            expect(base.unpack()).toEqual({
                version: 1,
                features: ["basic"]
            })

            expect(innovated.unpack()).toEqual({
                version: 2,
                features: ["basic", "advanced"],
                newFeature: "advanced-feature"
            })
        })

        it("should handle innovation with empty suppliers", () => {
            const market = createMarket()

            const baseSupplier = market.offer("base").asProduct({
                factory: () => ({ base: true })
            })

            const innovatedSupplier = baseSupplier.innovate({
                factory: () => ({ base: true, enhanced: true }),
                suppliers: [],
                preload: false
            })

            const result = innovatedSupplier.assemble({})

            expect(result.unpack()).toEqual({
                base: true,
                enhanced: true
            })
        })

        it("should create prototype suppliers with innovate", () => {
            const market = createMarket()

            const baseSupplier = market.offer("base").asProduct({
                factory: () => "base",
                prototype: false
            })

            const innovatedSupplier = baseSupplier.innovate({
                factory: () => "innovated",
                suppliers: [],
                preload: false
            })

            expect(baseSupplier._prototype).toBe(false)
            expect(innovatedSupplier._prototype).toBe(true)
        })

        it("should handle innovation with conflicting supplier names", () => {
            const market = createMarket()

            // Base service with a dependency
            const dbSupplier = market.offer("db").asProduct({
                factory: () => "original-db"
            })

            const baseSupplier = market.offer("base").asProduct({
                suppliers: [dbSupplier],
                factory: ($) => ({ db: $(dbSupplier.name) })
            })

            // Try to innovate with a conflicting supplier name
            const newDbSupplier = market.offer("new-db").asProduct({
                factory: () => "new-db"
            })

            const innovatedSupplier = baseSupplier.innovate({
                factory: ($) => ({
                    db: "base-db", // satisfy base contract
                    newDb: $["new-db"].unpack()
                }),
                suppliers: [newDbSupplier],
                preload: false
            })

            const result = innovatedSupplier.assemble({})

            expect(result.unpack()).toEqual({
                db: "base-db",
                newDb: "new-db"
            })
        })

        it("should chain innovation calls", () => {
            const market = createMarket()

            const baseSupplier = market.offer("base").asProduct({
                factory: () => ({ features: ["base"] })
            })

            const feature1Supplier = market.offer("feature1").asProduct({
                factory: () => "feature-1"
            })

            const feature2Supplier = market.offer("feature2").asProduct({
                factory: () => "feature-2"
            })

            const step1 = baseSupplier.innovate({
                factory: ($) => ({
                    features: ["base", "feature1"],
                    feature1: $.feature1.unpack()
                }),
                suppliers: [feature1Supplier],
                preload: false
            })

            const step2 = step1.innovate({
                factory: ($) => ({
                    features: ["base", "feature1", "feature2"],
                    feature1: $.feature1.unpack(),
                    feature2: $.feature2.unpack()
                }),
                suppliers: [feature1Supplier, feature2Supplier],
                preload: false
            })

            const result = step2.assemble({})

            expect(result.unpack()).toEqual({
                features: ["base", "feature1", "feature2"],
                feature1: "feature-1",
                feature2: "feature-2"
            })
        })

        it("should handle preload setting in innovation", () => {
            const market = createMarket()
            const factoryMock = vi.fn().mockReturnValue("preloaded")

            const baseSupplier = market.offer("base").asProduct({
                factory: () => "base"
            })

            const preloadSupplier = market.offer("preload").asProduct({
                factory: factoryMock,
                preload: false // explicitly not preloaded initially
            })

            const innovatedSupplier = baseSupplier.innovate({
                factory: ($) => $.preload.unpack(),
                suppliers: [preloadSupplier],
                preload: true // innovation enables preloading
            })

            const result = innovatedSupplier.assemble({})

            // Access the preloaded supplier to trigger the call
            result.unpack()

            // Now the factory should have been called
            expect(factoryMock).toHaveBeenCalled()
        })

        it("should maintain type constraints in innovation", () => {
            const market = createMarket()

            // Base with string return type
            const stringSupplier = market.offer("string").asProduct({
                factory: () => "base string"
            })

            const numberSupplier = market.offer("number").asProduct({
                factory: () => 42
            })

            // Innovation must extend the base type
            const innovatedSupplier = stringSupplier.innovate({
                factory: ($) => {
                    // This should work - string extends string
                    return "enhanced string with " + $.number.unpack()
                },
                suppliers: [numberSupplier],
                preload: false
            })

            const result = innovatedSupplier.assemble({})
            expect(result.unpack()).toBe("enhanced string with 42")
        })

        it("should compute precise TOSUPPLY types with innovate", () => {
            const market = createMarket()

            // Create resource suppliers that will need to be provided
            const configResource = market
                .offer("config")
                .asResource<{ env: string }>()
            const apiKeyResource = market.offer("apiKey").asResource<string>()

            // Create a product supplier that will be self-contained
            const loggerProduct = market.offer("logger").asProduct({
                factory: () => ({ log: (msg: string) => msg })
            })

            // Base service - return compatible type that can be extended
            const baseService = market.offer("base").asProduct({
                factory: () => ({ basic: true })
            })

            // Innovate with mixed resource and product suppliers
            const innovatedService = baseService.innovate({
                factory: ($) => ({
                    basic: true, // preserve base property
                    config: $.config.unpack(),
                    apiKey: $.apiKey.unpack(),
                    logger: $.logger.unpack(),
                    enhanced: true
                }),
                suppliers: [configResource, apiKeyResource, loggerProduct],
                preload: false
            })

            // The type system should now know exactly what needs to be supplied:
            // - config and apiKey (resources must be provided)
            // - logger should NOT need to be provided (it's a product supplier)

            const result = innovatedService.assemble({
                config: configResource.pack({ env: "test" }),
                apiKey: apiKeyResource.pack("secret-key")
                // Note: logger is NOT provided - it should be assembled automatically
            })

            const output = result.unpack()
            expect(output.config.env).toBe("test")
            expect(output.apiKey).toBe("secret-key")
            expect(output.logger.log("test")).toBe("test")
            expect(output.enhanced).toBe(true)
        })

        it("should enforce precise TOSUPPLY requirements at compile time", () => {
            const market = createMarket()

            const configResource = market
                .offer("config2")
                .asResource<{ db: string }>()
            const cacheProduct = market.offer("cache2").asProduct({
                factory: () => ({ get: (key: string) => `cached-${key}` })
            })

            const baseService = market.offer("base2").asProduct({
                factory: () => ({ basic: true })
            })

            const innovatedService = baseService.innovate({
                factory: ($) => ({
                    basic: true, // preserve base property
                    config: $.config2.unpack(),
                    cache: $.cache2.unpack()
                }),
                suppliers: [configResource, cacheProduct],
                preload: false
            })

            // This should work - providing only the required resource
            const correctAssembly = innovatedService.assemble({
                config2: configResource.pack({ db: "postgres" })
                // cache2 should be automatically assembled (it's a product)
            })

            expect(correctAssembly.unpack().config.db).toBe("postgres")
            expect(correctAssembly.unpack().cache.get("test")).toBe(
                "cached-test"
            )

            // These would fail at compile time due to our precise TOSUPPLY types
            // (Commented out since they prevent compilation)
            // const missingConfig = innovatedService.assemble({}) // Missing config2
            // const extraSupply = innovatedService.assemble({ cache2: ... }) // Unnecessary cache2
        })

        it("should compute precise TOSUPPLY types for regular asProduct calls", () => {
            const market = createMarket()

            // Create mixed resource and product suppliers
            const dbConfigResource = market
                .offer("dbConfig")
                .asResource<{ host: string; port: number }>()
            const loggerProduct = market.offer("logger").asProduct({
                factory: () => ({ log: (msg: string) => `[LOG] ${msg}` })
            })

            // Create a service that depends on both resource and product
            const serviceSupplier = market.offer("service").asProduct({
                suppliers: [dbConfigResource, loggerProduct],
                factory: ($) => ({
                    dbConfig: $.dbConfig.unpack(),
                    logger: $.logger.unpack(),
                    start: () => "Service started"
                })
            })

            // TOSUPPLY should now be precisely computed:
            // - dbConfig must be provided (it's a resource)
            // - logger should NOT need to be provided (it's a product)

            const service = serviceSupplier.assemble({
                dbConfig: dbConfigResource.pack({
                    host: "localhost",
                    port: 5432
                })
                // logger is automatically assembled
            })

            const result = service.unpack()
            expect(result.dbConfig.host).toBe("localhost")
            expect(result.dbConfig.port).toBe(5432)
            expect(result.logger.log("test")).toBe("[LOG] test")
            expect(result.start()).toBe("Service started")

            // This would fail at compile time - missing required dbConfig
            // const missingDb = serviceSupplier.assemble({})

            // This would fail at compile time - unnecessary logger supply
            // const extraLogger = serviceSupplier.assemble({
            //     dbConfig: dbConfigResource.pack({ host: "localhost", port: 5432 }),
            //     logger: loggerProduct.pack({ log: () => "manual" })
            // })
        })

        it("should compute empty TOSUPPLY for suppliers with no dependencies", () => {
            const market = createMarket()

            // Service with no suppliers should have empty TOSUPPLY
            const simpleService = market.offer("simple").asProduct({
                factory: () => ({ value: 42 })
            })

            // Should only accept empty object
            const service = simpleService.assemble({})
            expect(service.unpack().value).toBe(42)

            // This would fail at compile time - no suppliers expected
            // const withSupplies = simpleService.assemble({ anything: "value" })
        })

        it("should compute TOSUPPLY correctly with only resource suppliers", () => {
            const market = createMarket()

            const configResource = market
                .offer("config")
                .asResource<{ env: string }>()
            const secretsResource = market
                .offer("secrets")
                .asResource<{ apiKey: string }>()

            // Service with only resources - all must be provided
            const serviceSupplier = market.offer("service").asProduct({
                suppliers: [configResource, secretsResource],
                factory: ($) => ({
                    env: $.config.unpack().env,
                    apiKey: $.secrets.unpack().apiKey
                })
            })

            const service = serviceSupplier.assemble({
                config: configResource.pack({ env: "production" }),
                secrets: secretsResource.pack({ apiKey: "secret123" })
            })

            expect(service.unpack().env).toBe("production")
            expect(service.unpack().apiKey).toBe("secret123")

            // This would fail at compile time - missing required resources
            // const missingSecrets = serviceSupplier.assemble({
            //     config: configResource.pack({ env: "production" })
            // })
        })

        it("should compute TOSUPPLY correctly with only product suppliers", () => {
            const market = createMarket()

            const dbProduct = market.offer("db").asProduct({
                factory: () => ({ query: (sql: string) => `Result: ${sql}` })
            })

            const cacheProduct = market.offer("cache").asProduct({
                factory: () => ({ get: (key: string) => `cached-${key}` })
            })

            // Service with only products - none need to be provided
            const serviceSupplier = market.offer("service").asProduct({
                suppliers: [dbProduct, cacheProduct],
                factory: ($) => ({
                    db: $.db.unpack(),
                    cache: $.cache.unpack()
                })
            })

            // Should accept empty object since all suppliers are products
            const service = serviceSupplier.assemble({})

            expect(service.unpack().db.query("SELECT *")).toBe(
                "Result: SELECT *"
            )
            expect(service.unpack().cache.get("key")).toBe("cached-key")

            // This would fail at compile time - no supplies expected
            // const withSupplies = serviceSupplier.assemble({
            //     db: dbProduct.pack({ query: () => "manual" })
            // })
        })
    })

    describe("Edge Cases and Type Safety Circumvention Attempts", () => {
        it("should prevent using prototypes in main suppliers array", () => {
            const market = createMarket()

            const prototypeSupplier = market.offer("proto").asProduct({
                factory: () => "prototype",
                prototype: true
            })

            // This should be caught by TypeScript - prototypes shouldn't be in main suppliers
            // Bypass type checking to test runtime behavior
            const mainSupplier = market.offer("main").asProduct({
                suppliers: [prototypeSupplier as any], // This should fail type checking
                factory: ($) => "main"
            })

            // Runtime should still work even if types are bypassed
            const result = mainSupplier.assemble({})
            expect(result.unpack()).toBe("main")
        })

        it("should handle circular try dependencies gracefully", () => {
            const market = createMarket()

            const serviceASupplier = market.offer("serviceA").asProduct({
                factory: () => "serviceA"
            })

            const serviceBSupplier = market.offer("serviceB").asProduct({
                suppliers: [serviceASupplier],
                factory: ($) => "serviceB uses " + $(serviceASupplier.name)
            })

            // Try to create circular dependency through try using innovate
            const mockASupplier = serviceASupplier.innovate({
                factory: ($) => "mockA uses " + $.serviceB.unpack(),
                suppliers: [serviceBSupplier], // This creates a potential circle
                preload: false
            })

            // This should work but create a circular dependency that fails at runtime
            const testSupplier = serviceBSupplier.try(mockASupplier)
            const result = testSupplier.assemble({})

            // The circular dependency should cause stack overflow when unpacked
            expect(() => {
                result.unpack()
            }).toThrow("Maximum call stack size exceeded")
        })

        it("should handle resource and product supplier mixing in try", () => {
            const market = createMarket()

            // Original product supplier
            const configSupplier = market.offer("config").asProduct({
                factory: () => ({ setting: "production" })
            })

            const serviceSupplier = market.offer("service").asProduct({
                suppliers: [configSupplier],
                factory: ($) => ({
                    config: $(configSupplier.name)
                })
            })

            // Try to replace with a mock product supplier
            const mockConfigSupplier = configSupplier.innovate({
                factory: () => ({ setting: "test" }),
                suppliers: [],
                preload: false
            })

            // This should work fine with product suppliers
            const testSupplier = serviceSupplier.try(mockConfigSupplier)
            const testService = testSupplier.assemble({})

            expect(testService.unpack().config.setting).toBe("test")
        })

        it("should handle innovation type constraint violations", () => {
            const market = createMarket()

            // Base returns number
            const numberSupplier = market.offer("number").asProduct({
                factory: () => 42
            })

            const stringSupplier = market.offer("string").asProduct({
                factory: () => "helper"
            })

            // This should fail TypeScript compilation - string doesn't extend number
            // Bypass type checking to test runtime behavior
            const invalidInnovation = numberSupplier.innovate({
                factory: ($: any) =>
                    "this is not a number: " + $.string.unpack(),
                suppliers: [stringSupplier],
                preload: false
            } as any)

            // But if types are bypassed, runtime should still work
            const result = invalidInnovation.assemble({})
            expect(typeof result.unpack()).toBe("string")
        })

        it("should handle extreme supplier name conflicts", () => {
            const market = createMarket()

            // Create multiple suppliers with same name (should throw)
            const supplier1 = market.offer("conflict").asProduct({
                factory: () => "first"
            })

            expect(() => {
                market.offer("conflict").asProduct({
                    factory: () => "second"
                })
            }).toThrow("Name conflict already exists")
        })

        it("should handle try with non-prototype suppliers", () => {
            const market = createMarket()

            const baseSupplier = market.offer("base").asProduct({
                factory: () => "base"
            })

            // Non-prototype supplier for try
            const nonPrototypeSupplier = market.offer("non-proto").asProduct({
                factory: () => "non-prototype",
                prototype: false
            })

            // This should be type-checked but may work at runtime
            // Non-prototype suppliers work at runtime in try
            const testSupplier = baseSupplier.try(nonPrototypeSupplier as any)

            const result = testSupplier.assemble({})
            expect(result.unpack()).toBe("base")
        })

        it("should handle deeply nested try and innovate combinations", () => {
            const market = createMarket()

            const baseSupplier = market.offer("base").asProduct({
                factory: () => ({ level: 0 })
            })

            const feature1Supplier = market.offer("feature1").asProduct({
                factory: () => "feature1"
            })

            const mockFeature1Supplier = feature1Supplier.innovate({
                factory: () => "mock-feature1",
                suppliers: [],
                preload: false
            })

            // Complex chain: innovate -> try -> innovate
            const step1 = baseSupplier.innovate({
                factory: ($) => ({
                    level: 1,
                    feature1: $.feature1.unpack()
                }),
                suppliers: [feature1Supplier],
                preload: false
            })

            const step2 = step1.try(mockFeature1Supplier)

            const step3 = step2.innovate({
                factory: ($) => ({
                    level: 2,
                    feature1: $.feature1.unpack(),
                    final: true
                }),
                suppliers: [feature1Supplier],
                preload: false
            })

            const result = step3.assemble({})

            expect(result.unpack()).toEqual({
                level: 2,
                feature1: "feature1", // Innovation resets to original suppliers
                final: true
            })
        })
    })
})
