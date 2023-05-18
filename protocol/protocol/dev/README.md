# CLI for managing the contract / crates

Commands:
- `build`: build the contracts to /target directory. Unless `--package [pkg_name]` is specified, all contracts will be built. Add `--docker` to run from the parity contracts-ci image. Add `--package [pkg_name]` to target a specific crate/contract.
- `test`: test all crates and contracts. Add `--docker` to run from the parity contracts-ci image. Add `--package [pkg_name]` to target a specific crate/contract.
- `fmt`: format all crates and contracts. Add `--docker` to run from the parity contracts-ci image. Add `--package [pkg_name]` to target a specific crate/contract.
- `clippy`: run clippy on all crates and contracts. Add `--fix` to have clippy auto-fix any issues it detects. Add `--docker` to run from the parity contracts-ci image. Add `--package [pkg_name]` to target a specific crate/contract.
- `chown`: take ownership of the /target and /contracts directories, as running commands in docker mode may have changed them to belong to the root user (this is an issue with parity's contract-ci image - nothing we can do about it right now)

Run the above commands using `npm run cli -- <command> <args>`. E.g. to build the captcha contract in release mode, run
```
npm run cli -- build --package captcha --release
```