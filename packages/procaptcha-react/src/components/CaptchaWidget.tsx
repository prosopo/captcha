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
import CheckIcon from '@mui/icons-material/Check'
import { Theme } from '@mui/material'
import Box from '@mui/material/Box'
import Fade from '@mui/material/Fade'
import useTheme from '@mui/styles/useTheme'
<<<<<<< HEAD
import { CaptchaResponseCaptcha } from '@prosopo/procaptcha'
=======
import { Item } from '@prosopo/types'
>>>>>>> main

export interface CaptchaWidgetProps {
    challenge: CaptchaResponseCaptcha
    solution: string[]
    onClick: (hash: string) => void
}

const getHash = (item: any) => {
    if (!item.hash) {
        throw new Error('item.hash is undefined')
    }
    return item.hash
}

export const CaptchaWidget = (props: CaptchaWidgetProps) => {
    // console.log('CaptchaWidget', props)
    const { challenge, solution, onClick } = props
    const items = challenge.captcha.items
    const theme: Theme = useTheme()

    return (
        <>
            <Box
                pr={0.5}
                pb={0.5}
                sx={{
                    // expand to full height / width of parent
                    width: '100%',
                    height: '100%',
                    // display children in flex, spreading them evenly and wrapping when row length exceeded
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                }}
            >
                {items.map((item, index) => {
                    const hash = getHash(item)
                    return (
                        <Box
                            pt={0.5}
                            pl={0.5}
                            sx={{
                                // enable the items in the grid to grow in width to use up excess space
                                flexGrow: 1,
                                // make the width of each item 1/3rd of the width overall, i.e. 3 columns
                                flexBasis: '33.3333%',
                                // include the padding / margin / border in the width
                                boxSizing: 'border-box',
                            }}
                            key={index}
                        >
                            <Box
                                sx={{ cursor: 'pointer', height: '100%', width: '100%' }}
                                onClick={() => onClick(hash)}
                            >
                                <Box sx={{ border: 1, borderColor: 'lightgray' }}>
                                    <img
                                        style={{
                                            width: '100%', // image should be full width / height of the item
                                            backgroundColor: 'lightgray', // colour of the bands when letterboxing and image
                                            display: 'block', // removes whitespace below imgs
                                            objectFit: 'contain', // contain the entire image in the img tag
                                            aspectRatio: '1/1', // force AR to be 1, letterboxing images with different aspect ratios
                                        }}
                                        src={item.data}
                                        alt={`Captcha image ${index + 1}`}
                                    />
                                </Box>
                                <Fade in={solution.includes(hash)}>
                                    <Box
                                        sx={{
                                            // relative to where the element _should_ be positioned
                                            position: 'relative',
                                            // make the overlay the full height/width of an item
                                            width: '100%',
                                            height: '100%',
                                            // shift it up 100% to overlay the item element
                                            top: '-100%',
                                            // transition on opacity upon (de)selection
                                            transitionDuration: '300ms',
                                            transitionProperty: 'opacity',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                // make the overlay absolute positioned compare to its container
                                                position: 'absolute',
                                                // spread across 100% width/height of the item box
                                                top: 0,
                                                left: 0,
                                                bottom: 0,
                                                right: 0,
                                                height: '100%',
                                                width: '100%',
                                                // display overlays in center
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                // make bg half opacity, i.e. shadowing the item's img
                                                backgroundColor: 'rgba(0,0,0,0.5)',
                                            }}
                                        >
                                            <CheckIcon
                                                htmlColor={theme.palette.background.default}
                                                sx={{
                                                    // img must be displayed as block otherwise get's a bottom whitespace border
                                                    display: 'block',
                                                    // how big the overlay icon is
                                                    width: '35%',
                                                    height: '35%',
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                </Fade>
                            </Box>
                        </Box>
                    )
                })}
            </Box>
        </>
    )
}

export default CaptchaWidget
