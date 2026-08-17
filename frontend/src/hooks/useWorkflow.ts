"use client";

import { useCallback, useRef, useState } from "react";
import api from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import type {
  ATSScoreResponse,
  StructuredResume,
  TailoredApplicationResponse,
  WorkflowStep,
} from "@/types";

interface WorkflowState {
  // Step 1
  resumeRawText: string;
  resumeFilename: string;
  // Step 2
  jobDescriptionText: string;
  // Step 3 (AI output)
  atsScore: ATSScoreResponse | null;
  tailoredResume: StructuredResume | null;
  coverLetter: string;
  applicationId: string | null;
  // Step tracker
  step: WorkflowStep;
  isTailoring: boolean;
}

const INITIAL_STATE: WorkflowState = {
  resumeRawText: "",
  resumeFilename: "",
  jobDescriptionText: "",
  atsScore: null,
  tailoredResume: null,
  coverLetter: "",
  applicationId: null,
  step: 1,
  isTailoring: false,
};

export function useWorkflow() {
  const [state, setState] = useState<WorkflowState>(INITIAL_STATE);
  const stateRef = useRef<WorkflowState>(state);
  stateRef.current = state;

  // ── Step 1: Resume parsed ─────────────────────────────────
  const setResume = useCallback((rawText: string, filename: string) => {
    setState((prev) => ({
      ...prev,
      resumeRawText: rawText,
      resumeFilename: filename,
      step: rawText ? (prev.step < 1 ? 1 : prev.step) : 1,
      // Advance to step 2 automatically when resume is ready
      ...(rawText && prev.step <= 1 ? { step: 2 as WorkflowStep } : {}),
    }));
  }, []);

  // ── Step 2: JD ready ──────────────────────────────────────
  const setJobDescription = useCallback((text: string) => {
    setState((prev) => ({ ...prev, jobDescriptionText: text }));
  }, []);

  // ── ATS Score update (from gauge component) ───────────────
  const setAtsScore = useCallback((score: ATSScoreResponse) => {
    setState((prev) => ({ ...prev, atsScore: score }));
  }, []);

  // ── Step 3: AI Tailoring ──────────────────────────────────
  const triggerTailoring = useCallback(
    async (targetJobTitle?: string, targetCompany?: string) => {
      const { resumeRawText, jobDescriptionText } = stateRef.current;

      if (!resumeRawText || resumeRawText.trim().length < 20) {
        toast.error("Please upload your resume first.");
        return;
      }
      if (!jobDescriptionText || jobDescriptionText.trim().length < 50) {
        toast.error("Please add a job description (at least 50 characters).");
        return;
      }

      setState((prev) => ({ ...prev, isTailoring: true }));
      toast.loading("AI is tailoring your resume… This may take 1–2 minutes.");

      try {
        const res = await api.post<TailoredApplicationResponse>("/tailor/generate", {
          raw_resume_text: resumeRawText,
          job_description_text: jobDescriptionText,
          target_job_title: targetJobTitle ?? "",
          target_company: targetCompany ?? "",
        });

        console.log("[useWorkflow] Tailoring response received:", res.data);

        const appId = res.data.application_id ?? null;

        setState((prev) => ({
          ...prev,
          tailoredResume: res.data.tailored_resume,
          coverLetter: res.data.cover_letter,
          atsScore: res.data.ats_score,
          step: 3 as WorkflowStep,
          isTailoring: false,
          applicationId: appId,
        }));

        // Fallback if application_id wasn't in response for any reason
        if (!appId) {
          try {
            const appRes = await api.get<{ items: Array<{ id: string }> }>("/applications/my?limit=1");
            const id = appRes.data?.items?.[0]?.id ?? null;
            if (id) setState((prev) => ({ ...prev, applicationId: id }));
          } catch {
            // Non-blocking fallback
          }
        }

        toast.success("Resume tailored successfully! Review and edit below, then export your documents.");
      } catch (err: unknown) {
        console.error("[useWorkflow] Tailoring error:", err);
        const axiosErr = err as {
          response?: { status?: number; data?: { detail?: string } };
          code?: string;
          message?: string;
        };

        const status = axiosErr.response?.status;
        if (status === 401) {
          toast.error("Sign in required to generate tailored documents.");
        } else if (axiosErr.code === "ECONNABORTED" || axiosErr.message?.includes("timeout")) {
          toast.error("The AI model took longer than expected. Please try again.");
        } else {
          const detail =
            axiosErr.response?.data?.detail ??
            axiosErr.message ??
            "Tailoring failed. Please try again.";
          toast.error(detail);
        }
        setState((prev) => ({ ...prev, isTailoring: false }));
      }
    },
    []
  );

  // ── Resume editor changes ─────────────────────────────────
  const setTailoredResume = useCallback((updated: StructuredResume) => {
    setState((prev) => ({ ...prev, tailoredResume: updated }));
  }, []);

  // ── Cover letter changes ──────────────────────────────────
  const setCoverLetter = useCallback((val: string) => {
    setState((prev) => ({ ...prev, coverLetter: val }));
  }, []);

  // ── Reset ─────────────────────────────────────────────────
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const canTailor =
    state.resumeRawText.trim().length > 20 &&
    state.jobDescriptionText.trim().length > 50;

  return {
    ...state,
    canTailor,
    setResume,
    setJobDescription,
    setAtsScore,
    triggerTailoring,
    setTailoredResume,
    setCoverLetter,
    reset,
  };
}
