import {blake2AsHex} from "@polkadot/util-crypto";

function main() {
    console.log(process.argv.slice(2)[0]);
    console.log(blake2AsHex(process.argv.slice(2)[0]));
}

main()