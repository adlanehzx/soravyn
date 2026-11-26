# SORAVYN identity and compatibility

The public brand, the internal @soravyn/* packages, the soravyn CLI, the product documents, the manifests, the logo design and the new configurations use SORAVYN. The repository is not assumed to be published on GitHub or npm; no publication URL is invented.

## Existing installation

New installations use ~/.soravyn. If this directory does not exist but an older instances directory does, the server and the CLI use it without moving or deleting the data. Explicit configuration file paths keep priority. To change directory, back up then move the whole instance offline, including its encryption key; use SORAVYN_HOME to select the new location.

SORAVYN_* variables are canonical. The older OPENSOUL_* and PAPERCLIP_* prefixes are recognized by the compatibility layer; an explicit canonical value always wins, then the OpenSoul prefix takes precedence over Paperclip. Do not configure contradictory values. The development runner keeps the variables it is given.

The existing embedded PostgreSQL database keeps its physical identifiers. The server detects the roles/databases already installed; new installations use soravyn. No live database is renamed and no historical role is deleted. Secrets are not decrypted/re-encrypted for a simple rebrand.

Older correctly signed agent tokens remain accepted with the default issuer/audience settings; an explicit issuer/audience configuration still restricts them. Older tracking headers, gateway parameters and agent process environments are recognized. New clients must use the SORAVYN names; package imports must migrate to @soravyn/*. Older API responses are not guaranteed to be identical for custom external consumers.

## Browser preferences

The public script legacy-storage.js copies the preferences and drafts from the old namespaces to soravyn once in localStorage/sessionStorage. Existing canonical values are preserved and old values are never deleted. No storage content is logged. Authentication cookies are left to the existing mechanism.

## Docker

The Compose files and the new images use SORAVYN. For an already initialized PostgreSQL volume, keep its real credentials with SORAVYN_DB_USER, SORAVYN_DB_PASSWORD, SORAVYN_DB_NAME and DATABASE_URL. POSTGRES_* does not rename the users of an existing volume.

An old application volume must be selected explicitly through SORAVYN_APP_VOLUME (the real Docker name), without creating an empty volume in its place. In the quickstart Compose with a bind mount, SORAVYN_DATA_DIR must point to the existing data. Back up and check the mounts with docker compose config before an upgrade; remove the old services after stopping them to avoid two servers/schedulers on the same database. The internal volume path becomes /soravyn; check the old absolute paths in the configuration file and adapt them if needed before restarting. This Docker deployment migration has not been run on a user volume.

## References that intentionally remain

- LICENSE, THIRD_PARTY_NOTICES.md and the vendor code licenses: mandatory attributions.
- vendor/llm-video-maker: third-party component kept with its original contract.
- ARCHITECTURE.md: provenance audit of the two sources and their commits.
- legacy-compat, legacy-database-compat, legacy-api-compat and legacy-storage: compatibility of data and installations.
- The compatibility tests: old names used as fixtures.
- Paperclip imported from lucide-react: external name of the attachment icon, used locally as AttachmentIcon; it is not a displayed brand.

The upstream clones next to this project are unchanged and are not the distributed application.
