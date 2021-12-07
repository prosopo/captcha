import {CaptchaMerkleTree} from "../src/merkle";
import {expect} from "chai";
import {hexHash} from "../src/captcha";

describe("PROVIDER MERKLE TREE", () => {
    after(() => {
        return
    });

    async function setup() {
        const dataset = {
            datasetId: "0x01",

            captchas: [
                {
                    salt: "0x01020304",
                    items: [
                        {type: "text", text: "1"},
                        {type: "text", text: "b"},
                        {type: "text", text: "c"}
                    ], target: "letters", solution: [1, 2]
                },
                {
                    salt: "0x02020304",
                    items: [
                        {type: "text", text: "c"},
                        {type: "text", text: "e"},
                        {type: "text", text: "3"}
                    ], target: "letters"
                },
                {
                    salt: "0x03020304",
                    items: [
                        {type: "text", text: "h"},
                        {type: "text", text: "f"},
                        {type: "text", text: "5"}
                    ], target: "letters", solution: [2]
                }

            ],
            format: "SelectAll"
        }
        const tree = new CaptchaMerkleTree()
        await tree.build(dataset['captchas']);
        return tree
    }

    it("Tree contains correct  leaf hashes", async () => {
            const tree = await setup()
            const leafHashes = tree.leaves.map(leaf => leaf.hash);
            expect(leafHashes).to.deep.equal([
                    "0x0712abea4b4307c161ea64227ae1f9400f6844287ec4d574b9facfddbf5f542a",
                    "0x9ce0e95f8a9095c2c336015255d67248ad3344f9d07d95147ca8d661a678ba3f",
                    "0xe08fd047f9591da52974567f36c9c91003e302cb39b6313aeac636142c0d4dce"
                ]
            )
        }
    )
    it("Tree root is correct", async () => {
            const tree = await setup()
            expect(tree.root!.hash).to.equal("0x37c909d29a8f41d53142f4acb317bb9496719825073fb452768a64878f6724f8");
        }
    )
    it("Tree proof works", async () => {
            const tree = await setup()
            const proof = tree.proof("0x0712abea4b4307c161ea64227ae1f9400f6844287ec4d574b9facfddbf5f542a");
            const layerZeroHash = hexHash(proof[0].join());
            expect(tree.layers[1].indexOf(layerZeroHash) > -1);
            const layerOneHash = hexHash(proof[1].join());
            expect(tree.layers[2].indexOf(layerOneHash) > -1);
        }
    )

})