import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { assertValidMachineSeedRows, MACHINE_SEED_FILE, type MachineSeedRow } from "./machineSeed";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();

function typeCodeFromDisplay(name: string, used: Set<string>): string {
  let base =
    "T_" +
    name
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase()
      .slice(0, 26);
  if (base.length < 3) base = "T_UNKNOWN";
  let code = base;
  let n = 2;
  while (used.has(code)) {
    code = `${base.slice(0, 22)}_${n}`;
    n++;
  }
  used.add(code);
  return code;
}

async function main() {
  const jsonPath = path.join(__dirname, MACHINE_SEED_FILE);
  const rows = JSON.parse(readFileSync(jsonPath, "utf8")) as MachineSeedRow[];
  assertValidMachineSeedRows(rows, MACHINE_SEED_FILE);

  /** Existing + newly assigned type codes (never collide on create). */
  const typeCodesUsed = new Set(
    (await prisma.machineType.findMany({ select: { code: true } })).map((t) => t.code),
  );

  /** Display label from spreadsheet → MachineType id */
  const typeDisplayToId = new Map<string, string>();
  const uniqueTypes = [...new Set(rows.map((r) => r.typeID).filter(Boolean))];
  for (const displayName of uniqueTypes) {
    const existing = await prisma.machineType.findFirst({ where: { displayName } });
    if (existing) {
      typeDisplayToId.set(displayName, existing.id);
      continue;
    }
    const code = typeCodeFromDisplay(displayName, typeCodesUsed);
    const created = await prisma.machineType.create({ data: { code, displayName } });
    typeDisplayToId.set(displayName, created.id);
  }

  const makeMap = new Map<string, string>();
  for (const name of [...new Set(rows.map((r) => r.makeID).filter(Boolean))]) {
    const m = await prisma.machineMake.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    makeMap.set(name, m.id);
  }

  const modelKey = (make: string, model: string) => `${make}\0${model}`;
  const modelMap = new Map<string, string>();
  for (const r of rows) {
    const key = modelKey(r.makeID, r.modelID);
    if (modelMap.has(key)) continue;
    const makeId = makeMap.get(r.makeID);
    if (!makeId) throw new Error(`Missing make: ${r.makeID}`);
    const mo = await prisma.machineModel.upsert({
      where: { makeId_name: { makeId, name: r.modelID } },
      create: { name: r.modelID, makeId },
      update: {},
    });
    modelMap.set(key, mo.id);
  }

  const locMap = new Map<string, string>();
  async function ensureLocation(site: string, code: string, line: string): Promise<string> {
    const key = `${site}\0${code}\0${line}`;
    if (locMap.has(key)) return locMap.get(key)!;
    const existing = await prisma.location.findFirst({
      where: {
        site,
        code: code ? code : null,
        line: line ? line : null,
      },
    });
    if (existing) {
      locMap.set(key, existing.id);
      return existing.id;
    }
    const loc = await prisma.location.create({
      data: {
        site,
        code: code || null,
        line: line || null,
      },
    });
    locMap.set(key, loc.id);
    return loc.id;
  }

  for (const r of rows) {
    const typeId = typeDisplayToId.get(r.typeID);
    const makeId = makeMap.get(r.makeID);
    const modelId = modelMap.get(modelKey(r.makeID, r.modelID));
    if (!typeId || !makeId || !modelId) {
      console.warn("Skipping row (missing lookup):", r.assetID);
      continue;
    }
    const locationId = await ensureLocation(r.citystateID, r.locationID, r.lineID);

    await prisma.machine.upsert({
      where: { internalAssetId: r.assetID },
      create: {
        internalAssetId: r.assetID,
        serial: r.serialID || null,
        locationId,
        makeId,
        modelId,
        typeId,
        status: "OPERATIONAL",
      },
      update: {
        serial: r.serialID || null,
        locationId,
        makeId,
        modelId,
        typeId,
        status: "OPERATIONAL",
      },
    });
  }

  const checklist = [
    { key: "spindle_runout_um", label: "Spindle runout (µm)", fieldType: "NUMBER" as const, required: true, sortOrder: 10 },
    { key: "ballbar_pass", label: "Ballbar test pass", fieldType: "BOOLEAN" as const, required: true, sortOrder: 20 },
    { key: "lubrication_ok", label: "Lubrication system OK", fieldType: "BOOLEAN" as const, required: true, sortOrder: 30 },
    { key: "technician_notes", label: "Technician notes", fieldType: "TEXT" as const, required: false, sortOrder: 40 },
  ];
  for (const row of checklist) {
    await prisma.checklistItem.upsert({
      where: { key: row.key },
      create: { ...row, machineTypeId: null },
      update: {
        label: row.label,
        fieldType: row.fieldType,
        required: row.required,
        sortOrder: row.sortOrder,
        machineTypeId: null,
      },
    });
  }

  const vendorCategories = [
    { name: "Cutters", slug: "cutters" },
    { name: "Quality Tools", slug: "quality-tools" },
    { name: "Fixturing", slug: "fixturing" },
    { name: "Machine Tools", slug: "machine-tools" },
    { name: "Tooling", slug: "tooling" },
    { name: "Toolsetting", slug: "toolsetting" },
    { name: "Machine Health", slug: "machine-health" },
    { name: "CAD/CAM", slug: "cad-cam" },
  ];
  for (const category of vendorCategories) {
    await prisma.vendorCategory.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name },
    });
  }

  const submissionCount = await prisma.healthSubmission.count();
  console.log(
    `Seed from ${MACHINE_SEED_FILE} (${rows.length} catalog rows → ${await prisma.machine.count()} machines). ` +
      `Health submissions preserved: ${submissionCount}.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
