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
            const stringSupplier = market.offer("string").asResource<string>()
            const numberSupplier = market.offer("number").asResource<number>()
            const objectSupplier = market.offer("object").asResource<{
                name: string
            }>()

            const stringResource = stringSupplier.pack("hello")
            const numberResource = numberSupplier.pack(42)
            const objectResource = objectSupplier.pack({ name: "test" })

            expect(stringResource.unpack()).toBe("hello")
            expect(numberResource.unpack()).toBe(42)
            expect(objectResource.unpack()).toEqual({ name: "test" })
        })
    })

    describe("Product Offer", () => {
        it("should offer a product with no suppliers", () => {
            const market = createMarket()
            const productSupplier = market.offer("product").asProduct({
                factory: () => "product"
            })

            const product = productSupplier.assemble({})

            expect(product.unpack()).toBe("product")
            expect(productSupplier.name).toBe("product")
            expect(productSupplier._product).toBe(true)
        })

        it("should offer a product with suppliers", () => {
            const market = createMarket()
            const product1Supplier = market.offer("product1").asProduct({
                factory: () => "product1"
            })

            const product2Supplier = market.offer("product2").asProduct({
                factory: () => "product2"
            })

            const testSupplier = market.offer("test").asProduct({
                suppliers: [product1Supplier, product2Supplier],
                factory: ($) => {
                    return {
                        product1: $(product1Supplier),
                        product2: $(product2Supplier)
                    }
                }
            })

            const testProduct = testSupplier.assemble({})

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

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [product1Supplier, product2Supplier],
                factory: ($) => {
                    return {
                        product1: $(product1Supplier),
                        product2: $(product2Supplier)
                    }
                }
            })

            const mainProduct = mainSupplier.assemble({})

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

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [productSupplier],
                factory: ($) => {
                    const product = $(productSupplier)
                    return {
                        product
                    }
                }
            })

            const mainProduct = mainSupplier.assemble(
                index(productSupplier.pack("initial-product"))
            )

            // The initial supply should be respected and not overridden during assembly
            expect(mainProduct.unpack()).toEqual({
                product: "initial-product"
            })
        })

        it("should support Product.pack(value) and $[Product.id].pack(value) for creating product instances", () => {
            const market = createMarket()
            const configSupplier = market.offer("config").asProduct({
                factory: () => ({ env: "development", debug: true })
            })

            const loggerSupplier = market.offer("logger").asProduct({
                factory: () => ({ level: "info", prefix: "APP" })
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [configSupplier, loggerSupplier],
                factory: ($) => {
                    // Test direct service.of() call
                    const configProduct = configSupplier.pack({
                        env: "production",
                        debug: false
                    })

                    // Test accessing service through supplies and calling .pack()
                    const loggerProduct = $[loggerSupplier.name].pack({
                        level: "debug",
                        prefix: "TEST"
                    })

                    return {
                        config: configProduct.unpack(),
                        logger: loggerProduct.unpack(),
                        // Also test accessing the supplied products
                        suppliedConfig: $[configSupplier.name].unpack(),
                        suppliedLogger: $[loggerSupplier.name].unpack()
                    }
                }
            })

            const mainProduct = mainSupplier.assemble({})

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
            const configSupplier = market.offer("config").asResource<string>()
            const nameSupplier = market.offer("name").asResource<string>()
            const countSupplier = market.offer("count").asResource<number>()

            // Create a configurable service that uses multiple supplies from its context
            const testSupplier = market.offer("test").asProduct({
                suppliers: [configSupplier, nameSupplier, countSupplier],
                factory: ($) => {
                    // This service uses multiple values from its supplies
                    return {
                        config: $(configSupplier),
                        name: $(nameSupplier),
                        count: $(countSupplier)
                    }
                }
            })

            const initialSupplies = index(
                configSupplier.pack("initial-config"),
                nameSupplier.pack("initial-name"),
                countSupplier.pack(1)
            )

            // Create the initial service instance with base supplies
            const testProduct = testSupplier.assemble(initialSupplies)

            // Test that reassemble creates new product instance with updated supplies
            const newTestProduct1 = testProduct.reassemble(
                index(
                    configSupplier.pack("new-config"),
                    nameSupplier.pack("new-name"),
                    countSupplier.pack(42)
                )
            )

            // Partial reassemble - only override config (other values come from cached supplies)
            const newTestProduct2 = testProduct.reassemble(
                index(configSupplier.pack("new-config"))
            )

            const newTestProduct3 = testProduct.reassemble(
                index(nameSupplier.pack("new-name"))
            )

            // Partial reassemble - override multiple values
            const newTestProduct4 = testProduct.reassemble(
                index(configSupplier.pack("new-config"), countSupplier.pack(42))
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

            const testSupplier = market.offer("test").asProduct({
                suppliers: [memoizedSupplier],
                factory: ($) => {
                    // Access the TestService multiple times within the same assembly context
                    $(memoizedSupplier)
                    $(memoizedSupplier)
                    $(memoizedSupplier)

                    return "test"
                }
            })

            testSupplier.assemble({}).unpack()
            // Factory should only be called once due to memoization within the same assembly context
            expect(factoryMock).toHaveBeenCalledTimes(1)
        })

        it("should keep memoization even if multiple dependents are nested", () => {
            const factory1Mock = vi.fn().mockReturnValue("product1")

            const market = createMarket()
            const product1Supplier = market.offer("product1").asProduct({
                factory: memo(factory1Mock)
            })

            const product2Supplier = market.offer("product2").asProduct({
                suppliers: [product1Supplier],
                factory: ($) => {
                    $(product1Supplier)
                    return "product2"
                }
            })

            const testSupplier = market.offer("test").asProduct({
                suppliers: [product1Supplier, product2Supplier],
                factory: ($) => {
                    return {
                        product1: $(product1Supplier),
                        product2: $(product2Supplier)
                    }
                }
            })

            const testProduct = testSupplier.assemble({})

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
                        productA: $(productASupplier),
                        productB: $(productBSupplier),
                        productC: $(productCSupplier),
                        productD: $(productDSupplier)
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
                        productA: $(productASupplier),
                        productB: $(productBSupplier),
                        productC: $(productCSupplier),
                        productD: $(productDSupplier)
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

            const testProduct = market.offer("test-product").asProduct({
                suppliers: [resourceSupplier, productSupplier],
                factory: ($) => {
                    return {
                        propAccess: {
                            resource: $[resourceSupplier.name].unpack(),
                            product: $[productSupplier.name].unpack()
                        },
                        funcAccess: {
                            resource: $(resourceSupplier),
                            product: $(productSupplier)
                        }
                    }
                }
            })

            const result = testProduct.assemble(
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
        it("should preload services by default", async () => {
            const market = createMarket()
            const preloadFactoryMock = vi.fn().mockReturnValue("preloaded")
            const normalFactoryMock = vi.fn().mockReturnValue("normal")

            const preloadedSupplier = market.offer("preloaded").asProduct({
                factory: preloadFactoryMock
            })

            const normalSupplier = market.offer("normal").asProduct({
                factory: normalFactoryMock,
                preload: false
            })

            const noPreloadSupplier = market.offer("no-preload").asProduct({
                factory: vi.fn().mockReturnValue("no-preload")
                // preload defaults to false
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [
                    preloadedSupplier,
                    normalSupplier,
                    noPreloadSupplier
                ],
                factory: () => {
                    // Don't access any dependencies yet
                    return "main"
                }
            })

            const mainProduct = mainSupplier.assemble({})

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

            const errorSupplier = market.offer("error").asProduct({
                factory: errorFactoryMock
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [errorSupplier],
                factory: ($) => {
                    // Don't access ErrorService yet
                    return "main"
                }
            })

            // This should not throw even though ErrorService will fail during preload
            const mainProduct = mainSupplier.assemble({})

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

            const errorSupplier = market.offer("error").asProduct({
                factory: errorFactoryMock
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [errorSupplier],
                factory: ($) => {
                    // Try to access the failed service
                    return $(errorSupplier)
                }
            })

            // Wait a bit for preloading to complete
            await sleep(10)

            // Accessing the service should still throw the error
            expect(() => mainSupplier.assemble({}).unpack()).toThrow()
        })

        it("should work with complex dependency chains and selective preloading", async () => {
            const market = createMarket()
            const product1Mock = vi.fn().mockReturnValue("product1")
            const product2Mock = vi.fn().mockReturnValue("product2")
            const product3Mock = vi.fn().mockReturnValue("product3")

            const product1Supplier = market.offer("product1").asProduct({
                factory: product1Mock
            })

            const product2Supplier = market.offer("product2").asProduct({
                factory: product2Mock,
                preload: false // This will not be preloaded
            })

            const product3Supplier = market.offer("product3").asProduct({
                factory: product3Mock,
                preload: false
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [
                    product1Supplier,
                    product2Supplier,
                    product3Supplier
                ],
                factory: () => {
                    return "main"
                }
            })

            const mainProduct = mainSupplier.assemble({})

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
            const emptySupplier = market.offer("empty").asProduct({
                factory: () => "empty"
            })

            const emptyProduct = emptySupplier.assemble({})
            expect(emptyProduct.unpack()).toBe("empty")
        })
    })
})
