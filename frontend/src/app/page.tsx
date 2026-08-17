"use client";

import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Header } from "@/components/ui/Header";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { ToastContainer } from "@/components/ui/Toast";
import { ResumeUploader } from "@/components/ingestion/ResumeUploader";
import { JobDescriptionInput } from "@/components/ingestion/JobDescriptionInput";
import { AtsScoreGauge } from "@/components/analytics/AtsScoreGauge";
import { TailoredResumeEditor } from "@/components/workspace/TailoredResumeEditor";
import { CoverLetterEditor } from "@/components/workspace/CoverLetterEditor";
import { ExportBar } from "@/components/export/ExportBar";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const workflow = useWorkflow();
  const { isAuthenticated, openAuthModal } = useAuth();

  const handleTailor = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    workflow.triggerTailoring();
  };

  const hasWorkspaceContent =
    workflow.tailoredResume !== null || workflow.coverLetter !== "";

  return (
    <>
      {/* ── Header ───────────────────────────────────────────── */}
      <Header onReset={workflow.reset} />

      {/* ── Step Progress ─────────────────────────────────────── */}
      <StepIndicator currentStep={workflow.step} />

      {/* ── Main Workspace ────────────────────────────────────── */}
      <main className="workspace-main">
        {/* ╔══════════════════════════════╗ */}
        {/* ║       LEFT PANEL             ║ */}
        {/* ╚══════════════════════════════╝ */}
        <div className="left-panel">
          <ResumeUploader
            onParsed={(text, filename) => workflow.setResume(text, filename)}
          />

          <JobDescriptionInput onReady={workflow.setJobDescription} />

          <AtsScoreGauge
            resumeText={workflow.resumeRawText}
            jobDescriptionText={workflow.jobDescriptionText}
            onScored={workflow.setAtsScore}
          />

          {/* ── AI Tailor CTA ──────────────────────────────── */}
          <div className="tailor-cta">
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <div
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "50%",
                  background: "var(--accent-gradient)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Wand2 size={16} color="white" />
              </div>
              <p className="tailor-cta-title">Ready to Tailor?</p>
            </div>
            <p className="tailor-cta-sub">
              Our AI will rewrite your resume, match your skills to the job, and
              craft a personalized cover letter — all in one click.
            </p>
            <button
              id="tailor-application-btn"
              className="btn-primary"
              onClick={handleTailor}
              disabled={workflow.isTailoring || !workflow.canTailor}
              style={{ alignSelf: "stretch", padding: "0.75rem", justifyContent: "center" }}
            >
              {workflow.isTailoring ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  AI is tailoring your application…
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  {isAuthenticated
                    ? "Generate Tailored Application"
                    : "Sign In to Generate Application"}
                </>
              )}
            </button>
            {!workflow.canTailor && !workflow.isTailoring && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                Upload a resume and add a job description above to continue.
              </p>
            )}
          </div>
        </div>

        {/* ╔══════════════════════════════╗ */}
        {/* ║       RIGHT PANEL            ║ */}
        {/* ╚══════════════════════════════╝ */}
        <div className="right-panel">
          {hasWorkspaceContent ? (
            <>
              {workflow.tailoredResume && (
                <TailoredResumeEditor
                  resume={workflow.tailoredResume}
                  onChange={workflow.setTailoredResume}
                />
              )}

              {workflow.coverLetter !== "" && (
                <CoverLetterEditor
                  coverLetter={workflow.coverLetter}
                  onChange={workflow.setCoverLetter}
                />
              )}

              <ExportBar
                applicationId={workflow.applicationId}
                tailoredResume={workflow.tailoredResume}
                coverLetter={workflow.coverLetter}
              />
            </>
          ) : (
            <div className="empty-workspace">
              <div className="empty-workspace-icon">
                <Wand2 size={56} />
              </div>
              <p className="empty-workspace-title">Your Workspace Awaits</p>
              <p className="empty-workspace-sub">
                Upload your resume and paste a job description on the left, then
                click{" "}
                <strong style={{ color: "var(--accent)" }}>
                  Generate Tailored Application
                </strong>{" "}
                to see your AI-optimized resume and cover letter appear here.
              </p>

              {/* Feature teasers */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.625rem",
                  marginTop: "1rem",
                  width: "100%",
                  maxWidth: "320px",
                }}
              >
                {[
                  "✦ ATS keyword matching & scoring",
                  "✦ XYZ bullet point optimization",
                  "✦ Personalized 4-paragraph cover letter",
                  "✦ One-click PDF & DOCX export",
                ].map((feature) => (
                  <div
                    key={feature}
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      textAlign: "center",
                    }}
                  >
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Toast Notifications ───────────────────────────────── */}
      <ToastContainer />
    </>
  );
}
