import React, { useMemo, useEffect } from 'react'

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletError } from '@solana/wallet-adapter-base';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';

import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';

import LoginProvider from './LoginProvider';

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

export const WalletConnectionProvider = (props: any) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
//    const network = WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint.
//    const endpoint = useMemo(() => clusterApiUrl(network), [network]);
    const endpoint = 'https://devnet.genesysgo.net/';


    // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
    // Only the wallets you configure here will be compiled into your application, and only the dependencies
    // of wallets that your users connect to will be loaded.
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    const handleError = (err: WalletError) => {
        props.logCtx.logLn("wallet provider failure: " + err.message);
    }

    useEffect(() => {
        props.logCtx.logLn("connecting wallet provider on " + endpoint + "...");
    },
    [props.logCtx]);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect={true} onError={handleError}>
                <WalletModalProvider>
                    <WalletMultiButton />
                    <WalletDisconnectButton />
                </WalletModalProvider>
                <LoginProvider 
                    arweaveConnection={props.arweaveConnection}
                    loggedUserChanged={props.loggedUserChanged}
                    onSigningOut={props.onSigningOut}
                    proceedSigningOut={props.proceedSigningOut}
                    toggleLoadingMode={props.toggleLoadingMode}
                    logCtx={props.logCtx}
                    endpoint={endpoint}
                    disabled={props.disabled}
                />
            </WalletProvider>
        </ConnectionProvider>
    );
};
