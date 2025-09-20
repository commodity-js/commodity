import type { ReactNode } from "react"
import clsx from "clsx"
import Link from "@docusaurus/Link"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import Layout from "@theme/Layout"
import Heading from "@theme/Heading"
import CodeBlock from "@theme/CodeBlock"

import styles from "./index.module.css"

const heroCode = `import { createMarket, index } from "supplier"

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

const typeExample = `// ❌ This fails at compile time
const broken = apiService.assemble(
    index() // Missing required sessionSupplier!
)

// ✅ TypeScript ensures all dependencies are provided
const working = apiService.assemble(
    index(sessionSupplier.pack({ userId: "123" }))
)`

const performanceExample = `// Traditional DI container
@Injectable()
class Service {
    constructor(@Inject(DB) private db: Database) {}
}

// Supplier - just functions
const service = market.offer("service").asProduct({
    suppliers: [dbSupplier],
    factory: ($) => new Service($(dbSupplier))
})

// 🚀 3x faster, 70% smaller bundle`

const testingExample = `// Original service with real DB
const userService = createUserService()

// Test with mock - same interface, zero config
const testService = userService.assemble(
    index(
        sessionSupplier.pack({ userId: "test-user" }),
        dbSupplier.pack(mockDatabase)
    )
)

// Perfect isolation for testing
expect(testService.getUser()).toBe(mockUser)`

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
                        <div className={styles.heroLogo}>
                            <img src="img/supplier-logo.png" alt="Supplier" />
                        </div>
                        <Heading as="h1" className={styles.heroTitle}>
                            {siteConfig.title}
                        </Heading>
                        <p className={styles.heroSubtitle}>
                            The{" "}
                            <span className={styles.highlight}>functional</span>
                            , fully type-safe dependency injection library for
                            TypeScript.
                            <br />
                            No decorators. No reflection. Just{" "}
                            <span className={styles.highlight}>
                                pure functions
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
                                to="/docs/quick-example"
                            >
                                View Example
                            </Link>
                        </div>
                        <div className={styles.heroStats}>
                            <div className={styles.stat}>
                                <span className={styles.statNumber}>~15KB</span>
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
                                    supplier-demo.ts
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
                    <Heading as="h2">Why choose Supplier?</Heading>
                    <p>
                        Built for modern TypeScript applications that demand
                        performance, safety, and simplicity.
                    </p>
                </div>
                <div className={styles.whyGrid}>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>🔒</div>
                        <h3>Fully Type-Safe</h3>
                        <p>
                            Compile-time dependency validation. Circular
                            dependency detection. Your dependency graph is
                            always correct.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>⚡</div>
                        <h3>Zero Overhead</h3>
                        <p>
                            Pure functions and closures. No classes, decorators,
                            or reflection. Minimal runtime footprint.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>🧪</div>
                        <h3>Testing Friendly</h3>
                        <p>
                            Swap dependencies effortlessly. Perfect isolation.
                            Mock anything with simple .pack() calls.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>🌍</div>
                        <h3>Framework Agnostic</h3>
                        <p>
                            Works everywhere TypeScript works. React, Node.js,
                            Deno, Bun. Frontend, backend, everywhere.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>🔄</div>
                        <h3>Stateless</h3>
                        <p>
                            Dependencies resolved via closures, not global
                            state. Clean, predictable, and easy to reason about.
                        </p>
                    </div>
                    <div className={styles.whyCard}>
                        <div className={styles.whyIcon}>📦</div>
                        <h3>Tree Shakeable</h3>
                        <p>
                            Import only what you use. Hyper-specialized
                            suppliers. Perfect for code splitting and
                            optimization.
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
                        From React components to API servers, Supplier adapts to
                        your architecture.
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
                        functional dependency injection.
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
                            to="/docs/quick-example"
                        >
                            View Documentation
                        </Link>
                    </div>
                    <div className={styles.ctaNote}>
                        <p>
                            🚀 Install with <code>npm install supplier</code>
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
            <WhySection />
            <FeatureSection
                title="Compile-Time Safety"
                description="Catch dependency errors before they reach production. Supplier's architecture provides end-to-end type inference, eliminating entire classes of bugs and ensuring your dependency graph is always valid."
                code={typeExample}
            />
            <FeatureSection
                title="Unmatched Performance"
                description="Built for speed. Functions and closures instead of classes and decorators. Smart memoization and lazy loading. One of the fastest DI solutions available."
                code={performanceExample}
                imageAlign="left"
                variant="alt"
            />
            <FeatureSection
                title="Effortless Testing"
                description="Testing becomes a breeze when you can swap any dependency with a single method call. Perfect isolation, easy mocking, and clean test setup."
                code={testingExample}
            />
            <UseCasesSection />
            <CTASection />
        </Layout>
    )
}
