// @ts-nocheck

// load JSON file in REPO_DIR/packages/common/src/locales/en.json

// for each combined key in the JSON file, check if it is used in any .ts, .tsx, .js, .jsx files in REPO_DIR, excluding node_modules
// if it is not used, print a message to the console

// the JSON file has the structure of:
// {
//   "SECTION1": {
//     "KEY1": "value1",
//     "KEY2": "value2"
//   },
//   "SECTION2": {
//     "KEY3": "value3",
//     "KEY4": "value4"
//   }

// keys are accessed by the code as `SECTION1.KEY1`, `SECTION1.KEY2`, `SECTION2.KEY3`, `SECTION2.KEY4`
import json from "./packages/common/src/locales/en.json" assert { type: "json" };
import fs from "node:fs";
import fg from 'fast-glob';
import {getRootDir} from "@prosopo/config";

const REPO_DIR = "/home/chris/dev/prosopo/captcha-private/captcha"

const findUsedKeys = (jsonPath: string, projectPath: string, usedKeys:string[]=[]) => {

    const keys = Object.keys(json).reduce((acc, section) => {
        // ignore keys that are not objects
        if (typeof json[section] !== 'object') return acc;
        const sectionKeys = Object.keys(json[section]).map(key => `${section}.${key}` as string);
        // @ts-ignore
        return acc.concat(sectionKeys);
    }, []);

    console.log("projectPath", projectPath)
    const searchPaths = [
        "**/*.ts",
        "**/*.tsx",
        "**/*.js",
        "**/*.jsx",
    ];

    const currentPath = getRootDir();

    const files = fg
        .sync(searchPaths, {
            cwd: currentPath,
            absolute: true,
            ignore: [
                "**/node_modules/**",
                "**/cargo-cache/**",
                "**/dist/**",
                "**/target/**",
                "**/coverage/**",
                "**/vite.cjs.config.ts.timestamp*",
                "**/js_bundles_host_temp/**",
                "**/client-bundle-example/src/assets/**",
                "**/next-env.d.ts/**",
            ],
        })
        .filter((file) => fs.lstatSync(file).isFile());

    for (const file of files) {
        console.log(file)
        if (file === 'node_modules') return;
        const filePath = file;
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            usedKeys = findUsedKeys(jsonPath, filePath, usedKeys);
        } else {
            const content = fs.readFileSync(filePath, 'utf8');

            for(const key of keys) {
                if(usedKeys.includes(key)) continue;
                if (content.indexOf(key) !== -1) {
                    usedKeys.push(key);
                }
            };
        }
    };
    return usedKeys
}

const removeUnusedKeys = (jsonPath: string, projectPath: string) => {
    const usedKeys = findUsedKeys(json, '/home/dev/chris/prosopo/captcha-private/captcha');

    const unusedKeys = Object.keys(json).reduce((acc, section) => {
        if (typeof json[section] !== 'object') return acc;
        const sectionKeys = Object.keys(json[section]).map(key => `${section}.${key}` as string);
        return acc.concat(sectionKeys);
    }, []).filter(key => !usedKeys.includes(key));

    console.info("Unused keys:", Array.from(new Set(unusedKeys)))

    // for each of en.json, es.json, and pt.json, load the files, remove the unused keys, and write the files back
    // to the same location
    for (const lang of ['en', 'es', 'pt']) {
        const langJsonPath = jsonPath.replace('en', lang);
        const langJson = JSON.parse(fs.readFileSync(langJsonPath, 'utf8'));
        for (const key of unusedKeys) {
            const [section, keyName] = key.split('.');
            delete langJson[section][keyName];
        }
        fs.writeFileSync(langJsonPath, JSON.stringify(langJson, null, 2));
    }
}

removeUnusedKeys(`${REPO_DIR}/packages/common/src/locales/en.json`, REPO_DIR)

