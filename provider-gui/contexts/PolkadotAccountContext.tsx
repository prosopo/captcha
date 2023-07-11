import React, { Dispatch, createContext, useReducer } from 'react'

export interface AccountState {
    currentAccount: string
}

export type AccountAction = { type: 'SET_ACCOUNT'; account: string }

type PolkadotAccountProviderProps = {
    children: React.ReactNode
}

export const AccountStateContext = createContext<AccountState | undefined>(undefined)
export const AccountDispatchContext = createContext<Dispatch<AccountAction> | undefined>(undefined)

const accountReducer = (state: AccountState, action: AccountAction): AccountState => {
    switch (action.type) {
        case 'SET_ACCOUNT':
            return { ...state, currentAccount: action.account }
        default:
            return state
    }
}

const initialState: AccountState = {
    currentAccount: '',
}

export const PolkadotAccountProvider: React.FC<PolkadotAccountProviderProps> = ({ children }): React.JSX.Element => {
    const [state, dispatch] = useReducer(accountReducer, initialState)

    return (
        <AccountDispatchContext.Provider value={dispatch}>
            <AccountStateContext.Provider value={state}>{children}</AccountStateContext.Provider>
        </AccountDispatchContext.Provider>
    )
}
