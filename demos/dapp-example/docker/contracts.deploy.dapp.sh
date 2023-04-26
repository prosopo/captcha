#!/bin/bash
# CONTRACT_ADDRESS must be passed in as an environment variable from the docker run command
echo "Protocol contract address: $CONTRACT_ADDRESS"
tty=$(readlink /proc/$$/fd/2)
DEPLOY_RESULT=$(/usr/src/docker/contracts.deploy.contract.sh \
  --contract-source="$DAPP_CONTRACT_SOURCE" \
  --wasm="$DAPP_CONTRACT_WASM" \
  --constructor="$DAPP_CONTRACT_CONSTRUCTOR" \
  --contract-args="$DAPP_CONTRACT_ARGS_INITIAL_SUPPLY $DAPP_CONTRACT_ARGS_FAUCET_AMOUNT $CONTRACT_ADDRESS $DAPP_CONTRACT_ARGS_HUMAN_THRESHOLD $DAPP_CONTRACT_ARGS_RECENCY_THRESHOLD" \
  --endowment="$DAPP_CONTRACT_ENDOWMENT" \
  --endpoint="$SUBSTRATE_ENDPOINT" \
  --port="$SUBSTRATE_PORT" \
  --suri="$DEPLOYER_SURI" \
  --use-salt \
  --build | tee "$tty")
echo "$DEPLOY_RESULT"
DAPP_CONTRACT_ADDRESS=$(echo "$DEPLOY_RESULT" | tail -1)
if [[ $DAPP_CONTRACT_ADDRESS == "Contract failed to deploy" ]]; then
  echo "$DEPLOY_RESULT"
  exit 1
fi
echo "DAPP_CONTRACT_ADDRESS=$DAPP_CONTRACT_ADDRESS" > /usr/src/.env
