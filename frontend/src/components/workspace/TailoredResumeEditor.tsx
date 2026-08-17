"use client";

import React, { useState, useCallback } from "react";
import { FileText, Briefcase, Star, ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import type { StructuredResume, WorkExperience, Skills } from "@/types";

interface TailoredResumeEditorProps {
  resume: StructuredResume;
  onChange: (updated: StructuredResume) => void;
}

// ── Accordion Section ──────────────────────────────────────────
function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = true,
  id,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        className="accordion-header"
        onClick={() => setOpen((o) => !o)}
        id={`${id}-accordion-btn`}
        aria-expanded={open}
        aria-controls={`${id}-accordion-body`}
        style={{ width: "100%", textAlign: "left" }}
      >
        <span className="accordion-title">
          {icon}
          {title}
        </span>
        {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </button>
      {open && (
        <div className="accordion-body" id={`${id}-accordion-body`} role="region">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Bullet Editor ──────────────────────────────────────────────
function BulletEditor({
  bullets,
  onChange,
  jobIndex,
}: {
  bullets: string[];
  onChange: (updated: string[]) => void;
  jobIndex: number;
}) {
  const updateBullet = (i: number, val: string) => {
    const next = [...bullets];
    next[i] = val;
    onChange(next);
  };

  const removeBullet = (i: number) => {
    onChange(bullets.filter((_, idx) => idx !== i));
  };

  const addBullet = () => {
    onChange([...bullets, ""]);
  };

  return (
    <div>
      {bullets.map((b, i) => (
        <div key={i} className="bullet-item">
          <div className="bullet-dot" aria-hidden="true" />
          <textarea
            id={`bullet-${jobIndex}-${i}`}
            className="bullet-input"
            value={b}
            onChange={(e) => updateBullet(i, e.target.value)}
            rows={2}
            placeholder="Accomplished [X] as measured by [Y] by doing [Z]…"
            aria-label={`Bullet point ${i + 1} for job ${jobIndex + 1}`}
          />
          <button
            onClick={() => removeBullet(i)}
            className="btn-icon"
            aria-label={`Remove bullet ${i + 1}`}
            style={{ flexShrink: 0 }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={addBullet}
        className="btn-ghost"
        id={`add-bullet-${jobIndex}-btn`}
        style={{ marginTop: "0.5rem" }}
      >
        <Plus size={12} />
        Add Bullet
      </button>
      <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.375rem" }}>
        💡 XYZ Formula: "Accomplished [X] as measured by [Y] by doing [Z]"
      </p>
    </div>
  );
}

// ── Skills Tag Editor ──────────────────────────────────────────
function SkillTagEditor({
  skills,
  label,
  color,
  onChange,
  inputId,
}: {
  skills: string[];
  label: string;
  color: string;
  onChange: (updated: string[]) => void;
  inputId: string;
}) {
  const [inputVal, setInputVal] = useState("");

  const addSkill = useCallback(() => {
    const val = inputVal.trim();
    if (val && !skills.includes(val)) {
      onChange([...skills, val]);
      setInputVal("");
    }
  }, [inputVal, skills, onChange]);

  const removeSkill = (skill: string) => {
    onChange(skills.filter((s) => s !== skill));
  };

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <p style={{ fontSize: "0.75rem", fontWeight: 600, color, marginBottom: "0.5rem" }}>
        {label}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", alignItems: "center" }}>
        {skills.map((s) => (
          <span key={s} className="skill-tag-editable">
            {s}
            <button
              onClick={() => removeSkill(s)}
              className="skill-remove-btn"
              aria-label={`Remove skill ${s}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          className="skill-add-input"
          placeholder="+ Add skill"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(); }
          }}
          onBlur={addSkill}
          aria-label={`Add ${label}`}
        />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export function TailoredResumeEditor({ resume, onChange }: TailoredResumeEditorProps) {
  const updateSummary = useCallback(
    (val: string) => onChange({ ...resume, professional_summary: val }),
    [resume, onChange]
  );

  const updateExperience = useCallback(
    (index: number, updated: WorkExperience) => {
      const next = [...resume.work_experience];
      next[index] = updated;
      onChange({ ...resume, work_experience: next });
    },
    [resume, onChange]
  );

  const updateSkills = useCallback(
    (updated: Partial<Skills>) => {
      onChange({ ...resume, skills: { ...resume.skills, ...updated } });
    },
    [resume, onChange]
  );

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <p className="section-title">
        <FileText size={13} />
        Tailored Resume
        <span className="badge badge-accent" style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0 }}>
          AI Generated
        </span>
      </p>

      {/* Professional Summary */}
      <AccordionSection title="Professional Summary" icon={<Star size={14} />} id="summary" defaultOpen>
        <textarea
          id="professional-summary-textarea"
          className="form-input"
          style={{ minHeight: "100px" }}
          value={resume.professional_summary ?? ""}
          onChange={(e) => updateSummary(e.target.value)}
          placeholder="Your tailored professional summary will appear here…"
          aria-label="Professional summary"
        />
      </AccordionSection>

      {/* Work Experience */}
      <AccordionSection title="Work Experience" icon={<Briefcase size={14} />} id="experience" defaultOpen>
        {resume.work_experience.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No work experience data available.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {resume.work_experience.map((job, idx) => (
              <div key={idx} className="card-elevated">
                <div style={{ marginBottom: "0.75rem" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                    {job.job_title}
                  </p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {job.company_name}
                    {job.start_date && (
                      <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                        · {job.start_date} – {job.is_current ? "Present" : job.end_date ?? ""}
                      </span>
                    )}
                  </p>
                </div>
                <BulletEditor
                  bullets={job.bullet_points}
                  jobIndex={idx}
                  onChange={(updated) =>
                    updateExperience(idx, { ...job, bullet_points: updated })
                  }
                />
              </div>
            ))}
          </div>
        )}
      </AccordionSection>

      {/* Skills */}
      <AccordionSection title="Skills" icon={<Star size={14} />} id="skills" defaultOpen>
        <SkillTagEditor
          skills={resume.skills.technical_skills}
          label="Technical Skills"
          color="var(--accent)"
          onChange={(val) => updateSkills({ technical_skills: val })}
          inputId="add-technical-skill"
        />
        <SkillTagEditor
          skills={resume.skills.tools_and_frameworks}
          label="Tools & Frameworks"
          color="var(--color-success)"
          onChange={(val) => updateSkills({ tools_and_frameworks: val })}
          inputId="add-tool-skill"
        />
        <SkillTagEditor
          skills={resume.skills.soft_skills}
          label="Soft Skills"
          color="var(--color-warning)"
          onChange={(val) => updateSkills({ soft_skills: val })}
          inputId="add-soft-skill"
        />
      </AccordionSection>
    </div>
  );
}
