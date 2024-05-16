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
import * as z from 'zod'
import { InputOutputArgsSchema as InputOutputArgsSchema, InputOutputCliCommand } from '../utils/inputOutput.js'
import { LabelledDataSchema, LabelledItem } from '@prosopo/types'
import { ProsopoDatasetError } from '@prosopo/common'
import { lodash } from '@prosopo/util/lodash'
import fs from 'fs'

export const ArgsSchema = InputOutputArgsSchema.extend({})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>

export class Labels extends InputOutputCliCommand<ArgsSchemaType> {
    public override getArgSchema() {
        return ArgsSchema
    }

    public override getOptions() {
        return lodash().merge(super.getOptions(), {
            input: {
                description: 'JSON file containing labelled data',
            },
            output: {
                description: 'Where to put the JSON file containing labels',
            },
        })
    }

    public override async _run(args: Args) {
        await super._run(args)

        const file = args.input
        if (!fs.existsSync(file)) {
            throw new ProsopoDatasetError(new Error(`file does not exist: ${file}`), {
                translationKey: 'FS.FILE_NOT_FOUND',
            })
        }

        const labelled: LabelledItem[] = file
            ? LabelledDataSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8'))).items
            : []

        const labels = new Set<string>()
        for (const item of labelled) {
            labels.add(item.label)
        }
        const labelArray = Array.from(labels)
        labelArray.sort()

        fs.mkdirSync(args.output.split('/').slice(0, -1).join('/'), { recursive: true })
        fs.writeFileSync(args.output, JSON.stringify({ labels: labelArray }, null, 4))
    }

    public override getDescription(): string {
        return 'get all labels from some data'
    }
}
