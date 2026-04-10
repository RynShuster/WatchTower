import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertValidMachineSeedRows, MACHINE_SEED_FILE, type MachineSeedRow } from "../prisma/machineSeed";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "..", "prisma", MACHINE_SEED_FILE);

const rows = JSON.parse(readFileSync(seedPath, "utf8")) as MachineSeedRow[];
assertValidMachineSeedRows(rows, MACHINE_SEED_FILE);

console.log(`Validated ${rows.length} machine rows from ${MACHINE_SEED_FILE}.`);
