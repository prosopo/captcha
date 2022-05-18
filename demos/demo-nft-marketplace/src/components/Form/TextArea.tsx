import React, { FC } from 'react';
import FormItemWrapper, { Props as FormItemWrapperPops } from './FormItemWrapper';

type Props = {
  title: string;
  placeholder?: string;
  options?: any; // TODO fix tyoe
} & FormItemWrapperPops<any>;

const TextArea: FC<Props> = ({ name, placeholder, form, title, options }) => (
  <FormItemWrapper form={form} name={name} label={title}>
    <div className="mt-1">
      <textarea
        placeholder={placeholder}
        {...form.register(name, options)}
        name={name}
        className="block w-full text-white border-gray-600 shadow-sm bg-secondary focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      />
    </div>
  </FormItemWrapper>
);

export default TextArea;
