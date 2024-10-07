// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// A navbar component that lets the user navigate between routes `/` and `/frictionless`

import { AppBar, CssBaseline, Toolbar } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";

const linkStyle = {
	margin: "8px",
	color: "white",
	textDecoration: "none",
};

export default function NavBar() {
	const location = useLocation();
	const frictionlessLinkStyle = { ...linkStyle };
	const powLinkStyle = { ...linkStyle };
	const imageCaptchaLinkStyle = { ...linkStyle };

	// if the current route is `/frictionless`, the link to `/frictionless` should be styled differently
	if (location.pathname === "/frictionless") {
		frictionlessLinkStyle.textDecoration = "underline";
	}
	// if the current route is `/pow`, the link to `/pow` should be styled differently
	if (location.pathname === "/pow") {
		powLinkStyle.textDecoration = "underline";
	}
	// if the current route is `/`, the link to `/` should be styled differently
	if (location.pathname === "/") {
		imageCaptchaLinkStyle.textDecoration = "underline";
	}

	return (
		<AppBar sx={{ display: "flex", margin: "0 auto" }}>
			<CssBaseline />
			<Toolbar>
				<div>
					<Link to="/" style={imageCaptchaLinkStyle}>
						Image Captcha
					</Link>
					<Link to="/pow" style={powLinkStyle}>
						PoW Captcha
					</Link>
					<Link to="/frictionless" style={frictionlessLinkStyle}>
						Frictionless Captcha
					</Link>
				</div>
			</Toolbar>
		</AppBar>
	);
}
