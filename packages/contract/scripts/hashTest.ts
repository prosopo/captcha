import {hashDataset} from "../src/captcha";
import {Captcha} from "../src/types/captcha";

const captchaData = [
    {
        "captchaId": "1",
        "salt": "0x01",
        "format": {
            "solution": [],
            "images": [
                {"path": "/home/chris/dev/prosopo/data/img/01.01.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.02.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.03.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.04.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.05.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.06.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.07.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.08.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.09.jpeg"}
            ],
            "target": "bus"
        },
    },
    {
        "captchaId": "2",
        "salt": "0x01",
        "format": {
            "solution": [],
            "images": [
                {"path": "/home/chris/dev/prosopo/data/img/01.01.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.02.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.03.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.04.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.05.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.06.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.07.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.08.jpeg"},
                {"path": "/home/chris/dev/prosopo/data/img/01.09.jpeg"}
            ],
            "target": "train"
        },
    } ,
];

console.log(captchaData);
const dataSetHash =
    hashDataset(captchaData as Captcha[]);
console.log(dataSetHash);