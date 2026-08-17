"use client";

import React, { useState, useCallback } from "react";
import { Download, FileText, File, Loader2, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import type { DocumentArtifact, GenerateDocumentsResponse, StructuredResume } from "@/types";

interface ExportBarProps {
  applicationId: string | null;
  tailoredResume?: StructuredResume | null;
  coverLetter?: string;
  disabled?: boolean;
}

const ARTIFACT_LABELS: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  CV_PDF: {
    label: "Resume (PDF)",
    className: "btn-download btn-download-pdf",
    icon: <File size={13} />,
  },
  CV_DOCX: {
    label: "Resume (DOCX)",
    className: "btn-download btn-download-docx",
    icon: <FileText size={13} />,
  },
  COVER_LETTER_PDF: {
    label: "Cover Letter (PDF)",
    className: "btn-download btn-download-pdf",
    icon: <File size={13} />,
  },
  COVER_LETTER_DOCX: {
    label: "Cover Letter (DOCX)",
    className: "btn-download btn-download-docx",
    icon: <FileText size={13} />,
  },
};

function buildDownloadUrl(artifact: DocumentArtifact): string {
  if (artifact.download_url) {
    let url = artifact.download_url;
    // Map backend /api/v1/ paths to Next.js /api/proxy/
    if (url.startsWith("/api/v1/")) {
      url = url.replace("/api/v1/", "/api/proxy/");
    } else if (url.startsWith("local://") || url.startsWith("/storage/")) {
      const path = url.replace("local://", "").replace("/storage/", "");
      url = `/api/proxy/export/download/local?path=${encodeURIComponent(path)}`;
    }
    return url;
  }
  return `/api/proxy/export/artifacts/${artifact.artifact_id}/download`;
}

export function ExportBar({
  applicationId,
  tailoredResume,
  coverLetter,
  disabled = false,
}: ExportBarProps) {
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<DocumentArtifact[]>([]);

  const handleGenerate = useCallback(async () => {
    if (!applicationId) {
      toast.error("No application ID found. Please generate the tailored content first.");
      return;
    }

    setGenerating(true);
    toast.loading("Generating PDF and DOCX documents…");

    try {
      const res = await api.post<GenerateDocumentsResponse>(
        `/export/${applicationId}/generate-documents`,
        {
          tailored_resume: tailoredResume || undefined,
          cover_letter: coverLetter || undefined,
        }
      );
      setArtifacts(res.data.artifacts);
      toast.success(`Documents ready for ${res.data.job_title} at ${res.data.company_name}!`);

      // Confetti 🎉
      const canvasConfetti = (await import("canvas-confetti")).default;
      canvasConfetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.7 },
        colors: ["#7c3aed", "#6366f1", "#22c55e", "#f59e0b"],
      });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Document generation failed. Please try again.";
      toast.error(detail);
    } finally {
      setGenerating(false);
    }
  }, [applicationId]);

  const handleDownload = useCallback(async (artifact: DocumentArtifact) => {
    setDownloadingId(artifact.artifact_id);
    const url = buildDownloadUrl(artifact);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = artifact.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success(`Downloaded ${artifact.file_name}`);
    } catch (err) {
      console.error("Download failed:", err);
      toast.error(`Download failed for ${artifact.file_name}`);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
      <p className="section-title">
        <Download size={13} />
        Export Documents
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {/* Generate Button */}
        <button
          id="generate-documents-btn"
          className="btn-primary"
          onClick={handleGenerate}
          disabled={generating || disabled || !applicationId}
          style={{ justifyContent: "center", padding: "0.75rem" }}
        >
          {generating ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Generating Documents…
            </>
          ) : (
            <>
              <Sparkles size={15} />
              Generate PDF &amp; DOCX Documents
            </>
          )}
        </button>

        {!applicationId && !generating && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
            Complete AI tailoring step to enable document generation.
          </p>
        )}

        {/* Download Buttons */}
        {artifacts.length > 0 && (
          <div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-success)", fontWeight: 600, marginBottom: "0.625rem" }}>
              ✓ Documents ready — click to download
            </p>
            <div className="download-btn-group">
              {artifacts.map((artifact) => {
                const meta = ARTIFACT_LABELS[artifact.document_type];
                if (!meta) return null;
                const isDownloading = downloadingId === artifact.artifact_id;
                return (
                  <button
                    key={artifact.artifact_id}
                    id={`download-${artifact.document_type.toLowerCase()}-btn`}
                    className={meta.className}
                    onClick={() => handleDownload(artifact)}
                    disabled={isDownloading}
                    aria-label={`Download ${meta.label}`}
                  >
                    {isDownloading ? <Loader2 size={13} className="animate-spin" /> : meta.icon}
                    {isDownloading ? "Downloading…" : meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
