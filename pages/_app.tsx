import '@/styles/base.css';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { chains, publicClient, webSocketPublicClient } from '@/config/wallet';
import { RainbowKitProvider, connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { WagmiConfig, createConfig } from 'wagmi';
import '@rainbow-me/rainbowkit/styles.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const projectId = '9bf3510aab08be54d5181a126967ee71';
const { wallets } = getDefaultWallets({
  projectId,
  appName: 'greenfield js sdk demo',
  chains,
});

const connectors = connectorsForWallets([
  ...wallets,
]);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  webSocketPublicClient,
  publicClient,
});


function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider modalSize="compact" chains={chains}>
          <main className={inter.variable}>
            <Component {...pageProps} />
          </main>
        </RainbowKitProvider>
      </WagmiConfig>
    </>
  );
}

export default MyApp;
