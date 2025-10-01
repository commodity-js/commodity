import type { ReactNode } from "react"
import clsx from "clsx"
import Link from "@docusaurus/Link"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import Layout from "@theme/Layout"
import Heading from "@theme/Heading"
import CodeBlock from "@theme/CodeBlock"
import SectionSeparator from "@site/src/components/SectionSeparator"

import styles from "./index.module.css"

const heroCode = `import { createMarket, index } from "commodity"

// Create market and define suppliers
const market = createMarket()
const sessionSupplier = market.offer("session").asResource<{ userId: string }>()
const apiSupplier = market.offer("api").asProduct({
    suppliers: [sessionSupplier],
    factory: ($) => new ApiClient($(sessionSupplier).userId)
})

// Assemble with type safety
const api = apiSupplier
    .assemble(index(sessionSupplier.pack({ userId: "123" })))
    .unpack()

// Use it!
const users = await api.getUsers()`

const typeExample = `const configSupplier = market.offer("config").asResource<{
    api: { baseUrl: string };
}>();

const dbSupplier = market.offer("db").asProduct({
    factory: () => new DatabaseClient() // Returns a DatabaseClient instance
});

const userServiceSupplier = market.offer("userService").asProduct({
    suppliers: [configSupplier, dbSupplier],
    factory: ($) => {
        // No explicit types needed! They are all inferred.

        const config = $(configSupplier);
        //      ^? const config: { api: { baseUrl: string } }
        //         (Inferred from the .asResource<T>() definition)

        const db = $(dbSupplier);
        //    ^? const db: DatabaseClient
        //       (Inferred from the dbSupplier's factory return type)

        return {
            getUser: (id: string) => db.fetchUser(id, config.api.baseUrl)
        };
    }
});`

const performanceExample = `// An expensive service, lazy-loaded for on-demand performance.
const reportGeneratorSupplier = market.offer("reporter").asProduct({
    factory: () => {
        // This expensive logic runs only ONCE, the first time it's needed.
        console.log("🚀 Initializing Report Generator...");
        return new ReportGenerator();
    },
    lazy: true
});

const appSupplier = market.offer("app").asProduct({
    suppliers: [reportGeneratorSupplier],
    factory: ($) => (userAction: "view_dashboard" | "generate_report") => {
        if (userAction === "generate_report") {
            // The generator is created on the first call thanks to lazy loading.
            // Subsequent calls within the same context will reuse the
            // same, memoized instance without running the factory again.
            const reporter = $(reportGeneratorSupplier);
            reporter.generate();
        }
    }
});`

const testingExample = `// A product that depends on a real database.
const userProfileSupplier = market.offer("userProfile").asProduct({
    suppliers: [dbSupplier],
    factory: ($) => ({
        bio: $(dbSupplier).fetchBio()
    })
});

// For tests, create a prototype with no dependencies.
const mockUserProfile = userProfileSupplier.prototype({
    suppliers: [], // <-- No database needed!
    factory: () => ({
        bio: "This is a mock bio for testing."
    })
});

// The component we want to test.
const appSupplier = market.offer("app").asProduct({
    suppliers: [userProfileSupplier],
    factory: ($) => \`<div>\${$(userProfileSupplier).bio}</div>\`
});

// In the test, just .try() the prototype.
// No need to provide a database connection!
const app = appSupplier.try(mockUserProfile).assemble().unpack();`

