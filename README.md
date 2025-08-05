# scarcity

A powerful, type-inferred, and hyper-minimalistic library for server request (context) propagation and dependency injection (DI) using a novel **Supply Chain Architecture**.

## Features

- 🔧 **Type-safe dependency injection** with full TypeScript inference
- 📦 **Resource and Agent system** for flexible dependency management
- 🔄 **Automatic memoization** for performance optimization
- 🎯 **Composition root pattern** with `.hire()` for runtime dependency overrides
- 🚀 **Zero runtime overhead** - pure functions and objects
- 📝 **Minimalistic API** - learn it in minutes

## Installation

```bash
npm install scarcity
```

## Quick Start

### Creating Resources

Resources are simple values that can be injected into agents:

```typescript
import { register } from "scarcity";

// Create a resource registration
const ConfigResource = register("config").asResource<{
  apiUrl: string;
  timeout: number;
}>();

// Supply the resource with a value
const config = ConfigResource.supply({
  apiUrl: "https://api.example.com",
  timeout: 5000
});

console.log(config.value.apiUrl); // "https://api.example.com"
console.log(config.id); // "config"
```

### Creating Agents

Agents are factory functions that can depend on other resources or agents:

```typescript
import { register, type $ } from "scarcity";

// Simple agent with no dependencies
const LoggerAgent = register("logger").asAgent({
  factory: () => ({
    log: (message: string) => console.log(`[LOG] ${message}`)
  })
});

// Agent with dependencies
const ApiClient = register("api-client").asAgent({
  team: [ConfigResource, LoggerAgent],
  factory: ($: $<[typeof ConfigResource, typeof LoggerAgent]>) => {
    const config = $(ConfigResource.id);
    const logger = $(LoggerAgent.id);

    return {
      async get(path: string) {
        logger.log(`GET ${config.apiUrl}${path}`);
        // ... implementation
      }
    };
  }
});

// Agent with eager preloading for performance
const DatabaseAgent = register("database").asAgent({
  factory: () => createDatabaseConnection(),
  preload: true // This agent will be eagerly initialized
});
```

### Using the Supply Chain

```typescript
// Supply dependencies and get the result
const apiClient = ApiClient.supply(
  parcel(
    ConfigResource.supply({
      apiUrl: "https://api.example.com",
      timeout: 5000
    })
  )
);

// Use the result
await apiClient.value.get("/users");
```

## Advanced Usage

### Hiring Agents (Composition Root)

The `.hire()` method allows you to override dependencies at runtime:

```typescript
// Create a test logger that doesn't actually log
const TestLogger = register("logger").asAgent({
  factory: () => ({
    log: (message: string) => {
      /* silent */
    }
  })
});

// Override the logger for testing
const testApiClient = ApiClient.hire(TestLogger).supply(
  parcel(ConfigResource.supply({ apiUrl: "http://localhost", timeout: 1000 }))
);
```

### Memoization and Performance

Agents are automatically memoized within the same supply context:

```typescript
const ExpensiveAgent = register("expensive").asAgent({
  factory: () => {
    console.log("This will only run once per supply context");
    return performExpensiveComputation();
  }
});

const ConsumerAgent = register("consumer").asAgent({
  team: [ExpensiveAgent],
  factory: ($: $<[typeof ExpensiveAgent]>) => {
    const result1 = $(ExpensiveAgent.id); // Computed
    const result2 = $(ExpensiveAgent.id); // Memoized
    const result3 = $(ExpensiveAgent.id); // Memoized

    return { result1, result2, result3 }; // All identical
  }
});
```

### Eager Preloading

For performance-critical scenarios, you can enable eager preloading:

```typescript
// These agents will be initialized immediately when supply() is called
const DatabaseAgent = register("database").asAgent({
  factory: () => createDatabaseConnection(),
  preload: true // Eager initialization
});

const CacheAgent = register("cache").asAgent({
  factory: () => createCacheConnection(),
  preload: true // Eager initialization
});

const ApiAgent = register("api").asAgent({
  team: [DatabaseAgent, CacheAgent],
  factory: ($) => {
    // DatabaseAgent and CacheAgent are already initialized
    return createApiService($(DatabaseAgent.id), $(CacheAgent.id));
  }
});

// Both DatabaseAgent and CacheAgent start initializing immediately
const api = ApiAgent.supply();
```

### Context Switching

Use `.resupply()` to switch contexts with different dependencies:

```typescript
const ContextAgent = register("context").asAgent({
  factory: ($: $<[typeof ConfigResource]>) => {
    return $(ConfigResource.id);
  }
});

const MainAgent = register("main").asAgent({
  team: [ContextAgent],
  factory: ($: $<[typeof ContextAgent]>) => {
    const contextAgent = $[ContextAgent.id];

    // Use different configs in different contexts
    const prodResult = contextAgent.resupply(
      parcel(
        ConfigResource.supply({ apiUrl: "https://prod.api.com", timeout: 5000 })
      )
    );

    const devResult = contextAgent.resupply(
      parcel(
        ConfigResource.supply({
          apiUrl: "http://localhost:3000",
          timeout: 1000
        })
      )
    );

    return { prod: prodResult.value, dev: devResult.value };
  }
});
```

### Callable Object API

The `$` function supports both function calls and property access:

```typescript
const MyAgent = register("my-agent").asAgent({
  team: [SomeService],
  factory: ($: $<[typeof SomeService]>) => {
    // Both of these work:
    const service1 = $(SomeService.id); // Function call
    const service2 = $[SomeService.id].value; // Property access

    return { service1, service2 };
  }
});
```

## API Reference

### `register(id: string)`

Creates a registration that can be turned into either a resource or agent.

### `.asResource<T>()`

Creates a resource registration that can supply values of type `T`.

### `.asAgent({ factory, team? })`

Creates an agent registration with:

- `factory`: Function that creates the agent's value
- `team`: Optional array of dependencies

### `.supply(supplies?)`

Executes the supply chain and returns a resource with the computed value.

### `.hire(...agents)`

Creates a new agent with additional or overridden dependencies.

### `parcel(...resources)`

Helper function to bundle multiple resources for supply.

## TypeScript Support

Scarcity is built with TypeScript-first design:

- Full type inference for dependencies
- Compile-time dependency validation
- Zero runtime type checking overhead
- IntelliSense support for all APIs

## Testing

```bash
npm test
```

## 🌐 Website & Examples

Visit our beautiful website with interactive examples:

**[scarcity-js.github.io/scarcity](https://scarcity-js.github.io/scarcity)**

The website features:

- 📖 Complete documentation and API reference
- 🚀 Live demo with 4-level deep component hierarchy
- 🎨 Beautiful design with Scarcity's signature orange gradient
- 📱 Responsive design for all devices

## License

MIT © [Scarcity.js](https://github.com/scarcity-js/scarcity)

## Contributing

Issues and pull requests welcome on [GitHub](https://github.com/scarcity-js/scarcity).
