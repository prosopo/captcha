import styled from "@emotion/styled";
import type React from "react";
import type { ButtonHTMLAttributes } from "react";
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
import LogoWithText from "./LogoWithText.js";
import LogoWithoutText from "./LogoWithoutText.js";

interface LogoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	themeColor: "light" | "dark";
}

const LogoContainer = styled.div`
  padding: 4px;
  flex: 1 1 0;
`;

const LogoInnerContainer = styled.div`
  padding: 4px;
`;

const Logo: React.FC<LogoProps> = ({ themeColor }: LogoProps) => {
	return (
		<LogoContainer>
			<LogoInnerContainer>
				<LogoWithText themeColor={themeColor} />
			</LogoInnerContainer>
		</LogoContainer>
	);
};

export default Logo;
