import { register } from "scarcity";
import { type AppConfig } from "../lib/config";

interface ConfigRendererProps {
  title: string;
  config: AppConfig;
  bgColor?: string;
  borderColor?: string;
  icon?: string;
}

// Reusable config renderer agent
const ConfigRendererAgent = register("config-renderer").asAgent({
  factory: () => {
    return ({
      title,
      config,
      bgColor = "bg-gray-50",
      borderColor,
      icon = "📋"
    }: ConfigRendererProps) => (
      <div
        className={`bg-white p-4 rounded-lg shadow ${
          borderColor ? `border-l-4 ${borderColor}` : ""
        }`}
      >
        <h3 className="text-lg font-medium text-gray-700 mb-3">
          {icon} {title}
        </h3>
        <div className="space-y-4">
          {/* Basic Info */}
          <div className={`${bgColor} p-3 rounded`}>
            <h4 className="font-medium text-gray-700 mb-2">Basic Info:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
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

          {/* Theme */}
          <div className={`${bgColor} p-3 rounded`}>
            <h4 className="font-medium text-gray-700 mb-2">Theme:</h4>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <strong>Primary:</strong>
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: config.theme.primaryColor }}
                ></div>
                <span className="font-mono">{config.theme.primaryColor}</span>
              </div>
              <div className="flex items-center gap-2">
                <strong>Secondary:</strong>
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: config.theme.secondaryColor }}
                ></div>
                <span className="font-mono">{config.theme.secondaryColor}</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className={`${bgColor} p-3 rounded`}>
            <h4 className="font-medium text-gray-700 mb-2">Features:</h4>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <strong>Dark Mode:</strong>
                <span className="text-lg">
                  {config.features.enableDarkMode ? "✅" : "❌"}
                </span>
                <span>
                  {config.features.enableDarkMode ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <strong>Notifications:</strong>
                <span className="text-lg">
                  {config.features.enableNotifications ? "✅" : "❌"}
                </span>
                <span>
                  {config.features.enableNotifications ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

export default ConfigRendererAgent;
