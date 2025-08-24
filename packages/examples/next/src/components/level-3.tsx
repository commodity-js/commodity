import { Level4Supplier } from "#components/level-4.tsx"
import { market } from "#lib/market.ts"

// Level 3 component - renders Level 4
export const Level3Supplier = market.offer("level-3").asProduct({
    suppliers: [Level4Supplier],
    factory: ($) => {
        const Level4Component = $(Level4Supplier.name)

        return (
            <div className="border-2 border-blue-500 p-4 rounded-lg bg-blue-50">
                <h3 className="text-xl font-semibold text-blue-800 mb-4">
                    Level 3 Component
                </h3>
                <p className="text-blue-700 mb-4 text-sm">
                    This component renders Level 4, which displays the config
                    information.
                </p>

                {Level4Component}
            </div>
        )
    }
})
