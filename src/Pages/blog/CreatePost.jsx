import { useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { useAuth } from "../../context/AuthContext";

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { isLoggedIn, accessToken, userEmail } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLoggedIn || userEmail !== "sheaklipper@gmail.com") {
      alert("Only Shea can post.");
      return;
    }

    try {
      await axiosInstance.post(
        "/blog",
        { title, content },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      alert("Post created!");
      setTitle("");
      setContent("");
    } catch (err) {
      console.error("Error creating post:", err);
      alert("Something went wrong while posting.");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Post</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          className="w-full border p-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Write your post..."
          className="w-full border p-2 rounded h-40"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">
          Post
        </button>
      </form>
    </div>
  );
}