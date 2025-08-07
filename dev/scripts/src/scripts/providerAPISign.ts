import {getPair} from "@prosopo/keyring";
import {u8aToHex} from "@polkadot/util";
import {loadEnv} from "@prosopo/dotenv";

loadEnv()

const adminPair = getPair(process.env.PROSOPO_ADMIN_SECRET)

console.log(u8aToHex(adminPair.sign(new Date().getTime().toString())))
