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
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import ThemeProvider from '@mui/material/styles/ThemeProvider'
import addDataAttr from '../util'
import CaptchaWidget from './CaptchaWidget'
import theme from './theme'
import { useTranslation } from '@prosopo/common'
import { GetCaptchaResponse } from '@prosopo/procaptcha'

export interface CaptchaComponentProps {
    challenge: GetCaptchaResponse
    index: number
    solutions: string[][]
    onSubmit: () => void
    onCancel: () => void
    onClick: (hash: string) => void
    onNext: () => void
}

export const CaptchaComponent = (props: CaptchaComponentProps) => {
    const { t } = useTranslation()
    const { challenge, index, solutions, onSubmit, onCancel, onClick, onNext } = props
    const captcha = challenge.captchas[index]
    const solution = solutions[index]

    return (
        <ThemeProvider theme={theme}>
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
                                {t('WIDGET.SELECT_ALL')}
                                {': '}
                            </Typography>
                            <Typography
                                px={1}
                                sx={{
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    fontSize: theme.typography.h6.fontSize,
                                }}
                            >
                                {`${props.challenge.captchas[props.index].captcha.target}`}
                            </Typography>
                        </Box>

                        <Box {...addDataAttr({ dev: { cy: 'captcha-' + props.index } })}>
                            <CaptchaWidget challenge={captcha} solution={solution} onClick={onClick} />
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
                            {challenge.captchas.map((_, i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        border: '1px solid #CFCFCF',
                                    }}
                                    mx={0.5}
                                    bgcolor={index === i ? theme.palette.background.default : '#CFCFCF'}
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
                            <Button onClick={onCancel} variant="text">
                                {t('WIDGET.CANCEL')}
                            </Button>
                            <Button
                                color="primary"
                                onClick={index < challenge.captchas.length - 1 ? onNext : onSubmit}
                                variant="contained"
                                {...addDataAttr({ dev: { cy: 'button-next' } })}
                            >
                                {index < challenge.captchas.length - 1 ? t('WIDGET.NEXT') : t('WIDGET.SUBMIT')}
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </ThemeProvider>
    )
}

export default CaptchaComponent
