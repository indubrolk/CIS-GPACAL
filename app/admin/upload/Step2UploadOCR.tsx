"use client";

import { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OCRProgress } from "@/lib/hooks/usePDFOCR";
import type { ParsedSheet } from "@/lib/parsePDF";

interface Step2Props {
  processFile: (file: File) => Promise<void>;
  progress: OCRProgress;
  result: ParsedSheet | null;
  error: string | null;
  reset: () => void;
  subjectCode: string;
  onDone: (file: File) => void;
}

export function Step2UploadOCR({
  processFile, progress, result, error, reset, subjectCode, onDone,
}: Step2Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setSizeError(null);
      if (file.type !== "application/pdf") {
        setSizeError("Only PDF files are accepted.");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setSizeError("File too large. Max 20MB.");
        return;
      }
      setSelectedFile(file);
      await processFile(file);
    },
    [processFile]
  );

  // Auto-advance when done
  if (result && selectedFile && progress.status === "done") {
    setTimeout(() => onDone(selectedFile), 800);
  }

  const headerMismatch =
    result?.subjectCodeFromHeader &&
    subjectCode &&
    result.subjectCodeFromHeader !== subjectCode.replace(/\s+/g, "").toUpperCase();

  const isProcessing =
    progress.status !== "idle" &&
    progress.status !== "done" &&
    progress.status !== "error";

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
          <span className="text-2xl">📄</span> Upload & OCR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Drop Zone */}
        {progress.status === "idle" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-all duration-300
              ${dragOver
                ? "border-blue-400 bg-blue-950/30 scale-[1.02]"
                : "border-slate-700 hover:border-slate-500 bg-slate-800/30"
              }
            `}
          >
            <div className="text-4xl mb-3">☁️</div>
            <p className="text-slate-300 font-medium">
              Drop result sheet PDF here
            </p>
            <p className="text-slate-500 text-sm mt-1">
              or click to browse · PDF only · Max 20MB
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {sizeError && (
          <Alert variant="destructive">
            <AlertDescription>{sizeError}</AlertDescription>
          </Alert>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin text-blue-400 text-xl">⏳</div>
              <span className="text-slate-300 font-medium">
                {progress.statusMessage}
              </span>
            </div>
            <Progress value={progress.percent} className="h-3" />
            <p className="text-slate-500 text-xs text-right">
              {progress.percent}%
            </p>
          </div>
        )}

        {/* Done */}
        {progress.status === "done" && result && (
          <div className="space-y-3">
            <Alert variant="success">
              <AlertDescription className="font-medium">
                ✅ {progress.statusMessage}
              </AlertDescription>
            </Alert>
            {headerMismatch && (
              <Alert variant="warning">
                <AlertDescription>
                  ⚠️ Header says <strong>{result.subjectCodeFromHeader}</strong>{" "}
                  but you entered <strong>{subjectCode}</strong>. Please verify.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Error */}
        {progress.status === "error" && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertDescription>{progress.statusMessage}</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              onClick={() => { reset(); setSelectedFile(null); }}
              className="border-slate-700 text-slate-300"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
