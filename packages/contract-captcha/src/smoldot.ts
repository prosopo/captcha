import { startFromWorker } from 'polkadot-api/smoldot/from-worker'
import SmWorker from 'polkadot-api/smoldot/worker?worker'

// Starting smoldot on a Worker (strongly recommended)
export const smoldot = startFromWorker(new SmWorker())

// Alternatively, we could have smoldot running on the main-thread, e.g:
// import { start } from "polkadot-api/smoldot"
// export const smoldot = start()
