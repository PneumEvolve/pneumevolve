import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { useAuth } from "../../context/AuthContext";

export default function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { isLoggedIn, accessToken, userEmail } = useAuth();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axiosInstance.get(`/blog/${id}`);
        setTitle(res.data.title);
        setContent(res.data.content);
      } catch (err) {
        console.error("Failed to load post", err);
        alert("Error loading post.");
        navigate("/blog");
      }
    };

    fetchPost();
  }, [id, navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!isLoggedIn || userEmail !== "sheaklipper@gmail.com") {
      alert("Only Shea can edit posts.");
      return;
    }

    try {
      await axiosInstance.put(
        `/blog/${id}`,
        { title, content },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      alert("Post updated!");
      navigate(`/blog/${id}`);
    } catch (err) {
      console.error("Update failed", err);
      alert("Unauthorized or error updating.");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Post</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          className="w-full border p-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Update content..."
          className="w-full border p-2 rounded h-40"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          Save Changes
        </button>
      </form>
    </div>
  );
}