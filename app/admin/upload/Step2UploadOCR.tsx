"use client";

import { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parseMDText, type ParsedSheet } from "@/lib/parseMD";

interface Step2Props {
  onDone: (file: File, parsed: ParsedSheet) => void;
}

export function Step2UploadMD({ onDone }: Step2Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setParsed(null);

    // Validate file type
    const name = file.name.toLowerCase();
    if (!name.endsWith(".md") && !name.endsWith(".txt") && !name.endsWith(".markdown")) {
      setError("Only Markdown (.md) or text (.txt) files are accepted.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Max 5MB.");
      return;
    }

    setSelectedFile(file);
    setProcessing(true);

    try {
      const text = await file.text();

      if (!text.trim()) {
        setError("The file is empty. Please check the file and try again.");
        setProcessing(false);
        return;
      }

      const result = parseMDText(text);

      if (result.totalFound === 0) {
        setError(
          "No valid student results found in this file.\n\n" +
          "Expected format (markdown table):\n" +
          "| Index Number | Grade |\n" +
          "|---|---|\n" +
          "| 22CIS0001 | A+ |\n\n" +
          "Or simple format:\n" +
          "22CIS0001 A+"
        );
        if (result.parseErrors.length > 0) {
          setError(
            (prev) =>
              `${prev}\n\nParse errors:\n${result.parseErrors.join("\n")}`
          );
        }
        setProcessing(false);
        return;
      }

      setParsed(result);
    } catch (err) {
      setError(
        "Failed to read file: " +
        (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedFile && parsed) {
      onDone(selectedFile, parsed);
    }
  }, [selectedFile, parsed, onDone]);

  const handleReset = useCallback(() => {
    setError(null);
    setParsed(null);
    setSelectedFile(null);
    setProcessing(false);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
          <span className="text-2xl">📝</span> Upload Results File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Drop Zone */}
        {!parsed && !processing && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
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
              ${
                dragOver
                  ? "border-blue-400 bg-blue-950/30 scale-[1.02]"
                  : "border-slate-700 hover:border-slate-500 bg-slate-800/30"
              }
            `}
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="text-slate-300 font-medium">
              Drop your results .md file here
            </p>
            <p className="text-slate-500 text-sm mt-1">
              or click to browse · .md / .txt · Max 5MB
            </p>
            <div className="mt-4 p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-left text-xs text-slate-400 max-w-sm mx-auto">
              <p className="font-medium text-slate-300 mb-1">Expected format:</p>
              <pre className="font-mono whitespace-pre">
{`| Index Number | Grade |
|---|---|
| 22CIS0001    | A+    |
| 22CIS0002    | B     |`}
              </pre>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".md,.txt,.markdown"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {/* Processing */}
        {processing && (
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="animate-spin text-blue-400 text-xl">⏳</div>
            <span className="text-slate-300 font-medium">
              Parsing results file...
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertDescription className="whitespace-pre-wrap text-sm">
                {error}
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-slate-700 text-slate-300"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Success — show parsed results summary */}
        {parsed && selectedFile && (
          <div className="space-y-4">
            <Alert variant="success">
              <AlertDescription className="font-medium">
                ✅ Found {parsed.totalFound} student results in{" "}
                <span className="font-mono text-blue-300">{selectedFile.name}</span>
              </AlertDescription>
            </Alert>

            {/* Parse warnings */}
            {parsed.parseErrors.length > 0 && (
              <Alert variant="warning">
                <AlertDescription>
                  <p className="font-medium mb-1">
                    ⚠️ {parsed.parseErrors.length} warning(s):
                  </p>
                  <ul className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
                    {parsed.parseErrors.map((err, i) => (
                      <li key={i} className="font-mono">{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview first few results */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              <p className="text-xs text-slate-400 mb-2 font-medium">
                Preview (first {Math.min(5, parsed.results.length)} of {parsed.totalFound}):
              </p>
              <div className="space-y-1">
                {parsed.results.slice(0, 5).map((r, i) => (
                  <div
                    key={i}
                    className="flex justify-between px-2 py-1 rounded bg-slate-800/60 text-sm"
                  >
                    <span className="font-mono text-slate-300">
                      {r.indexNumber}
                    </span>
                    <span className="font-semibold text-blue-300">
                      {r.grade}
                    </span>
                  </div>
                ))}
                {parsed.totalFound > 5 && (
                  <p className="text-xs text-slate-500 text-center mt-1">
                    ...and {parsed.totalFound - 5} more
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continue to Review →
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-slate-700 text-slate-300"
              >
                Choose Different File
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
