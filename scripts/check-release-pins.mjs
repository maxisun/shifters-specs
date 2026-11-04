#!/usr/bin/env node
// Assert that every copy of the current contract pin agrees with the release
// bytes. The pin is written in five places (sidecar, manifest, two sample
// locks, and the worked example in CONSUMER-PINS.md); this script makes a
// mismatch a failed build instead of a review catch.
//
// Usage: node scripts/check-release-pins.mjs

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const releasesDir = join(repoRoot, "docs/specs/api/releases");
const descriptionFile = join(repoRoot, "docs/specs/api/openapi.yaml");
const pinsDocFile = join(repoRoot, "docs/specs/api/CONSUMER-PINS.md");
const guideFile = join(repoRoot, "docs/guides/contract-consumption.md");
const consumersDir = join(repoRoot, "docs/specs/api/consumers");
const repoSlug = "maxisun/shifters-specs";

const failures = [];
const fail = (scope, message) => failures.push(`${scope}: ${message}`);

function compareSemver(a, b) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function readJson(file, scope) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(scope, `cannot read ${relative(repoRoot, file)}: ${error.message}`);
    return undefined;
  }
}

const versions = readdirSync(releasesDir)
  .filter((name) => /^api-v\d+\.\d+\.\d+$/.test(name))
  .map((name) => name.slice("api-v".length))
  .sort(compareSemver);

if (versions.length === 0) {
  console.log("check-release-pins: no published release directory yet; nothing to check.");
  process.exit(0);
}

const version = versions.at(-1);
const releaseTag = `api-v${version}`;
const releaseDir = join(releasesDir, releaseTag);
const assetName = `shiftpatch-api-${version}.tgz`;
const assetPath = join(releaseDir, assetName);
const sidecarPath = `${assetPath}.sha256`;
const manifestPath = join(releaseDir, "manifest.json");
const expectedUrl = `https://github.com/${repoSlug}/releases/download/${releaseTag}/${assetName}`;

for (const file of [assetPath, sidecarPath, manifestPath]) {
  if (!existsSync(file)) fail(releaseTag, `missing ${relative(repoRoot, file)}`);
}
exitOnFailures();

const manifest = readJson(manifestPath, releaseTag);
exitOnFailures();
const digest = sha256(assetPath);
const sidecarDigest = readFileSync(sidecarPath, "utf8").trim().split(/\s+/)[0];

if (sidecarDigest !== digest) {
  fail(releaseTag, `sidecar digest ${sidecarDigest} != tarball digest ${digest}`);
}
if (manifest.contractVersion !== version) {
  fail(releaseTag, `manifest.contractVersion ${manifest.contractVersion} != ${version}`);
}
if (manifest.releaseTag !== releaseTag) {
  fail(releaseTag, `manifest.releaseTag ${manifest.releaseTag} != ${releaseTag}`);
}
if (!/^[0-9a-f]{40}$/.test(manifest.sourceCommit ?? "")) {
  fail(releaseTag, "manifest.sourceCommit is not a full 40-character SHA");
}
if (!Array.isArray(manifest.workItems) || manifest.workItems.length === 0) {
  fail(releaseTag, "manifest.workItems is empty");
}

const staging = mkdtempSync(join(tmpdir(), "shiftpatch-pins-"));
try {
  execFileSync("tar", ["-xzf", assetPath, "-C", staging]);
  const packagedManifest = readJson(join(staging, "package/manifest.json"), `${releaseTag} tarball`);
  if (packagedManifest && !deepEqual(packagedManifest, manifest)) {
    fail(releaseTag, "tarball manifest.json differs from the committed manifest.json");
  }

  const packagedDescription = join(staging, "package/openapi.yaml");
  if (!existsSync(packagedDescription)) {
    fail(releaseTag, "tarball has no package/openapi.yaml");
  } else if (readFileSync(packagedDescription, "utf8") !== readFileSync(descriptionFile, "utf8")) {
    fail(releaseTag, "tarball openapi.yaml differs from docs/specs/api/openapi.yaml; rebuild the bundle");
  }

  const packagedJson = readJson(join(staging, "package/package.json"), `${releaseTag} tarball`);
  if (packagedJson && packagedJson.version !== version) {
    fail(releaseTag, `tarball package.json version ${packagedJson.version} != ${version}`);
  }
} finally {
  rmSync(staging, { recursive: true, force: true });
}

function checkPin(scope, pin) {
  if (pin.contractVersion !== version) {
    fail(scope, `contractVersion ${pin.contractVersion} != ${version}`);
  }
  if (pin.url !== expectedUrl) {
    fail(scope, `url ${pin.url} != ${expectedUrl}`);
  }
  if (pin.sha256 !== digest) {
    fail(scope, `sha256 ${pin.sha256} != ${digest}`);
  }
  if (pin.sourceCommit !== manifest.sourceCommit) {
    fail(scope, `sourceCommit ${pin.sourceCommit} != ${manifest.sourceCommit}`);
  }
}

for (const consumer of readdirSync(consumersDir).sort()) {
  const lockFile = join(consumersDir, consumer, "contract.lock.json");
  if (!existsSync(lockFile)) continue;
  const pin = readJson(lockFile, `consumers/${consumer}`);
  if (pin) checkPin(`consumers/${consumer}`, pin);
}

const pinsDoc = readFileSync(pinsDocFile, "utf8");
const example = [...pinsDoc.matchAll(/```json\n([\s\S]*?)```/g)]
  .map((match) => match[1])
  .find((block) => block.includes('"contractVersion"'));
if (!example) {
  fail("CONSUMER-PINS.md", "no worked example containing contractVersion");
} else {
  try {
    checkPin("CONSUMER-PINS.md example", JSON.parse(example));
  } catch (error) {
    fail("CONSUMER-PINS.md", `worked example is not valid JSON: ${error.message}`);
  }
}

// Any version mentioned in the consumer-facing docs must be the current one,
// so a consumer never copies a command for a superseded release.
for (const [scope, file] of [
  ["CONSUMER-PINS.md", pinsDocFile],
  ["docs/guides/contract-consumption.md", guideFile],
]) {
  if (!existsSync(file)) continue;
  for (const match of readFileSync(file, "utf8").matchAll(/api-v(\d+\.\d+\.\d+)/g)) {
    if (match[1] !== version) {
      fail(scope, `mentions api-v${match[1]} but the current release is ${releaseTag}`);
    }
  }
}

report();

function exitOnFailures() {
  if (failures.length === 0) return;
  console.error(`check-release-pins: ${failures.length} mismatch(es) against ${releaseTag}`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

function report() {
  exitOnFailures();
  const size = statSync(assetPath).size;
  console.log(`check-release-pins: all pins agree with ${releaseTag} (${digest.slice(0, 12)}…, ${size} bytes)`);
}
