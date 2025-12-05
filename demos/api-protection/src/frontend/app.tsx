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

import React, { useState, useEffect } from 'react';
import { HotelSearch } from './components/HotelSearch';
import { HotelResults } from './components/HotelResults';
import { Header } from './components/Header';
import { ProcaptchaProvider } from './components/ProcaptchaProvider';
import type { SearchParams, Hotel } from './types';

declare global {
  interface Window {
    procaptcha?: {
      execute: () => void;
    };
  }
}

const SITE_KEY = import.meta.env.VITE_PROSOPO_SITE_KEY || '5GCP69mhanZqJqnTvaaGvJCJZWSahz6xE2c7bTGETqSB5KDK';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9234';


export const App: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [procaptchaToken, setProcaptchaToken] = useState<string | null>(null);

  // Auto-execute procaptcha for invisible mode after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      // Listen for procaptcha:execute event to trigger verification
      const handleExecute = () => {
        console.log('Auto-executing Procaptcha for invisible mode');
      };

      document.addEventListener('procaptcha:execute', handleExecute);

      // Trigger execution if procaptcha is ready
      if (window.procaptcha?.execute) {
        window.procaptcha.execute();
      }

      return () => {
        document.removeEventListener('procaptcha:execute', handleExecute);
      };
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleSearch = async (searchParams: SearchParams) => {
    if (!procaptchaToken) {
      setError('Please wait for security verification to complete');

      // Try to trigger procaptcha if not already verified
      if (window.procaptcha?.execute) {
        window.procaptcha.execute();
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...searchParams,
          procaptchaResponse: procaptchaToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed. Please try again.');
      }

      const data = await response.json();
      setHotels(data.hotels || []);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProcaptchaSuccess = (token: string) => {
    console.log('Procaptcha verification successful');
    setProcaptchaToken(token);
    setError(null);
  };

  const handleProcaptchaError = (error: string) => {
    console.error('Procaptcha verification failed:', error);
    setError(`Verification failed: ${error}`);
    setProcaptchaToken(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Find Your Perfect Stay
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Search thousands of hotels worldwide with our secure booking platform.
              Protected by Procaptcha to ensure genuine searches.
            </p>
          </div>

          {/* Search Form */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <ProcaptchaProvider
              siteKey={SITE_KEY}
              onSuccess={handleProcaptchaSuccess}
              onError={handleProcaptchaError}
            >
              <HotelSearch
                onSearch={handleSearch}
                loading={loading}
                procaptchaToken={procaptchaToken}
              />
            </ProcaptchaProvider>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-lg text-gray-700">Searching hotels...</span>
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && hasSearched && (
            <HotelResults hotels={hotels} />
          )}

          {/* Demo Information */}
          <div className="mt-16 bg-blue-50 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">
              🔒 API Protection Demo
            </h2>
            <div className="text-blue-800 space-y-3">
              <p>
                This demo showcases how Procaptcha protects APIs from automated scraping and abuse:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Invisible Protection:</strong> Procaptcha runs silently in the background
                </li>
                <li>
                  <strong>Proof-of-Work:</strong> Legitimate users complete a computational challenge
                </li>
                <li>
                  <strong>Server Validation:</strong> The backend verifies each Procaptcha token
                </li>
                <li>
                  <strong>Seamless UX:</strong> Human users experience no friction
                </li>
              </ul>
              <p className="mt-4">
                <strong>Try it:</strong> Search for hotels above. The form is protected by Procaptcha,
                but you won't notice any additional steps - it works invisibly!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
