import {
  firstParamValue,
  getHealthDatabaseSubmissions,
  getSubmissionDisplayValues,
  HEALTH_DATABASE_TESTING_UPLOAD_REASON,
  parseMetricsForEdit,
  type HealthSubmissionManualChecksEdit,
} from "./healthDatabaseData";
import { HealthDatabaseClient, type HealthDatabaseRow } from "./HealthDatabaseClient";
import { type MachineDownselectOption } from "../oq-upload/MachineDownselect";
import { prisma } from "@/lib/prisma";
import "@/app/health-database.css";

type HealthDatabasePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HealthDatabasePage({ searchParams }: HealthDatabasePageProps) {
  const params = searchParams ? await searchParams : {};
  const submissions = await getHealthDatabaseSubmissions("");

  const machines = await prisma.machine.findMany({
    orderBy: [{ internalAssetId: "asc" }, { id: "asc" }],
    include: {
      make: true,
      model: true,
      location: true,
    },
  });
  const machineOptions: MachineDownselectOption[] = machines.map((machine) => ({
    id: machine.id,
    factoryCode: machine.location.code?.trim().toUpperCase() ?? "",
    make: machine.make.name,
    model: machine.model.name,
    lineId: machine.location.line?.trim() || "Unknown Line",
    assetId: machine.internalAssetId?.trim() || machine.id,
  }));

  const rows: HealthDatabaseRow[] = submissions.map((submission) => {
    const values = getSubmissionDisplayValues(submission.metrics);
    const parsed = parseMetricsForEdit(submission.metrics);
    const isTestingSubmission = parsed.reasonForUpload === HEALTH_DATABASE_TESTING_UPLOAD_REASON;
    const editManual: HealthSubmissionManualChecksEdit | undefined = isTestingSubmission
      ? parsed.manualChecks
      : undefined;

    return {
      id: submission.id,
      machineId: submission.machineId,
      factory: submission.machine.location.code || "-",
      model: submission.machine.model.name || "-",
      make: submission.machine.make.name || "-",
      serialNumber: submission.machine.serial || "-",
      lineId: submission.machine.location.line || submission.machine.internalAssetId || submission.machine.id,
      uploadDate: submission.submittedAt.toISOString(),
      spindleRunout0mm: values.spindleRunout0mm,
      spindleRunout250mm: values.spindleRunout250mm,
      spindleParallelismX: values.spindleParallelismX,
      spindleParallelismY: values.spindleParallelismY,
      spindleVelocity: values.spindleVelocity,
      spindleAcceleration: values.spindleAcceleration,
      drawbarForce: values.drawbarForce,
      straightnessX: values.straightnessX,
      straightnessY: values.straightnessY,
      straightnessZ: values.straightnessZ,
      sqaurenessXY: values.sqaurenessXY,
      squarenessXZ: values.squarenessXZ,
      squarenessYZ: values.squarenessYZ,
      circularityXY: values.circularityXY,
      circularityXZ: values.circularityXZ,
      circularityYZ: values.circularityYZ,
      isTestingSubmission,
      technicianName: submission.submittedByLabel ?? "",
      summaryNotes: submission.summaryNotes ?? "",
      editManual,
    };
  });

  return (
    <div className="healthDbRoot">
      <header className="healthDbHeader">
        <h1>Health Database</h1>
        <p>View OQ upload history and filter records.</p>
      </header>
      <HealthDatabaseClient
        rows={rows}
        machineOptions={machineOptions}
        initialFilters={{
          q: firstParamValue(params.q),
          make: firstParamValue(params.make),
          model: firstParamValue(params.model),
          location: firstParamValue(params.location),
        }}
      />
    </div>
  );
}
