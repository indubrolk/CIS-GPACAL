import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { parseOCRText } from "@/lib/parsePDF";
import pdf from "pdf-parse";

// ─── Helper: Verify Admin JWT ───────────────────────────────────────────────

function getAdminFromRequest(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

// ─── POST /api/admin/results/analyze ────────────────────────────────────────

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text digitally using pdf-parse
    let text = "";
    try {
      const pdfData = await pdf(buffer);
      text = pdfData.text || "";
    } catch (parseErr) {
      console.warn("Digital PDF parsing failed, will fallback to OCR:", parseErr);
    }

    // Run our upgraded, robust parser on the extracted text
    const parsedSheet = parseOCRText(text);

    // If we successfully found results, return them digitally
    if (parsedSheet.results.length > 0) {
      return NextResponse.json({
        success: true,
        method: "digital",
        data: parsedSheet,
      });
    }

    // Otherwise, tell the client to fall back to Tesseract OCR
    return NextResponse.json({
      success: true,
      method: "ocr_fallback",
      message: "No digital text layer found or no results parsed digitally. Fallback to client-side OCR.",
    });
  } catch (error) {
    console.error("POST /api/admin/results/analyze error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to analyze PDF file: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}
