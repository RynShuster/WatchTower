import { prisma } from "@/lib/prisma";

const UNIT_SCALE_FLAG = "raw_div_1000_v1";

function divideByThousandIfNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value / 1000 : value;
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

    const ballbar =
      parsed.ballbar && typeof parsed.ballbar === "object"
        ? (parsed.ballbar as Record<string, unknown>)
        : null;

    if (!ballbar || ballbar.unitScaleApplied === UNIT_SCALE_FLAG) {
      continue;
    }

    const manualChecks =
      parsed.manualChecks && typeof parsed.manualChecks === "object"
        ? (parsed.manualChecks as Record<string, unknown>)
        : null;
    if (manualChecks) {
      manualChecks.squarenessXY = divideByThousandIfNumber(manualChecks.squarenessXY);
      manualChecks.squarenessXZ = divideByThousandIfNumber(manualChecks.squarenessXZ);
      manualChecks.squarenessYZ = divideByThousandIfNumber(manualChecks.squarenessYZ);
    }

    const parsedByPlane =
      ballbar.parsedByPlane && typeof ballbar.parsedByPlane === "object"
        ? (ballbar.parsedByPlane as Record<string, unknown>)
        : null;
    if (parsedByPlane) {
      for (const value of Object.values(parsedByPlane)) {
        if (!value || typeof value !== "object") continue;
        const planeMetrics = value as Record<string, unknown>;
        planeMetrics.straightnessAUm = divideByThousandIfNumber(planeMetrics.straightnessAUm);
        planeMetrics.straightnessBUm = divideByThousandIfNumber(planeMetrics.straightnessBUm);
        planeMetrics.squareness = divideByThousandIfNumber(planeMetrics.squareness);
        planeMetrics.circularityUm = divideByThousandIfNumber(planeMetrics.circularityUm);
      }
    }

    const averages =
      ballbar.averages && typeof ballbar.averages === "object"
        ? (ballbar.averages as Record<string, unknown>)
        : null;
    const straightnessByAxis =
      averages?.straightnessByAxisUm && typeof averages.straightnessByAxisUm === "object"
        ? (averages.straightnessByAxisUm as Record<string, unknown>)
        : null;
    if (straightnessByAxis) {
      straightnessByAxis.X = divideByThousandIfNumber(straightnessByAxis.X);
      straightnessByAxis.Y = divideByThousandIfNumber(straightnessByAxis.Y);
      straightnessByAxis.Z = divideByThousandIfNumber(straightnessByAxis.Z);
    }

    ballbar.unitScaleApplied = UNIT_SCALE_FLAG;

    await prisma.healthSubmission.update({
      where: { id: submission.id },
      data: { metrics: JSON.stringify(parsed) },
    });
    updatedCount += 1;
  }

  console.log(`Normalized ballbar units for ${updatedCount} submission(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
