import React from "react";
import {useStyles} from "../app.styles";
import {Avatar} from "@mui/material";
import {ProsopoCaptcha} from "@prosopo/procaptcha";

export function CaptchaWidget({challenge, solution, solutionClickEvent}:
                                { challenge: ProsopoCaptcha, solution: number[], solutionClickEvent: (index: number) => void }) {
  const items = challenge.captcha.items;
  const classes = useStyles();

  return (
    <>
      {items.map((item, index) => <Avatar
        key={index}
        src={item.path} // TODO challenge.items[].path...
        variant="square"
        className={classes.captchaItem + " " + (solution.includes(index) ? " selected" : "")}
        onClick={() => solutionClickEvent(index)}/>
      )}
    </>
  );
}

export default CaptchaWidget;
