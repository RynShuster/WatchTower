import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HEALTH_DATABASE_TESTING_UPLOAD_REASON } from "../healthDatabaseData";

type RouteContext = {
  params: Promise<{
    submissionId: string;
  }>;
};

type PatchBody = {
  machineId?: string;
  technicianName?: string;
  summaryNotes?: string | null;
  submittedAt?: string;
  manualChecks?: Record<string, unknown>;
};

function readFiniteNumber(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  throw new Error(`${label} must be a valid number.`);
}

function readOptionalFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && !value.trim()) return null;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { submissionId } = await params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const submission = await prisma.healthSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, machineId: true, metrics: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  let metricsParsed: { reasonForUpload?: string; manualChecks?: Record<string, unknown> };
  try {
    metricsParsed = JSON.parse(submission.metrics) as typeof metricsParsed;
  } catch {
    return NextResponse.json({ error: "Submission metrics are invalid." }, { status: 400 });
  }

  if (metricsParsed.reasonForUpload !== HEALTH_DATABASE_TESTING_UPLOAD_REASON) {
    return NextResponse.json({ error: "Only Testing (Apps Team Only) submissions can be edited here." }, { status: 403 });
  }

  const machineId = typeof body.machineId === "string" ? body.machineId.trim() : "";
  if (!machineId) {
    return NextResponse.json({ error: "Machine is required." }, { status: 400 });
  }

  const machine = await prisma.machine.findUnique({ where: { id: machineId }, select: { id: true } });
  if (!machine) {
    return NextResponse.json({ error: "Selected machine was not found." }, { status: 400 });
  }

  const technicianName = typeof body.technicianName === "string" ? body.technicianName.trim() : "";
  if (!technicianName) {
    return NextResponse.json({ error: "Technician name is required." }, { status: 400 });
  }

  const summaryNotesRaw = body.summaryNotes;
  const summaryNotes =
    summaryNotesRaw === null || summaryNotesRaw === undefined
      ? null
      : String(summaryNotesRaw).trim() || null;

  const submittedAtRaw = typeof body.submittedAt === "string" ? body.submittedAt.trim() : "";
  if (!submittedAtRaw) {
    return NextResponse.json({ error: "Upload date is required." }, { status: 400 });
  }
  const submittedAt = new Date(submittedAtRaw);
  if (Number.isNaN(submittedAt.getTime())) {
    return NextResponse.json({ error: "Upload date is invalid." }, { status: 400 });
  }

  const mc = body.manualChecks;
  if (!mc || typeof mc !== "object") {
    return NextResponse.json({ error: "manualChecks object is required." }, { status: 400 });
  }

  let nextManual: Record<string, number | null>;
  try {
    nextManual = {
      spindleRunout0mm: readFiniteNumber(mc.spindleRunout0mm, "Spindle runout at 0 mm"),
      spindleRunout250mm: readFiniteNumber(mc.spindleRunout250mm, "Spindle runout at 250 mm"),
      spindleParallelismX: readFiniteNumber(mc.spindleParallelismX, "Spindle parallelism to X"),
      spindleParallelismY: readFiniteNumber(mc.spindleParallelismY, "Spindle parallelism to Y"),
      spindleVelocity: readFiniteNumber(mc.spindleVelocity, "Spindle velocity"),
      spindleAcceleration: readFiniteNumber(mc.spindleAcceleration, "Spindle acceleration"),
      drawBarForce: readFiniteNumber(mc.drawBarForce, "Draw bar force"),
      squarenessXY: readFiniteNumber(mc.squarenessXY, "Squareness XY"),
      squarenessXZ: readFiniteNumber(mc.squarenessXZ, "Squareness XZ"),
      squarenessYZ: readFiniteNumber(mc.squarenessYZ, "Squareness YZ"),
      straightnessX: readOptionalFiniteNumber(mc.straightnessX),
      straightnessY: readOptionalFiniteNumber(mc.straightnessY),
      straightnessZ: readOptionalFiniteNumber(mc.straightnessZ),
      circularityXY: readOptionalFiniteNumber(mc.circularityXY),
      circularityXZ: readOptionalFiniteNumber(mc.circularityXZ),
      circularityYZ: readOptionalFiniteNumber(mc.circularityYZ),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid manual checks.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const existingManual = (metricsParsed.manualChecks ?? {}) as Record<string, unknown>;
  const mergedManual = {
    ...existingManual,
    ...nextManual,
  };
  delete mergedManual.sqaurenessXY;
  delete mergedManual.drawbarForce;

  const nextMetrics = {
    ...metricsParsed,
    reasonForUpload: HEALTH_DATABASE_TESTING_UPLOAD_REASON,
    manualChecks: mergedManual,
  };

  const previousMachineId = submission.machineId;

  try {
    await prisma.healthSubmission.update({
      where: { id: submissionId },
      data: {
        machineId,
        submittedByLabel: technicianName,
        summaryNotes,
        submittedAt,
        metrics: JSON.stringify(nextMetrics),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to update submission." }, { status: 500 });
  }

  revalidatePath("/health-database");
  revalidatePath(`/machines/${machineId}`);
  if (previousMachineId !== machineId) {
    revalidatePath(`/machines/${previousMachineId}`);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const { submissionId } = await params;

  const submission = await prisma.healthSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, machineId: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  try {
    await prisma.healthSubmission.delete({
      where: { id: submissionId },
    });
  } catch {
    return NextResponse.json({ error: "Unable to delete submission." }, { status: 500 });
  }

  revalidatePath("/health-database");
  revalidatePath(`/machines/${submission.machineId}`);

  return NextResponse.json({ success: true });
}
