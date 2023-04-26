import React from 'react';

const toggleReducer = (state: boolean, nextValue?: unknown) => (typeof nextValue === 'boolean' ? nextValue : !state);

function useToggle(initialValue: boolean): [boolean, (nextValue?: unknown) => void] {
  return React.useReducer<React.Reducer<boolean, unknown>>(toggleReducer, initialValue);
}

export { useToggle };
