import { commentsQuerySupplier, usersQuerySupplier } from "@/api"
import { market } from "@/market"
import type { Comment } from "@/api"
import { useState } from "react"
import { CommentSupplier } from "@/components/comment"
import { index } from "commodity"
import { ctx } from "@/context"
import { useQuery } from "@tanstack/react-query"
import { SelectSessionSupplier } from "./session"

export const PostSupplier = market.offer("Post").asProduct({
    suppliers: [
        ctx.postSupplier,
        ctx.sessionSupplier,
        usersQuerySupplier,
        commentsQuerySupplier,
        CommentSupplier,
        SelectSessionSupplier
    ],
    factory: ($) => () => {
        const post = $(ctx.postSupplier)
        const [session] = $(ctx.sessionSupplier)
        const { data: users } = useQuery($(usersQuerySupplier))
        const { data: comments } = useQuery($(commentsQuerySupplier)(post.id))
        const [postSession, setPostSession] = useState(session)

        if (!users || !comments) {
            return <div>Loading users or comments...</div>
        }

        const sessionSupply = index(
            ctx.sessionSupplier.pack([postSession, setPostSession])
        )
        const Comment = $[CommentSupplier.name]
            .reassemble(sessionSupply)
            .unpack()

        const SelectSession = $[SelectSessionSupplier.name]
            .reassemble(sessionSupply)
            .unpack()

        return (
            <div className="border-2 border-purple-500 rounded-lg p-4 bg-gray-800">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-purple-300">
                        📝 Post: {post.id}
                    </h3>
                    <SelectSession inPost />
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
