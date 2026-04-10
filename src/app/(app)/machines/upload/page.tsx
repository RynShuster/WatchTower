import Link from "next/link";
import { prisma } from "@/lib/prisma";
import "@/app/catalog.css";
import { createMachine } from "../actions";
import { MachineUploadForm, type MachineUploadOption } from "../MachineUploadForm";
import { MachinesSubnav } from "../MachinesSubnav";

type MachineUploadPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function MachineUploadPage({ searchParams }: MachineUploadPageProps) {
  const params = searchParams ? await searchParams : {};
  const success = firstParamValue(params.success);
  const error = firstParamValue(params.error);
  const createdMachineId = firstParamValue(params.machineId);

  const [makes, models, types] = await Promise.all([
    prisma.machineMake.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.machineModel.findMany({
      orderBy: [{ make: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, makeId: true },
    }),
    prisma.machineType.findMany({
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
  ]);

  const makeOptions: MachineUploadOption[] = makes.map((make) => ({
    id: make.id,
    label: make.name,
  }));

  const modelOptions = models.map((model) => ({
    id: model.id,
    label: model.name,
    makeId: model.makeId,
  }));

  const typeOptions: MachineUploadOption[] = types.map((type) => ({
    id: type.id,
    label: type.displayName,
  }));

  return (
    <div className="catalogRoot">
      <header className="catalogHeader">
        <h1>Add Machine</h1>
      </header>

      <MachinesSubnav currentPage="upload" />

      {success ? (
        <p className="catalogAlert catalogAlertSuccess">
          Machine added successfully.
          {createdMachineId ? (
            <>
              {" "}
              <Link href={`/machines/${createdMachineId}`}>Open machine summary</Link>.
            </>
          ) : null}
        </p>
      ) : null}

      {error ? <p className="catalogAlert catalogAlertError">{error}</p> : null}

      <form className="catalogFormCard" action={createMachine}>
        <div className="catalogSectionHeading">
          <h2>Machine Details</h2>
          <p>Select the machine metadata and enter the identifiers manually.</p>
        </div>

        <MachineUploadForm
          makeOptions={makeOptions}
          modelOptions={modelOptions}
          typeOptions={typeOptions}
        />

        <button className="catalogPrimaryButton" type="submit">
          Save Machine
        </button>
      </form>
    </div>
  );
}
