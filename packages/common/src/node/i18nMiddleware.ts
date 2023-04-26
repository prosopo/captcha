import { handle, HandleOptions } from "i18next-http-middleware";

import i18n from "../i18n";

function i18nMiddleware(options: HandleOptions): ReturnType<typeof handle> {
  return handle(i18n, { ...options });
}

export default i18nMiddleware;
