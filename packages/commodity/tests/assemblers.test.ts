import { describe, it, expect, vi } from "vitest"
import { createMarket } from "#index"
import { index } from "#utils"

describe("Assemblers Feature", () => {
    it("should pass assemblers to factory but not auto-assemble them", () => {
        const market = createMarket()
        const factoryMock = vi.fn().mockReturnValue("value")

        const assemblerSupplier = market.offer("assembler").asProduct({
            factory: factoryMock
        })

        const mainSupplier = market.offer("main").asProduct({
            assemblers: [assemblerSupplier],
            factory: ($, $$) => {
                // Assemblers are passed but not auto-assembled
                expect($$[assemblerSupplier.name]).toBe(assemblerSupplier)
                expect(factoryMock).not.toHaveBeenCalled()

                return "main-result"
            }
        })

        const result = mainSupplier.assemble({})
        expect(result.unpack()).toBe("main-result")
        expect(factoryMock).not.toHaveBeenCalled()
    })

    it("should allow manual assembly of assemblers within factory", () => {
        const market = createMarket()
        const factoryMock = vi.fn().mockReturnValue("value")

        const assemblerSupplier = market.offer("assembler").asProduct({
            factory: factoryMock
        })

        const mainSupplier = market.offer("main").asProduct({
            assemblers: [assemblerSupplier],
            factory: ($, $$) => {
                // Manually assemble the assembler
                const assemblerProduct = $$[assemblerSupplier.name].assemble({})
                const value = assemblerProduct.unpack()

                expect(factoryMock).toHaveBeenCalledTimes(1)
                expect(value).toBe("value")

                return {
                    main: "main-result",
                    assembler: value
                }
            }
        })

        const result = mainSupplier.assemble({})
        expect(result.unpack()).toEqual({
            main: "main-result",
            assembler: "value"
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

        // Admin-only assembler
        const adminServiceSupplier = market.offer("adminService").asProduct({
            //Even if unused, protects this function from being called by non-admins via Typescript
            suppliers: [adminSessionSupplier],
            factory: () => "sensitive-admin-data"
        })

        // Regular user assembler
        const userServiceSupplier = market.offer("userService").asProduct({
            factory: () => "regular-user-data"
        })

        // Main service that conditionally assembles based on session
        const mainServiceSupplier = market.offer("mainService").asProduct({
            suppliers: [sessionSupplier, userServiceSupplier],
            assemblers: [adminServiceSupplier],
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

    it("should handle assembler errors gracefully", () => {
        const market = createMarket()

        const failingSupplier = market.offer("failing").asProduct({
            factory: () => {
                throw new Error("Assembler failed")
                return
            }
        })

        const mainServiceSupplier = market.offer("mainService").asProduct({
            assemblers: [failingSupplier],
            factory: ($, $$) => {
                // Try to assemble the failing assembler
                $$[failingSupplier.name].assemble({}).unpack()
                return "main-service"
            }
        })

        const result = mainServiceSupplier.assemble({})

        expect(() => {
            result.unpack()
        }).toThrow("Assembler failed")
    })

    it("should support assembler in prototype() method", () => {
        const market = createMarket()

        const assemblerSupplier = market.offer("assembler").asProduct({
            factory: () => "assembler-value"
        })

        const mainSupplier = market.offer("main").asProduct({
            factory: () => "main-value"
        })

        const prototypeSupplier = mainSupplier.prototype({
            factory: () => {
                return "prototype-value"
            },
            assemblers: [assemblerSupplier]
        })

        expect(prototypeSupplier.assemblers).toHaveLength(1)
    })

    it("should support complex assembler dependency chains", () => {
        const market = createMarket()

        // Base resource
        const dbSupplier = market.offer("db").asResource<{
            connectionString: string
        }>()

        // Assembler that depends on database
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

        // Another assembler that depends on repository
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
            assemblers: [serviceSupplier],
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

    it("should handle assembler reassembly correctly", () => {
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
            assemblers: [squarerSupplier],
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

    it("should support prototypes with assembler", () => {
        const market = createMarket()
        const factoryMock = vi.fn().mockReturnValue("value")

        const assemblerSupplier = market.offer("assembler").asProduct({
            factory: factoryMock
        })

        const baseSupplier = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const prototypeSupplier = baseSupplier.prototype({
            factory: ($, $$) => {
                expect($$[assemblerSupplier.name]).toBe(assemblerSupplier)

                // Manually assemble the assembler
                const assembled = $$[assemblerSupplier.name].assemble({})
                const value = assembled.unpack()

                return `base-value-${value}`
            },
            assemblers: [assemblerSupplier]
        })

        const result = prototypeSupplier.assemble({})
        expect(result.unpack()).toBe("base-value-value")
        expect(factoryMock).toHaveBeenCalledTimes(1)
    })

    it("should support prototypes with multiple assembler", () => {
        const market = createMarket()
        const factoryMock1 = vi.fn().mockReturnValue("value1")
        const factoryMock2 = vi.fn().mockReturnValue("value2")

        const assemblerSupplier1 = market.offer("assembler1").asProduct({
            factory: factoryMock1
        })

        const assemblerSupplier2 = market.offer("assembler2").asProduct({
            factory: factoryMock2
        })

        const baseSupplier = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const prototypeSupplier = baseSupplier.prototype({
            factory: ($, $$) => {
                const assembler1 = $$[assemblerSupplier1.name].assemble({})
                const assembler2 = $$[assemblerSupplier2.name].assemble({})

                return `base-value-${assembler1.unpack()}-${assembler2.unpack()}`
            },
            assemblers: [assemblerSupplier1, assemblerSupplier2]
        })

        const result = prototypeSupplier.assemble({})
        expect(result.unpack()).toBe("base-value-value1-value2")
        expect(factoryMock1).toHaveBeenCalledTimes(1)
        expect(factoryMock2).toHaveBeenCalledTimes(1)
    })

    it("should support try() method with assembler replacing original ones", () => {
        const market = createMarket()
        const originalFactoryMock = vi.fn().mockReturnValue("original")
        const triedFactoryMock = vi.fn().mockReturnValue("tried")

        const originalAssemblerSupplier = market
            .offer("originalAssembler")
            .asProduct({
                factory: originalFactoryMock
            })

        const triedAssemblerSupplier = originalAssemblerSupplier.prototype({
            factory: triedFactoryMock
        })
        const baseSupplier = market.offer("base").asProduct({
            assemblers: [originalAssemblerSupplier],
            factory: ($, $$) => {
                return $$[originalAssemblerSupplier.name].assemble({}).unpack()
            }
        })

        const triedSupplier = baseSupplier
            .assemblersOnly()
            .try(triedAssemblerSupplier)

        const result = triedSupplier.assemble({}).unpack()

        expect(result).toBe("tried")
        expect(originalFactoryMock).toHaveBeenCalledTimes(0)
        expect(triedFactoryMock).toHaveBeenCalledTimes(1)
    })

    it("should support empty assembler in prototypes", () => {
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

    it("should support empty assembler in try() method", () => {
        const market = createMarket()
        const originalFactoryMock = vi.fn().mockReturnValue("original")

        const originalAssemblerSupplier = market
            .offer("originalAssembler")
            .asProduct({
                factory: originalFactoryMock
            })

        const baseSupplier = market.offer("base").asProduct({
            assemblers: [originalAssemblerSupplier],
            factory: ($, $$) => {
                $$[originalAssemblerSupplier.name].assemble({}).unpack()
                return "base-value"
            }
        })

        const triedSupplier = baseSupplier.try()

        const result = triedSupplier.assemble({})
        expect(result.unpack()).toBe("base-value")
        expect(originalFactoryMock).toHaveBeenCalledTimes(1)
    })

    it("should handle assembler errors in prototypes gracefully", () => {
        const market = createMarket()
        const errorFactoryMock = vi.fn().mockImplementation(() => {
            throw new Error("Assembler error")
        })

        const errorAssemblerSupplier = market
            .offer("errorAssembler")
            .asProduct({
                factory: errorFactoryMock
            })

        const baseSupplier = market.offer("base").asProduct({
            factory: () => "base-value"
        })

        const prototypeSupplier = baseSupplier.prototype({
            factory: ($, $$) => {
                expect(() => {
                    $$[errorAssemblerSupplier.name].assemble({}).unpack()
                }).toThrow("Assembler error")
                return "prototype-value"
            },
            assemblers: [errorAssemblerSupplier]
        })

        const result = prototypeSupplier.assemble({})
        expect(result.unpack()).toBe("prototype-value")
    })

    it("should handle assembler errors in try() method gracefully", () => {
        const market = createMarket()
        const baseFactoryMock = vi.fn().mockReturnValue("base-value")
        const errorFactoryMock = vi.fn().mockImplementation(() => {
            throw new Error("Assembler error")
        })

        const baseAssemblerSupplier = market.offer("baseAssembler").asProduct({
            factory: baseFactoryMock
        })

        const errorAssemblerSupplier = baseAssemblerSupplier.prototype({
            factory: errorFactoryMock
        })

        const baseSupplier = market.offer("base").asProduct({
            assemblers: [baseAssemblerSupplier],
            factory: ($, $$) => {
                expect(() => {
                    $$[baseAssemblerSupplier.name].assemble({}).unpack()
                }).toThrow("Assembler error")
                return "base-value"
            }
        })

        const triedSupplier = baseSupplier.try(errorAssemblerSupplier)

        const result = triedSupplier.assemble({})
        expect(result.unpack()).toBe("base-value")
    })

    it("should support complex assembler dependency chains in prototypes", () => {
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
            assemblers: [serviceSupplier]
        })

        const result = prototypeSupplier.assemble({})
        expect(result.unpack()).toBe('base-value-{"name":"TestService"}')
    })

    it("should support assembler reassembly in prototypes", () => {
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
                const assembler = $$[squarerSupplier.name].assemble(
                    index(numberSupplier.pack(5))
                )
                const squared = assembler.unpack()

                const reassembled = assembler.reassemble(
                    index(numberSupplier.pack(10))
                )
                const reassembledSquared = reassembled.unpack()

                return `base-value-${squared}-${reassembledSquared}`
            },
            assemblers: [squarerSupplier]
        })

        const result = prototypeSupplier.assemble(index(numberSupplier.pack(5)))

        expect(result.unpack()).toBe("base-value-25-100")
    })

    it("should support assembler reassembly in try() method", () => {
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
            assemblers: [squarerSupplier],
            factory: ($, $$) => {
                const assembler = $$[squarerSupplier.name].assemble(
                    index(numberSupplier.pack(5))
                )
                const result = assembler.unpack()
                expect(result).toBe(50)
                const reassembled = assembler.reassemble(
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

    it("should handle duplicate assembler names in try() method by overriding", () => {
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
            assemblers: [originalSupplier],
            factory: ($, $$) => {
                const assembler = $$[originalSupplier.name].assemble({})
                return assembler.unpack()
            }
        })

        const triedSupplier = baseSupplier
            .assemblersOnly()
            .try(overrideSupplier, overrideSupplier2)

        const result = triedSupplier.assemble({})
        expect(result.unpack()).toBe("override2")
        expect(originalMock).toHaveBeenCalledTimes(0)
        expect(overrideMock).toHaveBeenCalledTimes(0)
        expect(overrideMock2).toHaveBeenCalledTimes(1)
    })
})

describe("with() method", () => {
    it("should allow assembling multiple suppliers together", () => {
        const market = createMarket()

        const configSupplier = market.offer("config").asResource<{
            apiUrl: string
        }>()

        const userServiceSupplier = market.offer("userService").asProduct({
            suppliers: [configSupplier],
            factory: ($) => {
                const config = $(configSupplier)
                return { service: "user", url: config.apiUrl }
            }
        })

        const orderServiceSupplier = market.offer("orderService").asProduct({
            suppliers: [configSupplier],
            factory: ($) => {
                const config = $(configSupplier)
                return { service: "order", url: config.apiUrl }
            }
        })

        const combinedSupplier = userServiceSupplier.with(orderServiceSupplier)
        const config = configSupplier.pack({
            apiUrl: "https://api.example.com"
        })
        const result = combinedSupplier.assemble(index(config))

        expect(result.unpack()).toEqual({
            service: "user",
            url: "https://api.example.com"
        })

        // Access the other supplier's result
        const orderResult = result.supplies(orderServiceSupplier)
        expect(orderResult).toEqual({
            service: "order",
            url: "https://api.example.com"
        })
    })

    it("should type check that all required resources are provided", () => {
        const market = createMarket()

        const dbSupplier = market
            .offer("db")
            .asResource<{ connectionString: string }>()
        const cacheSupplier = market
            .offer("cache")
            .asResource<{ host: string }>()

        const userServiceSupplier = market.offer("userService").asProduct({
            suppliers: [dbSupplier],
            factory: ($) => {
                const db = $(dbSupplier)
                return { service: "user", db: db.connectionString }
            }
        })

        const sessionServiceSupplier = market
            .offer("sessionService")
            .asProduct({
                suppliers: [cacheSupplier],
                factory: ($) => {
                    const cache = $(cacheSupplier)
                    return { service: "session", cache: cache.host }
                }
            })

        const combinedSupplier = userServiceSupplier.with(
            sessionServiceSupplier
        )

        // Should require both db and cache resources
        const db = dbSupplier.pack({
            connectionString: "postgresql://localhost:5432/db"
        })
        const cache = cacheSupplier.pack({ host: "redis://localhost:6379" })

        // @ts-expect-error - cache is missing
        const fail = combinedSupplier.assemble(index(db))

        const result = combinedSupplier.assemble(index(db, cache))

        expect(result.unpack()).toEqual({
            service: "user",
            db: "postgresql://localhost:5432/db"
        })

        const sessionResult = result.supplies(sessionServiceSupplier)
        expect(sessionResult).toEqual({
            service: "session",
            cache: "redis://localhost:6379"
        })
    })

    it("should work with suppliers that have overlapping dependencies", () => {
        const market = createMarket()

        const sharedSupplier = market
            .offer("shared")
            .asResource<{ value: string }>()
        const uniqueSupplier = market
            .offer("unique")
            .asResource<{ id: number }>()

        const serviceASupplier = market.offer("serviceA").asProduct({
            suppliers: [sharedSupplier],
            factory: ($) => {
                const shared = $(sharedSupplier)
                return { name: "ServiceA", shared: shared.value }
            }
        })

        const serviceBSupplier = market.offer("serviceB").asProduct({
            suppliers: [sharedSupplier, uniqueSupplier],
            factory: ($) => {
                const shared = $(sharedSupplier)
                const unique = $(uniqueSupplier)
                return {
                    name: "ServiceB",
                    shared: shared.value,
                    id: unique.id
                }
            }
        })

        const combinedSupplier = serviceASupplier.with(serviceBSupplier)

        const shared = sharedSupplier.pack({ value: "shared-data" })
        const unique = uniqueSupplier.pack({ id: 123 })

        const result = combinedSupplier.assemble(index(shared, unique))

        expect(result.unpack()).toEqual({
            name: "ServiceA",
            shared: "shared-data"
        })

        const serviceBResult = result.supplies(serviceBSupplier)
        expect(serviceBResult).toEqual({
            name: "ServiceB",
            shared: "shared-data",
            id: 123
        })
    })

    it("should handle reassembly correctly with with() method", () => {
        const market = createMarket()

        const numberSupplier = market.offer("number").asResource<number>()

        const doublerSupplier = market.offer("doubler").asProduct({
            suppliers: [numberSupplier],
            factory: ($) => $(numberSupplier) * 2
        })

        const triplerSupplier = market.offer("tripler").asProduct({
            suppliers: [numberSupplier],
            factory: ($) => $(numberSupplier) * 3
        })

        const combinedSupplier = doublerSupplier.with(triplerSupplier)
        const result = combinedSupplier.assemble(index(numberSupplier.pack(5)))

        expect(result.unpack()).toBe(10) // 5 * 2
        expect(result.supplies(triplerSupplier)).toBe(15) // 5 * 3

        // Test reassembly
        const reassembled = result.reassemble(index(numberSupplier.pack(10)))
        expect(reassembled.unpack()).toBe(20) // 10 * 2
        expect(reassembled.supplies(triplerSupplier)).toBe(30) // 10 * 3
    })

    it("should support empty suppliers list in with() method", () => {
        const market = createMarket()

        const simpleSupplier = market.offer("simple").asProduct({
            factory: () => "simple-value"
        })

        const combinedSupplier = simpleSupplier.with()
        const result = combinedSupplier.assemble({})

        expect(result.unpack()).toBe("simple-value")
    })

    it("should handle errors in with() method gracefully", () => {
        const market = createMarket()

        const workingSupplier = market.offer("working").asProduct({
            factory: () => "working-value"
        })

        const failingSupplier = market.offer("failing").asProduct({
            factory: () => {
                throw new Error("Supplier failed")
                return
            }
        })

        const combinedSupplier = workingSupplier.with(failingSupplier)
        const result = combinedSupplier.assemble({})

        expect(result.unpack()).toBe("working-value")

        expect(() => {
            result.supplies(failingSupplier)
        }).toThrow("Supplier failed")
    })
})
