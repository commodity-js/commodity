import { market } from "@/market"
import { $$usersQuery } from "@/api"
import { ctx } from "@/context"
import { useQuery } from "@tanstack/react-query"

export const $$SelectSession = market.offer("SelectSession").asProduct({
    suppliers: [$$usersQuery, ctx.$$session],
    optionals: [ctx.$$post],
    factory: ($) => () => {
        const [session, setSession] = $(ctx.$$session).unpack()
        const { data: users } = useQuery($($$usersQuery).unpack())
        const post = $(ctx.$$post)?.unpack()

        if (!users) {
            return <div>Loading users...</div>
        }
        return (
            <div className="flex flex-col justify-center items-center gap-2">
                <div className="flex justify-center items-center gap-4">
                    <span className="text-sm text-gray-400">
                        Session: {session.id}
                    </span>
                    <div className="flex gap-2">
                        {users?.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => setSession(user)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    session.id === user.id
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                }`}
                            >
                                {user.id}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Only shows in posts, which is enabled by the optional suppliers feature */}
                {post && (
                    <p className="text-xs text-gray-500">
                        Silly and pointless session switcher to show context
                        switching
                    </p>
                )}
            </div>
        )
    }
})
