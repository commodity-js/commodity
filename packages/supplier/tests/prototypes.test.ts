import { describe, it, expect, vi, assertType, type Mock } from "vitest"
import { createMarket, index } from "#index"
import { sleep, once } from "#utils"

describe("Prototype Method", () => {
    it("should handle prototype with less suppliers", () => {
        const market = createMarket()

        const someResourceSupplier = market
            .offer("someResource")
            .asResource<boolean>()

        const baseSupplier = market.offer("base").asProduct({
            suppliers: [someResourceSupplier],
            factory: ($) => ({ base: $(someResourceSupplier) })
        })

        const prototypedSupplier = baseSupplier.prototype({
            factory: () => ({ base: true, enhanced: true }),
            suppliers: []
        })

        const result = prototypedSupplier.assemble({})

        expect(result.unpack()).toEqual({
            base: true,
            enhanced: true
        })
    })

    //NOTE: test type to move
    it("should not allow prototypes in suppliers array", () => {
        const market = createMarket()

        const prototypeSupplier = market.offer("prototype").asProduct({
            factory: () => "base",
            isPrototype: true
        })

        const nextSupplier = market.offer("next").asProduct({
            //@ts-expect-error - prototype supplier in suppliers array
            suppliers: [prototypeSupplier],
            factory: () => "base"
        })
    })

    it("should handle init setting in prototype", async () => {
        const market = createMarket()
        const baseValueSpy = vi.fn().mockReturnValue("base")
        const initedValueSpy = vi.fn().mockReturnValue("inited")

        const baseSupplier = market.offer("base").asProduct({
            factory: () => baseValueSpy
        })

        const prototypedSupplier = baseSupplier.prototype({
            factory: () => once(initedValueSpy) as Mock<any>,
            init: (value) => value()
        })

        const testSupplier = market.offer("test").asProduct({
            suppliers: [baseSupplier],
            factory: ($) => $(baseSupplier)()
        })

        const triedSupplier = testSupplier.try(prototypedSupplier)

        triedSupplier.assemble({})
        testSupplier.assemble({})

        await sleep(10)

        expect(baseValueSpy).toHaveBeenCalledTimes(0)
        expect(initedValueSpy).toHaveBeenCalledTimes(1)
    })

    it("should compute precise TOSUPPLY types with prototype", () => {
        const market = createMarket()

        // Create resource suppliers that will need to be provided
        const configResourceSupplier = market
            .offer("config")
            .asResource<{ env: string }>()
        const apiKeyResourceSupplier = market
            .offer("apiKey")
            .asResource<string>()

        // Create a product supplier that will be self-contained
        const loggerProductSupplier = market.offer("logger").asProduct({
            factory: () => ({ log: (msg: string) => msg })
        })

        // Base service - return compatible type that can be extended
        const baseProductSupplier = market.offer("base").asProduct({
            factory: () => ({ proto: false })
        })

        // prototype with mixed resource and product suppliers
        const prototypedService = baseProductSupplier.prototype({
            suppliers: [
                configResourceSupplier,
                apiKeyResourceSupplier,
                loggerProductSupplier
            ],
            factory: ($) => ({
                proto: true // preserve base property
            })
        })

        const fail = prototypedService.assemble(
            //@ts-expect-error - missing apiKeyResourceSupplier
            index(configResourceSupplier.pack({ env: "test" }))
        )

        const fail2 = prototypedService.assemble(
            //@ts-expect-error - missing configResourceSupplier
            index(apiKeyResourceSupplier.pack("secret-key"))
        )

        // The type system should now know exactly what needs to be supplied:
        // - config and apiKey (resources must be provided)
        // - logger should NOT need to be provided (it's a product supplier)
        const result = prototypedService.assemble(
            index(
                configResourceSupplier.pack({ env: "test" }),
                apiKeyResourceSupplier.pack("secret-key")
            )
        )

        const output = result.unpack()
        expect(output.proto).toBe(true)
    })

    it("should detect circular dependencies in prototypes", () => {
        const market = createMarket()

        const serviceASupplier = market.offer("serviceA").asProduct({
            factory: () => "serviceA"
        })

        const serviceBSupplier = market.offer("serviceB").asProduct({
            suppliers: [serviceASupplier],
            factory: ($) => "serviceB uses " + $(serviceASupplier)
        })

        // Try to create circular dependency through try using prototype
        // This should be caught by the circular dependency detection
        const mockASupplier = serviceASupplier.prototype({
            factory: ($) => "mockA uses " + $(serviceBSupplier),
            suppliers: [serviceBSupplier] // This creates a potential circle
        })

        assertType<unknown>(mockASupplier)
    })
})

