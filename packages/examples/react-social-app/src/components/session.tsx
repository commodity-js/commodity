import { market } from "@/market"
import { usersQuerySupplier } from "@/api"
import { ctx } from "@/context"
import { useQuery } from "@tanstack/react-query"
export const SelectSessionSupplier = market.offer("SelectSession").asProduct({
    suppliers: [usersQuerySupplier, ctx.sessionSupplier],
    factory: ($) => () => {
        const [session, setSession] = $(ctx.sessionSupplier)
        const { data: users } = useQuery($(usersQuerySupplier))
        if (!users) {
            return <div>Loading users...</div>
        }
        return (
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
        )
    }
})
