# Private external S3-compatible document storage

Credential documents and generated Inspector Exports use external private S3-compatible object storage instead of PostgreSQL or public file hosting. The backend authorizes every access and uses authorized streaming or short-lived signed URLs; the storage vendor and local-development emulation remain implementation choices.
