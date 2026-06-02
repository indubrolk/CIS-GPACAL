"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Step4Props {
  saved: number;
  created: number;
  skipped: number;
  onUploadAnother: () => void;
}

export function Step4Success({ saved, created, skipped, onUploadAnother }: Step4Props) {
  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
      <CardContent className="flex flex-col items-center py-12 space-y-6">
        {/* Animated checkmark */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-bounce-once">
          <span className="text-5xl">✅</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-100">Results Saved!</h2>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-blue-400">{saved}</p>
            <p className="text-sm text-slate-400">results saved</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-400">{created}</p>
            <p className="text-sm text-slate-400">new student accounts</p>
          </div>
          {skipped > 0 && (
            <div>
              <p className="text-3xl font-bold text-yellow-400">{skipped}</p>
              <p className="text-sm text-slate-400">skipped (repeat/no improvement)</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button
            onClick={onUploadAnother}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Upload Another Subject
          </Button>
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300"
            onClick={() => (window.location.href = "/admin/students")}
          >
            View Students
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
