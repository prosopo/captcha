// Take a set of data and generate a bunch of captchas

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import generate from "./generate/cli";
import flatten from "./flatten/cli";

const main = async () => {
    const args = await yargs(hideBin(process.argv))
        .help()
        .command(generate)
        .command(flatten)
        .demandCommand()
        .fail(false)
        .parse()
}

main().then(() => {
    console.log("done");
    process.exit(0);
}).catch((err) => {
    console.error("error:", err);
    process.exit(1);
})