import { register, type $ } from "supplier"
import Level2Service from "#components/level-2.tsx"

// Level 1 component - renders Level 2
const Level1Service = register("level-1").asService({
    team: [Level2Service],
    factory: ($: $<[typeof Level2Service]>) => {
        const Level2Component = $(Level2Service.id)

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

export default Level1Service
