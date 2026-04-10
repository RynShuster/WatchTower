import { prisma } from "@/lib/prisma";

function firstParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function escapeCsv(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function safeFilename(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "machine-list.csv";
  const normalized = trimmed.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${normalized || "machine-list"}.csv`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = firstParamValue(url.searchParams.get("q") ?? "").trim().toLowerCase();
  const selectedMake = firstParamValue(url.searchParams.get("make") ?? "").trim();
  const selectedModel = firstParamValue(url.searchParams.get("model") ?? "").trim();
  const selectedLocation = firstParamValue(url.searchParams.get("location") ?? "").trim();

  const machines = await prisma.machine.findMany({
    orderBy: [{ internalAssetId: "asc" }, { id: "asc" }],
    include: { location: true, make: true, model: true, type: true },
  });

  const rows = machines
    .map((machine) => ({
      makeID: machine.make.name,
      modelID: machine.model.name,
      typeID: machine.type.displayName,
      locationID: machine.location.code ?? "",
      citystateID: machine.location.site,
      serialID: machine.serial ?? "",
      assetID: machine.internalAssetId ?? machine.id,
      lineID: machine.location.line ?? "",
    }))
    .filter((row) => {
      if (selectedMake && row.makeID !== selectedMake) return false;
      if (selectedModel && row.modelID !== selectedModel) return false;
      if (selectedLocation && row.locationID !== selectedLocation) return false;
      if (!q) return true;

      return [row.makeID, row.modelID, row.typeID, row.locationID, row.citystateID, row.serialID, row.assetID, row.lineID]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

  const header = [
    "makeID",
    "modelID",
    "typeID",
    "locationID",
    "citystateID",
    "serialID",
    "assetID",
    "lineID",
  ];

  const lines = [
    header.join(","),
    ...rows.map((row) =>
      header
        .map((key) => escapeCsv(row[key as keyof typeof row]))
        .join(","),
    ),
    "",
  ];

  const nameParts = ["machine-list"];
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
