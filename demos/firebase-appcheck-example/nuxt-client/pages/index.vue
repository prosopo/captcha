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
  <div class="container">
    <h1>Firebase App Check with Procaptcha</h1>
    <p class="subtitle">Privacy-focused bot protection for your Firebase backend</p>
    
    <div v-if="!isVerified" class="verification-section">
      <p>Please complete the verification to access protected resources:</p>
      <ProcaptchaAppCheck 
        @verified="handleVerified"
        @error="handleError"
      />
    </div>

    <div v-else class="protected-content">
      <div class="success-icon">✓</div>
      <h2>Verified!</h2>
      <p>You can now access protected Firebase resources.</p>
      <button @click="callProtectedFunction" :disabled="isCalling">
        {{ isCalling ? 'Calling...' : 'Call Protected Cloud Function' }}
      </button>
      
      <div v-if="functionResult" class="result">
        <h3>Result:</h3>
        <pre>{{ JSON.stringify(functionResult, null, 2) }}</pre>
      </div>
    </div>

    <div v-if="error" class="error">
      <strong>Error:</strong> {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getFunctions, httpsCallable } from 'firebase/functions';

const isVerified = ref(false);
const error = ref<string | null>(null);
const functionResult = ref<any>(null);
const isCalling = ref(false);

const { $firebase } = useNuxtApp();

const handleVerified = (token: string) => {
  isVerified.value = true;
  error.value = null;
  console.log('App Check token received');
};

const handleError = (err: Error) => {
  error.value = err.message;
  isVerified.value = false;
};

const callProtectedFunction = async () => {
  try {
    isCalling.value = true;
    error.value = null;
    
    const functions = getFunctions($firebase);
    const myProtectedFunction = httpsCallable(functions, 'myProtectedFunction');
    
    // Firebase SDK will automatically include App Check token
    const result = await myProtectedFunction({ data: 'test' });
    functionResult.value = result.data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
    console.error('Function call error:', err);
  } finally {
    isCalling.value = false;
  }
};
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 10px;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 40px;
  font-size: 16px;
}

.verification-section {
  margin: 40px 0;
  text-align: center;
}

.verification-section p {
  margin-bottom: 20px;
  color: #555;
}

.protected-content {
  margin: 40px 0;
  text-align: center;
}

.success-icon {
  font-size: 64px;
  color: #4CAF50;
  margin-bottom: 20px;
}

.protected-content h2 {
  color: #333;
  margin-bottom: 10px;
}

.protected-content p {
  color: #666;
  margin-bottom: 20px;
}

.error {
  color: #d32f2f;
  margin: 20px 0;
  padding: 15px;
  background-color: #ffebee;
  border-left: 4px solid #d32f2f;
  border-radius: 4px;
}

.result {
  margin-top: 30px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  text-align: left;
}

.result h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.result pre {
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  border: 1px solid #ddd;
  font-size: 14px;
  line-height: 1.5;
}

button {
  padding: 12px 32px;
  font-size: 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin: 20px 0;
  transition: background-color 0.3s ease;
  font-weight: 500;
}

button:hover:not(:disabled) {
  background-color: #45a049;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

button:active:not(:disabled) {
  transform: translateY(1px);
}
</style>
