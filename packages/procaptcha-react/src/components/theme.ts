import { orange, pink } from "@mui/material/colors";
import red from "@mui/material/colors/red";
import createTheme from "@mui/material/styles/createTheme";

export default createTheme({
    palette: {
        primary: {
            main: '#1976d2',
            contrastText: "#fff"
        },
        secondary: orange,
    },
})