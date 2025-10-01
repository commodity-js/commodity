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
    tutorialSidebar: [
        {
            type: "doc",
            id: "getting-started",
            label: "Getting Started"
        },
        {
            type: "category",
            label: "Examples",
            items: [
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
            type: "category",
            label: "Guides",
            items: [
                "guides/design-philosophy",
                "guides/context-switching",
                "guides/testing",
                "guides/performance"
            ]
        },
        {
            type: "category",
            label: "Reference",
            items: ["api-reference"]
        }
    ]
}

export default sidebars
