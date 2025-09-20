import { Level2Supplier } from "#components/level-2.tsx"
import { market } from "#lib/market.ts"

// Level 1 component - renders Level 2
export const Level1Supplier = market.offer("level-1").asProduct({
    suppliers: [Level2Supplier],
    factory: ($) => {
        const Level2Component = $(Level2Supplier.name)

        return (
            <div className="border-2 border-red-500 p-6 rounded-lg bg-red-50">
                <h1 className="text-3xl font-bold text-red-800 mb-4">
                    Level 1 Component
                </h1>
                <p className="text-red-700 mb-6">
                    Welcome to the Supplier dependency injection example! This
                    is the top-level component that starts our 4-level deep
                    component hierarchy.
                </p>

                {Level2Component}
            </div>
        )
    }
})
