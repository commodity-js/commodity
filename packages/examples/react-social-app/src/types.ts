// Simple wireframe types with minimal IDs
export interface User {
    id: string
}

export interface Post {
    id: string
    comments: Comment[]
}

export interface Comment {
    id: string
    postId: string
    replies: Reply[]
}

export interface Reply {
    id: string
    commentId: string
    postId: string
}
