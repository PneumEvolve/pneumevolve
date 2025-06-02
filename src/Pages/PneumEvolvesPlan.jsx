import React from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const PlanSection = ({ title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    viewport={{ once: true }}
  >
    <Card className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <CardContent>
        <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-100">{title}</h2>
        <div className="text-gray-700 dark:text-gray-300 space-y-4 text-lg">{children}</div>
      </CardContent>
    </Card>
  </motion.div>
);

const PneumEvolvePlan = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-10 p-6 md:p-10">
      <motion.h1
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-5xl font-bold text-center text-gray-900 dark:text-white"
      >
        The Plan for PneumEvolve
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
      >
        A prototype operating system for decentralized, feedback-driven, community evolution.
      </motion.p>

      <PlanSection title="Why We’re Building PneumEvolve">
        <p>The systems we live under weren’t built for sovereign, conscious beings. PneumEvolve is an experimental platform designed to support human agency, adaptive cooperation, and regenerative living—through modular, open-source tools.</p>
      </PlanSection>

      <PlanSection title="PneumEvolve Protocol v1 (Core Values)">
        <ul className="list-disc list-inside ml-4">
          <li>Voluntary Participation</li>
          <li>Radical Transparency</li>
          <li>Feedback-Driven Evolution</li>
          <li>Local-First Organization</li>
          <li>Ownership Without Domination</li>
        </ul>
      </PlanSection>

      <PlanSection title="Phase 1: Core Tools">
        <p><strong>Smart Journal – “I AM”:</strong> AI-assisted journaling for internal reflection and belief mapping.</p>
        <p><strong>WeTalk:</strong> A forum for open conversation, uncensored and community-guided.</p>
        <p><strong>WeChoose:</strong> A transparent, forkable direct-vote tool for collective decision-making.</p>
        <p><strong>WeDream:</strong> A space for submitting intentions and dreams, synthesized into shared reflections by AI.</p>
      </PlanSection>

      <PlanSection title="Phase 2: Local Node Experiments">
        <p>Small pods of 5–50 people test tools in real-life situations: food sharing, group governance, emotional support, and more. This allows us to gather ethical, anonymous data and iterate effectively.</p>
      </PlanSection>

      <PlanSection title="Phase 3: Network of Pods">
        <p>Pods can collaborate, exchange tools, ideas, or governance recipes. Mesh-like community webs emerge, adapting to needs and local conditions. Open-source infrastructure evolves with community feedback.</p>
      </PlanSection>

      <PlanSection title="What’s Active Now">
        <ul className="list-disc list-inside ml-4">
          <li><strong>✅ Smart Journal (test version live)</strong></li>
          <li><strong>✅ Forum (WeTalk prototype active)</strong></li>
          <li><strong>⏳ WeDream (in development)</strong></li>
          <li><strong>🔲 Node system (planned)</strong></li>
        </ul>
      </PlanSection>

      <PlanSection title="How to Get Involved">
        <p>PneumEvolve is a living project. You can:</p>
        <ul className="list-disc list-inside ml-4">
          <li>Try out a tool and share feedback</li>
          <li>Join or start a local pod</li>
          <li>Suggest improvements or fork ideas</li>
          <li>Contribute technically, creatively, or structurally</li>
        </ul>
        <div className="flex justify-center">
          <Link to="/signup">
            <Button className="mt-6 text-lg px-6 py-3 rounded-xl">Join the Movement</Button>
          </Link>
        </div>
      </PlanSection>
    </div>
  );
};

export default PneumEvolvePlan;
