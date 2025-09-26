import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { AppSupplier } from "@/components/app"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/query"
import { postsQuerySupplier, usersQuerySupplier } from "@/api"

queryClient.prefetchQuery(usersQuerySupplier.assemble({}).unpack())
queryClient.prefetchQuery(postsQuerySupplier.assemble({}).unpack())

const root = createRoot(document.getElementById("root")!)
const App = AppSupplier.assemble({}).unpack()
root.render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <App defaultUserId="userA" />
        </QueryClientProvider>
    </StrictMode>
)
