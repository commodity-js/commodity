import { $$postsQuery } from "@/api"
import { market } from "@/market"
import { $$Post } from "@/components/post"
import { ctx } from "@/context"
import { index } from "architype"
import { useQuery } from "@tanstack/react-query"

export const $$Feed = market.offer("Feed").asProduct({
    suppliers: [$$postsQuery, ctx.$$session],
    assemblers: [$$Post],
    factory: ($, $$) => () => {
        const { data: posts } = useQuery($($$postsQuery).unpack())
        if (!posts) {
            return <div>Loading posts...</div>
        }

        return (
            <div className="space-y-6">
                {posts.map((post) => {
                    const Post = $$($$Post)
                        .assemble(
                            index($(ctx.$$session), ctx.$$post.pack(post))
                        )
                        .unpack()
                    return <Post key={post.id} />
                })}
            </div>
        )
    }
})
