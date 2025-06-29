import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const email = localStorage.getItem("user_email");


export default function BlogPost() {
  const navigate = useNavigate();
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

      {email === "sheaklipper@gmail.com" && (
  <div className="my-4 flex gap-4">
    <button
      onClick={() => navigate(`/blog/${id}/edit`)}
      className="px-3 py-1 bg-yellow-500 text-white rounded"
    >
      Edit
    </button>
    <button
      onClick={async () => {
        const token = localStorage.getItem("token");
        const confirmed = confirm("Delete this post?");
        if (!confirmed) return;
        await axios.delete(`${API}/blog/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Deleted");
        navigate("/blog");
      }}
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
  {email === "sheaklipper@gmail.com" && (
    <button
      onClick={async () => {
        const token = localStorage.getItem("token");
        await axios.delete(`${API}/blog/comment/${c.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const res = await axios.get(`${API}/blog/${id}/comments`);
        setComments(res.data);
      }}
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