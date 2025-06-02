import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const AccountPage = () => {
  const [form, setForm] = useState({
    username: "",
    resources: "",
    skills: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    // Connect this to backend update logic
    console.log("Saving account info:", form);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <h1 className="text-4xl font-bold text-center">Account Settings</h1>
      <Card>
        <CardContent className="space-y-4 p-6">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            className="w-full p-3 border rounded-md"
          />
          <input
            type="text"
            name="resources"
            placeholder="Your Resources (e.g. land, tools, funds)"
            value={form.resources}
            onChange={handleChange}
            className="w-full p-3 border rounded-md"
          />
          <input
            type="text"
            name="skills"
            placeholder="Your Skills (e.g. coding, gardening, facilitation)"
            value={form.skills}
            onChange={handleChange}
            className="w-full p-3 border rounded-md"
          />
          <Button onClick={handleSave}>Save Info</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountPage;
