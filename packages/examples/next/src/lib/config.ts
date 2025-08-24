import { market } from "#lib/market.ts"

export interface AppConfig {
    appName: string
    version: string
    apiUrl: string
    theme: {
        primaryColor: string
        secondaryColor: string
    }
    features: {
        enableDarkMode: boolean
        enableNotifications: boolean
    }
}

export const defaultConfig: AppConfig = {
    appName: "Supplier Example App",
    version: "1.0.0",
    apiUrl: "https://api.example.com",
    theme: {
        primaryColor: "#3b82f6", // blue-500
        secondaryColor: "#ef4444" // red-500
    },
    features: {
        enableDarkMode: true,
        enableNotifications: true
    }
}

export const ConfigSupplier = market.offer("config").asResource<AppConfig>()
