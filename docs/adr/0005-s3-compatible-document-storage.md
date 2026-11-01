# Private external S3-compatible document storage

Credential documents and generated Inspector Exports use external private S3-compatible object storage instead of PostgreSQL or public file hosting. The backend authorizes every access and issues either an authorized stream or a short-lived signed URL.

## Provider

**Cloudflare R2** hosts the deployed bucket; **MinIO** runs in the local compose stack through the same S3 client. The provider was previously deferred and is now settled.

R2 was chosen because its free allowance does not expire (10 GB-month of storage with generous monthly operation limits), egress is not metered, buckets are private unless public access is explicitly enabled, and it implements the S3 API including presigned URLs — the only surface the backend needs.

## Constraints

- Storage is reached only through the S3 API and a narrow adapter — `put`, `get`, `presignGet`, `delete`. No R2-specific API, Workers binding, or custom domain.
- The frontend holds no storage credentials and never talks to storage. Uploads are backend-proxied multipart; downloads are backend-issued links.
- Credential download links expire within 300 seconds; Inspector Export links within 900 seconds. A presigned URL is a bearer token and is never logged, audited, or sent to analytics.
- Object keys are opaque, server-generated, and immutable. Replacing a Credential writes a new key and leaves the prior object in place; there is no S3 versioning to fall back on.
- Buckets stay private: no `r2.dev` access, no public custom domain, no ACLs, no object tags, no Object Lock, and no lifecycle rule that deletes Credentials or Exports.
- R2 documents CRC-32 as composite-only while the AWS SDK defaults to a full-object CRC32, so the SDK checksum options are set to `WHEN_REQUIRED`.

Rationale, limits, and sources: [R2 integration research](../research/r2-integration.md).
