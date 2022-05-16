import { useEffect, useContext, useReducer } from "react";
import { Box, Button, Typography } from "@mui/material";
import {
    ICaptchaManagerReducer,
    ProsopoCaptchaClient,
    ProsopoCaptchaStateClient,
    captchaStateReducer
} from "@prosopo/procaptcha";

import { CaptchaManager } from "./CaptchaManager";
import { CaptchaWidget } from "./CaptchaWidget";

import { useStyles } from "../styles";


export function CaptchaComponent({ clientInterface }: { clientInterface: ProsopoCaptchaClient }) {

    const classes = useStyles();

    const manager: ICaptchaManagerReducer = useContext(CaptchaManager);
    const [state, update] = useReducer(captchaStateReducer, { currentCaptchaIndex: 0, currentCaptchaSolution: [], captchaSolutions: [] });

    const { account } = manager.state;
    const { captchaChallenge, currentCaptchaIndex, currentCaptchaSolution } = state;
    const totalCaptchas = captchaChallenge?.captchas.length ?? 0;

    const stateClientInterface = new ProsopoCaptchaStateClient(clientInterface, { state, update });

    useEffect(() => {

        clientInterface.onLoad();

    }, []);

    useEffect(() => {
        if (!captchaChallenge) {
            stateClientInterface.onLoadCaptcha()
                .catch(error => {
                    clientInterface.status.update({ error });
                });
        }
    }, [account]);

    // TODO text strings
    // https://www.npmjs.com/package/i18next

    return (
        <Box className={classes.root}>

            {account && captchaChallenge &&
                <Box className={classes.captchasContainer}>

                    <Box className={classes.captchasHeader}>
                        <Typography className={classes.captchasHeaderLabel}>
                            Select all images with {captchaChallenge.captchas[currentCaptchaIndex].captcha.target}
                        </Typography>
                    </Box>

                    <Box className={classes.captchasBody}>

                        <CaptchaWidget challenge={captchaChallenge.captchas[currentCaptchaIndex]} solution={currentCaptchaSolution}
                            onChange={stateClientInterface.onChange.bind(stateClientInterface)} />

                        <Box className={classes.dotsContainer}>
                            {captchaChallenge?.captchas.map((_, index) =>
                                <Box key={index} className={currentCaptchaIndex === index ? classes.dot : classes.dotActive} />)}
                        </Box>

                    </Box>

                    <Box className={classes.captchasFooter}>
                        <Button onClick={() => stateClientInterface.onCancel()} variant="text">
                            Cancel
                        </Button>
                        <Button onClick={() => stateClientInterface.onSubmit()} variant="contained">
                            {currentCaptchaIndex + 1 < totalCaptchas ? "Next" : "Submit"}
                        </Button>
                    </Box>

                </Box>
            }
        </Box>
    );
}

export default CaptchaComponent;
