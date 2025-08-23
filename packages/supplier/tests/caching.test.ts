import { describe, it, expect } from "vitest"
import { index, createMarket, $ } from "#index"
import { sleep } from "./lib/index.ts"
import memo, { memoizeClear } from "memoize"

describe("Caching System", () => {
    it("should reassemble product if dependent suppliers reassembles", async () => {
        const market = createMarket({
            memoFn: ({ unpack }) => {
                return memo(unpack)
            }
        })
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
        const market = createMarket({
            memoFn: ({ unpack }) => {
                return memo(unpack)
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
        const market = createMarket({
            memoFn: ({ unpack }) => {
                return memo(unpack)
            },
            recallFn: (product) => {
                memoizeClear(product.unpack)
            }
        })
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
        const market = createMarket({
            memoFn: ({ unpack }) => {
                return memo(unpack)
            },
            recallFn: (product) => {
                memoizeClear(product.unpack)
            }
        })
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

    it("should respect the memo flag in asService", async () => {
        const market = createMarket({
            memoFn: ({ unpack }) => {
                return memo(unpack)
            }
        })

        // Create a service with memo: true (default when memoFn is provided)
        const memoizedSupplier = market.offer("memoized").asProduct({
            factory: () => Date.now()
        })

        // Create a service with memo: false
        const nonMemoizedSupplier = market.offer("non-memoized").asProduct({
            factory: () => Date.now(),
            memo: false
        })

        // Create a service with memo: true (explicit)
        const ExplicitMemoizedService = market
            .offer("explicit-memoized")
            .asProduct({
                factory: () => Date.now(),
                memo: true
            })

        // Test memoized service - should return same result on multiple calls
        const memoizedProduct = memoizedSupplier.assemble({})
        const firstCall = memoizedProduct.unpack()
        await sleep(10) // Small delay to ensure timestamp would be different

        // Second call should return cached result
        const secondCall = memoizedProduct.unpack()
        expect(firstCall).toBe(secondCall)

        // Test non-memoized service - should return different result on each call
        const nonMemoizedProduct = nonMemoizedSupplier.assemble({})
        const firstNonMemoized = nonMemoizedProduct.unpack()
        await sleep(10) // Small delay to ensure timestamp would be different

        // Second call should return new result (no caching)
        const secondNonMemoized = nonMemoizedProduct.unpack()
        expect(firstNonMemoized).not.toBe(secondNonMemoized)

        // Test explicit memoized service - should behave same as default
        const explicitProduct = ExplicitMemoizedService.assemble({})
        const firstExplicit = explicitProduct.unpack()
        await sleep(10)

        const secondExplicit = explicitProduct.unpack()
        expect(firstExplicit).toBe(secondExplicit)
    })

    it("should respect the recallable flag with memoFn", async () => {
        const market = createMarket({
            memoFn: ({ unpack }) => {
                return memo(unpack)
            },
            recallFn: (product) => {
                // Clear memoization for this service
                memoizeClear(product.unpack)
            }
        })

        // Create a service that should be memoized and invalidated
        const recallableSupplier = market.offer("recallable").asProduct({
            factory: () => Date.now()
        })
        // Create a service that should be memoized and invalidated
        const explicitRecallableSupplier = market
            .offer("explicit-recallable")
            .asProduct({
                factory: () => Date.now(),
                recallable: true // Should be tracked for invalidation
            })

        // Create a service that should be memoized but NOT invalidated
        const nonRecallableSupplier = market.offer("non-recallable").asProduct({
            factory: () => Date.now(),
            recallable: false // Should NOT be tracked for invalidation
        })

        // Test that both services are memoized initially
        const recallableProduct = recallableSupplier.assemble({})
        const firstCall = recallableProduct.unpack()
        await sleep(10) // Small delay

        const secondCall = recallableProduct.unpack()
        // Should return memoized result (same timestamp)
        expect(firstCall).toBe(secondCall)

        const explicitRecallableProduct = explicitRecallableSupplier.assemble(
            {}
        )
        const firstExplicitRecallable = explicitRecallableProduct.unpack()
        await sleep(10)

        const secondExplicitRecallable = explicitRecallableProduct.unpack()
        expect(firstExplicitRecallable).toBe(secondExplicitRecallable)

        const nonRecallableProduct = nonRecallableSupplier.assemble({})
        const firstNonRecallable = nonRecallableProduct.unpack()
        await sleep(10)

        const secondNonRecallable = nonRecallableProduct.unpack()
        // Should also return memoized result
        expect(firstNonRecallable).toBe(secondNonRecallable)

        // Now test invalidation
        // Call recall on the cacheable service - this should clear its memoization
        recallableProduct.recall()

        // Next call should create new memoized value
        const afterRecall = recallableProduct.unpack()
        expect(afterRecall).not.toBe(firstCall)

        // But the non-invalidating service should still be memoized
        const thirdNonRecallable = nonRecallableProduct.unpack()
        expect(thirdNonRecallable).toBe(firstNonRecallable)

        explicitRecallableProduct.recall()

        const afterExplicitRecall = explicitRecallableProduct.unpack()
        expect(afterExplicitRecall).not.toBe(firstExplicitRecallable)

        // Test that recall on non-invalidating service doesn't clear memoization
        nonRecallableProduct.recall()

        // Service should still return memoized value
        const afterNonRecallableRecall = nonRecallableProduct.unpack()
        expect(afterNonRecallableRecall).toBe(firstNonRecallable)
    })

    it("should respect the recallable flag with custom cache", async () => {
        // Create a simple cache using Map
        const cache = new Map<string, any>()

        const market = createMarket({
            memoFn: ({ id, unpack }) => {
                return () => {
                    if (cache.has(id)) {
                        return cache.get(id)
                    }
                    const product = unpack()
                    cache.set(id, product)
                    return product
                }
            },
            recallFn: (product) => {
                // Clear cache entries for this service when invalidated
                cache.delete(product.id)
            }
        })

        // Create a service that uses custom caching and should be invalidated
        const recallableSupplier = market.offer("recallable").asProduct({
            factory: () => Date.now()
        })

        // Create a service that uses custom caching but should NOT be invalidated
        const nonRecallableSupplier = market
            .offer("non-invalidating")
            .asProduct({
                factory: () => Date.now(),
                memo: true,
                recallable: false // Should NOT be tracked for invalidation
            })

        // Test that both services populate the cache initially
        const recallableProduct = recallableSupplier.assemble({})
        const firstCall = recallableProduct.unpack()
        expect(cache.size).toBeGreaterThan(0) // Cache has entries

        const nonRecallableProduct = nonRecallableSupplier.assemble({})
        const firstNonRecallable = nonRecallableProduct.unpack()
        const cacheSizeBeforeRecall = cache.size

        // Now test invalidation
        // Call recall on the cacheable service - this should clear its cache entries
        recallableProduct.recall()

        // The cache should be smaller now (cacheable service entries cleared)
        expect(cache.size).toBeLessThan(cacheSizeBeforeRecall)

        // But the non-invalidating service entries should still be in cache
        const remainingCacheSize = cache.size
        expect(remainingCacheSize).toBeGreaterThan(0)

        // Test that recall on non-invalidating service doesn't clear cache
        nonRecallableProduct.recall()

        // Cache size should be the same (no invalidation)
        expect(cache.size).toBe(remainingCacheSize)
    })
})
