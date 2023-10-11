import { DataSchema } from '@prosopo/types'
import { at } from '@prosopo/util'
import fs from 'fs'

// recursively list files in a directory
export function* fsWalk(pth: string): Generator<string> {
    yield pth
    const stat = fs.statSync(pth)
    // if path is a directory, recurse
    if (stat.isDirectory()) {
        const files = fs.readdirSync(pth)
        for (const file of files) {
            const subpath = `${pth}/${file}`
            yield* fsWalk(subpath)
        }
    }
}

// test whether two files/dirs are equal, recursively comparing contents as required
export const fsEq = (pth1: string, pth2: string) => {
    const it1 = fsWalk(pth1)
    const it2 = fsWalk(pth2)
    // drop the root path
    const files1 = [...it1].map((f) => f.slice(pth1.length))
    const files2 = [...it2].map((f) => f.slice(pth2.length))
    if (files1.length !== files2.length) {
        return false
    }
    // sort files so in same order
    files1.sort()
    files2.sort()
    if (!files1.every((f, i) => f === files2[i])) {
        // the two lists of files are not the same
        return false
    }
    // compare contents of each file
    for (let i = 0; i < files1.length; i++) {
        const file1 = at(files1, i)
        const file2 = at(files2, i)
        const stat1 = fs.statSync(file1)
        if (stat1.isDirectory()) {
            // already checked above
            continue
        }
        // files, so compare contents
        const content1 = fs.readFileSync(file1)
        const content2 = fs.readFileSync(file2)
        if (!content1.equals(content2)) {
            return false
        }
    }
    return true
}

export const readDataJson = (pth: string) => {
    let content = fs.readFileSync(pth).toString()
    // TODO use getPaths() here to find the repo dir
    content = content.replace('${repo}', __dirname + '/../../../..')
    const dataJson = JSON.parse(content.toString())
    const data = DataSchema.parse(dataJson)
    return data
}
