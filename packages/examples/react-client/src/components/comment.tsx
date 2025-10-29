import { $$repliesQuery } from "@/api"
import { market } from "@/market"
import { type Comment, type Reply } from "@/api"
import { $$Reply } from "@/components/reply"
import { useQuery } from "@tanstack/react-query"

export const $$Comment = market.offer("Comment").asProduct({
    suppliers: [$$repliesQuery, $$Reply],
    factory:
        ($) =>
        ({ comment }: { comment: Comment }) => {
            const { data: replies } = useQuery(
                $($$repliesQuery).unpack()(comment.id)
            )
            if (!replies) {
                return <div>Loading replies...</div>
            }

            const Reply = $($$Reply).unpack()

            return (
                <div className="border-2 border-green-500 rounded-lg p-3 bg-gray-800 ml-4">
                    <h4 className="text-md font-medium text-green-300 mb-2">
                        💬 Comment: {comment.id}
                    </h4>

                    <div className="space-y-2">
                        {replies.map((reply: Reply) => (
                            <Reply key={reply.id} reply={reply} />
                        ))}
                    </div>
                </div>
            )
        }
})
