import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import toleranceDefinitions from "../../oq-upload/toleranceDefinitions.json";
import { RadarVisualization } from "./RadarVisualization";
import "@/app/machine-summary.css";

type MachineSummaryPageProps = {
  params: Promise<{
    machineId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ParsedSubmissionMetrics = {
  oqType?: string;
  manualChecks?: Record<string, unknown>;
  ballbar?: {
    planes?: unknown;
    files?: Record<string, string>;
  };
};

type RatioTrendSeries = {
  label: string;
  points: Array<{
    date: string;
    ratio: number | null;
  }>;
};

type RadarSnapshot = {
  submissionId: string;
  submittedAt: string;
  ratioPoints: Array<{
    label: string;
    ratio: number;
    measurement: string;
    /** When set, radar leg length uses this 0…1 multiplier (spec ring = 1/maxDisplayRatio in chart). */
    radarRadiusNorm?: number;
    /** When set, green/yellow/orange bands use this instead of `ratio` (same scale as tolerance ratio). */
    conditionRatio?: number;
  }>;
};

type ToleranceRule = {
  operator?: string;
  threshold?: number;
};

type MeasurementRatioConfig = {
  label: string;
  key: string;
  toleranceId: string;
  unit: string;
  fallbackKey?: string;
  /** For minimum-type specs: typical upper end of real readings; radar spans spec → this value across the radius. */
  radarPracticalMax?: number;
};

const measurementRatioConfigs: MeasurementRatioConfig[] = [
  { label: "Runout 0mm", key: "spindleRunout0mm", toleranceId: "spindle-runout-0mm", unit: "mm" },
  { label: "Runout 250mm", key: "spindleRunout250mm", toleranceId: "spindle-runout-250mm", unit: "mm" },
  { label: "Parallelism X", key: "spindleParallelismX", toleranceId: "spindle-parallelism-x", unit: "mm" },
  { label: "Parallelism Y", key: "spindleParallelismY", toleranceId: "spindle-parallelism-y", unit: "mm" },
  { label: "Velocity", key: "spindleVelocity", toleranceId: "spindle-velocity", unit: "mm/s RMS" },
  { label: "Acceleration", key: "spindleAcceleration", toleranceId: "spindle-acceleration", unit: "m/s2 RMS" },
  {
    label: "Draw Bar Force",
    key: "drawBarForce",
    toleranceId: "drawbar-force",
    unit: "kN",
    fallbackKey: "drawbarForce",
    radarPracticalMax: 22,
  },
  { label: "Straightness X", key: "straightnessX", toleranceId: "straightness-x", unit: "mm" },
  { label: "Straightness Y", key: "straightnessY", toleranceId: "straightness-y", unit: "mm" },
  { label: "Straightness Z", key: "straightnessZ", toleranceId: "straightness-z", unit: "mm" },
  { label: "Squareness XY", key: "squarenessXY", fallbackKey: "sqaurenessXY", toleranceId: "squareness-xy", unit: "mm" },
  { label: "Squareness XZ", key: "squarenessXZ", toleranceId: "squareness-xz", unit: "mm" },
  { label: "Squareness YZ", key: "squarenessYZ", toleranceId: "squareness-yz", unit: "mm" },
  { label: "Circularity XY", key: "circularityXY", toleranceId: "circularity-xy", unit: "mm" },
  { label: "Circularity XZ", key: "circularityXZ", toleranceId: "circularity-xz", unit: "mm" },
  { label: "Circularity YZ", key: "circularityYZ", toleranceId: "circularity-yz", unit: "mm" },
];

const spindleHealthLabels: Array<{ key: string; label: string; unit?: string }> = [
  { key: "spindleRunout0mm", label: "Spindle runout at 0 mm", unit: "mm" },
  { key: "spindleRunout250mm", label: "Spindle runout at 250 mm", unit: "mm" },
  { key: "spindleParallelismX", label: "Spindle parallelism to X", unit: "mm" },
  { key: "spindleParallelismY", label: "Spindle parallelism to Y", unit: "mm" },
  { key: "spindleAcceleration", label: "Spindle acceleration", unit: "m/s2 RMS" },
  { key: "spindleVelocity", label: "Spindle velocity", unit: "mm/s RMS" },
  { key: "drawBarForce", label: "Draw bar force", unit: "kN" },
];

function parseSubmissionMetrics(metrics: string): ParsedSubmissionMetrics {
  try {
    const parsed = JSON.parse(metrics) as ParsedSubmissionMetrics;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function formatMetricValue(value: unknown, unit?: string) {
  if (typeof value === "number") {
    return unit ? `${value} ${unit}` : String(value);
  }
  if (typeof value === "string" && value.trim()) {
    return unit ? `${value} ${unit}` : value;
  }
  return "-";
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function calculateRatio(value: number, rule?: ToleranceRule) {
  const threshold = rule?.threshold;
  if (threshold === undefined || !Number.isFinite(threshold) || threshold === 0) return null;
  if (rule?.operator === ">=") {
    if (value <= 0) return Number.POSITIVE_INFINITY;
    return threshold / value;
  }
  return value / threshold;
}

/** Keep in sync with `maxDisplayRatio` in RadarVisualization. */
const RADAR_MAX_DISPLAY_RATIO = 1.2;

/**
 * Default: distance from center ∝ capped ratio. For minimum specs with `radarPracticalMax`, in-spec readings
 * between the threshold and that ceiling use the full span from the spec ring to the center.
 */
function radarRadiusNorm(
  ratio: number,
  rule: ToleranceRule | undefined,
  config: MeasurementRatioConfig,
): number {
  const capped = Math.min(Math.max(ratio, 0), RADAR_MAX_DISPLAY_RATIO) / RADAR_MAX_DISPLAY_RATIO;
  const threshold = rule?.threshold;
  const practical = config.radarPracticalMax;
  if (
    practical === undefined ||
    rule?.operator !== ">=" ||
    threshold === undefined ||
    !Number.isFinite(threshold) ||
    threshold <= 0 ||
    practical <= threshold
  ) {
    return capped;
  }
  if (ratio > 1) {
    return capped;
  }
  const rGood = threshold / practical;
  const r = Math.max(ratio, rGood);
  const span = 1 - rGood;
  if (span <= 0) {
    return capped;
  }
  return ((r - rGood) / span) * (1 / RADAR_MAX_DISPLAY_RATIO);
}

/**
 * Same band thresholds as the radar (`getConditionBand`): higher = worse. For min-spec + practical max,
 * map [threshold, practical] → [1, 0] so the full green→yellow→orange range matches the radial stretch.
 */
function conditionRatioForRadar(
  value: number,
  ratio: number,
  rule: ToleranceRule | undefined,
  config: MeasurementRatioConfig,
): number {
  const threshold = rule?.threshold;
  const practical = config.radarPracticalMax;
  if (
    practical === undefined ||
    rule?.operator !== ">=" ||
    threshold === undefined ||
    !Number.isFinite(threshold) ||
    threshold <= 0 ||
    practical <= threshold
  ) {
    return ratio;
  }
  if (value < threshold) {
    return ratio;
  }
  if (value >= practical) {
    return 0;
  }
  return 1 - (value - threshold) / (practical - threshold);
}

function formatButtonMeasurement(value: number, unit: string) {
  return `${value.toFixed(4)} ${unit}`;
}

function buildRatioPointsFromManualChecks(
  manualChecks: Record<string, unknown>,
  modelToleranceOverrides: Record<string, { rule?: ToleranceRule }> | undefined,
) {
  return measurementRatioConfigs
    .map((config) => {
      const value = toFiniteNumber(manualChecks[config.key] ?? manualChecks[config.fallbackKey ?? ""]);
      const rule = modelToleranceOverrides?.[config.toleranceId]?.rule;
      if (value === null) return null;
      const ratio = calculateRatio(value, rule);
      if (ratio === null || !Number.isFinite(ratio)) return null;
      return {
        label: config.label,
        ratio,
        measurement: formatButtonMeasurement(value, config.unit),
        radarRadiusNorm: radarRadiusNorm(ratio, rule, config),
        conditionRatio: conditionRatioForRadar(value, ratio, rule, config),
      };
    })
    .filter(
      (point): point is {
        label: string;
        ratio: number;
        measurement: string;
        radarRadiusNorm: number;
        conditionRatio: number;
      } => Boolean(point),
    );
}

function formatGroupedAxisValues(
  values: [unknown, unknown, unknown],
  labels: [string, string, string],
  unit?: string,
) {
  return labels
    .map((label, index) => `${label}: ${formatMetricValue(values[index], unit)}`)
    .join(" | ");
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function firstParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function MachineSummaryPage({ params, searchParams }: MachineSummaryPageProps) {
  const { machineId } = await params;
  const rawSearchParams = searchParams ? await searchParams : {};
  const backParams = new URLSearchParams();

  for (const key of ["q", "make", "model", "location"] as const) {
    const value = firstParamValue(rawSearchParams[key]).trim();
    if (value) {
      backParams.set(key, value);
    }
  }

  const backHref = backParams.size > 0 ? `/machines?${backParams.toString()}` : "/machines";
  const currentHref = backParams.size > 0 ? `/machines/${machineId}?${backParams.toString()}` : `/machines/${machineId}`;
  const editHref = `/machines/${machineId}/edit?returnTo=${encodeURIComponent(currentHref)}`;

  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    include: {
      location: true,
      make: true,
      model: true,
      type: true,
      submissions: {
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
        include: {
          attachments: {
            orderBy: [{ uploadedAt: "asc" }, { id: "asc" }],
          },
        },
      },
    },
  });

  if (!machine) {
    notFound();
  }
  const latestSubmission = machine.submissions[0] ?? null;
  const modelToleranceOverrides = (
    toleranceDefinitions.machineOverrides as Record<string, Record<string, { rule?: ToleranceRule }>>
  )?.[machine.model.name];
  const radarSnapshots: RadarSnapshot[] = machine.submissions.map((submission) => {
    const manualChecks = parseSubmissionMetrics(submission.metrics).manualChecks ?? {};
    return {
      submissionId: submission.id,
      submittedAt: submission.submittedAt.toISOString(),
      ratioPoints: buildRatioPointsFromManualChecks(manualChecks, modelToleranceOverrides),
    };
  });
  const submissionsAscending = [...machine.submissions].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  const submissionSnapshots = submissionsAscending.map((submission) => ({
    date: submission.submittedAt.toISOString(),
    manualChecks: parseSubmissionMetrics(submission.metrics).manualChecks ?? {},
  }));
  const trendSeries: RatioTrendSeries[] = measurementRatioConfigs.map((config) => ({
    label: config.label,
    points: submissionSnapshots.map((snapshot) => {
      const value = toFiniteNumber(snapshot.manualChecks[config.key] ?? snapshot.manualChecks[config.fallbackKey ?? ""]);
      const rule = modelToleranceOverrides?.[config.toleranceId]?.rule;
      if (value === null) {
        return { date: snapshot.date, ratio: null };
      }
      const ratio = calculateRatio(value, rule);
      return {
        date: snapshot.date,
        ratio: ratio !== null && Number.isFinite(ratio) ? ratio : null,
      };
    }),
  }));

  return (
    <div className="machineSummaryRoot">
      <header className="machineSummaryHeader">
        <div>
          <Link className="machineSummaryBackLink" href={backHref}>
            Back to Machine List
          </Link>
          <h1>
            {machine.make.name} {machine.model.name}
          </h1>
          <p>
            Summary page for machine <strong>{machine.internalAssetId ?? machine.id}</strong> with full OQ upload
            history.
          </p>
        </div>
        <Link className="machineSummaryActionLink" href={editHref}>
          Edit Machine
        </Link>
      </header>

      <section className="machineSummaryCard">
        <div className="machineSummaryCardHeading">
          <h2>Machine Details</h2>
          <span>{machine.submissions.length} OQ upload{machine.submissions.length === 1 ? "" : "s"}</span>
        </div>

        <dl className="machineSummaryDetailsGrid">
          <div>
            <dt>makeID</dt>
            <dd>{machine.make.name}</dd>
          </div>
          <div>
            <dt>modelID</dt>
            <dd>{machine.model.name}</dd>
          </div>
          <div>
            <dt>typeID</dt>
            <dd>{machine.type.displayName}</dd>
          </div>
          <div>
            <dt>locationID</dt>
            <dd>{machine.location.code || "-"}</dd>
          </div>
          <div>
            <dt>citystateID</dt>
            <dd>{machine.location.site}</dd>
          </div>
          <div>
            <dt>serialID</dt>
            <dd>{machine.serial || "-"}</dd>
          </div>
          <div>
            <dt>assetID</dt>
            <dd>{machine.internalAssetId || machine.id}</dd>
          </div>
          <div>
            <dt>lineID</dt>
            <dd>{machine.location.line || "-"}</dd>
          </div>
        </dl>
      </section>

      <section className="machineSummaryCard">
        <div className="machineSummaryCardHeading">
          <h2>Visualization</h2>
          <span>
            {latestSubmission ? `Latest submission: ${new Date(latestSubmission.submittedAt).toLocaleDateString()}` : "No data"}
          </span>
        </div>
        {machine.submissions.length === 0 ? (
          <p className="machineSummaryMuted">
            No plottable data is available yet for this machine. Submit OQ results to populate this chart.
          </p>
        ) : (
          <RadarVisualization radarSnapshots={radarSnapshots} trendSeries={trendSeries} />
        )}
      </section>

      <section className="machineSummaryHistory">
        <div className="machineSummarySectionHeading">
          <h2>OQ Upload Results</h2>
          <p>Every submission saved for this machine appears below, newest first.</p>
        </div>

        {machine.submissions.length === 0 ? (
          <div className="machineSummaryEmpty">
            <p>No OQ uploads have been saved for this machine yet.</p>
          </div>
        ) : (
          <div className="machineSummarySubmissionList">
            {machine.submissions.map((submission, index) => {
              const metrics = parseSubmissionMetrics(submission.metrics);
              const manualChecks = metrics.manualChecks ?? {};
              const isMostRecent = index === 0;

              return (
                <article key={submission.id} className="machineSummarySubmissionCard">
                  <div className="machineSummarySubmissionTop">
                    <div>
                      <h3 className="machineSummarySubmissionTitleRow">
                        <span>{new Date(submission.submittedAt).toLocaleString()}</span>
                        {isMostRecent ? <span className="machineSummaryRecentBadge">Most Recent</span> : null}
                      </h3>
                      <p>Submission ID: {submission.id}</p>
                    </div>
                    <div className="machineSummarySubmissionMeta">
                      <span>Technician: {submission.submittedByLabel || "-"}</span>
                      <span>Files: {submission.attachments.length}</span>
                      <span>Type: {metrics.oqType || "MACHINE_OQ_V1"}</span>
                    </div>
                  </div>

                  <div className="machineSummarySubmissionGrid">
                    <section className="machineSummaryPanel">
                      <h4>OQ Results</h4>
                      <div className="machineSummaryOQColumns">
                        <div>
                          <h5>Spindle Health</h5>
                          <dl className="machineSummaryMetricsList">
                            {spindleHealthLabels.map((item) => (
                              <div key={item.key}>
                                <dt>{item.label}</dt>
                                <dd>{formatMetricValue(manualChecks[item.key], item.unit)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        <div>
                          <h5>Linear Axis Health</h5>
                          <dl className="machineSummaryMetricsList">
                            <div>
                              <dt>Straightness</dt>
                              <dd>
                                {formatGroupedAxisValues(
                                  [manualChecks.straightnessX, manualChecks.straightnessY, manualChecks.straightnessZ],
                                  ["X", "Y", "Z"],
                                  "mm",
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>Squareness</dt>
                              <dd>
                                {formatGroupedAxisValues(
                                  [
                                    manualChecks.sqaurenessXY ?? manualChecks.squarenessXY,
                                    manualChecks.squarenessXZ,
                                    manualChecks.squarenessYZ,
                                  ],
                                  ["XY", "XZ", "YZ"],
                                  "mm",
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>Circularity</dt>
                              <dd>
                                {formatGroupedAxisValues(
                                  [manualChecks.circularityXY, manualChecks.circularityXZ, manualChecks.circularityYZ],
                                  ["XY", "XZ", "YZ"],
                                  "mm",
                                )}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </section>
                  </div>

                  <section className="machineSummaryPanel">
                    <div className="machineSummaryFilePanelHeader">
                      <h4>Uploaded Ballbar Files</h4>
                      {submission.attachments.length > 0 ? (
                        <Link
                          className="machineSummaryDownloadBtn"
                          href={`/machines/${machine.id}/submissions/${submission.id}/attachments/download`}
                        >
                          Download ZIP
                        </Link>
                      ) : null}
                    </div>
                    {submission.attachments.length === 0 ? (
                      <p className="machineSummaryMuted">No files stored for this submission.</p>
                    ) : (
                      <ul className="machineSummaryFileList">
                        {submission.attachments.map((attachment) => (
                          <li key={attachment.id}>
                            <strong>{attachment.originalName}</strong>
                            <span>{formatFileSize(attachment.sizeBytes)}</span>
                            <code>{attachment.storedPath}</code>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="machineSummaryPanel">
                    <h4>Summary Notes</h4>
                    <p className={submission.summaryNotes ? "" : "machineSummaryMuted"}>
                      {submission.summaryNotes || "No summary notes provided."}
                    </p>
                  </section>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
