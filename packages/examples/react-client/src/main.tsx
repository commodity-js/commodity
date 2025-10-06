import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { $$App } from "@/components/app"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/query"
import { $$postsQuery, $$usersQuery } from "@/api"

queryClient.prefetchQuery($$usersQuery.assemble({}).unpack())
queryClient.prefetchQuery($$postsQuery.assemble({}).unpack())

const root = createRoot(document.getElementById("root")!)
const App = $$App.assemble({}).unpack()
root.render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <App defaultUserId="userA" />
        </QueryClientProvider>
    </StrictMode>
)
