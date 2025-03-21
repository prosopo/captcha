// Copyright 2021-2025 Prosopo (UK) Ltd.
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
/** @jsxImportSource @emotion/react */

import type { ProcaptchaProps } from "@prosopo/types";
import Checkbox from "./Checkbox.js";
import { ContainerDiv, WidthBasedStylesDiv } from "./Containers.js";
import { LoadingSpinner } from "./LoadingSpinner.js";
import Logo from "./Logo.js";
import {
	WIDGET_BORDER,
	WIDGET_BORDER_RADIUS,
	WIDGET_DIMENSIONS,
	WIDGET_INNER_HEIGHT,
	WIDGET_MAX_WIDTH,
	WIDGET_MIN_HEIGHT,
	WIDGET_PADDING,
	WIDGET_URL,
	WIDGET_URL_TEXT,
} from "./WidgetConstants.js";
import { darkTheme, lightTheme } from "./theme.js";

export const ProcaptchaPlaceholder = ({
	config,
	errorMessage,
	callbacks,
}: ProcaptchaProps) => {
	console.log("In placeholder", "error", errorMessage);
	const themeColor = config.theme === "light" ? "light" : "dark";
	const theme = config.theme === "light" ? lightTheme : darkTheme;
	return (
		<div style={{ width: "100%", minHeight: WIDGET_MIN_HEIGHT }}>
			<div
				style={{
					maxWidth: WIDGET_MAX_WIDTH,
					minHeight: WIDGET_MIN_HEIGHT,
					maxHeight: "100%",
					overflowX: "auto",
					width: "100%",
					...theme.font,
				}}
			>
				<ContainerDiv>
					<WidthBasedStylesDiv>
						<div style={WIDGET_DIMENSIONS} data-cy={"button-human"}>
							{" "}
							<div
								style={{
									padding: WIDGET_PADDING,
									border: WIDGET_BORDER,
									backgroundColor: theme.palette.background.default,
									borderColor: theme.palette.grey[300],
									borderRadius: WIDGET_BORDER_RADIUS,
									display: "flex",
									alignItems: "center",
									flexWrap: "wrap",
									justifyContent: "space-between",
									minHeight: `${WIDGET_INNER_HEIGHT}px`,
									overflow: "hidden",
								}}
							>
								<div style={{ display: "flex", flexDirection: "column" }}>
									<div
										style={{
											alignItems: "center",
											flex: 1,
										}}
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												flexDirection: "column",
												verticalAlign: "middle",
											}}
										>
											<div
												style={{
													display: "flex",
												}}
											>
												<div style={{ display: "inline-flex" }}>
													{errorMessage ? (
														<Checkbox
															themeColor={themeColor}
															onChange={() => {}}
															checked={false}
															labelText={""}
															error={errorMessage}
															aria-label="human checkbox"
														/>
													) : (
														<LoadingSpinner
															themeColor={themeColor}
															aria-label="Loading spinner"
														/>
													)}
												</div>
											</div>
										</div>
									</div>
								</div>
								<div
									style={{ display: "inline-flex", flexDirection: "column" }}
								>
									<a
										href={WIDGET_URL}
										// biome-ignore lint/a11y/noBlankTarget: Biome incorrect edge case
										target="_blank"
										aria-label={WIDGET_URL_TEXT}
									>
										<div style={{ flex: 1 }}>
											<Logo themeColor={themeColor} aria-label="Prosopo logo" />
										</div>
									</a>
								</div>
							</div>
						</div>
					</WidthBasedStylesDiv>
				</ContainerDiv>
			</div>
		</div>
	);
};
