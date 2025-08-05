import { register } from "scarcity";

export interface AppConfig {
  appName: string;
  version: string;
  apiUrl: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
  };
  features: {
    enableDarkMode: boolean;
    enableNotifications: boolean;
  };
}

// Register the config resource
export const ConfigResource = register("config").asResource<AppConfig>();

// Default config
export const defaultConfig: AppConfig = {
  appName: "Scarcity Example App",
  version: "1.0.0",
  apiUrl: "https://api.example.com",
  theme: {
    primaryColor: "#3b82f6",
    secondaryColor: "#64748b"
  },
  features: {
    enableDarkMode: true,
    enableNotifications: true
  }
};
