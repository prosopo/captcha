#!/bin/bash
DEMO_CONTRACT_ARGS_PROTOCOL_CONTRACT_ADDRESS=$CONTRACT_ADDRESS
tty=$(readlink /proc/$$/fd/2)
DEPLOY_RESULT=$(/usr/src/docker/contracts.deploy.contract.sh \
  --contract-source="$DEMO_CONTRACT_SOURCE" \
  --wasm="$DEMO_CONTRACT_WASM" \
  --constructor="$DEMO_CONTRACT_CONSTRUCTOR" \
  --contract-args="$DEMO_CONTRACT_ARGS_PROTOCOL_CONTRACT_ADDRESS" \
  --endowment="$DEMO_CONTRACT_ENDOWMENT" \
  --endpoint="$SUBSTRATE_ENDPOINT" \
  --port="$SUBSTRATE_PORT" \
  --suri="$DEPLOYER_SURI" \
  --use-salt \
  --build | tee "$tty")
echo "$DEPLOY_RESULT"
DEMO_CONTRACT_ADDRESS=$(echo "$DEPLOY_RESULT" | tail -1)
if [[ $DEMO_CONTRACT_ADDRESS == "Contract failed to deploy" ]]; then
  echo "$DEPLOY_RESULT"
  exit 1
fi
echo "DEMO_CONTRACT_ADDRESS=$DEMO_CONTRACT_ADDRESS" > /usr/src/.env
