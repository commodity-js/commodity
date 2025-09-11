import { describe, it, expect, vi, beforeEach } from "vitest"
import { createMarket } from "#index"
import { index, sleep } from "#utils"
import memo from "memoize"

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

    describe("Assembler Feature", () => {
        it("should pass assemblers to factory but not auto-assemble them", () => {
            const market = createMarket()
            const assemblerMock = vi.fn().mockReturnValue("assembled-value")

            const AssemblerSupplier = market.offer("assembler").asProduct({
                factory: assemblerMock
            })

            const MainSupplier = market.offer("main").asProduct({
                assemblers: [AssemblerSupplier],
                factory: ($, $$) => {
                    // Assemblers are passed but not auto-assembled
                    expect($$[AssemblerSupplier.name]).toBe(AssemblerSupplier)
                    expect(assemblerMock).not.toHaveBeenCalled()

                    return "main-result"
                }
            })

            const result = MainSupplier.assemble({})
            expect(result.unpack()).toBe("main-result")
            expect(assemblerMock).not.toHaveBeenCalled()
        })

        it("should allow manual assembly of assemblers within factory", () => {
            const market = createMarket()
            const assemblerFactoryMock = vi
                .fn()
                .mockReturnValue("assembled-value")

            const AssemblerSupplier = market.offer("assembler").asProduct({
                factory: assemblerFactoryMock
            })

            const MainSupplier = market.offer("main").asProduct({
                assemblers: [AssemblerSupplier],
                factory: ($, $$) => {
                    // Manually assemble the assembler
                    const assembledProduct = $$[
                        AssemblerSupplier.name
                    ].assemble({})
                    const value = assembledProduct.unpack()

                    expect(assemblerFactoryMock).toHaveBeenCalledTimes(1)
                    expect(value).toBe("assembled-value")

                    return {
                        main: "main-result",
                        assembled: value
                    }
                }
            })

            const result = MainSupplier.assemble({})
            expect(result.unpack()).toEqual({
                main: "main-result",
                assembled: "assembled-value"
            })
        })

        it("should support conditional assembly based on context (session admin example)", () => {
            const market = createMarket()

            // Session resource
            const SessionSupplier = market.offer("session").asResource<{
                userId: string
                role: string
            }>()

            // Admin-only assembler
            const AdminServiceSupplier = market
                .offer("adminService")
                .asProduct({
                    factory: () => ({
                        adminData: "sensitive-admin-data",
                        permissions: ["read", "write", "delete"]
                    })
                })

            // Regular user assembler
            const UserServiceSupplier = market.offer("userService").asProduct({
                factory: () => ({
                    userData: "regular-user-data",
                    permissions: ["read"]
                })
            })

            // Main service that conditionally assembles based on session
            const MainServiceSupplier = market.offer("mainService").asProduct({
                suppliers: [SessionSupplier],
                assemblers: [AdminServiceSupplier, UserServiceSupplier],
                factory: ($, $$) => {
                    const session = $(SessionSupplier.name)

                    if (session.role === "admin") {
                        // Only assemble admin service for admins
                        const adminService = $$[
                            AdminServiceSupplier.name
                        ].assemble({})
                        return {
                            user: session.userId,
                            service: adminService.unpack()
                        }
                    } else {
                        // Assemble user service for regular users
                        const userService = $$[
                            UserServiceSupplier.name
                        ].assemble({})
                        return {
                            user: session.userId,
                            service: userService.unpack()
                        }
                    }
                }
            })

            // Test admin session
            const adminSession = SessionSupplier.pack({
                userId: "admin123",
                role: "admin"
            })
            const adminResult = MainServiceSupplier.assemble(
                index(adminSession)
            )

            expect(adminResult.unpack()).toEqual({
                user: "admin123",
                service: {
                    adminData: "sensitive-admin-data",
                    permissions: ["read", "write", "delete"]
                }
            })

            // Test regular user session
            const userSession = SessionSupplier.pack({
                userId: "user456",
                role: "user"
            })
            const userResult = MainServiceSupplier.assemble(index(userSession))

            expect(userResult.unpack()).toEqual({
                user: "user456",
                service: {
                    userData: "regular-user-data",
                    permissions: ["read"]
                }
            })
        })

        it("should support assemblers with their own dependencies", () => {
            const market = createMarket()

            // Resource for assembler
            const ConfigSupplier = market.offer("config").asResource<{
                apiKey: string
                environment: string
            }>()

            // Assembler with dependencies
            const ApiServiceSupplier = market.offer("apiService").asProduct({
                suppliers: [ConfigSupplier],
                factory: ($) => {
                    const config = $(ConfigSupplier.name)
                    return {
                        baseUrl: `https://api.${config.environment}.com`,
                        apiKey: config.apiKey
                    }
                }
            })

            // Main service
            const MainServiceSupplier = market.offer("mainService").asProduct({
                assemblers: [ApiServiceSupplier],
                factory: ($, $$) => {
                    // Assemble the API service with its dependencies
                    const apiService = $$[ApiServiceSupplier.name].assemble(
                        index(
                            ConfigSupplier.pack({
                                apiKey: "secret-key",
                                environment: "production"
                            })
                        )
                    )

                    return {
                        message: "Service ready",
                        api: apiService.unpack()
                    }
                }
            })

            const result = MainServiceSupplier.assemble({})
            expect(result.unpack()).toEqual({
                message: "Service ready",
                api: {
                    baseUrl: "https://api.production.com",
                    apiKey: "secret-key"
                }
            })
        })

        it("should support multiple assemblers and selective assembly", () => {
            const market = createMarket()

            const ServiceASupplier = market.offer("serviceA").asProduct({
                factory: () => "Service A"
            })

            const ServiceBSupplier = market.offer("serviceB").asProduct({
                factory: () => "Service B"
            })

            const ServiceCSupplier = market.offer("serviceC").asProduct({
                factory: () => "Service C"
            })

            const MainServiceSupplier = market.offer("mainService").asProduct({
                assemblers: [
                    ServiceASupplier,
                    ServiceBSupplier,
                    ServiceCSupplier
                ],
                factory: ($, $$) => {
                    // Only assemble some services based on some condition
                    const serviceA = $$[ServiceASupplier.name].assemble({})
                    const serviceC = $$[ServiceCSupplier.name].assemble({})

                    return {
                        services: [serviceA.unpack(), serviceC.unpack()]
                    }
                }
            })

            const result = MainServiceSupplier.assemble({})
            expect(result.unpack()).toEqual({
                services: ["Service A", "Service C"]
            })
        })

        it("should handle assembler errors gracefully", () => {
            const market = createMarket()

            const FailingSupplier = market.offer("failing").asProduct({
                factory: () => {
                    throw new Error("Assembler failed")
                    return
                }
            })

            const MainServiceSupplier = market.offer("mainService").asProduct({
                assemblers: [FailingSupplier],
                factory: ($, $$) => {
                    // Try to assemble the failing assembler
                    expect(() => {
                        $$[FailingSupplier.name].assemble({}).unpack()
                    }).toThrow("Assembler failed")

                    return "main-service"
                }
            })

            const result = MainServiceSupplier.assemble({})
            expect(result.unpack()).toBe("main-service")
        })

        it("should support assemblers in try() method", () => {
            const market = createMarket()

            const AssemblerSupplier = {
                ...market.offer("assembler").asProduct({
                    factory: () => "assembled-value"
                }),
                _isPrototype: true as const
            }

            const MainSupplier = market.offer("main").asProduct({
                factory: () => "main-value"
            })

            const TriedSupplier = MainSupplier.try({
                suppliers: [],
                assemblers: [AssemblerSupplier]
            })

            expect(TriedSupplier.assemblers).toHaveLength(1)
        })

        it("should support assemblers in prototype() method", () => {
            const market = createMarket()

            const AssemblerSupplier = market.offer("assembler").asProduct({
                factory: () => "assembled-value"
            })

            const MainSupplier = market.offer("main").asProduct({
                factory: (supplies) => "main-value"
            })

            const PrototypeSupplier = MainSupplier.prototype({
                factory: (supplies, assemblers) => {
                    expect(assemblers).toHaveLength(1)
                    return "prototype-value"
                },
                assemblers: [AssemblerSupplier],
                preload: false
            })

            expect(PrototypeSupplier.assemblers).toHaveLength(1)
        })

        it("should support complex assembler dependency chains", () => {
            const market = createMarket()

            // Base resource
            const DatabaseSupplier = market.offer("database").asResource<{
                connectionString: string
            }>()

            // Assembler that depends on database
            const RepositorySupplier = market.offer("repository").asProduct({
                suppliers: [DatabaseSupplier],
                factory: ($) => {
                    const db = $(DatabaseSupplier.name)
                    return {
                        connection: db.connectionString,
                        operations: ["create", "read", "update", "delete"]
                    }
                }
            })

            // Another assembler that depends on repository
            const ServiceSupplier = market.offer("service").asProduct({
                suppliers: [RepositorySupplier],
                factory: ($) => {
                    const repo = $(RepositorySupplier.name)
                    return {
                        name: "BusinessService",
                        repository: repo
                    }
                }
            })

            // Main service that assembles the chain
            const MainServiceSupplier = market.offer("mainService").asProduct({
                assemblers: [ServiceSupplier],
                factory: ($, $$) => {
                    // Assemble the service with its full dependency chain
                    const service = $$[ServiceSupplier.name].assemble(
                        index(
                            DatabaseSupplier.pack({
                                connectionString:
                                    "postgresql://localhost:5432/mydb"
                            })
                        )
                    )

                    return {
                        status: "ready",
                        service: service.unpack()
                    }
                }
            })

            const result = MainServiceSupplier.assemble({})
            expect(result.unpack()).toEqual({
                status: "ready",
                service: {
                    name: "BusinessService",
                    repository: {
                        connection: "postgresql://localhost:5432/mydb",
                        operations: ["create", "read", "update", "delete"]
                    }
                }
            })
        })

        it("should handle assembler reassembly correctly", () => {
            const market = createMarket()

            const ConfigSupplier = market.offer("config").asResource<{
                value: number
            }>()

            const AssemblerSupplier = market.offer("assembler").asProduct({
                suppliers: [ConfigSupplier],
                factory: ($) => {
                    const config = $(ConfigSupplier.name)
                    return {
                        computed: config.value * 2
                    }
                }
            })

            const MainSupplier = market.offer("main").asProduct({
                suppliers: [ConfigSupplier],
                assemblers: [AssemblerSupplier],
                factory: ($, $$) => {
                    const assembled = $$[AssemblerSupplier.name].assemble($)
                    return assembled.unpack()
                }
            })

            const product = MainSupplier.assemble(
                index(ConfigSupplier.pack({ value: 5 }))
            )
            expect(product.unpack()).toEqual({ computed: 10 })

            // Reassemble with different config
            const reassembled = product.reassemble(
                index(ConfigSupplier.pack({ value: 10 }))
            )
            expect(reassembled.unpack()).toEqual({ computed: 20 })
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
    })
})
