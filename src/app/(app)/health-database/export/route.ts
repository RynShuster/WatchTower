import {
  firstParamValue,
  getHealthDatabaseSubmissions,
  getSubmissionDisplayValues,
} from "../healthDatabaseData";

function escapeCsv(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function safeFilename(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "health-database-export.csv";
  const normalized = trimmed.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${normalized || "health-database-export"}.csv`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = firstParamValue(url.searchParams.get("q") ?? "").trim().toLowerCase();
  const selectedMake = firstParamValue(url.searchParams.get("make") ?? "").trim();
  const selectedModel = firstParamValue(url.searchParams.get("model") ?? "").trim();
  const selectedLocation = firstParamValue(url.searchParams.get("location") ?? "").trim();
  const submissions = await getHealthDatabaseSubmissions("");

  const headerPrimary = [
    "Factory",
    "Model",
    "Make",
    "Serial Number",
    "Line ID",
    "Upload Date",
    "Spindle Runout 0mm",
    "Spindle Runout 250mm",
    "Spindle Parallelism X",
    "Spindle Parallelism Y",
    "Spindle Velocity",
    "Spindle Acceleration",
    "Drawbar Force",
    "Straightness X",
    "Straightness Y",
    "Straightness Z",
    "Squareness XY",
    "Squareness XZ",
    "Squareness YZ",
    "Circularity XY",
    "Circularity XZ",
    "Circularity YZ",
  ];

  const lines = [
    headerPrimary.join(","),
    ...submissions
      .filter((submission) => {
        const factory = submission.machine.location.code || "-";
        const model = submission.machine.model.name || "-";
        const make = submission.machine.make.name || "-";
        const serialNumber = submission.machine.serial || "-";
        const lineId = submission.machine.location.line || submission.machine.internalAssetId || submission.machine.id;

        if (selectedMake && make !== selectedMake) return false;
        if (selectedModel && model !== selectedModel) return false;
        if (selectedLocation && factory !== selectedLocation) return false;

        if (!q) return true;
        const values = getSubmissionDisplayValues(submission.metrics);
        return [
          factory,
          model,
          make,
          serialNumber,
          lineId,
          submission.submittedAt.toISOString(),
          values.spindleRunout0mm,
          values.spindleRunout250mm,
          values.spindleParallelismX,
          values.spindleParallelismY,
          values.spindleVelocity,
          values.spindleAcceleration,
          values.drawbarForce,
          values.straightnessX,
          values.straightnessY,
          values.straightnessZ,
          values.sqaurenessXY,
          values.squarenessXZ,
          values.squarenessYZ,
          values.circularityXY,
          values.circularityXZ,
          values.circularityYZ,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .map((submission) => {
      const values = getSubmissionDisplayValues(submission.metrics);
      return [
        submission.machine.location.code || "-",
        submission.machine.model.name || "-",
        submission.machine.make.name || "-",
        submission.machine.serial || "-",
        submission.machine.location.line || submission.machine.internalAssetId || submission.machine.id,
        submission.submittedAt.toISOString(),
        values.spindleRunout0mm,
        values.spindleRunout250mm,
        values.spindleParallelismX,
        values.spindleParallelismY,
        values.spindleVelocity,
        values.spindleAcceleration,
        values.drawbarForce,
        values.straightnessX,
        values.straightnessY,
        values.straightnessZ,
        values.sqaurenessXY,
        values.squarenessXZ,
        values.squarenessYZ,
        values.circularityXY,
        values.circularityXZ,
        values.circularityYZ,
      ]
        .map((value) => escapeCsv(value))
        .join(",");
    }),
    "",
  ];

  const nameParts = ["health-database"];
  if (selectedMake) nameParts.push(selectedMake);
  if (selectedModel) nameParts.push(selectedModel);
  if (selectedLocation) nameParts.push(selectedLocation);
  const filename = safeFilename(nameParts.join("-"));

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
