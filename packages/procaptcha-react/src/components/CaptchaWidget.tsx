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
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { Badge, Box, ImageList, ImageListItem } from "@mui/material";
import check from './check.svg';


export function CaptchaWidget({ challenge, solution, onChange }:
    {challenge: CaptchaResponseCaptcha, solution: string[], onChange: (hash: string) => void}) {

    console.log("CHALLENGE", challenge);
    const items = challenge.captcha.items;
    const styles = useStyles();

    return (
        <>
            <div className={styles.imageGrid}>
                {items.map((item, index) => {
                    const selectedClass = solution.includes(item.hash ? item.hash : '') ? styles.itemSelected : styles.itemUnselected;
                    return (
                        <div className={styles.itemContainer} key={index} onClick={() => onChange(item.hash ? item.hash : '')}>
                            <img className={styles.itemImage}
                                src={item.data}
                                alt={`Captcha image ${index + 1}`}
                                loading="lazy"
                            />
                            <div className={styles.itemOverlayContainer + ` ${selectedClass}`}>
                                <div className={styles.itemOverlay}>
                                    <svg className={styles.itemOverlayImage} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill={"#fff"} d="M470.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L192 338.7 425.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </>
    );
}

export default CaptchaWidget;
