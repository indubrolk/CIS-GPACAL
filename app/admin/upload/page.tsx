"use client";

import { useState, useCallback } from "react";
import { StepIndicator } from "./StepIndicator";
import { Step1SubjectDetails } from "./Step1SubjectDetails";
import { Step2UploadMD } from "./Step2UploadOCR";
import { Step3ReviewEdit } from "./Step3ReviewEdit";
import { Step4Success } from "./Step4Success";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { GRADE_POINTS } from "@/lib/grades";
import type { ParsedSheet } from "@/lib/parseMD";

interface SubjectFormData {
  subjectCode: string;
  subjectName: string;
  creditPoints: number;
  yearNumber: number;
  semesterNumber: number;
  examType: "Proper" | "Repeat";
  isGpa: boolean;
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
  creditPoints: -1,   // -1 = "not yet selected"; 0 = Non-GPA subject with no credits
  yearNumber: 0,
  semesterNumber: 0,
  examType: "Proper",
  isGpa: true,
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
            isGpa: formData.isGpa,
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save results");
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
    <div className="min-h-screen bg-slate-950">
      <AdminSidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8 max-w-4xl mx-auto">
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
              isGpa={formData.isGpa}
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
      </main>
    </div>
  );
}
