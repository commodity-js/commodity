import { FeedSupplier } from "@/components/feed"
import { market } from "@/market"
import { userQuerySupplier } from "@/api"
import { SelectSessionSupplier } from "@/components/session"
import { ctx } from "@/context"
import type { User } from "@/api"
import { useState } from "react"
import { index } from "commodity"
import { useQuery } from "@tanstack/react-query"

export const AppSupplier = market.offer("App").asProduct({
    suppliers: [userQuerySupplier],
    assemblers: [SelectSessionSupplier, FeedSupplier],
    factory:
        ($, $$) =>
        ({ defaultUserId }: { defaultUserId: string }) => {
            const { data: defaultSession } = useQuery(
                $(userQuerySupplier)(defaultUserId)
            )
            const [session, setSession] = useState<User | undefined>()

            if (!defaultSession) {
                return <div>Loading default user...</div>
            }

            const FeedProduct = $$[FeedSupplier.name]
                .with(SelectSessionSupplier)
                .assemble(
                    index(
                        ctx.sessionSupplier.pack([
                            session ?? defaultSession,
                            setSession
                        ])
                    )
                )

            const Feed = FeedProduct.unpack()
            const SelectSession = FeedProduct.supplies(SelectSessionSupplier)

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
