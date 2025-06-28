import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function BlogPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    axios.get(`${API}/blog/${id}`).then(res => setPost(res.data));
    axios.get(`${API}/blog/${id}/comments`).then(res => setComments(res.data));
  }, [id]);

  const handleComment = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return alert("Sign in required to comment.");

    await axios.post(`${API}/blog/comment`, {
      post_id: parseInt(id),
      content: commentText
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setCommentText("");
    const res = await axios.get(`${API}/blog/${id}/comments`);
    setComments(res.data);
  };

  if (!post) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
      <p className="text-gray-500 mb-6">{new Date(post.created_at).toLocaleDateString()}</p>
      <p className="whitespace-pre-wrap">{post.content}</p>

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
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}