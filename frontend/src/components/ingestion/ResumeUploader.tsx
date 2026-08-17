"use client";

import React, { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, CheckCircle, X } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import type { ParseCVResponse } from "@/types";

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const ACCEPTED_EXTS = ".pdf,.docx,.txt";

interface ResumeUploaderProps {
  onParsed: (rawText: string, filename: string) => void;
}

export function ResumeUploader({ onParsed }: ResumeUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate type
      if (!ACCEPTED_TYPES.has(file.type) && !file.name.endsWith(".docx")) {
        toast.error("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
        return;
      }
      // Validate size
      if (file.size > MAX_SIZE) {
        toast.error("File is too large. Maximum allowed size is 15 MB.");
        return;
      }

      setUploading(true);
      setProgress(10);

      const formData = new FormData();
      formData.append("file", file);

      try {
        setProgress(40);
        const res = await api.post<ParseCVResponse>("/ingest/cv", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded / e.total) * 80) + 10);
          },
        });
        setProgress(100);
        setUploadedFile(file.name);
        onParsed(res.data.raw_text, file.name);
        toast.success(`Resume parsed successfully (${(file.size / 1024).toFixed(0)} KB)`);
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Failed to parse the resume. Please try again.";
        toast.error(detail);
      } finally {
        setUploading(false);
      }
    },
    [onParsed]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearFile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setUploadedFile(null);
      setProgress(0);
      onParsed("", "");
      if (inputRef.current) inputRef.current.value = "";
    },
    [onParsed]
  );

  const zoneClass = [
    "drop-zone",
    isDragOver ? "dragover" : "",
    uploadedFile ? "success" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Radial progress
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="card">
      <p className="section-title">
        <UploadCloud size={13} />
        Resume Upload
      </p>

      <div
        className={zoneClass}
        id="resume-drop-zone"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload resume file"
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTS}
          onChange={onInputChange}
          style={{ display: "none" }}
          id="resume-file-input"
          aria-hidden="true"
        />

        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <svg width="60" height="60" className="progress-ring" aria-label={`Upload progress ${progress}%`}>
              <circle cx="30" cy="30" r={radius} stroke="var(--border)" strokeWidth="4" fill="none" />
              <circle
                cx="30"
                cy="30"
                r={radius}
                stroke="var(--accent)"
                strokeWidth="4"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.2s ease" }}
              />
            </svg>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              Parsing document… {progress}%
            </span>
          </div>
        ) : uploadedFile ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <CheckCircle size={40} color="var(--color-success)" />
            <p className="drop-zone-title" style={{ color: "var(--color-success)" }}>
              Resume ready!
            </p>
            <div className="file-chip">
              <FileText size={12} />
              <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {uploadedFile}
              </span>
              <button
                onClick={clearFile}
                className="skill-remove-btn"
                id="clear-resume-btn"
                aria-label="Remove uploaded resume"
              >
                <X size={12} />
              </button>
            </div>
            <p className="drop-zone-sub">Click to replace</p>
          </div>
        ) : (
          <>
            <div className="drop-zone-icon">
              <UploadCloud size={40} style={{ width: "100%", height: "100%" }} />
            </div>
            <p className="drop-zone-title">Drag &amp; drop your resume here</p>
            <p className="drop-zone-sub">or click to browse — PDF, DOCX, TXT up to 15 MB</p>
          </>
        )}
      </div>
    </div>
  );
}
