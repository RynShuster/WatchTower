"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { prisma } from "@/lib/prisma";
import { HEALTH_DATABASE_TESTING_UPLOAD_REASON } from "@/app/(app)/health-database/healthDatabaseData";

const UPLOAD_ROOT = process.env.WATCHTOWER_UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
const planeAliasToCanonical: Record<string, "XY" | "XZ" | "YZ"> = {
  XY: "XY",
  YX: "XY",
  XZ: "XZ",
  ZX: "XZ",
  YZ: "YZ",
  ZY: "YZ",
};

type RequiredUploadField = {
  formField: string;
  metricKey: "xyFile" | "xzFile" | "yzFile";
  label: "XY" | "XZ" | "YZ";
};

const requiredUploadFields: RequiredUploadField[] = [
  { formField: "xyFile", metricKey: "xyFile", label: "XY" },
  { formField: "xzFile", metricKey: "xzFile", label: "XZ" },
  { formField: "yzFile", metricKey: "yzFile", label: "YZ" },
];
const allowedUploadReasons = new Set([
  "Preventative Maintenenace",
  "Post-Crash Evaluation",
  HEALTH_DATABASE_TESTING_UPLOAD_REASON,
  "Machine Commissioning",
]);

function parseRequiredNumber(formData: FormData, key: string, label: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) {
    throw new Error(`${label} is required.`);
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return value;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

type AxisName = "X" | "Y" | "Z";
type PlaneName = "XY" | "XZ" | "YZ";

type ParsedBallbarMetrics = {
  plane: PlaneName;
  axisA: AxisName;
  axisB: AxisName;
  straightnessAUm: number;
  straightnessBUm: number;
  circularity: {
    value: number;
    dt: string | null;
  };
};

function parseFeatureValue(sectionXml: string, featureName: string) {
  const featureRegex = new RegExp(
    `<FEATURE\\s+NAME="${featureName}"[^>]*>\\s*([^<]+?)\\s*<\\/FEATURE>`,
    "i",
  );
  const match = featureRegex.exec(sectionXml);
  if (!match) {
    throw new Error(`Missing ${featureName} in .b5r file.`);
  }

  const value = Number(match[1].trim());
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${featureName} value in .b5r file.`);
  }
  return value;
}

function parseFeatureValueWithDt(sectionXml: string, featureName: string) {
  const featureRegex = new RegExp(
    `<FEATURE\\s+NAME="${featureName}"(?:\\s+DT="([^"]+)")?[^>]*>\\s*([^<]+?)\\s*<\\/FEATURE>`,
    "i",
  );
  const match = featureRegex.exec(sectionXml);
  if (!match) {
    throw new Error(`Missing ${featureName} in .b5r file.`);
  }

  const value = Number(match[2].trim());
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${featureName} value in .b5r file.`);
  }
  return {
    value,
    dt: match[1]?.trim() ?? null,
  };
}

function toMillimeters(value: number, dt: string | null) {
  if (!dt) return value;
  const normalized = dt.trim().toUpperCase();
  if (normalized === "UT_LENGTH_UM") return value / 1000;
  if (normalized === "UT_LENGTH_MM") return value;
  return value;
}

function parseAxisName(value: string) {
  const axis = value.trim().toUpperCase();
  if (axis !== "X" && axis !== "Y" && axis !== "Z") {
    throw new Error(`Unsupported axis "${value}" in .b5r file.`);
  }
  return axis as AxisName;
}

function parsePlaneName(value: string) {
  const normalized = value.trim().toUpperCase();
  const canonical = planeAliasToCanonical[normalized];
  if (!canonical) {
    throw new Error(`Unsupported TEST_PLANE "${normalized}" in .b5r file.`);
  }
  return canonical;
}

function parseBallbarMetrics(xmlText: string): ParsedBallbarMetrics {
  const planeRegex =
    /<PLANE[^>]*TEST_PLANE="([^"]+)"[^>]*>[\s\S]*?<A_AXIS_NAME>\s*([^<]+)\s*<\/A_AXIS_NAME>[\s\S]*?<B_AXIS_NAME>\s*([^<]+)\s*<\/B_AXIS_NAME>[\s\S]*?<\/PLANE>/i;
  const planeMatch = planeRegex.exec(xmlText);
  if (!planeMatch) {
    throw new Error("Missing PLANE, A_AXIS_NAME, or B_AXIS_NAME in .b5r file.");
  }

  const plane = parsePlaneName(planeMatch[1]);

  const analysisRegex = /<ANALYSIS[^>]*NAME="RENISHAW_DIAGNOSTICS"[^>]*>([\s\S]*?)<\/ANALYSIS>/i;
  const analysisMatch = analysisRegex.exec(xmlText);
  const analysisXml = analysisMatch?.[1] ?? xmlText;

  return {
    plane,
    axisA: parseAxisName(planeMatch[2]),
    axisB: parseAxisName(planeMatch[3]),
    straightnessAUm: parseFeatureValue(analysisXml, "AF_STRAIGHTNESS_A"),
    straightnessBUm: parseFeatureValue(analysisXml, "AF_STRAIGHTNESS_B"),
    circularity: parseFeatureValueWithDt(analysisXml, "AF_CIRCULARITY"),
  };
}

export async function submitOQUpload(formData: FormData) {
  let createdSubmissionId: string | null = null;
  try {
    const machineId = String(formData.get("machineId") ?? "").trim();
    if (!machineId) {
      throw new Error("Please select a machine.");
    }

    const machine = await prisma.machine.findUnique({ where: { id: machineId }, select: { id: true } });
    if (!machine) {
      throw new Error("Selected machine was not found.");
    }

    const technicianName = String(formData.get("technicianName") ?? "").trim();
    if (!technicianName) {
      throw new Error("Technician name is required.");
    }
    const uploadReason = String(formData.get("uploadReason") ?? "").trim();
    if (!allowedUploadReasons.has(uploadReason)) {
      throw new Error("Please select a valid reason for upload.");
    }
    const summaryNotes = String(formData.get("summaryNotes") ?? "").trim();

    const spindleRunout0mm = parseRequiredNumber(formData, "spindleRunout0mm", "Spindle runout at 0 mm");
    const spindleRunout250mm = parseRequiredNumber(
      formData,
      "spindleRunout250mm",
      "Spindle runout at 250 mm",
    );
    const spindleParallelismX = parseRequiredNumber(
      formData,
      "spindleParallelismX",
      "Spindle parallelism to X",
    );
    const spindleParallelismY = parseRequiredNumber(
      formData,
      "spindleParallelismY",
      "Spindle parallelism to Y",
    );
    const spindleVelocity = parseRequiredNumber(formData, "spindleVelocity", "Spindle velocity");
    const spindleAcceleration = parseRequiredNumber(
      formData,
      "spindleAcceleration",
      "Spindle acceleration",
    );
    const drawBarForce = parseRequiredNumber(formData, "drawBarForce", "Draw bar force");
    const squarenessXY = parseRequiredNumber(formData, "squarenessXY", "Squareness XY");
    const squarenessXZ = parseRequiredNumber(formData, "squarenessXZ", "Squareness XZ");
    const squarenessYZ = parseRequiredNumber(formData, "squarenessYZ", "Squareness YZ");

    const uploadFiles = requiredUploadFields
      .map(({ formField, metricKey, label }) => {
      const file = formData.get(formField);
      const normalized = file instanceof File ? file : null;
      if (!normalized || normalized.size === 0) {
        return null;
      }
      return { formField, metricKey, file: normalized };
      })
      .filter(
        (upload): upload is { formField: string; metricKey: "xyFile" | "xzFile" | "yzFile"; file: File } =>
          Boolean(upload),
      );

    const metrics = {
      oqType: "MACHINE_OQ_V1",
      reasonForUpload: uploadReason,
      manualChecks: {
        spindleRunout0mm,
        spindleRunout250mm,
        spindleParallelismX,
        spindleParallelismY,
        spindleVelocity,
        spindleAcceleration,
        drawBarForce,
        straightnessX: null as number | null,
        straightnessY: null as number | null,
        straightnessZ: null as number | null,
        squarenessXY,
        squarenessXZ,
        squarenessYZ,
        circularityXY: null as number | null,
        circularityXZ: null as number | null,
        circularityYZ: null as number | null,
      },
      ballbar: {
        planes: [] as PlaneName[],
        files: {} as Record<string, string>,
        unitScaleApplied: "raw_div_1000_v1",
        parsedByPlane: {} as Record<
          PlaneName,
          {
            axisA: AxisName;
            axisB: AxisName;
            straightnessAUm: number;
            straightnessBUm: number;
            circularityUm: number;
          }
        >,
        averages: {
          straightnessByAxisUm: {
            X: null as number | null,
            Y: null as number | null,
            Z: null as number | null,
          },
        },
      },
    };
    const straightnessByAxis: Record<AxisName, number[]> = {
      X: [],
      Y: [],
      Z: [],
    };

    const parsedUploads = await Promise.all(
      uploadFiles.map(async (upload) => ({ ...upload, fileBuffer: Buffer.from(await upload.file.arrayBuffer()) })),
    );

    const submission = await prisma.healthSubmission.create({
      data: {
        machineId,
        submittedByLabel: technicianName,
        summaryNotes: summaryNotes || null,
        metrics: JSON.stringify(metrics),
      },
    });
    createdSubmissionId = submission.id;

    const uploadDir = path.join(UPLOAD_ROOT, "oq", submission.id);
    await mkdir(uploadDir, { recursive: true });

    for (const upload of parsedUploads) {
      const safeName = sanitizeFileName(upload.file.name);
      const storedName = `${upload.metricKey}-${randomUUID()}-${safeName}`;
      const absoluteFilePath = path.join(uploadDir, storedName);
      await writeFile(absoluteFilePath, upload.fileBuffer);

      const relativeFilePath = path.posix.join("oq", submission.id, storedName);
      metrics.ballbar.files[upload.metricKey] = relativeFilePath;
      const parsedMetrics = parseBallbarMetrics(upload.fileBuffer.toString("utf8"));
      if (!metrics.ballbar.planes.includes(parsedMetrics.plane)) {
        metrics.ballbar.planes.push(parsedMetrics.plane);
      }
      metrics.ballbar.parsedByPlane[parsedMetrics.plane] = {
        axisA: parsedMetrics.axisA,
        axisB: parsedMetrics.axisB,
        straightnessAUm: parsedMetrics.straightnessAUm / 1000,
        straightnessBUm: parsedMetrics.straightnessBUm / 1000,
        circularityUm: toMillimeters(parsedMetrics.circularity.value, parsedMetrics.circularity.dt),
      };

      straightnessByAxis[parsedMetrics.axisA].push(parsedMetrics.straightnessAUm);
      straightnessByAxis[parsedMetrics.axisB].push(parsedMetrics.straightnessBUm);

      const circularityMm = toMillimeters(parsedMetrics.circularity.value, parsedMetrics.circularity.dt);
      if (parsedMetrics.plane === "XY") {
        metrics.manualChecks.circularityXY = circularityMm;
      } else if (parsedMetrics.plane === "XZ") {
        metrics.manualChecks.circularityXZ = circularityMm;
      } else if (parsedMetrics.plane === "YZ") {
        metrics.manualChecks.circularityYZ = circularityMm;
      }

      await prisma.submissionAttachment.create({
        data: {
          submissionId: submission.id,
          originalName: upload.file.name,
          storedPath: relativeFilePath,
          mimeType: upload.file.type || "application/octet-stream",
          sizeBytes: upload.file.size,
        },
      });
    }

    for (const axis of ["X", "Y", "Z"] as const) {
      const axisValues = straightnessByAxis[axis];
      if (axisValues.length === 0) continue;

      const maxUm = Math.max(...axisValues);
      metrics.ballbar.averages.straightnessByAxisUm[axis] = maxUm / 1000;
      const maxMm = maxUm / 1000;
      if (axis === "X") metrics.manualChecks.straightnessX = maxMm;
      if (axis === "Y") metrics.manualChecks.straightnessY = maxMm;
      if (axis === "Z") metrics.manualChecks.straightnessZ = maxMm;
    }

    await prisma.healthSubmission.update({
      where: { id: submission.id },
      data: { metrics: JSON.stringify(metrics) },
    });
    redirect(`/oq-upload?success=1&submissionId=${submission.id}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (createdSubmissionId) {
      try {
        await prisma.healthSubmission.delete({ where: { id: createdSubmissionId } });
      } catch {
        // Ignore rollback errors; original error message is returned to user.
      }
    }
    const message = error instanceof Error ? error.message : "Upload failed.";
    redirect(`/oq-upload?error=${encodeURIComponent(message)}`);
  }
}
