import { resolveDbConfig } from "./path";
import { runSetup } from "./setup";

try {
  process.loadEnvFile();
} catch {
  // no .env file — environment variables (or the local default) are used as-is
}

/**
 * One-time setup from the command line. See src/db/setup.ts for the work
 * itself, which is shared with the /api/setup route used after deployment.
 */
async function main() {
  const { url, isLocalFile } = resolveDbConfig();
  console.log(
    isLocalFile
      ? `Setting up local database at ${url.slice("file:".length)}`
      : `Setting up remote database at ${url.replace(/\?.*$/, "")}`
  );

  const result = await runSetup();
  for (const message of result.messages) console.log(message);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
