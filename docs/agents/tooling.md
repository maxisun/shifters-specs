# Toolchain

What a working copy of this repository has, and how to run the checks CI runs.

- **Node 24 and npm 11.** There is no root `package.json`. Scripts are plain ESM
  run with `node scripts/<name>.mjs`.
- **No `gh` and no `go` on a default machine.** Inspect releases and workflow
  runs through the REST API with `curl`, for example:

  ```sh
  curl -s https://api.github.com/repos/maxisun/shifters-specs/releases \
    | jq -r '.[] | "\(.tag_name) draft=\(.draft) \([.assets[].name] | join(","))"'
  ```

- **oasdiff is not installed.** Download the release binary for your platform at
  the version pinned in `docs/specs/api/RELEASING.md`:

  ```sh
  # VERSION from RELEASING.md; darwin_all also covers Apple silicon
  curl -fsSL -o /tmp/oasdiff.tar.gz \
    "https://github.com/oasdiff/oasdiff/releases/download/v<VERSION>/oasdiff_<VERSION>_darwin_all.tar.gz"
  tar -xzf /tmp/oasdiff.tar.gz -C /tmp
  /tmp/oasdiff --version
  ```

  On Linux use `linux_amd64` in place of `darwin_all`.

- **Redocly and actionlint are not installed.** `.github/workflows/contract-validate.yml`
  holds the exact pinned commands; copy a step's `run` block to reproduce it
  locally.

Pinned versions belong to `docs/specs/api/RELEASING.md` and the workflows. This
page records only what is absent and how to work around it.
