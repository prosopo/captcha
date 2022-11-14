import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import { useRef, useState } from 'react'
import Link from '@mui/material/Link'
import { CaptchaEventCallbacks, ProsopoClientConfig } from '@prosopo/procaptcha'
import { Manager, ProcaptchaConfig, ProcaptchaState, ProcaptchaStateUpdater } from '@prosopo/procaptcha'

export interface ProcaptchaProps {
    config: ProsopoClientConfig
    callbacks: CaptchaEventCallbacks
}

const useRefAsState = <T,>(defaultValue): [T, (value: T) => void] => {
    const ref = useRef<T>(defaultValue)
    const setter = (value: T) => {
        ref.current = value
    }
    const value: T = ref.current
    return [value, setter]
}

const useProcaptcha = (): [ProcaptchaState, ProcaptchaStateUpdater] => {
    // useRef == do not render on variable change
    // useState == do render on variable change
    // only need to render on visible variables changing

    const [isHuman, setIsHuman] = useState(false)
    const [index, setIndex] = useState(-1)
    const [solutions, setSolutions] = useState<string[][]>([])
    const [providerUrl, setProviderUrl] = useRefAsState<string>('')
    const [config, setConfig] = useRefAsState<ProcaptchaConfig>({})

    const map = {
        isHuman: setIsHuman,
        index: setIndex,
        solutions: setSolutions,
        providerUrl: setProviderUrl,
        config: setConfig,
    }

    return [
        {
            isHuman,
            index,
            solutions,
            providerUrl,
            config,
        },
        (nextState: Partial<ProcaptchaState>) => {
            if (nextState.solutions) {
                // force a copy of the array to ensure a re-render
                // nutshell: react doesn't look inside an array for changes, hence changes to the array need to result in a fresh array
                nextState.solutions = nextState.solutions.slice()
            }

            for (const key in nextState) {
                const setter = map[key]
                if (!setter) {
                    throw new Error(`Unknown key ${key}, cannot set state`)
                }
                setter(nextState[key])
            }
        },
    ]

    // const state = {
    //     isHuman,
    // }
    // Object.defineProperty(state, 'isHuman', {
    //     get: () => isHuman,
    //     set: (value) => {
    //         console.log('setting ishuman in obj def')
    //         isHuman = value
    //         setIsHuman(value)
    //     },
    // })
    // return state

    // class State {
    //     get isHuman() {
    //         return isHuman
    //     }

    //     set isHuman(value) {
    //         console.log('setting ishuman in class')
    //         isHuman = value
    //         setIsHuman(value)
    //     }
    // }

    // const state = new State()

    // Object.defineProperty(state, 'isHuman', {
    //     enumerable: true,
    //     writable: true,
    //     // get: () => isHuman,
    //     // set: (value) => {
    //     //     console.log('setting ishuman in obj def')
    //     //     isHuman = value
    //     //     setIsHuman(value)
    //     // },
    // })

    // return state

    // class State {

    //     isHuman: boolean

    //     constructor() {
    //         this.isHuman = isHuman
    //         Object.defineProperty(this, 'isHuman', {
    //             enumerable: true,
    //             get: () => isHuman,
    //             set: (value) => {
    //                 console.log('setting ishuman in obj def')
    //                 isHuman = value
    //                 setIsHuman(value)
    //             },
    //         })
    //     }

    //     // get index() {
    //     //     return index
    //     // }

    //     // set index(value) {
    //     //     index = value
    //     //     setIndex(value)
    //     // }

    //     // get solutions() {
    //     //     return solutions
    //     // }

    //     // set solutions(value) {
    //     //     solutions = value
    //     //     setSolutions(value)
    //     // }

    //     // get providerUrl() {
    //     //     return providerUrl
    //     // }

    //     // set providerUrl(value) {
    //     //     providerUrl = value
    //     //     setProviderUrl(value)
    //     // }
    // }

    // return new State()
}

