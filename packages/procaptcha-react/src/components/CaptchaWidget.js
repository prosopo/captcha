import React from "react";
import { useStyles } from "../styles";
import { Avatar } from "@mui/material";
export function CaptchaWidget({ challenge, solution, solutionClickEvent }) {
    // TODO challenge.items
    const items = Array.from(Array(9).keys());
    const classes = useStyles();
    return (React.createElement(React.Fragment, null, items.map((item, index) => React.createElement(Avatar, { key: index, src: "/" // TODO challenge.items[].path...
        , variant: "square", className: classes.captchaItem + " " + (solution.includes(index) ? " selected" : ""), onClick: () => solutionClickEvent(index) }))));
}
export default CaptchaWidget;
//# sourceMappingURL=CaptchaWidget.js.map