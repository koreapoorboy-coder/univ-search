// Builds the folder that is uploaded to Cloudflare Pages (project univ-search).
// Rule: git-tracked files under public/ + untracked files under public/keyword-engine/assets,
// minus public/keyword-engine/audit/, public/keyword-engine/build/ (internal work files) and
// public/students/ (real 생활기록부 records: source data for our own work, never published).
// Usage (repo root): node tools/build_pages_deploy_dir.mjs <new-output-dir-outside-the-repo>
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const EXCLUDED = /^public\/(keyword-engine\/(audit|build)|students)\//;
const REQUIRED = [
  "keyword-engine/index.html",
  "keyword-engine/assets/js/mini_worker_generate_bridge_v32.js",
  "keyword-engine/assets/js/simple_live_intake_v1.js",
];

const outArg = process.argv[2];
if (!outArg) {
  console.error("usage: node tools/build_pages_deploy_dir.mjs <new-output-dir-outside-the-repo>");
  process.exit(2);
}
const repo = fileURLToPath(new URL("..", import.meta.url));
const out = resolve(outArg);
if (!relative(repo, out).startsWith("..")) {
  console.error(`refusing: output must be outside the repo (${out})`);
  process.exit(2);
}
if (existsSync(out) && readdirSync(out).length) {
  console.error(`refusing: output folder already has files (${out})`);
  process.exit(2);
}

const git = args => execFileSync("git", args, { cwd: repo, maxBuffer: 1 << 28 }).toString("utf8").split("\0").filter(Boolean);
const files = [...new Set([
  ...git(["ls-files", "-z", "public"]),
  ...git(["ls-files", "-z", "--others", "--exclude-standard", "public/keyword-engine/assets"]),
])].filter(file => !EXCLUDED.test(file)).sort();

const tooBig = files.filter(file => statSync(join(repo, file)).size > MAX_FILE_BYTES);
if (tooBig.length) {
  console.error(`refusing: files over 25 MiB would fail the Pages upload:\n  ${tooBig.join("\n  ")}`);
  process.exit(1);
}

let bytes = 0;
for (const file of files) {
  const target = join(out, file.slice("public/".length).split("/").join(sep));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(repo, file), target);
  bytes += statSync(target).size;
}

const missing = REQUIRED.filter(file => !existsSync(join(out, file)));
if (missing.length) {
  console.error(`refusing: required files missing from the upload:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

console.log(`Pages upload folder ready: ${out}`);
console.log(`files: ${files.length}, size: ${(bytes / 1048576).toFixed(1)} MB (audit/, build/ and students/ excluded)`);
console.log(`deploy (only after approval): npx wrangler pages deploy "${out}" --project-name univ-search --branch main --commit-dirty=true`);
