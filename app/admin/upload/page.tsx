"use client";

import { useState, useCallback } from "react";
import { StepIndicator } from "./StepIndicator";
import { Step1SubjectDetails } from "./Step1SubjectDetails";
import { Step2UploadMD } from "./Step2UploadOCR";
import { Step3ReviewEdit } from "./Step3ReviewEdit";
import { Step4Success } from "./Step4Success";
import { GRADE_POINTS } from "@/lib/grades";
import type { ParsedSheet } from "@/lib/parseMD";

interface SubjectFormData {
  subjectCode: string;
  subjectName: string;
  creditPoints: number;
  yearNumber: number;
  semesterNumber: number;
  examType: "Proper" | "Repeat";
  subjectId: number | null;
}

interface StudentRow {
  id: string;
  indexNumber: string;
  grade: string;
  gradePoint: number;
}

const INITIAL_FORM: SubjectFormData = {
  subjectCode: "",
  subjectName: "",
  creditPoints: 0,
  yearNumber: 0,
  semesterNumber: 0,
  examType: "Proper",
  subjectId: null,
};

export default function UploadPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<SubjectFormData>(INITIAL_FORM);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState({ saved: 0, created: 0, skipped: 0 });

  const semesterLabel = `Year ${formData.yearNumber} Semester ${formData.semesterNumber}`;

  // Step 2 → Step 3: convert parsed MD results to editable rows
  const handleMDDone = useCallback(
    (file: File, parsed: ParsedSheet) => {
      setUploadedFile(file);
      const rows: StudentRow[] = parsed.results.map((r, i) => ({
        id: `md-${i}`,
        indexNumber: r.indexNumber,
        grade: r.grade,
        gradePoint: GRADE_POINTS[r.grade] ?? 0,
      }));
      setStudents(rows);
      setStep(3);
    },
    []
  );

  // Step 3 → Step 4: save to server
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Ensure subject exists (create if new)
      let subjectId = formData.subjectId;

      if (!subjectId) {
        const subRes = await fetch("/api/admin/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectCode: formData.subjectCode,
            subjectName: formData.subjectName,
            creditPoints: formData.creditPoints,
            yearNumber: formData.yearNumber,
            semesterNumber: formData.semesterNumber,
          }),
        });
        if (!subRes.ok) throw new Error("Failed to create subject");
        const subData = await subRes.json();
        subjectId = subData.subject.id;
      }

      // Save results
      const res = await fetch("/api/admin/results/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          uploadMeta: {
            filename: uploadedFile?.name || "unknown.md",
            semesterLabel,
          },
          students: students.map((s) => ({
            indexNumber: s.indexNumber,
            grade: s.grade,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save results");
      const data = await res.json();
      setSaveResult({ saved: data.saved, created: data.created, skipped: data.skipped });
      setStep(4);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [formData, students, uploadedFile, semesterLabel]);

  // Reset everything for another upload
  const handleUploadAnother = () => {
    setStep(1);
    setFormData(INITIAL_FORM);
    setStudents([]);
    setUploadedFile(null);
    setSaving(false);
    setSaveResult({ saved: 0, created: 0, skipped: 0 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            📤 Upload Result Sheet
          </h1>
          <p className="text-slate-400">
            Upload a markdown (.md) results file and save student grades
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={step} />

        {/* Step Content */}
        {step === 1 && (
          <Step1SubjectDetails
            formData={formData}
            setFormData={setFormData}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Step2UploadMD onDone={handleMDDone} />
        )}

        {step === 3 && (
          <Step3ReviewEdit
            students={students}
            setStudents={setStudents}
            subjectCode={formData.subjectCode}
            subjectName={formData.subjectName}
            semesterLabel={semesterLabel}
            examType={formData.examType}
            onSave={handleSave}
            saving={saving}
          />
        )}

        {step === 4 && (
          <Step4Success
            saved={saveResult.saved}
            created={saveResult.created}
            skipped={saveResult.skipped}
            onUploadAnother={handleUploadAnother}
          />
        )}
      </div>
    </div>
  );
}
