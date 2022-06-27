#!/bin/bash
tty=$(readlink /proc/$$/fd/2)
DEPLOY_RESULT=$(/usr/src/docker/contracts.deploy.contract.sh \
  --contract-source="$PROTOCOL_CONTRACT_SOURCE" \
  --wasm="$PROTOCOL_CONTRACT_WASM" \
  --constructor="$PROTOCOL_CONTRACT_CONSTRUCTOR" \
  --contract-args="$PROTOCOL_CONTRACT_ARGS_OWNER $PROTOCOL_CONTRACT_ARGS_PROVIDER_STAKE_DEFAULT" \
  --endowment="$PROTOCOL_CONTRACT_ENDOWMENT" \
  --endpoint="$SUBSTRATE_ENDPOINT" \
  --port="$SUBSTRATE_PORT" \
  --suri="$DEPLOYER_SURI" \
  --use-salt \
  --build | tee "$tty")
echo "$DEPLOY_RESULT"
CONTRACT_ADDRESS=$(echo "$DEPLOY_RESULT" | tail -1)
if [[ $CONTRACT_ADDRESS == "Contract failed to deploy" ]]; then
  echo "$DEPLOY_RESULT"
  exit 1
fi
echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" > /usr/src/.env
