import { $$commentsQuery, $$usersQuery } from "@/api"
import { market } from "@/market"
import type { Comment } from "@/api"
import { useState } from "react"
import { $$Comment } from "@/components/comment"
import { index } from "commodity"
import { ctx } from "@/context"
import { useQuery } from "@tanstack/react-query"
import { $$SelectSession } from "./session"

export const $$Post = market.offer("Post").asProduct({
    suppliers: [
        ctx.$$post,
        ctx.$$session,
        $$usersQuery,
        $$commentsQuery,
        $$Comment,
        $$SelectSession
    ],
    factory: ($) => () => {
        const post = $(ctx.$$post)
        const [session] = $(ctx.$$session)
        const { data: users } = useQuery($($$usersQuery))
        const { data: comments } = useQuery($($$commentsQuery)(post.id))
        const [postSession, setPostSession] = useState(session)

        if (!users || !comments) {
            return <div>Loading users or comments...</div>
        }

        const newCtx = index(
            ctx.$$session.pack([postSession, setPostSession]),
            $[ctx.$$post.name]
        )

        const Comment = $[$$Comment.name].reassemble(newCtx).unpack()

        const SelectSession = $[$$SelectSession.name]
            .reassemble(newCtx)
            .unpack()

        return (
            <div className="border-2 border-purple-500 rounded-lg p-4 bg-gray-800">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-purple-300">
                        📝 Post: {post.id}
                    </h3>
                    <SelectSession />
                </div>

                <div className="space-y-3">
                    {comments.map((comment: Comment) => (
                        <Comment key={comment.id} comment={comment} />
                    ))}
                </div>
            </div>
        )
    }
})
