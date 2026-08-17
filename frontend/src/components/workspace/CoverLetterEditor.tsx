"use client";

import React, { useCallback } from "react";
import { Mail, RefreshCw } from "lucide-react";

interface CoverLetterEditorProps {
  coverLetter: string;
  onChange: (val: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function CoverLetterEditor({
  coverLetter,
  onChange,
  onRegenerate,
  isRegenerating = false,
}: CoverLetterEditorProps) {
  const wordCount = coverLetter.trim()
    ? coverLetter.trim().split(/\s+/).length
    : 0;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
        <p className="section-title" style={{ margin: 0 }}>
          <Mail size={13} />
          Cover Letter
          <span className="badge badge-accent" style={{ textTransform: "none", letterSpacing: 0 }}>
            AI Generated
          </span>
        </p>

        {onRegenerate && (
          <button
            id="regenerate-cover-letter-btn"
            className="btn-icon"
            onClick={onRegenerate}
            disabled={isRegenerating}
            title="Regenerate cover letter"
            aria-label="Regenerate cover letter"
            style={{ marginLeft: "0.5rem" }}
          >
            <RefreshCw size={14} className={isRegenerating ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      <textarea
        id="cover-letter-textarea"
        className="form-input"
        style={{
          minHeight: "280px",
          lineHeight: "1.8",
          fontFamily: "inherit",
          resize: "vertical",
        }}
        value={coverLetter}
        onChange={handleChange}
        placeholder="Your AI-generated cover letter will appear here. You can edit it freely before exporting."
        aria-label="Cover letter content"
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {wordCount > 0 && (
            <>
              {wordCount.toLocaleString()} words
              {wordCount < 200 && (
                <span style={{ color: "var(--color-warning)", marginLeft: "0.5rem" }}>
                  · Aim for 250–400 words
                </span>
              )}
              {wordCount > 500 && (
                <span style={{ color: "var(--color-warning)", marginLeft: "0.5rem" }}>
                  · Consider trimming to under 400 words
                </span>
              )}
            </>
          )}
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Click to edit
        </p>
      </div>
    </div>
  );
}
