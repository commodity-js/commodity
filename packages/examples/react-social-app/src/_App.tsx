import { useState } from "react"
import "./index.css"

// Simple working version without complex supplier patterns
function App() {
    const [globalUser, setGlobalUser] = useState("userA")
    const [postUsers, setPostUsers] = useState<Record<string, string>>({})

    const { data: posts, isLoading: postsLoading } = usePosts()
    const { data: users } = useUsers()

    if (postsLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-center mb-4">
                        Social Feed Wireframe
                    </h1>
                    <div className="flex justify-center items-center gap-4">
                        <span className="text-sm text-gray-400">
                            Global User: {globalUser}
                        </span>
                        <div className="flex gap-2">
                            {users?.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => setGlobalUser(user.id)}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                        globalUser === user.id
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                                >
                                    {user.id}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

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
            </div>
        </div>
    )
}

function PostWireframe({
    post,
    globalUser,
    postUser,
    onPostUserChange,
    users
}: {
    post: any
    globalUser: string
    postUser: string
    onPostUserChange: (userId: string) => void
    users: any[]
}) {
    return (
        <div className="border-2 border-purple-500 rounded-lg p-4 bg-gray-800">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-purple-300">
                    📝 Post: {post.id}
                </h3>
                <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400">
                        Post User: {postUser}
                    </span>
                    <div className="flex gap-1">
                        {users.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => onPostUserChange(user.id)}
                                className={`px-2 py-1 rounded text-xs transition-colors ${
                                    postUser === user.id
                                        ? "bg-purple-600 text-white"
                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                }`}
                            >
                                {user.id}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {post.comments.map((comment: any) => (
                    <CommentWireframe
                        key={comment.id}
                        comment={comment}
                        postId={post.id}
                        currentUser={postUser}
                    />
                ))}
            </div>
        </div>
    )
}

function CommentWireframe({
    comment,
    postId,
    currentUser
}: {
    comment: any
    postId: string
    currentUser: string
}) {
    return (
        <div className="border-2 border-green-500 rounded-lg p-3 bg-gray-800 ml-4">
            <h4 className="text-md font-medium text-green-300 mb-2">
                💬 Comment: {comment.id}
            </h4>

            <div className="space-y-2">
                {comment.replies.map((reply: any) => (
                    <ReplyWireframe
                        key={reply.id}
                        reply={reply}
                        postId={postId}
                        currentUser={currentUser}
                    />
                ))}
            </div>
        </div>
    )
}

function ReplyWireframe({
    reply,
    postId,
    currentUser
}: {
    reply: any
    postId: string
    currentUser: string
}) {
    const [showDetails, setShowDetails] = useState(false)

    return (
        <div className="border-2 border-orange-500 rounded-lg p-2 bg-gray-800 ml-6">
            <div className="flex justify-between items-center">
                <h5 className="text-sm font-medium text-orange-300">
                    💭 Reply: {reply.id}
                </h5>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                >
                    {showDetails ? "Hide" : "Show"} Details
                </button>
            </div>

            {showDetails && (
                <div className="mt-2 p-2 bg-gray-700 rounded text-xs">
                    <div className="space-y-1 text-gray-300">
                        <div>
                            👤 Current User:{" "}
                            <span className="text-orange-300">
                                {currentUser}
                            </span>
                        </div>
                        <div>
                            📄 Current Post:{" "}
                            <span className="text-purple-300">{postId}</span>
                        </div>
                        <div>
                            💬 Comment:{" "}
                            <span className="text-green-300">
                                {reply.commentId}
                            </span>
                        </div>
                        <div>
                            💭 Reply:{" "}
                            <span className="text-orange-300">{reply.id}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
