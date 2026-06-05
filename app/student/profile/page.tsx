"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, GraduationCap, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface GPA {
  indexNumber: string;
  fgpa: number;
  degreeClass: string;
  isPassed: boolean;
  bestSemesterGPA: number;
  totalSubjects: number;
  totalCredits: number;
}

export default function StudentProfilePage() {
  const [data, setData] = useState<GPA | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/student/gpa");
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="p-6">Failed to load profile</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User /> Academic Profile
          </h1>
          <p className="text-slate-400">Your academic record overview</p>
        </div>

        {/* Student Card */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap /> Student Information
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            <p>
              Index Number:{" "}
              <span className="font-mono text-emerald-400">
                {data.indexNumber}
              </span>
            </p>

            <p>
              FGPA:{" "}
              <span className="font-bold text-emerald-400">
                {data.fgpa.toFixed(2)}
              </span>
            </p>

            <p>Class: {data.degreeClass}</p>

            <Badge className={data.isPassed ? "bg-green-600" : "bg-red-600"}>
              {data.isPassed ? "Eligible for Degree" : "Not Eligible"}
            </Badge>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle>Academic Summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            <p>Total Subjects: {data.totalSubjects}</p>
            <p>Total Credits: {data.totalCredits}</p>
            <p>Best Semester GPA: {data.bestSemesterGPA.toFixed(2)}</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={() => router.push("/student/dashboard")}>
            Dashboard
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/student/change-password")}
          >
            Change Password
          </Button>
        </div>

      </div>
    </div>
  );
}