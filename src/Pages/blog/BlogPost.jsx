import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
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
  }, [id]);

  const fetchPost = async () => {
    try {
      const res = await axiosInstance.get(`/blog/${id}`);
      setPost(res.data);
    } catch (err) {
      console.error("Failed to load post", err);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await axiosInstance.get(`/blog/${id}/comments`);
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
      await axiosInstance.post(
        `/blog/comment`,
        {
          post_id: parseInt(id),
          content: commentText,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
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
      await axiosInstance.delete(`/blog/${id}`, {
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
      await axiosInstance.delete(`/blog/comment/${commentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      fetchComments();
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  if (!post) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
      <p className="text-gray-500 mb-6">{new Date(post.created_at).toLocaleDateString()}</p>
      <p className="whitespace-pre-wrap">{post.content}</p>

      {userEmail === "sheaklipper@gmail.com" && (
        <div className="my-4 flex gap-4">
          <button
            onClick={() => navigate(`/blog/${id}/edit`)}
            className="px-3 py-1 bg-yellow-500 text-white rounded"
          >
            Edit
          </button>
          <button
            onClick={deletePost}
            className="px-3 py-1 bg-red-600 text-white rounded"
          >
            Delete
          </button>
        </div>
      )}

      <div className="mt-10 pt-6 border-t">
        <h2 className="text-lg font-semibold mb-2">Comments</h2>

        <form onSubmit={handleComment} className="mb-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="w-full p-2 border rounded mb-2"
            required
          />
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
            Post Comment
          </button>
        </form>

        <ul>
          {comments.map((c) => (
            <li key={c.id} className="mb-2 border-b pb-2">
              <p>{c.content}</p>
              <p className="text-sm text-gray-500">{new Date(c.created_at).toLocaleString()}</p>
              {userEmail === "sheaklipper@gmail.com" && (
                <button
                  onClick={() => deleteComment(c.id)}
                  className="text-red-600 text-sm mt-1"
                >
                  Delete Comment
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}