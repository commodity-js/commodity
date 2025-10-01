import type { ReactNode } from "react"
import clsx from "clsx"
import Heading from "@theme/Heading"
import styles from "./styles.module.css"

type FeatureItem = {
    title: string
    icon: string
    description: ReactNode
}

const FeatureList: FeatureItem[] = [
    {
        title: "Fully Type-Safe",
        icon: "🔒",
        description: (
            <>
                Compile-time dependency validation and circular dependency
                detection. TypeScript ensures your dependency graph is correct
                before runtime.
            </>
        )
    },
    {
        title: "No Magic",
        icon: "🪄",
        description: (
            <>
                Just functions and closures, no OOP, reflect-metadata,
                decorators, annotations or compiler magic. Clean, understandable
                code.
            </>
        )
    },
    {
        title: "Framework Agnostic",
        icon: "🌐",
        description: (
            <>
                Works everywhere TypeScript works. Frontend, backend, React,
                Node.js, Deno, Bun - you name it.
            </>
        )
    },
    {
        title: "Testing Friendly",
        icon: "🧪",
        description: (
            <>
                Easy mocking and dependency swapping with <code>.pack()</code>{" "}
                and <code>.prototype()</code>. Perfect for unit tests and A/B
                testing.
            </>
        )
    },
    {
        title: "Performance Focused",
        icon: "⚡",
        description: (
            <>
                Smart memoization, lazy loading, tree-shakeable. ~15KB minified.
                Optimal waterfalls with customizable preloading.
            </>
        )
    },
    {
        title: "Stateless",
        icon: "🔄",
        description: (
            <>
                Dependencies resolved via closures, not global state. Context
                switching with <code>reassemble()</code> for clean, predictable
                behavior.
            </>
        )
    }
]

function Feature({ title, icon, description }: FeatureItem) {
    return (
        <div className={clsx("col col--4", styles.feature)}>
            <div className="text--center">
                <div className={styles.featureIcon}>{icon}</div>
            </div>
            <div className="text--center padding-horiz--md">
                <Heading as="h3">{title}</Heading>
                <p>{description}</p>
            </div>
        </div>
    )
}

export default function HomepageFeatures(): ReactNode {
    return (
        <section className={styles.features}>
            <div className="container">
                <div className="row">
                    <div className="col col--12 text--center margin-bottom--lg">
                        <Heading as="h2">Why Commodity?</Heading>
                        <p className="text--muted">
                            Modern dependency injection without the complexity
                            of traditional containers
                        </p>
                    </div>
                </div>
                <div className="row">
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    )
}
