import type { SidebarsConfig } from "@docusaurus/plugin-content-docs"

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
    // Manually defined sidebar for better organization
    sidebar: [
        "getting-started",
        {
            Examples: [
                {
                    type: "doc",
                    id: "examples/simple-example",
                    label: "Simple"
                },
                {
                    type: "link",
                    href: "/examples/react-client",
                    label: "React"
                }
            ]
        },
        {
            Guides: [
                "guides/design-philosophy",
                "guides/context-switching",
                "guides/testing",
                "guides/performance"
            ]
        },
        "api-reference",
        "troubleshooting"
    ]
}

export default sidebars
