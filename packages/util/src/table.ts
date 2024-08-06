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
// https://stackoverflow.com/a/75872362/1178971
function wrapItemToMultipleRows(item: { [key: string]: string }, maxCellWidth: number): { [key: string]: string }[] {
    const isRemainingData = Object.values(item).find((value) => {
        return value && value.length > 0
    })

    if (!isRemainingData) {
        return []
    }

    const itemRow: { [key: string]: string } = {}
    const remaining: { [key: string]: string } = {}

    for(const [key, value] of Object.entries(item)) {
        itemRow[key] = value?.slice ? value.slice(0, maxCellWidth) : value
        remaining[key] = value?.slice ? value.slice(maxCellWidth) : value
    }

    return [itemRow, ...wrapItemToMultipleRows(remaining, maxCellWidth)]
}

export function consoleTableWithWrapping(data: { [key: string]: string }[], maxColWidth = 90) {
    const tableItems = data.reduce<{ [key: string]: string }[]>((prev, item) => {
        // biome-ignore lint/performance/noAccumulatingSpread: TODO fix
        return [...prev, ...wrapItemToMultipleRows(item, maxColWidth)]
    }, [])

    console.table(tableItems)
}
