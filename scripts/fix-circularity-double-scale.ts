import { prisma } from "@/lib/prisma";

function multiplyByThousandIfLikelyDoubleScaled(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  // Typical circularity values in mm are around 0.001-0.02.
  // Values < 0.0001 are likely mm values divided by 1000 again.
  if (Math.abs(value) > 0 && Math.abs(value) < 0.0001) {
    return value * 1000;
  }
  return value;
}

async function main() {
  const submissions = await prisma.healthSubmission.findMany({
    select: { id: true, metrics: true },
  });

  let updatedCount = 0;
  for (const submission of submissions) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(submission.metrics) as Record<string, unknown>;
    } catch {
      continue;
    }

    let changed = false;

    const manualChecks =
      parsed.manualChecks && typeof parsed.manualChecks === "object"
        ? (parsed.manualChecks as Record<string, unknown>)
        : null;
    if (manualChecks) {
      const nextXY = multiplyByThousandIfLikelyDoubleScaled(manualChecks.circularityXY);
      const nextXZ = multiplyByThousandIfLikelyDoubleScaled(manualChecks.circularityXZ);
      const nextYZ = multiplyByThousandIfLikelyDoubleScaled(manualChecks.circularityYZ);
      if (nextXY !== manualChecks.circularityXY) changed = true;
      if (nextXZ !== manualChecks.circularityXZ) changed = true;
      if (nextYZ !== manualChecks.circularityYZ) changed = true;
      manualChecks.circularityXY = nextXY;
      manualChecks.circularityXZ = nextXZ;
      manualChecks.circularityYZ = nextYZ;
    }

    const ballbar =
      parsed.ballbar && typeof parsed.ballbar === "object"
        ? (parsed.ballbar as Record<string, unknown>)
        : null;
    const parsedByPlane =
      ballbar?.parsedByPlane && typeof ballbar.parsedByPlane === "object"
        ? (ballbar.parsedByPlane as Record<string, unknown>)
        : null;
    if (parsedByPlane) {
      for (const value of Object.values(parsedByPlane)) {
        if (!value || typeof value !== "object") continue;
        const planeMetrics = value as Record<string, unknown>;
        const nextCircularity = multiplyByThousandIfLikelyDoubleScaled(planeMetrics.circularityUm);
        if (nextCircularity !== planeMetrics.circularityUm) changed = true;
        planeMetrics.circularityUm = nextCircularity;
      }
    }

    if (!changed) continue;

    await prisma.healthSubmission.update({
      where: { id: submission.id },
      data: { metrics: JSON.stringify(parsed) },
    });
    updatedCount += 1;
  }

  console.log(`Fixed likely double-scaled circularity on ${updatedCount} submission(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