export const Procaptcha = (props: ProcaptchaProps) => {
    const callbacks = props.callbacks
    const config = props.config

    // // check all expected props are present
    // // TODO validate account can be found in the polk js extension
    // // TODO validate other props

    // const [ticked, setTicked] = useState(false)
    // const [showCaptcha, setShowCaptcha] = useState(false)
    // const [preApproveChecked, setPreApproveChecked] = useState(false)

    // const [state, updateState] = useReducer(captchaContextReducer, { config })
    // const client = new ProsopoCaptchaClient(
    //     { state: state, update: updateState },
    //     {
    //         onHuman: (solvedData: SolvedData) => {
    //             callbacks.onHuman?.(solvedData)
    //             setTicked(solvedData.human)
    //             setShowCaptcha(false)
    //         },
    //         onCancel: () => {
    //             callbacks.onCancel?.()
    //             setShowCaptcha(false)
    //             setTicked(false)
    //         },
    //         onLoadCaptcha: (captchaChallenge: GetCaptchaResponse | Error) => {
    //             callbacks.onLoadCaptcha?.(captchaChallenge)
    //         },
    //         onSubmit: (result: TCaptchaSubmitResult | Error, captchaState: ICaptchaState) => {
    //             callbacks.onSubmit?.(result, captchaState)
    //             setShowCaptcha(false)
    //         },
    //         onChange: (captchaSolution: string[][], index: number) => {
    //             callbacks.onChange?.(captchaSolution, index)
    //         },
    //     }
    // )

    // console.log(client)
    // console.log({
    //     ticked,
    //     showCaptcha,
    //     preApproveChecked,
    // })

    // useEffect(() => {
    //     console.log(props)
    //     console.log('Procaptcha: checking whether user is already approved')
    //     client
    //         .onLoad(async () => {
    //             // only called if human, i.e. preapproved
    //             console.log('preapproved')
    //             setShowCaptcha(false)
    //             setTicked(true)
    //             // props.onPreApproved?.();
    //         }, config.web2)
    //         .then(() => {
    //             console.log('on load finished')
    //             // onLoad() completed, preapprove checks complete
    //             setPreApproveChecked(true)
    //         })
    // }, [])

    // const onTick = () => {
    //     if (ticked) {
    //         // already approved, so do nothing
    //         alert('You are already human')
    //     } else {
    //         if (!preApproveChecked) {
    //             // still waiting on preapprove checks, do nothing
    //             console.log('cannot trigger challenge, waiting for preapprove checks to complete')
    //         } else {
    //             // preapprove checks complete, not preapproved, so trigger captcha
    //             setShowCaptcha(true)
    //         }
    //     }
    // }

    const [state, updateState] = useProcaptcha()
    const manager = Manager(state, updateState, {})
    const onTick = () => {
        console.log('onTick')
        manager.start({
            address: '5EXaAvaSP1T4BMeHdtF2AudXq7ooRo6jHwi6HywenfSkedNa',
            web2: false,
            dappName: 'Prosopo',
            dappUrl: 'https://localhost:9944',
            defaultEnvironment: 'development',
            networks: {
                development: {
                    endpoint: process.env.REACT_APP_SUBSTRATE_ENDPOINT || '',
                    prosopoContract: {
                        address: process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS || '',
                        name: 'prosopo',
                    },
                    dappContract: {
                        address: process.env.REACT_APP_DAPP_CONTRACT_ADDRESS || '',
                        name: 'dapp',
                    },
                },
            },
        })
    }
    const ticked = false

    return (
        <Box sx={{ maxWidth: '100%', maxHeight: '100%', overflowX: 'auto' }}>
            {/* <CaptchaComponent clientInterface={client} show={showCaptcha} /> */}

            <Box p={1} sx={{ maxWidth: '600px', minWidth: '200px' }}>
                <Box
                    p={1}
                    border={1}
                    borderColor="grey.300"
                    borderRadius={2}
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                            }}
                        >
                            <Box>
                                <Checkbox
                                    onChange={onTick}
                                    checked={ticked}
                                    inputProps={{ 'aria-label': 'controlled' }}
                                    sx={{ '& .MuiSvgIcon-root': { fontSize: 32 } }}
                                />
                            </Box>
                            <Box p={1}>
                                <Typography>I am a human</Typography>
                            </Box>
                        </Box>
                        {/* <Box p={1}>
                            <Link href="https://prosopo.io/#how-it-works" target="_blank">Why must I prove I am human?</Link>
                        </Box> */}
                    </Box>
                    <Box p={1} sx={{ flexGrow: '1', maxWidth: '140px', minWidth: '140px' }}>
                        <Link href="https://prosopo.io" target="_blank">
                            <Box>
                                <div
                                    style={{ width: '100%', display: 'flex', alignItems: 'middle' }}
                                    dangerouslySetInnerHTML={{ __html: logo }}
                                ></div>
                            </Box>
                        </Link>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}

