import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import SheasRamblingIdeas from "./Pages/SheasRamblingIdeas";
import Signup from "./Pages/Signup";
import Login from "./Pages/Login";
import Experiments from "./Pages/Experiments";
import Tarot from "./Pages/Tarot";
import Meditation from "./Pages/Meditation";
import WeirdDreamMachine from "./Pages/WeirdDreamMachine";
import WeChoose from "./Pages/WeChoose";
import WeLearn from "./Pages/WeLearn";
import WePlan from "./Pages/WePlan";
import WeTalk from "./Pages/WeTalk";
import WeGreen from "./Pages/WeGreen";
import WeHelp from "./Pages/WeHelp";
import WeDo from "./Pages/WeDo";
import TheMessage from "./Pages/TheMessage";
import MealPlanning from "./Pages/MealPlanning"
import CategoryManager from "./Pages/CategoryManager"
import FoodInventory from "./Pages/FoodInventory"
import Recipes from "./Pages/Recipes"
import GroceryList from "./Pages/GroceryList"
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
            <Route path="themessage" element={<TheMessage />} />
            <Route path="experiments" element={<Experiments />} />
            <Route path="tarot" element={<Tarot />} />
            <Route path="meditation" element={<Meditation />} />
            <Route path="weirddreammachine" element={<WeirdDreamMachine />} />
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