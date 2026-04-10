"use server";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertValidMachineSeedRows,
  MACHINE_SEED_FILE,
  type MachineSeedRow,
} from "../../../../prisma/machineSeed";
import { isMachineLocationCode, locationSiteByCode } from "./locationOptions";

function getRequiredField(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  return value;
}

function machineSeedPath() {
  return path.join(process.cwd(), "prisma", MACHINE_SEED_FILE);
}

async function readMachineSeedFile() {
  const filePath = machineSeedPath();
  const content = await readFile(filePath, "utf8");
  return {
    filePath,
    content,
    rows: JSON.parse(content) as MachineSeedRow[],
  };
}

async function writeMachineSeedFile(filePath: string, rows: MachineSeedRow[]) {
  assertValidMachineSeedRows(rows, MACHINE_SEED_FILE);
  await writeFile(filePath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

export async function createMachine(formData: FormData) {
  let machineId = "";
  try {
    const makeId = getRequiredField(formData, "makeId", "Make");
    const modelId = getRequiredField(formData, "modelId", "Model");
    const typeId = getRequiredField(formData, "typeId", "Type");
    const locationCode = getRequiredField(formData, "locationCode", "Location").toUpperCase();
    const serial = getRequiredField(formData, "serial", "Serial ID");
    const internalAssetId = getRequiredField(formData, "internalAssetId", "Asset ID");
    const line = getRequiredField(formData, "line", "Line ID");

    if (!isMachineLocationCode(locationCode)) {
      throw new Error("Please select a valid location.");
    }

    const [make, model, type] = await Promise.all([
      prisma.machineMake.findUnique({ where: { id: makeId } }),
      prisma.machineModel.findUnique({ where: { id: modelId } }),
      prisma.machineType.findUnique({ where: { id: typeId } }),
    ]);

    if (!make || !model || !type) {
      throw new Error("One or more selected machine fields are invalid.");
    }

    if (model.makeId !== make.id) {
      throw new Error("Selected model does not belong to the chosen make.");
    }

    const existingLocation = await prisma.location.findFirst({
      where: {
        code: locationCode,
        site: locationSiteByCode[locationCode],
        line,
      },
      select: { id: true },
    });

    const locationId =
      existingLocation?.id ??
      (
        await prisma.location.create({
          data: {
            code: locationCode,
            site: locationSiteByCode[locationCode],
            line,
          },
          select: { id: true },
        })
      ).id;

    const duplicateMachine = await prisma.machine.findFirst({
      where: {
        internalAssetId,
      },
      select: { id: true },
    });

    if (duplicateMachine) {
      throw new Error("A machine with the same Asset ID already exists.");
    }

    const machine = await prisma.machine.create({
      data: {
        internalAssetId,
        serial,
        locationId,
        makeId: make.id,
        modelId: model.id,
        typeId: type.id,
        status: "OPERATIONAL",
      },
      select: { id: true },
    });
    machineId = machine.id;
  } catch (error) {
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
        ? "A machine with the same Asset ID already exists."
        : error instanceof Error
          ? error.message
          : "Machine creation failed.";
    redirect(`/machines/upload?error=${encodeURIComponent(message)}`);
  }

  redirect(`/machines/upload?success=1&machineId=${machineId}`);
}

export async function updateMachine(formData: FormData) {
  const machineId = getRequiredField(formData, "machineId", "Machine");
  const originalAssetId = getRequiredField(formData, "originalAssetId", "Original Asset ID");
  const returnTo = String(formData.get("returnTo") ?? "").trim();

  let seedSnapshot:
    | {
        filePath: string;
        content: string;
      }
    | undefined;

  try {
    const makeId = getRequiredField(formData, "makeId", "Make");
    const modelId = getRequiredField(formData, "modelId", "Model");
    const typeId = getRequiredField(formData, "typeId", "Type");
    const locationCode = getRequiredField(formData, "locationCode", "Location").toUpperCase();
    const serial = getRequiredField(formData, "serial", "Serial ID");
    const internalAssetId = getRequiredField(formData, "internalAssetId", "Asset ID");
    const line = getRequiredField(formData, "line", "Line ID");

    if (!isMachineLocationCode(locationCode)) {
      throw new Error("Please select a valid location.");
    }

    const [machine, make, model, type, seedFile] = await Promise.all([
      prisma.machine.findUnique({
        where: { id: machineId },
        include: {
          location: true,
          make: true,
          model: true,
          type: true,
        },
      }),
      prisma.machineMake.findUnique({ where: { id: makeId } }),
      prisma.machineModel.findUnique({ where: { id: modelId } }),
      prisma.machineType.findUnique({ where: { id: typeId } }),
      readMachineSeedFile(),
    ]);

    if (!machine) {
      throw new Error("Machine was not found.");
    }

    if (!make || !model || !type) {
      throw new Error("One or more selected machine fields are invalid.");
    }

    if (model.makeId !== make.id) {
      throw new Error("Selected model does not belong to the chosen make.");
    }

    const existingLocation = await prisma.location.findFirst({
      where: {
        code: locationCode,
        site: locationSiteByCode[locationCode],
        line,
      },
      select: { id: true },
    });

    const locationId =
      existingLocation?.id ??
      (
        await prisma.location.create({
          data: {
            code: locationCode,
            site: locationSiteByCode[locationCode],
            line,
          },
          select: { id: true },
        })
      ).id;

    const conflictingMachine = await prisma.machine.findFirst({
      where: {
        internalAssetId,
        NOT: { id: machineId },
      },
      select: { id: true },
    });

    if (conflictingMachine) {
      throw new Error("A machine with the same Asset ID already exists.");
    }

    const rowIndex = seedFile.rows.findIndex((row) => row.assetID === originalAssetId);
    if (rowIndex === -1) {
      throw new Error(`Could not find source machine row for asset ID ${originalAssetId}.`);
    }

    const updatedRows = seedFile.rows.map((row, index) =>
      index === rowIndex
        ? {
            makeID: make.name,
            modelID: model.name,
            typeID: type.displayName,
            locationID: locationCode,
            citystateID: locationSiteByCode[locationCode],
            serialID: serial,
            assetID: internalAssetId,
            lineID: line,
          }
        : row,
    );

    seedSnapshot = {
      filePath: seedFile.filePath,
      content: seedFile.content,
    };

    await writeMachineSeedFile(seedFile.filePath, updatedRows);

    await prisma.machine.update({
      where: { id: machineId },
      data: {
        internalAssetId,
        serial,
        locationId,
        makeId: make.id,
        modelId: model.id,
        typeId: type.id,
      },
    });
  } catch (error) {
    if (seedSnapshot) {
      try {
        await writeFile(seedSnapshot.filePath, seedSnapshot.content, "utf8");
      } catch {
        // Ignore rollback file errors and return original failure to the user.
      }
    }

    const message =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
        ? "A machine with the same Asset ID already exists."
        : error instanceof Error
          ? error.message
          : "Machine update failed.";
    redirect(
      `/machines/${machineId}/edit?error=${encodeURIComponent(message)}${
        returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""
      }`,
    );
  }

  redirect(returnTo || `/machines/${machineId}`);
}
