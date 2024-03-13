// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// generate some dummy data for testing the generate fns

import { CaptchaItemTypes, Item, LabelledItem } from '@prosopo/types'
import fs from 'fs'

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
