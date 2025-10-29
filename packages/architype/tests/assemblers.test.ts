import { describe, it, expect, vi, expectTypeOf } from "vitest"
import { createMarket, Product } from "#index"
import { index } from "#utils"

describe("Assemblers Feature", () => {
    it("should pass assemblers to factory but not auto-assemble them", () => {
        const market = createMarket()
        const factoryMock = vi.fn().mockReturnValue("value")

        const $$assembler = market.offer("assembler").asProduct({
            factory: factoryMock
        })

        const $$main = market.offer("main").asProduct({
            assemblers: [$$assembler],
            factory: ($, $$) => {
                // Assemblers are passed but not auto-assembled
                expect($$($$assembler).name).toBe($$assembler.name)
                expect(factoryMock).not.toHaveBeenCalled()

                return "main-result"
            }
        })

        const result = $$main.assemble({})
        expect(result.unpack()).toBe("main-result")
        expect(factoryMock).not.toHaveBeenCalled()
    })

    it("should allow manual assembly of assemblers within factory", () => {
        const market = createMarket()
        const factoryMock = vi.fn().mockReturnValue("value")

        const $$assembler = market.offer("assembler").asProduct({
            factory: factoryMock
        })

        const $$main = market.offer("main").asProduct({
            assemblers: [$$assembler],
            factory: ($, $$) => {
                const assemblerProduct = $$($$assembler).assemble({})
                const value = assemblerProduct.unpack()

                expect(factoryMock).toHaveBeenCalledTimes(1)
                expect(value).toBe("value")

                return {
                    main: "main-result",
                    assembler: value
                }
            }
        })

        const result = $$main.assemble({})
        expect(result.unpack()).toEqual({
            main: "main-result",
            assembler: "value"
        })
    })

    it("should support conditional assembly based on context (session admin example)", () => {
        const market = createMarket()

        const $$session = market.offer("session").asResource<{
            userId: string
            role: string
        }>()

        const $$adminSession = market.offer("admin-session").asResource<{
            userId: string
            role: "admin"
        }>()

        const $$adminFeature = market.offer("adminFeature").asProduct({
            //Even if unused, protects this function from being called by non-admins via Typescript
            suppliers: [$$adminSession],
            factory: () => "sensitive-admin-data"
        })

        const $$userFeature = market.offer("userFeature").asProduct({
            factory: () => "regular-user-data"
        })

        const $$main = market.offer("main").asProduct({
            suppliers: [$$session, $$userFeature],
            assemblers: [$$adminFeature],
            factory: ($, $$) => {
                const session = $($$session).unpack()
                const role = session.role

                if (role === "admin") {
                    const adminFeature = $$($$adminFeature).assemble(
                        index($$adminSession.pack({ ...session, role }))
                    )

                    return {
                        user: session.userId,
                        feature: adminFeature.unpack()
                    }
                } else {
                    return {
                        user: session.userId,
                        feature: $($$userFeature).unpack()
                    }
                }
            }
        })

        const adminSession = $$session.pack({
            userId: "admin123",
            role: "admin"
        })
        const adminResult = $$main.assemble(index(adminSession))

        expect(adminResult.unpack()).toEqual({
            user: "admin123",
            feature: "sensitive-admin-data"
        })

        const userSession = $$session.pack({
            userId: "user456",
            role: "user"
        })
        const userResult = $$main.assemble(index(userSession))

        expect(userResult.unpack()).toEqual({
            user: "user456",
            feature: "regular-user-data"
        })
    })

    it("should handle assembler errors gracefully", () => {
        const market = createMarket()

        const $$failing = market.offer("failing").asProduct({
            factory: () => {
                throw new Error("Assembler failed")
                return
            }
        })

        const $$main = market.offer("main").asProduct({
            assemblers: [$$failing],
            factory: ($, $$) => {
                $$($$failing).assemble({}).unpack()
                return "main"
            }
        })

        const $result = $$main.assemble({})

        expect(() => {
            $result.unpack()
        }).toThrow("Assembler failed")
    })

    it("should support assembler in mock() method", () => {
        const market = createMarket()

        const $$assembler = market.offer("assembler").asProduct({
            factory: () => "assembler-value"
        })

        const $$main = market.offer("main").asProduct({
            factory: () => "main-value"
        })

        const $$mock = $$main.mock({
            factory: () => {
                return "mock-value"
            },
            assemblers: [$$assembler]
        })

        expect($$mock.assemblers).toHaveLength(1)
    })

    it("should support complex assembler dependency chains", () => {
        const market = createMarket()

        const $$db = market.offer("db").asResource<string>()

        const $$repository = market.offer("repository").asProduct({
            suppliers: [$$db],
            factory: ($) => {
                const db = $($$db).unpack()
                return "repo-" + db
            }
        })

        const $$feature = market.offer("feature").asProduct({
            suppliers: [$$repository],
            factory: ($) => {
                const repo = $($$repository).unpack()
                return "feature-" + repo
            }
        })

        const $$main = market.offer("main").asProduct({
            assemblers: [$$feature],
            factory: ($, $$) => {
                const $feature = $$($$feature).assemble(
                    index($$db.pack("postgresql://localhost:5432/mydb"))
                )

                return "main-" + $feature.unpack()
            }
        })

        const $result = $$main.assemble({})
        expect($result.unpack()).toEqual(
            "main-feature-repo-postgresql://localhost:5432/mydb"
        )
    })

    it("should handle assembler reassembly correctly", () => {
        const market = createMarket()

        const $$number = market.offer("number").asResource<number>()

        const $$squarer = market.offer("squarer").asProduct({
            suppliers: [$$number],
            factory: ($) => {
                const number = $($$number).unpack()
                return number * number
            }
        })

        const $$main = market.offer("main").asProduct({
            suppliers: [$$number],
            assemblers: [$$squarer],
            factory: ($, $$) => {
                const assembled = $$($$squarer).assemble(
                    index($$number.pack($($$number).unpack()))
                )
                const squared = assembled.unpack()
                expect(squared).toEqual(25)
                const reassembled = assembled.reassemble(
                    index($$number.pack(10))
                )
                const reassembledSquared = reassembled.unpack()
                expect(reassembledSquared).toEqual(100)
                return reassembledSquared
            }
        })

        $$main.assemble(index($$number.pack(5)))
    })

    it("should support mocks with assembler", () => {
        const market = createMarket()
        const factoryMock = vi.fn().mockReturnValue("value")

        const $$assembler = market.offer("assembler").asProduct({
            factory: factoryMock
        })

        const $$base = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const $$mock = $$base.mock({
            factory: ($, $$) => {
                expect($$($$assembler).name).toBe($$assembler.name)

                const assembled = $$($$assembler).assemble({})
                const value = assembled.unpack()

                return `base-value-${value}`
            },
            assemblers: [$$assembler]
        })

        const $result = $$mock.assemble({})
        expect($result.unpack()).toBe("base-value-value")
        expect(factoryMock).toHaveBeenCalledTimes(1)
    })

    it("should support mocks with multiple assemblers", () => {
        const market = createMarket()
        const ASpy = vi.fn().mockReturnValue("A")
        const BSpy = vi.fn().mockReturnValue("B")

        const $$A = market.offer("A").asProduct({
            factory: ASpy
        })

        const $$B = market.offer("B").asProduct({
            factory: BSpy
        })

        const $$base = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const $$mock = $$base.mock({
            factory: ($, $$) => {
                const assembler1 = $$($$A).assemble({})
                const assembler2 = $$($$B).assemble({})

                return `base-value-${assembler1.unpack()}-${assembler2.unpack()}`
            },
            assemblers: [$$A, $$B]
        })

        const $result = $$mock.assemble({})
        expect($result.unpack()).toBe("base-value-A-B")
        expect(ASpy).toHaveBeenCalledTimes(1)
        expect(BSpy).toHaveBeenCalledTimes(1)
    })

    it("should support hire() method with assembler replacing original ones", () => {
        const market = createMarket()
        const originalSpy = vi.fn().mockReturnValue("original")
        const hiredSpy = vi.fn().mockReturnValue("hired")

        const $$originalAssembler = market.offer("original").asProduct({
            factory: originalSpy
        })

        const $$originalAssemblerMock = $$originalAssembler.mock({
            factory: hiredSpy
        })
        const $$base = market.offer("base").asProduct({
            assemblers: [$$originalAssembler],
            factory: ($, $$) => {
                return $$($$originalAssembler).assemble({}).unpack()
            }
        })

        const $$hired = $$base.hire([], [$$originalAssemblerMock])

        const result = $$hired.assemble({}).unpack()

        expect(result).toBe("hired")
        expect(originalSpy).toHaveBeenCalledTimes(0)
        expect(hiredSpy).toHaveBeenCalledTimes(1)
    })

    it("should support empty assembler in mocks", () => {
        const market = createMarket()
        const $$base = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const $$mock = $$base.mock({
            factory: () => {
                return "mock-value"
            }
        })

        const $result = $$mock.assemble({})
        expect($result.unpack()).toBe("mock-value")
    })

    it("should handle assembler errors in mocks gracefully", () => {
        const market = createMarket()
        const errorSpy = vi.fn().mockImplementation(() => {
            throw new Error("Assembler error")
        })

        const $$error = market.offer("error").asProduct({
            factory: errorSpy
        })

        const $$base = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const $$mock = $$base.mock({
            factory: ($, $$) => {
                expect(() => {
                    $$($$error).assemble({}).unpack()
                }).toThrow("Assembler error")
                return "mock-value"
            },
            assemblers: [$$error]
        })

        const $result = $$mock.assemble({})
        expect($result.unpack()).toBe("mock-value")
    })

    it("should handle assembler errors in hire() method gracefully", () => {
        const market = createMarket()
        const baseSpy = vi.fn().mockReturnValue("base")
        const errorSpy = vi.fn().mockImplementation(() => {
            throw new Error("Assembler error")
        })

        const $$base = market.offer("base").asProduct({
            factory: baseSpy
        })

        const $$error = $$base.mock({
            factory: errorSpy
        })

        const $$main = market.offer("main").asProduct({
            assemblers: [$$base],
            factory: ($, $$) => {
                expect(() => {
                    $$($$base).assemble({}).unpack()
                }).toThrow()
                return "main"
            }
        })

        const $$hired = $$main.hire([], [$$error])

        const result = $$hired.assemble({}).unpack()
        expect(result).toBe("main")
    })

    it("should support complex assembler dependency chains in mocks", () => {
        const market = createMarket()
        const dbSpy = vi.fn().mockReturnValue("db")
        const testSpy = vi.fn().mockReturnValue("test")

        const $$config = market.offer("config").asResource<{ env: string }>()
        const $$db = market.offer("db").asProduct({
            suppliers: [$$config],
            factory: dbSpy
        })
        const $$test = market.offer("test").asProduct({
            suppliers: [$$db],
            factory: testSpy
        })

        const $$base = market.offer("base").asProduct({
            factory: () => "base"
        })

        const $$mock = $$base.mock({
            assemblers: [$$test],
            factory: ($, $$) => {
                const $test = $$($$test).assemble(
                    index($$config.pack({ env: "test" }))
                )

                return `base-${$test.unpack()}`
            }
        })

        const $result = $$mock.assemble({})
        expect($result.unpack()).toBe("base-test")
    })

    it("should support assembler reassembly in mocks", () => {
        const market = createMarket()
        const $$number = market.offer("number").asResource<number>()
        const $$squarer = market.offer("squarer").asProduct({
            suppliers: [$$number],
            factory: ($) => {
                const number = $($$number).unpack()
                return number * number
            }
        })

        const $$base = market.offer("base").asProduct({
            suppliers: [$$number],
            factory: () => "base-value"
        })

        const $$mock = $$base.mock({
            factory: ($, $$) => {
                const assembler = $$($$squarer).assemble(
                    index($$number.pack(5))
                )
                const squared = assembler.unpack()

                const reassembled = assembler.reassemble(
                    index($$number.pack(10))
                )
                const reassembledSquared = reassembled.unpack()

                return `base-value-${squared}-${reassembledSquared}`
            },
            assemblers: [$$squarer]
        })

        const $result = $$mock.assemble(index($$number.pack(5)))
        expect($result.unpack()).toBe("base-value-25-100")
    })

    it("should support assembler reassembly in hire() method", () => {
        const market = createMarket()
        const $$number = market.offer("number").asResource<number>()
        const $$squarer = market.offer("squarer").asProduct({
            suppliers: [$$number],
            factory: ($) => {
                const number = $($$number).unpack()
                return number * number
            }
        })

        const $$hiredSquarer = $$squarer.mock({
            suppliers: [$$number],
            factory: ($) => {
                const number = $($$number).unpack()
                return number * number * 2
            }
        })

        const $$base = market.offer("base").asProduct({
            assemblers: [$$squarer],
            factory: ($, $$) => {
                const $assembler = $$($$squarer).assemble(
                    index($$number.pack(5))
                )
                const result = $assembler.unpack()
                expect(result).toBe(50)
                const $reassembled = $assembler.reassemble(
                    index($$number.pack(10))
                )
                const reassembledResult = $reassembled.unpack()
                expect(reassembledResult).toBe(200)
                return reassembledResult
            }
        })

        const $$hired = $$base.hire([], [$$hiredSquarer])
        const $result = $$hired.assemble(index($$number.pack(5)))
        expect($result.unpack()).toBe(200)
    })

    it("should handle duplicate assembler names in hire() method by overriding", () => {
        const market = createMarket()
        const originalSpy = vi.fn().mockReturnValue("original")
        const overrideSpy = vi.fn().mockReturnValue("override")
        const overrideSpy2 = vi.fn().mockReturnValue("override2")

        const $$original = market.offer("duplicate").asProduct({
            factory: originalSpy
        })

        const $$override = $$original.mock({
            factory: overrideSpy
        })

        const $$override2 = $$original.mock({
            factory: overrideSpy2
        })

        const $$base = market.offer("base").asProduct({
            assemblers: [$$original],
            factory: ($, $$) => {
                return $$($$original).assemble({}).unpack()
            }
        })

        const $$hired = $$base.hire([], [$$override, $$override2])

        const $result = $$hired.assemble({})
        expect($result.unpack()).toBe("override2")
        expect(originalSpy).toHaveBeenCalledTimes(0)
        expect(overrideSpy).toHaveBeenCalledTimes(0)
        expect(overrideSpy2).toHaveBeenCalledTimes(1)
    })

    it("should allow adding new assemblers with different names", () => {
        const market = createMarket()
        const $$resource = market.offer("resource").asResource<string>()

        const $$assembler1 = market.offer("assembler1").asProduct({
            suppliers: [$$resource],
            factory: ($) => `A1: ${$($$resource).unpack()}`
        })

        const $$assembler2 = market.offer("assembler2").asProduct({
            suppliers: [$$resource],
            factory: ($) => `A2: ${$($$resource).unpack()}`
        })

        const $$base = market.offer("base").asProduct({
            assemblers: [$$assembler1],
            factory: ($, $$) => {
                return $$($$assembler1)
                    .assemble(index($$resource.pack("test")))
                    .unpack()
            }
        })

        const $$extended = $$base.hire([], [$$assembler2])

        // @ts-expect-error - withAssemblers resources must be supplied also
        $$extended.assemble({})
        const $result = $$extended.assemble(index($$resource.pack("unused")))
        expect($result.unpack()).toBe("A1: test")
    })

    describe("Accessing $ supplies after hire() call in a factory", () => {
        it("$ supplies of product built with hire() should contain only the hired suppliers products properly typed", () => {
            const market = createMarket()

            const $$assembler1 = market.offer("assembler1").asProduct({
                factory: () => "assembler1-value"
            })

            const $$assembler2 = market.offer("assembler2").asProduct({
                factory: () => "assembler2-value"
            })

            const $$main = market.offer("main").asProduct({
                assemblers: [$$assembler1, $$assembler2],
                factory: ($, $$) => {
                    const $product = $$($$assembler1)
                        .hire([$$assembler2])
                        .assemble({})

                    const $assembler2 = $product.$($$assembler2)
                    expectTypeOf($assembler2).toExtend<Product>()
                    expect($assembler2.unpack()).toBe("assembler2-value")
                }
            })

            $$main.assemble({})
        })
    })
})
