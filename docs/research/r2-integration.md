# Cloudflare R2 integration for the ShiftPatch MVP

**Date:** 2026-10-31  
**Scope:** Private Credential document and Inspector Export storage for the ShiftPatch MVP: which repositories need R2 code, the backend adapter, presigned URLs, S3-compatibility gaps, CORS, local development, and the recommended upload path.  
**Terminology below:** “Sourced fact” describes what Cloudflare, AWS, MinIO, or a package artifact states. “Recommendation” is the proposed ShiftPatch policy and its trade-offs. Where Cloudflare documentation is silent, that is called out rather than inferred.

## Executive recommendation

**Recommendation:** put all R2 code in the backend, use backend-proxied multipart uploads for Credential documents, and use short-lived presigned GET URLs for downloads. The frontend needs no S3 client and no R2 credentials. The bucket needs no CORS rule for backend-proxied uploads, and only an optional GET rule if presigned downloads are fetched by JavaScript. The backend needs two runtime packages, a four-method adapter, one migration for the internal object key, and changes to four existing API operations.

This is a **low-to-moderate** integration, not a storage-platform project. R2’s S3 API covers everything the MVP needs, and presigned URL generation happens entirely in the backend without a round trip to R2. The sharp edges are not R2 authentication; they are (a) the AWS SDK’s 2025 default checksum behavior, (b) keeping bearer URLs out of logs, browser analytics, and overly broad scopes, and (c) local MinIO behaving more permissively than R2 in exactly the areas that are easiest to miss (checksums, CORS, response-header overrides).

| Decision | Recommendation |
|---|---|
| Repository ownership | Backend only |
| Credential upload | Backend-proxied `multipart/form-data`; no browser-direct PUT |
| Credential download | Presigned GET, 300 seconds |
| Inspector Export download | Presigned GET, 900 seconds; no refresh operation exists in the contract |
| AWS SDK packages | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| Checksum settings | `requestChecksumCalculation: "WHEN_REQUIRED"` and `responseChecksumValidation: "WHEN_REQUIRED"` |
| R2 CORS | None for uploads; optionally GET for the frontend origin if downloads are fetched by JavaScript |
| Local development | MinIO community container, same adapter, environment-driven endpoint |

### Answers at a glance

| # | Question | Answer |
|---|---|---|
| 1 | Which repositories need R2 code? | Backend only. The frontend needs no S3 client, R2 credentials, or R2 CORS code; the specs repository needs no code. |
| 2 | Backend integration surface? | `@aws-sdk/client-s3` plus `@aws-sdk/s3-request-presigner`; `region: "auto"`, account endpoint, R2 token credentials, `forcePathStyle: true`, checksum defaults off; a four-method `put`/`get`/`presignGet`/`delete` adapter. |
| 3 | Presigned URLs on R2? | `GET`, `HEAD`, `PUT`, `DELETE`; 1 second to 7 days; no `POST` form uploads; no custom domains; response-header overrides are not documented. Set `Content-Disposition` at upload instead. |
| 4 | S3-compatibility gaps? | The 2025 AWS SDK default CRC32 is a full-object checksum; R2 documents CRC-32 as composite-only. Set `requestChecksumCalculation` and `responseChecksumValidation` to `WHEN_REQUIRED`. Single PUT is capped at 5 GiB; multipart at 5 TiB/10,000 parts. Node >= 20 and the CJS entry work under native ESM. |
| 5 | Is CORS needed? | Not when both upload and download bytes go through the backend. A GET rule is needed if the frontend fetches a presigned URL; a PUT rule plus headers is needed for browser-direct upload. |
| 6 | Local development? | MinIO is the closest emulator: path-style, `us-east-1`, `localhost:9000` presign host. The same adapter runs with different env values, but MinIO is more permissive on checksums/response overrides. |
| 7 | Recommended upload path? | Backend-proxied multipart. It matches the contract and lets the backend authorize, validate actual bytes, and audit in one step. Browser-direct PUT is for large/resumable uploads, not this MVP. |
| 8 | Effort and risks? | Two dependencies, one adapter with four methods, one migration, four existing operations. Top risks: checksum defaults, bearer-URL leakage, local/production divergence. |

## 1. Which repositories need R2 code

**Sourced fact.** The contract already fixes the shape of the integration:

- Credential uploads are `PUT /credentials/me/nursing-license` and `PUT /credentials/me/tb-test`, both `multipart/form-data` with the document as a file part ([OpenAPI `openapi.yaml`](../specs/api/openapi.yaml), operations `replaceMyNursingLicense`, `replaceMyTbTestResult`).
- Credential download is `GET /credentials/{credentialId}/download`, returning JSON `DownloadLink { url, expiresAt }`, not bytes ([OpenAPI `openapi.yaml`](../specs/api/openapi.yaml), operation `getCredentialDownload`).
- Inspector Export creation is `POST /facilities/{facilityId}/inspector-exports`, returning `InspectorExport` with an embedded `DownloadLink` ([OpenAPI `openapi.yaml`](../specs/api/openapi.yaml), operation `createInspectorExport`).
- The download URL is explicitly “Short-lived signed URL; must not be logged or sent to analytics” ([OpenAPI `openapi.yaml`](../specs/api/openapi.yaml), `DownloadLink` schema).

**Recommendation:** only the backend needs an S3/R2 client.

- **Backend (`shifters-be`):** owns the R2 credentials, the S3 client, the adapter, bucket/key policy, presigning, upload validation, and all authorization checks.
- **Frontend (`shifters-fe`):** receives an opaque `download.url`, navigates to it (or fetches it for a Blob download), and never logs or sends it to PostHog. It needs no `@aws-sdk/*` package and no R2 credential. It does not “configure CORS” — CORS is a bucket policy, not frontend code.
- **Specs (`shifters-specs`):** no R2 code. Only contract/spec changes if a product decision changes (for example, adding an upload-size maximum or an export-download refresh operation).

The backend currently has no storage module and no AWS SDK dependency (`shifters-be/package.json`), so this is greenfield rather than a refactor. The API contract is the deciding argument against browser-direct upload: the upload endpoints are already defined as backend multipart endpoints. Browser-direct PUT would require new initiate/finalize operations, a change to the OpenAPI contract, and a second authorization/validation state machine. That is a larger change than adding the storage adapter.

## 2. Backend integration surface

### 2.1 Packages

