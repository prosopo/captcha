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

import { css } from "@emotion/react";
import React, { useEffect, useRef } from "react";

// Define colors directly to avoid import issues
const colors = {
  primary: "#4361ee",
  primaryDark: "#3f37c9",
  text: "#212529"
};

interface CaptchaCheckboxProps {
  isHuman: boolean;
  onClick: () => void;
  text?: string;
}

const checkboxStyles = {
  container: css`
    display: flex;
    align-items: center;
    font-family: "Roboto", sans-serif;
    margin-bottom: 10px;
    cursor: pointer;
    user-select: none;
  `,
  checkbox: css`
    width: 20px;
    height: 20px;
    border: 2px solid ${colors.primary};
    border-radius: 4px;
    margin-right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
    transition: all 0.2s ease;
    cursor: pointer;
    
    &:hover {
      border-color: ${colors.primaryDark};
      box-shadow: 0 0 5px rgba(67, 97, 238, 0.3);
    }
    
    &.checked {
      background-color: ${colors.primary};
    }
  `,
  checkmark: css`
    color: white;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    
    &.checked {
      opacity: 1;
      transform: scale(1);
    }
  `,
  label: css`
    font-size: 14px;
    color: ${colors.text};
  `,
};

/**
 * A checkbox component that shows verified status
 */
export const CaptchaCheckbox: React.FC<CaptchaCheckboxProps> = ({ 
  isHuman, 
  onClick, 
  text = "I'm human"
}) => {
  const checkboxRef = useRef<HTMLDivElement>(null);
  
  // When isHuman changes to true, check the checkbox
  useEffect(() => {
    if (isHuman && checkboxRef.current) {
      checkboxRef.current.classList.add("checked");
    } else if (checkboxRef.current) {
      checkboxRef.current.classList.remove("checked");
    }
  }, [isHuman]);
  
  return (
    <div css={checkboxStyles.container} onClick={onClick}>
      <div 
        css={checkboxStyles.checkbox} 
        ref={checkboxRef}
        className={isHuman ? "checked" : ""}
        role="checkbox"
        aria-checked={isHuman}
        tabIndex={0}
      >
        <svg 
          css={checkboxStyles.checkmark}
          className={isHuman ? "checked" : ""} 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M9.00016 16.1698L4.83016 11.9998L3.41016 13.4098L9.00016 18.9998L21.0002 6.99984L19.5902 5.58984L9.00016 16.1698Z" 
            fill="currentColor"
          />
        </svg>
      </div>
      <span css={checkboxStyles.label}>{text}</span>
    </div>
  );
};

export default CaptchaCheckbox; 