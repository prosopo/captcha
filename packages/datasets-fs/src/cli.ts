import { isMain } from '@prosopo/util'
import type { CliCommandAny } from './cli/cliCommand.js'
import { Flatten } from './commands/flatten.js'
import { GenerateV1 } from './commands/generateV1.js'
import { GenerateV2 } from './commands/generateV2.js'
import { Get } from './commands/get.js'
import { Labels } from './commands/labels.js'
import { Relocate } from './commands/relocate.js'
import { Resize } from './commands/resize.js'
import { Cli } from './index.js'

const main = async () => {
    const commands: CliCommandAny[] = [
        new Flatten(),
        new GenerateV1(),
        new GenerateV2(),
        new Get(),
        new Labels(),
        new Relocate(),
        new Resize(),
    ]
    const cli = new Cli(commands)
    cli.logger.setLogLevel('debug')
    await cli.exec()
}

//if main process
if (isMain(import.meta.url)) {
    main()
        .then(() => {
            process.exit(0)
        })
        .catch((err) => {
            console.log('error', err)
            process.exit(1)
        })
}
