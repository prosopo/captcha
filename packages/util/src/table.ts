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
    Object.entries(item).forEach(([key, value]) => {
        itemRow[key] = value?.slice ? value.slice(0, maxCellWidth) : value
        remaining[key] = value?.slice ? value.slice(maxCellWidth) : value
    })

    return [itemRow, ...wrapItemToMultipleRows(remaining, maxCellWidth)]
}

export function consoleTableWithWrapping(data: { [key: string]: string }[], maxColWidth = 90) {
    const tableItems = data.reduce<{ [key: string]: string }[]>((prev, item) => {
        return [...prev, ...wrapItemToMultipleRows(item, maxColWidth)]
    }, [])

    console.table(tableItems)
}
