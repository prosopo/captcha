import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import { useRef, useState } from 'react'
import Link from '@mui/material/Link'
import {
    Account,
    GetCaptchaResponse,
    ProcaptchaCallbacks,
    ProsopoCaptchaApi,
    TCaptchaSubmitResult,
} from '@prosopo/procaptcha'
import { Manager, ProcaptchaConfigOptional, ProcaptchaState, ProcaptchaStateUpdateFn } from '@prosopo/procaptcha'
import { Alert, Backdrop, CircularProgress } from '@mui/material'
import CaptchaComponent from './CaptchaComponent'

/**
 * The props for the Procaptcha component.
 */
export interface ProcaptchaProps {
    // the configuration for procaptcha
    config: ProcaptchaConfigOptional
    // optional set of callbacks for various captcha events
    callbacks?: Partial<ProcaptchaCallbacks>
}

/**
 * Wrap a ref to be the same format as useState.
 * @param defaultValue the default value if the state is not already initialised
 * @returns a ref in the same format as a state, e.g. [value, setValue]
 */
const useRefAsState = <T,>(defaultValue: T): [T, (value: T) => void] => {
    const ref = useRef<T>(defaultValue)
    const setter = (value: T) => {
        ref.current = value
    }
    const value: T = ref.current
    return [value, setter]
}

const useProcaptcha = (): [ProcaptchaState, ProcaptchaStateUpdateFn] => {
    // useRef == do not render on variable change
    // useState == do render on variable change
    // only need to render on visible variables changing

    const [isHuman, setIsHuman] = useState(false)
    const [index, setIndex] = useState(-1)
    const [solutions, setSolutions] = useState([])
    const [captchaApi, setCaptchaApi] = useRefAsState<ProsopoCaptchaApi | undefined>(undefined)
    const [showModal, setShowModal] = useState(false)
    const [challenge, setChallenge] = useState<GetCaptchaResponse | undefined>(undefined)
    const [loading, setLoading] = useState(false)
    const [account, setAccount] = useState<Account | undefined>(undefined)
    const [submission, setSubmission] = useRefAsState<TCaptchaSubmitResult | undefined>(undefined)

    const map = {
        isHuman: setIsHuman,
        index: setIndex,
        solutions: setSolutions,
        captchaApi: setCaptchaApi,
        showModal: setShowModal,
        challenge: setChallenge,
        loading: setLoading,
        account: setAccount,
        submission: setSubmission,
        // don't provide method for updating config, should remain constant
    }

    return [
        // the state
        {
            isHuman,
            index,
            solutions,
            captchaApi,
            showModal,
            challenge,
            loading,
            account,
            submission,
        },
        // and method to update the state
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
}

export const Procaptcha = (props: ProcaptchaProps) => {
    const config = props.config
    const callbacks = props.callbacks || {}

    const [state, updateState] = useProcaptcha()
    const manager = Manager(config, state, updateState, callbacks)

    return (
        <Box sx={{ maxWidth: '100%', maxHeight: '100%', overflowX: 'auto' }}>
            <Backdrop open={state.showModal} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                {state.challenge ? (
                    <CaptchaComponent
                        challenge={state.challenge}
                        index={state.index}
                        solutions={state.solutions}
                        onSubmit={manager.submit}
                        onCancel={manager.cancel}
                        onClick={manager.select}
                        onNext={manager.nextRound}
                    ></CaptchaComponent>
                ) : (
                    <Alert>No challenge set.</Alert>
                )}
            </Backdrop>

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
                            <Box
                                sx={{
                                    height: '50px',
                                    width: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column',
                                }}
                            >
                                <Box
                                    sx={{
                                        display: !state.loading ? 'block' : 'none',
                                    }}
                                >
                                    <Checkbox
                                        onChange={manager.start}
                                        checked={state.isHuman}
                                        inputProps={{ 'aria-label': 'controlled' }}
                                        sx={{
                                            '& .MuiSvgIcon-root': { fontSize: 32 },
                                        }}
                                    />
                                </Box>
                                <Box
                                    sx={{
                                        display: state.loading ? 'block' : 'none',
                                    }}
                                >
                                    <Box pt={'5px'}>
                                        <CircularProgress size={'24px'} disableShrink />
                                    </Box>
                                </Box>
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