describe("Try Method", () => {
    it("should allow trying alternative suppliers for testing", () => {
        const market = createMarket()
        // Original suppliers
        const dbSupplier = market.offer("db").asProduct({
            factory: () => ({ type: "postgres", data: ["real", "data"] })
        })

        const cacheSupplier = market.offer("cache").asProduct({
            factory: () => ({ type: "redis", cached: true })
        })

        // Main service using these suppliers
        const serviceSupplier = market.offer("service").asProduct({
            suppliers: [dbSupplier, cacheSupplier],
            factory: ($) => ({
                db: $(dbSupplier),
                cache: $(cacheSupplier),
                result: "production"
            })
        })

        // Mock suppliers for testing - create prototypes using prototype
        const mockDbSupplier = dbSupplier.prototype({
            factory: () => ({ type: "mock", data: ["mock", "data"] }),
            suppliers: []
        })

        // Try with mock database
        const testServiceSupplier = serviceSupplier.try(mockDbSupplier)

        // Assemble both versions
        const prodService = serviceSupplier.assemble({})
        const testService = testServiceSupplier.assemble({})

        expect(prodService.unpack().db.type).toBe("postgres")
        expect(testService.unpack().db.type).toBe("mock")
        expect(testService.unpack().cache.type).toBe("redis") // unchanged
    })

    it("should handle multiple tried prototypes", () => {
        const market = createMarket()

        const dbSupplier = market.offer("db").asProduct({
            factory: () => "real-db"
        })

        const cacheSupplier = market.offer("cache").asProduct({
            factory: () => "real-cache"
        })

        const loggerSupplier = market.offer("logger").asProduct({
            factory: () => "real-logger"
        })

        const serviceSupplier = market.offer("service").asProduct({
            suppliers: [dbSupplier, cacheSupplier, loggerSupplier],
            factory: ($) => ({
                db: $(dbSupplier),
                cache: $(cacheSupplier),
                logger: $(loggerSupplier)
            })
        })

        // Multiple mock suppliers using prototype
        const mockDbSupplier = dbSupplier.prototype({
            factory: () => "mock-db",
            suppliers: []
        })

        const mockCacheSupplier = cacheSupplier.prototype({
            factory: () => "mock-cache",
            suppliers: []
        })

        const testServiceSupplier = serviceSupplier.try(
            mockDbSupplier,
            mockCacheSupplier
        )
        const testService = testServiceSupplier.assemble({})

        expect(testService.unpack()).toEqual({
            db: "mock-db",
            cache: "mock-cache",
            logger: "real-logger" // unchanged
        })
    })

    it("should handle trying suppliers that don't exist in original suppliers", () => {
        const market = createMarket()

        const dbSupplier = market.offer("db").asProduct({
            factory: () => "real-db"
        })

        const serviceSupplier = market.offer("service").asProduct({
            suppliers: [dbSupplier],
            factory: ($) => ({
                db: $(dbSupplier)
            })
        })

        // Try with a supplier that doesn't exist in original - create new prototype
        const baseExtraSupplier = market.offer("extra").asProduct({
            factory: () => "base-extra"
        })

        const extraSupplier = baseExtraSupplier.prototype({
            factory: () => "extra-service",
            suppliers: []
        })

        const testServiceSupplier = serviceSupplier.try(extraSupplier)
        const testService = testServiceSupplier.assemble({})

        // The extra supplier is added to the suppliers list, but not to the result
        expect(testService.unpack()).toEqual({
            db: "real-db"
        })
    })

    it("should handle empty try calls gracefully", () => {
        const market = createMarket()

        const serviceSupplier = market.offer("service").asProduct({
            factory: () => "service"
        })

        // Try with no suppliers - should work fine
        const testServiceSupplier = serviceSupplier.try()
        const testService = testServiceSupplier.assemble({})

        expect(testService.unpack()).toBe("service")
        expect(testServiceSupplier._isPrototype).toBe(true)
    })

    it("should handle duplicate supplier names in try (last one wins)", () => {
        const market = createMarket()

        const dbSupplier = market.offer("db").asProduct({
            factory: () => "real-db"
        })

        const serviceSupplier = market.offer("service").asProduct({
            suppliers: [dbSupplier],
            factory: ($) => ({ db: $(dbSupplier) })
        })

        const mockDb1 = dbSupplier.prototype({
            factory: () => "mock-db-1",
            suppliers: []
        })

        const mockDb2 = dbSupplier.prototype({
            factory: () => "mock-db-2",
            suppliers: []
        })

        const mockedSupplier = serviceSupplier.try(mockDb1, mockDb2)
        const test = mockedSupplier.suppliers
        expect(test).toEqual([mockDb1, mockDb2])
        const result = mockedSupplier.assemble({}).unpack()
        expect(result).toEqual({
            db: "mock-db-2"
        })
    })

    it("should stop calling try with non-prototype suppliers", () => {
        const market = createMarket()

        const baseSupplier = market.offer("base").asProduct({
            factory: () => "base"
        })

        // Non-prototype supplier for try
        const nonPrototypeSupplier = market.offer("non-proto").asProduct({
            factory: () => "non-prototype",
            isPrototype: false
        })

        //@ts-expect-error - non-prototype supplier in try
        const testSupplier = baseSupplier.try(nonPrototypeSupplier)
    })
})
