import { register, type $, parcel } from "scarcity";
import Level3Agent from "./level-3";
import { ConfigResource } from "@/lib/config";

// Level 2 component - displays config and resupplies different config to Level 3+4
const Level2Agent = register("level-2").asAgent({
  team: [Level3Agent],
  factory: ($: $<[typeof Level3Agent, typeof ConfigResource]>) => {
    // Get the current config to display
    const currentConfig = $(ConfigResource.id);

    // Get Level3Agent to resupply with different config
    const level3Agent = $[Level3Agent.id];

    // Create a modified config for Level 3 and 4
    const modifiedConfig = {
      ...currentConfig,
      appName: "🚀 Modified by Level 2",
      version: "2.0.0-modified",
      apiUrl: "https://modified-api.example.com",
      theme: {
        primaryColor: "#10b981", // emerald-500
        secondaryColor: "#f59e0b" // amber-500
      },
      features: {
        enableDarkMode: false,
        enableNotifications: false
      }
    };

    // Resupply Level 3 with the modified config
    const Level3Component = level3Agent.resupply(
      parcel(ConfigResource.supply(modifiedConfig))
    );

    return (
      <div className="border-2 border-green-500 p-4 rounded-lg bg-green-50">
        <h2 className="text-2xl font-semibold text-green-800 mb-4">
          Level 2 Component - Config Context Switcher
        </h2>

        {/* Display the original config */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-green-700 mb-3">
            Original Config (received from Level 1):
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>App Name:</strong> {currentConfig.appName}
            </div>
            <div>
              <strong>Version:</strong> {currentConfig.version}
            </div>
            <div>
              <strong>API URL:</strong> {currentConfig.apiUrl}
            </div>
            <div className="flex items-center gap-2">
              <strong>Primary Color:</strong>
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: currentConfig.theme.primaryColor }}
              ></div>
              {currentConfig.theme.primaryColor}
            </div>
          </div>
        </div>

        <p className="text-green-700 mb-4 text-sm bg-green-100 p-3 rounded">
          <strong>Context Switch:</strong> Level 2 resupplies Level 3 and 4 with
          a modified config. Notice how Level 4 will display different values
          than what Level 2 received!
        </p>

        {Level3Component.value}
      </div>
    );
  }
});

export default Level2Agent;
