import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import React, { FC, useCallback } from 'react';
import { devNetProgram } from './confProgram'
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import * as stakanApi from "../src/stakanSolanaApi";

//export const SendOneLamportToRandomAddress: FC = () => {
export const StakeButton = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, wallet } = useWallet();
    const anchorWallet = useAnchorWallet();

    console.log("Connection: ", connection.rpcEndpoint);

    const onClick = useCallback(async () => {
        if (!publicKey) throw new WalletNotConnectedError();
//        if (!publicKey) throw 'Wallet Pubkey is undefined';

        const network = WalletAdapterNetwork.Devnet;
        const endpoint = clusterApiUrl(network);

        if (anchorWallet) {
            const stakanProgram = devNetProgram(endpoint, anchorWallet);
            console.log(stakanProgram);
            console.log("searching stakan global state on chain...");
            
            let stakanState = await stakanApi.findOnChainStakanAccount(stakanProgram);
          
            console.log(stakanState);

            if (!stakanState) {
              console.log("not found, trying to initialize stakan global state...");
          
              await stakanApi.setUpStakan(stakanProgram);
            
              stakanState = await stakanApi.findOnChainStakanAccount(stakanProgram);
              if (!stakanState) {
                console.log("Failed to set up stakan global state, exitting");
                
                throw "Failed to set up stakan global state";
              }
            }
        }
        
/*
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: Keypair.generate().publicKey,
                lamports: 1,
            })
        );

        const signature = await sendTransaction(transaction, connection);

        await connection.confirmTransaction(signature, 'processed');
        */
    }, [publicKey, sendTransaction, connection]);

    return (
        <button onClick={onClick} disabled={!publicKey}>
            Send 1 lamport to a random address!
        </button>
    );
};