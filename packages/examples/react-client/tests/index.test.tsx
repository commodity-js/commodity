import { describe, it, expect } from "vitest"
import { $$App } from "@/components/app"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/query"
import { StrictMode } from "react"

describe("React Client", () => {
    it("should be able to render the app", async () => {
        const App = $$App.assemble({}).unpack()
        expect(App).toBeDefined()
        render(
            <StrictMode>
                <QueryClientProvider client={queryClient}>
                    <App defaultUserId="userA" />
                </QueryClientProvider>
            </StrictMode>
        )
        expect(screen.getByText("Loading default user...")).toBeInTheDocument()

        await waitFor(() => {
            expect(
                screen.getByText("Social Feed Wireframe")
            ).toBeInTheDocument()
        })
    })
})
