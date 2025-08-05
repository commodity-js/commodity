import { register, type $ } from "scarcity";
import { ConfigResource } from "@/lib/config";

// Level 4 component (deepest level) - displays config info
const Level4Agent = register("level-4").asAgent({
  factory: ($: $<[typeof ConfigResource]>) => {
    const config = $(ConfigResource.id);

    return (
      <div className="border-2 border-purple-500 p-4 rounded-lg bg-purple-50">
        <h4 className="text-lg font-semibold text-purple-800 mb-3">
          Level 4 Component (Deepest)
        </h4>

        <div className="space-y-2 text-sm">
          <div className="bg-white p-3 rounded shadow">
            <h5 className="font-medium text-purple-700 mb-2">
              App Configuration:
            </h5>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div>
                <strong>App Name:</strong> {config.appName}
              </div>
              <div>
                <strong>Version:</strong> {config.version}
              </div>
              <div>
                <strong>API URL:</strong> {config.apiUrl}
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded shadow">
            <h5 className="font-medium text-purple-700 mb-2">Theme:</h5>
            <div className="flex gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: config.theme.primaryColor }}
                ></div>
                Primary
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: config.theme.secondaryColor }}
                ></div>
                Secondary
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded shadow">
            <h5 className="font-medium text-purple-700 mb-2">Features:</h5>
            <div className="text-xs space-y-1">
              <div>
                Dark Mode: {config.features.enableDarkMode ? "✅" : "❌"}
              </div>
              <div>
                Notifications:{" "}
                {config.features.enableNotifications ? "✅" : "❌"}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

export default Level4Agent;
