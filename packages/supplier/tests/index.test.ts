import { describe, it, expect, vi, beforeEach } from "vitest"
import { createMarket } from "#index"
import { index, once, sleep } from "#utils"

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

    describe("Factory memoization", () => {
        it("should create separate memoization contexts for different assembly calls", () => {
            const factorySpy = vi.fn().mockReturnValue("product")

            const market = createMarket()
            const productSupplier = market.offer("product").asProduct({
                factory: factorySpy
            })

            const product = productSupplier.assemble({})

            // First access should call the factory
            expect(product.unpack()).toBe("product")
            expect(factorySpy).toHaveBeenCalledTimes(1)

            // The memoization works within the same assembly context
            // Each call to assemble() creates a new context, so the factory is called again
            const secondAccess = productSupplier.assemble({})
            expect(secondAccess.unpack()).toBe("product")
            // Factory is called again for the new assembly context
            expect(factorySpy).toHaveBeenCalledTimes(2)
        })

        it("should memoize factory calls when accessed multiple times within the same assembly context", () => {
            const factorySpy = vi.fn().mockReturnValue("memoized")

            const market = createMarket()
            const spySupplier = market.offer("spy").asProduct({
                factory: factorySpy
            })

            const testSupplier = market.offer("test").asProduct({
                suppliers: [spySupplier],
                factory: ($) => {
                    // Access the TestService multiple times within the same assembly context
                    $(spySupplier)
                    $(spySupplier)

                    return "test"
                }
            })

            testSupplier.assemble({}).unpack()
            // Factory should only be called once due to memoization within the same assembly context
            expect(factorySpy).toHaveBeenCalledTimes(1)
        })

        it("should keep memoization even if multiple dependents are nested", () => {
            const factory1Spy = vi.fn().mockReturnValue("product1")

            const market = createMarket()
            const product1Supplier = market.offer("product1").asProduct({
                factory: factory1Spy
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
            expect(factory1Spy).toHaveBeenCalledTimes(1)
        })

        it("should reassemble product if dependent suppliers reassembles", async () => {
            const market = createMarket()
            // productA will be reassembled
            const productASupplier = market.offer("productA").asProduct({
                factory: () => Date.now()
            })

            // productB will be reassembled when productA reassembles
            const productBSupplier = market.offer("productB").asProduct({
                suppliers: [productASupplier],
                factory: () => Date.now()
            })

            // productC - doesn't depend on anything, so it will not be reassembled
            const productCSupplier = market.offer("productC").asProduct({
                factory: () => Date.now()
            })

            // productD will be reassembled when productB reassembles
            const productDSupplier = market.offer("productD").asProduct({
                suppliers: [productBSupplier],
                factory: () => Date.now()
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
                factory: () => Date.now()
            })

            const productBSupplier = market.offer("productB").asProduct({
                suppliers: [productASupplier],
                factory: () => Date.now()
            })

            const productCSupplier = market.offer("productC").asProduct({
                suppliers: [productBSupplier],
                factory: () => Date.now()
            })

            const productDSupplier = market.offer("productD").asProduct({
                suppliers: [productCSupplier],
                factory: () => Date.now()
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

    describe("Preload Feature", () => {
        it("should init eager services, not lazy ones ", async () => {
            const market = createMarket()
            const initedValueSpy = vi
                .fn<() => "inited">()
                .mockReturnValue("inited")
            const normalValueSpy = vi.fn().mockReturnValue("normal")
            const lazyValueSpy = vi.fn().mockReturnValue("lazy")

            const initedSupplier = market.offer("inited").asProduct({
                factory: () => initedValueSpy,
                init: (value) => value()
            })

            const normalSupplier = market.offer("normal").asProduct({
                factory: () => normalValueSpy
            })

            const lazySupplier = market.offer("lazy").asProduct({
                factory: () => lazyValueSpy,
                init: (value) => value(),
                lazy: true
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [initedSupplier, normalSupplier, lazySupplier],
                factory: () => {
                    // Don't access any dependencies yet
                    return "main"
                }
            })

            const mainProduct = mainSupplier.assemble({})

            // Wait a bit for initing to complete
            await sleep(10)

            // PreloadService should have been called due to init: true
            expect(initedValueSpy).toHaveBeenCalledTimes(1)

            // NormalService and NoPreloadService should not have been called yet
            expect(normalValueSpy).toHaveBeenCalledTimes(0)

            expect(lazyValueSpy).toHaveBeenCalledTimes(0)

            expect(mainProduct.unpack()).toBe("main")
        })

        it("should handle init errors gracefully without breaking the supply chain", async () => {
            const market = createMarket()
            const errorValueSpy = vi.fn().mockImplementation(() => {
                throw new Error()
            })

            const errorSupplier = market.offer("error").asProduct({
                factory: () => once(errorValueSpy),
                init: (value) => value()
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [errorSupplier],
                factory: ($) => {
                    // Don't access ErrorService yet
                    return "main"
                }
            })

            // This should not throw even though ErrorService will fail during init
            const mainProduct = mainSupplier.assemble({})

            // Wait a bit for initing to complete
            await sleep(10)

            expect(mainProduct.unpack()).toBe("main")

            // ErrorService factory should have been called during init
            expect(errorValueSpy).toHaveBeenCalledTimes(1)
        })

        it("should still throw error when accessing a failed inited service", async () => {
            const market = createMarket()
            const errorValueSpy = vi.fn().mockImplementation(() => {
                throw new Error()
            })

            const errorSupplier = market.offer("error").asProduct({
                factory: () => once(errorValueSpy),
                init: (value) => value()
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [errorSupplier],
                factory: ($) => {
                    // Try to access the failed service
                    return $(errorSupplier)()
                }
            })

            // Wait a bit for initing to complete
            await sleep(10)

            // Accessing the service should still throw the error
            expect(() => mainSupplier.assemble({}).unpack()).toThrow()
        })

        it("should work with complex dependency chains and selective initing", async () => {
            const market = createMarket()
            const product1Spy = vi.fn().mockReturnValue("product1")
            const product2Spy = vi.fn().mockReturnValue("product2")

            const product1Supplier = market.offer("product1").asProduct({
                factory: () => once(product1Spy),
                init: (value) => value()
            })

            const product2Supplier = market.offer("product2").asProduct({
                factory: () => once(product2Spy)
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [product1Supplier, product2Supplier],
                factory: () => {
                    return "main"
                }
            })

            const mainProduct = mainSupplier.assemble({})

            // Wait a bit for initing to complete
            await sleep(10)

            // Only product1Supplier should have been inited
            expect(product1Spy).toHaveBeenCalledTimes(1)
            expect(product2Spy).toHaveBeenCalledTimes(0)

            expect(mainProduct.unpack()).toBe("main")
        })
    })

    describe("Lazy Feature", () => {
        it("should run factory for non-lazy suppliers during assemble", () => {
            const factorySpy = vi.fn().mockReturnValue("eager-value")

            const market = createMarket()
            const eagerSupplier = market.offer("eager").asProduct({
                factory: factorySpy,
                lazy: false // explicitly non-lazy
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [eagerSupplier],
                factory: () => "main"
            })

            // Factory should be called during assemble, even though we don't access it
            mainSupplier.assemble({})

            expect(factorySpy).toHaveBeenCalledTimes(1)
        })

        it("should NOT run factory for lazy suppliers during assemble", () => {
            const factorySpy = vi.fn().mockReturnValue("lazy-value")

            const market = createMarket()
            const lazySupplier = market.offer("lazy").asProduct({
                factory: factorySpy,
                lazy: true
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [lazySupplier],
                factory: () => "main"
            })

            // Factory should NOT be called during assemble
            mainSupplier.assemble({})

            expect(factorySpy).toHaveBeenCalledTimes(0)
        })

        it("should run lazy supplier factory only when first accessed", () => {
            const factorySpy = vi.fn().mockReturnValue("lazy-value")

            const market = createMarket()
            const lazySupplier = market.offer("lazy").asProduct({
                factory: factorySpy,
                lazy: true
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [lazySupplier],
                factory: ($) => {
                    // Access the lazy supplier
                    const lazyValue = $(lazySupplier)
                    return { lazyValue }
                }
            })

            const mainProduct = mainSupplier.assemble({})

            // Factory should not be called during assemble
            expect(factorySpy).toHaveBeenCalledTimes(0)

            // Factory should be called when we access the lazy supplier
            expect(mainProduct.unpack().lazyValue).toBe("lazy-value")
            expect(factorySpy).toHaveBeenCalledTimes(1)
        })

        it("Lazy suppliers shield eager suppliers from being lazy loaded early when deeper in dependency chain", async () => {
            const factory1Spy = vi.fn().mockReturnValue("service1")
            const lazyFactorySpy = vi.fn().mockReturnValue("lazy-service")
            const factory2Spy = vi.fn().mockReturnValue("service2")

            const market = createMarket()
            const service1Supplier = market.offer("service1").asProduct({
                factory: factory1Spy
            })

            const lazySupplier = market.offer("lazy").asProduct({
                suppliers: [service1Supplier],
                factory: lazyFactorySpy,
                lazy: true
            })

            const service2Supplier = market.offer("service2").asProduct({
                suppliers: [lazySupplier],
                factory: factory2Spy
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [service2Supplier],
                factory: ($) => {
                    const main = $(service2Supplier)
                    return { main }
                }
            })

            const mainProduct = mainSupplier.assemble({})

            await sleep(100)

            // Eager service should be called during assemble
            expect(factory2Spy).toHaveBeenCalledTimes(1)
            // Lazy service should not be called during assemble
            expect(lazyFactorySpy).toHaveBeenCalledTimes(0)
            // Eager service should not be called during assemble since parent lazy service is lazy loaded
            expect(factory1Spy).toHaveBeenCalledTimes(0)
        })

        it("should handle lazy suppliers with reassembly", () => {
            const factorySpy = vi.fn().mockReturnValue("lazy-value")

            const market = createMarket()
            const lazySupplier = market.offer("lazy").asProduct({
                factory: factorySpy,
                lazy: true
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [lazySupplier],
                factory: ($) => {
                    const lazyValue = $(lazySupplier)
                    return { lazyValue }
                }
            })

            const mainProduct = mainSupplier.assemble({})

            // Access the lazy supplier
            expect(mainProduct.unpack().lazyValue).toBe("lazy-value")
            expect(factorySpy).toHaveBeenCalledTimes(1)

            // Reassemble should not call the factory again for lazy suppliers
            const newMainProduct = mainProduct.reassemble({})
            expect(newMainProduct.unpack().lazyValue).toBe("lazy-value")
            expect(factorySpy).toHaveBeenCalledTimes(1) // Still only called once
        })

        it("should handle lazy suppliers with prototypes", () => {
            const originalFactorySpy = vi.fn().mockReturnValue("original")
            const prototypeFactorySpy = vi.fn().mockReturnValue("prototype")

            const market = createMarket()
            const originalSupplier = market.offer("service").asProduct({
                factory: originalFactorySpy,
                lazy: true
            })

            const prototypeSupplier = originalSupplier.prototype({
                factory: prototypeFactorySpy,
                lazy: true
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [originalSupplier],
                factory: ($) => {
                    const value = $(prototypeSupplier)
                    return { value }
                }
            })

            const mainProduct = mainSupplier.try(prototypeSupplier).assemble({})

            // Neither factory should be called during assemble
            expect(originalFactorySpy).toHaveBeenCalledTimes(0)
            expect(prototypeFactorySpy).toHaveBeenCalledTimes(0)

            // Only prototype factory should be called when accessed
            expect(mainProduct.unpack().value).toBe("prototype")
            expect(originalFactorySpy).toHaveBeenCalledTimes(0)
            expect(prototypeFactorySpy).toHaveBeenCalledTimes(1)
        })

        it("should default to non-lazy behavior when lazy is not specified", () => {
            const factorySpy = vi.fn().mockReturnValue("default-eager")

            const market = createMarket()
            const defaultSupplier = market.offer("default").asProduct({
                factory: factorySpy
                // lazy not specified, should default to false
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [defaultSupplier],
                factory: () => "main"
            })

            // Factory should be called during assemble (default behavior)
            mainSupplier.assemble({})
            expect(factorySpy).toHaveBeenCalledTimes(1)
        })

        it("should not init lazy suppliers even when init is specified", async () => {
            const initSpy = vi.fn()
            const factorySpy = vi.fn().mockReturnValue("lazy-with-init")

            const market = createMarket()
            const lazySupplier = market.offer("lazy").asProduct({
                factory: factorySpy,
                init: initSpy,
                lazy: true
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [lazySupplier],
                factory: () => "main"
            })

            const mainProduct = mainSupplier.assemble({})

            // Wait a bit for any initing to complete
            await sleep(10)

            // Lazy supplier should not be inited
            expect(factorySpy).toHaveBeenCalledTimes(0)
            expect(initSpy).toHaveBeenCalledTimes(0)

            // Only when accessed should the factory run
            expect(mainProduct.unpack()).toBe("main")
            expect(factorySpy).toHaveBeenCalledTimes(0) // Still not called since we don't access the lazy supplier
        })

        it("should init non-lazy suppliers when init is specified", async () => {
            const initSpy = vi.fn()
            const factorySpy = vi.fn().mockReturnValue(() => "eager-with-init")

            const market = createMarket()
            const eagerSupplier = market.offer("eager").asProduct({
                factory: factorySpy,
                init: initSpy,
                lazy: false
            })

            const mainSupplier = market.offer("main").asProduct({
                suppliers: [eagerSupplier],
                factory: () => "main"
            })

            const mainProduct = mainSupplier.assemble({})

            // Wait a bit for initing to complete
            await sleep(10)

            // Eager supplier should be inited
            expect(factorySpy).toHaveBeenCalledTimes(1)
            expect(initSpy).toHaveBeenCalledTimes(1)

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
