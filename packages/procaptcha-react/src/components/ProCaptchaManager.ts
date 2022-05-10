
import { useState, createContext } from "react";
import ReactDOM from "react-dom/client";

export const ProCaptchaManager = createContext({ state: {}, setState: () => {}, reducer: () => {}, dispatch: () => {} });

export default ProCaptchaManager;
