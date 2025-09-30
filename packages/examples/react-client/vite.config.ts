import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 3001,
        strictPort: true,
        allowedHosts: ["localhost", "csb.app"]
    },

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    }
})
