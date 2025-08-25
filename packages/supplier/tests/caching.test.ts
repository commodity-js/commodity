import { describe, it, expect } from "vitest"
import { index, createMarket, $, sleep } from "#index"
import memo, { memoizeClear } from "memoize"

describe("Caching System", () => {
    it("should reassemble product if dependent suppliers reassembles", async () => {
        const market = createMarket({
            memoFn: ({ factory }) => {
                return memo(factory)
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
            memoFn: ({ factory }) => {
                return memo(factory)
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
            memoFn: ({ factory }) => {
                return memo(factory)
            },
            recallFn: ({ factory }) => {
                memoizeClear(factory)
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
            memoFn: ({ factory }) => {
                return memo(factory)
            },
            recallFn: ({ factory }) => {
                memoizeClear(factory)
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
            memoFn: ({ factory }) => {
                return memo(factory)
            },
            recallFn: ({ factory }) => {
                memoizeClear(factory)
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
            memoFn: ({ factory }) => {
                return memo(factory)
            },
            recallFn: ({ factory }) => {
                // Clear memoization for this service
                memoizeClear(factory)
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
            suppliers: [explicitRecallableSupplier],
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

        // But the non-invalidating service should still be memoized, even if a dependent of recallableProduct
        const thirdNonRecallable = nonRecallableProduct.unpack()
        expect(thirdNonRecallable).toBe(firstNonRecallable)

        explicitRecallableProduct.recall()

        const afterExplicitRecall = explicitRecallableProduct.unpack()
        expect(afterExplicitRecall).not.toBe(firstExplicitRecallable)
    })

    it("should respect the recallable flag with custom cache", async () => {
        // Create a simple cache using Map
        const cache = new Map<string, any>()

        const market = createMarket({
            memoFn: ({ id, factory }) => {
                return () => {
                    if (cache.has(id)) {
                        return cache.get(id)
                    }
                    const product = factory()
                    cache.set(id, product)
                    return product
                }
            },
            recallFn: ({ id }) => {
                // Clear cache entries for this service when invalidated
                cache.delete(id)
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
        recallableProduct.unpack()
        expect(cache.size).toBeGreaterThan(0) // Cache has entries

        const nonRecallableProduct = nonRecallableSupplier.assemble({})
        nonRecallableProduct.unpack()
        const cacheSizeBeforeRecall = cache.size

        // Now test invalidation
        // Call recall on the cacheable service - this should clear its cache entries
        recallableProduct.recall()

        // The cache should be smaller now (cacheable service entries cleared)
        expect(cache.size).toBeLessThan(cacheSizeBeforeRecall)

        // But the non-invalidating service entries should still be in cache
        const remainingCacheSize = cache.size
        expect(remainingCacheSize).toBeGreaterThan(0)

        // Test that recall on non-invalidating product doesn't clear cache
        expect(nonRecallableProduct.recall).toBeUndefined()

        // Cache size should be the same (no invalidation)
        expect(cache.size).toBe(remainingCacheSize)
    })

    it("should support optimistic caching with setOptimistic", async () => {
        const market = createMarket({
            memoFn: ({ factory }) => {
                return memo(factory)
            },
            recallFn: ({ factory }) => {
                memoizeClear(factory)
            }
        })

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
        const market = createMarket({
            memoFn: ({ factory }) => {
                return memo(factory)
            }
        })

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

    it("should not use timeout parameter in setOptimistic if memoed", async () => {
        const market = createMarket({
            memoFn: ({ factory }) => {
                return memo(factory)
            }
        })

        const OptimisticSupplier = market.offer("timeout-test").asProduct({
            factory: async () => {
                await sleep(100) // Slow computation
                return "final-value"
            }
        })

        const product = OptimisticSupplier.assemble({})

        // Set optimistic value with custom timeout
        product.setOptimistic("fast-value", 50) // 50ms timeout
        expect(await product.unpack()).toBe("fast-value")

        // Wait for timeout to expire
        await sleep(60)

        // Should still return optimistic value until background computation completes
        expect(await product.unpack()).toBe("fast-value")

        // Wait for background computation to complete
        await sleep(100)

        // Now should return real value
        expect(await product.unpack()).toBe("final-value")
    })

    it("should respect timeout for non-memoized factories", async () => {
        const market = createMarket({
            memoFn: ({ factory }) => {
                return memo(factory)
            }
        })

        let factoryCallCount = 0
        const NonMemoizedSupplier = market
            .offer("timeout-non-memoized")
            .asProduct({
                factory: () => {
                    factoryCallCount++
                    return `factory-result-${factoryCallCount}`
                },
                memo: false
            })

        const product = NonMemoizedSupplier.assemble({})

        // Set optimistic value with custom timeout
        product.setOptimistic("optimistic-value", 200)
        expect(product.unpack()).toBe("optimistic-value")

        // Factory should not be called yet
        expect(factoryCallCount).toBe(0)

        // Wait for a short time - should still return optimistic value
        await sleep(100)
        expect(product.unpack()).toBe("optimistic-value")
        expect(factoryCallCount).toBe(0)

        // Wait for timeout to expire (using default 2000ms)
        await sleep(200)

        // Should now return real factory result
        const realValue = product.unpack()
        expect(realValue).toBe("factory-result-1")
        expect(realValue).not.toBe("optimistic-value")
        expect(factoryCallCount).toBe(1)

        // Second call should call factory again (non-memoized)
        const secondValue = product.unpack()
        expect(secondValue).toBe("factory-result-2")
        expect(factoryCallCount).toBe(2)
    })

    it("should handle factory failures", async () => {
        const market = createMarket({
            memoFn: ({ factory }) => {
                return memo(factory)
            },
            recallFn: ({ factory }) => {
                memoizeClear(factory)
            }
        })

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
        const market = createMarket({
            memoFn: ({ factory }) => {
                return memo(factory)
            },
            recallFn: ({ factory }) => {
                memoizeClear(factory)
            }
        })

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
        const market = createMarket({
            memoFn: ({ factory }) => {
                return memo(factory)
            }
        })

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
})
