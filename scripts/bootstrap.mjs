// Runs alongside `convex dev` (see `npm run dev`). Once the Convex deployment is reachable it:
//   1. copies agent settings (ANTHROPIC_API_KEY, AGENT_*) from .env.local / .env into the Convex
//      deployment's environment, because Convex functions can't read local .env files;
//   2. seeds demo data if the database is empty.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const SYNCED_VARS = [
  "ANTHROPIC_API_KEY",
  "AGENT_MODEL",
  "AGENT_EFFORT",
  "AGENT_CONFIDENCE_THRESHOLD",
  "AGENT_DISABLED",
  "WEBHOOK_SECRET",
];

function loadEnvFiles() {
  const env = {};
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  return env;
}

function convex(args) {
  // One quoted command string: npx is a .cmd shim on Windows, so it has to go through a shell.
  const quoted = args.map((a) => `"${a.replace(/"/g, '\\"')}"`);
  const result = spawnSync(["npx", "convex", ...quoted].join(" "), { shell: true, encoding: "utf8" });
  return { ok: result.status === 0, out: (result.stdout ?? "") + (result.stderr ?? "") };
}

/** Current Convex env as a map (`convex env list` prints NAME=value lines). */
function remoteEnv() {
  const env = {};
  for (const line of convex(["env", "list", "--include-values"]).out.split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const log = (msg) => console.log(`[bootstrap] ${msg}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDeployment() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (convex(["env", "list"]).ok) return true;
    await sleep(2000);
  }
  return false;
}

async function main() {
  if (!(await waitForDeployment())) {
    log("Convex deployment not reachable after 2 minutes; skipping env sync and seed.");
    return;
  }

  const local = loadEnvFiles();
  const remote = remoteEnv();
  for (const name of SYNCED_VARS) {
    const value = local[name];
    if (!value || remote[name] === value) continue;
    const set = convex(["env", "set", name, value]);
    log(set.ok ? `set ${name} in Convex env` : `failed to set ${name}: ${set.out.trim()}`);
  }
  if (!local.ANTHROPIC_API_KEY && !remote.ANTHROPIC_API_KEY) {
    log("ANTHROPIC_API_KEY is not set. Add it to .env.local and restart `npm run dev` to enable the agent.");
  }

  // Waits for the functions to be pushed, then seeds (no-op when data already exists).
  for (let attempt = 0; attempt < 30; attempt++) {
    const seed = convex(["run", "seed:run"]);
    if (seed.ok) {
      log(seed.out.includes('"skipped": true') ? "demo data already present" : "seeded demo data");
      return;
    }
    await sleep(2000);
  }
  log("could not seed demo data; run `npx convex run seed:run` manually.");
}

main();
