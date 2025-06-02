// src/pages/Signup.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { useAuth } from "../context/AuthContext";

const API_URL = "https://shea-klipper-backend.onrender.com";
const RECAPTCHA_SITE_KEY = "6LeICxYrAAAAANn97Wz-rx1oCT9FkKMNQpAya_gv";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [error, setError] = useState("");
  const recaptchaRef = useRef(null);
  const navigate = useNavigate();
  const { login, isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
    setError("");
  };

  const handleSignup = async () => {
  if (!captchaToken) {
    setError("Please verify you are not a robot.");
    return;
  }

  try {
    const signupRes = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password: password.trim(),
        recaptcha_token: captchaToken,
      }),
    });

    if (!signupRes.ok) {
      const data = await signupRes.json();
      throw new Error(data.detail || "Signup failed");
    }

    // ✅ Success! Redirect to login
    navigate("/login?justSignedUp=true");

  } catch (err) {
    console.error("❌ Signup error:", err);
    setError(err.message);
    recaptchaRef.current?.reset();
    setCaptchaToken(null);
  }
};

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white text-black">
      <h2 className="text-3xl font-semibold mb-4">Create Your PneumEvolve Account</h2>
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
        onClick={handleSignup}
        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
      >
        Sign Up
      </button>

      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <span
          onClick={() => navigate("/login")}
          className="text-blue-500 cursor-pointer underline"
        >
          Log in here
        </span>
      </p>
    </div>
  );
}