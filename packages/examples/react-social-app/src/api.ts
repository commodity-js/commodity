import { market } from "@/market"
import { queryClient } from "@/query"

// Simulate API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Simple wireframe types with minimal IDs
export interface User {
    id: string
}

export interface Post {
    id: string
}

export interface Comment {
    id: string
    postId: string
}

export interface Reply {
    id: string
    commentId: string
}

// Mock data with simple IDs
export const mockUsers = [
    { id: "userA" },
    { id: "userB" },
    { id: "userC" }
] as const

export const mockPosts = [
    { id: "postA" },
    { id: "postB" },
    { id: "postC" },
    { id: "postD" }
] as const

export const mockComments = [
    { id: "commentA1", postId: "postA" },
    { id: "commentA2", postId: "postA" },
    { id: "commentB1", postId: "postB" },
    { id: "commentC1", postId: "postC" },
    { id: "commentC2", postId: "postC" },
    { id: "commentD1", postId: "postD" }
] as const

export const mockReplies = [
    { id: "replyA1a", commentId: "commentA1" },
    { id: "replyA1b", commentId: "commentA1" },
    { id: "replyA2a", commentId: "commentA2" },
    { id: "replyB1a", commentId: "commentB1" },
    { id: "replyC1a", commentId: "commentC1" },
    { id: "replyC1b", commentId: "commentC1" }
] as const

// Simulates an api that offers populated query results
const populatedPosts = mockPosts.map((post) => {
    const comments = mockComments
        .filter((comment) => comment.postId === post.id)
        .map((comment) => {
            const replies = mockReplies.filter(
                (reply) => reply.commentId === comment.id
            )
            return {
                ...comment,
                replies: [...replies]
            }
        })
    return {
        ...post,
        comments: [...comments]
    }
})

// React Query hooks

export const userQuerySupplier = market.offer("userQuery").asProduct({
    factory: () => (id: string) => {
        return {
            queryKey: ["user", id],
            queryFn: async () => {
                await delay(1000)
                const user = mockUsers.find((user) => user.id === id)
                if (!user) {
                    throw new Error(`User with id ${id} not found`)
                }
                return user
            }
        }
    }
})
export const usersQuerySupplier = market.offer("usersQuery").asProduct({
    suppliers: [userQuerySupplier],
    factory: () => {
        return {
            queryKey: ["users"],
            queryFn: async () => {
                await delay(1000)
                return mockUsers
            }
        }
    },
    init: async (query, $) => {
        const users = await queryClient.fetchQuery(query)
        for (const user of users) {
            queryClient.setQueryData(
                $(userQuerySupplier)(user.id).queryKey,
                user
            )
        }
    }
})

export const repliesQuerySupplier = market.offer("repliesQuery").asProduct({
    factory: () => (commentId: string) => {
        return {
            queryKey: ["replies", commentId],
            queryFn: async () => {
                await delay(1000)
                return mockReplies.filter(
                    (reply) => reply.commentId === commentId
                )
            }
        }
    }
})

export const commentsQuerySupplier = market.offer("commentsQuery").asProduct({
    suppliers: [repliesQuerySupplier],
    factory: () => (postId: string) => {
        return {
            queryKey: ["comments", postId],
            queryFn: async () => {
                await delay(1000)
                return mockComments.filter(
                    (comment) => comment.postId === postId
                )
            }
        }
    }
})

export const postsQuerySupplier = market.offer("postsQuery").asProduct({
    suppliers: [commentsQuerySupplier, repliesQuerySupplier],
    factory: () => {
        return {
            queryKey: ["posts"],
            queryFn: async () => {
                await delay(1000)
                return populatedPosts
            }
        }
    },
    init: async (query, $) => {
        const posts = await queryClient.fetchQuery(query)
        for (const post of posts) {
            queryClient.setQueryData(
                $(commentsQuerySupplier)(post.id).queryKey,
                post.comments
            )

            for (const comment of post.comments) {
                queryClient.setQueryData(
                    $(repliesQuerySupplier)(comment.id).queryKey,
                    comment.replies
                )
            }
        }
    }
})
