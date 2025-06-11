import React from "react";
import { Helmet } from "react-helmet";
import { Button } from "../components/ui/button";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

const ZenFreeskates = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6 flex flex-col items-center justify-center space-y-10">
      {/* SEO Meta Tags */}
      <Helmet>
        <title>Zen Freeskates | Learn to Freeskate in Vernon BC | PneumEvolve</title>
        <meta
          name="description"
          content="Join Zen Freeskates – Free lessons at Polson Park Skatepark in Vernon, BC. Flow with freedom and learn freeskating with Shea. Limited time offer!"
        />
        <meta property="og:title" content="Zen Freeskates | Vernon, BC" />
        <meta property="og:description" content="Free Freeskating lessons at Polson Park Skatepark – Email to book!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pneumevolve.com/zen-freeskates" />
      </Helmet>

      <div className="max-w-3xl text-center space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tight">Zen Freeskates</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Flow with freedom. Move with purpose. Discover the art of freeskating.
        </p>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Email me now for <span className="font-bold">FREE</span> freeskating lessons – limited time offer!
        </p>
      </div>

      <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-lg">
        <iframe
          className="w-full h-full"
          src="https://www.youtube.com/embed/2-k4j-guLNk?si=LkYXxZKs_1hy87kg"
          title="Intro to Freeskating"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">Local To Vernon, BC and Want to Learn?</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Free lessons at <span className="font-bold">Polson Park Skatepark</span>. Email to set up a time:
        </p>
        <a
          href="mailto:sheaklipper@gmail.com"
          className="inline-flex items-center space-x-2 text-blue-500 hover:underline"
        >
          <Mail className="w-5 h-5" />
          <span>sheaklipper@gmail.com</span>
        </a>
        <div>
          <Button className="mt-4" asChild>
            <Link to="/">Return to PneumEvolve</Link>
          </Button>
        </div>
      </div>

      <div className="text-sm text-gray-400 mt-10">
        Follow on TikTok: <span className="font-semibold">@pneumevolve</span> (link coming soon)
      </div>
    </div>
  );
};

export default ZenFreeskates;