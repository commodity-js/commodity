import { describe, it, expect, vi, type Mock, expectTypeOf } from "vitest"
import { CircularDependencyError, createMarket, index, Product } from "#index"
import { sleep, once } from "#utils"

describe("Mocks Feature", () => {
    describe("Mock Method", () => {
        it("should handle mock with less suppliers", () => {
            const market = createMarket()

            const $$resource = market.offer("resource").asResource<boolean>()

            const $$base = market.offer("base").asProduct({
                suppliers: [$$resource],
                factory: ($) => ({ base: $($$resource).unpack() })
            })

            const $$mocked = $$base.mock({
                factory: () => ({ base: true, enhanced: true }),
                suppliers: []
            })

            const $result = $$mocked.assemble({})

            expect($result.unpack()).toEqual({
                base: true,
                enhanced: true
            })
        })

        it("should not allow mocks in suppliers array", () => {
            const market = createMarket()

            const $$base = market.offer("mock").asProduct({
                factory: () => "base"
            })

            const $$mock = $$base.mock({
                suppliers: [],
                factory: () => "mock"
            })

            expect(() => {
                const $$next = market.offer("next").asProduct({
                    factory: () => "next",
                    //@ts-expect-error - mock in suppliers array
                    suppliers: [$$mock]
                })
            }).toThrow()
        })

        it("should handle init setting in mock", async () => {
            const market = createMarket()
            const baseSpy = vi.fn().mockReturnValue("base")
            const initedSpy = vi.fn().mockReturnValue("inited")

            const $$base = market.offer("base").asProduct({
                factory: () => baseSpy
            })

            const $$mocked = $$base.mock({
                factory: () => once(initedSpy) as Mock<any>,
                init: (value) => value()
            })

            const $$test = market.offer("test").asProduct({
                suppliers: [$$base],
                factory: ($) => $($$base).unpack()
            })

            const $$hired = $$test.hire([$$mocked])

            $$hired.assemble({})
            $$test.assemble({})

            await sleep(10)

            expect(baseSpy).toHaveBeenCalledTimes(0)
            expect(initedSpy).toHaveBeenCalledTimes(1)
        })

        it("should compute precise TOSUPPLY types with mock", () => {
            const market = createMarket()

            const $$config = market.offer("config").asResource<string>()
            const $$apiKey = market.offer("apiKey").asResource<string>()

            const $$logger = market.offer("logger").asProduct({
                factory: () => "logger"
            })

            // Base service - return compatible type that can be extended
            const $$base = market.offer("base").asProduct({
                factory: () => "base"
            })

            // mock with mixed resource and product suppliers
            const $$mocked = $$base.mock({
                suppliers: [$$config, $$apiKey, $$logger],
                factory: ($) => "proto"
            })

            $$mocked.assemble(
                //@ts-expect-error - missing $apiKeyResource
                index($$config.pack("test"))
            )

            $$mocked.assemble(
                //@ts-expect-error - missing $configResource
                index($$apiKey.pack("secret-key"))
            )

            // The type system should now know exactly what needs to be supplied:
            // - config and apiKey (resources must be provided)
            // - logger should NOT need to be provided (it's a product supplier)
            const $result = $$mocked.assemble(
                index($$config.pack("test"), $$apiKey.pack("secret-key"))
            )

            const output = $result.unpack()
            expect(output).toBe("proto")
        })

        it("should detect circular dependencies in mocks", () => {
            const market = createMarket()

            const $$A = market.offer("A").asProduct({
                factory: () => "serviceA"
            })

            const $$B = market.offer("B").asProduct({
                suppliers: [$$A],
                factory: ($) => "serviceB uses " + $($$A)
            })

            // Try to create circular dependency using mock
            // This should be caught by the circular dependency detection
            expect(() => {
                const $$mockA = $$A.mock({
                    factory: ($) => "mockA uses " + $($$B),
                    suppliers: [$$B] // This creates a potential circle
                })

                expectTypeOf($$mockA).toExtend<CircularDependencyError>()
            }).toThrow("Circular dependency detected")

            expect(() => {
                const $$mockA = $$A.mock({
                    factory: () => "mockA",
                    assemblers: [$$B] // This creates a potential circle
                })

                expectTypeOf($$mockA).toExtend<CircularDependencyError>()
            }).toThrow("Circular dependency detected")
        })
    })

    describe("Hire Method", () => {
        it("should allow trying alternative suppliers for testing", () => {
            const market = createMarket()

            const $$db = market.offer("db").asProduct({
                factory: () => "real-db"
            })

            const $$cache = market.offer("cache").asProduct({
                factory: () => "real-cache"
            })

            const $$logger = market.offer("logger").asProduct({
                factory: () => "real-logger"
            })

            const $$service = market.offer("service").asProduct({
                suppliers: [$$db, $$cache, $$logger],
                factory: ($) => ({
                    db: $($$db).unpack(),
                    cache: $($$cache).unpack(),
                    logger: $($$logger).unpack()
                })
            })

            // Multiple mock suppliers using mock
            const $$mockDb = $$db.mock({
                factory: () => "mock-db",
                suppliers: []
            })

            const $$mockCache = $$cache.mock({
                factory: () => "mock-cache",
                suppliers: []
            })

            const $$hired = $$service.hire([$$mockDb, $$mockCache])
            const $test = $$hired.assemble({})

            expect($test.unpack()).toEqual({
                db: "mock-db",
                cache: "mock-cache",
                logger: "real-logger" // unchanged
            })
        })

        it("should handle trying unused suppliers", () => {
            const market = createMarket()

            const $$db = market.offer("db").asProduct({
                factory: () => "db"
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$db],
                factory: ($) => "main-" + $($$db).unpack()
            })

            const $$unused = market.offer("unused").asProduct({
                factory: () => "base-extra"
            })

            const $$unusedMock = $$unused.mock({
                suppliers: [],
                factory: () => "extra-service"
            })

            const $$hired = $$main.hire([$$unusedMock])
            const $test = $$hired.assemble({})

            // The extra supplier is added to the suppliers list, but not to the result
            expect($test.unpack()).toEqual("main-db")
        })

        it("should handle empty hire calls gracefully", () => {
            const market = createMarket()

            const $$main = market.offer("main").asProduct({
                factory: () => "main"
            })

            // Hire with no suppliers - should work fine
            const $$hired = $$main.hire([])
            const $test = $$hired.assemble({})

            expect($test.unpack()).toBe("main")
        })

        it("should handle duplicate supplier names in hire (last one wins)", () => {
            const market = createMarket()

            const $$db = market.offer("db").asProduct({
                factory: () => "db"
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$db],
                factory: ($) => "main-" + $($$db).unpack()
            })

            const $$mockDb1 = $$db.mock({
                factory: () => "mock-db-1",
                suppliers: []
            })

            const $$mockDb2 = $$db.mock({
                factory: () => "mock-db-2",
                suppliers: []
            })

            const $$hired = $$main.hire([$$mockDb1, $$mockDb2])
            expect($$hired.hiredSuppliers.map((s) => s.name)).toEqual([
                $$mockDb1.name,
                $$mockDb2.name
            ])
            const result = $$hired.assemble({}).unpack()
            expect(result).toEqual("main-mock-db-2")
        })

        it("should allow assembling multiple suppliers together", () => {
            const market = createMarket()

            const $$shared = market.offer("shared").asResource<string>()
            const $$unique = market.offer("unique").asResource<number>()

            const $$A = market.offer("A").asProduct({
                suppliers: [$$shared],
                factory: ($) => {
                    const shared = $($$shared).unpack()
                    return "A-" + shared
                }
            })

            const $$B = market.offer("B").asProduct({
                suppliers: [$$shared, $$unique],
                factory: ($) => {
                    const shared = $($$shared).unpack()
                    const unique = $($$unique).unpack()
                    return "B-" + shared + "-" + unique
                }
            })

            const $result = $$A
                .hire([$$B])
                .assemble(
                    index($$shared.pack("shared-data"), $$unique.pack(123))
                )

            expect($result.unpack()).toEqual("A-shared-data")
            const BResult = $result.$($$B).unpack()
            expect(BResult).toEqual("B-shared-data-123")
        })

        it("should type check that all required resources are provided", () => {
            const market = createMarket()

            const $$db = market.offer("db").asResource<string>()
            const $$cache = market.offer("cache").asResource<string>()

            const $$user = market.offer("user").asProduct({
                suppliers: [$$db],
                factory: ($) => {
                    const db = $($$db).unpack()
                    return "user-" + db
                }
            })

            const $$session = market.offer("session").asProduct({
                suppliers: [$$cache],
                factory: ($) => {
                    const cache = $($$cache).unpack()
                    return "session-" + cache
                }
            })

            const $$combined = $$user.hire([$$session])

            const db = $$db.pack("postgresql://localhost:5432/db")
            const cache = $$cache.pack("redis://localhost:6379")

            expect(() => {
                // @ts-expect-error - cache is missing
                const $combined = $$combined.assemble(index(db))
                $combined.$($$session).unpack()
            }).toThrow()

            const $result = $$combined.assemble(index(db, cache))

            expect($result.unpack()).toEqual(
                "user-postgresql://localhost:5432/db"
            )

            const sessionResult = $result.$($$session).unpack()
            expect(sessionResult).toEqual("session-redis://localhost:6379")
        })

        it("should handle reassembly correctly with hire() method", () => {
            const market = createMarket()

            const $$number = market.offer("number").asResource<number>()

            const $$doubler = market.offer("doubler").asProduct({
                suppliers: [$$number],
                factory: ($) => $($$number).unpack() * 2
            })

            const $$tripler = market.offer("tripler").asProduct({
                suppliers: [$$number],
                factory: ($) => $($$number).unpack() * 3
            })

            const $result = $$doubler
                .hire([$$tripler])
                .assemble(index($$number.pack(5)))

            expect($result.unpack()).toBe(10) // 5 * 2
            expect($result.$($$tripler).unpack()).toBe(15) // 5 * 3

            const $reassembled = $result.reassemble(index($$number.pack(10)))
            expect($reassembled.unpack()).toBe(20) // 10 * 2
            expect($reassembled.$($$tripler).unpack()).toBe(30) // 10 * 3
        })

        it("should handle errors in hire() method gracefully", () => {
            const market = createMarket()

            const $$working = market.offer("working").asProduct({
                factory: () => "working-value"
            })

            const $$failing = market.offer("failing").asProduct({
                factory: () => {
                    throw new Error("Supplier failed")
                    return
                }
            })

            const $result = $$working.hire([$$failing]).assemble({})
            expect($result.unpack()).toBe("working-value")
            expect(() => {
                $result.$($$failing).unpack()
            }).toThrow("Supplier failed")
        })
    })

    describe("Reassemble Method with Hire Parameters", () => {
        it("should reassemble with alternative suppliers", () => {
            const market = createMarket()

            const $$db = market.offer("db").asProduct({
                factory: () => "real-db"
            })

            const $$cache = market.offer("cache").asProduct({
                factory: () => "real-cache"
            })

            const $$service = market.offer("service").asProduct({
                suppliers: [$$db, $$cache],
                factory: ($) => ({
                    db: $($$db).unpack(),
                    cache: $($$cache).unpack()
                })
            })

            const $initial = $$service.assemble({})
            expect($initial.unpack()).toEqual({
                db: "real-db",
                cache: "real-cache"
            })

            // Create mocks for reassembly
            const $$mockDb = $$db.mock({
                factory: () => "mock-db",
                suppliers: []
            })

            const $$mockCache = $$cache.mock({
                factory: () => "mock-cache",
                suppliers: []
            })

            // Reassemble with mocks
            const $reassembled = $initial.reassemble({}, [
                $$mockDb,
                $$mockCache
            ])

            expect($reassembled.unpack()).toEqual({
                db: "mock-db",
                cache: "mock-cache"
            })
        })

        it("should reassemble with partial supplier override", () => {
            const market = createMarket()

            const $$db = market.offer("db").asProduct({
                factory: () => "real-db"
            })

            const $$cache = market.offer("cache").asProduct({
                factory: () => "real-cache"
            })

            const $$logger = market.offer("logger").asProduct({
                factory: () => "real-logger"
            })

            const $$service = market.offer("service").asProduct({
                suppliers: [$$db, $$cache, $$logger],
                factory: ($) => ({
                    db: $($$db).unpack(),
                    cache: $($$cache).unpack(),
                    logger: $($$logger).unpack()
                })
            })

            const $initial = $$service.assemble({})

            // Only replace db, keep cache and logger
            const $$mockDb = $$db.mock({
                factory: () => "mock-db",
                suppliers: []
            })

            const $reassembled = $initial.reassemble({}, [$$mockDb])

            expect($reassembled.unpack()).toEqual({
                db: "mock-db",
                cache: "real-cache",
                logger: "real-logger"
            })
        })

        it("should handle triggering supply reassembly via overrides and hired suppliers simultaneously", () => {
            const market = createMarket()

            const $$config = market.offer("config").asResource<string>()

            const $$db = market.offer("db").asProduct({
                suppliers: [$$config],
                factory: ($) => "db-" + $($$config).unpack()
            })

            const $$cache = market.offer("cache").asProduct({
                factory: () => "cache-v1"
            })

            const $$service = market.offer("service").asProduct({
                suppliers: [$$config, $$db, $$cache],
                factory: ($) => ({
                    config: $($$config).unpack(),
                    db: $($$db).unpack(),
                    cache: $($$cache).unpack()
                })
            })

            const $initial = $$service.assemble(
                index($$config.pack("production"))
            )

            expect($initial.unpack()).toEqual({
                config: "production",
                db: "db-production",
                cache: "cache-v1"
            })

            // Mock cache and override config
            const $$mockCache = $$cache.mock({
                factory: () => "cache-v2",
                suppliers: []
            })

            const $reassembled = $initial.reassemble(
                index($$config.pack("staging")),
                [$$mockCache]
            )

            expect($reassembled.unpack()).toEqual({
                config: "staging",
                db: "db-staging", // recomputed due to config change
                cache: "cache-v2" // uses mock
            })
        })

        it("should handle reassembly with assemblers replacement", () => {
            const market = createMarket()

            const $$number = market.offer("number").asResource<number>()

            const $$squarer = market.offer("squarer").asProduct({
                suppliers: [$$number],
                factory: ($) => $($$number).unpack() ** 2
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$number],
                assemblers: [$$squarer],
                factory: ($, $$) => {
                    const squared = $$($$squarer)
                        .assemble(index($($$number)))
                        .unpack()
                    return {
                        number: $($$number).unpack(),
                        squared
                    }
                }
            })

            const $initial = $$main.assemble(index($$number.pack(5)))
            expect($initial.unpack()).toEqual({
                number: 5,
                squared: 25
            })

            // Create a mock squarer that cubes instead
            const $$mockSquarer = $$squarer.mock({
                suppliers: [$$number],
                factory: ($) => {
                    const n = $($$number).unpack()
                    return n * n * n
                }
            })

            // Reassemble with mock assembler and new number
            const $reassembled = $initial.reassemble(
                index($$number.pack(3)),
                [],
                [$$mockSquarer]
            )

            expect($reassembled.unpack()).toEqual({
                number: 3,
                squared: 27 // 3^3 using mock
            })
        })

        it("should handle reassembly with both suppliers and assemblers", () => {
            const market = createMarket()

            const $$config = market.offer("config").asResource<string>()

            const $$db = market.offer("db").asProduct({
                suppliers: [$$config],
                factory: ($) => `db-${$($$config).unpack()}`
            })

            const $$logger = market.offer("logger").asProduct({
                suppliers: [$$config],
                factory: ($) => `logger-${$($$config).unpack()}`
            })

            const $$service = market.offer("service").asProduct({
                suppliers: [$$db],
                assemblers: [$$logger],
                factory: ($, $$) => {
                    const log = $$($$logger)
                        .assemble(index($$config.pack("default")))
                        .unpack()
                    return {
                        db: $($$db).unpack(),
                        log
                    }
                }
            })

            const $initial = $$service.assemble(index($$config.pack("prod")))
            expect($initial.unpack()).toEqual({
                db: "db-prod",
                log: "logger-default"
            })

            // Create mocks
            const $$mockDb = $$db.mock({
                factory: () => "mock-db",
                suppliers: []
            })

            const $$mockLogger = $$logger.mock({
                factory: () => "mock-logger",
                suppliers: []
            })

            // Reassemble with both mocks
            const $reassembled = $initial.reassemble(
                {},
                [$$mockDb],
                [$$mockLogger]
            )

            expect($reassembled.unpack()).toEqual({
                db: "mock-db",
                log: "mock-logger"
            })
        })

        it("should handle empty hire parameters in reassembly", () => {
            const market = createMarket()

            const $$config = market.offer("config").asResource<string>()

            const $$service = market.offer("service").asProduct({
                suppliers: [$$config],
                factory: ($) => `service-${$($$config).unpack()}`
            })

            const $initial = $$service.assemble(index($$config.pack("v1")))
            expect($initial.unpack()).toBe("service-v1")

            // Reassemble with no with parameters (just overrides)
            const $reassembled = $initial.reassemble(
                index($$config.pack("v2")),
                [],
                []
            )

            expect($reassembled.unpack()).toBe("service-v2")
        })

        it("should handle nested dependency changes with reassembly and hire", () => {
            const market = createMarket()

            const $$config = market.offer("config").asResource<number>()

            const $$level1 = market.offer("level1").asProduct({
                suppliers: [$$config],
                factory: ($) => $($$config).unpack() + 1
            })

            const $$level2 = market.offer("level2").asProduct({
                suppliers: [$$level1],
                factory: ($) => $($$level1).unpack() + 10
            })

            const $$level3 = market.offer("level3").asProduct({
                suppliers: [$$level2],
                factory: ($) => $($$level2).unpack() + 100
            })

            const $initial = $$level3.assemble(index($$config.pack(1)))
            expect($initial.unpack()).toBe(112) // (1+1)+10+100

            // Mock level1 to multiply instead of add
            const $$mockLevel1 = $$level1.mock({
                suppliers: [$$config],
                factory: ($) => $($$config).unpack() * 10
            })

            // Change config and replace level1
            const $reassembled = $initial.reassemble(index($$config.pack(5)), [
                $$mockLevel1
            ])

            expect($reassembled.unpack()).toBe(160) // (5*10)+10+100
        })

        it("should handle reassembly with duplicate supplier names (last wins)", () => {
            const market = createMarket()

            const $$service = market.offer("service").asProduct({
                factory: () => "real"
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$service],
                factory: ($) => `main-${$($$service).unpack()}`
            })

            const $initial = $$main.assemble({})
            expect($initial.unpack()).toBe("main-real")

            const $$mock1 = $$service.mock({
                factory: () => "mock1",
                suppliers: []
            })

            const $$mock2 = $$service.mock({
                factory: () => "mock2",
                suppliers: []
            })

            // Both mocks target same service, last should win
            const $reassembled = $initial.reassemble({}, [$$mock1, $$mock2])

            expect($reassembled.unpack()).toBe("main-mock2")
        })
    })

    describe("Accessing $ supplies after Reassemble call with Hire parameters", () => {
        it("$ supplies of product built with reassemble with Hire parameters should contain only the hired suppliers products properly typed", () => {
            const market = createMarket()

            const $$supplier = market.offer("supplier").asProduct({
                factory: () => "supplier-value"
            })

            const $$assembler = market.offer("assembler").asProduct({
                factory: () => "assembler-value"
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$supplier],
                assemblers: [$$assembler],
                factory: ($) => {
                    const $product = $($$supplier).reassemble({}, [$$assembler])

                    const $assembler = $product.$($$assembler)
                    expectTypeOf($assembler).toExtend<Product>()
                    expect($assembler.unpack()).toBe("assembler-value")
                }
            })

            $$main.assemble({})
        })
    })
})
