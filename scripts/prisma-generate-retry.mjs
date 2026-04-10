import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const command = "npx prisma generate";
const maxAttempts = 8;
const retryDelayMs = 2000;

const prismaClientDir = path.join(process.cwd(), "node_modules", ".prisma", "client");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLockError(text) {
  return /EPERM|EACCES|operation not permitted|rename/i.test(text);
}

/** Remove generated client so the next `prisma generate` does not rename over a locked .exe (common under OneDrive / AV). */
function tryRemovePrismaClientDir() {
  try {
    if (fs.existsSync(prismaClientDir)) {
      fs.rmSync(prismaClientDir, { recursive: true, force: true });
      console.warn("Removed node_modules/.prisma/client to clear a possible file lock; retrying generate...");
    }
  } catch (err) {
    console.warn(
      "Could not remove node_modules/.prisma/client (another process may be using the query engine). Close other terminals / dev servers and retry.",
    );
    console.warn(String(err instanceof Error ? err.message : err));
  }
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const output = execSync(command, { encoding: "utf8" });
      if (output) process.stdout.write(output);
      return;
    } catch (error) {
      const text =
        String(error instanceof Error ? error.message : error) +
        "\n" +
        String(typeof error === "object" && error && "stdout" in error ? error.stdout ?? "" : "") +
        "\n" +
        String(typeof error === "object" && error && "stderr" in error ? error.stderr ?? "" : "");
      if (typeof error === "object" && error && "stdout" in error && error.stdout) {
        process.stdout.write(String(error.stdout));
      }
      if (typeof error === "object" && error && "stderr" in error && error.stderr) {
        process.stderr.write(String(error.stderr));
      }
      if (!isLockError(text) || attempt === maxAttempts) {
        if (attempt === maxAttempts && isLockError(text)) {
          console.error(`
Prisma still could not replace query-engine-windows.exe after ${maxAttempts} attempts.

Typical causes on Windows:
  • Repo under OneDrive — exclude "node_modules" from sync or clone to e.g. C:\\Dev\\WatchTower
  • Another "npm run go" / dev server still running — stop it, then retry
  • Antivirus locking .exe — add an exclusion for node_modules\\.prisma or the project folder
`);
        }
        process.exit(1);
      }
      console.warn(
        `Prisma generate hit a file lock (attempt ${attempt}/${maxAttempts}). Clearing client output and retrying in ${retryDelayMs}ms...`,
      );
      tryRemovePrismaClientDir();
      await sleep(retryDelayMs);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
