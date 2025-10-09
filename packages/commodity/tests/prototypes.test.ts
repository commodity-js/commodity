import { describe, it, expect, vi, type Mock, expectTypeOf } from "vitest"
import { createMarket, index } from "#index"
import { sleep, once } from "#utils"

describe("Prototype Method", () => {
    it("should handle prototype with less suppliers", () => {
        const market = createMarket()

        const $$resource = market.offer("resource").asResource<boolean>()

        const $$base = market.offer("base").asProduct({
            suppliers: [$$resource],
            factory: ($) => ({ base: $($$resource) })
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

    it("should allow prototypes in suppliers array", () => {
        const market = createMarket()

        const $$base = market.offer("prototype").asProduct({
            factory: () => "base"
        })

        const $$prototype = $$base.prototype({
            suppliers: [],
            factory: () => "prototype"
        })

        const $$next = market.offer("next").asProduct({
            suppliers: [$$prototype],
            factory: ($) => $($$prototype)
        })

        expect($$next.assemble({}).unpack()).toEqual("prototype")
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
            factory: ($) => $($$base)()
        })

        const $$tried = $$test.with($$prototyped)

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

        const $fail = $$prototyped.assemble(
            //@ts-expect-error - missing $apiKeyResource
            index($$config.pack("test"))
        )

        const $fail2 = $$prototyped.assemble(
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
        const $$mockA = $$A.prototype({
            factory: ($) => "mockA uses " + $($$B),
            suppliers: [$$B] // This creates a potential circle
        })

        expectTypeOf($$mockA).not.toBeObject()
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
                db: $($$db),
                cache: $($$cache),
                logger: $($$logger)
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

        const $$test = $$service.with($$mockDb, $$mockCache)
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
            factory: ($) => "main-" + $($$db)
        })

        const $$unused = market.offer("unused").asProduct({
            factory: () => "base-extra"
        })

        const $$unusedProto = $$unused.prototype({
            suppliers: [],
            factory: () => "extra-service"
        })

        const $$test = $$main.with($$unusedProto)
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
        const $$test = $$main.with()
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
            factory: ($) => "main-" + $($$db)
        })

        const $$mockDb1 = $$db.prototype({
            factory: () => "mock-db-1",
            suppliers: []
        })

        const $$mockDb2 = $$db.prototype({
            factory: () => "mock-db-2",
            suppliers: []
        })

        const $$mocked = $$main.with($$mockDb1, $$mockDb2)
        const test = $$mocked.suppliers
        expect(test).toEqual([$$mockDb1, $$mockDb2])
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
                const shared = $($$shared)
                return "A-" + shared
            }
        })

        const $$B = market.offer("B").asProduct({
            suppliers: [$$shared, $$unique],
            factory: ($) => {
                const shared = $($$shared)
                const unique = $($$unique)
                return "B-" + shared + "-" + unique
            }
        })

        const $result = $$A
            .with($$B)
            .assemble(index($$shared.pack("shared-data"), $$unique.pack(123)))

        expect($result.unpack()).toEqual("A-shared-data")
        const BResult = $result.supplies($$B)
        expect(BResult).toEqual("B-shared-data-123")
    })

    it("should type check that all required resources are provided", () => {
        const market = createMarket()

        const $$db = market.offer("db").asResource<string>()
        const $$cache = market.offer("cache").asResource<string>()

        const $$user = market.offer("user").asProduct({
            suppliers: [$$db],
            factory: ($) => {
                const db = $($$db)
                return "user-" + db
            }
        })

        const $$session = market.offer("session").asProduct({
            suppliers: [$$cache],
            factory: ($) => {
                const cache = $($$cache)
                return "session-" + cache
            }
        })

        const $$combined = $$user.with($$session)

        const db = $$db.pack("postgresql://localhost:5432/db")
        const cache = $$cache.pack("redis://localhost:6379")

        // @ts-expect-error - cache is missing
        const $fail = $$combined.assemble(index(db))
        const $result = $$combined.assemble(index(db, cache))

        expect($result.unpack()).toEqual("user-postgresql://localhost:5432/db")

        const sessionResult = $result.supplies($$session)
        expect(sessionResult).toEqual("session-redis://localhost:6379")
    })

    it("should handle reassembly correctly with with() method", () => {
        const market = createMarket()

        const $$number = market.offer("number").asResource<number>()

        const $$doubler = market.offer("doubler").asProduct({
            suppliers: [$$number],
            factory: ($) => $($$number) * 2
        })

        const $$tripler = market.offer("tripler").asProduct({
            suppliers: [$$number],
            factory: ($) => $($$number) * 3
        })

        const $result = $$doubler
            .with($$tripler)
            .assemble(index($$number.pack(5)))

        expect($result.unpack()).toBe(10) // 5 * 2
        expect($result.supplies($$tripler)).toBe(15) // 5 * 3

        const $reassembled = $result.reassemble(index($$number.pack(10)))
        expect($reassembled.unpack()).toBe(20) // 10 * 2
        expect($reassembled.supplies($$tripler)).toBe(30) // 10 * 3
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

        const $result = $$working.with($$failing).assemble({})
        expect($result.unpack()).toBe("working-value")
        expect(() => {
            $result.supplies($$failing)
        }).toThrow("Supplier failed")
    })
})
