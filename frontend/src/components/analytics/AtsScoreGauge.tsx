"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BarChart2, Loader2, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import type { ATSScoreResponse } from "@/types";

interface AtsScoreGaugeProps {
  resumeText: string;
  jobDescriptionText: string;
  onScored?: (score: ATSScoreResponse) => void;
}

// Animate number from 0 to target
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

function getScoreColor(score: number) {
  if (score >= 80) return "var(--color-success)";
  if (score >= 60) return "var(--color-warning)";
  return "var(--color-danger)";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Strong Match";
  if (score >= 60) return "Moderate Match";
  return "Needs Work";
}

export function AtsScoreGauge({ resumeText, jobDescriptionText, onScored }: AtsScoreGaugeProps) {
  const [atsData, setAtsData] = useState<ATSScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const canAnalyze = resumeText.trim().length > 20 && jobDescriptionText.trim().length > 50;

  const displayScore = useCountUp(atsData?.overall_match_score ?? 0);

  const analyze = useCallback(async () => {
    if (!canAnalyze) {
      toast.error("Please upload a resume and add a job description first.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<ATSScoreResponse>("/tailor/ats-score", {
        resume_text: resumeText,
        job_description_text: jobDescriptionText,
      });
      setAtsData(res.data);
      onScored?.(res.data);
      toast.success(`ATS score computed: ${res.data.overall_match_score}%`);
    } catch {
      toast.error("Failed to calculate ATS score. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [canAnalyze, resumeText, jobDescriptionText, onScored]);

  // SVG gauge
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const score = atsData?.overall_match_score ?? 0;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="card">
      <p className="section-title">
        <BarChart2 size={13} />
        ATS Match Score
      </p>

      {/* Gauge */}
      <div className="ats-gauge-wrapper">
        <div className="ats-gauge-svg" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
            {/* Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={strokeWidth}
            />
            {/* Progress */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={atsData ? dashOffset : circumference}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }}
            />
          </svg>
          {/* Center label */}
          <div className="ats-gauge-label" style={{ position: "absolute" }}>
            {atsData ? (
              <>
                <div className="ats-gauge-score" style={{ color }}>
                  {displayScore}
                  <span style={{ fontSize: "1rem" }}>%</span>
                </div>
                <div className="ats-gauge-sub">{getScoreLabel(score)}</div>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <TrendingUp size={24} color="var(--text-muted)" />
                <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Not scored
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analyze button */}
        <button
          id="analyze-ats-btn"
          className="btn-primary"
          onClick={analyze}
          disabled={loading || !canAnalyze}
          style={{ alignSelf: "stretch" }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <BarChart2 size={14} />
              {atsData ? "Re-Analyze ATS Match" : "Analyze ATS Match"}
            </>
          )}
        </button>

        {!canAnalyze && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
            Upload a resume and add a job description to enable analysis.
          </p>
        )}
      </div>

      {/* Skills breakdown */}
      {atsData && (
        <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Matched */}
          {atsData.matched_skills.length > 0 && (
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-success)", marginBottom: "0.5rem" }}>
                ✓ Matched Skills ({atsData.matched_skills.length})
              </p>
              <div className="skills-tags-scroll">
                {atsData.matched_skills.map((skill) => (
                  <span key={skill} className="badge badge-success">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Missing */}
          {atsData.missing_skills.length > 0 && (
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-danger)", marginBottom: "0.5rem" }}>
                ✗ Missing Keywords ({atsData.missing_skills.length})
              </p>
              <div className="skills-tags-scroll">
                {atsData.missing_skills.map((skill) => (
                  <span key={skill} className="badge badge-danger">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {atsData.improvement_recommendations.length > 0 && (
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                💡 Recommendations
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {atsData.improvement_recommendations.map((rec, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      paddingLeft: "1rem",
                      position: "relative",
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ position: "absolute", left: 0 }}>•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
