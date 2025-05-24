// src/pages/Login.jsx
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { useAuth } from "../context/AuthContext";

const API_URL = "https://shea-klipper-backend.onrender.com";
const RECAPTCHA_SITE_KEY = "6LeICxYrAAAAANn97Wz-rx1oCT9FkKMNQpAya_gv";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [error, setError] = useState("");
  const recaptchaRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth(); // ✅ import from AuthContext

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
    setError("");
  };

  const handleLogin = async () => {
    if (!captchaToken) {
      setError("Please verify you are not a robot.");
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("grant_type", "password");
      formData.append("username", email.trim());
      formData.append("password", password.trim());
      formData.append("scope", "");
      formData.append("client_id", "");
      formData.append("client_secret", "");
      formData.append("recaptcha_token", captchaToken);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const responseBody = await response.json();

      if (!response.ok) {
        setError(responseBody.detail || "Invalid login credentials");
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }

      login(responseBody.access_token); // ✅ update AuthContext + Layout
      navigate("/");
    } catch (err) {
      console.error("❌ Login error:", err);
      setError("An error occurred while logging in.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white text-black">
      <h2 className="text-3xl font-semibold mb-4">Login to PneumEvolve</h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}

      <input
        type="email"
        placeholder="Email"
        className="p-2 border rounded w-full max-w-xs mb-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="p-2 border rounded w-full max-w-xs mb-4"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={RECAPTCHA_SITE_KEY}
        onChange={handleCaptchaChange}
        className="mb-4"
      />

      <button
        onClick={handleLogin}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Login
      </button>

      <p className="mt-4 text-sm">
        Don’t have an account?{" "}
        <span
          onClick={() => navigate("/signup")}
          className="text-blue-500 cursor-pointer underline"
        >
          Sign up here
        </span>
      </p>
    </div>
  );
}