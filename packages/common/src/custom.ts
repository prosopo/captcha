import { DefaultNamespace, Namespace, TFuncReturn } from 'react-i18next';
import { TranslationKey } from "./utils";

declare module "i18next" {
  interface TFunction<
    N extends Namespace = DefaultNamespace,
    TKPrefix = undefined
  > {
    <
      TKeys extends TranslationKey,
      TDefaultResult extends TFunctionResult | React.ReactNode = string,
      TInterpolationMap extends object = StringMap
    >(
      key: TKeys | TKeys[],
      options?: TOptions<TInterpolationMap> | string
    ): TFuncReturn<N, TKeys, TDefaultResult, TKPrefix>;
    <
      TKeys extends TranslationKey,
      TDefaultResult extends TFunctionResult | React.ReactNode = string,
      TInterpolationMap extends object = StringMap
    >(
      key: TKeys | TKeys[],
      defaultValue?: string,
      options?: TOptions<TInterpolationMap> | string
    ): TFuncReturn<N, TKeys, TDefaultResult, TKPrefix>;
  }
}
