import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import SheasRamblingIdeas from "./Pages/SheasRamblingIdeas";
import Signup from "./Pages/Signup";
import Login from "./Pages/Login";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import SmartJournal from "./Pages/SmartJournal";
import PrivateRoute from "./components/PrivateRoute";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<App />} />
            <Route path="sheas-rambling-ideas" element={<SheasRamblingIdeas />} />
            <Route path="signup" element={<Signup />} />
            <Route path="login" element={<Login />} />
            <Route
              path="smartjournal"
              element={
                <PrivateRoute>
                  <SmartJournal />
                </PrivateRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);