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

        it("should throw TypeError when name is an empty string", () => {
            const market = createMarket()
            expect(() => market.offer("")).toThrow(TypeError)
            expect(() => market.offer("")).toThrow(
                "name cannot be an empty string"
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
            const resource = market.offer("config").asResource<any>()
            expect(() => resource.pack(null as any)).toThrow(TypeError)
            expect(() => resource.pack(null as any)).toThrow(
                "value is required, got null"
            )
        })

        it("should throw TypeError when value is undefined", () => {
            const market = createMarket()
            const resource = market.offer("config2").asResource<any>()
            expect(() => resource.pack(undefined as any)).toThrow(TypeError)
            expect(() => resource.pack(undefined as any)).toThrow(
                "value is required, got undefined"
            )
        })
    })

    describe("asProduct()", () => {
        it("should throw TypeError when config is not an object", () => {
            const market = createMarket()
            expect(() =>
                market.offer("service1").asProduct(null as any)
            ).toThrow(TypeError)
            expect(() =>
                market.offer("service2").asProduct(null as any)
            ).toThrow("config must be an object, got null")
        })

        it("should throw TypeError when config is an array", () => {
            const market = createMarket()
            expect(() => market.offer("service3").asProduct([] as any)).toThrow(
                TypeError
            )
            expect(() => market.offer("service4").asProduct([] as any)).toThrow(
                "config must be an object, not an array"
            )
        })

        it("should throw TypeError when factory is missing", () => {
            const market = createMarket()
            expect(() => market.offer("service5").asProduct({} as any)).toThrow(
                TypeError
            )
            expect(() => market.offer("service6").asProduct({} as any)).toThrow(
                "config.factory is required"
            )
        })

        it("should throw TypeError when factory is not a function", () => {
            const market = createMarket()
            expect(() =>
                market
                    .offer("service7")
                    .asProduct({ factory: "not a function" } as any)
            ).toThrow(TypeError)
            expect(() =>
                market
                    .offer("service8")
                    .asProduct({ factory: "not a function" } as any)
            ).toThrow("config.factory must be a function, got string")
        })

        it("should throw TypeError when suppliers is not an array", () => {
            const market = createMarket()
            expect(() =>
                market.offer("service9").asProduct({
                    factory: () => ({}),
                    suppliers: "not an array"
                } as any)
            ).toThrow(TypeError)
            expect(() =>
                market.offer("service10").asProduct({
                    factory: () => ({}),
                    suppliers: "not an array"
                } as any)
            ).toThrow("config.suppliers must be an array, got string")
        })

        it("should throw TypeError when lazy is not a boolean", () => {
            const market = createMarket()
            expect(() =>
                market.offer("service11").asProduct({
                    factory: () => ({}),
                    lazy: "yes"
                } as any)
            ).toThrow(TypeError)
            expect(() =>
                market.offer("service12").asProduct({
                    factory: () => ({}),
                    lazy: "yes"
                } as any)
            ).toThrow("config.lazy must be a boolean, got string")
        })
    })

    describe("productSupplier.assemble()", () => {
        it("should throw TypeError when toSupply is not an object", () => {
            const market = createMarket()
            const product = market.offer("service13").asProduct({
                factory: () => ({})
            })
            expect(() => product.assemble(null as any)).toThrow(TypeError)
            expect(() => product.assemble(null as any)).toThrow(
                "toSupply must be an object, got null"
            )
        })

        it("should throw TypeError when toSupply is an array", () => {
            const market = createMarket()
            const product = market.offer("service14").asProduct({
                factory: () => ({})
            })
            expect(() => product.assemble([] as any)).toThrow(TypeError)
            expect(() => product.assemble([] as any)).toThrow(
                "toSupply must be an object, not an array"
            )
        })
    })

    describe("productSupplier.pack()", () => {
        it("should throw TypeError when value is null", () => {
            const market = createMarket()
            const product = market.offer("service15").asProduct({
                factory: () => ({})
            })
            expect(() => product.pack(null as any)).toThrow(TypeError)
            expect(() => product.pack(null as any)).toThrow(
                "value is required, got null"
            )
        })
    })

    describe("product.reassemble()", () => {
        it("should throw TypeError when overrides is not an object", () => {
            const market = createMarket()
            const product = market.offer("service16").asProduct({
                factory: () => ({})
            })
            const assembled = product.assemble({})
            expect(() => assembled.reassemble(null as any)).toThrow(TypeError)
            expect(() => assembled.reassemble(null as any)).toThrow(
                "overrides must be an object, got null"
            )
        })
    })

    describe("productSupplier.try()", () => {
        it("should throw TypeError when suppliers contain invalid items", () => {
            const market = createMarket()
            const product = market.offer("service17").asProduct({
                factory: () => ({})
            })
            expect(() => product.try(null as any)).toThrow(TypeError)
            expect(() => product.try(null as any)).toThrow(
                "suppliers[0] must be a supplier object, got null"
            )
        })

        it("should throw TypeError when supplier is missing name property", () => {
            const market = createMarket()
            const product = market.offer("service18").asProduct({
                factory: () => ({})
            })
            expect(() => product.try({} as any)).toThrow(TypeError)
            expect(() => product.try({} as any)).toThrow(
                "suppliers[0] must have a 'name' property of type string"
            )
        })
    })

    describe("productSupplier.prototype()", () => {
        it("should throw TypeError when config is not an object", () => {
            const market = createMarket()
            const product = market.offer("service19").asProduct({
                factory: () => ({})
            })
            expect(() => product.prototype(null as any)).toThrow(TypeError)
            expect(() => product.prototype(null as any)).toThrow(
                "config must be an object, got null"
            )
        })

        it("should throw TypeError when factory is missing", () => {
            const market = createMarket()
            const product = market.offer("service20").asProduct({
                factory: () => ({})
            })
            expect(() => product.prototype({} as any)).toThrow(TypeError)
            expect(() => product.prototype({} as any)).toThrow(
                "config.factory is required"
            )
        })
    })
})
