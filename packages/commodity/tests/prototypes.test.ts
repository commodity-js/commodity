import { describe, it, expect, vi, type Mock, expectTypeOf } from "vitest"
import { CircularDependencyError, createMarket, index } from "#index"
import { sleep, once } from "#utils"

describe("Prototype Method", () => {
    it("should handle prototype with less suppliers", () => {
        const market = createMarket()

        const $$resource = market.offer("resource").asResource<boolean>()

        const $$base = market.offer("base").asProduct({
            suppliers: [$$resource],
            factory: ($) => ({ base: $($$resource).unpack() })
        })

        const $$prototyped = $$base.prototype({
            factory: () => ({ base: true, enhanced: true }),
            suppliers: []
        })

        const $result = $$prototyped.assemble({})

        expect($result.unpack()).toEqual({
            base: true,
            enhanced: true
        })
    })

    it("should not allow prototypes in suppliers array", () => {
        const market = createMarket()

        const $$base = market.offer("prototype").asProduct({
            factory: () => "base"
        })

        const $$prototype = $$base.prototype({
            suppliers: [],
            factory: () => "prototype"
        })

        expect(() => {
            const $$next = market.offer("next").asProduct({
                factory: () => "next",
                //@ts-expect-error - prototype in suppliers array
                suppliers: [$$prototype]
            })
        }).toThrow()
    })

    it("should handle init setting in prototype", async () => {
        const market = createMarket()
        const baseSpy = vi.fn().mockReturnValue("base")
        const initedSpy = vi.fn().mockReturnValue("inited")

        const $$base = market.offer("base").asProduct({
            factory: () => baseSpy
        })

        const $$prototyped = $$base.prototype({
            factory: () => once(initedSpy) as Mock<any>,
            init: (value) => value()
        })

        const $$test = market.offer("test").asProduct({
            suppliers: [$$base],
            factory: ($) => $($$base).unpack()
        })

        const $$tried = $$test.with([$$prototyped])

        $$tried.assemble({})
        $$test.assemble({})

        await sleep(10)

        expect(baseSpy).toHaveBeenCalledTimes(0)
        expect(initedSpy).toHaveBeenCalledTimes(1)
    })

    it("should compute precise TOSUPPLY types with prototype", () => {
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

        // prototype with mixed resource and product suppliers
        const $$prototyped = $$base.prototype({
            suppliers: [$$config, $$apiKey, $$logger],
            factory: ($) => "proto"
        })

        $$prototyped.assemble(
            //@ts-expect-error - missing $apiKeyResource
            index($$config.pack("test"))
        )

        $$prototyped.assemble(
            //@ts-expect-error - missing $configResource
            index($$apiKey.pack("secret-key"))
        )

        // The type system should now know exactly what needs to be supplied:
        // - config and apiKey (resources must be provided)
        // - logger should NOT need to be provided (it's a product supplier)
        const $result = $$prototyped.assemble(
            index($$config.pack("test"), $$apiKey.pack("secret-key"))
        )

        const output = $result.unpack()
        expect(output).toBe("proto")
    })

    it("should detect circular dependencies in prototypes", () => {
        const market = createMarket()

        const $$A = market.offer("A").asProduct({
            factory: () => "serviceA"
        })

        const $$B = market.offer("B").asProduct({
            suppliers: [$$A],
            factory: ($) => "serviceB uses " + $($$A)
        })

        // Try to create circular dependency using prototype
        // This should be caught by the circular dependency detection
        expect(() => {
            const $$mockA = $$A.prototype({
                factory: ($) => "mockA uses " + $($$B),
                suppliers: [$$B] // This creates a potential circle
            })

            expectTypeOf($$mockA).toEqualTypeOf<CircularDependencyError>()
        }).toThrow("Circular dependency detected")

        expect(() => {
            const $$mockA = $$A.prototype({
                factory: () => "mockA",
                assemblers: [$$B] // This creates a potential circle
            })

            expectTypeOf($$mockA).toEqualTypeOf<CircularDependencyError>()
        }).toThrow("Circular dependency detected")

        expect(() => {
            const $$mockA = $$A.prototype({
                factory: () => "mockA",
                withSuppliers: [$$B] // This creates a potential circle
            })
            expectTypeOf($$mockA).toEqualTypeOf<CircularDependencyError>()
        }).toThrow("Circular dependency detected")

        expect(() => {
            const $$mockA = $$A.prototype({
                factory: () => "mockA",
                withAssemblers: [$$B] // This creates a potential circle
            })
            expectTypeOf($$mockA).toEqualTypeOf<CircularDependencyError>()
        }).toThrow("Circular dependency detected")
    })
})