**Sourced fact.** Cloudflare’s JavaScript example uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`, configured with an R2 endpoint and `region: "auto"` ([Cloudflare R2 — aws-sdk-js-v3](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/)). At the research date the packages are version `3.1161.0`, declare `engines.node >= 20.0.0`, and publish a CommonJS `main` plus an ESM `module` ([npm `@aws-sdk/client-s3`](https://registry.npmjs.org/@aws-sdk/client-s3/latest), [npm `@aws-sdk/s3-request-presigner`](https://registry.npmjs.org/@aws-sdk/s3-request-presigner/latest)).

| Package | Why |
|---|---|
| `@aws-sdk/client-s3` | `S3Client`, `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand` |
| `@aws-sdk/s3-request-presigner` | `getSignedUrl` for the download link |
| `@aws-sdk/lib-storage` (optional) | `Upload` for multipart, only if an export can exceed the 5 GiB single-PUT limit |
| `@types/multer` (optional dev) | Only if the code types `Express.Multer.File`; otherwise use a small local upload type |

Install the two required packages with `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`; add `@aws-sdk/lib-storage` only when multipart is actually needed. Do not add an R2-specific SDK or a Workers binding. The backend is Node/NestJS, so the S3-compatible API is the correct surface. Cloudflare’s own Workers binding cannot generate presigned URLs ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)), which is another reason the backend must use the S3 API.

### 2.2 Client configuration

**Sourced fact.** R2 uses `region: "auto"` (the SDK requires a region, but R2 does not use it); an empty region and `us-east-1` alias to `auto` ([Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/), [Cloudflare R2 — aws-sdk-js-v3](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/)). The endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, with jurisdiction-specific endpoints for EU, US, and FedRAMP buckets ([Cloudflare R2 — Authentication](https://developers.cloudflare.com/r2/api/tokens/)). `forcePathStyle` is an S3 client option that switches from virtual-hosted to path-style URLs ([AWS SDK for JavaScript v3 — `S3InputConfig.forcePathStyle`](https://unpkg.com/@aws-sdk/middleware-sdk-s3@3.972.85/dist-types/submodules/s3/middleware-s3-configuration/s3Configuration.d.ts)). R2 supports both forms; its own examples show the virtual-hosted form and the path-based form ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)).

**Recommendation:** use one factory with environment-driven values, and set `forcePathStyle: true` for portability with local MinIO:

```ts
// src/storage/r2.client.ts
import { S3Client } from '@aws-sdk/client-s3';

