import fs from 'fs'

// load JSON file
const substrateTypes = JSON.parse(
    fs.readFileSync(
        '/home/chris/dev/prosopo/captcha/node_modules/@polkadot/types-support/metadata/v15/substrate-types.json',
        'utf8'
    )
)

//extract pallet_contracts_primitives
const pallet_contracts_primitives = substrateTypes.filter(
    (type: any) => type.type.path.includes('pallet_contracts_primitives') || type.type.path.includes('pallet_contracts')
)

// write to file
fs.writeFileSync(
    '/home/chris/dev/prosopo/captcha/dev/scripts/src/scripts/pallet_contracts_primitives.json',
    JSON.stringify(pallet_contracts_primitives, null, 4)
)
