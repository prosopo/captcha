import { Avatar } from "@mui/material";
import { CaptchaResponseCaptcha } from "@prosopo/procaptcha";

import { useStyles } from "../styles";


export function CaptchaWidget({ challenge, solution, onChange }: 
    {challenge: CaptchaResponseCaptcha, solution: number[], onChange: (index: number) => void}) {
    // TODO challenge.items
    const items = Array.from(Array(9).keys());
  
    const classes = useStyles();
  
    return (
      <>
        {items.map((item, index) => <Avatar
          key={index}
          src="/" // TODO challenge.items[].path...
          variant="square"
          className={classes.captchaItem + " " + (solution.includes(index) ? " selected" : "")}
          onClick={() => onChange(index)} />
        )}
      </>
    );
  }

  export default CaptchaWidget;