import { feedSupplier } from "@/Feed"
import { market } from "./market"
import { useUsersSupplier } from "@/api"
import type { User } from "@/types"
import { useState } from "react"
import { index } from "supplier"

export const globalUserStateResource = market
    .offer("globalUser")
    .asResource<[User, (user: User) => void]>()
export const SelectGlobalUserSupplier = market
    .offer("SelectGlobalUser")
    .asProduct({
        suppliers: [useUsersSupplier, globalUserStateResource],
        factory: ($) => {
            const [globalUser, setGlobalUser] = $(globalUserStateResource)
            const { data: users } = $(useUsersSupplier)
            return (
                <div className="flex justify-center items-center gap-4">
                    <span className="text-sm text-gray-400">
                        Global User: {globalUser.id}
                    </span>
                    <div className="flex gap-2">
                        {users?.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => setGlobalUser(user)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    globalUser.id === user.id
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                }`}
                            >
                                {user.id}
                            </button>
                        ))}
                    </div>
                </div>
            )
        }
    })

export const appSupplier = market.offer("app").asProduct({
    justInTime: [SelectGlobalUserSupplier, feedSupplier],
    factory: ($, $$) => {
        const globalUserState = useState()
        return (
            <div className="min-h-screen bg-gray-900 text-white p-6">
                <div className="max-w-2xl mx-auto">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-center mb-4">
                            Social Feed Wireframe
                        </h1>
                        {$$[SelectGlobalUserSupplier.name]
                            .assemble(
                                index(
                                    globalUserStateResource.pack(
                                        globalUserState
                                    )
                                )
                            )
                            .unpack()}
                    </header>
                    {$(feedSupplier)}
                </div>
            </div>
        )
    }
})
