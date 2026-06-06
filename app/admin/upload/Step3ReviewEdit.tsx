"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { GRADE_POINTS } from "@/lib/grades";

const ALL_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "E", "AB"];
const INDEX_PATTERN = /^\d{2}[A-Z]{2,4}\d{3,5}$/;

interface StudentRow {
  id: string;
  indexNumber: string;
  grade: string;
  gradePoint: number;
}

interface Step3Props {
  students: StudentRow[];
  setStudents: (s: StudentRow[]) => void;
  subjectCode: string;
  subjectName: string;
  semesterLabel: string;
  examType: string;
  isGpa: boolean;
  onSave: () => void;
  saving: boolean;
}

function GradeDistribution({ students }: { students: StudentRow[] }) {
  const groups: Record<string, { label: string; color: string; count: number }> = {
    A: { label: "A grades", color: "bg-emerald-500", count: 0 },
    B: { label: "B grades", color: "bg-blue-500", count: 0 },
    C: { label: "C grades", color: "bg-yellow-500", count: 0 },
    D: { label: "D grades", color: "bg-orange-500", count: 0 },
    F: { label: "E/AB", color: "bg-red-500", count: 0 },
  };

  students.forEach((s) => {
    if (s.grade.startsWith("A") && s.grade !== "AB") groups.A.count++;
    else if (s.grade.startsWith("B")) groups.B.count++;
    else if (s.grade.startsWith("C")) groups.C.count++;
    else if (s.grade.startsWith("D")) groups.D.count++;
    else groups.F.count++;
  });

  const total = students.length || 1;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-400">Grade Distribution</p>
      <div className="flex h-6 rounded-full overflow-hidden bg-slate-800">
        {Object.values(groups).map((g) =>
          g.count > 0 ? (
            <div
              key={g.label}
              className={`${g.color} transition-all duration-500`}
              style={{ width: `${(g.count / total) * 100}%` }}
              title={`${g.label}: ${g.count}`}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        {Object.values(groups).map((g) => (
          <span key={g.label} className="flex items-center gap-1">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${g.color}`} />
            {g.label}: {g.count}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Step3ReviewEdit({
  students, setStudents, subjectCode, subjectName,
  semesterLabel, examType, isGpa, onSave, saving,
}: Step3Props) {
  const updateRow = (id: string, field: keyof StudentRow, value: string) => {
    setStudents(
      students.map((s) => {
        if (s.id !== id) return s;
        if (field === "grade") {
          return { ...s, grade: value, gradePoint: GRADE_POINTS[value] ?? 0 };
        }
        return { ...s, [field]: value };
      })
    );
  };

  const removeRow = (id: string) => {
    setStudents(students.filter((s) => s.id !== id));
  };

  const addRow = () => {
    setStudents([
      ...students,
      {
        id: `manual-${Date.now()}`,
        indexNumber: "",
        grade: "C",
        gradePoint: GRADE_POINTS["C"],
      },
    ]);
  };

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
          <span className="text-2xl">✏️</span> Review & Edit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary bar */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-800/60 border border-slate-700">
          <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">
            {students.length} students
          </Badge>
          <Badge className="bg-slate-700 text-slate-300">
            {subjectCode} {subjectName}
          </Badge>
          <Badge className="bg-slate-700 text-slate-300">{semesterLabel}</Badge>
          <Badge className="bg-slate-700 text-slate-300">{examType}</Badge>
          {!isGpa && (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 border">
              📋 Non-GPA
            </Badge>
          )}
        </div>

        {/* Editable Table */}
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 bg-slate-800/50">
                <TableHead className="w-12 text-slate-400">#</TableHead>
                <TableHead className="text-slate-400">Index Number</TableHead>
                <TableHead className="text-slate-400">Grade</TableHead>
                <TableHead className="text-slate-400">Grade Point</TableHead>
                <TableHead className="w-16 text-slate-400">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((row, i) => {
                const badIndex = row.indexNumber && !INDEX_PATTERN.test(row.indexNumber);
                return (
                  <TableRow
                    key={row.id}
                    className={`border-slate-800 ${badIndex ? "bg-yellow-950/20" : ""}`}
                  >
                    <TableCell className="text-slate-500 font-mono text-xs">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          value={row.indexNumber}
                          onChange={(e) =>
                            updateRow(row.id, "indexNumber", e.target.value.toUpperCase())
                          }
                          className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-sm font-mono w-36"
                        />
                        {badIndex && (
                          <Tooltip content="Unusual index format — please verify">
                            <span className="text-yellow-400 cursor-help">⚠️</span>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.grade}
                        onChange={(e) => updateRow(row.id, "grade", e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-sm w-20"
                      >
                        {ALL_GRADES.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-slate-300">
                        {isGpa ? row.gradePoint.toFixed(2) : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => removeRow(row.id)}
                        className="text-red-400 hover:text-red-300 text-lg transition-colors"
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Add row */}
        <Button
          variant="outline"
          onClick={addRow}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          ＋ Add Row
        </Button>

        {/* Grade Distribution */}
        <GradeDistribution students={students} />

        {/* Save Button with Confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={students.length === 0 || saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
            >
              {saving ? "Saving..." : "Save All Results →"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-slate-900 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-100">
                Confirm Save
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Save {students.length} results for {subjectName}? This will
                create accounts for any new students.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onSave}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
