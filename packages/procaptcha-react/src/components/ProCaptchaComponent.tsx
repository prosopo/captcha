import { useState, useEffect, useContext, useReducer } from "react";

import { Box, Button, Typography } from "@mui/material";

import { getExtension, IProCaptchaManager, ProCaptchaClient, ProCaptchaStateClient, captchaStateReducer, statusReducer } from "@prosopo/procaptcha";

import { ProCaptchaManager } from "./ProCaptchaManager";
import { CaptchaWidget } from "./CaptchaWidget";

import { useStyles } from "../styles";


export function ProCaptchaComponent({ clientInterface }: { clientInterface: ProCaptchaClient }) {

    const classes = useStyles();

    const context: IProCaptchaManager = useContext(ProCaptchaManager);
    const { account, contract, provider } = context.state;

    const [captchaState, updateCaptchaState] = useReducer(captchaStateReducer, {currentCaptchaIndex: 0, currentCaptchaSolution: []});
    const { captchaChallenge, currentCaptchaIndex, currentCaptchaSolution } = captchaState;
    const totalCaptchas = captchaChallenge?.captchas.length ?? 0;

    const stateClientInterface = new ProCaptchaStateClient(clientInterface, { captchaState, updateCaptchaState });

    const status = clientInterface.status.status;

    useEffect(() => {

        clientInterface.onLoad();

    }, []);

    useEffect(() => {
        if (!captchaChallenge && contract && provider) {
            stateClientInterface.newCaptchaChallenge(contract, provider);
        }
    }, [contract, provider]);

    return (
        <Box className={classes.root}>

            {account && captchaChallenge &&
                <Box className={classes.captchasContainer}>

                    <Box className={classes.captchasHeader}>
                        <Typography className={classes.captchasHeaderLabel}>
                            Select all images with [TODO]
                        </Typography>
                    </Box>

                    <Box className={classes.captchasBody}>

                        <CaptchaWidget challenge={captchaChallenge[currentCaptchaIndex]} solution={currentCaptchaSolution} 
                            solutionClickEvent={stateClientInterface.onCaptchaSolutionClick.bind(stateClientInterface)} />

                        <Box className={classes.dotsContainer}>
                            {Array.from(Array(totalCaptchas).keys()).map((item, index) => {
                                return <Box key={index} className={(currentCaptchaIndex === item) ? classes.dot : classes.dotActive} />;
                            })}
                        </Box>

                    </Box>

                    <Box className={classes.captchasFooter}>
                        <Button onClick={() => stateClientInterface.cancelCaptcha()} variant="text">
                            Cancel
                        </Button>
                        <Button onClick={() => stateClientInterface.submitCaptcha()} variant="contained">
                            {currentCaptchaIndex + 1 < totalCaptchas ? "Next" : "Submit"}
                        </Button>
                    </Box>

                </Box>
            }
        </Box>
    );
}

export default ProCaptchaComponent;
