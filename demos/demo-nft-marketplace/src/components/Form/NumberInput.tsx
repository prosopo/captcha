import React, { FC } from 'react';
import CurrencyInput from 'react-currency-input-field';
import FormItemWrapper, { Props as FormItemWrapperPops } from './FormItemWrapper';

type Props = {
  title?: string;
  placeholder?: string;
  type: 'currency' | 'percent' | 'quantity';
  options?: any; // TODO update to validation rules
  currencies?: string[];
  allowDecimals?: boolean;
  disabled?: boolean;
} & FormItemWrapperPops<any>;

const NumberInput: FC<Props> = ({
  name,
  type,
  placeholder,
  form,
  title,
  currencies,
  options,
  allowDecimals,
  helperText,
  disabled = false,
}) => (
  <FormItemWrapper form={form} name={name} label={title} helperText={helperText}>
    <div className="mt-1">
      <CurrencyInput
        allowDecimals={type !== 'quantity' && allowDecimals}
        decimalsLimit={10}
        placeholder={placeholder}
        {...form.register(name, options)}
        type="text"
        disabled={disabled}
        name={name}
        allowNegativeValue={false}
        className="block w-full text-white border-gray-600 rounded-md shadow-sm bg-secondary focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
      {type === 'percent' && (
        <div className="absolute inset-y-0 right-0 pr-3 pointer-events-none top-2">
          <div
            className="inline-flex items-center px-2 font-sans text-sm font-medium text-gray-400 rounded"
            aria-hidden="true"
          >
            %
          </div>
        </div>
      )}
      {type === 'currency' && currencies && (
        <div className="absolute inset-y-0 items-center top-px right-2">
          <select
            disabled={disabled}
            className="inline-flex items-center font-sans text-sm font-medium text-gray-400 border-0 border-none rounded bg-secondary"
            {...form.register(`${name}-currency`, options)}
          >
            {currencies.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  </FormItemWrapper>
);

export default NumberInput;
