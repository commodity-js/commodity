import { register, type $ } from "scarcity";
import Level4Agent from "./level-4";

// Level 3 component - renders Level 4
const Level3Agent = register("level-3").asAgent({
  team: [Level4Agent],
  factory: ($: $<[typeof Level4Agent]>) => {
    const Level4Component = $(Level4Agent.id);

    return (
      <div className="border-2 border-blue-500 p-4 rounded-lg bg-blue-50">
        <h3 className="text-xl font-semibold text-blue-800 mb-4">
          Level 3 Component
        </h3>
        <p className="text-blue-700 mb-4 text-sm">
          This component renders Level 4, which displays the config information.
        </p>

        {Level4Component}
      </div>
    );
  }
});

export default Level3Agent;
