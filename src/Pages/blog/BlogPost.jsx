import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "../../context/AuthContext";

export default function BlogPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, userEmail, accessToken } = useAuth();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    fetchPost();
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPost = async () => {
    try {
      const res = await api.get(`/blog/${id}`);
      setPost(res.data);
    } catch (err) {
      console.error("Failed to load post", err);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`/blog/${id}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error("Failed to load comments", err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert("Sign in required to comment.");
      return;
    }
    try {
      await api.post(
        `/blog/comment`,
        { post_id: parseInt(id, 10), content: commentText },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setCommentText("");
      fetchComments();
    } catch (err) {
      console.error("Error posting comment:", err);
      alert("Failed to post comment.");
    }
  };

  const deletePost = async () => {
    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) return;
    try {
      await api.delete(`/blog/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      alert("Deleted");
      navigate("/blog");
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post.");
    }
  };

  const deleteComment = async (commentId) => {
    try {
      await api.delete(`/blog/comment/${commentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      fetchComments();
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  if (!post) return <div className="main"><div className="card">Loading…</div></div>;

  return (
    <div className="main space-y-6">
      {/* Post card */}
      <article className="card">
        <h1 className="text-2xl font-bold mb-1">{post.title}</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          {new Date(post.created_at).toLocaleDateString()}
        </p>
        <div className="whitespace-pre-wrap opacity-90" style={{ color: "var(--text)" }}>
          {post.content}
        </div>

        {userEmail === "sheaklipper@gmail.com" && (
          <div className="my-4 flex gap-3">
            <button
              onClick={() => navigate(`/blog/${id}/edit`)}
              className="btn btn-secondary"
            >
              Edit
            </button>
            <button onClick={deletePost} className="btn btn-danger">
              Delete
            </button>
          </div>
        )}
      </article>

      {/* Comments */}
      <section className="card">
        <h2 className="text-lg font-semibold mb-3">Comments</h2>

        <form onSubmit={handleComment} className="mb-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full h-24 mb-2"
            required
          />
          <button type="submit" className="btn">Post Comment</button>
        </form>

        <ul>
          {comments.map((c) => (
            <li
              key={c.id}
              className="pb-2 mb-2"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <p className="whitespace-pre-wrap">{c.content}</p>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                {new Date(c.created_at).toLocaleString()}
              </p>
              {userEmail === "sheaklipper@gmail.com" && (
                <button
                  onClick={() => deleteComment(c.id)}
                  className="btn btn-secondary mt-1"
                >
                  Delete Comment
                </button>
              )}
            </li>
          ))}
          {comments.length === 0 && (
            <li style={{ color: "var(--muted)" }}>No comments yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}