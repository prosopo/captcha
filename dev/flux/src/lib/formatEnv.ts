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
import fs from 'fs'
import path from 'path'

/** Convert an env file to an array of quoted strings
For example an env file like this:
```
    FOO=bar
    BAZ={"something": "else"}
```
would become an array of quoted strings like this:
```
    ["FOO=bar"'","BAZ={\"something\": \"else\"}"]
```
*/

export const formatEnvToArray = (envPath: string) => {
    const envFile = path.resolve(envPath)
    const env = fs.readFileSync(envFile, 'utf8')
    return `[${env
        .split('\n')
        .filter(Boolean)
        .map((line) => {
            const [key, ...value] = line.split('=')
            if (!value[0]) return `"${key}="`
            return `"${key}=${value[0].replace(/"/g, '\\"')}"`
        })
        .join(',')}]`
}
