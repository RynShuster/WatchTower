import { prisma } from "@/lib/prisma";

/** Must match OQ upload option value and `metrics.reasonForUpload` in the database. */
export const HEALTH_DATABASE_TESTING_UPLOAD_REASON = "Testing (Apps Team Only)";

export type HealthSubmissionManualChecksEdit = {
  spindleRunout0mm: number | null;
  spindleRunout250mm: number | null;
  spindleParallelismX: number | null;
  spindleParallelismY: number | null;
  spindleVelocity: number | null;
  spindleAcceleration: number | null;
  drawBarForce: number | null;
  straightnessX: number | null;
  straightnessY: number | null;
  straightnessZ: number | null;
  squarenessXY: number | null;
  squarenessXZ: number | null;
  squarenessYZ: number | null;
  circularityXY: number | null;
  circularityXZ: number | null;
  circularityYZ: number | null;
};

type SubmissionManualChecks = {
  spindleRunout0mm?: number | null;
  spindleRunout250mm?: number | null;
  spindleParallelismX?: number | null;
  spindleParallelismY?: number | null;
  spindleVelocity?: number | null;
  spindleAcceleration?: number | null;
  drawBarForce?: number | null;
  drawbarForce?: number | null;
  straightnessX?: number | null;
  straightnessY?: number | null;
  straightnessZ?: number | null;
  sqaurenessXY?: number | null;
  squarenessXY?: number | null;
  squarenessXZ?: number | null;
  squarenessYZ?: number | null;
  circularityXY?: number | null;
  circularityXZ?: number | null;
  circularityYZ?: number | null;
};

type SubmissionMetricsForEdit = {
  reasonForUpload?: string;
  manualChecks?: SubmissionManualChecks;
};

function readNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function parseMetricsForEdit(metricsJson: string): {
  reasonForUpload: string | null;
  manualChecks: HealthSubmissionManualChecksEdit;
} {
  let parsed: SubmissionMetricsForEdit = {};
  try {
    parsed = JSON.parse(metricsJson) as SubmissionMetricsForEdit;
  } catch {
    return {
      reasonForUpload: null,
      manualChecks: {
        spindleRunout0mm: null,
        spindleRunout250mm: null,
        spindleParallelismX: null,
        spindleParallelismY: null,
        spindleVelocity: null,
        spindleAcceleration: null,
        drawBarForce: null,
        straightnessX: null,
        straightnessY: null,
        straightnessZ: null,
        squarenessXY: null,
        squarenessXZ: null,
        squarenessYZ: null,
        circularityXY: null,
        circularityXZ: null,
        circularityYZ: null,
      },
    };
  }

  const m = parsed.manualChecks ?? {};

  return {
    reasonForUpload: typeof parsed.reasonForUpload === "string" ? parsed.reasonForUpload : null,
    manualChecks: {
      spindleRunout0mm: readNullableNumber(m.spindleRunout0mm),
      spindleRunout250mm: readNullableNumber(m.spindleRunout250mm),
      spindleParallelismX: readNullableNumber(m.spindleParallelismX),
      spindleParallelismY: readNullableNumber(m.spindleParallelismY),
      spindleVelocity: readNullableNumber(m.spindleVelocity),
      spindleAcceleration: readNullableNumber(m.spindleAcceleration),
      drawBarForce: readNullableNumber(m.drawBarForce ?? m.drawbarForce),
      straightnessX: readNullableNumber(m.straightnessX),
      straightnessY: readNullableNumber(m.straightnessY),
      straightnessZ: readNullableNumber(m.straightnessZ),
      squarenessXY: readNullableNumber(m.squarenessXY ?? m.sqaurenessXY),
      squarenessXZ: readNullableNumber(m.squarenessXZ),
      squarenessYZ: readNullableNumber(m.squarenessYZ),
      circularityXY: readNullableNumber(m.circularityXY),
      circularityXZ: readNullableNumber(m.circularityXZ),
      circularityYZ: readNullableNumber(m.circularityYZ),
    },
  };
}

export function firstParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

type SubmissionMetricsPayload = {
  manualChecks?: SubmissionManualChecks;
};

function parseMetricNumber(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Number(value.toFixed(4)));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return String(Number(parsed.toFixed(4)));
    }
  }
  return "-";
}

export function getSubmissionDisplayValues(metricsJson: string) {
  let parsed: SubmissionMetricsPayload = {};
  try {
    parsed = JSON.parse(metricsJson) as SubmissionMetricsPayload;
  } catch {
    // Keep default empty object; display placeholders when metrics are invalid.
  }

  const manualChecks = parsed.manualChecks ?? {};

  return {
    spindleRunout0mm: parseMetricNumber(manualChecks.spindleRunout0mm),
    spindleRunout250mm: parseMetricNumber(manualChecks.spindleRunout250mm),
    spindleParallelismX: parseMetricNumber(manualChecks.spindleParallelismX),
    spindleParallelismY: parseMetricNumber(manualChecks.spindleParallelismY),
    spindleVelocity: parseMetricNumber(manualChecks.spindleVelocity),
    spindleAcceleration: parseMetricNumber(manualChecks.spindleAcceleration),
    drawbarForce: parseMetricNumber(manualChecks.drawBarForce ?? manualChecks.drawbarForce),
    straightnessX: parseMetricNumber(manualChecks.straightnessX),
    straightnessY: parseMetricNumber(manualChecks.straightnessY),
    straightnessZ: parseMetricNumber(manualChecks.straightnessZ),
    sqaurenessXY: parseMetricNumber(manualChecks.sqaurenessXY ?? manualChecks.squarenessXY),
    squarenessXZ: parseMetricNumber(manualChecks.squarenessXZ),
    squarenessYZ: parseMetricNumber(manualChecks.squarenessYZ),
    circularityXY: parseMetricNumber(manualChecks.circularityXY),
    circularityXZ: parseMetricNumber(manualChecks.circularityXZ),
    circularityYZ: parseMetricNumber(manualChecks.circularityYZ),
  };
}

export async function getHealthDatabaseSubmissions(selectedFactory: string) {
  const allSubmissions = await prisma.healthSubmission.findMany({
    where: selectedFactory
      ? {
          machine: {
            location: {
              code: selectedFactory,
            },
          },
        }
      : undefined,
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    include: {
      machine: {
        include: {
          location: true,
          make: true,
          model: true,
        },
      },
      attachments: true,
    },
  });

  if (!selectedFactory) {
    return allSubmissions;
  }

  const seenMachineIds = new Set<string>();
  return allSubmissions.filter((submission) => {
    if (seenMachineIds.has(submission.machineId)) {
      return false;
    }
    seenMachineIds.add(submission.machineId);
    return true;
  });
}
