"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState, useCallback } from "react";

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

interface Step1Props {
  formData: SubjectFormData;
  setFormData: (data: SubjectFormData) => void;
  onNext: () => void;
}

export function Step1SubjectDetails({ formData, setFormData, onNext }: Step1Props) {
  const [codeStatus, setCodeStatus] = useState<"idle" | "existing" | "new">("idle");
  const [checking, setChecking] = useState(false);

  const allFilled =
    formData.subjectCode.trim() !== "" &&
    formData.subjectName.trim() !== "" &&
    formData.creditPoints > 0 &&
    formData.yearNumber > 0 &&
    formData.semesterNumber > 0;

  const checkSubjectCode = useCallback(async () => {
    const code = formData.subjectCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) return;

    setChecking(true);
    try {
      const res = await fetch("/api/admin/subjects");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const match = data.subjects?.find(
        (s: any) => s.subjectCode === code
      );
      if (match) {
        setCodeStatus("existing");
        setFormData({
          ...formData,
          subjectCode: code,
          subjectName: match.subjectName,
          creditPoints: match.creditPoints,
          yearNumber: match.yearNumber,
          semesterNumber: match.semesterNumber,
          isGpa: match.isGpa ?? true,
          subjectId: match.id,
        });
      } else {
        setCodeStatus("new");
        setFormData({ ...formData, subjectCode: code, subjectId: null });
      }
    } catch {
      setCodeStatus("idle");
    } finally {
      setChecking(false);
    }
  }, [formData.subjectCode]);

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
          <span className="text-2xl">📋</span> Subject Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Subject Code */}
        <div className="space-y-2">
          <Label htmlFor="subjectCode" className="text-slate-300">Subject Code</Label>
          <Input
            id="subjectCode"
            placeholder="e.g. IS 2106"
            value={formData.subjectCode}
            onChange={(e) =>
              setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })
            }
            onBlur={checkSubjectCode}
            className="bg-slate-800 border-slate-700 text-slate-100 uppercase"
          />
          {checking && <p className="text-xs text-slate-400">Checking...</p>}
          {codeStatus === "existing" && (
            <Alert variant="success" className="py-2">
              <AlertDescription>✓ Existing subject — details pre-filled</AlertDescription>
            </Alert>
          )}
          {codeStatus === "new" && (
            <Alert variant="info" className="py-2">
              <AlertDescription>New subject — please fill in details below</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Subject Name */}
        <div className="space-y-2">
          <Label htmlFor="subjectName" className="text-slate-300">Subject Name</Label>
          <Input
            id="subjectName"
            placeholder="e.g. System Analysis & Design"
            value={formData.subjectName}
            onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
            className="bg-slate-800 border-slate-700 text-slate-100"
          />
        </div>

        {/* Credit Points */}
        <div className="space-y-2">
          <Label htmlFor="creditPoints" className="text-slate-300">Credit Points</Label>
          <Select
            id="creditPoints"
            value={String(formData.creditPoints)}
            onChange={(e) => setFormData({ ...formData, creditPoints: Number(e.target.value) })}
            className="bg-slate-800 border-slate-700 text-slate-100"
          >
            <option value="0">Select credits</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </Select>
        </div>

        {/* Year & Semester row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="yearNumber" className="text-slate-300">Year</Label>
            <Select
              id="yearNumber"
              value={String(formData.yearNumber)}
              onChange={(e) => setFormData({ ...formData, yearNumber: Number(e.target.value) })}
              className="bg-slate-800 border-slate-700 text-slate-100"
            >
              <option value="0">Select year</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="semesterNumber" className="text-slate-300">Semester</Label>
            <Select
              id="semesterNumber"
              value={String(formData.semesterNumber)}
              onChange={(e) => setFormData({ ...formData, semesterNumber: Number(e.target.value) })}
              className="bg-slate-800 border-slate-700 text-slate-100"
            >
              <option value="0">Select semester</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </Select>
          </div>
        </div>

        {/* Exam Type */}
        <div className="space-y-2">
          <Label className="text-slate-300">Exam Type</Label>
          <div className="flex gap-6">
            {(["Proper", "Repeat"] as const).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="examType"
                  value={type}
                  checked={formData.examType === type}
                  onChange={() => setFormData({ ...formData, examType: type })}
                  className="accent-blue-500"
                />
                <span className="text-slate-300">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Subject Type (GPA / Non-GPA) */}
        <div className="space-y-2">
          <Label className="text-slate-300">Subject Type</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isGpa: true })}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${
                formData.isGpa
                  ? "border-blue-500 bg-blue-500/15 text-blue-300 shadow-lg shadow-blue-500/10"
                  : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
              }`}
            >
              <span className="text-lg">📊</span>
              <div className="text-left">
                <div>GPA Subject</div>
                <div className={`text-[10px] font-normal ${
                  formData.isGpa ? "text-blue-400/70" : "text-slate-500"
                }`}>Counts toward GPA</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isGpa: false })}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${
                !formData.isGpa
                  ? "border-amber-500 bg-amber-500/15 text-amber-300 shadow-lg shadow-amber-500/10"
                  : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
              }`}
            >
              <span className="text-lg">📋</span>
              <div className="text-left">
                <div>Non-GPA Subject</div>
                <div className={`text-[10px] font-normal ${
                  !formData.isGpa ? "text-amber-400/70" : "text-slate-500"
                }`}>Does NOT count toward GPA</div>
              </div>
            </button>
          </div>
        </div>

        {/* Next button */}
        <Button
          onClick={onNext}
          disabled={!allFilled}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
        >
          Next: Upload Results →
        </Button>
      </CardContent>
    </Card>
  );
}
