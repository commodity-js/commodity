import { register, type $ } from "scarcity";
import Level2Agent from "./level-2";

// Level 1 component - renders Level 2
const Level1Agent = register("level-1").asAgent({
  team: [Level2Agent],
  factory: ($: $<[typeof Level2Agent]>) => {
    const Level2Component = $(Level2Agent.id);

    return (
      <div className="border-2 border-red-500 p-6 rounded-lg bg-red-50">
        <h1 className="text-3xl font-bold text-red-800 mb-4">
          Level 1 Component
        </h1>
        <p className="text-red-700 mb-6">
          Welcome to the Scarcity dependency injection example! This is the
          top-level component that starts our 4-level deep component hierarchy.
        </p>

        {Level2Component}
      </div>
    );
  }
});

export default Level1Agent;
