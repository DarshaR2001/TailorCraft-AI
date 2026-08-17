"use client";

import React from "react";
import { LogOut, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  onReset: () => void;
}

export function Header({ onReset }: HeaderProps) {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "8px",
              background: "var(--accent-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={14} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div>
              <span className="logo-text">TailorCraft</span>
              <span className="logo-accent"> AI</span>
            </div>
            <p className="header-tagline">ATS-Optimized Resume &amp; Cover Letter Generator</p>
          </div>
        </div>

        {/* Actions */}
        <div className="header-actions">
          <button
            onClick={onReset}
            className="btn-ghost"
            id="reset-workspace-btn"
            title="Clear all inputs and start fresh"
          >
            Reset Workspace
          </button>

          {isAuthenticated && user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div className="user-pill" id="user-profile-pill">
                <div className="user-avatar">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{user.full_name}</span>
              </div>
              <button
                onClick={logout}
                className="btn-icon"
                id="logout-btn"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal("login")}
              className="btn-primary"
              id="signin-btn"
              style={{ padding: "0.5rem 1rem" }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
