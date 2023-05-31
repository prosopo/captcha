# Build
```bash
docker run --rm -it -v $(pwd)/contracts:/contracts paritytech/contracts-ci-linux:latest cargo +nightly contract build --manifest-path=/contracts/Cargo.toml
```

# Deploy (protocol)

```bash
docker compose --file docker-compose.substrate-node.yml up &

docker run --network host --rm -it -v $(pwd)/contracts:/contracts paritytech/contracts-ci-linux:latest cargo contract instantiate "/contracts/target/ink/prosopo.wasm" --args 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 1000000000000 --constructor "default" --suri "//Alice" --value 2000000000000 --url "ws://localhost:9944" --manifest-path "/contracts/Cargo.toml" --verbose
```

# Deploy (demo-nft-marketplace)

```bash
docker run --network host --rm -it -v $(pwd)/contracts:/contracts paritytech/contracts-ci-linux:production cargo contract instantiate "/contracts/target/ink/demo_nft_contract.wasm" --args 5GM1AarMqZQYAnRJFHsk5Dd4XpC9RP5sCaUjsn8GDsL8KXNV --constructor "new" --suri "//Alice" --url "ws://localhost:9944" --manifest-path "/contracts/Cargo.toml" --verbose
```

# TODO
```bash
docker build -t prosopo/protocol:test --file contract.debug-deploy.dockerfile --network=host --no-cache --progress=plain .

docker build -t prosopo/protocol:test --file contract.debug-deploy.dockerfile --network=host --no-cache --progress=plain --build-arg CONTRACT_NAME="prosopo" --build-arg CONTRACT_PATH="protocol/contracts" --build-arg CONTRACT_ARGS="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 1000000000000" .

docker compose --file docker-compose.contract.deploy.yml build --no-cache --progress=plain --build-arg CONTRACT_NAME="protocol" --build-arg CONTRACT_PATH="protocol/contracts"
```
