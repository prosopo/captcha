import React, { FC } from 'react';
import FormItemWrapper, { Props as FormItemWrapperPops } from './FormItemWrapper';

type Props = {
  label: string;
  placeholder?: string;
  type?: string;
  options?: any; // TODO update to validation rules
} & FormItemWrapperPops<any>;

const TextInput: FC<Props> = (props) => {
  const { name, type = 'text', placeholder, form, options } = props;
  return (
    <FormItemWrapper {...props}>
      <div className="mt-1">
        <input
          {...form.register(name, options)}
          placeholder={placeholder}
          type={type}
          name={name}
          className="block w-full text-white border-gray-600 shadow-sm bg-secondary focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        />
      </div>
    </FormItemWrapper>
  );
};

export default TextInput;
