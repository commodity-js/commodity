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

    it("should not allow prototypes in suppliers array", () => {
        const market = createMarket()

        const $$prototype = market.offer("prototype").asProduct({
            factory: () => "base",
            isPrototype: true
        })

        const $$next = market.offer("next").asProduct({
            //@ts-expect-error - prototype supplier in suppliers array
            suppliers: [$$prototype],
            factory: () => "base"
        })
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

        const $$tried = $$test.try($$prototyped)

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

describe("Try Method", () => {
    it("should allow trying alternative suppliers for testing", () => {
        const market = createMarket()
        // Original suppliers
        const $$db = market.offer("db").asProduct({
            factory: () => "db"
        })

        const $$cache = market.offer("cache").asProduct({
            factory: () => "cache"
        })

        // Main product using these suppliers
        const $$main = market.offer("main").asProduct({
            suppliers: [$$db, $$cache],
            factory: ($) => "main-" + $($$db) + "-" + $($$cache)
        })

        // Mock suppliers for testing - create prototypes using prototype
        const $$mockDb = $$db.prototype({
            factory: () => "mock-db",
            suppliers: []
        })

        // Try with mock database
        const $$test = $$main.try($$mockDb)

        // Assemble both versions
        const $prod = $$main.assemble({})
        const $test = $$test.assemble({})

        expect($prod.unpack()).toBe("main-db-cache")
        expect($test.unpack()).toBe("main-mock-db-cache")
        expect($test.unpack()).toBe("main-mock-db-cache")
    })

    it("should handle multiple tried prototypes", () => {
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

        const $$test = $$service.try($$mockDb, $$mockCache)
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

        // Try with a supplier that doesn't exist in original - create new prototype
        const $$unused = market.offer("unused").asProduct({
            factory: () => "base-extra"
        })

        const $$unusedProto = $$unused.prototype({
            suppliers: [],
            factory: () => "extra-service"
        })

        const $$test = $$main.try($$unusedProto)
        const $test = $$test.assemble({})

        // The extra supplier is added to the suppliers list, but not to the result
        expect($test.unpack()).toEqual("main-db")
    })

    it("should handle empty try calls gracefully", () => {
        const market = createMarket()

        const $$main = market.offer("main").asProduct({
            factory: () => "main"
        })

        // Try with no suppliers - should work fine
        const $$test = $$main.try()
        const $test = $$test.assemble({})

        expect($test.unpack()).toBe("main")
        expect($$test._isPrototype).toBe(true)
    })

    it("should handle duplicate supplier names in try (last one wins)", () => {
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

        const $$mocked = $$main.try($$mockDb1, $$mockDb2)
        const test = $$mocked.suppliers
        expect(test).toEqual([$$mockDb1, $$mockDb2])
        const result = $$mocked.assemble({}).unpack()
        expect(result).toEqual("main-mock-db-2")
    })

    it("should stop calling try with non-prototype suppliers", () => {
        const market = createMarket()

        const $$base = market.offer("base").asProduct({
            factory: () => "base"
        })

        // Non-prototype supplier for try
        const $$nonPrototype = market.offer("non-proto").asProduct({
            factory: () => "non-prototype",
            isPrototype: false
        })

        //@ts-expect-error - non-prototype supplier in try
        const $$test = $$base.try($$nonPrototype)
    })
})
