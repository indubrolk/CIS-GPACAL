"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState, useCallback } from "react";
import React from "react";

interface SubjectFormData {
  subjectCode: string;
  subjectName: string;
  creditPoints: number;
  yearNumber: number;
  semesterNumber: number; // relative: 1 or 2 within the year (matches DB)
  examType: "Proper" | "Repeat";
  isGpa: boolean;
  subjectId: number | null;
}

interface Step1Props {
  formData: SubjectFormData;
  setFormData: React.Dispatch<React.SetStateAction<SubjectFormData>>;
  onNext: () => void;
}

/**
 * Semester labels: the form stores semesterNumber as 1 or 2 (relative within year),
 * but displays absolute semester numbers to the user:
 *   Year 1, Sem 1 → "Semester 1"   Year 1, Sem 2 → "Semester 2"
 *   Year 2, Sem 1 → "Semester 3"   Year 2, Sem 2 → "Semester 4"
 *   Year 3, Sem 1 → "Semester 5"   Year 3, Sem 2 → "Semester 6"
 *   Year 4, Sem 1 → "Semester 7"   Year 4, Sem 2 → "Semester 8"
 */
const SEM_LABEL: Record<number, Record<number, string>> = {
  1: { 1: "Semester 1", 2: "Semester 2" },
  2: { 1: "Semester 3", 2: "Semester 4" },
  3: { 1: "Semester 5", 2: "Semester 6" },
  4: { 1: "Semester 7", 2: "Semester 8" },
};

