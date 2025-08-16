import { describe, it, expect, vi, beforeEach } from "vitest"
import { register, type $, index } from "#index"

describe("supplier", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("Resource Registration", () => {
        it("should register a resource and return it when supplied", () => {
            const TestResource = register("test-resource").asResource<string>()

            const testValue = "test-value"
            const result = TestResource.put(testValue)

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

            const stringResult = StringResource.put("hello")
            const numberResult = NumberResource.put(42)
            const objectResult = ObjectResource.put({ name: "test" })

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
                team: [Dependency1, Dependency2],
                factory: ($: $<[typeof Dependency1, typeof Dependency2]>) => {
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

        it("should allow supply() to be called without arguments if no supplies are needed", () => {
            const NoSupplyService = register("no-supply").asService({
                factory: () => "ok"
            })
            const result = NoSupplyService.supply({})
            expect(result.value).toBe("ok")
        })
    })

    describe("Composition Root via .hire()", () => {
        it("should merge hired team with default team, giving precedence to the hired team", () => {
            const DefaultDep = register("dep").asService({
                factory: () => "default-result"
            })
            const HiredDep = register("dep").asService({
                factory: () => "hired-result"
            })
            const AnotherDep = register("another").asService({
                factory: () => "another-result"
            })

            const TestService = register("test-service").asService({
                team: [DefaultDep, AnotherDep],
                factory: ($: $<[typeof DefaultDep, typeof AnotherDep]>) => ({
                    dep: $(DefaultDep.id),
                    another: $(AnotherDep.id)
                })
            })

            // Hire HiredDep, which should override DefaultDep
            const result = TestService.hire(HiredDep).supply({})

            expect(result.value).toEqual({
                dep: "hired-result", // The hired dependency should win
                another: "another-result" // The default dependency should be preserved
            })
        })

        it("should not modify the original service when hire is called", () => {
            const DefaultDep = register("dep").asService({
                factory: () => "default"
            })
            const HiredDep = register("dep").asService({
                factory: () => "hired"
            })
            const TestService = register("test-service").asService({
                team: [DefaultDep],
                factory: ($: $<[typeof DefaultDep]>) => $(DefaultDep.id)
            })

            // Calling hire should be non-mutating
            TestService.hire(HiredDep).supply({})

            const originalResult = TestService.supply({})
            expect(originalResult.value).toBe("default")
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
                team: [Service1, Service2],
                factory: ($: $<[typeof Service1, typeof Service2]>) => {
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
                team: [Service],
                factory: ($: $<[typeof Service]>) => {
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
                index(ServiceResource.put("initial-service-value"))
            )

            // The initial supply should be respected and not overridden by the service
            // This tests the hasOwnProperty check in the hire function
            // The service should come from the initial supplies, not from the service
            expect(result.value.service).toBe("initial-service-value")
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
                team: [TestService],
                factory: ($: $<[typeof TestService]>) => {
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
                team: [Level1Service],
                factory: ($: $<[typeof Level1Service]>) => {
                    const level1 = $(Level1Service.id)
                    return level1 + "-processed"
                }
            })

            const Level3Service = register("level3").asService({
                team: [Level1Service, Level2Service],
                factory: (
                    $: $<[typeof Level1Service, typeof Level2Service]>
                ) => {
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
            // Create a configurable service that uses supplies from its context
            const ConfigurableService = register("configurable").asService({
                factory: ($: $<[typeof ConfigResource]>) => {
                    // This service uses the "config" value from its supplies
                    return $(ConfigResource.id) || "default-result"
                }
            })

            // Create a context-switching service that uses the configurable service
            const ContextSwitchingService = register(
                "context-switcher"
            ).asService({
                team: [ConfigurableService],
                factory: ($: $<[typeof ConfigurableService]>) => {
                    // Use the old context (from the parent service's supplies)
                    const configurableService = $[ConfigurableService.id]

                    const oldContextResult = configurableService.resupply(
                        index(ConfigResource.put("old-context-value"))
                    )

                    // Use a new context with different supplies
                    const newContextResult = configurableService.resupply(
                        index(ConfigResource.put("new-context-value"))
                    )

                    return {
                        oldContext: oldContextResult.value,
                        newContext: newContextResult.value,
                        contextsAreDifferent:
                            oldContextResult.value !== newContextResult.value
                    }
                }
            })

            const result = ContextSwitchingService.supply(
                index(ConfigResource.put("initial-context-value"))
            )

            // The contexts should be different because they use different supplies
            expect(result.value).toEqual({
                oldContext: "old-context-value",
                newContext: "new-context-value",
                contextsAreDifferent: true
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
                team: [Service1, Service2],
                factory: ($: $<[typeof Service1, typeof Service2]>) => {
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
                team: [PreloadService, NormalService, NoPreloadService],
                factory: (
                    $: $<
                        [
                            typeof PreloadService,
                            typeof NormalService,
                            typeof NoPreloadService
                        ]
                    >
                ) => {
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

        //TODO: Weird case, maybe unnecessary - consider removing
        it("should not preload services that are already supplied", async () => {
            const preloadFactoryMock = vi
                .fn()
                .mockReturnValue("preloaded-result")

            const PreloadService = register("preload-service").asService({
                factory: preloadFactoryMock,
                preload: true
            })

            const PreloadResource =
                register("preload-service").asResource<string>()

            const MainService = register("main-service").asService({
                team: [PreloadService],
                factory: ($: $<[typeof PreloadService]>) => {
                    return "main-result"
                }
            })

            // Supply the same ID as a resource instead of using the service
            const result = MainService.supply(
                index(PreloadResource.put("supplied-value"))
            )

            // Wait a bit for any potential preloading
            await new Promise((resolve) => setTimeout(resolve, 10))

            // PreloadService factory should not have been called because it was supplied as a resource
            expect(preloadFactoryMock).toHaveBeenCalledTimes(0)

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
                team: [ErrorService],
                factory: ($: $<[typeof ErrorService]>) => {
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
                team: [ErrorService],
                factory: ($: $<[typeof ErrorService]>) => {
                    // Try to access the failed service
                    return $(ErrorService.id)
                }
            })

            // Wait a bit for preloading to complete
            await new Promise((resolve) => setTimeout(resolve, 10))

            // Accessing the service should still throw the error
            expect(() => MainService.supply({})).toThrow("Service error")
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
                team: [Level1Service],
                factory: ($: $<[typeof Level1Service]>) => {
                    level2Mock()
                    return $(Level1Service.id) + "-processed"
                },
                preload: false // This will not be preloaded
            })

            const Level3Service = register("level3").asService({
                team: [Level1Service, Level2Service],
                factory: (
                    $: $<[typeof Level1Service, typeof Level2Service]>
                ) => {
                    level3Mock()
                    return {
                        level1: $(Level1Service.id),
                        level2: $(Level2Service.id)
                    }
                }
                // preload defaults to false
            })

            const MainService = register("main").asService({
                team: [Level1Service, Level2Service, Level3Service],
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

        it("should respect preload flag in hired services", async () => {
            const originalMock = vi.fn().mockReturnValue("original-result")
            const hiredMock = vi.fn().mockReturnValue("hired-result")

            const OriginalService = register("service").asService({
                factory: originalMock,
                preload: false
            })

            const HiredService = register("service").asService({
                factory: hiredMock,
                preload: true // This hired service should be preloaded
            })

            const MainService = register("main").asService({
                team: [OriginalService],
                factory: () => "main-result"
            })

            // Hire the preloaded service
            const result = MainService.hire(HiredService).supply({})

            // Wait a bit for preloading to complete
            await new Promise((resolve) => setTimeout(resolve, 10))

            // HiredService should have been preloaded, OriginalService should not
            expect(hiredMock).toHaveBeenCalledTimes(1)
            expect(originalMock).toHaveBeenCalledTimes(0)

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

            const result = ComplexResource.put(complexValue)

            expect(result.value).toEqual(complexValue)
        })
    })
})
