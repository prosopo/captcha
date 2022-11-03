import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import { useState } from "react";
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import { useTheme } from "@emotion/react";
import Link from "@mui/material/Link";

export const Procaptcha = () => {

    // client interface needs to be instantiated here to do the checks on the smart contract right away for already verified users
    // this would auto-tick the tickbox
    

    const [state, setState] = useState({
        checked: false,
        showCaptcha: false,
    });

    const onChange = () => {
        setState(current => {
            // if not already showing the captcha
            // and if the tickbox is not already ticked
            if(!current.checked) {
                // tickbox is currently unchecked
                // trigger captcha challenge
                // TODO
                console.log("captcha")
            } else {
                console.log('captcha already done')
            }
            const next = {checked: true, showCaptcha: false, };
            return next;
        })
    }

    return (
        <Box p={1} sx={{maxWidth: "600px"}}>
            <Box p={1} border={1} borderColor="lightgray" sx={{ display: 'flex', justifyContent: "space-between", alignItems: "center", flexWrap: 'wrap' }}>
                <Box sx={{display: "flex", flexDirection: "column"}}>
                    <Box sx={{display: "flex", justifyContent: "flex-start", alignItems: "center", flexWrap: 'wrap'}}>
                        <Box>
                            <Checkbox
                                onChange={onChange}
                                checked={state.checked}
                                inputProps={{ 'aria-label': 'controlled' }}
                                sx={{ '& .MuiSvgIcon-root': { fontSize: 32 } }}
                            />
                        </Box>
                        <Box p={1} >
                            <Typography>
                                I am a human
                            </Typography>
                        </Box>
                    </Box>
                    <Box p={1}>
                        <Link href="https://prosopo.io/#how-it-works" target="_blank">Why must I prove I am human?</Link>
                    </Box>
                </Box>
                <Link href="https://prosopo.io" target="_blank">
                    <Box p={1}>
                        put logo here
                    </Box>
                </Link>
            </Box>
        </Box>
    );
}