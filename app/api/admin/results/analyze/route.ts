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

    // ── 1. Try Google Gemini API (Multimodal Vision OCR) if Configured ─────────
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log("Attempting Gemini API PDF parsing...");
        const base64Data = buffer.toString("base64");

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const payload = {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64Data,
                  },
                },
                {
                  text: "Analyze this university result sheet PDF. Extract the subject code, subject name, semester description, and all student index numbers with their corresponding grades. Make sure to capture every single student result listed in the table or sheet. Ensure index numbers (e.g. 22CIS0123) and grades (e.g. A+, A, A-, B+, B, B-, C+, C, C-, D+, D, E, AB) are extracted with 100% accuracy. If you see a grade like 'B-' or 'A-', make sure you extract the '-' symbol and do not shorten it to 'B' or 'A'. Return a JSON object matching the schema.",
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                subjectCodeFromHeader: { type: "STRING" },
                subjectNameFromHeader: { type: "STRING" },
                semesterFromHeader: { type: "STRING" },
                results: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      indexNumber: { type: "STRING" },
                      grade: { type: "STRING" },
                    },
                    required: ["indexNumber", "grade"],
                  },
                },
              },
              required: ["results"],
            },
          },
        };

        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            const parsedData = JSON.parse(textResponse);
            // Standardize grades to uppercase and validate them
            const validGrades = new Set([
              "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "E", "AB"
            ]);
            const filteredResults = (parsedData.results || [])
              .map((r: any) => ({
                indexNumber: String(r.indexNumber).trim().toUpperCase(),
                grade: String(r.grade).trim().toUpperCase(),
              }))
              .filter((r: any) => r.indexNumber && validGrades.has(r.grade));

            console.log(`Gemini parsed successfully! Found ${filteredResults.length} results.`);
            return NextResponse.json({
              success: true,
              method: "gemini",
              data: {
                subjectCodeFromHeader: parsedData.subjectCodeFromHeader || null,
                subjectNameFromHeader: parsedData.subjectNameFromHeader || null,
                semesterFromHeader: parsedData.semesterFromHeader || null,
                results: filteredResults,
                totalFound: filteredResults.length,
              },
            });
          }
        } else {
          const errorText = await geminiRes.text();
          console.error("Gemini API error response:", errorText);
        }
      } catch (geminiErr) {
        console.error("Failed to run Gemini analysis:", geminiErr);
      }
    }

    // ── 2. Fallback: Local Digital Text Extraction using pdf-parse ───────────
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
