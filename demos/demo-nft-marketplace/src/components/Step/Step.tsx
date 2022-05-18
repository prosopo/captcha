import { CheckCircle, ExclamationCircleIcon, SpinnerIcon } from 'assets';
import Button, { ButtonType } from 'components/Button';
import React, { FC } from 'react';

export enum StepState {
  UNDEFINED = 'UNDEFINED',
  FINISHED = 'FINISHED',
  FAILED = 'FAILED',
  ONGOING = 'ONGOING',
}
export type Props = {
  title: string;
  description?: string;
  retryAction?: () => void;
  stepState?: StepState;
  errorMessage?: string;
};

const Step: FC<Props> = ({ stepState, title, description, retryAction, errorMessage }) => {
  return (
    <div className="flex flex-col">
      <div className="flex">
        {stepState === StepState.UNDEFINED && <div className="p-8" />}
        {stepState === StepState.FINISHED && <img className="inline p-1 " src={CheckCircle} />}
        {stepState === StepState.FAILED && <ExclamationCircleIcon className="h-16" />}
        {stepState === StepState.ONGOING && <img className="inline h-16 animate-spin" src={SpinnerIcon} />}
        <div className="flex flex-col">
          <div className="text-lg font-bold text-white">{title}</div>
          <div className="text-gray-700 ">{description}</div>
        </div>
      </div>
      {stepState === StepState.FAILED && retryAction && (
        <Button type={ButtonType.Primary} fullWidth title="Try again" onClick={retryAction} />
      )}
      {stepState === StepState.FAILED && errorMessage && (
        <div className="pl-3 text-transparent bg-clip-text bg-gradient-to-b from-primary-start to-primary-stop">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default Step;
