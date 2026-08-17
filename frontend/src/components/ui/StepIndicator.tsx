"use client";

import React from "react";
import { Check, Sparkles, FileText, Download } from "lucide-react";
import type { WorkflowStep } from "@/types";

const STEPS: { label: string; icon: React.ReactNode }[] = [
  { label: "Upload CV", icon: <FileText size={12} /> },
  { label: "Job Description", icon: <Sparkles size={12} /> },
  { label: "AI Tailor", icon: <Sparkles size={12} /> },
  { label: "Export Docs", icon: <Download size={12} /> },
];

interface StepIndicatorProps {
  currentStep: WorkflowStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Workflow progress" className="step-indicator">
      {STEPS.map((step, index) => {
        const stepNum = (index + 1) as WorkflowStep;
        const isDone = currentStep > stepNum;
        const isActive = currentStep === stepNum;
        const status = isDone ? "done" : isActive ? "active" : "pending";

        return (
          <React.Fragment key={stepNum}>
            <div className="step-item">
              <div className={`step-circle ${status}`} aria-current={isActive ? "step" : undefined}>
                {isDone ? <Check size={12} strokeWidth={3} /> : stepNum}
              </div>
              <span className={`step-label ${status}`}>{step.label}</span>
            </div>

            {index < STEPS.length - 1 && (
              <div className={`step-connector ${isDone ? "done" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
