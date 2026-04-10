import { prisma } from "@/lib/prisma";

type AxisName = "X" | "Y" | "Z";

type PlaneMetrics = {
  axisA?: unknown;
  axisB?: unknown;
  straightnessAUm?: unknown;
  straightnessBUm?: unknown;
};

function asFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asAxisName(value: unknown): AxisName | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "X" || normalized === "Y" || normalized === "Z") {
    return normalized as AxisName;
  }
  return null;
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
    const parsedByPlane =
      ballbar?.parsedByPlane && typeof ballbar.parsedByPlane === "object"
        ? (ballbar.parsedByPlane as Record<string, unknown>)
        : null;
    if (!parsedByPlane) {
      continue;
    }

    const straightnessByAxis: Record<AxisName, number[]> = {
      X: [],
      Y: [],
      Z: [],
    };

    for (const plane of Object.values(parsedByPlane)) {
      if (!plane || typeof plane !== "object") continue;
      const metrics = plane as PlaneMetrics;
      const axisA = asAxisName(metrics.axisA);
      const axisB = asAxisName(metrics.axisB);
      const straightnessA = asFiniteNumber(metrics.straightnessAUm);
      const straightnessB = asFiniteNumber(metrics.straightnessBUm);

      if (axisA && straightnessA !== null) straightnessByAxis[axisA].push(straightnessA);
      if (axisB && straightnessB !== null) straightnessByAxis[axisB].push(straightnessB);
    }

    const manualChecks =
      parsed.manualChecks && typeof parsed.manualChecks === "object"
        ? (parsed.manualChecks as Record<string, unknown>)
        : null;
    if (!manualChecks) {
      continue;
    }

    let changed = false;
    const maxX = straightnessByAxis.X.length > 0 ? Math.max(...straightnessByAxis.X) : null;
    const maxY = straightnessByAxis.Y.length > 0 ? Math.max(...straightnessByAxis.Y) : null;
    const maxZ = straightnessByAxis.Z.length > 0 ? Math.max(...straightnessByAxis.Z) : null;

    if (manualChecks.straightnessX !== maxX) {
      manualChecks.straightnessX = maxX;
      changed = true;
    }
    if (manualChecks.straightnessY !== maxY) {
      manualChecks.straightnessY = maxY;
      changed = true;
    }
    if (manualChecks.straightnessZ !== maxZ) {
      manualChecks.straightnessZ = maxZ;
      changed = true;
    }

    const averages =
      ballbar?.averages && typeof ballbar.averages === "object"
        ? (ballbar.averages as Record<string, unknown>)
        : null;
    const straightnessByAxisUm =
      averages?.straightnessByAxisUm && typeof averages.straightnessByAxisUm === "object"
        ? (averages.straightnessByAxisUm as Record<string, unknown>)
        : null;
    if (straightnessByAxisUm) {
      if (straightnessByAxisUm.X !== maxX) {
        straightnessByAxisUm.X = maxX;
        changed = true;
      }
      if (straightnessByAxisUm.Y !== maxY) {
        straightnessByAxisUm.Y = maxY;
        changed = true;
      }
      if (straightnessByAxisUm.Z !== maxZ) {
        straightnessByAxisUm.Z = maxZ;
        changed = true;
      }
    }

    if (!changed) continue;

    await prisma.healthSubmission.update({
      where: { id: submission.id },
      data: { metrics: JSON.stringify(parsed) },
    });
    updatedCount += 1;
  }

  console.log(`Backfilled max straightness for ${updatedCount} submission(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
