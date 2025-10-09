import { describe, it, expect } from "vitest"
import { createMarket } from "../src/index"

describe("Runtime Validation", () => {
    describe("market.offer()", () => {
        it("should throw TypeError when name is not a string", () => {
            const market = createMarket()
            // @ts-expect-error - Testing runtime validation
            expect(() => market.offer(123)).toThrow(TypeError)
            expect(() => market.offer(123 as any)).toThrow(
                "name must be a string, got number"
            )
        })

        it("should throw Error when name already exists", () => {
            const market = createMarket()
            market.offer("test").asResource<string>()
            expect(() => market.offer("test")).toThrow(
                "Name test already exists"
            )
        })
    })

    describe("asResource().pack()", () => {
        it("should throw TypeError when value is null", () => {
            const market = createMarket()
            const $$resource = market.offer("config").asResource<any>()
            expect(() => $$resource.pack(null as any)).toThrow(TypeError)
            expect(() => $$resource.pack(null as any)).toThrow(
                "value is required, got null"
            )
        })

        it("should throw TypeError when value is undefined", () => {
            const market = createMarket()
            const $$resource = market.offer("config2").asResource<any>()
            expect(() => $$resource.pack(undefined as any)).toThrow(TypeError)
            expect(() => $$resource.pack(undefined as any)).toThrow(
                "value is required, got undefined"
            )
        })
    })

    describe("asProduct()", () => {
        it("should throw TypeError when config is not an object", () => {
            const market = createMarket()
            expect(() => market.offer("A").asProduct(null as any)).toThrow(
                TypeError
            )
            expect(() => market.offer("B").asProduct(null as any)).toThrow(
                "config must be an object, got null"
            )
        })

        it("should throw TypeError when config is an array", () => {
            const market = createMarket()
            expect(() => market.offer("A").asProduct([] as any)).toThrow(
                TypeError
            )
            expect(() => market.offer("B").asProduct([] as any)).toThrow(
                "config must be an object, not an array"
            )
        })

        it("should throw TypeError when factory is missing", () => {
            const market = createMarket()
            expect(() => market.offer("A").asProduct({} as any)).toThrow(
                TypeError
            )
            expect(() => market.offer("B").asProduct({} as any)).toThrow(
                "config.factory is required"
            )
        })

        it("should throw TypeError when factory is not a function", () => {
            const market = createMarket()
            expect(() =>
                market
                    .offer("A")
                    .asProduct({ factory: "not a function" } as any)
            ).toThrow(TypeError)
            expect(() =>
                market
                    .offer("B")
                    .asProduct({ factory: "not a function" } as any)
            ).toThrow("config.factory must be a function, got string")
        })

        it("should throw TypeError when suppliers is not an array", () => {
            const market = createMarket()
            expect(() =>
                market.offer("A").asProduct({
                    factory: () => ({}),
                    suppliers: "not an array"
                } as any)
            ).toThrow(TypeError)
            expect(() =>
                market.offer("B").asProduct({
                    factory: () => ({}),
                    suppliers: "not an array"
                } as any)
            ).toThrow("config.suppliers must be an array, got string")
        })

        it("should throw TypeError when lazy is not a boolean", () => {
            const market = createMarket()
            expect(() =>
                market.offer("A").asProduct({
                    factory: () => ({}),
                    lazy: "yes"
                } as any)
            ).toThrow(TypeError)
            expect(() =>
                market.offer("B").asProduct({
                    factory: () => ({}),
                    lazy: "yes"
                } as any)
            ).toThrow("config.lazy must be a boolean, got string")
        })
    })

    describe("productSupplier.assemble()", () => {
        it("should throw TypeError when toSupply is not an object", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.assemble(null as any)).toThrow(TypeError)
            expect(() => $$product.assemble(null as any)).toThrow(
                "toSupply must be an object, got null"
            )
        })

        it("should throw TypeError when toSupply is an array", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.assemble([] as any)).toThrow(TypeError)
            expect(() => $$product.assemble([] as any)).toThrow(
                "toSupply must be an object, not an array"
            )
        })
    })

    describe("productSupplier.pack()", () => {
        it("should throw TypeError when value is null", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.pack(null as any)).toThrow(TypeError)
            expect(() => $$product.pack(null as any)).toThrow(
                "value is required, got null"
            )
        })
    })

    describe("product.reassemble()", () => {
        it("should throw TypeError when overrides is not an object", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            const assembled = $$product.assemble({})
            expect(() => assembled.reassemble(null as any)).toThrow(TypeError)
            expect(() => assembled.reassemble(null as any)).toThrow(
                "overrides must be an object, got null"
            )
        })
    })

    describe("productSupplier.with()", () => {
        it("should throw TypeError when suppliers contain invalid items", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.with(null as any)).toThrow(TypeError)
            expect(() => $$product.with(null as any)).toThrow(
                "suppliers[0] must be a supplier object, got null"
            )
        })

        it("should throw TypeError when supplier is missing name property", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.with({} as any)).toThrow(TypeError)
            expect(() => $$product.with({} as any)).toThrow(
                "suppliers[0] must have a 'name' property of type string"
            )
        })
    })

    describe("productSupplier.prototype()", () => {
        it("should throw TypeError when config is not an object", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.prototype(null as any)).toThrow(TypeError)
            expect(() => $$product.prototype(null as any)).toThrow(
                "config must be an object, got null"
            )
        })

        it("should throw TypeError when factory is missing", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.prototype({} as any)).toThrow(TypeError)
            expect(() => $$product.prototype({} as any)).toThrow(
                "config.factory is required"
            )
        })
    })
})
