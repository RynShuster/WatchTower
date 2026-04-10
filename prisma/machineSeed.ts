export const MACHINE_SEED_FILE = "machineList.import.json";

export type MachineSeedRow = {
  makeID: string;
  modelID: string;
  typeID: string;
  locationID: string;
  citystateID: string;
  serialID: string;
  assetID: string;
  lineID: string;
};

const locationSiteByCode: Record<string, string> = {
  F2: "Torrance, CA",
  FX: "Torrance, CA",
  F3: "Mesa, AZ",
  F4: "Cherokee, AL",
};

function describeRow(row: MachineSeedRow, index: number) {
  return `row ${index + 1} (${row.makeID} ${row.modelID} ${row.assetID || "no-asset"})`;
}

export function validateMachineSeedRows(rows: MachineSeedRow[]) {
  const issues: string[] = [];
  const assetIndex = new Map<string, number[]>();
  const lineIndex = new Map<string, number[]>();

  rows.forEach((row, index) => {
    const fields = [
      "makeID",
      "modelID",
      "typeID",
      "locationID",
      "citystateID",
      "serialID",
      "assetID",
      "lineID",
    ] as const;

    for (const field of fields) {
      if (!row[field]?.trim()) {
        issues.push(`${describeRow(row, index)} is missing ${field}.`);
      }
    }

    const expectedSite = locationSiteByCode[row.locationID];
    if (!expectedSite) {
      issues.push(`${describeRow(row, index)} uses unsupported locationID ${row.locationID}.`);
    } else if (row.citystateID !== expectedSite) {
      issues.push(
        `${describeRow(row, index)} has citystateID ${row.citystateID}, expected ${expectedSite} for ${row.locationID}.`,
      );
    }

    if (row.makeID === "Hermle" && row.locationID === "F3") {
      const expectedAsset = `HERMLE-${row.serialID}`;
      if (row.assetID !== expectedAsset) {
        issues.push(`${describeRow(row, index)} must use assetID ${expectedAsset}.`);
      }
    }

    const lineKey = `${row.locationID}\u0000${row.lineID}`;
    assetIndex.set(row.assetID, [...(assetIndex.get(row.assetID) ?? []), index + 1]);
    lineIndex.set(lineKey, [...(lineIndex.get(lineKey) ?? []), index + 1]);
  });

  for (const [assetID, indexes] of assetIndex) {
    if (indexes.length > 1) {
      issues.push(`assetID ${assetID} is duplicated on rows ${indexes.join(", ")}.`);
    }
  }

  for (const [key, indexes] of lineIndex) {
    if (indexes.length > 1) {
      const [locationID, lineID] = key.split("\u0000");
      issues.push(`locationID ${locationID} with lineID ${lineID} is duplicated on rows ${indexes.join(", ")}.`);
    }
  }

  return issues;
}

export function assertValidMachineSeedRows(rows: MachineSeedRow[], label = MACHINE_SEED_FILE) {
  const issues = validateMachineSeedRows(rows);
  if (issues.length === 0) {
    return;
  }

  throw new Error(`Invalid machine seed data in ${label}:\n- ${issues.join("\n- ")}`);
}
