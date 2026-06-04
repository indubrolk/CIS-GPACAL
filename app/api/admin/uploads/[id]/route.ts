import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pdfUploads } from "@/lib/schema";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadId = parseInt(params.id);
  if (isNaN(uploadId)) {
    return NextResponse.json({ error: "Invalid upload ID" }, { status: 400 });
  }

  try {
    // Check if the upload exists first
    const [upload] = await db
      .select()
      .from(pdfUploads)
      .where(eq(pdfUploads.id, uploadId))
      .limit(1);

    if (!upload) {
      return NextResponse.json({ error: "Result sheet not found" }, { status: 404 });
    }

    // Delete the upload record.
    // This will trigger cascade delete on all results associated with this upload.
    await db.delete(pdfUploads).where(eq(pdfUploads.id, uploadId));

    return NextResponse.json({ success: true, message: "Result sheet and all associated results deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/uploads/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete result sheet";
    return NextResponse.json(
      { error: `Failed to delete result sheet: ${message}` },
      { status: 500 }
    );
  }
}
