"use client";

import React, { useState, useCallback } from "react";
import { FileText, Link2, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import type { JobDescriptionResponse } from "@/types";

interface JobDescriptionInputProps {
  onReady: (text: string) => void;
}

export function JobDescriptionInput({ onReady }: JobDescriptionInputProps) {
  const [activeTab, setActiveTab] = useState<"text" | "url">("text");
  const [rawText, setRawText] = useState("");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);

  // Text tab: notify parent on every keystroke
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRawText(e.target.value);
      onReady(e.target.value);
    },
    [onReady]
  );

  // URL tab: scrape via backend
  const handleFetchUrl = useCallback(async () => {
    if (!url.trim()) {
      toast.error("Please enter a valid job posting URL.");
      return;
    }
    setFetching(true);
    try {
      const res = await api.post<JobDescriptionResponse>("/ingest/job-description", {
        url: url.trim(),
      });
      const text = res.data.raw_text;
      setRawText(text);
      onReady(text);
      toast.success("Job description scraped successfully!");
      setActiveTab("text"); // Switch to text tab to show the scraped content
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to scrape the URL. Try pasting the job description manually.";
      toast.error(detail);
    } finally {
      setFetching(false);
    }
  }, [url, onReady]);

  const charCount = rawText.length;
  const isReady = rawText.trim().length > 50;

  return (
    <div className="card">
      <p className="section-title">
        <FileText size={13} />
        Job Description
        {isReady && (
          <span className="badge badge-success" style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>
            Ready
          </span>
        )}
      </p>

      {/* Tabs */}
      <div className="tab-bar" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "text"}
          id="jd-tab-text"
          className={activeTab === "text" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("text")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <FileText size={12} />
            Paste Text
          </span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "url"}
          id="jd-tab-url"
          className={activeTab === "url" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("url")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <Link2 size={12} />
            From URL
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "text" ? (
        <div>
          <textarea
            id="job-description-textarea"
            className="form-input"
            style={{ minHeight: "180px", resize: "vertical" }}
            placeholder="Paste the full job description here, including requirements, responsibilities, and preferred qualifications…"
            value={rawText}
            onChange={handleTextChange}
            aria-label="Job description text"
          />
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.375rem", textAlign: "right" }}>
            {charCount.toLocaleString()} characters
            {charCount > 0 && charCount < 50 && (
              <span style={{ color: "var(--color-warning)", marginLeft: "0.5rem" }}>
                · Add more detail for accurate ATS analysis
              </span>
            )}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="form-group">
            <label htmlFor="job-url-input">Job Posting URL</label>
            <input
              id="job-url-input"
              type="url"
              className="form-input"
              placeholder="https://jobs.example.com/software-engineer-123"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
            />
          </div>
          <button
            id="fetch-url-btn"
            className="btn-primary"
            onClick={handleFetchUrl}
            disabled={fetching || !url.trim()}
          >
            {fetching ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Scraping…
              </>
            ) : (
              <>
                <Link2 size={14} />
                Extract Job Description
              </>
            )}
          </button>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Works best with LinkedIn, Indeed, Greenhouse, Lever, and Workday job posts.
          </p>
        </div>
      )}
    </div>
  );
}
