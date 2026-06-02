"use client";

import { useState, useCallback, useRef } from "react";
import { parseOCRText, type ParsedSheet } from "@/lib/parsePDF";

// ─── Types ──────────────────────────────────────────────────────────────────

export type OCRStatus =
  | "idle"
  | "loading_pdf"
  | "rendering"
  | "ocr_page"
  | "parsing"
  | "done"
  | "error";

export interface OCRProgress {
  status: OCRStatus;
  percent: number;
  currentPage: number;
  totalPages: number;
  statusMessage: string;
}

const INITIAL_PROGRESS: OCRProgress = {
  status: "idle",
  percent: 0,
  currentPage: 0,
  totalPages: 0,
  statusMessage: "",
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePDFOCR() {
  const [progress, setProgress] = useState<OCRProgress>(INITIAL_PROGRESS);
  const [result, setResult] = useState<ParsedSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  const reset = useCallback(() => {
    setProgress(INITIAL_PROGRESS);
    setResult(null);
    setError(null);
    processingRef.current = false;
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (processingRef.current) return;
    processingRef.current = true;

    // Reset state
    setResult(null);
    setError(null);

    try {
      // ── Step 1: Load PDF ────────────────────────────────────────────────
      setProgress({
        status: "loading_pdf",
        percent: 0,
        currentPage: 0,
        totalPages: 0,
        statusMessage: "Loading PDF...",
      });

      // Dynamic import pdfjs-dist (client-side only)
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;

      let allText = "";

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // ── Step 2: Render page to canvas ───────────────────────────────
        const renderPercent = Math.round((pageNum - 1) / totalPages * 50);
        setProgress({
          status: "rendering",
          percent: renderPercent,
          currentPage: pageNum,
          totalPages,
          statusMessage: `Rendering page ${pageNum} of ${totalPages}...`,
        });

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.5 });

        // Create offscreen canvas
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get canvas context");

        await page.render({ canvasContext: ctx, viewport }).promise;

        // ── Step 3: OCR the rendered page ───────────────────────────────
        const ocrPercent = 50 + Math.round((pageNum - 1) / totalPages * 40);
        setProgress({
          status: "ocr_page",
          percent: ocrPercent,
          currentPage: pageNum,
          totalPages,
          statusMessage: `Reading text from page ${pageNum} of ${totalPages}...`,
        });

        // Dynamic import Tesseract.js
        const Tesseract = await import("tesseract.js");
        const worker = await Tesseract.createWorker("eng");
        const { data } = await worker.recognize(canvas);
        allText += data.text + "\n";
        await worker.terminate();

        // Clean up canvas
        canvas.width = 0;
        canvas.height = 0;
      }

      // ── Step 4: Parse extracted text ──────────────────────────────────
      setProgress({
        status: "parsing",
        percent: 90,
        currentPage: totalPages,
        totalPages,
        statusMessage: "Extracting student results...",
      });

      const parsed = parseOCRText(allText);

      setResult(parsed);
      setProgress({
        status: "done",
        percent: 100,
        currentPage: totalPages,
        totalPages,
        statusMessage: `Found ${parsed.totalFound} student results`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setProgress({
        status: "error",
        percent: 0,
        currentPage: 0,
        totalPages: 0,
        statusMessage: `OCR failed: ${message}`,
      });
    } finally {
      processingRef.current = false;
    }
  }, []);

  return { processFile, progress, result, error, reset };
}
