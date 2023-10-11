import { Flatten } from '../commands/flatten.js'
import { fsEq } from '../utils/utils.js'

describe('flatten', () => {
    test('flattens hierarchical data', async () => {
        const input = `${__dirname}/data/hierarchical`
        const output = `${__dirname}/results/flat`
        await new Flatten().parseThenExec([`--input=${input}`, `--output=${output}`])
        // make sure the results are the same as the expected results
        const expected = `${__dirname}/data/flat`
        fsEq(output, expected)
    })
})
