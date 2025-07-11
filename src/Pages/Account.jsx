import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API = import.meta.env.VITE_API_URL;

const Account = () => {
  const { accessToken, userId } = useAuth();
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const res = await axios.get(`${API}/auth/account/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setUsername(res.data.username || "");
        setCurrentUsername(res.data.username || "");
        setBio(res.data.bio || ""); // Placeholder
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch account info:", err);
        setLoading(false);
      }
    };

    if (accessToken) fetchAccount();
  }, [accessToken]);

  const handleUpdateUsername = async () => {
    try {
      const res = await axios.put(
        `${API}/auth/account/username`,
        { username },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      setCurrentUsername(res.data.username);
      setStatus("Username updated!");
    } catch (err) {
      console.error("Failed to update username:", err);
      setStatus("Update failed.");
    }
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    setProfilePic(file);
    // Later: upload to backend or cloud
  };

  if (loading) return <div className="p-6">Loading account...</div>;

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">🧑 Account Settings</h1>

      {/* Profile Picture Placeholder */}
      <div className="space-y-2">
        <label className="block font-medium">Profile Picture Coming Soon Maybe</label>
        <input type="file" accept="image/*" onChange={handleProfilePicChange} />
        {profilePic && <p className="text-sm text-gray-600">Selected: {profilePic.name}</p>}
      </div>

      {/* Username */}
      <div className="space-y-2">
        <label className="block font-medium">Username</label>
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter new username"
        />
        <Button onClick={handleUpdateUsername} disabled={username === currentUsername}>
          Update Username - WORKS!
        </Button>
        {status && <p className="text-sm text-gray-600">{status}</p>}
      </div>

      {/* Bio Placeholder */}
      <div className="space-y-2">
        <label className="block font-medium">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Saving to database coming soon..."
          rows={4}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      {/* Reset Password Placeholder */}
      <div className="pt-4">
        <Button variant="outline" onClick={() => alert("Password reset coming soon!")}>
          🔐 Reset Password - Coming Soon
        </Button>
      </div>
    </div>
  );
};

export default Account;