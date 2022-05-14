import { useEffect, useContext, useReducer } from "react";

import { Box, Button, Typography } from "@mui/material";

import { ICaptchaContextReducer, ProsopoCaptchaClient, ProsopoCaptchaStateClient, captchaStateReducer } from "@prosopo/procaptcha";

import { CaptchaManager } from "./CaptchaManager";
import { CaptchaWidget } from "./CaptchaWidget";

import { useStyles } from "../styles";


export function CaptchaComponent({ clientInterface }: { clientInterface: ProsopoCaptchaClient }) {

    const classes = useStyles();

    const context: ICaptchaContextReducer = useContext(CaptchaManager);
    const { account, contract, provider } = context.state;

    const [state, update] = useReducer(captchaStateReducer, { currentCaptchaIndex: 0, currentCaptchaSolution: [] });
    const { captchaChallenge, currentCaptchaIndex, currentCaptchaSolution } = state;
    const totalCaptchas = captchaChallenge?.captchas.length ?? 0;

    const stateClientInterface = new ProsopoCaptchaStateClient(clientInterface, { state, update });

    useEffect(() => {

        clientInterface.onLoad();

    }, []);

    useEffect(() => {
        if (!captchaChallenge && contract && provider) {
            stateClientInterface.newCaptchaChallenge(contract, provider)
                .catch(error => {
                    clientInterface.status.update({ error });
                });
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
                        <Button onClick={() => stateClientInterface.onSubmitCaptcha()} variant="contained">
                            {currentCaptchaIndex + 1 < totalCaptchas ? "Next" : "Submit"}
                        </Button>
                    </Box>

                </Box>
            }
        </Box>
    );
}

export default CaptchaComponent;
