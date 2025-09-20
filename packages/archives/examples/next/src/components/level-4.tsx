import { ConfigSupplier } from "#lib/config.ts"
import { ConfigRendererSupplier } from "#components/config-renderer.tsx"
import { market } from "#lib/market.ts"

// Level 4 component (deepest level) - displays config info using shared renderer
export const Level4Supplier = market.offer("level-4").asProduct({
    suppliers: [ConfigRendererSupplier, ConfigSupplier],
    factory: ($) => {
        const config = $(ConfigSupplier.name)
        const ConfigRenderer = $(ConfigRendererSupplier.name)

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
        )
    }
})
