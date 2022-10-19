// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha-react <https://github.com/prosopo/procaptcha-react>.
//
// procaptcha-react is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha-react is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha-react.  If not, see <http://www.gnu.org/licenses/>.
import makeStyles from "@mui/styles/makeStyles";

const dot = {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
    border: "1px solid #CFCFCF",
    backgroundColor: "#FFFFFF",
}

export const useStyles = makeStyles({
    imageGrid: {
        // expand to full height / width of parent
        width: "100%",
        height: "100%",
        // display children in flex, spreading them evenly and wrapping when row length exceeded
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        // the grid adds padding on right and bottom where items finish
        paddingRight: "4px",
        paddingBottom: "4px",
    },
    itemContainer: {
        // enable the items in the grid to grow in width to use up excess space
        flexGrow: 1,
        // make the width of each item 1/3rd of the width overall, i.e. 3 columns
        flexBasis: "33.3333%",
        // each item in the grid has padding on left and top
        paddingTop: "4px",
        paddingLeft: "4px",
        // include the padding / margin / border in the width
        boxSizing: "border-box",
    },
    itemImage: {
        width: "100%", // image should be full width / height of the item
        backgroundColor: "black", // colour of the bands when letterboxing and image
        display: "block", // removes whitespace below imgs
        objectFit: "contain", // contain the entire image in the img tag
        aspectRatio: "1/1", // force AR to be 1, letterboxing images with different aspect ratios
    },
    itemOverlayContainer: {
        // relative to where the element _should_ be positioned
        position: "relative",
        // make the overlay the full height/width of an item
        width: "100%",
        height: "100%",
        // shift it up 100% to overlay the item element
        top: "-100%",
        // transition on opacity upon (de)selection
        transitionDuration: "300ms",
        transitionProperty: "opacity",
    },
    itemOverlay: {
        // make the overlay absolute positioned compare to its container
        position: "absolute",
        // spread across 100% width/height of the item box
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        height: "100%",
        width: "100%",
        // display overlays in center
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // make bg half opacity, i.e. shadowing the item's img
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    itemOverlayImage: {
        // img must be displayed as block otherwise get's a bottom whitespace border
        display: "block",
        // how big the overlay icon is
        width: "35%",
        height: "35%",
    },
    itemSelected: {
        // when items are selected, make the overlay opacity 1, i.e. show the overlay
        opacity: 1,
    },
    itemUnselected: {
        // when items are unselected, make the overlay opacity 0, i.e. hide the overlay
        opacity: 0,
    },


    
    root: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
    },
    captchasContainer: {
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        minWidth: "300px",
    },
    overflowContainer: {
        overflowX: "auto",
        overflowY: "auto",
        width: "100%",
        maxWidth: "450px",
        maxHeight: "100%",
    },
    captchasHeader: {
        display: "flex",
        alignItems: "center",
        backgroundColor: "#1976d2",
        minHeight: 80,
        padding: 20,
        width: "100%",
    },
    captchasBody: {
    },
    captchasFooter: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 80,
        paddingLeft: 20,
        paddingRight: 20
    },
    captchasHeaderLabel: {
        color: "#ffffff",
        fontWeight: 700
    },
    dotsContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        paddingBottom: 15,
        paddingTop: 10
    },
    dot,
    dotActive: {
        ...dot,
        backgroundColor: "#CFCFCF"
    },
});
