import { $$Feed } from "@/components/feed"
import { market } from "@/market"
import { $$userQuery } from "@/api"
import { $$SelectSession } from "@/components/session"
import { ctx } from "@/context"
import type { User } from "@/api"
import { useState } from "react"
import { index } from "commodity"
import { useQuery } from "@tanstack/react-query"

export const $$App = market.offer("App").asProduct({
    suppliers: [$$userQuery],
    assemblers: [$$SelectSession, $$Feed],
    factory:
        ($, $$) =>
        ({ defaultUserId }: { defaultUserId: string }) => {
            const { data: defaultSession } = useQuery(
                $($$userQuery)(defaultUserId)
            )
            const [session, setSession] = useState<User | undefined>()

            if (!defaultSession) {
                return <div>Loading default user...</div>
            }

            const $FeedProduct = $$[$$Feed.name]
                .with($$SelectSession)
                .assemble(
                    index(
                        ctx.$$session.pack([
                            session ?? defaultSession,
                            setSession
                        ])
                    )
                )

            const Feed = $FeedProduct.unpack()
            const SelectSession = $FeedProduct.supplies($$SelectSession)

            return (
                <div className="min-h-screen bg-gray-900 text-white p-6">
                    <div className="max-w-2xl mx-auto">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold text-center mb-4">
                                Social Feed Wireframe
                            </h1>
                            <SelectSession />
                        </header>
                        <Feed />
                    </div>
                </div>
            )
        }
})
