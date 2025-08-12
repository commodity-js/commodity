import { register, type $, tagged } from "supplier"
import Level3Agent from "#components/level-3.tsx"
import ConfigRendererAgent from "#components/config-renderer.tsx"
import { ConfigResource } from "#lib/config.ts"

// Level 2 component - displays config and resupplies different config to Level 3+4
const Level2Agent = register("level-2").asAgent({
    team: [Level3Agent, ConfigRendererAgent],
    factory: (
        $: $<
            [
                typeof Level3Agent,
                typeof ConfigRendererAgent,
                typeof ConfigResource
            ]
        >
    ) => {
        // Get the current config to display (resource must be supplied at entry point)
        const currentConfig = $(ConfigResource.id)

        // Get the config renderer
        const ConfigRenderer = $(ConfigRendererAgent.id)

        // Get Level3Agent to resupply with different config
        const level3Agent = $[Level3Agent.id]

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
        }

        // Resupply Level 3 with the modified config
        const Level3Component = level3Agent.resupply(
            tagged(ConfigResource.put(modifiedConfig))
        )

        return (
            <div className="border-2 border-green-500 p-4 rounded-lg bg-green-50">
                <h2 className="text-2xl font-semibold text-green-800 mb-4">
                    Level 2 Component - Config Context Switcher
                </h2>

                {/* Display the original config using shared renderer */}
                <div className="mb-6">
                    <ConfigRenderer
                        title="Original Config (received from Level 1)"
                        config={currentConfig}
                        bgColor="bg-gray-50"
                        icon="📥"
                    />
                </div>

                {/* Display the modified config using shared renderer */}
                <div className="mb-6">
                    <ConfigRenderer
                        title="Modified Config (sent to Level 3 & 4)"
                        config={modifiedConfig}
                        bgColor="bg-yellow-50"
                        borderColor="border-yellow-400"
                        icon="📤"
                    />
                </div>

                <p className="text-green-700 mb-4 text-sm bg-green-100 p-3 rounded">
                    <strong>Context Switch:</strong> Level 2 resupplies Level 3
                    and 4 with a modified config. Notice how Level 4 will
                    display different values than what Level 2 received!
                </p>

                {Level3Component.value}
            </div>
        )
    }
})

export default Level2Agent
