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
import Avatar from "@mui/material/Avatar";
import { CaptchaResponseCaptcha } from "@prosopo/procaptcha";

import { useStyles } from "../styles";
import { addDataAttr } from "../util";
import CheckIcon from '@mui/icons-material/Check';
import { Box, Fade, Theme } from "@mui/material";
import useTheme from "@mui/styles/useTheme";

export function CaptchaWidget({ challenge, solution, onChange }:
    {challenge: CaptchaResponseCaptcha, solution: string[], onChange: (hash: string) => void}) {

    console.log("CHALLENGE", challenge);
    const items = challenge.captcha.items;
    const styles = useStyles();
    const theme: Theme = useTheme();

    return (
        <>
            <Box pr={0.5} pb={0.5} className={styles.imageGrid}>
                {items.map((item, index) => {
                    return (
                        <Box pt={0.5} pl={0.5} className={styles.itemContainer} key={index} onClick={() => onChange(item.hash ? item.hash : '')}>
                            <Box sx={{borderColor: "red", border: 10}}>
                                <img className={styles.itemImage}
                                    src={item.data}
                                    alt={`Captcha image ${index + 1}`}
                                />
                            </Box>
                            <Fade in={solution.includes(item.hash ? item.hash : '')}>
                                <Box className={styles.itemOverlayContainer}>
                                    <Box className={styles.itemOverlay}>
                                        <CheckIcon htmlColor={theme.palette.background.default} className={styles.itemOverlayImage}></CheckIcon>
                                    </Box>
                                </Box>
                            </Fade>
                        </Box>
                    )
                })}
            </Box>
        </>
    );
}

export default CaptchaWidget;
