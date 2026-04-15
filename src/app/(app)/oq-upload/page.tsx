import { submitOQUpload } from "./actions";
import { MachineDownselect, type MachineDownselectOption } from "./MachineDownselect";
import { ManualChecksStack } from "./ManualChecksStack";
import { OQUploadSubnav } from "./OQUploadSubnav";
import { prisma } from "@/lib/prisma";
import { HEALTH_DATABASE_TESTING_UPLOAD_REASON } from "../health-database/healthDatabaseData";
import "@/app/oq-upload.css";

type OQUploadPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function OQUploadPage({ searchParams }: OQUploadPageProps) {
  const params = searchParams ? await searchParams : {};
  const success = firstParamValue(params.success);
  const error = firstParamValue(params.error);
  const submissionId = firstParamValue(params.submissionId);

  const machines = await prisma.machine.findMany({
    orderBy: [{ internalAssetId: "asc" }, { id: "asc" }],
    include: {
      make: true,
      model: true,
      type: true,
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

  return (
    <div className="oqRoot">
      <header className="oqHeader">
        <h1>OQ Upload</h1>
        <p>
          Upload Machine OQ health checks for precision components. Each upload is tied directly to one machine
          from the Machine List.
        </p>
      </header>

      <OQUploadSubnav currentPage="upload" />

      {success ? (
        <p className="oqAlert oqAlertSuccess">
          Machine OQ upload saved successfully.
          {submissionId ? (
            <>
              {" "}
              Submission ID: <code>{submissionId}</code>
            </>
          ) : null}
        </p>
      ) : null}

      {error ? <p className="oqAlert oqAlertError">{error}</p> : null}

      <form className="oqForm" action={submitOQUpload}>
        <section className="oqSection">
          <h2>Machine + Technician</h2>
          <p className="oqSectionNote">Downselect in order: Factory, then Make, then Model, then Machine #.</p>

          <MachineDownselect machines={machineOptions} />

          <label>
            Technician name
            <input name="technicianName" type="text" placeholder="Required" maxLength={120} required />
          </label>
        </section>

        <section className="oqSection">
          <h2>Reason for Upload</h2>
          <label>
            Reason
            <select name="uploadReason" required defaultValue="">
              <option value="" disabled>
                Select reason
              </option>
              <option value="Preventative Maintenance">Preventative Maintenance</option>
              <option value="Post-Crash Evaluation">Post-Crash Evaluation</option>
              <option value={HEALTH_DATABASE_TESTING_UPLOAD_REASON}>Testing (Apps Team Only)</option>
              <option value="Machine Commissioning">Machine Commissioning</option>
            </select>
          </label>
        </section>

        <section className="oqSection">
          <h2>OQ Checks</h2>
          <ManualChecksStack />
        </section>

        <section className="oqSection">
          <h2>Notes</h2>
          <label>
            OQ summary notes
            <textarea name="summaryNotes" rows={5} placeholder="Optional context for operations and history" />
          </label>
        </section>

        <button className="oqSubmitBtn" type="submit">
          Save OQ Upload
        </button>
      </form>
    </div>
  );
}
