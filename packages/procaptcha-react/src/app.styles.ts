import { makeStyles } from "@mui/styles";

export const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%"
  },
  captchasContainer: {
    display: "flex",
    flexDirection: "column",
    background: "#FFFFFF",
    border: "1px solid #CFCFCF",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)"
  },
  captchasHeader: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#bdbdbd",
    height: 80,
    paddingLeft: 20
  },
  captchasBody: {
    display: "flex",
    width: 460,
    flexWrap: "wrap",
    height: "max-content",
    paddingTop: 10,
    paddingLeft: 10,
    borderBottom: "1px solid #CFCFCF"
  },
  captchasFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 80,
    paddingLeft: 20,
    paddingRight: 20
  },
  captchaItem: {
    width: "140px !important",
    borderRadius: 2,
    height: "140px !important",
    marginRight: 10,
    marginBottom: 10
  },
  captchasHeaderLabel: {
    color: "#ffffff"
  },
  iAmHumanButton: {
    height: 76,
    width: 300,
    backgroundColor: "#FAFAFA !important",
    border: "1px solid #E0E0E0 !important"
  },
  iAmHumanButtonLabel: {
    color: "#555555",
    textTransform: "none"
  },
  dotsContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingBottom: 15,
    paddingTop: 10
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
    border: "1px solid #CFCFCF"
  }
});
