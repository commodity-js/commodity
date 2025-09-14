import { describe, it, expect, vi } from "vitest"
import { createMarket } from "#index"
import { index } from "#utils"

describe("JustInTime Feature", () => {
    it("should pass justInTime to factory but not auto-assemble them", () => {
        const market = createMarket()
        const justInTimeMock = vi.fn().mockReturnValue("jit-value")

        const justInTimeSupplier = market.offer("jit").asProduct({
            factory: justInTimeMock
        })

        const mainSupplier = market.offer("main").asProduct({
            justInTime: [justInTimeSupplier],
            factory: ($, $$) => {
                // JustInTime are passed but not auto-assembled
                expect($$[justInTimeSupplier.name]).toBe(justInTimeSupplier)
                expect(justInTimeMock).not.toHaveBeenCalled()

                return "main-result"
            }
        })

        const result = mainSupplier.assemble({})
        expect(result.unpack()).toBe("main-result")
        expect(justInTimeMock).not.toHaveBeenCalled()
    })

    it("should allow manual assembly of justInTime within factory", () => {
        const market = createMarket()
        const justInTimeFactoryMock = vi.fn().mockReturnValue("jit-value")

        const justInTimeSupplier = market.offer("jit").asProduct({
            factory: justInTimeFactoryMock
        })

        const mainSupplier = market.offer("main").asProduct({
            justInTime: [justInTimeSupplier],
            factory: ($, $$) => {
                // Manually assemble the justInTime
                const jitProduct = $$[justInTimeSupplier.name].assemble({})
                const value = jitProduct.unpack()

                expect(justInTimeFactoryMock).toHaveBeenCalledTimes(1)
                expect(value).toBe("jit-value")

                return {
                    main: "main-result",
                    jit: value
                }
            }
        })

        const result = mainSupplier.assemble({})
        expect(result.unpack()).toEqual({
            main: "main-result",
            jit: "jit-value"
        })
    })

    it("should support conditional assembly based on context (session admin example)", () => {
        const market = createMarket()

        // Session resource
        const sessionSupplier = market.offer("session").asResource<{
            userId: string
            role: string
        }>()

        // Admin session resource
        const adminSessionSupplier = market.offer("admin-session").asResource<{
            userId: string
            role: "admin"
        }>()

        // Admin-only justInTime
        const adminServiceSupplier = market.offer("adminService").asProduct({
            //Even if unused, protects this function from being called by non-admins via Typescript
            suppliers: [adminSessionSupplier],
            factory: () => "sensitive-admin-data"
        })

        // Regular user justInTime
        const userServiceSupplier = market.offer("userService").asProduct({
            factory: () => "regular-user-data"
        })

        // Main service that conditionally assembles based on session
        const mainServiceSupplier = market.offer("mainService").asProduct({
            suppliers: [sessionSupplier, userServiceSupplier],
            justInTime: [adminSessionSupplier, adminServiceSupplier],
            factory: ($, $$) => {
                const session = $(sessionSupplier)
                const role = session.role

                if (role === "admin") {
                    // Only assemble admin service for admins
                    const adminService = $$[adminServiceSupplier.name].assemble(
                        {
                            ...$,
                            ...index(
                                adminSessionSupplier.pack({ ...session, role })
                            )
                        }
                    )

                    return {
                        user: session.userId,
                        service: adminService.unpack()
                    }
                } else {
                    return {
                        user: session.userId,
                        service: $(userServiceSupplier)
                    }
                }
            }
        })

        // Test admin session
        const adminSession = sessionSupplier.pack({
            userId: "admin123",
            role: "admin"
        })
        const adminResult = mainServiceSupplier.assemble(index(adminSession))

        expect(adminResult.unpack()).toEqual({
            user: "admin123",
            service: "sensitive-admin-data"
        })

        // Test regular user session
        const userSession = sessionSupplier.pack({
            userId: "user456",
            role: "user"
        })
        const userResult = mainServiceSupplier.assemble(index(userSession))

        expect(userResult.unpack()).toEqual({
            user: "user456",
            service: "regular-user-data"
        })
    })

    it("should handle justInTime errors gracefully", () => {
        const market = createMarket()

        const failingSupplier = market.offer("failing").asProduct({
            factory: () => {
                throw new Error("JustInTime failed")
                return
            }
        })

        const mainServiceSupplier = market.offer("mainService").asProduct({
            justInTime: [failingSupplier],
            factory: ($, $$) => {
                // Try to assemble the failing justInTime
                $$[failingSupplier.name].assemble({}).unpack()
                return "main-service"
            }
        })

        const result = mainServiceSupplier.assemble({})

        expect(() => {
            result.unpack()
        }).toThrow("JustInTime failed")
    })

    it("should support justInTime in prototype() method", () => {
        const market = createMarket()

        const justInTimeSupplier = market.offer("jit").asProduct({
            factory: () => "jit-value"
        })

        const mainSupplier = market.offer("main").asProduct({
            factory: () => "main-value"
        })

        const prototypeSupplier = mainSupplier.prototype({
            factory: () => {
                return "prototype-value"
            },
            justInTime: [justInTimeSupplier],
            preload: false
        })

        expect(prototypeSupplier.justInTime).toHaveLength(1)
    })

    it("should support complex justInTime dependency chains", () => {
        const market = createMarket()

        // Base resource
        const dbSupplier = market.offer("db").asResource<{
            connectionString: string
        }>()

        // JustInTime that depends on database
        const repositorySupplier = market.offer("repository").asProduct({
            suppliers: [dbSupplier],
            factory: ($) => {
                const db = $(dbSupplier)
                return {
                    connection: db.connectionString,
                    operations: ["create", "read", "update", "delete"]
                }
            }
        })

        // Another justInTime that depends on repository
        const serviceSupplier = market.offer("service").asProduct({
            suppliers: [repositorySupplier],
            factory: ($) => {
                const repo = $(repositorySupplier)
                return {
                    name: "BusinessService",
                    repository: repo
                }
            }
        })

        // Main service that assembles the chain
        const mainServiceSupplier = market.offer("mainService").asProduct({
            justInTime: [serviceSupplier],
            factory: ($, $$) => {
                // Assemble the service with its full dependency chain
                const service = $$[serviceSupplier.name].assemble(
                    index(
                        dbSupplier.pack({
                            connectionString: "postgresql://localhost:5432/mydb"
                        })
                    )
                )

                return {
                    status: "ready",
                    service: service.unpack()
                }
            }
        })

        const result = mainServiceSupplier.assemble({})
        expect(result.unpack()).toEqual({
            status: "ready",
            service: {
                name: "BusinessService",
                repository: {
                    connection: "postgresql://localhost:5432/mydb",
                    operations: ["create", "read", "update", "delete"]
                }
            }
        })
    })

    it("should handle justInTime reassembly correctly", () => {
        const market = createMarket()

        const numberSupplier = market.offer("number").asResource<number>()

        const squarerSupplier = market.offer("squarer").asProduct({
            suppliers: [numberSupplier],
            factory: ($) => {
                const number = $(numberSupplier)
                return number * number
            }
        })

        const mainSupplier = market.offer("main").asProduct({
            suppliers: [numberSupplier],
            justInTime: [squarerSupplier],
            factory: ($, $$) => {
                const assembled = $$[squarerSupplier.name].assemble($)
                const squared = assembled.unpack()
                expect(squared).toEqual(25)
                const reassembled = assembled.reassemble(
                    index(numberSupplier.pack(10))
                )
                const reassembledSquared = reassembled.unpack()
                expect(reassembledSquared).toEqual(100)
                return reassembledSquared
            }
        })

        mainSupplier.assemble(index(numberSupplier.pack(5)))
    })

    it("should support prototypes with justInTime", () => {
        const market = createMarket()
        const justInTimeMock = vi.fn().mockReturnValue("jit-value")

        const justInTimeSupplier = market.offer("jit").asProduct({
            factory: justInTimeMock
        })

        const baseSupplier = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const prototypeSupplier = baseSupplier.prototype({
            factory: ($, $$) => {
                expect($$[justInTimeSupplier.name]).toBe(justInTimeSupplier)

                // Manually assemble the justInTime
                const assembled = $$[justInTimeSupplier.name].assemble({})
                const value = assembled.unpack()

                return `base-value-${value}`
            },
            justInTime: [justInTimeSupplier],
            preload: false
        })

        const result = prototypeSupplier.assemble({})
        expect(result.unpack()).toBe("base-value-jit-value")
        expect(justInTimeMock).toHaveBeenCalledTimes(1)
    })

    it("should support prototypes with multiple justInTime", () => {
        const market = createMarket()
        const justInTime1Mock = vi.fn().mockReturnValue("jit1")
        const justInTime2Mock = vi.fn().mockReturnValue("jit2")

        const justInTime1Supplier = market.offer("jit1").asProduct({
            factory: justInTime1Mock
        })

        const justInTime2Supplier = market.offer("jit2").asProduct({
            factory: justInTime2Mock
        })

        const baseSupplier = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const prototypeSupplier = baseSupplier.prototype({
            factory: ($, $$) => {
                const jit1 = $$[justInTime1Supplier.name].assemble({})
                const jit2 = $$[justInTime2Supplier.name].assemble({})

                return `base-value-${jit1.unpack()}-${jit2.unpack()}`
            },
            justInTime: [justInTime1Supplier, justInTime2Supplier],
            preload: false
        })

        const result = prototypeSupplier.assemble({})
        expect(result.unpack()).toBe("base-value-jit1-jit2")
        expect(justInTime1Mock).toHaveBeenCalledTimes(1)
        expect(justInTime2Mock).toHaveBeenCalledTimes(1)
    })

    it("should support try() method with justInTime replacing original ones", () => {
        const market = createMarket()
        const originalJustInTimeMock = vi.fn().mockReturnValue("original")
        const triedJustInTimeMock = vi.fn().mockReturnValue("tried")

        const originalJustInTimeSupplier = market
            .offer("originalJit")
            .asProduct({
                factory: originalJustInTimeMock
            })

        const triedJustInTimeSupplier = originalJustInTimeSupplier.prototype({
            factory: triedJustInTimeMock
        })
        const baseSupplier = market.offer("base").asProduct({
            justInTime: [originalJustInTimeSupplier],
            factory: ($, $$) => {
                return $$[originalJustInTimeSupplier.name].assemble({}).unpack()
            }
        })

        const triedSupplier = baseSupplier.try(triedJustInTimeSupplier)

        const result = triedSupplier.assemble({}).unpack()

        expect(result).toBe("tried")
        expect(originalJustInTimeMock).toHaveBeenCalledTimes(0)
        expect(triedJustInTimeMock).toHaveBeenCalledTimes(1)
    })

    it("should support empty justInTime in prototypes", () => {
        const market = createMarket()
        const baseSupplier = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const prototypeSupplier = baseSupplier.prototype({
            factory: () => {
                return "prototype-value"
            }
        })

        const result = prototypeSupplier.assemble({})
        expect(result.unpack()).toBe("prototype-value")
    })

    it("should support empty justInTime in try() method", () => {
        const market = createMarket()
        const originalJustInTimeMock = vi.fn().mockReturnValue("original")

        const originalJustInTimeSupplier = market
            .offer("originalJit")
            .asProduct({
                factory: originalJustInTimeMock
            })

        const baseSupplier = market.offer("base").asProduct({
            justInTime: [originalJustInTimeSupplier],
            factory: ($, $$) => {
                $$[originalJustInTimeSupplier.name].assemble({}).unpack()
                return "base-value"
            }
        })

        const triedSupplier = baseSupplier.try()

        const result = triedSupplier.assemble({})
        expect(result.unpack()).toBe("base-value")
        expect(originalJustInTimeMock).toHaveBeenCalledTimes(1)
    })

    it("should handle justInTime errors in prototypes gracefully", () => {
        const market = createMarket()
        const errorJustInTimeMock = vi.fn().mockImplementation(() => {
            throw new Error("JustInTime error")
        })

        const errorJustInTimeSupplier = market.offer("errorJit").asProduct({
            factory: errorJustInTimeMock
        })

        const baseSupplier = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const prototypeSupplier = baseSupplier.prototype({
            factory: ($, $$) => {
                expect(() => {
                    $$[errorJustInTimeSupplier.name].assemble({}).unpack()
                }).toThrow("JustInTime error")
                return "prototype-value"
            },
            justInTime: [errorJustInTimeSupplier]
        })

        const result = prototypeSupplier.assemble({})
        expect(result.unpack()).toBe("prototype-value")
    })

    it("should handle justInTime errors in try() method gracefully", () => {
        const market = createMarket()
        const baseJustInTimeMock = vi.fn().mockReturnValue("base-jit")
        const errorJustInTimeMock = vi.fn().mockImplementation(() => {
            throw new Error("JustInTime error")
        })

        const baseJustInTimeSupplier = market.offer("baseJit").asProduct({
            factory: baseJustInTimeMock
        })

        const errorJustInTimeSupplier = baseJustInTimeSupplier.prototype({
            factory: errorJustInTimeMock
        })

        const baseSupplier = market.offer("base").asProduct({
            justInTime: [baseJustInTimeSupplier],
            factory: ($, $$) => {
                expect(() => {
                    $$[baseJustInTimeSupplier.name].assemble({}).unpack()
                }).toThrow("JustInTime error")
                return "base-value"
            }
        })

        const triedSupplier = baseSupplier.try(errorJustInTimeSupplier)

        const result = triedSupplier.assemble({})
        expect(result.unpack()).toBe("base-value")
    })

    it("should support complex justInTime dependency chains in prototypes", () => {
        const market = createMarket()
        const dbMock = vi.fn().mockReturnValue({ connection: "test-db" })
        const serviceMock = vi.fn().mockReturnValue({ name: "TestService" })

        const configSupplier = market
            .offer("config")
            .asResource<{ env: string }>()
        const databaseSupplier = market.offer("database").asProduct({
            suppliers: [configSupplier],
            factory: dbMock
        })
        const serviceSupplier = market.offer("service").asProduct({
            suppliers: [databaseSupplier],
            factory: serviceMock
        })

        const baseSupplier = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const prototypeSupplier = baseSupplier.prototype({
            factory: ($, $$) => {
                const service = $$[serviceSupplier.name].assemble(
                    index(configSupplier.pack({ env: "test" }))
                )

                return `base-value-${JSON.stringify(service.unpack())}`
            },
            justInTime: [serviceSupplier],
            preload: false
        })

        const result = prototypeSupplier.assemble({})
        expect(result.unpack()).toBe('base-value-{"name":"TestService"}')
    })

    it("should support justInTime reassembly in prototypes", () => {
        const market = createMarket()
        const numberSupplier = market.offer("number").asResource<number>()
        const squarerSupplier = market.offer("squarer").asProduct({
            suppliers: [numberSupplier],
            factory: ($) => {
                const number = $(numberSupplier)
                return number * number
            }
        })

        const baseSupplier = market.offer("base").asProduct({
            suppliers: [numberSupplier],
            factory: () => "base-value"
        })

        const prototypeSupplier = baseSupplier.prototype({
            factory: ($, $$) => {
                const jit = $$[squarerSupplier.name].assemble(
                    index(numberSupplier.pack(5))
                )
                const squared = jit.unpack()

                const reassembled = jit.reassemble(
                    index(numberSupplier.pack(10))
                )
                const reassembledSquared = reassembled.unpack()

                return `base-value-${squared}-${reassembledSquared}`
            },
            justInTime: [squarerSupplier],
            preload: false
        })

        const result = prototypeSupplier.assemble(index(numberSupplier.pack(5)))

        expect(result.unpack()).toBe("base-value-25-100")
    })

    it("should support justInTime reassembly in try() method", () => {
        const market = createMarket()
        const numberSupplier = market.offer("number").asResource<number>()
        const squarerSupplier = market.offer("squarer").asProduct({
            suppliers: [numberSupplier],
            factory: ($) => {
                const number = $(numberSupplier)
                return number * number
            }
        })

        const triedSquarerSupplier = squarerSupplier.prototype({
            suppliers: [numberSupplier],
            factory: ($) => {
                const number = $(numberSupplier)
                return number * number * 2
            }
        })

        const baseSupplier = market.offer("base").asProduct({
            justInTime: [squarerSupplier],
            factory: ($, $$) => {
                const jit = $$[squarerSupplier.name].assemble(
                    index(numberSupplier.pack(5))
                )
                const result = jit.unpack()
                expect(result).toBe(50)
                const reassembled = jit.reassemble(
                    index(numberSupplier.pack(10))
                )
                const reassembledResult = reassembled.unpack()
                expect(reassembledResult).toBe(200)
                return reassembledResult
            }
        })

        const triedSupplier = baseSupplier.try(triedSquarerSupplier)

        const result = triedSupplier.assemble(index(numberSupplier.pack(5)))

        expect(result.unpack()).toBe(200)
    })

    it("should handle duplicate justInTime names in try() method by overriding", () => {
        const market = createMarket()
        const originalMock = vi.fn().mockReturnValue("original")
        const overrideMock = vi.fn().mockReturnValue("override")
        const overrideMock2 = vi.fn().mockReturnValue("override2")

        const originalSupplier = market.offer("duplicate").asProduct({
            factory: originalMock
        })

        const overrideSupplier = originalSupplier.prototype({
            factory: overrideMock
        })

        const overrideSupplier2 = originalSupplier.prototype({
            factory: overrideMock2
        })

        const baseSupplier = market.offer("base").asProduct({
            justInTime: [originalSupplier],
            factory: ($, $$) => {
                const jit = $$[originalSupplier.name].assemble({})
                return jit.unpack()
            }
        })

        const triedSupplier = baseSupplier.try(
            overrideSupplier,
            overrideSupplier2
        )

        const result = triedSupplier.assemble({})
        expect(result.unpack()).toBe("override2")
        expect(originalMock).toHaveBeenCalledTimes(0)
        expect(overrideMock).toHaveBeenCalledTimes(0)
        expect(overrideMock2).toHaveBeenCalledTimes(1)
    })
})
