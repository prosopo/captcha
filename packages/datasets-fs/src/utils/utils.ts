import { at } from '@prosopo/util'
import fs from 'fs'

// recursively list files in a directory
export function* fsWalk(pth: string): Generator<string> {
    // if path is a file, return it
    const stat = fs.statSync(pth)
    if (stat.isFile()) {
        yield pth
    }
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
    const files1 = [...it1]
    const files2 = [...it2]
    if (files1.length !== files2.length) {
        return false
    }
    // sort files so in same order
    files1.sort()
    files2.sort()
    // compare contents of each file
    for (let i = 0; i < files1.length; i++) {
        const file1 = at(files1, i)
        const file2 = at(files2, i)
        const content1 = fs.readFileSync(file1)
        const content2 = fs.readFileSync(file2)
        if (!content1.equals(content2)) {
            return false
        }
    }
    return true
}
