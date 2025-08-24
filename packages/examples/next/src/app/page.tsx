import { Level1Supplier } from "#components/level-1.tsx"
import { ConfigSupplier, defaultConfig } from "#lib/config.ts"
import { index } from "supplier"

export default function Home() {
    // Supply the config at the entrypoint and render the nested components
    const level1Component = Level1Supplier.assemble(
        index(ConfigSupplier.pack(defaultConfig))
    ).unpack()

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        Supplier Dependency Injection Example
                    </h1>
                    <p className="text-gray-600">
                        A 4-level deep component hierarchy with dependency
                        injection using Supplier
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                    {level1Component}
                </div>

                <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                        How it works
                    </h2>
                    <div className="text-gray-600 space-y-3">
                        <p>
                            <strong>Level 1 (Root):</strong> The top-level
                            component that starts the hierarchy
                        </p>
                        <p>
                            <strong>Level 2 (Context Switcher):</strong>{" "}
                            Displays the original config AND resupplies Level 3
                            and 4 with a modified config using{" "}
                            <code className="bg-gray-100 px-1 rounded">
                                resupply()
                            </code>
                        </p>
                        <p>
                            <strong>Level 3:</strong> Passes through the
                            modified config from Level 2
                        </p>
                        <p>
                            <strong>Level 4 (Deepest):</strong> Displays the
                            modified config (different from what Level 2 shows!)
                        </p>
                        <p className="mt-4 text-sm bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                            <strong>🚀 Context Switching Demo:</strong> Notice
                            how Level 2 shows the original config, but Level 4
                            shows a completely different config! This
                            demonstrates Supplier&apos;s powerful context
                            switching capability with <code>resupply()</code>.
                        </p>
                        <p className="mt-4 text-sm bg-gray-50 p-3 rounded">
                            <strong>Config Supply:</strong> The configuration is
                            supplied at this page (entrypoint), flows to Level
                            2, gets modified, and the modified version flows to
                            Level 4.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
