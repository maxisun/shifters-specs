#!/usr/bin/env node
// Build the immutable API contract release bundle.
//
// The bundle is an npm-installable tarball so that TypeScript consumers can
// depend on the exact release URL and let npm or pnpm verify the bytes through
// the lockfile `integrity` value. The OpenAPI description stays the payload;
// the package.json only makes the archive installable.
//
// Usage:
//   node scripts/build-contract-release.mjs [--version <x.y.z>]
//                                           [--source-commit <sha>]
//                                           [--out <dir>]
//                                           [--force]
//
// Defaults: version from info.version, source commit from HEAD, output under
// docs/specs/api/releases/api-v<version>/.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const descriptionFile = join(repoRoot, "docs/specs/api/openapi.yaml");
const changelogFile = join(repoRoot, "docs/specs/api/CHANGELOG.md");
const ticketsDir = join(repoRoot, ".scratch/shiftpatch-mvp/issues");
const repoSlug = "maxisun/shifters-specs";

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--force") {
      args.force = true;
    } else if (arg === "--version" || arg === "--source-commit" || arg === "--out") {
      const value = argv[i + 1];
      if (!value) fail(`${arg} needs a value`);
      args[arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(8, 20).join("\n"));
      process.exit(0);
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function readInfo(text) {
  const info = {};
  let inside = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^info:\s*$/.test(line)) {
      inside = true;
      continue;
    }
    if (inside) {
      if (/^\S/.test(line)) break;
      const match = /^\s{2}([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
      if (match) info[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
  return info;
}

function readTopLevelScalar(text, key) {
  const match = new RegExp(`^${key}:\\s*(\\S+)\\s*$`, "m").exec(text);
  return match ? match[1] : undefined;
}

function readWorkItems(sourceCommit) {
  return readdirSync(ticketsDir)
    .filter((name) => /^\d{2}-.*\.md$/.test(name))
    .sort()
    .map((name) => {
      const body = readFileSync(join(ticketsDir, name), "utf8");
      const revision = /^\*\*Revision:\*\*\s*(\d+)/m.exec(body);
      if (!revision) fail(`${name} has no Revision line`);
      return {
        id: `shiftpatch-mvp/${name.slice(0, 2)}`,
        revision: Number(revision[1]),
        url: `https://github.com/${repoSlug}/blob/${sourceCommit}/.scratch/shiftpatch-mvp/issues/${name}`,
      };
    });
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

const args = parseArgs(process.argv.slice(2));
const description = readFileSync(descriptionFile, "utf8");
const info = readInfo(description);
const oasVersion = readTopLevelScalar(description, "openapi");
if (!info.version) fail("could not read info.version from openapi.yaml");
if (!oasVersion) fail("could not read the openapi dialect from openapi.yaml");

const version = args.version ?? info.version;
if (version !== info.version) {
  fail(`--version ${version} does not match info.version ${info.version}; bump the description first`);
}
if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`invalid contract version: ${version}`);

const sourceCommit =
  args.sourceCommit ??
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
if (!/^[0-9a-f]{40}$/.test(sourceCommit)) fail(`source commit must be a full 40-character SHA: ${sourceCommit}`);

const releaseDir = args.out ?? join(repoRoot, `docs/specs/api/releases/api-v${version}`);
const assetName = `shiftpatch-api-${version}.tgz`;
const assetPath = join(releaseDir, assetName);
const checksumPath = `${assetPath}.sha256`;

if (existsSync(assetPath) && !args.force) {
  fail(`${relative(repoRoot, assetPath)} already exists; released bytes are immutable (use --force only before publication)`);
}

const manifest = {
  contractVersion: version,
  oasVersion,
  sourceCommit,
  sourceFile: "docs/specs/api/openapi.yaml",
  releaseTag: `api-v${version}`,
  workItems: readWorkItems(sourceCommit),
};

const staging = mkdtempSync(join(tmpdir(), "shiftpatch-contract-"));
const packageDir = join(staging, "package");
mkdirSync(packageDir, { recursive: true });

try {
  writeFileSync(
    join(packageDir, "package.json"),
    `${JSON.stringify(
      {
        name: "@maxisun/shiftpatch-api",
        version,
        description: `ShiftPatch API contract ${version} (OpenAPI ${oasVersion})`,
        files: ["openapi.yaml", "manifest.json", "CHANGELOG.md", "README.md"],
        keywords: ["openapi", "api-contract"],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(packageDir, "README.md"),
    [
      `# ShiftPatch API contract ${version}`,
      "",
      `OpenAPI ${oasVersion} description published as the immutable release \`api-v${version}\`.`,
      "",
      `- Source repository: https://github.com/${repoSlug}`,
      `- Source commit: \`${sourceCommit}\``,
      "",
      "Do not edit files in this package. Change the description in the source repository and publish a new contract version.",
      "",
    ].join("\n"),
  );
  writeFileSync(join(packageDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  copyFileSync(descriptionFile, join(packageDir, "openapi.yaml"));
  copyFileSync(changelogFile, join(packageDir, "CHANGELOG.md"));

  const packed = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", staging], {
      cwd: packageDir,
      encoding: "utf8",
    }),
  );
  const packedName = packed[0]?.filename;
  if (!packedName) fail("npm pack did not report a filename");

  mkdirSync(releaseDir, { recursive: true });
  const packedPath = join(staging, packedName);
  copyFileSync(packedPath, assetPath);
  writeFileSync(join(releaseDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const digest = sha256(assetPath);
  writeFileSync(checksumPath, `${digest}  ${assetName}\n`);

  const size = statSync(assetPath).size;
  console.log(`contract   ${version}`);
  console.log(`oas        ${oasVersion}`);
  console.log(`source     ${sourceCommit}`);
  console.log(`asset      ${relative(repoRoot, assetPath)}`);
  console.log(`sha256     ${digest}`);
  console.log(`size       ${size} bytes`);
  console.log(`work items ${manifest.workItems.length}`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