describe("With Method", () => {
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

        // Multiple mock suppliers using prototype
        const $$mockDb = $$db.prototype({
            factory: () => "mock-db",
            suppliers: []
        })

        const $$mockCache = $$cache.prototype({
            factory: () => "mock-cache",
            suppliers: []
        })

        const $$test = $$service.with([$$mockDb, $$mockCache])
        const $test = $$test.assemble({})

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

        const $$unusedProto = $$unused.prototype({
            suppliers: [],
            factory: () => "extra-service"
        })

        const $$test = $$main.with([$$unusedProto])
        const $test = $$test.assemble({})

        // The extra supplier is added to the suppliers list, but not to the result
        expect($test.unpack()).toEqual("main-db")
    })

    it("should handle empty with calls gracefully", () => {
        const market = createMarket()

        const $$main = market.offer("main").asProduct({
            factory: () => "main"
        })

        // With with no suppliers - should work fine
        const $$test = $$main.with([])
        const $test = $$test.assemble({})

        expect($test.unpack()).toBe("main")
    })

    it("should handle duplicate supplier names in with (last one wins)", () => {
        const market = createMarket()

        const $$db = market.offer("db").asProduct({
            factory: () => "db"
        })

        const $$main = market.offer("main").asProduct({
            suppliers: [$$db],
            factory: ($) => "main-" + $($$db).unpack()
        })

        const $$mockDb1 = $$db.prototype({
            factory: () => "mock-db-1",
            suppliers: []
        })

        const $$mockDb2 = $$db.prototype({
            factory: () => "mock-db-2",
            suppliers: []
        })

        const $$mocked = $$main.with([$$mockDb1, $$mockDb2])
        expect($$mocked.withSuppliers.map((s) => s.name)).toEqual([
            $$mockDb1.name,
            $$mockDb2.name
        ])
        const result = $$mocked.assemble({}).unpack()
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
            .with([$$B])
            .assemble(index($$shared.pack("shared-data"), $$unique.pack(123)))

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

        const $$combined = $$user.with([$$session])

        const db = $$db.pack("postgresql://localhost:5432/db")
        const cache = $$cache.pack("redis://localhost:6379")

        expect(() => {
            // @ts-expect-error - cache is missing
            const $combined = $$combined.assemble(index(db))
            $combined.$($$session).unpack()
        }).toThrow()

        const $result = $$combined.assemble(index(db, cache))

        expect($result.unpack()).toEqual("user-postgresql://localhost:5432/db")

        const sessionResult = $result.$($$session).unpack()
        expect(sessionResult).toEqual("session-redis://localhost:6379")
    })

    it("should handle reassembly correctly with with() method", () => {
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
            .with([$$tripler])
            .assemble(index($$number.pack(5)))

        expect($result.unpack()).toBe(10) // 5 * 2
        expect($result.$($$tripler).unpack()).toBe(15) // 5 * 3

        const $reassembled = $result.reassemble(index($$number.pack(10)))
        expect($reassembled.unpack()).toBe(20) // 10 * 2
        expect($reassembled.$($$tripler).unpack()).toBe(30) // 10 * 3
    })

    it("should handle errors in with() method gracefully", () => {
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

        const $result = $$working.with([$$failing]).assemble({})
        expect($result.unpack()).toBe("working-value")
        expect(() => {
            $result.$($$failing).unpack()
        }).toThrow("Supplier failed")
    })
})

