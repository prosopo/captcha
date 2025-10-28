<!--
Copyright 2021-2025 Prosopo (UK) Ltd.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <div class="procaptcha-container">
    <div v-if="loading" class="loading">
      Verifying...
    </div>
    <Procaptcha
      v-else
      :config="procaptchaConfig"
      @verify="handleVerify"
      @error="handleError"
      @expired="handleExpired"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Procaptcha } from '@prosopo/procaptcha-vue';
import type { ProcaptchaOutput, ProcaptchaClientConfigOutput } from '@prosopo/types';

const config = useRuntimeConfig();
const customProviderUrl = config.public.customProviderUrl;
const loading = ref(false);

// Procaptcha configuration
const procaptchaConfig = computed<ProcaptchaClientConfigOutput>(() => ({
  account: {
    address: config.public.prosopoSiteKey,
  },
  siteKey: config.public.prosopoSiteKey,
  theme: 'light',
  callbackName: 'onProcaptchaVerify',
}));

// Custom provider token exchange function
const exchangeTokenForAppCheck = async (procaptchaToken: string) => {
  try {
    const response = await fetch(`${customProviderUrl}/verify-captcha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: procaptchaToken,
        ip: '', // Optional: can be added if needed
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error exchanging token:', error);
    throw error;
  }
};

// Event handlers
const emit = defineEmits<{
  (e: 'verified', token: string): void;
  (e: 'error', error: Error): void;
}>();

const handleVerify = async (output: ProcaptchaOutput) => {
  try {
    loading.value = true;
    console.log('Procaptcha verified:', output);
    
    // Exchange Procaptcha token for Firebase App Check token
    const result = await exchangeTokenForAppCheck(output.token);
    
    if (result.verified && result.appCheckToken) {
      // Store the App Check token for use in Firebase requests
      sessionStorage.setItem('appCheckToken', result.appCheckToken);
      sessionStorage.setItem('appCheckTokenExpiry', (Date.now() + result.ttl).toString());
      
      emit('verified', result.appCheckToken);
    } else {
      throw new Error('Token exchange failed');
    }
  } catch (error) {
    console.error('Verification error:', error);
    emit('error', error as Error);
  } finally {
    loading.value = false;
  }
};

const handleError = (error: Error) => {
  console.error('Procaptcha error:', error);
  emit('error', error);
};

const handleExpired = () => {
  console.log('Procaptcha expired');
  // Clear stored tokens
  sessionStorage.removeItem('appCheckToken');
  sessionStorage.removeItem('appCheckTokenExpiry');
};
</script>

<style scoped>
.procaptcha-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  min-height: 200px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #666;
}
</style>
