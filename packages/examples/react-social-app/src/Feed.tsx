import { useState } from "react"
import { market } from "./market"
import { usePostsSupplier, useUsersSupplier } from "@/api"

export const feedSupplier = market.offer("feed").asProduct({
    suppliers: [usePostsSupplier],
    factory: ($) => {
        const { data: posts } = $(usePostsSupplier)

        return (
            <div className="space-y-6">
                {posts?.map((post) => (
                    <PostWireframe
                        key={post.id}
                        post={post}
                        globalUser={globalUser}
                        postUser={postUsers[post.id] || globalUser}
                        onPostUserChange={(userId) =>
                            setPostUsers((prev) => ({
                                ...prev,
                                [post.id]: userId
                            }))
                        }
                        users={users || []}
                    />
                ))}
            </div>
        )
    }
})