export function Step1SubjectDetails({ formData, setFormData, onNext }: Step1Props) {
  const [codeStatus, setCodeStatus] = useState<"idle" | "existing" | "new">("idle");
  const [checking, setChecking] = useState<boolean>(false);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Fetch all subjects once on mount for suggestion list
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch("/api/admin/subjects");
        if (!res.ok) throw new Error("Failed to fetch subjects");
        const data = await res.json();
        // Deduplicate by subjectCode in case DB returns duplicates
        const seen = new Set<string>();
        const unique = (data.subjects || []).filter((s: any) => {
          if (seen.has(s.subjectCode)) return false;
          seen.add(s.subjectCode);
          return true;
        });
        setAllSubjects(unique);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAll();
  }, []);

  // allFilled:
  //   GPA subjects need creditPoints > 0
  //   Non-GPA subjects need creditPoints >= 0 (0 is valid for no-credit subjects)
  //   creditPoints === -1 means "not yet selected" → always blocks Next
  const allFilled =
    formData.subjectCode.trim() !== "" &&
    formData.subjectName.trim() !== "" &&
    (formData.isGpa ? formData.creditPoints > 0 : formData.creditPoints >= 0) &&
    formData.yearNumber > 0 &&
    formData.semesterNumber > 0;

  /**
   * Look up the subject code in the DB and auto-fill the form.
   * Uses functional setState (prev =>) to avoid stale closure issues.
   * semesterNumber from DB is already relative (1-2) — no conversion needed.
   * isGpa from DB is set directly — this is what drives the GPA/Non-GPA button.
   */
  const checkSubjectCode = useCallback(async () => {
    const code = formData.subjectCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) return;

    setChecking(true);
    try {
      const res = await fetch("/api/admin/subjects");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const match = data.subjects?.find((s: any) => s.subjectCode === code);

      if (match) {
        setCodeStatus("existing");
        // Use functional update to always work on latest state, never stale closure
        setFormData((prev) => ({
          ...prev,
          subjectCode: code,
          subjectName: match.subjectName,
          creditPoints: match.creditPoints,
          yearNumber: match.yearNumber,       // DB stores 1-4 ✓
          semesterNumber: match.semesterNumber, // DB stores 1-2 (relative) ✓
          isGpa: typeof match.isGpa === "boolean" ? match.isGpa : true,
          subjectId: match.id,
        }));
      } else {
        setCodeStatus("new");
        setFormData((prev) => ({
          ...prev,
          subjectCode: code,
          subjectName: "",
          creditPoints: -1,   // reset to "not yet selected"
          yearNumber: 0,
          semesterNumber: 0,
          isGpa: true,
          subjectId: null,
        }));
      }
    } catch {
      setCodeStatus("idle");
    } finally {
      setChecking(false);
    }
  }, [formData.subjectCode, setFormData]);

  // Debounce: re-check whenever the subject code changes
  useEffect(() => {
    if (!formData.subjectCode) {
      setCodeStatus("idle");
      return;
    }
    const handler = setTimeout(() => {
      checkSubjectCode();
    }, 500);
    return () => clearTimeout(handler);
  }, [formData.subjectCode, checkSubjectCode]);

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
          <span className="text-2xl">📋</span> Subject Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Subject Code */}
        <div className="space-y-2 relative">
          <Label htmlFor="subjectCode" className="text-slate-300">Subject Code</Label>
          <Input
            id="subjectCode"
            placeholder="e.g. IS2106"
            value={formData.subjectCode}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setFormData((prev) => ({ ...prev, subjectCode: val }));
              if (val.length >= 2) {
                // Deduplicate suggestions by subjectCode
                const seen = new Set<string>();
                const filtered = allSubjects.filter((s) => {
                  if (!s.subjectCode.toUpperCase().includes(val)) return false;
                  if (seen.has(s.subjectCode)) return false;
                  seen.add(s.subjectCode);
                  return true;
                });
                setSuggestions(filtered.slice(0, 6));
              } else {
                setSuggestions([]);
              }
            }}
            onBlur={() => {
              // Small delay so onMouseDown on suggestion fires first
              setTimeout(() => checkSubjectCode(), 150);
            }}
            className="bg-slate-800 border-slate-700 text-slate-100 uppercase"
          />

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-600 rounded shadow-lg max-h-48 overflow-auto">
              {suggestions.map((s) => (
                <li
                  key={s.id}
                  className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-slate-100"
                  onMouseDown={() => {
                    // Functional update — no stale closure
                    setFormData((prev) => ({
                      ...prev,
                      subjectCode: s.subjectCode,
                      subjectName: s.subjectName,
                      creditPoints: s.creditPoints,
                      yearNumber: s.yearNumber,         // DB 1-4 ✓
                      semesterNumber: s.semesterNumber, // DB 1-2 relative ✓
                      isGpa: typeof s.isGpa === "boolean" ? s.isGpa : true,
                      subjectId: s.id,
                    }));
                    setSuggestions([]);
                    setCodeStatus("existing");
                  }}
                >
                  <span className="font-mono text-blue-300">{s.subjectCode}</span>
                  <span className="text-slate-400 ml-2">– {s.subjectName}</span>
                </li>
              ))}
            </ul>
          )}

          {checking && <p className="text-xs text-slate-400">Checking…</p>}
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
            onChange={(e) => setFormData((prev) => ({ ...prev, subjectName: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-slate-100"
          />
        </div>

        {/* Credit Points */}
        <div className="space-y-2">
          <Label htmlFor="creditPoints" className="text-slate-300">Credit Points</Label>
          <Select
            id="creditPoints"
            value={String(formData.creditPoints)}
            onChange={(e) => {
              const credits = Number(e.target.value);
              setFormData((prev) => ({
                ...prev,
                creditPoints: credits,
                // Auto-select Non-GPA whenever 0 credits is chosen
                isGpa: credits === 0 ? false : prev.isGpa,
              }));
            }}
            className="bg-slate-800 border-slate-700 text-slate-100"
          >
            {/* -1 is the sentinel "not yet selected" placeholder */}
            <option value="-1" disabled>Select credits</option>
            {/* 0 is ALWAYS a real, selectable option — for Non-GPA / no-credit subjects */}
            <option value="0">0 (Non-GPA / No Credits)</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
          </Select>
        </div>

        {/* Year & Semester row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="yearNumber" className="text-slate-300">Year</Label>
            <Select
              id="yearNumber"
              value={String(formData.yearNumber)}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  yearNumber: Number(e.target.value),
                  semesterNumber: 0, // reset semester when year changes
                }))
              }
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
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, semesterNumber: Number(e.target.value) }))
              }
              className="bg-slate-800 border-slate-700 text-slate-100"
            >
              <option value="0">Select semester</option>
              {formData.yearNumber > 0 && (
                <>
                  {/* value is relative (1 or 2), label shows absolute semester number */}
                  <option value="1">{SEM_LABEL[formData.yearNumber]?.[1]}</option>
                  <option value="2">{SEM_LABEL[formData.yearNumber]?.[2]}</option>
                </>
              )}
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
                  onChange={() => setFormData((prev) => ({ ...prev, examType: type }))}
                  className="accent-blue-500"
                />
                <span className="text-slate-300">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Subject Type (GPA / Non-GPA) — reflects formData.isGpa directly */}
        <div className="space-y-2">
          <Label className="text-slate-300">Subject Type</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, isGpa: true }))}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${
                formData.isGpa
                  ? "border-blue-500 bg-blue-500/15 text-blue-300 shadow-lg shadow-blue-500/10"
                  : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
              }`}
            >
              <span className="text-lg">📊</span>
              <div className="text-left">
                <div>GPA Subject</div>
                <div className={`text-[10px] font-normal ${formData.isGpa ? "text-blue-400/70" : "text-slate-500"}`}>
                  Counts toward GPA
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, isGpa: false }))}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${
                !formData.isGpa
                  ? "border-amber-500 bg-amber-500/15 text-amber-300 shadow-lg shadow-amber-500/10"
                  : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
              }`}
            >
              <span className="text-lg">📋</span>
              <div className="text-left">
                <div>Non-GPA Subject</div>
                <div className={`text-[10px] font-normal ${!formData.isGpa ? "text-amber-400/70" : "text-slate-500"}`}>
                  Does NOT count toward GPA
                </div>
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
