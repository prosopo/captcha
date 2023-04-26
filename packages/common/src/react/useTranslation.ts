import {
  useTranslation as useTranslationDefault,
  UseTranslationOptions,
  UseTranslationResponse,
} from "react-i18next";

import i18n from "../i18n";

function useTranslation(
  options?: UseTranslationOptions
): UseTranslationResponse<"translation"> & { t: typeof i18n.t } {
  return useTranslationDefault("translation", { i18n, ...options });
}

export default useTranslation;
