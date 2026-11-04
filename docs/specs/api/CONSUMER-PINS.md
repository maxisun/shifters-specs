# Consumer contract pins

Backend and frontend each keep their own committed pin for the exact contract
release they build against. The pin always identifies the same four facts:
contract version, asset URL, archive digest, and the full specs source commit.

Two shapes are accepted. They record the same pin; pick one per repository and
do not mix them.

## Shape 1 — package-manager dependency (TypeScript consumers)

Add the release asset as an exact HTTPS tarball URL:

```json
{
  "devDependencies": {
    "@maxisun/shiftpatch-api": "https://github.com/maxisun/shifters-specs/releases/download/api-v1.0.0/shiftpatch-api-1.0.0.tgz"
  }
}
```

Commit the package-manager lockfile. npm records `resolved` and `integrity`;
pnpm records the URL `specifier` and `resolution.integrity`. Those two fields
are the URL and the `sha256` in the explicit shape below, expressed in the
consumer's own ecosystem.

Both package managers fail the install when the bytes behind the URL change,
and `--frozen-lockfile` / `npm ci` fail when the lockfile is out of date. That
is the digest gate; do not add a custom downloader for a public repository.

The installed package contains `openapi.yaml`, `manifest.json`,
`CHANGELOG.md`, and a short `README.md` under `node_modules/@maxisun/shiftpatch-api/`.
Read the manifest to confirm provenance before generating.

## Shape 2 — explicit lock file (non-Node consumers, private mirrors)

```json
{
  "contractVersion": "1.0.0",
  "url": "https://github.com/maxisun/shifters-specs/releases/download/api-v1.0.0/shiftpatch-api-1.0.0.tgz",
  "sha256": "7066ab64dd8624afb9e89b27525d7279dc18dbb727e002afbf86bcdfa77fa8f6",
  "sourceCommit": "8e2237be651a6d1a997f86a545bcb30a0b7f8154"
}
```

`contractVersion` is the API SemVer version, not the OpenAPI dialect. `url`
must identify the exact release asset (never a branch or a `latest` URL).
`sha256` is the digest of the downloaded archive bytes. `sourceCommit` is the
full commit that contains the released OpenAPI source.

## Verify a pin

Download the exact `url`, then compare the archive's SHA-256 with the pin
before extracting or using it. On macOS:

```sh
shasum -a 256 shiftpatch-api-1.0.0.tgz
```

On Linux:

```sh
sha256sum -c shiftpatch-api-1.0.0.tgz.sha256
```

The reported digest must exactly match. In the verified archive, confirm that
`package/manifest.json` has the same `contractVersion` and `sourceCommit` as
the pin, and that its `oasVersion` matches the `openapi` value in
`package/openapi.yaml`.

## Rules

- Backend and frontend update their pins independently, but the version, URL,
  digest, and source commit must match byte-for-byte.
- An adoption is always a reviewed pull request. A bot may propose the change;
  it must never merge it.
- Never edit the pinned `openapi.yaml` in a consumer. If the contract is wrong,
  change it here, publish a new version, and adopt that.
- Never follow a branch, a tag without a release asset, or a mutable URL.

The example pins under `consumers/backend/` and `consumers/frontend/` are
samples of Shape 2. They are not the consumers' real pins; each consumer owns
its own file.