const logo =
    '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2062.63 468.67"><defs><style>.cls-1{fill:#1d1d1b;}</style></defs><title>Prosopo Logo Black</title><path class="cls-1" d="M335.55,1825.19A147.75,147.75,0,0,1,483.3,1972.94h50.5c0-109.49-88.76-198.25-198.25-198.25v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M269.36,1891.39A147.74,147.74,0,0,1,417.1,2039.13h50.5c0-109.49-88.75-198.24-198.24-198.24v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M414,2157.17a147.75,147.75,0,0,1-147.74-147.74h-50.5c0,109.49,88.75,198.24,198.24,198.24v-50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M480.17,2091a147.74,147.74,0,0,1-147.74-147.75H281.92c0,109.49,88.76,198.25,198.25,198.25V2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M862.8,2017.5q-27.39,22.86-78.25,22.86h-65v112.19H654.82v-312h134q46.32,0,73.86,24.13t27.55,74.72Q890.2,1994.64,862.8,2017.5ZM813,1905.1q-12.37-10.36-34.7-10.38H719.59v91.87h58.75q22.32,0,34.7-11.22t12.39-35.56Q825.43,1915.48,813,1905.1Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1045.69,1916.42c.78.08,2.51.19,5.19.32v61.81c-3.81-.42-7.2-.71-10.16-.85s-5.36-.21-7.2-.21q-36.4,0-48.89,23.71-7,13.33-7,41.06v110.29H916.89V1921.82h57.58V1962q14-23.07,24.34-31.54,16.94-14.18,44-14.18C1044,1916.32,1044.92,1916.35,1045.69,1916.42Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1265.64,2124.32q-29.21,36.06-88.69,36.06t-88.69-36.06Q1059,2088.26,1059,2037.5q0-49.9,29.22-86.5t88.69-36.59q59.47,0,88.69,36.59t29.21,86.5Q1294.85,2088.26,1265.64,2124.32ZM1217.38,2091q14.17-18.81,14.18-53.48t-14.18-53.37q-14.19-18.7-40.64-18.71T1136,1984.13q-14.29,18.72-14.29,53.37T1136,2091q14.28,18.81,40.75,18.81T1217.38,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1371.81,2078.88q1.92,16.1,8.29,22.87,11.28,12.06,41.7,12.06,17.85,0,28.39-5.29t10.53-15.88a17.12,17.12,0,0,0-8.48-15.45q-8.49-5.28-63.12-18.2-39.33-9.73-55.41-24.35-16.08-14.39-16.09-41.49,0-32,25.14-54.93t70.75-23q43.26,0,70.53,17.25t31.29,59.59H1455q-1.27-11.64-6.58-18.42-10-12.27-34-12.28-19.74,0-28.13,6.14t-8.38,14.4c0,6.91,3,11.93,8.92,15q8.89,4.89,63,16.73,36,8.46,54.05,25.61,17.77,17.35,17.78,43.39,0,34.3-25.56,56t-79,21.7q-54.51,0-80.49-23t-26-58.53Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1745.54,2124.32q-29.22,36.06-88.7,36.06t-88.69-36.06q-29.2-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.7,36.59t29.21,86.5Q1774.75,2088.26,1745.54,2124.32ZM1697.27,2091q14.19-18.81,14.19-53.48t-14.19-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.28,53.37t14.28,53.48q14.3,18.81,40.75,18.81T1697.27,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1992.75,1946.59q28.24,29.84,28.23,87.63,0,61-27.58,92.93t-71.06,32q-27.69,0-46-13.76-10-7.62-19.6-22.23v120.24H1797V1921.82h57.79v34.08q9.79-15,20.88-23.71,20.23-15.43,48.15-15.45Q1964.53,1916.74,1992.75,1946.59Zm-46.3,43.39q-12.3-20.52-39.88-20.53-33.15,0-45.54,31.11-6.43,16.51-6.42,41.92,0,40.21,21.58,56.51,12.82,9.53,30.37,9.53,25.45,0,38.83-19.48t13.36-51.86Q1958.75,2010.51,1946.45,1990Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M2249.14,2124.32q-29.2,36.06-88.69,36.06t-88.69-36.06q-29.22-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.69,36.59t29.22,86.5Q2278.36,2088.26,2249.14,2124.32ZM2200.88,2091q14.19-18.81,14.18-53.48t-14.18-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.29,53.37t14.29,53.48q14.3,18.81,40.75,18.81T2200.88,2091Z" transform="translate(-215.73 -1774.69)"/></svg>'
