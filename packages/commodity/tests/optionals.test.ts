import { describe, it, expect, assertType } from "vitest"
import { createMarket, index, type Resource } from "#index"

describe("Optionals Feature", () => {
    describe("Basic Optional Resource Usage", () => {
        it("should allow defining optional resources in product config", () => {
            const market = createMarket()
            const $$optional = market.offer("optional").asResource<string>()

            const $$product = market.offer("product").asProduct({
                optionals: [$$optional],
                factory: ($) => {
                    const optional = $[$$optional.name]
                    // The entire Resource is optional, not the value inside it
                    assertType<Resource<"optional", string> | undefined>(
                        optional
                    )
                    return optional?.unpack()
                }
            })

            expect($$product.optionals).toEqual([$$optional])
            expect($$product.assemble({}).unpack()).toEqual(undefined)
            expect(
                $$product.assemble(index($$optional.pack("test"))).unpack()
            ).toEqual("test")
            expect(
                // @ts-expect-error - invalid resource type
                $$product.assemble(index($$optional.pack(55))).unpack()
            ).toEqual(55)
        })

        it("should work when optional is NOT provided", () => {
            const market = createMarket()
            const $$config = market.offer("config").asResource<string>()
            const $$optional = market.offer("optional").asResource<number>()

            const $$product = market.offer("product").asProduct({
                suppliers: [$$config],
                optionals: [$$optional],
                factory: ($) => {
                    const config = $($$config)
                    const optional = $[$$optional.name]
                    return {
                        config,
                        hasOptional: optional !== undefined,
                        optionalValue: optional?.unpack()
                    }
                }
            })

            const $result = $$product.assemble(index($$config.pack("test")))

            expect($result.unpack()).toEqual({
                config: "test",
                hasOptional: false,
                optionalValue: undefined
            })
        })

        it("should support multiple optionals", () => {
            const market = createMarket()
            const $$required = market.offer("required").asResource<string>()
            const $$opt1 = market.offer("opt1").asResource<number>()
            const $$opt2 = market.offer("opt2").asResource<boolean>()
            const $$opt3 = market.offer("opt3").asResource<string>()

            const $$product = market.offer("product").asProduct({
                suppliers: [$$required],
                optionals: [$$opt1, $$opt2, $$opt3],
                factory: ($) => {
                    return {
                        required: $($$required),
                        opt1: $[$$opt1.name]?.unpack(),
                        opt2: $[$$opt2.name]?.unpack(),
                        opt3: $[$$opt3.name]?.unpack()
                    }
                }
            })

            // Provide only some optionals
            const $result = $$product.assemble(
                index($$required.pack("test"), $$opt2.pack(true))
            )

            expect($result.unpack()).toEqual({
                required: "test",
                opt1: undefined,
                opt2: true,
                opt3: undefined
            })
        })
    })

    describe("Type Safety with Optionals", () => {
        it("should make optional supplies optional in $ type", () => {
            const market = createMarket()
            const $$required = market.offer("required").asResource<string>()
            const $$optional = market.offer("optional").asResource<number>()

            const $$product = market.offer("product").asProduct({
                suppliers: [$$required],
                optionals: [$$optional],
                factory: ($) => {
                    // Required supplier should be non-optional in $
                    const requiredSupply = $[$$required.name]
                    assertType<Resource<"required", string>>(requiredSupply)

                    // Optional supplier should be optional in $
                    const optionalSupply = $[$$optional.name]
                    assertType<Resource<"optional", number> | undefined>(
                        optionalSupply
                    )

                    return "result"
                }
            })

            // Should not require optional in ToSupply
            const $result = $$product.assemble(index($$required.pack("test")))

            // But should allow it
            const $result2 = $$product.assemble(
                index($$required.pack("test"), $$optional.pack(42))
            )
        })

        it("should require all required suppliers in ToSupply", () => {
            const market = createMarket()
            const $$required = market.offer("required").asResource<string>()
            const $$optional = market.offer("optional").asResource<number>()

            const $$product = market.offer("product").asProduct({
                suppliers: [$$required],
                optionals: [$$optional],
                factory: ($) => "result"
            })

            // @ts-expect-error - missing required supplier
            const $fail = $$product.assemble(index($$optional.pack(42)))

            // Should work without optional
            const $ok = $$product.assemble(index($$required.pack("test")))
        })
    })

    describe("Optionals in $$ Parameter (Assemblers)", () => {
        it("should pass optionals to $$ parameter alongside assemblers", () => {
            const market = createMarket()
            const $$optional = market.offer("optional").asResource<string>()
            const $$assembler = market.offer("assembler").asProduct({
                factory: () => "assembled"
            })

            const $$product = market.offer("product").asProduct({
                optionals: [$$optional],
                assemblers: [$$assembler],
                factory: ($, $$) => {
                    // Both should be in $$
                    expect($$[$$optional.name]).toBe($$optional)
                    expect($$[$$assembler.name]).toBe($$assembler)

                    return "result"
                }
            })

            const $result = $$product.assemble({})
            expect($result.unpack()).toBe("result")
        })
    })

    describe("Optionals with Nested Dependencies", () => {
        it("should handle optionals in nested product chains", () => {
            const market = createMarket()
            const $$optionalConfig = market
                .offer("optionalConfig")
                .asResource<{ apiKey: string }>()
            const $$baseConfig = market
                .offer("baseConfig")
                .asResource<{ url: string }>()

            const $$api = market.offer("api").asProduct({
                suppliers: [$$baseConfig],
                optionals: [$$optionalConfig],
                factory: ($) => {
                    const base = $($$baseConfig)
                    const optional = $[$$optionalConfig.name]

                    return {
                        url: base.url,
                        apiKey: optional?.unpack().apiKey ?? "default-key"
                    }
                }
            })

            const $$app = market.offer("app").asProduct({
                suppliers: [$$api],
                factory: ($) => {
                    const api = $($$api)
                    return `Connecting to ${api.url} with ${api.apiKey}`
                }
            })

            // Without optional
            const $result1 = $$app.assemble(
                index($$baseConfig.pack({ url: "https://api.example.com" }))
            )
            expect($result1.unpack()).toBe(
                "Connecting to https://api.example.com with default-key"
            )

            // With optional
            const $result2 = $$app.assemble(
                index(
                    $$baseConfig.pack({ url: "https://api.example.com" }),
                    $$optionalConfig.pack({ apiKey: "secret-123" })
                )
            )
            expect($result2.unpack()).toBe(
                "Connecting to https://api.example.com with secret-123"
            )
        })

        it("should propagate optionals through transitive dependencies in types", () => {
            const market = createMarket()
            const $$optional = market.offer("optional").asResource<string>()

            const $$child = market.offer("child").asProduct({
                optionals: [$$optional],
                factory: ($) => {
                    return $[$$optional.name]?.unpack() ?? "default"
                }
            })

            const $$parent = market.offer("parent").asProduct({
                suppliers: [$$child],
                factory: ($) => {
                    return $($$child)
                }
            })

            // Should not require optional
            const $result1 = $$parent.assemble({})
            expect($result1.unpack()).toBe("default")

            // Should accept optional
            const $result2 = $$parent.assemble(index($$optional.pack("custom")))
            expect($result2.unpack()).toBe("custom")

            // Should accept optional but type-check it if provided
            // @ts-expect-error - invalid optional type
            const $result3 = $$parent.assemble(index($$optional.pack(55)))
            expect($result3.unpack()).toBe(55)
        })
    })

    describe("Optionals with Prototypes", () => {
        it("should allow prototypes to have different optionals", () => {
            const market = createMarket()
            const $$required = market.offer("required").asResource<string>()
            const $$optional1 = market.offer("optional1").asResource<number>()
            const $$optional2 = market.offer("optional2").asResource<number>()

            const $$base = market.offer("base").asProduct({
                suppliers: [$$required],
                optionals: [$$optional1],
                factory: ($) => {
                    return {
                        required: $($$required),
                        value: $[$$optional1.name]?.unpack() ?? 0
                    }
                }
            })

            const $$prototyped = $$base.prototype({
                suppliers: [$$required],
                optionals: [$$optional2],
                factory: ($) => {
                    return {
                        required: $($$required),
                        value: ($[$$optional2.name]?.unpack() ?? 0) * 2
                    }
                }
            })

            const $result = $$prototyped.assemble(
                index($$required.pack("test"), $$optional2.pack(21))
            )

            expect($result.unpack()).toEqual({
                required: "test",
                value: 42
            })
        })

        it("should handle optionals with try method", () => {
            const market = createMarket()
            const $$config = market.offer("config").asResource<string>()
            const $$optional = market.offer("optional").asResource<number>()

            const $$dependency = market.offer("dependency").asProduct({
                suppliers: [$$config],
                optionals: [$$optional],
                factory: ($) => {
                    const opt = $[$$optional.name]
                    return opt ? opt.unpack() * 2 : 0
                }
            })

            const $$main = market.offer("main").asProduct({
                suppliers: [$$dependency],
                factory: ($) => $($$dependency)
            })

            const $$mockDep = $$dependency.prototype({
                factory: () => 100
            })

            const $$tried = $$main.try($$mockDep)

            const $result = $$tried.assemble({})
            expect($result.unpack()).toBe(100)
        })
    })

    describe("Optionals with Reassemble", () => {
        it("should allow reassembling with optional when it was initially provided", () => {
            const market = createMarket()
            const $$config = market.offer("config").asResource<string>()
            const $$optional1 = market.offer("optional1").asResource<number>()
            const $$optional2 = market.offer("optional2").asResource<number>()

            const $$service = market.offer("service").asProduct({
                suppliers: [$$config],
                optionals: [$$optional1, $$optional2],
                factory: ($) => {
                    return {
                        config: $($$config),
                        optional1: $[$$optional1.name]?.unpack() ?? 0,
                        optional2: $[$$optional2.name]?.unpack() ?? 0
                    }
                }
            })

            const $initial = $$service.assemble(
                index(
                    $$config.pack("initial"),
                    $$optional1.pack(10),
                    $$optional2.pack(20)
                )
            )
            expect($initial.unpack()).toEqual({
                config: "initial",
                optional1: 10,
                optional2: 20
            })

            // Reassemble with different optional value
            const $reassembled = $initial.reassemble(
                index($$optional2.pack(50))
            )
            expect($reassembled.unpack()).toEqual({
                config: "initial",
                optional1: 10,
                optional2: 50
            })
        })

        it("should allow removing optional in reassemble", () => {
            const market = createMarket()
            const $$config = market.offer("config").asResource<string>()
            const $$optional = market.offer("optional").asResource<number>()

            const $$service = market.offer("service").asProduct({
                suppliers: [$$config],
                optionals: [$$optional],
                factory: ($) => ({
                    config: $($$config),
                    optional: $[$$optional.name]?.unpack()
                })
            })

            const $initial = $$service.assemble(
                index($$config.pack("test"), $$optional.pack(42))
            )
            expect($initial.unpack()).toEqual({
                config: "test",
                optional: 42
            })

            // Reassemble without optional (it should retain the old value)
            const $reassembled = $initial.reassemble({
                [$$optional.name]: undefined
            })
            expect($reassembled.unpack()).toEqual({
                config: "test",
                optional: undefined
            })
        })
    })

    describe("Optionals with .with() Method", () => {
        it("should handle optionals when using .with() for batch assembly", () => {
            const market = createMarket()
            const $$optional1 = market.offer("optional1").asResource<string>()
            const $$optional2 = market.offer("optional2").asResource<string>()

            const $$service1 = market.offer("service1").asProduct({
                optionals: [$$optional1],
                factory: ($) => {
                    return `S1: ${$[$$optional1.name]?.unpack() ?? "none"}`
                }
            })

            const $$service2 = market.offer("service2").asProduct({
                optionals: [$$optional2],
                factory: ($) => {
                    return `S2: ${$[$$optional2.name]?.unpack() ?? "none"}`
                }
            })

            const $batch = $$service1
                .with($$service2)
                .assemble(index($$optional1.pack("test")))

            expect($batch.unpack()).toBe("S1: test")
            expect($batch.supplies($$service2)).toBe("S2: none")
        })
    })

    describe("Edge Cases and Error Handling", () => {
        it("should handle empty optionals array", () => {
            const market = createMarket()
            const $$config = market.offer("config").asResource<string>()

            const $$product = market.offer("product").asProduct({
                suppliers: [$$config],
                optionals: [],
                factory: ($) => $($$config)
            })

            const $result = $$product.assemble(index($$config.pack("test")))
            expect($result.unpack()).toBe("test")
        })

        it("should handle product with only optionals (no required suppliers)", () => {
            const market = createMarket()
            const $$optional1 = market.offer("optional1").asResource<string>()
            const $$optional2 = market.offer("optional2").asResource<number>()

            const $$product = market.offer("product").asProduct({
                optionals: [$$optional1, $$optional2],
                factory: ($) => {
                    return {
                        opt1: $[$$optional1.name]?.unpack(),
                        opt2: $[$$optional2.name]?.unpack()
                    }
                }
            })

            // Should work with no supplies at all
            const $result1 = $$product.assemble({})
            expect($result1.unpack()).toEqual({
                opt1: undefined,
                opt2: undefined
            })

            // Should work with some optionals
            const $result2 = $$product.assemble(
                index($$optional1.pack("hello"))
            )
            expect($result2.unpack()).toEqual({
                opt1: "hello",
                opt2: undefined
            })

            // Should work with all optionals
            const $result3 = $$product.assemble(
                index($$optional1.pack("hello"), $$optional2.pack(42))
            )
            expect($result3.unpack()).toEqual({
                opt1: "hello",
                opt2: 42
            })
        })

        it("should handle same resource in both suppliers and optionals gracefully", () => {
            const market = createMarket()
            const $$resource = market.offer("resource").asResource<string>()

            const $$product = market.offer("product").asProduct({
                suppliers: [$$resource],
                optionals: [$$resource],
                factory: ($) => {
                    const required = $($$resource)
                    return required
                }
            })

            // @ts-expect-error - Required supplier takes precedence over optional
            const $fail = $$product.assemble({})
            const $result = $$product.assemble(index($$resource.pack("test")))
            expect($result.unpack()).toBe("test")
        })

        it("should handle init function with optionals", () => {
            const market = createMarket()
            const $$optional = market.offer("optional").asResource<number>()
            let optStore: number = 0

            const $$product = market.offer("product").asProduct({
                optionals: [$$optional],
                factory: ($) => {
                    return $[$$optional.name]?.unpack() ?? 10
                },
                init: (value, $) => {
                    // Can access optionals in init
                    const opt = $[$$optional.name]
                    if (opt) {
                        optStore = opt.unpack()
                    }
                }
            })

            const $result1 = $$product.assemble({})
            expect($result1.unpack()).toBe(10)
            expect(optStore).toEqual(0)

            optStore = 0

            const $result2 = $$product.assemble(index($$optional.pack(5)))
            expect($result2.unpack()).toBe(5)
            expect(optStore).toEqual(5)
        })
    })

    describe("Real-World Use Cases", () => {
        it("Feature flag example", () => {
            const market = createMarket()
            const $$featureFlag = market
                .offer("featureFlag")
                .asResource<boolean>()

            const $$ctx = market.offer("ctx").asResource<string>()

            const $$optionalFeature = market
                .offer("optionalFeature")
                .asProduct({
                    suppliers: [$$ctx],
                    factory: ($) => {
                        return $($$ctx)
                    }
                })

            const $$main = market.offer("main").asProduct({
                optionals: [$$featureFlag, $$ctx],
                assemblers: [$$optionalFeature],
                factory: ($, $$) => {
                    const enabled = $($$featureFlag)

                    if (enabled) {
                        // Assemble the optional feature with the optional context
                        const feature = $$[$$optionalFeature.name]
                            .assemble(index($$[$$ctx.name].pack("ctx")))
                            .unpack()
                        return feature
                    }

                    return undefined
                }
            })

            // Without optional context
            const $result1 = $$main.assemble(index($$featureFlag.pack(true)))
            expect($result1.unpack()).toEqual("ctx")

            // With optional context
            const $result2 = $$main.assemble(index())
            expect($result2.unpack()).toEqual(undefined)
        })

        it("should support optional authentication/authorization context", () => {
            const market = createMarket()

            const $$publicData = market.offer("publicData").asResource<{
                title: string
            }>()

            const $$userAuth = market.offer("userAuth").asResource<{
                userId: string
                token: string
            }>()

            const $$api = market.offer("api").asProduct({
                suppliers: [$$publicData],
                optionals: [$$userAuth],
                factory: ($) => {
                    const data = $($$publicData)
                    const auth = $[$$userAuth.name]

                    return {
                        getPublic: () => data.title,
                        getPrivate: () => {
                            if (!auth) {
                                throw new Error("Not authenticated")
                            }
                            return `${data.title} - User: ${
                                auth.unpack().userId
                            }`
                        }
                    }
                }
            })

            // Public access
            const $publicApi = $$api.assemble(
                index($$publicData.pack({ title: "Hello World" }))
            )
            expect($publicApi.unpack().getPublic()).toBe("Hello World")
            expect(() => $publicApi.unpack().getPrivate()).toThrow(
                "Not authenticated"
            )

            // Authenticated access
            const $authApi = $$api.assemble(
                index(
                    $$publicData.pack({ title: "Hello World" }),
                    $$userAuth.pack({ userId: "user123", token: "abc" })
                )
            )
            expect($authApi.unpack().getPublic()).toBe("Hello World")
            expect($authApi.unpack().getPrivate()).toBe(
                "Hello World - User: user123"
            )
        })

        it("should support optional caching/performance optimization context", () => {
            const market = createMarket()

            const $$config = market.offer("config").asResource<{
                apiUrl: string
            }>()

            const $$cache = market.offer("cache").asResource<Map<string, any>>()

            const $$dataService = market.offer("dataService").asProduct({
                suppliers: [$$config],
                optionals: [$$cache],
                factory: ($) => {
                    const config = $($$config)
                    const cache = $[$$cache.name]?.unpack()

                    return {
                        fetch: (key: string) => {
                            if (cache?.has(key)) {
                                return { data: cache.get(key), cached: true }
                            }
                            const data = `data-from-${config.apiUrl}-${key}`
                            cache?.set(key, data)
                            return { data, cached: false }
                        }
                    }
                }
            })

            // Without cache
            const $service1 = $$dataService.assemble(
                index($$config.pack({ apiUrl: "api.example.com" }))
            )
            expect($service1.unpack().fetch("user")).toEqual({
                data: "data-from-api.example.com-user",
                cached: false
            })

            // With cache
            const cache = new Map<string, any>()
            const $service2 = $$dataService.assemble(
                index(
                    $$config.pack({ apiUrl: "api.example.com" }),
                    $$cache.pack(cache)
                )
            )
            expect($service2.unpack().fetch("user")).toEqual({
                data: "data-from-api.example.com-user",
                cached: false
            })
            expect($service2.unpack().fetch("user")).toEqual({
                data: "data-from-api.example.com-user",
                cached: true
            })
        })
    })
})
