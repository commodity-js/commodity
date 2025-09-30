import { postsQuerySupplier } from "@/api"
import { market } from "@/market"
import { PostSupplier } from "@/components/post"
import { ctx } from "@/context"
import { index } from "commodity"
import { useQuery } from "@tanstack/react-query"

export const FeedSupplier = market.offer("Feed").asProduct({
    suppliers: [postsQuerySupplier, ctx.sessionSupplier],
    justInTime: [ctx.postSupplier, PostSupplier],
    factory: ($, $$) => () => {
        const { data: posts } = useQuery($(postsQuerySupplier))

        if (!posts) {
            return <div>Loading posts...</div>
        }

        return (
            <div className="space-y-6">
                {posts.map((post) => {
                    const Post = $$[PostSupplier.name]
                        .assemble({
                            ...$,
                            ...index($$[ctx.postSupplier.name].pack(post))
                        })
                        .unpack()
                    return <Post key={post.id} />
                })}
            </div>
        )
    }
})
