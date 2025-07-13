import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import WelcomePage from "./Pages/WelcomePage";
import SheasRamblingIdeas from "./Pages/SheasRamblingIdeas";
import Signup from "./Pages/Signup";
import Login from "./Pages/Login";
import Experiments from "./Pages/Experiments";
import Tarot from "./Pages/Tarot";
import Meditation from "./Pages/Meditation";
import DreamMachine from "./Pages/DreamMachine";
import WeBuild from "./Pages/WeBuild";
import WeChoose from "./Pages/WeChoose";
import WeLearn from "./Pages/WeLearn";
import WePlan from "./Pages/WePlan";
import WeTalk from "./Pages/WeTalk";
import WeGreen from "./Pages/WeGreen";
import WeHelp from "./Pages/WeHelp";
import WeDo from "./Pages/WeDo";
import MealPlanning from "./Pages/MealPlanning";
import CategoryManager from "./Pages/CategoryManager";
import FoodInventory from "./Pages/FoodInventory";
import Recipes from "./Pages/Recipes";
import GroceryList from "./Pages/GroceryList";
import WeDream from "./Pages/WeDream";
import TextGame from "./Pages/TextGame";
import ZenFreeskates from "./Pages/ZenFreeskates";
import NodeCreation from "./Pages/NodeCreation";
import Nodes from "./Pages/Nodes";
import NodeViewer from "./Pages/NodeViewer";
import Account from "./Pages/Account";
import SheasPage from "./Pages/SheasPage";
import ForgotPassword from "./Pages/ForgotPassword";
import ResetPassword from "./Pages/ResetPassword";
import GardenBlitz from "./Pages/GardenBlitz";
import GardenDirectory from "./Pages/GardenDirectory";
import GardenDetails from "./Pages/GardenDetails";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import SmartJournal from "./Pages/SmartJournal";
import PrivateRoute from "./components/PrivateRoute";
import BlogHome from "./Pages/blog/BlogHome";
import BlogPost from "./Pages/blog/BlogPost";
import CreatePost from "./Pages/blog/CreatePost";
import EditPost from "./Pages/blog/EditPost";
import SheasCompass from "./Pages/SheasCompass";
import ProjectList from "./Pages/ProjectList";
import ProjectDetail from "./Pages/ProjectDetail";
import LandingPage from "./Pages/LandingPage";
import CommunityList from "./Pages/CommunityList";
import Community from "./Pages/Community";
import MyCommunityPortal from "./Pages/MyCommunityPortal";
import GardenGame from "./Pages/gardengame/GardenGame.jsx";
import SheasGame from "./Pages/sheasgame/SheasGame.jsx";
import "./index.css";

function Root() {
  const [firstVisit, setFirstVisit] = useState(null);

  useEffect(() => {
    const hasVisited = localStorage.getItem("hasVisited");
    if (hasVisited) {
      setFirstVisit(false);
    } else {
      localStorage.setItem("hasVisited", "true");
      setFirstVisit(true);
    }
  }, []);

  if (firstVisit === null) return null;

  return (
    <React.StrictMode>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={firstVisit ? <WelcomePage /> : <App />} />
              <Route path="welcome" element={<WelcomePage />} />
              <Route path="sheascompass" element={<SheasCompass />} />
              <Route path="communities" element={<CommunityList />} />
              <Route path="communities/:communityId" element={<Community />} />
              <Route path="MyCommunityPortal" element={<MyCommunityPortal />} />
              <Route path="projects" element={<ProjectList />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="sheas-rambling-ideas" element={<SheasRamblingIdeas />} />
              <Route path="signup" element={<Signup />} />
              <Route path="login" element={<Login />} />
              <Route path="experiments" element={<Experiments />} />
              <Route path="blog" element={<BlogHome />} />
              <Route path="blog/new" element={<CreatePost />} />
              <Route path="blog/:id" element={<BlogPost />} />
              <Route path="blog/:id/edit" element={<EditPost />} />
              <Route path="tarot" element={<Tarot />} />
              <Route path="meditation" element={<Meditation />} />
              <Route path="dreammachine" element={<DreamMachine />} />
              <Route path="WeBuild" element={<WeBuild />} />
              <Route path="wechoose" element={<WeChoose />} />
              <Route path="WeLearn" element={<WeLearn />} />
              <Route path="WePlan" element={<WePlan />} />
              <Route path="WeTalk" element={<WeTalk />} />
              <Route path="WeGreen" element={<WeGreen />} />
              <Route path="WeHelp" element={<WeHelp />} />
              <Route path="WeDo" element={<WeDo />} />
              <Route path="MealPlanning" element={<MealPlanning />} />
              <Route path="CategoryManager" element={<CategoryManager />} />
              <Route path="FoodInventory" element={<FoodInventory />} />
              <Route path="Recipes" element={<Recipes />} />
              <Route path="GroceryList" element={<GroceryList />} />
              <Route path="WeDream" element={<WeDream />} />
              <Route path="NodeCreation" element={<NodeCreation />} />
              <Route path="Nodes" element={<Nodes />} />
              <Route path="NodeViewer" element={<NodeViewer />} />
              <Route path="TextGame" element={<TextGame />} />
              <Route path="ZenFreeskates" element={<ZenFreeskates />} />
              <Route path="Account" element={<Account />} />
              <Route path="SheasPage" element={<SheasPage />} />
              <Route path="ForgotPassword" element={<ForgotPassword />} />
              <Route path="ResetPassword" element={<ResetPassword />} />
              <Route path="GardenBlitz" element={<GardenBlitz />} />
              <Route path="GardenDirectory" element={<GardenDirectory />} />
              <Route path="GardenDetails/:id" element={<GardenDetails />} />
              <Route path="gardens/:id" element={<GardenDetails />} />
              <Route path="LandingPage" element={<LandingPage />} />
              <Route path="GardenGame" element={<GardenGame />} />
              <Route path="SheasGame" element={<SheasGame />} />
              <Route path="smartjournal" element={<SmartJournal />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
