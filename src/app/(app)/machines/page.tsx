import { MachineCatalogClient, type MachineCatalogRow } from "@/app/MachineCatalogClient";
import { prisma } from "@/lib/prisma";
import "@/app/catalog.css";
import { MachinesSubnav } from "./MachinesSubnav";

type MachinesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function MachinesPage({ searchParams }: MachinesPageProps) {
  const params = searchParams ? await searchParams : {};
  const machines = await prisma.machine.findMany({
    orderBy: [{ internalAssetId: "asc" }, { id: "asc" }],
    include: { location: true, make: true, model: true, type: true },
  });

  const rows: MachineCatalogRow[] = machines.map((m) => ({
    id: m.id,
    makeID: m.make.name,
    modelID: m.model.name,
    typeID: m.type.displayName,
    locationID: m.location.code ?? "",
    citystateID: m.location.site,
    serialID: m.serial ?? "",
    assetID: m.internalAssetId ?? m.id,
    lineID: m.location.line ?? "",
  }));

  return (
    <div className="catalogRoot">
      <header className="catalogHeader">
        <h1>Machine List</h1>
      </header>
      <MachinesSubnav currentPage="list" />
      <MachineCatalogClient
        rows={rows}
        initialFilters={{
          q: firstParamValue(params.q),
          make: firstParamValue(params.make),
          model: firstParamValue(params.model),
          location: firstParamValue(params.location),
        }}
      />
      <p className="catalogFootnote">
        <strong>Source of truth:</strong> <code>prisma/machineList.import.json</code>. Each row is one machine;{" "}
        <code>locationID</code> / <code>citystateID</code> / <code>lineID</code> map to{" "}
        <code>Location.code</code>, <code>Location.site</code>, and <code>Location.line</code>. Optional workbook
        import remains available via <code>npm run xlsx:import</code>.
      </p>
    </div>
  );
}
