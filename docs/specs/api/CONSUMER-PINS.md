# Consumer contract pins

Backend and frontend consumers keep their own committed
`contracts/shiftpatch-api.lock.json`. The example pins in this repository are
under `consumers/backend/` and `consumers/frontend/`; both must identify the
same immutable release bytes.

## Lock format

```json
{
  "contractVersion": "1.0.0",
  "url": "https://github.com/maxisun/shifters-specs/releases/download/api-v1.0.0/shiftpatch-api-1.0.0.tar.gz",
  "sha256": "<64 lowercase hexadecimal characters>",
  "sourceCommit": "<full 40-character specs commit SHA>"
}
```

`contractVersion` is the API SemVer version, not the OpenAPI dialect. `url`
must identify the exact release asset (never a branch or a `latest` URL).
`sha256` is the digest of the downloaded archive bytes. `sourceCommit` is the
full commit that contains the released OpenAPI source.

## Verify a downloaded pin

Download the exact `url`, then compare the archive's SHA-256 with the lock
before extracting or using it. On macOS:

```sh
shasum -a 256 shiftpatch-api-1.0.0.tar.gz
```

On Linux:

```sh
sha256sum shiftpatch-api-1.0.0.tar.gz
```

The reported digest must exactly match `sha256`. In the verified archive,
confirm that `manifest.json` has the same `contractVersion` and `sourceCommit`
as the lock, and that its `oasVersion` matches the `openapi` value in the
bundled `openapi.yaml`. Backend and frontend update their pins independently,
but the version, URL, digest, and source commit must match byte-for-byte.
