// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useEffect } from 'react';
import { ProcaptchaComponent } from '@prosopo/react-procaptcha-wrapper';

interface ProcaptchaProviderProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  children: React.ReactNode;
}

export const ProcaptchaProvider: React.FC<ProcaptchaProviderProps> = ({
  siteKey,
  onSuccess,
  onError,
  children,
}) => {
  useEffect(() => {
    console.log('ProcaptchaProvider initialized with siteKey:', siteKey);
  }, [siteKey]);

  const handleCallback = (token: string) => {
    console.log('Procaptcha success callback received token:', token);
    onSuccess(token);
  };

  const handleErrorCallback = (error?: string) => {
    console.error('Procaptcha error callback:', error);
    onError(error || 'Procaptcha verification failed');
  };

  const handleExpiredCallback = () => {
    console.log('Procaptcha expired callback');
    onError('Procaptcha token expired');
  };

  return (
    <div>
      {/* Invisible Procaptcha component */}
      <ProcaptchaComponent
        siteKey={siteKey}
        size="invisible"
        callback={handleCallback}
        error-callback={handleErrorCallback}
        expired-callback={handleExpiredCallback}
        htmlAttributes={{
          id: "procaptcha-container",
          className: "hidden"
        }}
      />
      {children}
    </div>
  );
};