export function createObjectStorageClient(env: StorageEnv): S3Client {
  return new S3Client({
    region: env.S3_REGION, // "auto" on R2; "us-east-1" on local MinIO
    endpoint: env.S3_ENDPOINT, // https://<ACCOUNT_ID>.r2.cloudflarestorage.com
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    // AWS SDK 3.729.0+ defaults to CRC32 on writes and checksum validation on reads.
    // R2's documented checksum support does not line up with those defaults; see §4.1.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}
```

Use an **account-owned R2 API token** scoped to the one bucket with `Object Read & Write`, not `Admin Read & Write`. Account tokens are tied to the Cloudflare account and remain valid until revoked or expired; user tokens become inactive if the user is removed ([Cloudflare R2 — Authentication](https://developers.cloudflare.com/r2/api/tokens/)). Keep the token in deployment secrets; the non-functional requirements already prohibit committed sandbox/prod secrets ([`non-functional.md`](../specs/non-functional.md), “Environments and deployment”). Validate every storage environment variable at boot and fail fast if one is missing; do not let the SDK fall back to the default AWS credential chain by accident.

Do not set `ACL`, `ServerSideEncryption`, `Tagging`, or S3 Object Lock headers. R2 does not implement those S3 features (see §4.3), and R2 encrypts objects at rest automatically with AES-256 and in transit with TLS ([Cloudflare R2 — Data security](https://developers.cloudflare.com/r2/reference/data-security/)).

### 2.3 Smallest adapter interface

**Recommendation:** keep the adapter deliberately narrow. The MVP needs `put`, `get`, `presignGet`, and `delete`; `presignPut` is only needed if the upload path changes to browser-direct.

```ts
// src/storage/object-storage.ts
import type { Readable } from 'node:stream';

export interface PutObjectInput {
  key: string;
  body: Buffer | Readable;
  contentLength: number;
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'application/zip';
  contentDisposition: string;
  cacheControl?: string;
}

export interface StoredObject {
  etag?: string;
}

export interface ObjectBody {
  body: Readable;
  contentLength?: number;
  contentType?: string;
  contentDisposition?: string;
}

export interface PresignedDownload {
  url: string;
  expiresAt: Date;
}

export interface ObjectStorage {
  put(input: PutObjectInput): Promise<StoredObject>;
  get(key: string): Promise<ObjectBody>;
  presignGet(key: string, expiresInSeconds: number): Promise<PresignedDownload>;
  delete(key: string): Promise<void>;
}
```

Implementation notes:

- `put` sends `PutObjectCommand` with `ContentLength`, `ContentType`, `ContentDisposition`, and `CacheControl: "private, no-store"`. Set `ContentLength` explicitly; for a stream this also avoids relying on chunked/`aws-chunked` behavior that R2 does not document.
- `get` returns the SDK’s Node `Readable` body. It is used by export generation (to read every original document into the ZIP) and as a streaming-download fallback; it is not needed for ordinary credential downloads if those always use presigning.
- `presignGet` calls `getSignedUrl(..., { expiresIn })`. Presigning is local signing, not an R2 API call ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)), so it should not be treated as a network health check.
- `delete` is for compensating cleanup only: if the database transaction fails after a successful `put`, delete the just-written object. The product has no user-facing hard delete, and historical documents must remain ([`non-functional.md`](../specs/non-functional.md), “Retention and deletion”).
- Do not add `list` or `headBucket` to the adapter unless a concrete feature needs them. A startup `HeadBucket` check is optional; it should not make the app fail to boot when storage is temporarily unavailable.

A `presignGet` implementation is small:

```ts
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const expiresIn = Math.min(expiresInSeconds, 900);
const url = await getSignedUrl(
  this.s3,
  new GetObjectCommand({ Bucket: this.bucket, Key: key }),
  { expiresIn },
);
return { url, expiresAt: new Date(Date.now() + expiresIn * 1000) };
```

The AWS SDK presigner defaults `expiresIn` to 900 seconds when omitted ([`@aws-sdk/s3-request-presigner` README](https://github.com/aws/aws-sdk-js-v3/tree/main/packages/s3-request-presigner)). Set it explicitly rather than relying on that default.

### 2.4 Keys, metadata, and database shape

**Recommendation:** use opaque, immutable, server-generated keys:

```text
credentials/<nurseId>/<credentialId>
exports/<facilityId>/<exportId>.zip
```

`nurseId`, `credentialId`, `facilityId`, and `exportId` are UUIDs. Do not put names, license numbers, TB outcomes, original filenames, or dates that reveal a TB result in the key. This matters beyond aesthetics: if R2 Data Access Logs are ever enabled, they can record `resource.key` and `actor.accessKeyId`; the documented `request.uri` field is the request path, and the page does not list query strings ([Cloudflare R2 — Data Access Logs](https://developers.cloudflare.com/r2/buckets/data-access-logs/)). Opaque keys keep the key from becoming a sensitive log field.

Credentials are replaced by creating a new record and a new key; the prior object stays at its old key. Do not overwrite the prior key. R2’s compatibility table lists `GetBucketVersioning` and `PutBucketVersioning` as unimplemented, so S3 versioning is not available to recover an overwritten object ([Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)). Unique keys also avoid R2’s documented limit of one concurrent write per second to the same key ([Cloudflare R2 — Limits](https://developers.cloudflare.com/r2/platform/limits/)).

PostgreSQL should store the internal `object_key`, the original `fileName`, `contentType`, `sizeBytes`, and an application-computed SHA-256. Do **not** add `object_key` to the API-facing `DocumentMetadata` schema; the client should never see or submit a key. The API continues to expose only `fileName`, `contentType`, and `sizeBytes` ([OpenAPI `openapi.yaml`](../specs/api/openapi.yaml), `DocumentMetadata`).

Set `ContentDisposition` at upload time to a neutral, server-generated filename, for example `attachment; filename="nursing-license-<credentialId>.<ext>"` or `attachment; filename="tb-test-<credentialId>.<ext>"`, where `<ext>` is derived from the validated content type. Keep the user’s original filename in PostgreSQL for display, but do not use it as the stored filename or the download filename. OWASP recommends application-generated filenames and warns that the client-supplied `Content-Type` can be spoofed ([OWASP — File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)).

## 3. Presigned URLs on R2

**Sourced facts.** Cloudflare recommends presigned URLs for client-side downloads where users download directly from R2, rather than proxying the bytes ([Cloudflare R2 — Download objects](https://developers.cloudflare.com/r2/objects/download-objects/)). Cloudflare also documents the following:

- Presigned URLs support `GET`, `HEAD`, `PUT`, and `DELETE`; `POST` (multipart form uploads via HTML forms) is not supported ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)).
- Expiry can be from **1 second to 7 days (604,800 seconds)** ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)).
- Generation is server-side and requires no communication with R2; it needs only the R2 credentials and a SigV4 implementation ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)).
- The same URL can be reused multiple times until it expires; it is a bearer token, not a one-time link ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)).
- Presigned URLs work only on the S3 API domain (`<ACCOUNT_ID>.r2.cloudflarestorage.com`) and **cannot be used with custom domains** ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)).
- The example URL includes `X-Amz-Credential`, `X-Amz-Signature`, and `X-Amz-SignedHeaders=host`; the host is part of the signature ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)).

AWS’s own documentation says presigned URLs created with SDKs/CLI can be valid up to 7 days, that they are bearer tokens reusable until expiry, and that they expire earlier if the underlying credentials expire ([AWS S3 — Download and upload objects with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)). The AWS SDK presigner’s default is 900 seconds ([`@aws-sdk/s3-request-presigner` README](https://github.com/aws/aws-sdk-js-v3/tree/main/packages/s3-request-presigner)).

### 3.1 Response header overrides and forced downloads

**Sourced fact.** AWS S3 `GetObject` supports response-header overrides via signed query parameters: `response-cache-control`, `response-content-disposition`, `response-content-encoding`, `response-content-language`, `response-content-type`, and `response-expires`. They must be signed (Authorization header or presigned URL), not used anonymously ([AWS S3 API Reference — GetObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html)).

**Where Cloudflare is silent.** R2’s `GetObject` compatibility entry lists conditional operations, `Range`, and SSE-C, but does not list the `response-*` parameters ([Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)). Cloudflare’s presigned URL page does not mention response-header overrides either. I found no Cloudflare documentation stating that `response-content-disposition` is supported, ignored, or rejected on R2. Do not make the MVP depend on it.

**Recommendation:** set `ContentDisposition` on the object at `PutObject` time. R2 documents `Content-Disposition` as supported system metadata on `PutObject` ([Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)), and standard S3 semantics return stored system metadata on `GET`. This gives a forced download without relying on an undocumented response override. It also works for users who open the link as a top-level navigation. The HTML `download` attribute is not a substitute: it is ignored for cross-origin URLs, although `Content-Disposition` still instructs the browser to download ([MDN — `<a download>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a#download)).

### 3.2 TTL and revocation

**Recommendation:** use **300 seconds** for Credential downloads and **900 seconds** for Inspector Export downloads. Both are far below the 7-day maximum, and 900 seconds matches the AWS SDK default while leaving room for a user to click after the export finishes. Never use the 7-day maximum for these documents.

The export case needs special care: `createInspectorExport` returns the `DownloadLink` in the creation response, and the current contract has no separate “get export download” operation. If the user does not open the link before it expires, there is no documented refresh endpoint. Either the frontend opens it immediately, or the contract needs a refresh operation. A 900-second TTL is a pragmatic MVP compromise; do not silently rely on a 7-day URL.

**Sourced fact.** Cloudflare does not document a per-URL revocation mechanism; the URL remains valid until expiry, and treating it as a bearer token is the security model ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)). AWS documents that a presigned URL expires when the underlying credentials are revoked or deactivated, so rotating the R2 token is a blunt fallback rather than a per-download control ([AWS S3 — Download and upload objects with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)).

**Recommendation:** short TTL is the revocation control. Do not describe the URL as one-time-use. If a document must be downloadable exactly once, or access must be revocable immediately, use an authorized backend streaming response instead. The current `getCredentialDownload` operation returns JSON `DownloadLink`, so switching to bytes is an OpenAPI change, not just a controller change.

### 3.3 Authorization and logging boundaries

**Recommendation:** presign only after the same authorization query that guards metadata access:

- Nurse: `credential.nurseId === authenticated nurse`.
- Facility Manager: the nurse is associated with the manager’s Facility through successful claim history.
- Admin: the credential is within the selected Facility scope, or any Facility when explicitly unscoped.

The presign endpoint must accept a `credentialId`, load the object key server-side, and never accept a bucket or key from the client. The same rule applies to exports: authorize the Facility, then presign the export’s stored key.

The URL is a bearer token. Do not log it, put it in an error message, attach it to a PostHog event, or include it in an audit entry. The OpenAPI schema already says this ([OpenAPI `openapi.yaml`](../specs/api/openapi.yaml), `DownloadLink`), and the non-functional requirements repeat it ([`non-functional.md`](../specs/non-functional.md), “Document and export storage” and “Observability”). Do not add a response-body logger; if one already exists, redact `download.url`. Also do not enable the AWS SDK’s `logger` or raw request/response middleware logging: AWS’s own client documentation shows middleware that logs raw request and response data ([AWS SDK for JavaScript v3 — CLIENTS.md](https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/CLIENTS.md), “Logger”). Add a response-redaction test so a future interceptor cannot serialize the URL.

## 4. S3-compatibility gaps that bite

### 4.1 The 2025 AWS SDK integrity defaults are the main trap

**Sourced fact.** In AWS SDK for JavaScript v3 **3.729.0 (2025-01-15)**, the S3 client changed to “always calculate CRC32 checksum by default for operations that support it (such as PutObject or UploadPart), or require it (such as DeleteObjects).” It also began validating response checksums. The behavior is controlled by `requestChecksumCalculation` and `responseChecksumValidation` ([AWS SDK for JavaScript v3 — CHANGELOG, 3.729.0](https://github.com/aws/aws-sdk-js-v3/blob/main/CHANGELOG.md)). The SDK source confirms the defaults are `WHEN_SUPPORTED` and the default algorithm is `CRC32` ([`@aws-sdk/checksums` flexible-checksums constants](https://unpkg.com/@aws-sdk/checksums@3.1002.1/dist-es/submodules/flexible-checksums/constants.js)). AWS’s SDK reference table lists **CRC32** as the JavaScript SDK’s default algorithm ([AWS SDK Reference — Data Integrity Protections for Amazon S3](https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html)).

AWS explicitly warns that these defaults may run ahead of third-party S3-compatible implementations:

> “The AWS SDKs and CLI are designed for usage with official AWS services. We may introduce and enable new features by default ... prior to them being supported or otherwise handled by third-party service implementations. You can disable the new behavior with the `WHEN_REQUIRED` value...” ([AWS SDK for JavaScript v3 — issue #6810, “Announcement: S3 default integrity change”](https://github.com/aws/aws-sdk-js-v3/issues/6810)).

**Sourced fact.** R2’s checksum compatibility table says:

| Algorithm | `FULL_OBJECT` | `COMPOSITE` |
|---|---|---|
| CRC-64/NVME (`CRC64NVME`) | ✅ | ❌ |
| CRC-32 (`CRC32`) | ❌ | ✅ |
| CRC-32C (`CRC32C`) | ❌ | ✅ |
| SHA-1 (`SHA1`) | ❌ | ✅ |
| SHA-256 (`SHA256`) | ❌ | ✅ |

([Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/))

AWS S3 defines a `PutObject` checksum as **always `FULL_OBJECT`** ([AWS S3 API Reference — PutObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html), `x-amz-checksum-type`). R2’s table marks CRC-32 as composite-only, not full-object. AWS’s broader S3 integrity guide lists CRC64NVME, CRC32, CRC32C, SHA1, SHA256, MD5, and several xxHash/SHA-512 variants as supported by S3 ([AWS S3 — Checking object integrity](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html)); R2’s documented matrix is narrower. R2 did add CRC-64/NVME full-object support for single and multipart objects on **2025-07-03** ([Cloudflare R2 — Release notes](https://developers.cloudflare.com/r2/platform/release-notes/)).

**Where Cloudflare is silent.** Cloudflare does not say whether R2 rejects a `PutObject` carrying `x-amz-checksum-crc32` (the SDK default), ignores it, or accepts it without the full-object semantics. The table says full-object CRC-32 is not implemented; the operations table for `PutObject` does not list `x-amz-checksum-*` at all, only `Content-MD5` ([Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)). This is a documented ambiguity, not a confirmed failure.

**Recommendation:** disable the SDK defaults for R2:

```ts
new S3Client({
  // ...
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});
```

Then add integrity deliberately:

- Compute SHA-256 in the backend and store it in PostgreSQL as an audit/dedup fingerprint.
- Optionally send `Content-MD5` on `PutObject`; R2 explicitly supports `Content-MD5` ([Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)). MD5 detects accidental corruption, not deliberate tampering, so do not treat it as a security control.
- If you want an S3-level checksum, test `CRC64NVME` against the installed SDK and a real R2 bucket before adopting it. The AWS JavaScript SDK reference table currently lists CRC32, CRC32C, SHA1, and SHA256, not CRC64NVME ([AWS SDK Reference — Data Integrity Protections for Amazon S3](https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html)); do not assume availability just because R2 supports the algorithm.

`aws-chunked` is the other half of this trap. When request checksums are enabled for a streamed body, the SDK can use chunked encoding with a trailing checksum; its `requestStreamBufferSize` option explicitly applies “when request checksums are enabled” ([AWS SDK for JavaScript v3 — CLIENTS.md, S3 section](https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/CLIENTS.md)). Cloudflare’s R2 compatibility page does not document `aws-chunked` or streaming SigV4 payloads. With `WHEN_REQUIRED` and a Buffer or a stream with a known `ContentLength`, the MVP avoids depending on that path.

### 4.2 Multipart, object size, and other limits

**Sourced fact.** R2’s limits are:

| Limit | Value |
|---|---|
| Object size | 5 TiB per object |
| Single-part upload | 5 GiB maximum |
| Multipart upload | 4.995 TiB maximum, up to 10,000 parts |
| Multipart part size | 5 MiB to 5 GiB per part (last part may be smaller) |
| Object key length | 1,024 bytes |
| Object metadata size | 8,192 bytes |
| Concurrent writes to the same key | 1 per second |

([Cloudflare R2 — Limits](https://developers.cloudflare.com/r2/platform/limits/), [Cloudflare R2 — Upload objects](https://developers.cloudflare.com/r2/objects/upload-objects/))

R2 implements `CreateMultipartUpload`, `UploadPart`, `CompleteMultipartUpload`, `AbortMultipartUpload`, and `ListParts` ([Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)). The S3 SDK’s `@aws-sdk/lib-storage` `Upload` helper can manage multipart automatically; if used, set a part size of at least 5 MiB. For the MVP, Credential documents are PDFs/JPEGs/PNGs and should be far below 5 GiB; Inspector Exports are ZIPs of those documents and are also very unlikely to approach 5 GiB. Start with single `PutObject`; add `lib-storage` only if a real export can cross the single-PUT limit or needs resumability.

**Recommendation:** impose an application-level maximum for Credential documents (for example, 10 MiB) and encode it in OpenAPI and the multipart parser. The spec currently sets no maximum; that is a product decision, not an R2 limit. For exports, either buffer/temp-file the ZIP and use single `PutObject`, or switch to `lib-storage` above a documented threshold. Do not raise the limit to R2’s 5 GiB just because R2 allows it.

### 4.3 Other unsupported or risky S3 features

**Sourced fact.** R2 does not implement ACLs, object tagging, S3 Object Lock, S3 website hosting, or SSE-KMS; `PutObject` supports SSE-C but not `x-amz-server-side-encryption` KMS modes ([Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)). R2 bucket versioning operations are also unimplemented ([Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)).

**Recommendation:**

- Do not set `ACL: "private"` or any ACL. R2 buckets are private by default: “By default, buckets are never publicly accessible and will always require explicit user permission to enable” ([Cloudflare R2 — Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)). Keep `r2.dev` and custom-domain public access disabled.
- Do not use object tags, S3 Object Lock, or lifecycle rules that delete Credential/Export prefixes. The product must retain historical documents ([`non-functional.md`](../specs/non-functional.md), “Retention and deletion”).
- Do not connect a custom domain for these objects. Besides exposing the bucket through a public endpoint, presigned URLs cannot use custom domains ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)).
- Use immutable UUID keys instead of versioning. There is no S3 versioning to fall back on.

### 4.4 Node 24, ESM, and NestJS 12

**Sourced fact.** The backend pins Node `26.13` in `.nvmrc`; the research shell runs Node `24.18.0`. Both satisfy the AWS SDK’s declared `engines.node >= 20.0.0` ([npm `@aws-sdk/client-s3`](https://registry.npmjs.org/@aws-sdk/client-s3/latest)). The backend is native ESM (`"type": "module"`, `module: nodenext`) and requires `.js` extensions on relative imports ([`shifters-be/AGENTS.md`](../../../shifters-be/AGENTS.md), “ESM rules”).

The SDK packages publish a CommonJS `main` and an ESM `module` but no `exports` map in the current release ([npm `@aws-sdk/client-s3`](https://registry.npmjs.org/@aws-sdk/client-s3/latest)). Node ESM therefore resolves the CommonJS build. The built `dist-cjs/index.js` assigns named exports explicitly (`exports.S3Client = ...`; see the [published CJS artifact](https://unpkg.com/@aws-sdk/client-s3@3.1161.0/dist-cjs/index.js)), which is what Node’s CommonJS named-export detection needs; named ESM imports such as `import { S3Client } from '@aws-sdk/client-s3'` are the normal usage and are shown in the SDK README ([`@aws-sdk/client-s3` README](https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-s3)).

**Recommendation:**

- Use static ESM imports; do not use `require()`.
- Keep the repo’s `.js` extension rule for relative imports, including the storage module imports.
- Prefer a synchronous `S3Client` factory with env values. If credentials come from an async provider, initialize it before `app.listen` or use a provider; do not add top-level await unnecessarily.
- The SDK’s Node handler uses `node:http`/`node:https`, not Node’s global `fetch` ([AWS SDK for JavaScript v3 — CLIENTS.md](https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/CLIENTS.md), “Node.js requestHandler”). Node 24’s global fetch does not change SDK behavior.
- Run `pnpm run build` after adding the packages to confirm TypeScript 6 + `nodenext` resolution. The packages’ `types` fields point at `dist-types/index.d.ts`; no `@types/aws-sdk` package is needed.
- Do not add `aws-crt` unless a checksum algorithm requires it. With `WHEN_REQUIRED`, the MVP does not.

## 5. CORS

**Sourced fact.** Cloudflare describes CORS as the mechanism used “when you interact with a bucket from a web browser,” and says that without a CORS policy, browser-based uploads and downloads using presigned URLs fail even when the URL is valid ([Cloudflare R2 — Configure CORS](https://developers.cloudflare.com/r2/buckets/cors/)). Expired presigned URLs return `403 ExpiredRequest`, and R2 does not include CORS response headers on those responses, so browser JavaScript cannot read the error body ([Cloudflare R2 — Configure CORS](https://developers.cloudflare.com/r2/buckets/cors/)). CORS rule propagation can take up to 30 seconds ([Cloudflare R2 — Configure CORS](https://developers.cloudflare.com/r2/buckets/cors/)).

### 5.1 Backend-proxied upload and download

**Recommendation:** no R2 CORS policy is needed when both the upload bytes and the download bytes go through the backend. The browser talks only to the NestJS API; the backend talks to R2 server-to-server, where CORS does not apply. This is the simplest MVP configuration and the reason browser-direct upload should not be chosen casually.

Do not confuse this with **backend API CORS**. If the Vite dev server (`localhost:5173`) and NestJS (`localhost:3000`) are different origins, the backend needs its own CORS/proxy configuration for the frontend’s API calls. That is unrelated to the R2 bucket policy.

### 5.2 Presigned download from the browser

**Recommendation:** if the frontend opens the presigned GET as a top-level navigation or a normal link, add a minimal GET rule for the frontend origin anyway. Cloudflare’s guidance does not carve out navigation, the rule is cheap, and it removes ambiguity across browsers:

```json
[
  {
    "AllowedOrigins": ["https://app.example.com", "http://localhost:5173"],
    "AllowedMethods": ["GET"],
    "ExposeHeaders": ["Content-Disposition", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

If the frontend instead uses `fetch()` to read the object into a Blob (for example, to avoid putting the R2 URL in browser history), the GET rule is mandatory and `Content-Disposition`/`Content-Length` must be exposed if JavaScript reads them. A top-level navigation is not a `fetch`, but Cloudflare’s documentation does not make that distinction; the conservative rule is the safer default.

### 5.3 If browser-direct presigned PUT is chosen instead

**Sourced fact.** A presigned `PutObject` URL can pin `ContentType`: Cloudflare says the signature includes the header, and an upload with a different `Content-Type` fails with `403 SignatureDoesNotMatch` ([Cloudflare R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)). R2 CORS must allow the origin, the `PUT` method, and any headers the client sends, including content-type, checksums, caching, or custom metadata; `ETag` should be exposed if the client verifies the upload ([Cloudflare R2 — Configure CORS](https://developers.cloudflare.com/r2/buckets/cors/)).

**Recommendation:** if this path is ever adopted, the bucket policy would look like:

```json
[
  {
    "AllowedOrigins": ["https://app.example.com", "http://localhost:5173"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": [
      "Content-Type",
      "x-amz-checksum-crc32",
      "x-amz-sdk-checksum-algorithm"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

List each localhost port explicitly; Cloudflare says ports cannot contain wildcards ([Cloudflare R2 — Configure CORS](https://developers.cloudflare.com/r2/buckets/cors/)). Send the file as a raw `File`/`Blob` body with the exact signed `Content-Type`, not as `FormData` (which changes the content type to multipart/form-data). Use `fetch` or `XMLHttpRequest`; no S3 client is required in the browser for a single presigned PUT.

The security cost is real: the signature can pin the declared content type, but it cannot prove the bytes are that type. A client can upload arbitrary bytes labeled `application/pdf`. Post-upload validation would have to download the object, inspect magic bytes, and quarantine/delete it before any presigned GET is issued. That is a second state machine and a new source of orphaned objects.

## 6. Local development

### 6.1 MinIO as the default local emulator

**Sourced fact.** MinIO documents `PutObject`, `GetObject`, `DeleteObject`, multipart uploads, and S3-compatible checksums ([MinIO AIStor — S3 API Compatibility](https://docs.min.io/aistor/developers/s3-api-compatibility/)). Its JavaScript SDK documents presigned GET/PUT URLs with a default expiry of 7 days and supports response-header overrides via `respHeaders` ([MinIO JS SDK — API reference](https://github.com/minio/minio-js/blob/master/docs/API.md)). A local container exposes the API on port 9000 and the console on 9001 ([MinIO AIStor — Deploy as a container](https://docs.min.io/aistor/installation/container/install/)).

**Recommendation:** run a pinned MinIO community container for local development and integration tests:

```yaml
services:
  minio:
    image: minio/minio:<pinned-release>
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: shiftpatch-local
      MINIO_ROOT_PASSWORD: shiftpatch-local-secret
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    volumes:
      - minio-data:/data
```

Then create the bucket once (`mc alias set local http://localhost:9000 ...` followed by `mc mb local/shiftpatch-local`, or use the console). Use `S3_ENDPOINT=http://localhost:9000`, `S3_REGION=us-east-1`, and local-only credentials; the factory sets `forcePathStyle: true`. Do not reuse sandbox/prod credentials.

### 6.2 What differs from R2

| Concern | R2 | Local MinIO |
|---|---|---|
| Endpoint | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | `http://localhost:9000` |
| Region | `auto` (empty and `us-east-1` alias to `auto`) | Use `us-east-1`, as in MinIO’s own JS example |
| Addressing | Path-style and virtual-hosted-style both documented | Path-style by default; virtual-hosted-style needs `MINIO_DOMAIN` and wildcard DNS |
| TLS | HTTPS | HTTP unless configured |
| Credentials | R2 API token (access key ID/secret) | Local root/user credentials |
| Checksums | CRC-32 full-object not documented; CRC-64/NVME full-object; CRC-32/C/SHA-1/SHA-256 composite | Accepts CRC32, CRC32C, CRC64NVME, SHA1, SHA256, and others on write |
| Response header overrides | Not documented for `GetObject` | Supported via the SDK’s `respHeaders` parameter |
| Presigned host | The account endpoint | `localhost:9000` (or the container hostname) |

The addressing and region facts come from [Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/), [Cloudflare R2 — Release notes](https://developers.cloudflare.com/r2/platform/release-notes/) (virtual-hosted support added 2022-05-16), and [MinIO AIStor — Core settings](https://docs.min.io/aistor/reference/aistor-server/settings/core/) (`MINIO_DOMAIN` and wildcard DNS for virtual-hosted style). The checksum and response-override differences come from [MinIO AIStor — S3 API Compatibility](https://docs.min.io/aistor/developers/s3-api-compatibility/) and [MinIO JS SDK — API reference](https://github.com/minio/minio-js/blob/master/docs/API.md).

**Recommendation:** use the same adapter and `S3Client` factory for both, with environment values. The code path should be unchanged; the configuration is not. In particular:

- `forcePathStyle: true` works for both and avoids the local virtual-host DNS requirement.
- `S3_REGION` differs (`auto` vs `us-east-1`).
- The presigned URL host differs. If the backend runs in Docker with `S3_ENDPOINT=http://minio:9000`, a URL presigned for `minio:9000` will not work in the browser at `localhost:9000` because the host is signed. Either run the backend on the host for local development, or add a separate `S3_PUBLIC_ENDPOINT=http://localhost:9000` and presign with a second client configured with that endpoint. R2 does not have this split because the server and browser use the same public endpoint.
- MinIO is more permissive on checksums and response overrides. A local test passing does not prove R2 behavior. Run the checksum/response-header smoke tests against a real R2 bucket before release.

### 6.3 Alternatives

| Option | Trade-off |
|---|---|
| **MinIO** | Closest full S3-compatible server for development; supports multipart, presigning, CORS, and checksums. Current docs describe AIStor, which requires a license for production; the `minio` binary is described as a drop-in replacement for the AGPLv3 community server ([MinIO AIStor — Deploy as a container](https://docs.min.io/aistor/installation/container/install/)). Bucket CORS is configured with `mc cors` ([MinIO AIStor — `mc cors`](https://docs.min.io/aistor/reference/cli/mc-cors/)). |
| **LocalStack** | Broader AWS emulation, but S3 signature validation is **disabled by default**; presigned URLs with invalid signatures or expired dates are accepted unless `S3_SKIP_SIGNATURE_VALIDATION=0` is set ([LocalStack — S3](https://docs.localstack.cloud/user-guide/aws/s3/)). That makes it a weak proxy for authorization/expiry behavior unless configured carefully. |
| **Adobe S3Mock** | Lightweight, explicitly “a subset of the Amazon S3 API” for integration testing ([Adobe S3Mock README](https://github.com/adobe/S3Mock)). Good for fast tests, not a parity environment. |
| **Real R2 bucket** | The only authoritative environment for R2-specific checksum, CORS, and response-header behavior. Use a dedicated non-production bucket for smoke tests. |

Cloudflare does not document a local R2 emulator for the S3 API; its AWS SDK page even notes that the S3-compatible API cannot be used while developing locally via `wrangler dev` ([Cloudflare R2 — aws-sdk-js-v3](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/)). MinIO (or another S3 emulator) is therefore necessary for local backend development.

## 7. Recommended MVP upload and download path

### 7.1 Backend-proxied bytes versus browser-direct presigned PUT

| Criterion | Backend-proxied multipart | Browser-direct presigned PUT |
|---|---|---|
| Matches current OpenAPI | Yes | No; needs initiate/finalize operations |
| Authorization before bytes | Yes, one check | URL issuance check, but write happens outside backend |
| Validate actual bytes (magic bytes) | Yes, before storage | No; only declared `Content-Type` can be pinned |
| Audit | One action after commit | Needs upload state and a finalize action; abandoned uploads |
| Orphan cleanup | Compensating delete on DB failure | Lifecycle cleanup for abandoned uploads |
| CORS | None for R2 | Bucket PUT rule required |
| Backend bandwidth/memory | Bytes pass through NestJS | Direct to R2 |
| Best fit | Small Credential documents | Large files, resumable uploads, high volume |

**Recommendation:** backend-proxied upload for the MVP. The API already defines multipart endpoints, the documents are small, and the security properties line up with the spec:

- The backend checks authentication, role, CSRF, and ownership before reading the file.
- The backend can enforce the MIME allowlist (`application/pdf`, `image/jpeg`, `image/png`), a size limit, and magic-byte signatures before anything is stored. OWASP recommends validating the file signature and not trusting the `Content-Type` header ([OWASP — File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)).
- One audit action (`CREDENTIAL_CREATED` or `CREDENTIAL_REPLACED`) is written in the same transaction as the credential record, after the object is stored. The spec requires upload/replacement to be audited ([`domain.md`](../specs/domain.md), “Audit Log”; [`workflows.md`](../specs/workflows.md), “Credential upload and replacement”).
- One analytics event (`credential_uploaded`) is emitted after commit, with only `credential_type` and `is_replacement` ([`analytics.md`](../specs/analytics.md)). There is no URL or document metadata in the event.
- No R2 CORS, no presigned PUT, no client-side object key, and no abandoned-upload cleanup.

The cost is that document bytes transit the backend. For PDFs/JPEGs/PNGs at a sane size limit, this is negligible. If the product later accepts large files, adds resumable uploads, or sees high upload volume, browser-direct PUT becomes worth the extra state machine.

### 7.2 Concrete flows

**Credential upload/replacement:**

1. Authenticate, authorize Nurse, verify CSRF.
2. Parse `multipart/form-data` with an explicit file limit and one file part.
3. Validate declared content type, size, and magic bytes; sanitize/ignore the original filename for storage.
4. Generate `credentialId` and key `credentials/<nurseId>/<credentialId>`.
5. `storage.put` with `ContentType`, `ContentDisposition`, `CacheControl: private, no-store`, and `ContentLength`.
6. In one database transaction: mark the prior current credential non-current, insert the new credential with `object_key`, and write the audit entry.
7. If the transaction fails, `storage.delete(key)` and return a recoverable error. If the compensating delete also fails, the object is orphaned but unreachable because no database row exists and the bucket is private; log the credential ID, not the key or URL, and reconcile operationally.
8. After commit, emit `credential_uploaded`; do not roll back on analytics failure.

**Credential download:**

1. Authenticate and authorize the `credentialId` against the Nurse/Manager/Admin scope.
2. Load the credential row; return 404 if absent.
3. `storage.presignGet(objectKey, 300)`.
4. Return `{ url, expiresAt }`; never log the URL.

**Inspector Export:**

1. Authenticate and authorize the Facility (Manager’s Facility or Admin’s selected Facility).
2. Build the ZIP from current and historical Credential documents plus the manifest; `storage.get` each object.
3. Generate `exportId`, key `exports/<facilityId>/<exportId>.zip`, and `storage.put` the completed ZIP.
4. Insert the export row and write `INSPECTOR_EXPORT_CREATED` in one transaction.
5. If the transaction fails, delete the ZIP.
6. Presign the ZIP for 900 seconds and return `InspectorExport`.
7. Do not expose a partial file: only return success after the ZIP is fully stored and the row commits ([`non-functional.md`](../specs/non-functional.md), “Performance and availability”).

The export path always uses backend `put`; there is no browser-direct option because the backend generates the ZIP.

### 7.3 Audit and analytics boundaries

**Recommendation:** audit the create/replace/export actions, not downloads. The current `AuditAction` enum has `CREDENTIAL_CREATED`, `CREDENTIAL_REPLACED`, and `INSPECTOR_EXPORT_CREATED`; it has no download action ([OpenAPI `openapi.yaml`](../specs/api/openapi.yaml), `AuditAction`). Do not invent a download audit action without a spec change. The authorization check on the presign endpoint is the download control; if download auditing becomes a requirement, add it explicitly to the contract and keep the URL out of the entry.

The audit entry can include the credential ID, type, actor, and Facility; `reason` is available where the workflow defines one. It must not include license number, TB outcome, document contents, object key, or signed URL ([`domain.md`](../specs/domain.md), “Audit Log”; [`non-functional.md`](../specs/non-functional.md), “Observability”). The analytics event is similarly narrow ([`analytics.md`](../specs/analytics.md)).

**Recommendation:** treat the upload body and validation errors as sensitive. Do not log `req.body`, multipart field values, `file.buffer`, or raw validation errors that echo `licenseNumber` or `tbOutcome`; log only the credential ID/type and a generic reason. The frontend must not send these values to PostHog, and session replay/autocapture is already disabled in [`analytics.md`](../specs/analytics.md). Add a test that a rejected TB upload does not emit the outcome or license number to the logger.

## 8. Effort and top risks

### 8.1 Effort in concrete artifacts

| Area | Work |
|---|---|
| Backend dependencies | Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`; add `@aws-sdk/lib-storage` only if multipart exports are needed |
| Configuration | One `StorageModule`/provider that validates `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and optional `S3_PUBLIC_ENDPOINT` |
| Adapter | `ObjectStorage` interface plus one R2 implementation: `put`, `get`, `presignGet`, `delete` (four methods) |
| Key policy | One `keys.ts` with `credentialKey()` and `exportKey()`; no PII in keys |
| Database | One migration: internal `object_key` (unique), optional `sha256`, optional `etag`; keep them out of API DTOs |
| Credential endpoints | Modify `replaceMyNursingLicense`, `replaceMyTbTestResult`, and `getCredentialDownload` |
| Export endpoint | Modify `createInspectorExport`; add ZIP generation using `storage.get` and `storage.put` |
| Validation | MIME allowlist, size limit, magic-byte check, filename sanitization, CSRF/authorization |
| Tests | Adapter unit tests with a mocked `S3Client`; MinIO integration for put/get/presign/delete; e2e authorization for Nurse/other Nurse/Manager/non-associated Manager/Admin; oversized/wrong-type upload; log-redaction test; export generation and failure cleanup |
| Local infra | MinIO container, bucket init, local env values; no R2 CORS for uploads |
| Production infra | One private R2 bucket, one scoped account API token, env/secrets, public access disabled; optional GET CORS rule |
| Frontend | No R2 SDK. Change the download handler to open `download.url`; never log it or send it to analytics; optionally fetch as a Blob if browser-history exposure matters |

This is a single feature slice: two dependencies, one adapter, one migration, and four existing API operations. It is not a new service.

### 8.2 Top three risks

1. **AWS SDK checksum defaults versus R2’s documented checksum matrix.** The SDK defaults to CRC32 full-object on `PutObject`; R2 documents CRC-32 as composite-only and does not say how it handles the SDK’s header. The result could be failed uploads, ignored integrity, or an undocumented success. Mitigate with `requestChecksumCalculation: "WHEN_REQUIRED"`, `responseChecksumValidation: "WHEN_REQUIRED"`, app-side SHA-256, optional `Content-MD5`, and a real-R2 smoke test. Do not let a MinIO-only test suite certify this path.

2. **Bearer-URL leakage and over-broad download authorization.** A presigned URL bypasses the backend until it expires; anyone with it can download the document. A single log line, analytics property, error body, or overly broad Manager/Admin query defeats Facility isolation. Mitigate with authorization before presigning, 300/900-second TTLs, no URL in logs/audit/analytics, response redaction tests, and no client-supplied keys. Accept the residual browser-history exposure or use a Blob fetch/backend streaming if it is unacceptable.

3. **Local/production divergence.** MinIO accepts more checksum algorithms and supports response-header overrides that R2 does not document; LocalStack accepts invalid signatures by default; Docker presign hosts can differ from browser hosts. A green local suite can still fail on R2. Mitigate with one adapter, environment-driven endpoints, `forcePathStyle: true`, a real-R2 smoke test for put/presign/get/delete and `Content-Disposition`, and no reliance on `response-content-disposition` or MinIO-only behavior.

## 9. What to verify against a real R2 bucket before release

These are the points Cloudflare’s documentation does not settle:

1. Does `PutObject` with the SDK’s default CRC32 header succeed, fail, or silently skip integrity? (Then confirm the `WHEN_REQUIRED` configuration avoids the question.)
2. Does a presigned GET return the stored `Content-Disposition` and force a download?
3. Does `response-content-disposition` work on a presigned GET? Do not ship a dependency on it; this is only to know whether a future optimization is possible.
4. Does a presigned GET work after the object is uploaded with the chosen `ContentType`/`CacheControl` metadata?
5. Does the chosen export size stay under the 5 GiB single-PUT limit, or is multipart needed?
6. Are public access (`r2.dev` and custom domains) and R2 Data Access Logs in the intended state?
7. Does the browser download work from the deployed frontend origin with the chosen CORS rule (if any)?

## Sources

1. Cloudflare, [R2 — Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), updated 2026-10-26.
2. Cloudflare, [R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/), updated 2026-10-14.
3. Cloudflare, [R2 — Limits](https://developers.cloudflare.com/r2/platform/limits/), updated 2026-10-30.
4. Cloudflare, [R2 — Upload objects](https://developers.cloudflare.com/r2/objects/upload-objects/), updated 2026-07-29.
5. Cloudflare, [R2 — Download objects](https://developers.cloudflare.com/r2/objects/download-objects/).
6. Cloudflare, [R2 — Configure CORS](https://developers.cloudflare.com/r2/buckets/cors/), updated 2026-09-23.
7. Cloudflare, [R2 — Authentication](https://developers.cloudflare.com/r2/api/tokens/), updated 2026-10-01.
8. Cloudflare, [R2 — aws-sdk-js-v3 example](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/), updated 2026-10-26.
9. Cloudflare, [R2 — Data security](https://developers.cloudflare.com/r2/reference/data-security/), updated 2026-04-21.
10. Cloudflare, [R2 — Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), updated 2026-09-25.
11. Cloudflare, [R2 — Release notes](https://developers.cloudflare.com/r2/platform/release-notes/), entries 2025-07-03 (CRC-64/NVME full-object) and 2022-05-16 (virtual-hosted style).
12. Cloudflare, [R2 — Data Access Logs](https://developers.cloudflare.com/r2/buckets/data-access-logs/), updated 2026-10-02.
13. AWS SDK for JavaScript v3, [CHANGELOG, version 3.729.0 (2025-01-15)](https://github.com/aws/aws-sdk-js-v3/blob/main/CHANGELOG.md).
14. AWS SDK for JavaScript v3, [issue #6810, “Announcement: S3 default integrity change”](https://github.com/aws/aws-sdk-js-v3/issues/6810), opened 2025-01-16.
15. AWS SDK for JavaScript v3, [`@aws-sdk/checksums` package metadata](https://registry.npmjs.org/@aws-sdk/checksums/latest) and the published [flexible-checksums constants](https://unpkg.com/@aws-sdk/checksums@3.1002.1/dist-es/submodules/flexible-checksums/constants.js) (`WHEN_SUPPORTED` defaults, `CRC32` default algorithm).
16. AWS SDK for JavaScript v3, [S3 client configuration (`S3InputConfig.forcePathStyle`)](https://unpkg.com/@aws-sdk/middleware-sdk-s3@3.972.85/dist-types/submodules/s3/middleware-s3-configuration/s3Configuration.d.ts).
17. AWS SDK for JavaScript v3, [`@aws-sdk/s3-request-presigner` README](https://github.com/aws/aws-sdk-js-v3/tree/main/packages/s3-request-presigner).
18. AWS SDK for JavaScript v3, [`supplemental-docs/CLIENTS.md`](https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/CLIENTS.md), S3 section (`requestChecksumCalculation`, `responseChecksumValidation`, Node request handler).
19. AWS, [SDK Reference — Data Integrity Protections for Amazon S3](https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html).
20. AWS, [S3 API Reference — GetObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html).
21. AWS, [S3 API Reference — PutObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html).
22. AWS, [S3 User Guide — Download and upload objects with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).
23. AWS, [S3 User Guide — Checking object integrity](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html).
24. MinIO, [AIStor — S3 API Compatibility](https://docs.min.io/aistor/developers/s3-api-compatibility/).
25. MinIO, [JavaScript SDK — API reference](https://github.com/minio/minio-js/blob/master/docs/API.md), presigned operations and `respHeaders`.
26. MinIO, [AIStor — Deploy as a container](https://docs.min.io/aistor/installation/container/install/).
27. MinIO, [AIStor — Core settings](https://docs.min.io/aistor/reference/aistor-server/settings/core/), `MINIO_DOMAIN` and virtual-hosted style.
28. MinIO, [AIStor — `mc cors`](https://docs.min.io/aistor/reference/cli/mc-cors/).
29. LocalStack, [S3 documentation](https://docs.localstack.cloud/user-guide/aws/s3/), signature validation and path-style sections.
30. Adobe, [S3Mock README](https://github.com/adobe/S3Mock).
31. MDN, [`<a>` — `download` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a#download), updated 2026-10-28.
32. OWASP, [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
33. npm, [`@aws-sdk/client-s3` package metadata](https://registry.npmjs.org/@aws-sdk/client-s3/latest), version 3.1161.0, `engines.node >= 20.0.0`.
34. npm, [`@aws-sdk/s3-request-presigner` package metadata](https://registry.npmjs.org/@aws-sdk/s3-request-presigner/latest), version 3.1161.0.

## Repository references

- `docs/adr/0005-s3-compatible-document-storage.md` — private external S3-compatible storage decision.
- `docs/specs/non-functional.md` — authorization, retention, encryption, logging, and environment rules.
- `docs/specs/api/openapi.yaml` — operations `replaceMyNursingLicense`, `replaceMyTbTestResult`, `getCredentialDownload`, `createInspectorExport`; schemas `DownloadLink`, `DocumentMetadata`, `InspectorExport`, `AuditAction`.
- `docs/specs/domain.md` — Credential, Inspector Export, and Audit Log rules.
- `docs/specs/permissions.md` — Nurse/Manager/Admin document access and Facility isolation.
- `docs/specs/analytics.md` — allowed PostHog events and prohibited document/URL data.
- `docs/specs/workflows.md` — credential upload/replacement and Inspector Export flows.
- `docs/specs/frontend.md` — authorized download and export UI behavior.
- `shifters-be/package.json`, `shifters-be/AGENTS.md`, `shifters-be/tsconfig.json`, `shifters-be/.nvmrc` — NestJS 12, TypeScript 6, ESM, pnpm, Node version, and test/build commands.
- `shifters-fe/package.json` — Vite + React 19, JavaScript today, TypeScript planned.
