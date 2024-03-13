// generate some dummy data for testing the generate fns

import fs from 'node:fs'
import { CaptchaItemTypes, type Item, type LabelledItem } from '@prosopo/types'

const nLabels = 4
const nLabelledImages = 100
const nUnlabelledImages = 100

const labelledImages: LabelledItem[] = []
const unlabelledImages: Item[] = []

for (let i = 0; i < nLabelledImages; i++) {
    const label = i % nLabels
    labelledImages.push({
        label: label.toString(),
        data: `abc${i}`,
        type: CaptchaItemTypes.Image,
        hash: `abc${i}hash`,
    })
}

for (let i = 0; i < nUnlabelledImages; i++) {
    unlabelledImages.push({
        data: `def${i}`,
        type: CaptchaItemTypes.Image,
        hash: `def${i}hash`,
    })
}

fs.writeFileSync('labelled.json', JSON.stringify(labelledImages))
fs.writeFileSync('unlabelled.json', JSON.stringify(unlabelledImages))
fs.writeFileSync('labels.json', JSON.stringify(Array.from(Array(nLabels).keys()).map((x) => x.toString())))

process.exit(0)
