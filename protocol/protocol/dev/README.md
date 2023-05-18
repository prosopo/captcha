# CLI for managing the contract / crates

Commands:
- `build`: build the contracts to /target directory. Unless `--package [pkg_name]` is specified, all contracts will be built. Add `--docker` to run from the parity contracts-ci image.
- `test`: test all crates and contracts. Add `--docker` to run from the parity contracts-ci image.
- `fmt`: format all crates and contracts. Add `--docker` to run from the parity contracts-ci image.
- `clippy`: run clippy on all crates and contracts. Add `--fix` to have clippy auto-fix any issues it detects. Add `--docker` to run from the parity contracts-ci image.
- `chown`: take ownership of the /target and /contracts directories, as running commands in docker mode may have changed them to belong to the root user (this is an issue with parity's contract-ci image - nothing we can do about it right now)
- `metadata`: generate the metadata for a contract. Sometimes `cargo` gets stuck on this, so it's helpful to be able to run it directly to observe the error.
