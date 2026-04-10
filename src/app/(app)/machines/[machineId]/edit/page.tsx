import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import "@/app/catalog.css";
import { type MachineFormValues, MachineUploadForm, type MachineUploadOption } from "../../MachineUploadForm";
import { updateMachine } from "../../actions";

type MachineEditPageProps = {
  params: Promise<{
    machineId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function MachineEditPage({ params, searchParams }: MachineEditPageProps) {
  const { machineId } = await params;
  const rawSearchParams = searchParams ? await searchParams : {};
  const error = firstParamValue(rawSearchParams.error);
  const returnTo = firstParamValue(rawSearchParams.returnTo);

  const [machine, makes, models, types] = await Promise.all([
    prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        location: true,
        make: true,
        model: true,
        type: true,
      },
    }),
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

  if (!machine || !machine.location.code) {
    notFound();
  }

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

  const initialValues: MachineFormValues = {
    makeId: machine.makeId,
    modelId: machine.modelId,
    typeId: machine.typeId,
    locationCode: machine.location.code as MachineFormValues["locationCode"],
    serial: machine.serial ?? "",
    internalAssetId: machine.internalAssetId ?? "",
    line: machine.location.line ?? "",
  };

  const backHref = returnTo || `/machines/${machine.id}`;

  return (
    <div className="catalogRoot">
      <header className="catalogHeader">
        <h1>Edit Machine</h1>
      </header>

      <Link className="catalogBackLink" href={backHref}>
        Back
      </Link>

      {error ? <p className="catalogAlert catalogAlertError">{error}</p> : null}

      <form className="catalogFormCard" action={updateMachine}>
        <input type="hidden" name="machineId" value={machine.id} />
        <input type="hidden" name="originalAssetId" value={machine.internalAssetId ?? ""} />
        <input type="hidden" name="returnTo" value={returnTo} />

        <div className="catalogSectionHeading">
          <h2>Machine Details</h2>
          <p>Update the machine metadata and save the changes to the source JSON and database.</p>
        </div>

        <MachineUploadForm
          makeOptions={makeOptions}
          modelOptions={modelOptions}
          typeOptions={typeOptions}
          initialValues={initialValues}
        />

        <button className="catalogPrimaryButton" type="submit">
          Save Changes
        </button>
      </form>
    </div>
  );
}
