import { fetchTags } from "./dockerTags.js";


const main = async () => {
    // get args
    const args = process.argv.slice(2);
    const tags = await fetchTags(String(args[0]), String(args[1]))
    console.log(tags)
}


main()
