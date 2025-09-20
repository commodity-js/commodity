import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
    title: "Supplier",
    tagline:
        "Functional, fully type-safe and stateless dependency injection for TypeScript",
    favicon: "img/supplier-logo.png",

    // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
    future: {
        v4: true // Improve compatibility with the upcoming Docusaurus v4
    },

    // Set the production url of your site here
    url: "https://supplier-js.github.io",
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: "/supplier/",

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: "supplier-js", // Usually your GitHub org/user name.
    projectName: "supplier", // Usually your repo name.

    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: "en",
        locales: ["en"]
    },

    presets: [
        [
            "classic",
            {
                docs: {
                    sidebarPath: "./sidebars.ts",
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl:
                        "https://github.com/supplier-js/supplier/tree/main/packages/docs/"
                },
                blog: false,
                theme: {
                    customCss: "./src/css/custom.css"
                }
            } satisfies Preset.Options
        ]
    ],

    themeConfig: {
        // Replace with your project's social card
        image: "img/supplier-logo.png",
        navbar: {
            title: "Supplier",
            logo: {
                alt: "Supplier Logo",
                src: "img/supplier-logo.png"
            },
            items: [
                {
                    type: "docSidebar",
                    sidebarId: "tutorialSidebar",
                    position: "left",
                    label: "Docs"
                },
                {
                    href: "https://www.npmjs.com/package/supplier",
                    label: "npm",
                    position: "right"
                },
                {
                    href: "https://github.com/supplier-js/supplier",
                    label: "GitHub",
                    position: "right"
                }
            ]
        },
        footer: {
            style: "dark",
            links: [
                {
                    title: "Docs",
                    items: [
                        {
                            label: "Getting Started",
                            to: "/docs/getting-started"
                        },
                        {
                            label: "API Reference",
                            to: "/docs/api-reference"
                        }
                    ]
                },
                {
                    title: "Community",
                    items: [
                        {
                            label: "GitHub Issues",
                            href: "https://github.com/supplier-js/supplier/issues"
                        },
                        {
                            label: "GitHub Discussions",
                            href: "https://github.com/supplier-js/supplier/discussions"
                        }
                    ]
                },
                {
                    title: "More",
                    items: [
                        {
                            label: "npm Package",
                            href: "https://www.npmjs.com/package/supplier"
                        },
                        {
                            label: "GitHub",
                            href: "https://github.com/supplier-js/supplier"
                        }
                    ]
                }
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Supplier. Built with Docusaurus.`
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
            additionalLanguages: ["typescript", "tsx", "javascript", "jsx"]
        }
    } satisfies Preset.ThemeConfig
}

export default config
