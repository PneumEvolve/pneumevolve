import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ErrorBoundary from "./pneumevolve-v2/components/ErrorBoundary.jsx";
import Home from "./Pages/Home.jsx";
import Forge from "./pneumevolve-v2/pages/Forge";
import ForgeIdeaDetail from "./pneumevolve-v2/pages/ForgeIdeaDetail.jsx"
import Problems from "./pneumevolve-v2/pages/Problems";
import ProblemDetail from "./pneumevolve-v2/pages/ProblemDetail.jsx"
import Messages from "@/components/dashboard/Messages.jsx"
import SpotlightArchive from "./Pages/SpotlightArchive.jsx"
import TokenLedger from "./pneumevolve-v2/pages/TokenLedger";
import DailyUse from "./pneumevolve-v2/pages/DailyUse";
import SiteMap from "./Pages/SiteMap";

import Adventure from "./Pages/onboarding/Adventure.jsx";
import Build from "./Pages/onboarding/Build.jsx";
import MyTree from "./Pages/onboarding/MyTree.jsx";
import Signup from "./Pages/Signup";
import Login from "./Pages/Login";
import Account from "./Pages/Account";
import ForgotPassword from "./Pages/ForgotPassword";
import ResetPassword from "./Pages/ResetPassword";
import SmartJournal from "./Pages/SmartJournal";
import Journal from "./Pages/Journal";
import MealPlanning from "./Pages/MealPlanning";
import CategoryManager from "./Pages/CategoryManager";
import FoodInventory from "./Pages/FoodInventory";
import Recipes from "./Pages/Recipes";
import GroceryList from "./Pages/GroceryList";
import ProjectList from "./Pages/ProjectList";
import ProjectDetail from "./Pages/ProjectDetail";
import BlogHome from "./Pages/blog/BlogHome";
import BlogPost from "./Pages/blog/BlogPost";
import CreatePost from "./Pages/blog/CreatePost";
import EditPost from "./Pages/blog/EditPost";
import CommunityList from "./Pages/CommunityList";
import Community from "./Pages/Community";
import DreamMachine from "./Pages/DreamMachine";
import WeDream from "./Pages/WeDream";
import GardenBlitz from "./Pages/GardenBlitz";
import GardenDirectory from "./Pages/GardenDirectory";
import GardenDetails from "./Pages/GardenDetails";
import ZenFreeskates from "./Pages/ZenFreeskates";
import Experiments from "./Pages/Experiments";
import TextGame from "./Pages/TextGame";
import Tarot from "./Pages/Tarot";
import Meditation from "./Pages/Meditation";
import WeChoose from "./Pages/WeChoose";
import WeLearn from "./Pages/WeLearn";
import WePlan from "./Pages/WePlan";
import WeGreen from "./Pages/WeGreen";
import WeHelp from "./Pages/WeHelp";
import WeDo from "./Pages/WeDo";
import GardenGame from "./Pages/gardengame/GardenGame.jsx";
import FarmGame from "./Pages/farmgame/FarmGame.jsx";
import LivingPlan from "./Pages/LivingPlan";
import NotesPage from "./Pages/NotesPage";
import ProblemPage from "./Pages/problemsolving/ProblemPage.jsx";

import AaronsPage from "./Pages/AaronsPage";
import { HelmetProvider } from 'react-helmet-async';
import "./index.css";

import { API_URL, ENV } from "@/lib/env";
import { api } from "@/lib/api"











function Root() {
  React.useEffect(() => {
    // one-shot sanity check
    api.get("/health")
      .then(r => console.log("[/health]", r.data))
      .catch(e => console.warn("[/health ERR]", e?.message));
  }, []);

  return (
    <React.StrictMode>
      <HelmetProvider>
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            
            <Route path="/" element={<Layout />}>
              {/* Used to have Conditional redirect to MyTree on first visit */}
              <Route index element={<Home />} />
              <Route path="/SiteMap" element={<SiteMap/>} />
              <Route path="Forge" element={<ErrorBoundary><Forge /></ErrorBoundary>} />
              <Route path="/forge/:id" element={<ForgeIdeaDetail />} />
              <Route path="/Problems" element={<Problems />} />
              <Route path="/problems/:id" element={<ProblemDetail />} />
              <Route path="/Messages" element={<Messages />} />
              <Route path="/spotlightarchive" element={<SpotlightArchive />} />
              <Route path="/TokenLedger" element={<TokenLedger/>} />
              <Route path="/DailyUse" element={<DailyUse/>} />
              <Route path="Adventure" element={<Adventure />} />
              <Route path="Build" element={<Build />} />
              <Route path="MyTree" element={<MyTree />} />
              <Route path="signup" element={<Signup />} />
              <Route path="login" element={<Login />} />
              <Route path="Account" element={<Account />} />
              <Route path="ForgotPassword" element={<ForgotPassword />} />
              <Route path="ResetPassword" element={<ResetPassword />} />
              <Route path="smartjournal" element={<SmartJournal />} />
              <Route path="journal" element={<Journal />} />
              <Route path="MealPlanning" element={<MealPlanning />} />
              <Route path="CategoryManager" element={<CategoryManager />} />
              <Route path="FoodInventory" element={<FoodInventory />} />
              <Route path="Recipes" element={<Recipes />} />
              <Route path="GroceryList" element={<GroceryList />} />
              <Route path="projects" element={<ProjectList />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="blog" element={<BlogHome />} />
              <Route path="blog/new" element={<CreatePost />} />
              <Route path="blog/:id" element={<BlogPost />} />
              <Route path="blog/:id/edit" element={<EditPost />} />
              <Route path="communities" element={<CommunityList />} />
              <Route path="communities/:communityId" element={<Community />} />
              <Route path="dreammachine" element={<DreamMachine />} />
              <Route path="WeDream" element={<WeDream />} />
              <Route path="GardenBlitz" element={<GardenBlitz />} />
              <Route path="GardenDirectory" element={<GardenDirectory />} />
              <Route path="GardenDetails/:id" element={<GardenDetails />} />
              <Route path="ZenFreeskates" element={<ZenFreeskates />} />
              <Route path="experiments" element={<Experiments />} />
              <Route path="TextGame" element={<TextGame />} />
              <Route path="tarot" element={<Tarot />} />
              <Route path="meditation" element={<Meditation />} />
              <Route path="wechoose" element={<WeChoose />} />
              <Route path="WeLearn" element={<WeLearn />} />
              <Route path="WePlan" element={<WePlan />} />
              <Route path="WeGreen" element={<WeGreen />} />
              <Route path="WeHelp" element={<WeHelp />} />
              <Route path="WeDo" element={<WeDo />} />
              <Route path="GardenGame" element={<GardenGame />} />
              <Route path="FarmGame" element={<FarmGame />} />
              <Route path="LivingPlan" element={<LivingPlan />} />
              <Route path="/notes/:index" element={<NotesPage />} />
              <Route path="ProblemPage" element={<ProblemPage />} />
              <Route path="/aaron" element={<AaronsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </HelmetProvider>
    </React.StrictMode>
  );
}
console.log("[ENV]", ENV);
console.log("[API_URL at runtime]", API_URL);
ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
