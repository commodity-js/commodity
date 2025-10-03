import { commentsQuerySupplier, usersQuerySupplier } from "@/api";
import { market } from "@/market";
import type { Comment } from "@/api";
import { useState } from "react";
import { CommentSupplier } from "@/components/comment";
import { index } from "commodity";
import { ctx } from "@/context";
import { useQuery } from "@tanstack/react-query";

export const PostSupplier = market.offer("Post").asProduct({
  suppliers: [
    ctx.postSupplier,
    ctx.sessionSupplier,
    usersQuerySupplier,
    commentsQuerySupplier,
    CommentSupplier,
  ],
  factory: ($, $$) => () => {
    const post = $(ctx.postSupplier);
    const [session] = $(ctx.sessionSupplier);
    const { data: users } = useQuery($(usersQuerySupplier));
    const { data: comments } = useQuery($(commentsQuerySupplier)(post.id));
    const [postSession, setPostSession] = useState(session);

    if (!users || !comments) {
      return <div>Loading users or comments...</div>;
    }

    const Comment = $[CommentSupplier.name]
      .reassemble(
        index(ctx.sessionSupplier.pack([postSession, setPostSession]))
      )
      .unpack();

    return (
      <div className="border-2 border-purple-500 rounded-lg p-4 bg-gray-800">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-purple-300">
            📝 Post: {post.id}
          </h3>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400">
              Post User: {postSession.id}
            </span>
            <div className="flex gap-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setPostSession(user)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    postSession.id === user.id
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
          {comments.map((comment: Comment) => (
            <Comment key={comment.id} comment={comment} />
          ))}
        </div>
      </div>
    );
  },
});
