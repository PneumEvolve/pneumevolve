import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"; // Use env var for backend

export default function BlogHome() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    axios.get(`${API}/blog`)
      .then(res => setPosts(res.data))
      .catch(err => console.error("Error fetching blog posts", err));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      {posts.map(post => (
        <div key={post.id} className="mb-6 border-b pb-4">
          <Link to={`/blog/${post.id}`} className="text-xl font-semibold text-blue-600 hover:underline">
            {post.title}
          </Link>
          <p className="text-sm text-gray-500">{new Date(post.created_at).toLocaleDateString()}</p>
          <p className="mt-2">{post.content.slice(0, 100)}...</p>
        </div>
      ))}
    </div>
  );
}