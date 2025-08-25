// src/pages/WeChoose.jsx
import React from "react";
import { Link } from "react-router-dom";
import { BarChart2, FileText, Brain, ShieldCheck, SquareCheckBig } from "lucide-react";
import { useBills } from "@/hooks/useBills";

export default function WeChoose() {
  const { bills = [], loading = false, error } = useBills?.() ?? {};

  return (
    <div className="main p-6 space-y-6">
      {/* Header */}
      <header className="section-bar flex items-center justify-between gap-3">
        <h1 className="m-0">🗳️ We Choose</h1>
        <Link to="/experiments" className="btn btn-secondary text-xs sm:text-sm">
          ← Back to Experiments
        </Link>
      </header>

      {/* Intro */}
      <section className="card">
        <p className="text-base">
          See the world you want to live in. Learn, vote, compare, evolve.
        </p>
      </section>

      {/* Quick actions / modules */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { icon: FileText, label: "Current Policies", to: null },
          { icon: SquareCheckBig, label: "Cast Mock Vote", to: null },
          { icon: BarChart2, label: "Compare Results", to: null },
          { icon: Brain, label: "Learn & Test", to: null },
          { icon: ShieldCheck, label: "Proof of Humanity", to: null },
        ].map(({ icon: Icon, label, to }, i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <Icon className="w-5 h-5 opacity-80" />
            <span className="font-medium">{label}</span>
            {to ? (
              <Link to={to} className="ml-auto btn btn-secondary">
                Open
              </Link>
            ) : null}
          </div>
        ))}
      </section>

      {/* Bills list */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold m-0">Current Bills</h2>

        {loading ? (
          <div className="opacity-70">Loading bills…</div>
        ) : error ? (
          <div className="card border-amber-500/40">{String(error)}</div>
        ) : bills.length ? (
          <ul className="space-y-3">
            {bills.map((bill, index) => (
              <li key={`${bill?.number || "bill"}-${index}`} className="card">
                <div className="space-y-1">
                  <div className="font-semibold">
                    {bill?.short_title || bill?.title || "Untitled Bill"}
                  </div>
                  <div className="text-sm opacity-80 flex flex-wrap gap-2">
                    <span>
                      <strong>Bill:</strong> {bill?.number || "—"}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Sponsor:</strong> {bill?.sponsor?.name || "—"}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Status:</strong> {bill?.status || "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <a
                    className="btn btn-secondary"
                    href={`https://openparliament.ca/bills/${bill?.session || "current"}/${String(
                      bill?.number || ""
                    ).toLowerCase()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Full Bill
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="opacity-70">No bills found.</div>
        )}
      </section>
    </div>
  );
}