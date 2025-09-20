import { useQuery } from "@tanstack/react-query"
import { type User } from "./types"
import { market } from "./market"

// Simulate API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Mock data with simple IDs
export const mockUsers: User[] = [
    { id: "userA" },
    { id: "userB" },
    { id: "userC" }
]

export const mockPosts = [
    { id: "postA" },
    { id: "postB" },
    { id: "postC" },
    { id: "postD" }
]

export const mockComments = [
    { id: "commentA1", postId: "postA" },
    { id: "commentA2", postId: "postA" },
    { id: "commentB1", postId: "postB" },
    { id: "commentC1", postId: "postC" },
    { id: "commentC2", postId: "postC" },
    { id: "commentD1", postId: "postD" }
]

export const mockReplies = [
    { id: "replyA1a", commentId: "commentA1" },
    { id: "replyA1b", commentId: "commentA1" },
    { id: "replyA2a", commentId: "commentA2" },
    { id: "replyB1a", commentId: "commentB1" },
    { id: "replyC1a", commentId: "commentC1" },
    { id: "replyC1b", commentId: "commentC1" }
]
// React Query hooks

export const useUsersSupplier = market.offer("useUsers").asProduct({
    factory: () => {
        return useQuery({
            queryKey: ["users"],
            queryFn: async () => {
                await delay(300)
                return mockUsers
            }
        })
    }
})

export const usePostsSupplier = market.offer("usePosts").asProduct({
    factory: () => {
        return useQuery({
            queryKey: ["posts"],
            queryFn: async () => {
                await delay(500)
                return mockPosts
            }
        })
    }
})

export const useCommentsSupplier = market.offer("useComments").asProduct({
    factory: () => {
        return useQuery({
            queryKey: ["comments"],
            queryFn: async () => {
                await delay(700)
                return mockComments
            }
        })
    }
})

export const useRepliesSupplier = market.offer("useReplies").asProduct({
    factory: () => {
        return useQuery({
            queryKey: ["replies"],
            queryFn: async () => {
                await delay(800)
                return mockReplies
            }
        })
    }
})
