import { execSync } from "node:child_process";

const command = "npx prisma generate";
const maxAttempts = 5;
const retryDelayMs = 1200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLockError(text) {
  return /EPERM|EACCES|operation not permitted|rename/i.test(text);
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
        process.exit(1);
      }
      console.warn(
        `Prisma generate hit a file lock (attempt ${attempt}/${maxAttempts}). Retrying in ${retryDelayMs}ms...`,
      );
      await sleep(retryDelayMs);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
