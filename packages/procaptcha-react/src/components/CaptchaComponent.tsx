// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha-react <https://github.com/prosopo/procaptcha-react>.
//
// procaptcha-react is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha-react is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha-react.  If not, see <http://www.gnu.org/licenses/>.
import { useContext, useEffect, useReducer } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import {
    ICaptchaContextReducer,
    ProsopoCaptchaClient,
    ProsopoCaptchaStateClient,
    captchaStateReducer,
} from '@prosopo/procaptcha'

import { CaptchaContextManager } from './CaptchaManager'
import { CaptchaWidget } from './CaptchaWidget'
import { useTranslation } from '@prosopo/i18n'
import { addDataAttr } from '../util'
import { Alert, Modal } from '@mui/material'
import ThemeProvider from '@mui/material/styles/ThemeProvider'
import theme from './theme'

export function CaptchaComponent({
    clientInterface,
    show = false,
}: {
    clientInterface: ProsopoCaptchaClient
    show: boolean
}) {
    const { t } = useTranslation()

    const manager: ICaptchaContextReducer = useContext(CaptchaContextManager)
    // the captcha state + update func
    const [state, update] = useReducer(captchaStateReducer, {
        captchaIndex: 0, // the index of the captcha we're on (1 captcha challenge contains >=1 captcha)
        captchaSolution: [], // the solutions for the captcha (2d array corresponding to captcha)
    })
    const { account, contractAddress } = manager.state
    const { captchaChallenge, captchaIndex, captchaSolution } = state
    const totalCaptchas = captchaChallenge?.captchas.length ?? 0

    const stateClientInterface = new ProsopoCaptchaStateClient(clientInterface, { state, update })

    useEffect(() => {
        clientInterface.onLoad(stateClientInterface.onSolved, manager.state.config['web2'])
    }, [])

    useEffect(() => {
        const extension = clientInterface.getExtension()
        if (contractAddress && extension) {
            extension.setDefaultAccount()
            const defaultAccount = extension.getAccount()
            if (defaultAccount) {
                clientInterface.onAccountChange(defaultAccount)
            }
        }
    }, [contractAddress])

    useEffect(() => {
        if (account && !captchaChallenge) {
            stateClientInterface.onLoadCaptcha().catch((error) => {
                clientInterface.status.update({ error })
            })
        }
    }, [account])

    const resetState = () => {
        update({
            captchaIndex: 0, // the index of the captcha we're on (1 captcha challenge contains >=1 captcha)
            captchaSolution: [], // the solutions for the captcha (2d array corresponding to captcha)
            captchaChallenge: undefined,
        })
    }

    // https://www.npmjs.com/package/i18next

    return (
        <ThemeProvider theme={theme}>
            <Modal open={show}>
                <Box
                    sx={{
                        // center the popup horizontally and vertically
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        // fill entire screen
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <Box
                        sx={{
                            // introduce scroll bars when screen < minWidth of children
                            overflowX: 'auto',
                            overflowY: 'auto',
                            width: '100%',
                            // limit the popup width
                            maxWidth: '450px',
                            // maxHeight introduces vertical scroll bars if children content longer than window
                            maxHeight: '100%',
                        }}
                    >
                        <Box
                            bgcolor={theme.palette.background.default}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                // the min width of the popup before scroll bars appear
                                minWidth: '300px',
                            }}
                        >
                            {!captchaChallenge ? (
                                // no captcha challenge has been setup yet, render an alert
                                <Alert severity="error">No captcha challenge active.</Alert>
                            ) : (
                                // else captcha challenge has been populated, render the challenge
                                <>
                                    <Box
                                        px={2}
                                        py={3}
                                        sx={{
                                            // center the header
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: '100%',
                                        }}
                                        bgcolor={theme.palette.primary.main}
                                    >
                                        <Typography
                                            sx={{
                                                color: '#ffffff',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {t('WIDGET.SELECT_ALL', {
                                                target: captchaChallenge.captchas[captchaIndex].captcha.target,
                                            })}
                                        </Typography>
                                    </Box>

                                    <Box {...addDataAttr({ dev: { cy: 'captcha-' + captchaIndex } })}>
                                        <CaptchaWidget
                                            challenge={captchaChallenge.captchas[captchaIndex]}
                                            solution={captchaSolution[captchaIndex] || []}
                                            onChange={stateClientInterface.onChange.bind(stateClientInterface)}
                                        />
                                    </Box>
                                    <Box
                                        px={2}
                                        py={1}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '100%',
                                        }}
                                        {...addDataAttr({ dev: { cy: 'dots-captcha' } })}
                                    >
                                        {captchaChallenge?.captchas.map((_, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    width: 7,
                                                    height: 7,
                                                    borderRadius: '50%',
                                                    border: '1px solid #CFCFCF',
                                                }}
                                                mx={0.5}
                                                bgcolor={
                                                    captchaIndex === index
                                                        ? theme.palette.background.default
                                                        : '#CFCFCF'
                                                }
                                            />
                                        ))}
                                    </Box>
                                    <Box
                                        px={2}
                                        pt={0}
                                        pb={2}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Button
                                            onClick={() => {
                                                stateClientInterface.onCancel()
                                                // reset the state of the captcha challenge back to default
                                                resetState()
                                            }}
                                            variant="text"
                                        >
                                            {t('WIDGET.CANCEL')}
                                        </Button>
                                        <Button
                                            color="primary"
                                            onClick={() => {
                                                stateClientInterface.onSubmit()
                                                // only fire when all captchas have been completed
                                                if (captchaIndex + 1 < totalCaptchas) {
                                                    console.log('onNext')
                                                } else {
                                                    console.log('onSubmit')
                                                    // reset the state of the captcha challenge back to default
                                                    resetState()
                                                }
                                            }}
                                            variant="contained"
                                            {...addDataAttr({ dev: { cy: 'button-next' } })}
                                        >
                                            {captchaIndex + 1 < totalCaptchas ? t('WIDGET.NEXT') : t('WIDGET.SUBMIT')}
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Modal>
        </ThemeProvider>
    )
}

export default CaptchaComponent
