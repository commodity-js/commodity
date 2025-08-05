# Scarcity Examples

This Next.js application demonstrates the power of Scarcity's dependency injection system with a 4-level deep component hierarchy.

## What's Demonstrated

- **Component Hierarchy**: 4 nested React server components (Level 1 → Level 2 → Level 3 → Level 4)
- **Dependency Injection**: Each component is registered as a Scarcity agent
- **Resource Supply**: Configuration is supplied at the entrypoint and flows through the component tree
- **Type Safety**: Full TypeScript inference throughout the dependency chain

## Component Structure

```
Page (Entry point - supplies config)
  ↓
Level 1 Component (Red border)
  ↓
Level 2 Component (Green border)
  ↓
Level 3 Component (Blue border)
  ↓
Level 4 Component (Purple border - displays config)
```

## Running the Example

```bash
# From the monorepo root
pnpm install
pnpm run dev

# Or from this directory
pnpm run dev
```

The app will be available at http://localhost:3000

## Key Files

- `src/lib/config.ts` - Defines the config resource and default configuration
- `src/components/level-*.tsx` - The 4 nested components registered as Scarcity agents
- `src/app/page.tsx` - Entry point that supplies the config and renders the component tree

## How Scarcity Works Here

1. **Resource Registration**: Config is registered as a resource in `config.ts`
2. **Agent Registration**: Each component is registered as an agent with dependencies
3. **Supply Chain**: Config is supplied at the page level using `parcel()`
4. **Dependency Resolution**: Scarcity automatically resolves and injects dependencies down the component tree
5. **Type Safety**: TypeScript ensures type safety throughout the entire dependency chain
