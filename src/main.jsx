import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ErrorBoundary from "./pneumevolve-v2/components/ErrorBoundary.jsx";
import Home from "./Pages/Home.jsx";
import Forge from "./pneumevolve-v2/pages/Forge";
import Forge2 from "./Pages/Forge";
import ForgeItemPage from "./Pages/ForgeItemPage";
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

import PrivacyPolicy from "./legal/PrivacyPolicy";
import Terms from "./legal/Terms";
import CookiePolicy from "./legal/CookiePolicy";











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
              <Route path="/forge" element={<ErrorBoundary><Forge /></ErrorBoundary>} />
              <Route path="/forge2" element={<Forge2/>} />
              <Route path="/forge2/:id" element={<ForgeItemPage />} />
              <Route path="/forge/:id" element={<ForgeIdeaDetail />} />
              <Route path="/problems" element={<Problems />} />
              <Route path="/problems/:id" element={<ProblemDetail />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/spotlight-archive" element={<SpotlightArchive />} />
              <Route path="/token-ledger" element={<TokenLedger/>} />
              <Route path="/daily-use" element={<DailyUse/>} />
              <Route path="/adventure" element={<Adventure />} />
              <Route path="/build" element={<Build />} />
              <Route path="/my-tree" element={<MyTree />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/account" element={<Account />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/smart-journal" element={<SmartJournal />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/meal-planning" element={<MealPlanning />} />
              <Route path="/category-manager" element={<CategoryManager />} />
              <Route path="/food-inventory" element={<FoodInventory />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/grocery-list" element={<GroceryList />} />
              <Route path="/projects" element={<ProjectList />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/blog" element={<BlogHome />} />
              <Route path="/blog/new" element={<CreatePost />} />
              <Route path="/blog/:id" element={<BlogPost />} />
              <Route path="/blog/:id/edit" element={<EditPost />} />
              <Route path="/communities" element={<CommunityList />} />
              <Route path="/communities/:communityId" element={<Community />} />
              <Route path="/dream-machine" element={<DreamMachine />} />
              <Route path="/we-dream" element={<WeDream />} />
              <Route path="/garden-blitz" element={<GardenBlitz />} />
              <Route path="/garden-directory" element={<GardenDirectory />} />
              <Route path="/garden-details/:id" element={<GardenDetails />} />
              <Route path="/zen-freeskates" element={<ZenFreeskates />} />
              <Route path="/experiments" element={<Experiments />} />
              <Route path="/text-game" element={<TextGame />} />
              <Route path="/tarot" element={<Tarot />} />
              <Route path="/meditation" element={<Meditation />} />
              <Route path="/we-choose" element={<WeChoose />} />
              <Route path="/we-learn" element={<WeLearn />} />
              <Route path="/we-plan" element={<WePlan />} />
              <Route path="/we-green" element={<WeGreen />} />
              <Route path="/we-help" element={<WeHelp />} />
              <Route path="/we-do" element={<WeDo />} />
              <Route path="/garden-game" element={<GardenGame />} />
              <Route path="/farm-game" element={<FarmGame />} />
              <Route path="/living-plan" element={<LivingPlan />} />
              <Route path="/notes/:index" element={<NotesPage />} />
              <Route path="/problem-page" element={<ProblemPage />} />
              <Route path="/aaron" element={<AaronsPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<CookiePolicy />} />
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
