import {expect} from "chai";
import {CaptchaTypes, Dataset} from "../src/types/captcha";
import {addHashesToDataset} from "../src/captcha";
import {CaptchaMerkleTree} from "../src/merkle";


const DATASET = {
    "format": "SelectAll" as CaptchaTypes,
    "captchas": [
        {
            "solution": [],
            "salt": "0x01",
            "target": "bus",
            "items": [
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},

            ]
        },
        {
            "salt": "0x02",
            "target": "train",
            "items": [
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
                {"type": "text", "text": "blah"},
            ]
        }]
};


describe("PROVIDER CAPTCHA", () => {
    after(() => {
        return
    });

    it("Captcha data set is hashed correctly", async () => {
        const tree = new CaptchaMerkleTree();
        await tree.build(DATASET['captchas']);
        const dataset = addHashesToDataset(DATASET, tree);
        expect(dataset.captchas[0]['captchaId']).equal("0x83f378619ef1d3cced90ad760b33d24995e81583b4cd269358fa53b690d560b5");
        expect(dataset.captchas[1]['captchaId']).equal("0x0977061f4bca26f49f2657b582944ce7c549862a4be7e0fc8f9a9a6cdb788475");
    });

    it("Empty dataset and tree throws error", async () => {
        expect(function () {
            addHashesToDataset({} as Dataset, new CaptchaMerkleTree())
        }).to.throw(/error hashing dataset/);
    })

})