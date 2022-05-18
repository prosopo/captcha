import Navbar from 'components/Navbar/Navbar';
import { AppProps } from 'next/app';
import React, { FC } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { WalletProvider } from 'wallet/state';
import '../styles/global.css';

const queryClient = new QueryClient({});

const App: FC<AppProps> = ({ Component, pageProps }: AppProps) => {
  return (
    <WalletProvider>
      <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
      <style>model-viewer {'{height:100%;max-height:100%;}'}</style>

      <QueryClientProvider client={queryClient}>
        <Navbar />
        <Component {...pageProps} />
      </QueryClientProvider>
    </WalletProvider>
  );
};
export default App;
