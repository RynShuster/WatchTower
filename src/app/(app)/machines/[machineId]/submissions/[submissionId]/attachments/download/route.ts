import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const UPLOAD_ROOT = process.env.WATCHTOWER_UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

type RouteContext = {
  params: Promise<{
    machineId: string;
    submissionId: string;
  }>;
};

function sanitizeArchiveName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET(_: Request, { params }: RouteContext) {
  const { machineId, submissionId } = await params;

  const submission = await prisma.healthSubmission.findFirst({
    where: { id: submissionId, machineId },
    include: { attachments: { orderBy: [{ uploadedAt: "asc" }, { id: "asc" }] } },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  if (submission.attachments.length === 0) {
    return NextResponse.json({ error: "No attachments found for this submission." }, { status: 404 });
  }

  const zip = new JSZip();

  for (const attachment of submission.attachments) {
    const absolutePath = path.join(UPLOAD_ROOT, ...attachment.storedPath.split("/"));
    try {
      const fileBuffer = await readFile(absolutePath);
      zip.file(attachment.originalName, fileBuffer);
    } catch {
      // Skip missing/unreadable files and keep packaging available files.
    }
  }

  const archiveBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  if (archiveBuffer.length === 0) {
    return NextResponse.json({ error: "Unable to read submission attachments." }, { status: 500 });
  }

  const archiveName = sanitizeArchiveName(`machine-${machineId}-submission-${submission.id}-ballbar.zip`);

  return new NextResponse(new Uint8Array(archiveBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archiveName}"`,
      "Cache-Control": "no-store",
    },
  });
}
