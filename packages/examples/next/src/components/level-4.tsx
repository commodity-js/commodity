import { register, type $ } from "scarcity";
import ConfigRendererAgent from "./config-renderer";
import { ConfigResource } from "../lib/config";

// Level 4 component (deepest level) - displays config info using shared renderer
const Level4Agent = register("level-4").asAgent({
  team: [ConfigRendererAgent],
  factory: ($: $<[typeof ConfigRendererAgent, typeof ConfigResource]>) => {
    const config = $(ConfigResource.id);
    const ConfigRenderer = $(ConfigRendererAgent.id);

    return (
      <div className="border-2 border-purple-500 p-4 rounded-lg bg-purple-50">
        <h4 className="text-lg font-semibold text-purple-800 mb-3">
          Level 4 Component (Deepest)
        </h4>

        <ConfigRenderer
          title="Final Config (received from Level 3)"
          config={config}
          bgColor="bg-purple-50"
          borderColor="border-purple-400"
          icon="🎯"
        />
      </div>
    );
  }
});

export default Level4Agent;
