// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha-react <https://github.com/prosopo-io/procaptcha-react>.
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
import { useEffect, useContext, useReducer } from "react";
import { Box, Button, Typography } from "@mui/material";
import {
    ICaptchaContextReducer,
    ProsopoCaptchaClient,
    ProsopoCaptchaStateClient,
    captchaStateReducer
} from "@prosopo/procaptcha";

import { CaptchaContextManager } from "./CaptchaManager";
import { CaptchaWidget } from "./CaptchaWidget";

import { useStyles } from "../styles";


export function CaptchaComponent({ clientInterface }: { clientInterface: ProsopoCaptchaClient }) {

    const classes = useStyles();

    const manager: ICaptchaContextReducer = useContext(CaptchaContextManager);
    const [state, update] = useReducer(captchaStateReducer, { captchaIndex: 0, captchaSolution: [] });

    const { account, contractAddress } = manager.state;
    const { captchaChallenge, captchaIndex, captchaSolution } = state;
    const totalCaptchas = captchaChallenge?.captchas.length ?? 0;

    const stateClientInterface = new ProsopoCaptchaStateClient(clientInterface, { state, update });

    useEffect(() => {

        clientInterface.onLoad();

    }, []);

    useEffect(() => {
        const extension = clientInterface.getExtension();
        if (contractAddress && extension) {
            extension.setDefaultAccount();
            const defaultAccount = extension.getAccount();
            if (defaultAccount) {
                clientInterface.onAccountChange(defaultAccount);
            }
        }
    }, [contractAddress]);

    useEffect(() => {
        if (account && !captchaChallenge) {
            stateClientInterface.onLoadCaptcha()
                .catch(error => {
                    clientInterface.status.update({ error });
                });
        }
    }, [account]);

    
    // https://www.npmjs.com/package/i18next

    return (
        <Box className={classes.root}>

            {account && captchaChallenge &&
                <Box className={classes.captchasContainer}>

                    <Box className={classes.captchasHeader}>
                        <Typography className={classes.captchasHeaderLabel}>
                            Select all images containing a {captchaChallenge.captchas[captchaIndex].captcha.target}
                        </Typography>
                    </Box>

                    <Box className={classes.captchasBody}>

                        <CaptchaWidget challenge={captchaChallenge.captchas[captchaIndex]} solution={captchaSolution[captchaIndex] || []}
                            onChange={stateClientInterface.onChange.bind(stateClientInterface)} />

                        <Box className={classes.dotsContainer}>
                            {captchaChallenge?.captchas.map((_, index) =>
                                <Box key={index} className={captchaIndex === index ? classes.dot : classes.dotActive} />)}
                        </Box>

                    </Box>

                    <Box className={classes.captchasFooter}>
                        <Button onClick={() => stateClientInterface.onCancel()} variant="text">
                            Cancel
                        </Button>
                        <Button onClick={() => stateClientInterface.onSubmit()} variant="contained">
                            {captchaIndex + 1 < totalCaptchas ? "Next" : "Submit"}
                        </Button>
                    </Box>

                </Box>
            }
        </Box>
    );
}

export default CaptchaComponent;
