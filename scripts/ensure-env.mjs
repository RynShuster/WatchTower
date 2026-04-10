import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(root, ".env");
const schemaPath = path.join(root, "prisma", "schema.prisma");
const sqliteLine = 'DATABASE_URL="file:./prisma/dev.db"\n';
const prismaEngineLine = "PRISMA_CLIENT_ENGINE_TYPE=binary\n";

const schemaText = fs.readFileSync(schemaPath, "utf8");
const useSqlite = /provider\s*=\s*"sqlite"/.test(schemaText);

function readDatabaseUrl(text) {
  const m = text.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n#]+)"?/m);
  return m ? m[1].trim() : null;
}

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, `${sqliteLine}${prismaEngineLine}`, "utf8");
  console.log("Created .env — SQLite at prisma/dev.db");
} else {
  const text = fs.readFileSync(envPath, "utf8");
  const url = readDatabaseUrl(text);
  if (useSqlite && url && /^postgres(ql)?:/i.test(url)) {
    console.error("DATABASE_URL is PostgreSQL but schema uses SQLite. Fix .env or prisma/schema.prisma.");
    process.exit(1);
  }
  if (!/^\s*DATABASE_URL\s*=/m.test(text)) {
    fs.appendFileSync(envPath, `\n${sqliteLine}`, "utf8");
    console.log("Added DATABASE_URL to .env.");
  }
  if (!/^\s*PRISMA_CLIENT_ENGINE_TYPE\s*=/m.test(text)) {
    fs.appendFileSync(envPath, `\n${prismaEngineLine}`, "utf8");
    console.log("Added PRISMA_CLIENT_ENGINE_TYPE=binary to .env.");
  }
}
