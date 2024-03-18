import {
    Account,
    GetCaptchaResponse,
    ProcaptchaState,
    ProcaptchaStateUpdateFn,
    ProsopoCaptchaApi,
    TCaptchaSubmitResult,
} from '@prosopo/types'

type useRefType = <T>(defaultValue: T) => { current: T }
type useStateType = <T>(defaultValue: T) => [T, (value: T) => void]

/**
 * Wrap a ref to be the same format as useState.
 * @param useRef the useRef function from react
 * @param defaultValue the default value if the state is not already initialised
 * @returns a ref in the same format as a state, e.g. [value, setValue]
 */
const useRefAsState = <T>(useRef: useRefType, defaultValue: T): [T, (value: T) => void] => {
    const ref = useRef<T>(defaultValue)
    const setter = (value: T) => {
        ref.current = value
    }
    const value: T = ref.current
    return [value, setter]
}

export const useProcaptcha = (
    useState: useStateType,
    useRef: useRefType
): [ProcaptchaState, ProcaptchaStateUpdateFn] => {
    const [isHuman, setIsHuman] = useState(false)
    const [index, setIndex] = useState(0)
    const [solutions, setSolutions] = useState([] as string[][])
    const [captchaApi, setCaptchaApi] = useRefAsState<ProsopoCaptchaApi | undefined>(useRef, undefined)
    const [showModal, setShowModal] = useState(false)
    const [challenge, setChallenge] = useState<GetCaptchaResponse | undefined>(undefined)
    const [loading, setLoading] = useState(false)
    const [account, setAccount] = useState<Account | undefined>(undefined)
    const [dappAccount, setDappAccount] = useState<string | undefined>(undefined)
    const [submission, setSubmission] = useRefAsState<TCaptchaSubmitResult | undefined>(useRef, undefined)
    const [timeout, setTimeout] = useRefAsState<NodeJS.Timeout | undefined>(useRef, undefined)
    const [blockNumber, setBlockNumber] = useRefAsState<number | undefined>(useRef, undefined)
    const [successfullChallengeTimeout, setSuccessfullChallengeTimeout] = useRefAsState<NodeJS.Timeout | undefined>(
        useRef,
        undefined
    )
    const [sendData, setSendData] = useState(false)
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
            dappAccount,
            submission,
            timeout,
            blockNumber,
            successfullChallengeTimeout,
            sendData,
        },
        // and method to update the state
        (nextState: Partial<ProcaptchaState>) => {
            if (nextState.account !== undefined) setAccount(nextState.account)
            if (nextState.isHuman !== undefined) setIsHuman(nextState.isHuman)
            if (nextState.index !== undefined) setIndex(nextState.index)
            // force a copy of the array to ensure a re-render
            // nutshell: react doesn't look inside an array for changes, hence changes to the array need to result in a fresh array
            if (nextState.solutions !== undefined) setSolutions(nextState.solutions.slice())
            if (nextState.captchaApi !== undefined) setCaptchaApi(nextState.captchaApi)
            if (nextState.showModal !== undefined) setShowModal(nextState.showModal)
            if (nextState.challenge !== undefined) setChallenge(nextState.challenge)
            if (nextState.loading !== undefined) setLoading(nextState.loading)
            if (nextState.showModal !== undefined) setShowModal(nextState.showModal)
            if (nextState.dappAccount !== undefined) setDappAccount(nextState.dappAccount)
            if (nextState.submission !== undefined) setSubmission(nextState.submission)
            if (nextState.timeout !== undefined) setTimeout(nextState.timeout)
            if (nextState.successfullChallengeTimeout !== undefined) setSuccessfullChallengeTimeout(nextState.timeout)
            if (nextState.blockNumber !== undefined) setBlockNumber(nextState.blockNumber)
            if (nextState.sendData !== undefined) setSendData(nextState.sendData)
        },
    ]
}
