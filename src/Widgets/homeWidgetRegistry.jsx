// src/widgets/homeWidgetRegistry.js
import React from "react";

import CheckInWidget from "@/Widgets/CheckInWidget";
import NotesWidget from "@/Widgets/NotesWidget";
import LinksWidget from "@/Widgets/LinksWidget";
import DecideWidget from "@/Widgets/DecideWidget";
import BuildSprintWidget from "@/Widgets/BuildSprintWidget";
import ExploreCompassWidget from "@/Widgets/ExploreCompassWidget";
import LearningOrganizerWidget from "@/Widgets/LearningOrganizerWidget";

// NOTE: Flow Map is a page, not a widget, so it's not here.

export const HOME_WIDGETS = [
  {
    id: "checkin",
    title: "Quick check-in",
    desc: "Pick what’s true. Choose one small next step.",
    render: () => <CheckInWidget storageKey="pe_checkin_v1" title="Quick check-in" />,
  },
  {
    id: "notes",
    title: "Quick note",
    desc: "A place to dump thoughts fast.",
    render: () => <NotesWidget storageKey="pe_notes_today_v1" title="Quick note" />,
  },
  {
    id: "buildSprint",
    title: "Sprint",
    desc: "Pick a goal. Run a timer. Save a win.",
    render: () => <BuildSprintWidget storageKey="pe_build_sprint_v1" title="Sprint" />,
  },
  {
    id: "decide",
    title: "Decide",
    desc: "Simple pros/cons lists.",
    render: () => <DecideWidget storageKey="pe_decide_v2" />,
  },
  {
    id: "exploreCompass",
    title: "Curiosity Compass",
    desc: "Get a prompt + micro-task. Save a takeaway.",
    render: () => <ExploreCompassWidget storageKey="pe_explore_compass_v1" title="Curiosity Compass" />,
  },
  {
    id: "learningOrganizer",
    title: "Learning Stack",
    desc: "Queue → Active (max 3) → Key notes.",
    render: () => <LearningOrganizerWidget storageKey="pe_learning_stack_v1" title="Learning Stack" />,
  },
  {
    id: "links",
    title: "Links",
    desc: "Your personal quick links list.",
    render: () => <LinksWidget storageKey="pe_links_tools_v1" title="My links" />,
  },
];

export const WIDGET_BY_ID = Object.fromEntries(HOME_WIDGETS.map((w) => [w.id, w]));