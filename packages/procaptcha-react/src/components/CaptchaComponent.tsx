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
import { useEffect, useContext, useReducer } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {
    ICaptchaContextReducer,
    ProsopoCaptchaClient,
    ProsopoCaptchaStateClient,
    captchaStateReducer
} from "@prosopo/procaptcha";

import { CaptchaContextManager } from "./CaptchaManager";
import { CaptchaWidget } from "./CaptchaWidget";
import { useTranslation } from "@prosopo/i18n";
import { useStyles } from "../styles";
import { addDataAttr } from "../util";
import { Alert, Modal } from "@mui/material";


export function CaptchaComponent({ clientInterface, show = false }: { clientInterface: ProsopoCaptchaClient, show: boolean }) {

    const { t } = useTranslation();
    const classes = useStyles();

    const manager: ICaptchaContextReducer = useContext(CaptchaContextManager);
    // the captcha state + update func
    const [state, update] = useReducer(captchaStateReducer, { 
        captchaIndex: 0, // the index of the captcha we're on (1 captcha challenge contains >=1 captcha)
        captchaSolution: [], // the solutions for the captcha (2d array corresponding to captcha)
    });
    const { account, contractAddress } = manager.state;
    const { captchaChallenge, captchaIndex, captchaSolution } = state;
    const totalCaptchas = captchaChallenge?.captchas.length ?? 0;

    const stateClientInterface = new ProsopoCaptchaStateClient(clientInterface, { state, update });

    useEffect(() => {
        clientInterface.onLoad(manager.state.config['web2']);
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

    const resetState = () => {
        update({ 
            captchaIndex: 0, // the index of the captcha we're on (1 captcha challenge contains >=1 captcha)
            captchaSolution: [], // the solutions for the captcha (2d array corresponding to captcha)
            captchaChallenge: undefined,
        })
    };


    // https://www.npmjs.com/package/i18next

    return (
        <Modal open={show}>

            <Box className={classes.root}>
                <Box className={classes.overflowContainer}>
                    <Box className={classes.captchasContainer}>

                        {!(captchaChallenge)
                            // no captcha challenge has been setup yet, render an alert
                            ? <Alert severity="error">No captcha challenge active.</Alert>
                            // else captcha challenge has been populated, render the challenge
                            : <>
                                <Box className={classes.captchasHeader}>
                                    <Typography className={classes.captchasHeaderLabel}>
                                        {t("WIDGET.SELECT_ALL", { target: captchaChallenge.captchas[captchaIndex].captcha.target })}
                                    </Typography>
                                </Box>

                                <Box className={classes.captchasBody} {...addDataAttr({dev: {cy: 'captcha-' + captchaIndex}})}>
                                    <CaptchaWidget challenge={captchaChallenge.captchas[captchaIndex]} solution={captchaSolution[captchaIndex] || []}
                                        onChange={stateClientInterface.onChange.bind(stateClientInterface)} />
                                    <Box className={classes.dotsContainer} {...addDataAttr({dev: {cy: 'dots-captcha'}})}>
                                        {captchaChallenge?.captchas.map((_, index) =>
                                            <Box key={index} className={captchaIndex === index ? classes.dot : classes.dotActive} />)}
                                    </Box>

                                </Box>
                                <Box className={classes.captchasFooter}>
                                    <Button onClick={() => {
                                        stateClientInterface.onCancel();
                                        // reset the state of the captcha challenge back to default
                                        resetState();
                                    }} variant="text">
                                        {t('WIDGET.CANCEL')}
                                    </Button>
                                    <Button 
                                        onClick={() => {
                                            stateClientInterface.onSubmit();
                                            // only fire when all captchas have been completed
                                            if(captchaIndex + 1 < totalCaptchas) {
                                                console.log('onNext')
                                            } else {
                                                console.log('onSubmit')
                                                // reset the state of the captcha challenge back to default
                                                resetState();
                                            }
                                        }} 
                                        variant="contained" 
                                        {...addDataAttr({dev: {cy: "button-next"}})}
                                    >
                                        {captchaIndex + 1 < totalCaptchas ? t('WIDGET.NEXT') : t('WIDGET.SUBMIT')}
                                    </Button>
                                </Box>
                            </>
                        }

                    </Box>
                </Box>
            </Box>
            
        </Modal>
    );
}

export default CaptchaComponent;