describe("Reassemble Method with With Parameters", () => {
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
        const $$mockDb = $$db.prototype({
            factory: () => "mock-db",
            suppliers: []
        })

        const $$mockCache = $$cache.prototype({
            factory: () => "mock-cache",
            suppliers: []
        })

        // Reassemble with mocks
        const $reassembled = $initial.reassemble({}, [$$mockDb, $$mockCache])

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
                db: $($$db),
                cache: $($$cache),
                logger: $($$logger)
            })
        })

        const $initial = $$service.assemble({})

        // Only replace db, keep cache and logger
        const $$mockDb = $$db.prototype({
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

    it("should combine overrides and with suppliers during reassembly", () => {
        const market = createMarket()

        const $$config = market.offer("config").asResource<string>()

        const $$db = market.offer("db").asProduct({
            suppliers: [$$config],
            factory: ($) => `db-${$($$config)}`
        })

        const $$cache = market.offer("cache").asProduct({
            factory: () => "cache-v1"
        })

        const $$service = market.offer("service").asProduct({
            suppliers: [$$config, $$db, $$cache],
            factory: ($) => ({
                config: $($$config),
                db: $($$db),
                cache: $($$cache)
            })
        })

        const $initial = $$service.assemble(index($$config.pack("production")))

        expect($initial.unpack()).toEqual({
            config: "production",
            db: "db-production",
            cache: "cache-v1"
        })

        // Mock cache and override config
        const $$mockCache = $$cache.prototype({
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
            factory: ($) => $($$number) * $($$number)
        })

        const $$main = market.offer("main").asProduct({
            suppliers: [$$number],
            assemblers: [$$squarer],
            factory: ($, $$) => {
                const squared = $$[$$squarer.name].assemble($).unpack()
                return {
                    number: $($$number),
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
        const $$mockSquarer = $$squarer.prototype({
            suppliers: [$$number],
            factory: ($) => {
                const n = $($$number)
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
            factory: ($) => `db-${$($$config)}`
        })

        const $$logger = market.offer("logger").asProduct({
            suppliers: [$$config],
            factory: ($) => `logger-${$($$config)}`
        })

        const $$service = market.offer("service").asProduct({
            suppliers: [$$db],
            assemblers: [$$logger],
            factory: ($, $$) => {
                const log = $$[$$logger.name]
                    .assemble(index($$config.pack("default")))
                    .unpack()
                return {
                    db: $($$db),
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
        const $$mockDb = $$db.prototype({
            factory: () => "mock-db",
            suppliers: []
        })

        const $$mockLogger = $$logger.prototype({
            factory: () => "mock-logger",
            suppliers: []
        })

        // Reassemble with both mocks
        const $reassembled = $initial.reassemble({}, [$$mockDb], [$$mockLogger])

        expect($reassembled.unpack()).toEqual({
            db: "mock-db",
            log: "mock-logger"
        })
    })

    it("should preserve supplies that don't depend on overrides during reassembly with with", () => {
        const market = createMarket()

        const $$configA = market.offer("configA").asResource<string>()
        const $$configB = market.offer("configB").asResource<string>()

        const $$serviceA = market.offer("serviceA").asProduct({
            suppliers: [$$configA],
            factory: ($) => `A-${$($$configA)}`
        })

        const $$serviceB = market.offer("serviceB").asProduct({
            suppliers: [$$configB],
            factory: ($) => `B-${$($$configB)}`
        })

        const $$main = market.offer("main").asProduct({
            suppliers: [$$serviceA, $$serviceB],
            factory: ($) => ({
                a: $($$serviceA),
                b: $($$serviceB)
            })
        })

        const $initial = $$main.assemble(
            index($$configA.pack("A1"), $$configB.pack("B1"))
        )

        expect($initial.unpack()).toEqual({
            a: "A-A1",
            b: "B-B1"
        })

        // Mock serviceB and only override configA
        const $$mockServiceB = $$serviceB.prototype({
            suppliers: [$$configB],
            factory: ($) => `MockB-${$($$configB)}`
        })

        // Only change configA, serviceB should be recomputed with mock
        const $reassembled = $initial.reassemble(index($$configA.pack("A2")), [
            $$mockServiceB
        ])

        expect($reassembled.unpack()).toEqual({
            a: "A-A2", // recomputed due to configA change
            b: "MockB-B1" // recomputed with mock but B1 preserved
        })
    })

    it("should allow adding new suppliers during reassembly", () => {
        const market = createMarket()

        const $$base = market.offer("base").asProduct({
            factory: () => "base"
        })

        const $$main = market.offer("main").asProduct({
            suppliers: [$$base],
            factory: ($) => `main-${$($$base)}`
        })

        const $initial = $$main.assemble({})
        expect($initial.unpack()).toBe("main-base")

        // Add a new supplier during reassembly
        const $$extra = market.offer("extra").asProduct({
            factory: () => "extra"
        })

        const $reassembled = $initial.reassemble({}, [$$extra])

        // Main still works the same, but extra is available
        expect($reassembled.unpack()).toBe("main-base")
        expect($reassembled.supplies($$extra)).toBe("extra")
    })

    it("should handle empty with parameters in reassembly", () => {
        const market = createMarket()

        const $$config = market.offer("config").asResource<string>()

        const $$service = market.offer("service").asProduct({
            suppliers: [$$config],
            factory: ($) => `service-${$($$config)}`
        })

        const $initial = $$service.assemble(index($$config.pack("v1")))
        expect($initial.unpack()).toBe("service-v1")

        // Reassemble with no with parameters (just overrides)
        const $reassembled = $initial.reassemble(index($$config.pack("v2")), [])

        expect($reassembled.unpack()).toBe("service-v2")
    })

    it("should handle nested dependency changes with reassembly and with", () => {
        const market = createMarket()

        const $$config = market.offer("config").asResource<number>()

        const $$level1 = market.offer("level1").asProduct({
            suppliers: [$$config],
            factory: ($) => $($$config) + 1
        })

        const $$level2 = market.offer("level2").asProduct({
            suppliers: [$$level1],
            factory: ($) => $($$level1) + 10
        })

        const $$level3 = market.offer("level3").asProduct({
            suppliers: [$$level2],
            factory: ($) => $($$level2) + 100
        })

        const $initial = $$level3.assemble(index($$config.pack(1)))
        expect($initial.unpack()).toBe(112) // (1+1)+10+100

        // Mock level1 to multiply instead of add
        const $$mockLevel1 = $$level1.prototype({
            suppliers: [$$config],
            factory: ($) => $($$config) * 10
        })

        // Change config and replace level1
        const $reassembled = $initial.reassemble(index($$config.pack(5)), [
            $$mockLevel1
        ])

        expect($reassembled.unpack()).toBe(160) // (5*10)+10+100
    })

    it("should validate assembler compatibility during reassembly with with", () => {
        const market = createMarket()

        const $$resource1 = market.offer("resource1").asResource<number>()
        const $$resource2 = market.offer("resource2").asResource<number>()

        const $$assembler = market.offer("assembler").asProduct({
            suppliers: [$$resource1],
            factory: ($) => $($$resource1) * 2
        })

        const $$main = market.offer("main").asProduct({
            assemblers: [$$assembler],
            factory: ($, $$) => {
                return $$[$$assembler.name]
                    .assemble(index($$resource1.pack(10)))
                    .unpack()
            }
        })

        const $initial = $$main.assemble({})
        expect($initial.unpack()).toBe(20)

        // Try to replace with incompatible assembler (more dependencies)
        const $$incompatibleAssembler = $$assembler.prototype({
            suppliers: [$$resource1, $$resource2],
            factory: ($) => $($$resource1) + $($$resource2)
        })

        // Should throw due to incompatibility
        expect(() => {
            $initial.reassemble({}, [], [$$incompatibleAssembler])
        }).toThrow(/incompatible/)
    })

    it("should support reassembly with resource and product suppliers mixed in with", () => {
        const market = createMarket()

        const $$resource = market.offer("resource").asResource<string>()

        const $$productA = market.offer("productA").asProduct({
            suppliers: [$$resource],
            factory: ($) => `A-${$($$resource)}`
        })

        const $$productB = market.offer("productB").asProduct({
            factory: () => "B"
        })

        const $$main = market.offer("main").asProduct({
            suppliers: [$$productA, $$productB],
            factory: ($) => ({
                a: $($$productA),
                b: $($$productB)
            })
        })

        const $initial = $$main.assemble(index($$resource.pack("res1")))
        expect($initial.unpack()).toEqual({
            a: "A-res1",
            b: "B"
        })

        // Replace both in reassembly
        const $$mockA = $$productA.prototype({
            factory: () => "MockA",
            suppliers: []
        })

        const $$mockB = $$productB.prototype({
            factory: () => "MockB",
            suppliers: []
        })

        const $reassembled = $initial.reassemble({}, [$$mockA, $$mockB])

        expect($reassembled.unpack()).toEqual({
            a: "MockA",
            b: "MockB"
        })
    })

    it("should handle reassembly with duplicate supplier names (last wins)", () => {
        const market = createMarket()

        const $$service = market.offer("service").asProduct({
            factory: () => "real"
        })

        const $$main = market.offer("main").asProduct({
            suppliers: [$$service],
            factory: ($) => `main-${$($$service)}`
        })

        const $initial = $$main.assemble({})
        expect($initial.unpack()).toBe("main-real")

        const $$mock1 = $$service.prototype({
            factory: () => "mock1",
            suppliers: []
        })

        const $$mock2 = $$service.prototype({
            factory: () => "mock2",
            suppliers: []
        })

        // Both mocks target same service, last should win
        const $reassembled = $initial.reassemble({}, [$$mock1, $$mock2])

        expect($reassembled.unpack()).toBe("main-mock2")
    })
})
