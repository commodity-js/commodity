import { describe, it, expect, vi, beforeEach } from "vitest"
import { index, narrow, register } from "#index"

describe("supplier", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("Resource Registration", () => {
        it("should register a resource and return it when supplied", () => {
            const TestResource = register("test-resource").asResource<string>()

            const testValue = "test-value"
            const result = TestResource.of(testValue)

            expect(result.value).toBe(testValue)
            expect(result.id).toBe("test-resource")
            expect(TestResource.id).toBe("test-resource")
            expect(TestResource.isResource).toBe(true)
        })

        it("should handle different resource types correctly", () => {
            const StringResource =
                register("string-resource").asResource<string>()
            const NumberResource =
                register("number-resource").asResource<number>()
            const ObjectResource = register("object-resource").asResource<{
                name: string
            }>()

            const stringResult = StringResource.of("hello")
            const numberResult = NumberResource.of(42)
            const objectResult = ObjectResource.of({ name: "test" })

            expect(stringResult.value).toBe("hello")
            expect(numberResult.value).toBe(42)
            expect(objectResult.value).toEqual({ name: "test" })
        })
    })

    describe("Service Registration", () => {
        it("should register a service with no team dependencies", () => {
            const TestService = register("test-service").asService({
                factory: () => "service-result"
            })

            const result = TestService.supply({})

            expect(result.value).toBe("service-result")
            expect(TestService.id).toBe("test-service")
            expect(TestService.isService).toBe(true)
        })

        it("should register a service with team dependencies", () => {
            const Dependency1 = register("dep1").asService({
                factory: () => "dep1-result"
            })

            const Dependency2 = register("dep2").asService({
                factory: () => "dep2-result"
            })

            const TestService = register("test-service").asService({
                deps: [Dependency1, Dependency2],
                factory: ($) => {
                    const dep1 = $(Dependency1.id)
                    const dep2 = $(Dependency2.id)
                    return {
                        dep1Value: dep1,
                        dep2Value: dep2,
                        computed: dep1 + " + " + dep2
                    }
                }
            })

            const result = TestService.supply({})

            expect(result.value).toEqual({
                dep1Value: "dep1-result",
                dep2Value: "dep2-result",
                computed: "dep1-result + dep2-result"
            })
        })
    })

    describe("Team Hiring and Supply Chain", () => {
        it("should hire services and provide their services", () => {
            const Service1 = register("service1").asService({
                factory: () => "service1-result"
            })

            const Service2 = register("service2").asService({
                factory: () => "service2-result"
            })

            const MainService = register("main-service").asService({
                deps: [Service1, Service2],
                factory: ($) => {
                    const service1 = $(Service1.id)
                    const service2 = $(Service2.id)
                    return {
                        service1: service1,
                        service2: service2,
                        combined: service1 + " + " + service2
                    }
                }
            })

            const result = MainService.supply({})

            expect(result.value).toEqual({
                service1: "service1-result",
                service2: "service2-result",
                combined: "service1-result + service2-result"
            })
        })

        it("should respect initial supplies and not override them", () => {
            const Service = register("service").asService({
                factory: () => "service-result"
            })

            const MainService = register("main").asService({
                deps: [Service],
                factory: ($) => {
                    // When the service is not in supplies (due to hasOwnProperty check),
                    // we should use the initial supply directly
                    const service = $(Service.id)
                    return {
                        service: service || $("service") || "fallback"
                    }
                }
            })

            // Test that initial supplies with the same ID as an service are not overridden
            const ServiceResource = register("service").asResource<string>()

            const result = MainService.supply(
                index(ServiceResource.of("initial-service-value"))
            )

            // The initial supply should be respected and not overridden by the service
            // This tests the hasOwnProperty check in the hire function
            // The service should come from the initial supplies, not from the service
            expect(result.value.service).toBe("initial-service-value")
        })

        it("should support Service.of(value) and $[Service.id].of(value) for creating service instances", () => {
            const ConfigService = register("config").asService({
                factory: () => ({ env: "development", debug: true })
            })

            const LoggerService = register("logger").asService({
                factory: () => ({ level: "info", prefix: "APP" })
            })

            const MainService = register("main").asService({
                deps: [ConfigService, LoggerService],
                factory: ($) => {
                    // Test direct service.of() call
                    const configInstance = ConfigService.of({
                        env: "production",
                        debug: false
                    })

                    // Test accessing service through supplies and calling .of()
                    const loggerInstance = $[LoggerService.id].of({
                        level: "debug",
                        prefix: "TEST"
                    })

                    return {
                        config: configInstance.value,
                        logger: loggerInstance.value,
                        // Also test accessing the original services
                        originalConfig: $[ConfigService.id].value,
                        originalLogger: $[LoggerService.id].value
                    }
                }
            })

            const result = MainService.supply({})

            expect(result.value.config).toEqual({
                env: "production",
                debug: false
            })
            expect(result.value.logger).toEqual({
                level: "debug",
                prefix: "TEST"
            })
            expect(result.value.originalConfig).toEqual({
                env: "development",
                debug: true
            })
            expect(result.value.originalLogger).toEqual({
                level: "info",
                prefix: "APP"
            })

            // Verify that .of() creates new instances with new values
            expect(result.value.config).not.toBe(result.value.originalConfig)
            expect(result.value.logger).not.toBe(result.value.originalLogger)
        })
    })

    describe("Memoization and Lazy Evaluation", () => {
        it("should create separate memoization contexts for different supply calls", () => {
            const factoryMock = vi.fn().mockReturnValue("result")

            const TestService = register("service").asService({
                factory: factoryMock
            })

            const service = TestService.supply({})

            // First access should call the factory
            expect(service.value).toBe("result")
            expect(factoryMock).toHaveBeenCalledTimes(1)

            // The memoization works within the same supply context
            // Each call to supply() creates a new context, so the factory is called again
            const secondAccess = TestService.supply({})
            expect(secondAccess.value).toBe("result")
            // Factory is called again for the new supply context
            expect(factoryMock).toHaveBeenCalledTimes(2)
        })

        it("should memoize service calls when accessed multiple times within the same supply context", () => {
            const factoryMock = vi.fn().mockReturnValue("memoized-result")

            const TestService = register("memoized-service").asService({
                factory: factoryMock
            })

            // Create a team that uses the TestService
            const TeamService = register("team-service").asService({
                deps: [TestService],
                factory: ($) => {
                    // Access the TestService multiple times within the same supply context
                    const firstAccess = $(TestService.id)
                    const secondAccess = $(TestService.id)
                    const thirdAccess = $(TestService.id)

                    return {
                        first: firstAccess,
                        second: secondAccess,
                        third: thirdAccess,
                        allSame:
                            firstAccess === secondAccess &&
                            secondAccess === thirdAccess
                    }
                }
            })

            const result = TeamService.supply({})

            expect(result.value).toEqual({
                first: "memoized-result",
                second: "memoized-result",
                third: "memoized-result",
                allSame: true
            })

            // Factory should only be called once due to memoization within the same supply context
            expect(factoryMock).toHaveBeenCalledTimes(1)
        })

        it("should handle complex nested service dependencies with memoization", () => {
            const factory1Mock = vi.fn().mockReturnValue("level1-result")

            const Level1Service = register("level1").asService({
                factory: factory1Mock
            })

            const Level2Service = register("level2").asService({
                deps: [Level1Service],
                factory: ($) => {
                    const level1 = $(Level1Service.id)
                    return level1 + "-processed"
                }
            })

            const Level3Service = register("level3").asService({
                deps: [Level1Service, Level2Service],
                factory: ($) => {
                    const level1 = $(Level1Service.id)
                    const level2 = $(Level2Service.id)
                    return {
                        level1: level1,
                        level2: level2,
                        combined: level1 + " + " + level2
                    }
                }
            })

            const result = Level3Service.supply({})

            expect(result.value).toEqual({
                level1: "level1-result",
                level2: "level1-result-processed",
                combined: "level1-result + level1-result-processed"
            })

            // Each factory should only be called once due to memoization within the same context
            expect(factory1Mock).toHaveBeenCalledTimes(1)
        })

        it("should enable context switching by calling supply on services in supplies", () => {
            const ConfigResource = register("config").asResource<string>()
            const NameResource = register("name").asResource<string>()
            const CountResource = register("count").asResource<number>()

            // Create a configurable service that uses multiple supplies from its context
            const ConfigurableService = register("configurable").asService({
                deps: [ConfigResource, NameResource, CountResource],
                factory: ($) => {
                    // This service uses multiple values from its supplies
                    return {
                        config: $(ConfigResource.id) || "default-config",
                        name: $(NameResource.id) || "default-name",
                        count: $(CountResource.id) || 0
                    }
                }
            })

            // Create a context-switching service that uses the configurable service
            const ContextSwitchingService = register(
                "context-switcher"
            ).asService({
                deps: [ConfigurableService],
                factory: ($) => {
                    const configurableService = $[ConfigurableService.id]

                    // Initial context with all supplies
                    const initialResult = configurableService.resupply(
                        index(
                            ConfigResource.of("initial-config"),
                            NameResource.of("initial-name"),
                            CountResource.of(42)
                        )
                    )

                    // Partial resupply - only override config
                    const partialConfigResult = configurableService.resupply(
                        index(ConfigResource.of("partial-config-override"))
                    )

                    // Partial resupply - only override name
                    const partialNameResult = configurableService.resupply(
                        index(NameResource.of("partial-name-override"))
                    )

                    // Partial resupply - override multiple values
                    const partialMultipleResult = configurableService.resupply(
                        index(
                            ConfigResource.of("multiple-config-override"),
                            CountResource.of(100)
                        )
                    )

                    // Full resupply with all new values
                    const fullResupplyResult = configurableService.resupply(
                        index(
                            ConfigResource.of("new-config"),
                            NameResource.of("new-name"),
                            CountResource.of(999)
                        )
                    )

                    return {
                        initial: initialResult.value,
                        partialConfig: partialConfigResult.value,
                        partialName: partialNameResult.value,
                        partialMultiple: partialMultipleResult.value,
                        fullResupply: fullResupplyResult.value
                    }
                }
            })

            const result = ContextSwitchingService.supply(
                index(
                    ConfigResource.of("base-config"),
                    NameResource.of("base-name"),
                    CountResource.of(1)
                )
            )

            // Test that partial resupply works correctly
            expect(result.value.initial).toEqual({
                config: "initial-config",
                name: "initial-name",
                count: 42
            })

            // Each resupply starts from the base supplies and applies overrides
            expect(result.value.partialConfig).toEqual({
                config: "partial-config-override",
                name: "base-name", // From base supplies
                count: 1 // From base supplies
            })

            expect(result.value.partialName).toEqual({
                config: "base-config", // From base supplies
                name: "partial-name-override",
                count: 1 // From base supplies
            })

            expect(result.value.partialMultiple).toEqual({
                config: "multiple-config-override",
                name: "base-name", // From base supplies
                count: 100
            })

            expect(result.value.fullResupply).toEqual({
                config: "new-config",
                name: "new-name",
                count: 999
            })
        })
    })

    describe("Callable Object API", () => {
        it("should support both property access and function calls for dependencies", () => {
            const Service1 = register("service1").asService({
                factory: () => "service1-result"
            })

            const Service2 = register("service2").asService({
                factory: () => "service2-result"
            })

            const TestService = register("test-service").asService({
                deps: [Service1, Service2],
                factory: ($) => {
                    const service1Prop = $[Service1.id]
                    const service2Prop = $[Service2.id]

                    const service1Func = $(Service1.id)
                    const service2Func = $(Service2.id)

                    return {
                        propAccess: {
                            service1: service1Prop.value,
                            service2: service2Prop.value
                        },
                        funcAccess: {
                            service1: service1Func,
                            service2: service2Func
                        },
                        bothEqual:
                            service1Prop.value === service1Func &&
                            service2Prop.value === service2Func
                    }
                }
            })

            const result = TestService.supply({})

            expect(result.value.propAccess).toEqual({
                service1: "service1-result",
                service2: "service2-result"
            })
            expect(result.value.funcAccess).toEqual({
                service1: "service1-result",
                service2: "service2-result"
            })
            expect(result.value.bothEqual).toBe(true)
        })
    })

    describe("Preload Feature", () => {
        it("should preload services with preload: true", async () => {
            const preloadFactoryMock = vi
                .fn()
                .mockReturnValue("preloaded-result")
            const normalFactoryMock = vi.fn().mockReturnValue("normal-result")

            const PreloadService = register("preload-service").asService({
                factory: preloadFactoryMock,
                preload: true
            })

            const NormalService = register("normal-service").asService({
                factory: normalFactoryMock,
                preload: false // explicit false
            })

            const NoPreloadService = register("no-preload-service").asService({
                factory: vi.fn().mockReturnValue("no-preload-result")
                // preload defaults to false
            })

            const MainService = register("main-service").asService({
                deps: [PreloadService, NormalService, NoPreloadService],
                factory: ($) => {
                    // Don't access any dependencies yet
                    return "main-result"
                }
            })

            const result = MainService.supply({})

            // Wait a bit for preloading to complete
            await new Promise((resolve) => setTimeout(resolve, 10))

            // PreloadService should have been called due to preload: true
            expect(preloadFactoryMock).toHaveBeenCalledTimes(1)

            // NormalService and NoPreloadService should not have been called yet
            expect(normalFactoryMock).toHaveBeenCalledTimes(0)

            expect(result.value).toBe("main-result")
        })

        it("should handle preload errors gracefully without breaking the supply chain", async () => {
            const errorFactoryMock = vi.fn().mockImplementation(() => {
                throw new Error("Preload error")
            })

            const ErrorService = register("error-service").asService({
                factory: errorFactoryMock,
                preload: true
            })

            const MainService = register("main-service").asService({
                deps: [ErrorService],
                factory: ($) => {
                    // Don't access ErrorService yet
                    return "main-result"
                }
            })

            // This should not throw even though ErrorService will fail during preload
            const result = MainService.supply({})

            // Wait a bit for preloading to complete
            await new Promise((resolve) => setTimeout(resolve, 10))

            expect(result.value).toBe("main-result")

            // ErrorService factory should have been called during preload
            expect(errorFactoryMock).toHaveBeenCalledTimes(1)
        })

        it("should still throw error when accessing a failed preloaded service", async () => {
            const errorFactoryMock = vi.fn().mockImplementation(() => {
                throw new Error("Service error")
            })

            const ErrorService = register("error-service").asService({
                factory: errorFactoryMock,
                preload: true
            })

            const MainService = register("main-service").asService({
                deps: [ErrorService],
                factory: ($) => {
                    // Try to access the failed service
                    return $(ErrorService.id)
                }
            })

            // Wait a bit for preloading to complete
            await new Promise((resolve) => setTimeout(resolve, 10))

            // Accessing the service should still throw the error
            expect(() => MainService.supply({}).value).toThrow("Service error")
        })

        it("should work with complex dependency chains and selective preloading", async () => {
            const level1Mock = vi.fn().mockReturnValue("level1-result")
            const level2Mock = vi.fn().mockReturnValue("level2-result")
            const level3Mock = vi.fn().mockReturnValue("level3-result")

            const Level1Service = register("level1").asService({
                factory: level1Mock,
                preload: true // This will be preloaded
            })

            const Level2Service = register("level2").asService({
                deps: [Level1Service],
                factory: ($) => {
                    level2Mock()
                    return $(Level1Service.id) + "-processed"
                },
                preload: false // This will not be preloaded
            })

            const Level3Service = register("level3").asService({
                deps: [Level1Service, Level2Service],
                factory: ($) => {
                    level3Mock()
                    return {
                        level1: $(Level1Service.id),
                        level2: $(Level2Service.id)
                    }
                }
                // preload defaults to false
            })

            const MainService = register("main").asService({
                deps: [Level1Service, Level2Service, Level3Service],
                factory: () => {
                    // Don't access any dependencies yet
                    return "main-result"
                }
            })

            const result = MainService.supply({})

            // Wait a bit for preloading to complete
            await new Promise((resolve) => setTimeout(resolve, 10))

            // Only Level1Service should have been preloaded
            expect(level1Mock).toHaveBeenCalledTimes(1)
            expect(level2Mock).toHaveBeenCalledTimes(0)
            expect(level3Mock).toHaveBeenCalledTimes(0)

            expect(result.value).toBe("main-result")
        })
    })

    describe("Type Safety and Edge Cases", () => {
        it("should handle empty teams correctly", () => {
            const EmptyTeamService = register("empty-team").asService({
                factory: () => "empty-team-result"
            })

            const result = EmptyTeamService.supply({})
            expect(result.value).toBe("empty-team-result")
        })

        it("should handle services with no supplies parameter", () => {
            const NoSuppliesService = register("no-supplies").asService({
                factory: () => "no-supplies-result"
            })

            const result = NoSuppliesService.supply({})
            expect(result.value).toBe("no-supplies-result")
        })

        it("should handle values with complex object types", () => {
            interface ComplexType {
                id: string
                data: {
                    value: number
                    items: string[]
                }
                metadata?: Record<string, unknown>
            }

            const ComplexResource =
                register("complex-resource").asResource<ComplexType>()

            const complexValue: ComplexType = {
                id: "test-id",
                data: {
                    value: 42,
                    items: ["item1", "item2"]
                },
                metadata: {
                    created: "2024-01-01"
                }
            }

            const result = ComplexResource.of(complexValue)

            expect(result.value).toEqual(complexValue)
        })

        it("should demonstrate that preload: true silently ignores errors until service access", () => {
            // This test shows that preload: true doesn't change the fundamental behavior
            // - it just tries to warm up services in the background
            // - errors are still deferred until the service is actually accessed

            const ConfigResource = register("config").asResource<string>()

            // ServiceA needs ConfigResource
            const ServiceA = register("service-a").asService({
                deps: [ConfigResource],
                factory: ($) => {
                    const config = $(ConfigResource.id)
                    return `service-a-${config}`
                }
            })

            // ServiceB provides ServiceA in its team with preload: true
            // Even though ServiceA needs ConfigResource, the preloading won't fail immediately
            const ServiceB = register("service-b").asService({
                deps: [ServiceA],
                factory: () => {
                    return "service-b-result"
                },
                preload: true // This should try to preload ServiceA but silently ignore failures
            })

            // MainService provides ServiceB in its team
            const MainService = register("main").asService({
                deps: [ServiceB],
                factory: ($) => {
                    const serviceB = $(ServiceB.id)
                    return `main-${serviceB}`
                }
            })

            // This should NOT fail immediately due to preloading
            // The preloading happens in the background and silently ignores errors
            // @ts-expect-error - Expected: missing config dependency (but preloading silences it)
            const result = MainService.supply({})
            expect(result.value).toBe("main-service-b-result")

            // The key insight: preload: true doesn't change the fundamental behavior
            // It just tries to warm up services in the background, but errors are still
            // deferred until the service is actually accessed
        })

        it("should demonstrate the Narrow API behavior", () => {
            type User = { id: string; name: string; role: "user" | "admin" }
            type Session = { user: User; now: Date }

            // Session resource can hold any object of type Session
            const Session = register("session").asResource<Session>()

            // Admin dashboard requires admin session using the Narrow API
            const AdminDashboard = register("admin-dashboard").asService({
                deps: [narrow(Session)<{ user: { role: "admin" } }>()],
                factory: ($) => {
                    const session = $(Session.id)
                    // No runtime check needed - TypeScript ensures session.user.role === "admin"
                    return {
                        adminId: session.user.id,
                        adminName: session.user.name,
                        // This should work without type errors
                        isAdmin: session.user.role === "admin"
                    }
                }
            })

            // This should create a type error because role is "user" (not admin)
            const userSession = Session.of({
                user: { id: "user123", name: "Regular User", role: "user" },
                now: new Date()
            })

            // This should succeed because role is "admin"
            const adminSession = Session.of({
                user: { id: "admin456", name: "Admin User", role: "admin" },
                now: new Date()
            })

            // @ts-expect-error - Expected: missing logger dependency
            const fail = AdminDashboard.supply(index(userSession))
            const result = AdminDashboard.supply(index(adminSession))

            expect(result.value.adminId).toBe("admin456")
            expect(result.value.adminName).toBe("Admin User")
            expect(result.value.isAdmin).toBe(true)
        })
    })
})
