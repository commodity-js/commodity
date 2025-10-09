import { describe, it, expect, vi } from "vitest"
import { createMarket } from "#index"
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
                expect($$[$$assembler.name]).toBe($$assembler)
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
                const assemblerProduct = $$[$$assembler.name].assemble({})
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
                const session = $($$session)
                const role = session.role

                if (role === "admin") {
                    const adminFeature = $$[$$adminFeature.name].assemble({
                        ...$,
                        ...index($$adminSession.pack({ ...session, role }))
                    })

                    return {
                        user: session.userId,
                        feature: adminFeature.unpack()
                    }
                } else {
                    return {
                        user: session.userId,
                        feature: $($$userFeature)
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
                $$[$$failing.name].assemble({}).unpack()
                return "main"
            }
        })

        const $result = $$main.assemble({})

        expect(() => {
            $result.unpack()
        }).toThrow("Assembler failed")
    })

    it("should support assembler in prototype() method", () => {
        const market = createMarket()

        const $$assembler = market.offer("assembler").asProduct({
            factory: () => "assembler-value"
        })

        const $$main = market.offer("main").asProduct({
            factory: () => "main-value"
        })

        const $$prototype = $$main.prototype({
            factory: () => {
                return "prototype-value"
            },
            assemblers: [$$assembler]
        })

        expect($$prototype.assemblers).toHaveLength(1)
    })

    it("should support complex assembler dependency chains", () => {
        const market = createMarket()

        const $$db = market.offer("db").asResource<string>()

        const $$repository = market.offer("repository").asProduct({
            suppliers: [$$db],
            factory: ($) => {
                const db = $($$db)
                return "repo-" + db
            }
        })

        const $$feature = market.offer("feature").asProduct({
            suppliers: [$$repository],
            factory: ($) => {
                const repo = $($$repository)
                return "feature-" + repo
            }
        })

        const $$main = market.offer("main").asProduct({
            assemblers: [$$feature],
            factory: ($, $$) => {
                const $feature = $$[$$feature.name].assemble(
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
                const number = $($$number)
                return number * number
            }
        })

        const $$main = market.offer("main").asProduct({
            suppliers: [$$number],
            assemblers: [$$squarer],
            factory: ($, $$) => {
                const assembled = $$[$$squarer.name].assemble($)
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

    it("should support prototypes with assembler", () => {
        const market = createMarket()
        const factoryMock = vi.fn().mockReturnValue("value")

        const $$assembler = market.offer("assembler").asProduct({
            factory: factoryMock
        })

        const $$base = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const $$prototype = $$base.prototype({
            factory: ($, $$) => {
                expect($$[$$assembler.name]).toBe($$assembler)

                const assembled = $$[$$assembler.name].assemble({})
                const value = assembled.unpack()

                return `base-value-${value}`
            },
            assemblers: [$$assembler]
        })

        const $result = $$prototype.assemble({})
        expect($result.unpack()).toBe("base-value-value")
        expect(factoryMock).toHaveBeenCalledTimes(1)
    })

    it("should support prototypes with multiple assembler", () => {
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

        const $$prototype = $$base.prototype({
            factory: ($, $$) => {
                const assembler1 = $$[$$A.name].assemble({})
                const assembler2 = $$[$$B.name].assemble({})

                return `base-value-${assembler1.unpack()}-${assembler2.unpack()}`
            },
            assemblers: [$$A, $$B]
        })

        const $result = $$prototype.assemble({})
        expect($result.unpack()).toBe("base-value-A-B")
        expect(ASpy).toHaveBeenCalledTimes(1)
        expect(BSpy).toHaveBeenCalledTimes(1)
    })

    it("should support with() method with assembler replacing original ones", () => {
        const market = createMarket()
        const originalSpy = vi.fn().mockReturnValue("original")
        const triedSpy = vi.fn().mockReturnValue("tried")

        const $$originalAssembler = market.offer("original").asProduct({
            factory: originalSpy
        })

        const $$originalAssemblerPrototype = $$originalAssembler.prototype({
            factory: triedSpy
        })
        const $$base = market.offer("base").asProduct({
            assemblers: [$$originalAssembler],
            factory: ($, $$) => {
                return $$[$$originalAssembler.name].assemble({}).unpack()
            }
        })

        const $$tried = $$base.with($$originalAssemblerPrototype)

        const result = $$tried.assemble({}).unpack()

        expect(result).toBe("tried")
        expect(originalSpy).toHaveBeenCalledTimes(0)
        expect(triedSpy).toHaveBeenCalledTimes(2)
    })

    it("should support empty assembler in prototypes", () => {
        const market = createMarket()
        const $$base = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const $$prototype = $$base.prototype({
            factory: () => {
                return "prototype-value"
            }
        })

        const $result = $$prototype.assemble({})
        expect($result.unpack()).toBe("prototype-value")
    })

    it("should handle assembler errors in prototypes gracefully", () => {
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

        const $$prototype = $$base.prototype({
            factory: ($, $$) => {
                expect(() => {
                    $$[$$error.name].assemble({}).unpack()
                }).toThrow("Assembler error")
                return "prototype-value"
            },
            assemblers: [$$error]
        })

        const $result = $$prototype.assemble({})
        expect($result.unpack()).toBe("prototype-value")
    })

    it("should handle assembler errors in with() method gracefully", () => {
        const market = createMarket()
        const baseSpy = vi.fn().mockReturnValue("base")
        const errorSpy = vi.fn().mockImplementation(() => {
            throw new Error("Assembler error")
        })

        const $$base = market.offer("base").asProduct({
            factory: baseSpy
        })

        const $$error = $$base.prototype({
            factory: errorSpy
        })

        const $$main = market.offer("main").asProduct({
            assemblers: [$$base],
            factory: ($, $$) => {
                expect(() => {
                    $$[$$base.name].assemble({}).unpack()
                }).toThrow("Assembler error")
                return "main"
            }
        })

        const $$tried = $$main.with($$error)

        const $result = $$tried.assemble({})
        expect($result.unpack()).toBe("main")
    })

    it("should support complex assembler dependency chains in prototypes", () => {
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

        const $$prototype = $$base.prototype({
            assemblers: [$$test],
            factory: ($, $$) => {
                const $test = $$[$$test.name].assemble(
                    index($$config.pack({ env: "test" }))
                )

                return `base-${$test.unpack()}`
            }
        })

        const $result = $$prototype.assemble({})
        expect($result.unpack()).toBe("base-test")
    })

    it("should support assembler reassembly in prototypes", () => {
        const market = createMarket()
        const $$number = market.offer("number").asResource<number>()
        const $$squarer = market.offer("squarer").asProduct({
            suppliers: [$$number],
            factory: ($) => {
                const number = $($$number)
                return number * number
            }
        })

        const $$base = market.offer("base").asProduct({
            suppliers: [$$number],
            factory: () => "base-value"
        })

        const $$prototype = $$base.prototype({
            factory: ($, $$) => {
                const assembler = $$[$$squarer.name].assemble(
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

        const $result = $$prototype.assemble(index($$number.pack(5)))
        expect($result.unpack()).toBe("base-value-25-100")
    })

    it("should support assembler reassembly in with() method", () => {
        const market = createMarket()
        const $$number = market.offer("number").asResource<number>()
        const $$squarer = market.offer("squarer").asProduct({
            suppliers: [$$number],
            factory: ($) => {
                const number = $($$number)
                return number * number
            }
        })

        const $$triedSquarer = $$squarer.prototype({
            suppliers: [$$number],
            factory: ($) => {
                const number = $($$number)
                return number * number * 2
            }
        })

        const $$base = market.offer("base").asProduct({
            assemblers: [$$squarer],
            factory: ($, $$) => {
                const assembler = $$[$$squarer.name].assemble(
                    index($$number.pack(5))
                )
                const result = assembler.unpack()
                expect(result).toBe(50)
                const reassembled = assembler.reassemble(
                    index($$number.pack(10))
                )
                const reassembledResult = reassembled.unpack()
                expect(reassembledResult).toBe(200)
                return reassembledResult
            }
        })

        const $$tried = $$base.with($$triedSquarer)
        const $result = $$tried.assemble(index($$number.pack(5)))
        expect($result.unpack()).toBe(200)
    })

    it("should handle duplicate assembler names in with() method by overriding", () => {
        const market = createMarket()
        const originalSpy = vi.fn().mockReturnValue("original")
        const overrideSpy = vi.fn().mockReturnValue("override")
        const overrideSpy2 = vi.fn().mockReturnValue("override2")

        const $$original = market.offer("duplicate").asProduct({
            factory: originalSpy
        })

        const $$override = $$original.prototype({
            factory: overrideSpy
        })

        const $$override2 = $$original.prototype({
            factory: overrideSpy2
        })

        const $$base = market.offer("base").asProduct({
            assemblers: [$$original],
            factory: ($, $$) => {
                return $$[$$original.name].assemble({}).unpack()
            }
        })

        const $$tried = $$base.with($$override, $$override2)

        const $result = $$tried.assemble({})
        expect($result.unpack()).toBe("override2")
        expect(originalSpy).toHaveBeenCalledTimes(0)
        expect(overrideSpy).toHaveBeenCalledTimes(0)
        expect(overrideSpy2).toHaveBeenCalledTimes(2)
    })
})
