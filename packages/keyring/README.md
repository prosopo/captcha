This is a selective clone
of [keyring](https://github.com/polkadot-js/common/tree/25fe5f4e27d6dfe0a26082925a49207f2bfcd9fd/packages/keyring)
from the Polkadot JS repository at `25fe5f4e27d6dfe0a26082925a49207f2bfcd9fd`. Modifications have been made as follows:

- tests switched to vitest
- package name changed to @prosopo/util-crypto
- WASM dropped and replaced with JS implementation of sr25519 from @scure/sr25519
- other account types (`ecdsa`, `ed25519`, `ethereum`) dropped
