import { describe, it, expect, vi } from "vitest"
import { index, createMarket, sleep } from "#index"

describe("Caching System", () => {
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

    it("Recalls product with no dependents without recalling dependencies", async () => {
        // Example of using createMarket with memoization
        const market = createMarket()
        const productASupplier = market.offer("productA").asProduct({
            factory: () => Date.now()
        })

        const productBSupplier = market.offer("productB").asProduct({
            suppliers: [productASupplier],
            factory: () => Date.now()
        })

        const mainSupplier = market.offer("main").asProduct({
            suppliers: [productASupplier, productBSupplier],
            factory: ($) => ({
                now: Date.now(),
                productA: $(productASupplier.name),
                productB: $(productBSupplier.name)
            })
        })

        const mainProduct = mainSupplier.assemble({})

        const initialNow = mainProduct.unpack().now
        const initialProductA = mainProduct.unpack().productA
        const initialProductB = mainProduct.unpack().productB

        // Wait a bit to ensure timestamps are different
        await sleep(100)

        mainProduct.recall()

        expect(mainProduct.unpack().now).not.toBe(initialNow)
        expect(mainProduct.unpack().productA).toBe(initialProductA)
        expect(mainProduct.unpack().productB).toBe(initialProductB)
    })

    it("Should invalidate all dependents", async () => {
        const market = createMarket()
        const productZSupplier = market.offer("productZ").asProduct({
            factory: () => Date.now()
        })

        const productASupplier = market.offer("productA").asProduct({
            suppliers: [productZSupplier],
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

        const mainSupplier = market.offer("main").asProduct({
            suppliers: [
                productZSupplier,
                productASupplier,
                productBSupplier,
                productCSupplier
            ],
            factory: async ($) => {
                const initialZ = $(productZSupplier.name)
                const initialA = $(productASupplier.name)
                const initialB = $(productBSupplier.name)
                const initialC = $(productCSupplier.name)

                $[productASupplier.name].recall()
                // Wait a bit to ensure timestamps are different
                await sleep(100)

                const newZ = $(productZSupplier.name)
                const newA = $(productASupplier.name)
                const newB = $(productBSupplier.name)
                const newC = $(productCSupplier.name)

                expect(newZ).toBe(initialZ)
                expect(newA).not.toBe(initialA)
                expect(newB).not.toBe(initialB)
                expect(newC).not.toBe(initialC)
            }
        })

        mainSupplier.assemble({})
    })

    it("should support optimistic updates with setOptimistic", async () => {
        const market = createMarket()

        // Create a service that simulates slow computation
        let computationCount = 0

        const OptimisticSupplier = market.offer("optimistic").asProduct({
            factory: async () => {
                computationCount++
                await sleep(100) // Simulate actual slow computation
                return `computed-value-${computationCount}`
            }
        })

        // Test optimistic caching with recallable service
        const optimisticProduct = OptimisticSupplier.assemble({})

        // Set optimistic value before first access
        optimisticProduct.setOptimistic("optimistic-value")

        // Should return optimistic value immediately
        expect(await optimisticProduct.unpack()).toBe("optimistic-value")

        // Factory should not have been called once in the background
        expect(computationCount).toBe(1)

        await sleep(100)

        // After background computation completes, optimistic value should be cleared
        // and real computed value should be returned
        const realValue1 = await optimisticProduct.unpack()
        expect(realValue1).not.toBe("optimistic-value")
        expect(realValue1).toBe("computed-value-1")
    })

    it("should handle multiple optimistic values correctly", async () => {
        const market = createMarket()

        const OptimisticSupplier = market.offer("multi-optimistic").asProduct({
            factory: async () => {
                await sleep(20)
                return 300
            }
        })

        const product = OptimisticSupplier.assemble({})

        // Set first optimistic value
        product.setOptimistic(100)
        expect(await product.unpack()).toBe(100)

        // Try to set second optimistic value - should throw error
        expect(() => {
            product.setOptimistic(200)
        }).toThrow("Cannot set optimistic value when one is already set: 100")

        await sleep(50)

        expect(await product.unpack()).toBe(300)
    })

    it("should handle factory failures", async () => {
        const market = createMarket()

        let shouldFail = true
        const OptimisticSupplier = market.offer("failing-factory").asProduct({
            factory: async () => {
                await sleep(100)
                if (shouldFail) {
                    throw new Error("Factory failed")
                }
                return "success-value"
            }
        })

        const product = OptimisticSupplier.assemble({})

        // Set optimistic value
        product.setOptimistic("optimistic-value")
        expect(await product.unpack()).toBe("optimistic-value")

        // Wait for background computation to fail
        await sleep(100)

        // Should run the real factory and throw error

        await expect(product.unpack()).rejects.toThrow()

        // Fix the factory
        shouldFail = false

        // Set optimistic value again to trigger new background computation
        product.setOptimistic("new-optimistic")
        expect(await product.unpack()).toBe("new-optimistic")

        // Wait for successful background computation
        await sleep(100)

        // Should now return real value
        expect(await product.unpack()).toBe("success-value")
    })

    it("should recall optimistic values", async () => {
        const market = createMarket()

        const OptimisticSupplier = market.offer("recall-optimistic").asProduct({
            factory: () => Date.now()
        })

        const product = OptimisticSupplier.assemble({})

        // Set optimistic value
        product.setOptimistic(999)
        expect(product.unpack()).toBe(999)

        // Call recall - this should clear the optimistic value
        product.recall()

        // Should return new computed value, not optimistic value
        const newValue = product.unpack()
        expect(newValue).not.toBe(999)
        expect(typeof newValue).toBe("number")
    })

    it("should handle optimistic values with dependencies", async () => {
        const market = createMarket()

        const dependencySupplier = market.offer("dependency").asProduct({
            factory: () => "dependency-value"
        })

        const OptimisticSupplier = market
            .offer("dependent-optimistic")
            .asProduct({
                suppliers: [dependencySupplier],
                factory: ($) => `computed-${$(dependencySupplier.name)}`
            })

        const product = OptimisticSupplier.assemble({})

        // Set optimistic value
        product.setOptimistic("optimistic-dependent")
        expect(await product.unpack()).toBe("optimistic-dependent")

        // Wait for background computation
        await sleep(50)

        // Should return real computed value with dependency
        const realValue = await product.unpack()
        expect(realValue).toBe("computed-dependency-value")
        expect(realValue).not.toBe("optimistic-dependent")
    })

    it("should call onRecall when product is recalled", () => {
        const recalledCacheKeys: string[] = []
        const market = createMarket({
            onRecall: (cacheKey: string) => {
                recalledCacheKeys.push(cacheKey)
            }
        })

        const productSupplier = market.offer("test-product").asProduct({
            factory: () => Date.now()
        })

        const product = productSupplier.assemble({})
        const initialCacheKey = product.cacheKey

        // Recall the product
        product.recall()

        // onRecall should have been called with the cache key
        expect(recalledCacheKeys).toHaveLength(1)
        expect(recalledCacheKeys[0]).toBe(initialCacheKey)
    })

    it("should call onRecall for all recalled products in dependency chain", () => {
        const recalledCacheKeys: string[] = []
        const market = createMarket({
            onRecall: (cacheKey: string) => {
                recalledCacheKeys.push(cacheKey)
            }
        })

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

        const mainSupplier = market.offer("main").asProduct({
            suppliers: [productASupplier, productBSupplier, productCSupplier],
            factory: ($) => ({
                productA: $[productASupplier.name],
                productB: $[productBSupplier.name],
                productC: $[productCSupplier.name]
            })
        })

        const mainProduct = mainSupplier.assemble({})
        const productA = mainProduct.unpack().productA
        const productB = mainProduct.unpack().productB
        const productC = mainProduct.unpack().productC

        // Clear the recalled cache keys array
        recalledCacheKeys.length = 0

        // Recall productA - this should trigger recall of productB, productC and mainProduct as well
        productA.recall()

        // onRecall should have been called for all 4 products exactly once each
        expect(recalledCacheKeys).toHaveLength(4)
        expect(recalledCacheKeys).toContain(productA.cacheKey)
        expect(recalledCacheKeys).toContain(productB.cacheKey)
        expect(recalledCacheKeys).toContain(productC.cacheKey)

        // Verify no duplicate cache keys (each product recalled exactly once)
        const uniqueCacheKeys = new Set(recalledCacheKeys)
        expect(uniqueCacheKeys.size).toBe(4)
    })

    it("should call onRecall when product with onRecall is recalled", () => {
        const market = createMarket()
        const recalledCacheKeys: string[] = []

        const productSupplier = market.offer("test-product").asProduct({
            factory: () => Date.now(),
            onRecall: (cacheKey: string) => {
                recalledCacheKeys.push(cacheKey)
            }
        })

        const product = productSupplier.assemble({})
        const initialCacheKey = product.cacheKey

        // Recall the product
        product.recall()

        // Product-specific onRecall should have been called
        expect(recalledCacheKeys).toHaveLength(1)
        expect(recalledCacheKeys[0]).toBe(initialCacheKey)
    })

    it("should not call onRecall when product is not recalled", () => {
        const recalledCacheKeys: string[] = []
        const market = createMarket({
            onRecall: (cacheKey: string) => {
                recalledCacheKeys.push(cacheKey)
            }
        })

        const productSupplier = market.offer("test-product").asProduct({
            factory: () => Date.now()
        })

        const product = productSupplier.assemble({})

        // Just access the product without recalling
        product.unpack()

        // onRecall should not have been called
        expect(recalledCacheKeys).toHaveLength(0)
    })

    it("should handle onRecall errors gracefully", () => {
        const consoleSpy = vi
            .spyOn(console, "warn")
            .mockImplementation(() => undefined)

        const market = createMarket({
            onRecall: (cacheKey: string) => {
                throw new Error(`Error in onRecall for ${cacheKey}`)
            }
        })

        const productSupplier = market.offer("test-product").asProduct({
            factory: () => Date.now()
        })

        const product = productSupplier.assemble({})

        // Recall should not throw even if onRecall fails
        expect(() => product.recall()).not.toThrow()

        // Clean up
        consoleSpy.mockRestore()
    })

    it("should call onRecall with correct cache key for reassembled products", () => {
        const recalledCacheKeys: string[] = []
        const market = createMarket({
            onRecall: (cacheKey: string) => {
                recalledCacheKeys.push(cacheKey)
            }
        })

        const productSupplier = market.offer("test-product").asProduct({
            factory: () => Date.now()
        })

        const initialProduct = productSupplier.assemble({})
        const initialCacheKey = initialProduct.cacheKey

        // Reassemble the product
        const newProduct = initialProduct.reassemble({})
        const newCacheKey = newProduct.cacheKey

        // Cache keys should be different
        expect(newCacheKey).not.toBe(initialCacheKey)

        // Recall the new product
        newProduct.recall()

        // onRecall should have been called with the new cache key
        expect(recalledCacheKeys).toHaveLength(1)
        expect(recalledCacheKeys[0]).toBe(newCacheKey)
    })

    it("should auto recall product after timeout", async () => {
        const market = createMarket()

        const timedSupplier = market.offer("timed").asProduct({
            factory: () => Date.now(),
            timeout: 50
        })

        const product = timedSupplier.assemble({})

        const initial = product.unpack()

        await sleep(70)

        const after = product.unpack()

        expect(after).not.toBe(initial)
    })
})
