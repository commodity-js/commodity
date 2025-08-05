import { describe, it, expect, vi, beforeEach } from "vitest";
import { register, type $, parcel } from "#index";

describe("scarcity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Resource Registration", () => {
    it("should register a resource and return it when supplied", () => {
      const TestResource = register("test-resource").asResource<string>();

      const testValue = "test-value";
      const result = TestResource.supply(testValue);

      expect(result.value).toBe(testValue);
      expect(result.id).toBe("test-resource");
      expect(TestResource.id).toBe("test-resource");
      expect(TestResource.isResource).toBe(true);
    });

    it("should handle different resource types correctly", () => {
      const StringResource = register("string-resource").asResource<string>();
      const NumberResource = register("number-resource").asResource<number>();
      const ObjectResource = register("object-resource").asResource<{
        name: string;
      }>();

      const stringResult = StringResource.supply("hello");
      const numberResult = NumberResource.supply(42);
      const objectResult = ObjectResource.supply({ name: "test" });

      expect(stringResult.value).toBe("hello");
      expect(numberResult.value).toBe(42);
      expect(objectResult.value).toEqual({ name: "test" });
    });
  });

  describe("Agent Registration", () => {
    it("should register an agent with no team dependencies", () => {
      const TestAgent = register("test-agent").asAgent({
        factory: () => "agent-result"
      });

      const result = TestAgent.supply({});

      expect(result.value).toBe("agent-result");
      expect(TestAgent.id).toBe("test-agent");
      expect(TestAgent.isAgent).toBe(true);
    });

    it("should register an agent with team dependencies", () => {
      const Dependency1 = register("dep1").asAgent({
        factory: () => "dep1-result"
      });

      const Dependency2 = register("dep2").asAgent({
        factory: () => "dep2-result"
      });

      const TestAgent = register("test-agent").asAgent({
        team: [Dependency1, Dependency2],
        factory: ($: $<[typeof Dependency1, typeof Dependency2]>) => {
          const dep1 = $(Dependency1.id);
          const dep2 = $(Dependency2.id);
          return {
            dep1Value: dep1,
            dep2Value: dep2,
            computed: dep1 + " + " + dep2
          };
        }
      });

      const result = TestAgent.supply();

      expect(result.value).toEqual({
        dep1Value: "dep1-result",
        dep2Value: "dep2-result",
        computed: "dep1-result + dep2-result"
      });
    });

    it("should allow supply() to be called without arguments if no supplies are needed", () => {
      const NoSupplyAgent = register("no-supply").asAgent({
        factory: () => "ok"
      });
      const result = NoSupplyAgent.supply();
      expect(result.value).toBe("ok");
    });
  });

  describe("Composition Root via .hire()", () => {
    it("should merge hired team with default team, giving precedence to the hired team", () => {
      const DefaultDep = register("dep").asAgent({
        factory: () => "default-result"
      });
      const HiredDep = register("dep").asAgent({
        factory: () => "hired-result"
      });
      const AnotherDep = register("another").asAgent({
        factory: () => "another-result"
      });

      const TestAgent = register("test-agent").asAgent({
        team: [DefaultDep, AnotherDep],
        factory: ($: $<[typeof DefaultDep, typeof AnotherDep]>) => ({
          dep: $(DefaultDep.id),
          another: $(AnotherDep.id)
        })
      });

      // Hire HiredDep, which should override DefaultDep
      const result = TestAgent.hire(HiredDep).supply();

      expect(result.value).toEqual({
        dep: "hired-result", // The hired dependency should win
        another: "another-result" // The default dependency should be preserved
      });
    });

    it("should not modify the original agent when hire is called", () => {
      const DefaultDep = register("dep").asAgent({
        factory: () => "default"
      });
      const HiredDep = register("dep").asAgent({ factory: () => "hired" });
      const TestAgent = register("test-agent").asAgent({
        team: [DefaultDep],
        factory: ($: $<[typeof DefaultDep]>) => $(DefaultDep.id)
      });

      // Calling hire should be non-mutating
      TestAgent.hire(HiredDep).supply();

      const originalResult = TestAgent.supply();
      expect(originalResult.value).toBe("default");
    });
  });

  describe("Team Hiring and Supply Chain", () => {
    it("should hire agents and provide their services", () => {
      const Service1 = register("service1").asAgent({
        factory: () => "service1-result"
      });

      const Service2 = register("service2").asAgent({
        factory: () => "service2-result"
      });

      const MainAgent = register("main-agent").asAgent({
        team: [Service1, Service2],
        factory: ($: $<[typeof Service1, typeof Service2]>) => {
          const service1 = $(Service1.id);
          const service2 = $(Service2.id);
          return {
            service1: service1,
            service2: service2,
            combined: service1 + " + " + service2
          };
        }
      });

      const result = MainAgent.supply();

      expect(result.value).toEqual({
        service1: "service1-result",
        service2: "service2-result",
        combined: "service1-result + service2-result"
      });
    });

    it("should respect initial supplies and not override them", () => {
      const ServiceAgent = register("service").asAgent({
        factory: () => "service-result"
      });

      const MainAgent = register("main").asAgent({
        team: [ServiceAgent],
        factory: ($: $<[typeof ServiceAgent]>) => {
          // When the agent is not in supplies (due to hasOwnProperty check),
          // we should use the initial supply directly
          const serviceAgent = $(ServiceAgent.id);
          return {
            service: serviceAgent || $("service") || "fallback"
          };
        }
      });

      // Test that initial supplies with the same ID as an agent are not overridden
      const ServiceResource = register("service").asResource<string>();

      const result = MainAgent.supply(
        parcel(ServiceResource.supply("initial-service-value"))
      );

      // The initial supply should be respected and not overridden by the agent
      // This tests the hasOwnProperty check in the hire function
      // The service should come from the initial supplies, not from the agent
      expect(result.value.service).toBe("initial-service-value");
    });
  });

  describe("Memoization and Lazy Evaluation", () => {
    it("should create separate memoization contexts for different supply calls", () => {
      const factoryMock = vi.fn().mockReturnValue("result");

      const TestAgent = register("agent").asAgent({
        factory: factoryMock
      });

      const agent = TestAgent.supply();

      // First access should call the factory
      expect(agent.value).toBe("result");
      expect(factoryMock).toHaveBeenCalledTimes(1);

      // The memoization works within the same supply context
      // Each call to supply() creates a new context, so the factory is called again
      const secondAccess = TestAgent.supply();
      expect(secondAccess.value).toBe("result");
      // Factory is called again for the new supply context
      expect(factoryMock).toHaveBeenCalledTimes(2);
    });

    it("should memoize agent calls when accessed multiple times within the same supply context", () => {
      const factoryMock = vi.fn().mockReturnValue("memoized-result");

      const TestAgent = register("memoized-agent").asAgent({
        factory: factoryMock
      });

      // Create a team that uses the TestAgent
      const TeamAgent = register("team-agent").asAgent({
        team: [TestAgent],
        factory: ($: $<[typeof TestAgent]>) => {
          // Access the TestAgent multiple times within the same supply context
          const firstAccess = $(TestAgent.id);
          const secondAccess = $(TestAgent.id);
          const thirdAccess = $(TestAgent.id);

          return {
            first: firstAccess,
            second: secondAccess,
            third: thirdAccess,
            allSame:
              firstAccess === secondAccess && secondAccess === thirdAccess
          };
        }
      });

      const result = TeamAgent.supply();

      expect(result.value).toEqual({
        first: "memoized-result",
        second: "memoized-result",
        third: "memoized-result",
        allSame: true
      });

      // Factory should only be called once due to memoization within the same supply context
      expect(factoryMock).toHaveBeenCalledTimes(1);
    });

    it("should handle complex nested agent dependencies with memoization", () => {
      const factory1Mock = vi.fn().mockReturnValue("level1-result");

      const Level1Agent = register("level1").asAgent({
        factory: factory1Mock
      });

      const Level2Agent = register("level2").asAgent({
        team: [Level1Agent],
        factory: ($: $<[typeof Level1Agent]>) => {
          const level1 = $(Level1Agent.id);
          return level1 + "-processed";
        }
      });

      const Level3Agent = register("level3").asAgent({
        team: [Level1Agent, Level2Agent],
        factory: ($: $<[typeof Level1Agent, typeof Level2Agent]>) => {
          const level1 = $(Level1Agent.id);
          const level2 = $(Level2Agent.id);
          return {
            level1: level1,
            level2: level2,
            combined: level1 + " + " + level2
          };
        }
      });

      const result = Level3Agent.supply();

      expect(result.value).toEqual({
        level1: "level1-result",
        level2: "level1-result-processed",
        combined: "level1-result + level1-result-processed"
      });

      // Each factory should only be called once due to memoization within the same context
      expect(factory1Mock).toHaveBeenCalledTimes(1);
    });

    it("should enable context switching by calling supply on agents in supplies", () => {
      const ConfigResource = register("config").asResource<string>();
      // Create a configurable agent that uses supplies from its context
      const ConfigurableAgent = register("configurable").asAgent({
        factory: ($: $<[typeof ConfigResource]>) => {
          // This agent uses the "config" value from its supplies
          return $(ConfigResource.id) || "default-result";
        }
      });

      // Create a context-switching agent that uses the configurable agent
      const ContextSwitchingAgent = register("context-switcher").asAgent({
        team: [ConfigurableAgent],
        factory: ($: $<[typeof ConfigurableAgent]>) => {
          // Use the old context (from the parent agent's supplies)
          const configurableAgent = $[ConfigurableAgent.id];

          const oldContextResult = configurableAgent.resupply(
            parcel(ConfigResource.supply("old-context-value"))
          );

          // Use a new context with different supplies
          const newContextResult = configurableAgent.resupply(
            parcel(ConfigResource.supply("new-context-value"))
          );

          return {
            oldContext: oldContextResult.value,
            newContext: newContextResult.value,
            contextsAreDifferent:
              oldContextResult.value !== newContextResult.value
          };
        }
      });

      const result = ContextSwitchingAgent.supply(
        parcel(ConfigResource.supply("initial-context-value"))
      );

      // The contexts should be different because they use different supplies
      expect(result.value).toEqual({
        oldContext: "old-context-value",
        newContext: "new-context-value",
        contextsAreDifferent: true
      });
    });
  });

  describe("Callable Object API", () => {
    it("should support both property access and function calls for dependencies", () => {
      const Service1 = register("service1").asAgent({
        factory: () => "service1-result"
      });

      const Service2 = register("service2").asAgent({
        factory: () => "service2-result"
      });

      const TestAgent = register("test-agent").asAgent({
        team: [Service1, Service2],
        factory: ($: $<[typeof Service1, typeof Service2]>) => {
          const service1Prop = $[Service1.id];
          const service2Prop = $[Service2.id];

          const service1Func = $(Service1.id);
          const service2Func = $(Service2.id);

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
          };
        }
      });

      const result = TestAgent.supply();

      expect(result.value.propAccess).toEqual({
        service1: "service1-result",
        service2: "service2-result"
      });
      expect(result.value.funcAccess).toEqual({
        service1: "service1-result",
        service2: "service2-result"
      });
      expect(result.value.bothEqual).toBe(true);
    });
  });

  describe("Type Safety and Edge Cases", () => {
    it("should handle empty teams correctly", () => {
      const EmptyTeamAgent = register("empty-team").asAgent({
        factory: () => "empty-team-result"
      });

      const result = EmptyTeamAgent.supply();
      expect(result.value).toBe("empty-team-result");
    });

    it("should handle agents with no supplies parameter", () => {
      const NoSuppliesAgent = register("no-supplies").asAgent({
        factory: () => "no-supplies-result"
      });

      const result = NoSuppliesAgent.supply();
      expect(result.value).toBe("no-supplies-result");
    });

    it("should handle values with complex object types", () => {
      interface ComplexType {
        id: string;
        data: {
          value: number;
          items: string[];
        };
        metadata?: Record<string, unknown>;
      }

      const ComplexResource =
        register("complex-resource").asResource<ComplexType>();

      const complexValue: ComplexType = {
        id: "test-id",
        data: {
          value: 42,
          items: ["item1", "item2"]
        },
        metadata: {
          created: "2024-01-01"
        }
      };

      const result = ComplexResource.supply(complexValue);

      expect(result.value).toEqual(complexValue);
    });
  });
});
