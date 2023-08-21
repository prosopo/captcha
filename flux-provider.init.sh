sleep 5
node provider_cli_bundle.main.bundle.js provider_register --url http://localhost:9229 --fee 0 --payee Provider # Check whether registered first
node provider_cli_bundle.main.bundle.js provider_set_data_set --file ./128_target_generated.json
# Need to add stake as well
exec node provider_cli_bundle.main.bundle.js --api