function Hero() {
    const { siteConfig } = useDocusaurusContext()
    return (
        <section className={styles.hero}>
            <div className={styles.heroBackground}>
                <div className={styles.heroGradient}></div>
                <div className={styles.heroPattern}></div>
            </div>
            <div className="container">
                <div className={styles.heroContent}>
                    <div className={styles.heroText}>
                        <Heading as="h1" className={styles.heroTitle}>
                            {siteConfig.title}
                        </Heading>
                        <p className={styles.heroSubtitle}>
                            The <span className={styles.highlight}>first</span>{" "}
                            fully type-inferred and type-safe dependency
                            injection library for TypeScript.
                            <br />
                            No decorators. No reflection. Just{" "}
                            <span className={styles.highlight}>
                                simple functions
                            </span>
                            .
                        </p>
                        <div className={styles.heroButtons}>
                            <Link
                                className={clsx("button", styles.primaryButton)}
                                to="/docs/getting-started"
                            >
                                Get Started
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                >
                                    <path d="M8 0L6.59 1.41L12.17 7H0V9H12.17L6.59 14.59L8 16L16 8L8 0Z" />
                                </svg>
                            </Link>
                            <Link
                                className={clsx(
                                    "button",
                                    styles.secondaryButton
                                )}
                                to="/docs/examples/simple-example"
                            >
                                View Example
                            </Link>
                        </div>
                        <div className={styles.heroStats}>
                            <div className={styles.stat}>
                                <span className={styles.statNumber}>~3KB</span>
                                <span className={styles.statLabel}>
                                    Bundle size
                                </span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statNumber}>0</span>
                                <span className={styles.statLabel}>
                                    Dependencies
                                </span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statNumber}>100%</span>
                                <span className={styles.statLabel}>
                                    Type safe
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.heroCode}>
                        <div className={styles.codeWindow}>
                            <div className={styles.codeHeader}>
                                <div className={styles.codeDots}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <span className={styles.codeTitle}>
                                    commodity-demo.ts
                                </span>
                            </div>
                            <CodeBlock
                                language="typescript"
                                className={styles.codeBlock}
                            >
                                {heroCode}
                            </CodeBlock>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function WhySection() {
    return (
        <section className={styles.whySection}>
            <div className="container">
                <div className={styles.sectionHeader}>
                    <Heading as="h2">Why choose Commodity?</Heading>
                    <p>
                        Built for modern TypeScript applications that demand
                        performance, safety, and simplicity.
                    </p>
                </div>
                <div className={styles.whyGrid}>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>💡</div>
                        <h3>Fully Type-Inferred</h3>
                        <p>
                            Zero type boilerplate. End-to-end type safety with
                            compile-time dependency validation and no extra type
                            definitions.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>✨</div>
                        <h3>No Magic</h3>
                        <p>
                            Just functions and closures. No OOP,
                            reflect-metadata, decorators, or compiler magic.
                            What you see is what you get.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>🚀</div>
                        <h3>Performance Focused</h3>
                        <p>
                            Smart memoization, lazy loading, and a tiny bundle
                            size (~3KB). Designed for minimal runtime overhead.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>🧪</div>
                        <h3>Testing Friendly</h3>
                        <p>
                            Easy mocking and dependency swapping. Swap
                            implementations effortlessly to achieve perfect test
                            isolation.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>🏗️</div>
                        <h3>Scalable Architecture</h3>
                        <p>
                            Promotes SOLID, clean, and code-splittable design
                            patterns that grow with your application.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>🌍</div>
                        <h3>Framework Agnostic</h3>
                        <p>
                            Works anywhere TypeScript works. Use it in React,
                            Node.js, Deno, or Bun—from frontend to backend.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>🔄</div>
                        <h3>Stateless</h3>
                        <p>
                            Dependencies are resolved via closures, not global
                            state. This ensures clean, predictable, and
                            easy-to-reason-about behavior in any environment.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>📖</div>
                        <h3>Intuitive Terminology</h3>
                        <p>
                            A supply chain metaphor (Market, Product, Resource)
                            that makes dependency injection feel natural and
                            easier to understand.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>🆕</div>
                        <h3>A New DI Paradigm</h3>
                        <p>
                            Don't let your past experiences with DI prevent you
                            from trying this solution!
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

function FeatureSection({
    title,
    description,
    code,
    imageAlign = "right",
    variant = "default"
}) {
    return (
        <section
            className={clsx(
                styles.featureSection,
                styles[`feature--${variant}`]
            )}
        >
            <div className="container">
                <div
                    className={clsx(
                        styles.featureContent,
                        imageAlign === "left" && styles.featureReverse
                    )}
                >
                    <div className={styles.featureText}>
                        <Heading as="h2">{title}</Heading>
                        <p>{description}</p>
                    </div>
                    <div className={styles.featureCode}>
                        <div className={styles.codeWindow}>
                            <div className={styles.codeHeader}>
                                <div className={styles.codeDots}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                            <CodeBlock language="typescript">{code}</CodeBlock>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function UseCasesSection() {
    return (
        <section className={styles.useCasesSection}>
            <div className="container">
                <div className={styles.sectionHeader}>
                    <Heading as="h2">Perfect for modern apps</Heading>
                    <p>
                        From React components to API servers, Commodity adapts
                        to your architecture.
                    </p>
                </div>
                <div className={styles.useCasesGrid}>
                    <div className={styles.useCaseCard}>
                        <div className={styles.useCaseIcon}>⚛️</div>
                        <h3>React Applications</h3>
                        <p>
                            Eliminate prop drilling. Share context across
                            components without global state or complex
                            providers.
                        </p>
                        <div className={styles.useCaseTags}>
                            <span>SSR</span>
                            <span>Client</span>
                            <span>Next.js</span>
                        </div>
                    </div>
                    <div className={styles.useCaseCard}>
                        <div className={styles.useCaseIcon}>🖧</div>
                        <h3>APIs & Microservices</h3>
                        <p>
                            Request-scoped context propagation. Clean service
                            layers. Perfect for Express, Fastify, or any
                            framework.
                        </p>
                        <div className={styles.useCaseTags}>
                            <span>Express</span>
                            <span>Fastify</span>
                            <span>GraphQL</span>
                        </div>
                    </div>
                    <div className={styles.useCaseCard}>
                        <div className={styles.useCaseIcon}>🧪</div>
                        <h3>Testing & A/B Testing</h3>
                        <p>
                            Swap implementations on the fly. Test different
                            strategies. Mock external services with ease.
                        </p>
                        <div className={styles.useCaseTags}>
                            <span>Jest</span>
                            <span>Vitest</span>
                            <span>Playwright</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function CTASection() {
    return (
        <section className={styles.ctaSection}>
            <div className="container">
                <div className={styles.ctaContent}>
                    <Heading as="h2">Ready to revolutionize your DI?</Heading>
                    <p>
                        Join developers who've already made the switch to
                        type-inferred dependency injection!
                    </p>
                    <div className={styles.ctaButtons}>
                        <Link
                            className={clsx("button", styles.primaryButton)}
                            to="/docs/getting-started"
                        >
                            Get Started Now
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                            >
                                <path d="M8 0L6.59 1.41L12.17 7H0V9H12.17L6.59 14.59L8 16L16 8L8 0Z" />
                            </svg>
                        </Link>
                        <Link
                            className={clsx("button", styles.secondaryButton)}
                            to="/docs/getting-started"
                        >
                            View Documentation
                        </Link>
                    </div>
                    <div className={styles.ctaNote}>
                        <p>
                            🚀 Install with <code>npm install commodity</code>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function Home(): ReactNode {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout
            title={`${siteConfig.title} - Functional Dependency Injection`}
            description="Functional, fully type-safe dependency injection for TypeScript. No decorators, no reflection - just pure functions and closures."
        >
            <Hero />
            <SectionSeparator />
            <WhySection />
            <SectionSeparator />
            <FeatureSection
                title="Fully Type-Inferred from End to End"
                description="Catch dependency errors before they reach production. Commodity's architecture provides end-to-end type inference, eliminating entire classes of bugs and ensuring your dependency graph is always valid."
                code={typeExample}
            />
            <SectionSeparator />
            <FeatureSection
                title="Unmatched Performance"
                description="Smart memoization: dependencies are created in parallel once per context eagerly, and cached. Or choose lazy loading to defer the creation of expensive services until they are first accessed."
                code={performanceExample}
                imageAlign="left"
                variant="alt"
            />
            <SectionSeparator />
            <FeatureSection
                title="Effortless Testing"
                description="Isolate components completely. With .prototype(), you can create alternative implementations for testing that remove entire dependency trees, leading to cleaner and more robust tests."
                code={testingExample}
            />
            <SectionSeparator />
            <UseCasesSection />
            <SectionSeparator />
            <CTASection />
        </Layout>
    )
}
