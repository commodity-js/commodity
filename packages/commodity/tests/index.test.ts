import { describe, it, expect, vi, beforeEach } from "vitest"
import { createMarket } from "#index"
import { index, once, sleep } from "#utils"

describe("commodity", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("Resource Offer", () => {
        it("should offer a resource and return it packed", () => {
            const market = createMarket()
            const $$resource = market.offer("resource").asResource<string>()

            const $resource = $$resource.pack("test-value")

            expect($resource.unpack()).toBe("test-value")
            expect($resource.name).toBe("resource")
            expect($$resource.name).toBe("resource")
            expect($$resource._resource).toBe(true)
        })

        it("should throw error if two supplies with the same name are offered", () => {
            const market = createMarket()

            market.offer("duplicate").asResource<string>()
            expect(() => {
                market.offer("duplicate").asResource<string>()
            }).toThrow("Name duplicate already exists")
        })

        it("should handle different resource types correctly", () => {
            const market = createMarket()
            const $$string = market.offer("string").asResource<string>()
            const $$number = market.offer("number").asResource<number>()
            const $$object = market.offer("object").asResource<{
                name: string
            }>()

            const $string = $$string.pack("hello")
            const $number = $$number.pack(42)
            const $object = $$object.pack({ name: "test" })

            expect($string.unpack()).toBe("hello")
            expect($number.unpack()).toBe(42)
            expect($object.unpack()).toEqual({ name: "test" })
        })
    })

    describe("Product Offer", () => {
        it("should offer a product with no suppliers", () => {
            const market = createMarket()
            const $$product = market.offer("product").asProduct({
                factory: () => "product"
            })

            const $product = $$product.assemble({})

            expect($product.unpack()).toBe("product")
            expect($$product.name).toBe("product")
            expect($$product._product).toBe(true)
        })

        it("should offer a product with suppliers", () => {
            const market = createMarket()
            const $$A = market.offer("A").asProduct({
                factory: () => "A"
            })

            const $$B = market.offer("B").asProduct({
                factory: () => "B"
            })

            const $$test = market.offer("test").asProduct({
                suppliers: [$$A, $$B],
                factory: ($) => {
                    return {
                        A: $($$A),
                        B: $($$B)
                    }
                }
            })

            const $test = $$test.assemble({})

            expect($test.unpack()).toEqual({
                A: "A",
                B: "B"
            })
        })
    })

    describe("Supply Chain", () => {
        it("should assemble products from suppliers", () => {
            const market = createMarket()
            const $$A = market.offer("A").asProduct({
                factory: () => "A"
            })

            const $$B = market.offer("B").asProduct({
                factory: () => "B"
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$A, $$B],
                factory: ($) => {
                    return {
                        A: $($$A),
                        B: $($$B)
                    }
                }
            })

            const $main = $$main.assemble({})

            expect($main.unpack()).toEqual({
                A: "A",
                B: "B"
            })
        })

        it("should respect initial supplies and not override them during assembly", () => {
            const market = createMarket()
            const $$product = market.offer("product").asProduct({
                factory: () => "product"
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$product],
                factory: ($) => {
                    const product = $($$product)
                    return {
                        product
                    }
                }
            })

            const $main = $$main.assemble(
                index($$product.pack("initial-product"))
            )

            expect($main.unpack()).toEqual({
                product: "initial-product"
            })
        })

        it("should support Product.pack(value) and $[Product.id].pack(value) for creating product instances", () => {
            const market = createMarket()
            const $$config = market.offer("config").asProduct({
                factory: () => ({ env: "development", debug: true })
            })

            const $$logger = market.offer("logger").asProduct({
                factory: () => ({ level: "info", prefix: "APP" })
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$config, $$logger],
                factory: ($) => {
                    const $config = $$config.pack({
                        env: "production",
                        debug: false
                    })

                    const $logger = $[$$logger.name].pack({
                        level: "debug",
                        prefix: "TEST"
                    })

                    return {
                        config: $config.unpack(),
                        logger: $logger.unpack(),
                        suppliedConfig: $[$config.name].unpack(),
                        suppliedLogger: $[$$logger.name].unpack()
                    }
                }
            })

            const $main = $$main.assemble({})

            expect($main.unpack().config).toEqual({
                env: "production",
                debug: false
            })
            expect($main.unpack().logger).toEqual({
                level: "debug",
                prefix: "TEST"
            })
            expect($main.unpack().suppliedConfig).toEqual({
                env: "development",
                debug: true
            })
            expect($main.unpack().suppliedLogger).toEqual({
                level: "info",
                prefix: "APP"
            })
        })
        it("should enable context switching by calling reassemble on products", () => {
            const market = createMarket()
            const $$config = market.offer("config").asResource<string>()
            const $$name = market.offer("name").asResource<string>()
            const $$count = market.offer("count").asResource<number>()

            const $$test = market.offer("test").asProduct({
                suppliers: [$$config, $$name, $$count],
                factory: ($) => {
                    return {
                        config: $($$config),
                        name: $($$name),
                        count: $($$count)
                    }
                }
            })

            const initialSupplies = index(
                $$config.pack("initial-config"),
                $$name.pack("initial-name"),
                $$count.pack(1)
            )

            const $test = $$test.assemble(initialSupplies)

            const $newTest1 = $test.reassemble(
                index(
                    $$config.pack("new-config"),
                    $$name.pack("new-name"),
                    $$count.pack(42)
                )
            )

            const $newTest2 = $test.reassemble(
                index($$config.pack("new-config"))
            )

            const $newTest3 = $test.reassemble(index($$name.pack("new-name")))

            const $newTest4 = $test.reassemble(
                index($$config.pack("new-config"), $$count.pack(42))
            )

            expect($test.unpack()).toEqual({
                config: "initial-config",
                name: "initial-name",
                count: 1
            })

            expect($newTest1.unpack()).toEqual({
                config: "new-config",
                name: "new-name",
                count: 42
            })

            expect($newTest2.unpack()).toEqual({
                config: "new-config",
                name: "initial-name",
                count: 1
            })

            expect($newTest3.unpack()).toEqual({
                config: "initial-config",
                name: "new-name",
                count: 1
            })

            expect($newTest4.unpack()).toEqual({
                config: "new-config",
                name: "initial-name",
                count: 42
            })
        })
    })

    describe("Callable Object API", () => {
        it("should support both property access and function calls for dependencies", () => {
            const market = createMarket()
            const $$resource = market.offer("resource").asResource<string>()
            const $$product = market.offer("product").asProduct({
                factory: () => "product"
            })

            const $$test = market.offer("test-product").asProduct({
                suppliers: [$$resource, $$product],
                factory: ($) => {
                    return {
                        propAccess: {
                            resource: $[$$resource.name].unpack(),
                            product: $[$$product.name].unpack()
                        },
                        funcAccess: {
                            resource: $($$resource),
                            product: $($$product)
                        }
                    }
                }
            })

            const $result = $$test.assemble(index($$resource.pack("resource")))

            expect($result.unpack().propAccess).toEqual({
                resource: "resource",
                product: "product"
            })
            expect($result.unpack().funcAccess).toEqual({
                resource: "resource",
                product: "product"
            })
        })
    })

    describe("Factory memoization", () => {
        it("should create separate memoization contexts for different assembly calls", () => {
            const factorySpy = vi.fn().mockReturnValue("product")

            const market = createMarket()
            const $$product = market.offer("product").asProduct({
                factory: factorySpy
            })

            const $product = $$product.assemble({})

            expect($product.unpack()).toBe("product")
            expect(factorySpy).toHaveBeenCalledTimes(1)

            // The memoization works within the same assembly context
            // Each call to assemble() creates a new context, so the factory is called again
            const secondAccess = $$product.assemble({})
            expect(secondAccess.unpack()).toBe("product")
            // Factory is called again for the new assembly context
            expect(factorySpy).toHaveBeenCalledTimes(2)
        })

        it("should memoize factory calls when accessed multiple times within the same assembly context", () => {
            const factorySpy = vi.fn().mockReturnValue("memoized")

            const market = createMarket()
            const $$spy = market.offer("spy").asProduct({
                factory: factorySpy
            })

            const $$test = market.offer("test").asProduct({
                suppliers: [$$spy],
                factory: ($) => {
                    $($$spy)
                    $($$spy)

                    return "test"
                }
            })

            $$test.assemble({}).unpack()
            // Factory should only be called once due to memoization within the same assembly context
            expect(factorySpy).toHaveBeenCalledTimes(1)
        })

        it("should keep memoization even if multiple dependents are nested", () => {
            const factory1Spy = vi.fn().mockReturnValue("A")

            const market = createMarket()
            const $$A = market.offer("A").asProduct({
                factory: factory1Spy
            })

            const $$B = market.offer("B").asProduct({
                suppliers: [$$A],
                factory: ($) => {
                    $($$A)
                    return "B"
                }
            })

            const $$test = market.offer("test").asProduct({
                suppliers: [$$A, $$B],
                factory: ($) => {
                    return {
                        A: $($$A),
                        B: $($$B)
                    }
                }
            })

            const $test = $$test.assemble({})

            expect($test.unpack()).toEqual({
                A: "A",
                B: "B"
            })

            // factory1  should only be called once due to memoization within the same context
            expect(factory1Spy).toHaveBeenCalledTimes(1)
        })

        it("should reassemble product if dependent suppliers reassembles", async () => {
            const market = createMarket()
            // productA will be reassembled
            const $$A = market.offer("A").asProduct({
                factory: () => Date.now()
            })

            // productB will be reassembled when productA reassembles
            const $$B = market.offer("B").asProduct({
                suppliers: [$$A],
                factory: () => Date.now()
            })

            // productC - doesn't depend on anything, so it will not be reassembled
            const $$C = market.offer("C").asProduct({
                factory: () => Date.now()
            })

            // productD will be reassembled when productB reassembles
            const $$D = market.offer("D").asProduct({
                suppliers: [$$B],
                factory: () => Date.now()
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$A, $$B, $$C, $$D],
                factory: ($) => {
                    return {
                        A: $($$A),
                        B: $($$B),
                        C: $($$C),
                        D: $($$D)
                    }
                }
            })

            const $initialMain = $$main.assemble({})
            const initialA = $initialMain.unpack().A
            const initialB = $initialMain.unpack().B
            const initialC = $initialMain.unpack().C
            const initialD = $initialMain.unpack().D

            await sleep(100)

            // Override productA - this should trigger resupply of productB and productD
            // but productC should remain cached
            const $newMain = $initialMain.reassemble(
                index($$A.pack(Date.now()))
            )

            expect($newMain.unpack().A).not.toBe(initialA)
            expect($newMain.unpack().B).not.toBe(initialB)
            expect($newMain.unpack().C).toBe(initialC)
            expect($newMain.unpack().D).not.toBe(initialD)
        })

        it("should handle recursive dependency chains correctly", async () => {
            const market = createMarket()
            const $$A = market.offer("A").asProduct({
                factory: () => Date.now()
            })

            const $$B = market.offer("B").asProduct({
                suppliers: [$$A],
                factory: () => Date.now()
            })

            const $$C = market.offer("C").asProduct({
                suppliers: [$$B],
                factory: () => Date.now()
            })

            const $$D = market.offer("D").asProduct({
                suppliers: [$$C],
                factory: () => Date.now()
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$A, $$B, $$C, $$D],
                factory: ($) => {
                    return {
                        A: $($$A),
                        B: $($$B),
                        C: $($$C),
                        D: $($$D)
                    }
                }
            })

            const $main = $$main.assemble({})

            const initialA = $main.unpack().A
            const initialB = $main.unpack().B
            const initialC = $main.unpack().C
            const initialD = $main.unpack().D

            await sleep(100)

            // Override productA - this should cascade through B, C, and D
            const $newMain = $main.reassemble(index($$A.pack(Date.now())))

            expect($newMain.unpack().A).not.toBe(initialA)
            expect($newMain.unpack().B).not.toBe(initialB)
            expect($newMain.unpack().C).not.toBe(initialC)
            expect($newMain.unpack().D).not.toBe(initialD)
        })
    })

    describe("Preload Feature", () => {
        it("should init eager products, not lazy ones ", async () => {
            const market = createMarket()
            const initedValueSpy = vi
                .fn<() => "inited">()
                .mockReturnValue("inited")
            const normalValueSpy = vi.fn().mockReturnValue("normal")
            const lazyValueSpy = vi.fn().mockReturnValue("lazy")

            const $$inited = market.offer("inited").asProduct({
                factory: () => initedValueSpy,
                init: (value) => value()
            })

            const $$normal = market.offer("normal").asProduct({
                factory: () => normalValueSpy
            })

            const $$lazy = market.offer("lazy").asProduct({
                factory: () => lazyValueSpy,
                init: (value) => value(),
                lazy: true
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$inited, $$normal, $$lazy],
                factory: () => {
                    // Don't access any dependencies yet
                    return "main"
                }
            })

            const $main = $$main.assemble({})

            await sleep(10)

            expect(initedValueSpy).toHaveBeenCalledTimes(1)
            expect(normalValueSpy).toHaveBeenCalledTimes(0)
            expect(lazyValueSpy).toHaveBeenCalledTimes(0)
            expect($main.unpack()).toBe("main")
        })

        it("should handle init errors gracefully without breaking the supply chain", async () => {
            const market = createMarket()
            const errorValueSpy = vi.fn().mockImplementation(() => {
                throw new Error()
            })

            const $$error = market.offer("error").asProduct({
                factory: () => once(errorValueSpy),
                init: (value) => value()
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$error],
                factory: ($) => {
                    // Don't access ErrorProduct yet
                    return "main"
                }
            })

            // This should not throw even though ErrorProduct will fail during init
            const $main = $$main.assemble({})

            await sleep(10)

            expect($main.unpack()).toBe("main")
            expect(errorValueSpy).toHaveBeenCalledTimes(1)
        })

        it("should still throw error when accessing a failed inited product", async () => {
            const market = createMarket()
            const errorValueSpy = vi.fn().mockImplementation(() => {
                throw new Error()
            })

            const $$error = market.offer("error").asProduct({
                factory: () => once(errorValueSpy),
                init: (value) => value()
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$error],
                factory: ($) => {
                    return $($$error)()
                }
            })

            await sleep(10)

            // Accessing the product should still throw the error
            expect(() => $$main.assemble({}).unpack()).toThrow()
        })

        it("should work with complex dependency chains and selective initing", async () => {
            const market = createMarket()
            const ASpy = vi.fn().mockReturnValue("A")
            const BSpy = vi.fn().mockReturnValue("B")

            const $$A = market.offer("A").asProduct({
                factory: () => once(ASpy),
                init: (value) => value()
            })

            const $$B = market.offer("B").asProduct({
                factory: () => once(BSpy)
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$A, $$B],
                factory: () => {
                    return "main"
                }
            })

            const $main = $$main.assemble({})

            await sleep(10)

            expect(ASpy).toHaveBeenCalledTimes(1)
            expect(BSpy).toHaveBeenCalledTimes(0)
            expect($main.unpack()).toBe("main")
        })
    })

    describe("Lazy Feature", () => {
        it("should run factory for non-lazy suppliers during assemble", () => {
            const eagerSpy = vi.fn().mockReturnValue("eager")

            const market = createMarket()
            const $$eager = market.offer("eager").asProduct({
                factory: eagerSpy,
                lazy: false // explicitly non-lazy
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$eager],
                factory: () => "main"
            })

            // Factory should be called during assemble, even though we don't access it
            $$main.assemble({})

            expect(eagerSpy).toHaveBeenCalledTimes(1)
        })

        it("should NOT run factory for lazy suppliers during assemble", () => {
            const lazySpy = vi.fn().mockReturnValue("lazy")

            const market = createMarket()
            const $$lazy = market.offer("lazy").asProduct({
                factory: lazySpy,
                lazy: true
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$lazy],
                factory: () => "main"
            })

            // Factory should NOT be called during assemble
            $$main.assemble({})

            expect(lazySpy).toHaveBeenCalledTimes(0)
        })

        it("should run lazy supplier factory only when first accessed", () => {
            const lazySpy = vi.fn().mockReturnValue("lazy")

            const market = createMarket()
            const $$lazy = market.offer("lazy").asProduct({
                factory: lazySpy,
                lazy: true
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$lazy],
                factory: ($) => {
                    const lazyValue = $($$lazy)
                    return { lazyValue }
                }
            })

            const $main = $$main.assemble({})

            // Factory should not be called during assemble
            expect(lazySpy).toHaveBeenCalledTimes(0)

            // Factory should be called when we access the lazy supplier
            expect($main.unpack().lazyValue).toBe("lazy")
            expect(lazySpy).toHaveBeenCalledTimes(1)
        })

        it("Lazy suppliers shield eager suppliers from being lazy loaded early when deeper in dependency chain", async () => {
            const ASpy = vi.fn().mockReturnValue("A")
            const BSpy = vi.fn().mockReturnValue("B")
            const lazySpy = vi.fn().mockReturnValue("lazy")

            const market = createMarket()
            const $$A = market.offer("A").asProduct({
                factory: ASpy
            })

            const $$lazy = market.offer("lazy").asProduct({
                suppliers: [$$A],
                factory: lazySpy,
                lazy: true
            })

            const $$B = market.offer("B").asProduct({
                suppliers: [$$lazy],
                factory: BSpy
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$B],
                factory: ($) => {
                    const main = $($$B)
                    return { main }
                }
            })

            const $main = $$main.assemble({})

            await sleep(100)

            expect(BSpy).toHaveBeenCalledTimes(1)
            expect(lazySpy).toHaveBeenCalledTimes(0)
            expect(ASpy).toHaveBeenCalledTimes(0)
        })

        it("should handle lazy suppliers with reassembly", () => {
            const lazySpy = vi.fn().mockReturnValue("lazy")

            const market = createMarket()
            const $$lazy = market.offer("lazy").asProduct({
                factory: lazySpy,
                lazy: true
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$lazy],
                factory: ($) => {
                    const lazyValue = $($$lazy)
                    return { lazyValue }
                }
            })

            const $main = $$main.assemble({})

            expect($main.unpack().lazyValue).toBe("lazy")
            expect(lazySpy).toHaveBeenCalledTimes(1)

            const $newMain = $main.reassemble({})
            expect($newMain.unpack().lazyValue).toBe("lazy")
            expect(lazySpy).toHaveBeenCalledTimes(1) // Still only called once
        })

        it("should handle lazy suppliers with prototypes", () => {
            const originalSpy = vi.fn().mockReturnValue("original")
            const prototypeSpy = vi.fn().mockReturnValue("prototype")

            const market = createMarket()
            const $$original = market.offer("original").asProduct({
                factory: originalSpy,
                lazy: true
            })

            const $$prototype = $$original.prototype({
                factory: prototypeSpy,
                lazy: true
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$original],
                factory: ($) => {
                    const value = $($$prototype)
                    return { value }
                }
            })

            const $main = $$main.try($$prototype).assemble({})

            // Neither factory should be called during assemble
            expect(originalSpy).toHaveBeenCalledTimes(0)
            expect(prototypeSpy).toHaveBeenCalledTimes(0)

            // Only prototype factory should be called when accessed
            expect($main.unpack().value).toBe("prototype")
            expect(originalSpy).toHaveBeenCalledTimes(0)
            expect(prototypeSpy).toHaveBeenCalledTimes(1)
        })

        it("should default to non-lazy behavior when lazy is not specified", () => {
            const eagerSpy = vi.fn().mockReturnValue("default-eager")

            const market = createMarket()
            const $$default = market.offer("default").asProduct({
                factory: eagerSpy
                // lazy not specified, should default to false
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$default],
                factory: () => "main"
            })

            // Factory should be called during assemble (default behavior)
            $$main.assemble({})
            expect(eagerSpy).toHaveBeenCalledTimes(1)
        })

        it("should not init lazy suppliers even when init is specified", async () => {
            const initSpy = vi.fn()
            const factorySpy = vi.fn().mockReturnValue("lazy-with-init")

            const market = createMarket()
            const $$lazy = market.offer("lazy").asProduct({
                factory: factorySpy,
                init: initSpy,
                lazy: true
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$lazy],
                factory: () => "main"
            })

            const $main = $$main.assemble({})

            // Wait a bit for any initing to complete
            await sleep(10)

            // Lazy supplier should not be inited
            expect(factorySpy).toHaveBeenCalledTimes(0)
            expect(initSpy).toHaveBeenCalledTimes(0)

            // Only when accessed should the factory run
            expect($main.unpack()).toBe("main")
            expect(factorySpy).toHaveBeenCalledTimes(0) // Still not called since we don't access the lazy supplier
        })

        it("should init non-lazy suppliers when init is specified", async () => {
            const initSpy = vi.fn()
            const factorySpy = vi.fn().mockReturnValue(() => "eager-with-init")

            const market = createMarket()
            const $$eager = market.offer("eager").asProduct({
                factory: factorySpy,
                init: initSpy,
                lazy: false
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$eager],
                factory: () => "main"
            })

            const $main = $$main.assemble({})

            await sleep(10)

            // Eager supplier should be inited
            expect(factorySpy).toHaveBeenCalledTimes(1)
            expect(initSpy).toHaveBeenCalledTimes(1)
            expect($main.unpack()).toBe("main")
        })
    })

    describe("Type Safety and Edge Cases", () => {
        it("should handle empty suppliers correctly", () => {
            const market = createMarket()
            const $$empty = market.offer("empty").asProduct({
                factory: () => "empty"
            })

            const $empty = $$empty.assemble({})
            expect($empty.unpack()).toBe("empty")
        })
    })
})
