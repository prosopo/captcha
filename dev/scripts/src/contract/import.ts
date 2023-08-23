// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import { ExecOutput, exec } from '../util/index.js'

async function importContract(relPathToABIs: string, relPathToOutput: string): Promise<ExecOutput> {
    //TODO import typechain when it's working https://github.com/Brushfam/typechain-polkadot/issues/73
    const cmd = `npx @727-ventures/typechain-polkadot --in ${relPathToABIs} --out ${relPathToOutput}`
    return exec(cmd)
}

export default importContract
