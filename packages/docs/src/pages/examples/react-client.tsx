import Layout from "@theme/Layout"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"

export default function ExampleReactClient() {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout
            title={`${siteConfig.title} - Functional Dependency Injection`}
            description="Functional, fully type-safe dependency injection for TypeScript. No decorators, no reflection - just pure functions and closures."
        >
            <iframe
                src="https://codesandbox.io/p/sandbox/github/architype-js/architype/tree/latest-stable-release/packages/examples/react-client?embed=1&file=%2FREADME.md"
                style={{
                    width: "100%",
                    height: "90vh",
                    border: "0",
                    borderRadius: "4px",
                    overflow: "hidden"
                }}
                title="@architype-js/examples-react-client"
                allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            ></iframe>
        </Layout>
    )
}
