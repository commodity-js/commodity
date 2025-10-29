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

    describe("asProduct()", () => {
        it("should throw TypeError when config is not an object", () => {
            const market = createMarket()
            expect(() => market.offer("A").asProduct(null as any)).toThrow(
                TypeError
            )
            expect(() => market.offer("B").asProduct(null as any)).toThrow(
                "B must be an object, got null"
            )
        })

        it("should throw TypeError when config is an array", () => {
            const market = createMarket()
            expect(() => market.offer("A").asProduct([] as any)).toThrow(
                TypeError
            )
            expect(() => market.offer("B").asProduct([] as any)).toThrow(
                "B must be an object, not an array"
            )
        })

        it("should throw TypeError when factory is missing", () => {
            const market = createMarket()
            expect(() => market.offer("A").asProduct({} as any)).toThrow(
                TypeError
            )
            expect(() => market.offer("B").asProduct({} as any)).toThrow(
                "B must have a 'factory' property"
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
            ).toThrow("B must be a function, got string")
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
            ).toThrow("B must be an array")
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
            ).toThrow("B.lazy must be a boolean, got string")
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
                "supplied must be an object, got null"
            )
        })

        it("should throw TypeError when toSupply is an array", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.assemble([] as any)).toThrow(TypeError)
            expect(() => $$product.assemble([] as any)).toThrow(
                "supplied must be an object, not an array"
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

    describe("productSupplier.hire()", () => {
        it("should throw TypeError when suppliers contain invalid items", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.hire(null as any)).toThrow(TypeError)
            expect(() => $$product.hire(null as any)).toThrow(TypeError)
        })

        it("should throw TypeError when supplier is missing name property", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.hire({} as any)).toThrow(TypeError)
            expect(() => $$product.hire({} as any)).toThrow(TypeError)
        })
    })

    describe("productSupplier.mock()", () => {
        it("should throw TypeError when config is not an object", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.mock(null as any)).toThrow(TypeError)
            expect(() => $$product.mock(null as any)).toThrow(
                "A must be an object, got null"
            )
        })

        it("should throw TypeError when factory is missing", () => {
            const market = createMarket()
            const $$product = market.offer("A").asProduct({
                factory: () => ({})
            })
            expect(() => $$product.mock({} as any)).toThrow(TypeError)
            expect(() => $$product.mock({} as any)).toThrow(
                "A must have a 'factory' property"
            )
        })
    })
})
