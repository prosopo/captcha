import React from "react";
import { useStyles } from "../styles";
import { Avatar } from "@mui/material";
import { ProsopoCaptcha } from "@prosopo/procaptcha";

export function CaptchaWidget({ challenge, solution, solutionClickEvent}:
    {challenge: ProsopoCaptcha, solution: number[], solutionClickEvent: (index: number) => void}) {
    // TODO challenge.items
    //const items = Array.from(Array(9).keys());
    console.log("CHALLENGE", challenge);
    const items = challenge.captcha.items;
    const classes = useStyles();

    return (
      <>
        {items.map((item, index) => <Avatar
          key={index}
          src={item.path} // TODO challenge.items[].path...
          variant="square"
          className={classes.captchaItem + " " + (solution.includes(index) ? " selected" : "")}
          onClick={() => solutionClickEvent(index)} />
        )}
      </>
    );
  }

  export default CaptchaWidget;
