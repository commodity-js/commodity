import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
    title: "Commodity",
    tagline:
        "Functional, fully type-safe and stateless dependency injection for TypeScript",
    favicon: "img/commodity-logo.png",

    // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
    future: {
        v4: true // Improve compatibility with the upcoming Docusaurus v4
    },

    // Set the production url of your site here
    url: "https://commodity-js.github.io",
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: "/commodity/",

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: "commodity-js", // Usually your GitHub org/user name.
    projectName: "commodity", // Usually your repo name.

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
                        "https://github.com/commodity-js/commodity/tree/main/packages/docs/"
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
        image: "img/commodity-logo.png",
        navbar: {
            title: "Commodity",
            logo: {
                alt: "Commodity Logo",
                src: "img/commodity-logo.png"
            },
            items: [
                {
                    type: "docSidebar",
                    sidebarId: "sidebar",
                    position: "left",
                    label: "Docs"
                },
                {
                    href: "https://www.npmjs.com/package/commodity",
                    label: "npm",
                    position: "right"
                },
                {
                    href: "https://github.com/commodity-js/commodity",
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
                            href: "https://github.com/commodity-js/commodity/issues"
                        },
                        {
                            label: "GitHub Discussions",
                            href: "https://github.com/commodity-js/commodity/discussions"
                        }
                    ]
                },
                {
                    title: "More",
                    items: [
                        {
                            label: "npm Package",
                            href: "https://www.npmjs.com/package/commodity"
                        },
                        {
                            label: "GitHub",
                            href: "https://github.com/commodity-js/commodity"
                        }
                    ]
                }
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Commodity. Built with Docusaurus.`
        },
        prism: {
            theme: prismThemes.gruvboxMaterialDark,
            darkTheme: prismThemes.gruvboxMaterialDark,
            additionalLanguages: ["typescript", "tsx", "javascript", "jsx"]
        }
    } satisfies Preset.ThemeConfig
}

export default config
