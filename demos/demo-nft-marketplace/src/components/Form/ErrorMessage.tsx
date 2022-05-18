import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ErrorMessage as OriginalErrorMessage } from '@hookform/error-message';

export type Props = {
  form: Pick<UseFormReturn, 'formState'>;
  name: string;
};

export default function ErrorMessage({ form, name }: Props): JSX.Element {
  return (
    <OriginalErrorMessage
      errors={form.formState.errors}
      name={name}
      render={(error) => <p className="mt-1 text-sm text-red-600">{error.message}</p>}
    />
  );
}
