import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"
import CodeExample from "#components/CodeExample.tsx"
import Example from "@solvency/examples-next/app/page.tsx"

export default function ExamplesPage() {
    return (
        <div className="min-h-screen bg-scarcity-dark text-white">
            {/* Header */}
            <header className="border-b border-scarcity-gray/30 bg-scarcity-dark-lighter/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-scarcity-orange hover:text-scarcity-amber transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </Link>

                    <h1 className="text-xl font-semibold gradient-scarcity-text">
                        Live Example
                    </h1>

                    <Link
                        href="https://github.com/solvency-js/solvency/tree/main/packages/examples"
                        className="flex items-center gap-2 text-gray-400 hover:text-scarcity-orange transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        View Source
                    </Link>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Intro */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        <span className="gradient-scarcity-text">
                            Dependency Injection Demo
                        </span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-4xl mx-auto">
                        A 4-level deep component hierarchy demonstrating
                        Solvency&apos;s powerful context switching capabilities.
                        Watch how configs flow and transform through the
                        component tree.
                    </p>
                </div>

                {/* Live Demo */}
                <div className="bg-scarcity-dark-lighter/30 rounded-lg p-6 mb-12">
                    <h2 className="text-2xl font-semibold text-scarcity-amber mb-6">
                        🚀 Live Demo
                    </h2>
                    <Example />
                </div>

                {/* Explanation */}
                <div className="grid md:grid-cols-2 gap-12">
                    <div>
                        <h2 className="text-2xl font-semibold text-scarcity-amber mb-6">
                            How It Works
                        </h2>

                        <div className="space-y-6 text-gray-300">
                            <div className="bg-scarcity-dark-lighter/50 p-4 rounded-lg border-l-4 border-red-500">
                                <h3 className="font-semibold text-red-400 mb-2">
                                    Level 1 (Root)
                                </h3>
                                <p>
                                    The top-level component that starts the
                                    hierarchy and passes the original config
                                    down.
                                </p>
                            </div>

                            <div className="bg-scarcity-dark-lighter/50 p-4 rounded-lg border-l-4 border-green-500">
                                <h3 className="font-semibold text-green-400 mb-2">
                                    Level 2 (Context Switcher)
                                </h3>
                                <p>
                                    <strong>⭐ The Magic Happens Here!</strong>{" "}
                                    Level 2 displays the original config AND
                                    creates a modified version that it supplies
                                    to Level 3 & 4 using{" "}
                                    <code className="bg-scarcity-dark px-2 py-1 rounded text-scarcity-orange">
                                        resupply()
                                    </code>
                                    .
                                </p>
                            </div>

                            <div className="bg-scarcity-dark-lighter/50 p-4 rounded-lg border-l-4 border-blue-500">
                                <h3 className="font-semibold text-blue-400 mb-2">
                                    Level 3 (Pass-through)
                                </h3>
                                <p>
                                    Receives the modified config from Level 2
                                    and passes it to Level 4.
                                </p>
                            </div>

                            <div className="bg-scarcity-dark-lighter/50 p-4 rounded-lg border-l-4 border-purple-500">
                                <h3 className="font-semibold text-purple-400 mb-2">
                                    Level 4 (Consumer)
                                </h3>
                                <p>
                                    Displays the final modified config -
                                    completely different from what Level 2
                                    originally received!
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 p-6 bg-gradient-to-r from-scarcity-orange/10 to-scarcity-red/10 border border-scarcity-orange/30 rounded-lg">
                            <h4 className="font-semibold text-scarcity-orange mb-2">
                                🔥 Key Insight
                            </h4>
                            <p className="text-gray-300 text-sm">
                                Notice how Level 2 shows the original blue
                                theme, but Level 4 shows a completely different
                                emerald theme! This demonstrates Solvency&apos;s
                                powerful context switching - the same component
                                tree can work with different configurations at
                                different levels.
                            </p>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-scarcity-amber mb-6">
                            Code Structure
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-scarcity-yellow mb-3">
                                    1. Entry Point
                                </h3>
                                <CodeExample
                                    code={`// Supply config at the root
const result = Level1Agent.supply(
  parcel(ConfigResource.supply(defaultConfig))
);`}
                                    language="typescript"
                                />
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-scarcity-yellow mb-3">
                                    2. Context Switch (Level 2)
                                </h3>
                                <CodeExample
                                    code={`// Create modified config
const modifiedConfig = {
  ...currentConfig,
  appName: "🚀 Modified by Level 2",
  theme: { primaryColor: "#10b981" }
};

// Resupply with new context
const Level3Component = level3Agent.resupply(
  parcel(ConfigResource.supply(modifiedConfig))
);`}
                                    language="typescript"
                                />
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-scarcity-yellow mb-3">
                                    3. Component Definition
                                </h3>
                                <CodeExample
                                    code={`const Level2Agent = register("level-2").asAgent({
  team: [Level3Agent, ConfigRendererAgent],
  factory: ($) => {
    const config = $(ConfigResource.id);
    const ConfigRenderer = $(ConfigRendererAgent.id);
    // ... render logic
  }
});`}
                                    language="typescript"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <div className="mt-16 text-center">
                    <h2 className="text-3xl font-bold mb-8">
                        <span className="gradient-scarcity-text">
                            Why This Matters
                        </span>
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-scarcity-dark-lighter/50 p-6 rounded-lg border border-scarcity-gray/30">
                            <h3 className="text-xl font-semibold text-scarcity-orange mb-3">
                                🧪 Testing
                            </h3>
                            <p className="text-gray-300">
                                Easily inject mock configurations for different
                                test scenarios without changing your components.
                            </p>
                        </div>

                        <div className="bg-scarcity-dark-lighter/50 p-6 rounded-lg border border-scarcity-gray/30">
                            <h3 className="text-xl font-semibold text-scarcity-amber mb-3">
                                🎛️ Configuration
                            </h3>
                            <p className="text-gray-300">
                                Switch between development, staging, and
                                production configs dynamically at runtime.
                            </p>
                        </div>

                        <div className="bg-scarcity-dark-lighter/50 p-6 rounded-lg border border-scarcity-gray/30">
                            <h3 className="text-xl font-semibold text-scarcity-yellow mb-3">
                                🔧 Flexibility
                            </h3>
                            <p className="text-gray-300">
                                Override dependencies at any level of your
                                component tree without affecting parent
                                components.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
