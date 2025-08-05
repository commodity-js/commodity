import {
  ArrowRight,
  Box,
  Zap,
  Shield,
  Code,
  Github,
  Download,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import CodeExample from "@/components/CodeExample";
import FeatureCard from "@/components/FeatureCard";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-scarcity-dark text-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-scarcity-dark via-scarcity-dark-lighter to-scarcity-gray opacity-50"></div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-64 h-64 gradient-scarcity opacity-10 rounded-full blur-3xl animate-float"></div>
          <div
            className="absolute bottom-20 right-20 w-96 h-96 gradient-scarcity opacity-5 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 gradient-scarcity opacity-5 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Logo className="w-32 h-32 animate-glow" />
          </div>

          {/* Main heading */}
          <h1 className="text-6xl md:text-8xl font-bold mb-6">
            <span className="gradient-scarcity-text">Scarcity</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Powerful, type-inferred, and hyper-minimalistic library for server
            request propagation and dependency injection using a novel{" "}
            <span className="text-scarcity-amber font-semibold">
              Supply Chain Architecture
            </span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link
              href="#quickstart"
              className="group px-8 py-4 gradient-scarcity text-black font-semibold rounded-lg hover:scale-105 transition-all duration-300 flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="https://github.com/scarcity-js/scarcity"
              className="px-8 py-4 border-2 border-scarcity-orange text-scarcity-orange hover:bg-scarcity-orange hover:text-black transition-all duration-300 rounded-lg flex items-center gap-2"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </Link>
          </div>

          {/* Key features preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-scarcity-dark-lighter/50 backdrop-blur-sm p-6 rounded-lg border border-scarcity-gray/30">
              <Zap className="w-8 h-8 text-scarcity-yellow mb-3" />
              <h3 className="font-semibold mb-2">Zero Runtime Overhead</h3>
              <p className="text-gray-400 text-sm">
                Pure functions and objects with compile-time optimization
              </p>
            </div>

            <div className="bg-scarcity-dark-lighter/50 backdrop-blur-sm p-6 rounded-lg border border-scarcity-gray/30">
              <Shield className="w-8 h-8 text-scarcity-amber mb-3" />
              <h3 className="font-semibold mb-2">Type-Safe</h3>
              <p className="text-gray-400 text-sm">
                Full TypeScript inference throughout the dependency chain
              </p>
            </div>

            <div className="bg-scarcity-dark-lighter/50 backdrop-blur-sm p-6 rounded-lg border border-scarcity-gray/30">
              <Box className="w-8 h-8 text-scarcity-orange mb-3" />
              <h3 className="font-semibold mb-2">Context Switching</h3>
              <p className="text-gray-400 text-sm">
                Powerful resupply() for dynamic dependency injection
              </p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-scarcity-orange" />
        </div>
      </section>

      {/* Quick Start Section */}
      <section id="quickstart" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-scarcity-text">Quick Start</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Get up and running with Scarcity in minutes. Here&apos;s how easy
              it is to implement powerful dependency injection.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-scarcity-amber">
                Installation
              </h3>
              <CodeExample code={`npm install scarcity`} language="bash" />

              <h3 className="text-2xl font-bold mb-6 mt-8 text-scarcity-amber">
                Basic Usage
              </h3>
              <CodeExample
                code={`import { register, parcel } from "scarcity";

// Create a resource
const ConfigResource = register("config")
  .asResource<{ apiUrl: string }>();

// Create an agent
const ApiAgent = register("api").asAgent({
  factory: ($) => {
    const config = $(ConfigResource.id);
    return { fetch: (path) => \`\${config.apiUrl}\${path}\` };
  }
});

// Supply and use
const api = ApiAgent.supply(
  parcel(ConfigResource.supply({ apiUrl: "https://api.com" }))
);

console.log(api.value.fetch("/users")); // "https://api.com/users"`}
                language="typescript"
              />
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-6 text-scarcity-amber">
                Context Switching
              </h3>
              <CodeExample
                code={`// Resupply with different context
const testApi = apiAgent.resupply(
  parcel(ConfigResource.supply({ 
    apiUrl: "http://localhost:3000" 
  }))
);

// Same agent, different config!
console.log(testApi.value.fetch("/users")); 
// "http://localhost:3000/users"`}
                language="typescript"
              />

              <div className="mt-8 p-6 bg-gradient-to-r from-scarcity-orange/10 to-scarcity-red/10 border border-scarcity-orange/30 rounded-lg">
                <h4 className="font-semibold text-scarcity-orange mb-2">
                  💡 Pro Tip
                </h4>
                <p className="text-gray-300 text-sm">
                  Scarcity&apos;s{" "}
                  <code className="bg-scarcity-dark-lighter px-2 py-1 rounded text-scarcity-amber">
                    resupply()
                  </code>
                  method enables powerful testing scenarios and runtime
                  dependency overrides without affecting the original agent
                  configuration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-scarcity-dark-lighter/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-scarcity-text">Features</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Everything you need for modern dependency injection, designed for
              performance and developer experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Zero Runtime Overhead"
              description="Pure functions and objects with compile-time optimization. No reflection, no runtime magic."
              color="text-scarcity-yellow"
            />

            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Type-Safe"
              description="Full TypeScript inference throughout the dependency chain. Catch errors at compile time."
              color="text-scarcity-amber"
            />

            <FeatureCard
              icon={<Box className="w-8 h-8" />}
              title="Context Switching"
              description="Powerful resupply() for dynamic dependency injection and testing scenarios."
              color="text-scarcity-orange"
            />

            <FeatureCard
              icon={<Code className="w-8 h-8" />}
              title="Minimalistic API"
              description="Learn the entire API in minutes. Simple, intuitive, and powerful."
              color="text-scarcity-red"
            />

            <FeatureCard
              icon={<Download className="w-8 h-8" />}
              title="Tiny Bundle Size"
              description="Minimal footprint with zero dependencies. Perfect for performance-critical applications."
              color="text-scarcity-yellow"
            />

            <FeatureCard
              icon={<Github className="w-8 h-8" />}
              title="Open Source"
              description="MIT licensed and community-driven. Contribute on GitHub and shape the future."
              color="text-scarcity-amber"
            />
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-scarcity-text">See It In Action</span>
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Check out our interactive example with 4-level deep component
            hierarchy demonstrating context switching and dependency injection.
          </p>

          <Link
            href="/examples"
            className="inline-flex items-center gap-2 px-8 py-4 gradient-scarcity text-black font-semibold rounded-lg hover:scale-105 transition-all duration-300"
          >
            View Live Example
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-scarcity-gray/30">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-6">
            <Logo className="w-16 h-16 mx-auto opacity-60" />
          </div>
          <p className="text-gray-400 mb-4">
            Built with ❤️ by the Scarcity team
          </p>
          <div className="flex justify-center gap-6">
            <Link
              href="https://github.com/scarcity-js/scarcity"
              className="text-gray-400 hover:text-scarcity-orange transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="https://github.com/scarcity-js/scarcity/blob/main/README.md"
              className="text-gray-400 hover:text-scarcity-orange transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="/examples"
              className="text-gray-400 hover:text-scarcity-orange transition-colors"
            >
              Examples
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
