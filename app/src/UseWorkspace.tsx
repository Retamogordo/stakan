import { useEffect, useState } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import * as stakanApi from "./stakanSolanaApi";
//import { devNetProgram } from './confProgram'
import { Connection, clusterApiUrl, ConfirmOptions } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Program, Provider } from "@project-serum/anchor";
//import { program } from '@project-serum/anchor/dist/cjs/spl/token';
import { IDL, Stakan } from './idl/stakan'

const InitWorkspace = () => {
    const [stakanProgram, setStakanProgram] = useState<Program<Stakan> | null>(null);
    const anchorConnection = useConnection();
    const walletCtx = useWallet();
    const anchorWallet = useAnchorWallet();

    console.log("Connection: ", anchorConnection.connection.rpcEndpoint);
    console.log("wallet pubkey: ", walletCtx.publicKey);
    console.log("anchorWallet: ", anchorWallet);

    useEffect(() => {
        if (walletCtx.publicKey && anchorWallet) {
    //        const network = WalletAdapterNetwork.Devnet;
    //        const endpoint = clusterApiUrl(network);
            const connection = new Connection(anchorConnection.connection.rpcEndpoint, 'confirmed');
            const opts: ConfirmOptions = {
                commitment: 'processed',
                preflightCommitment: "max",
                skipPreflight: false
            };
            const provider = new Provider(connection, anchorWallet, opts);

            const program = new Program<Stakan>(
                IDL, 
                "C5WmRvAk9BBWyg3uSEZ4EHtrNVn7jZu7qgykckXxLekx",
                provider
            );

            setStakanProgram(program);
        
    //        const stakanProgram = devNetProgram(anchorConnection.endpoint, anchorWallet);

        } else {
    //        throw "No Anchor Wallet available";
        }
    },
    [walletCtx.publicKey, anchorWallet]);

    return (
        <div>

        </div>
    )
};

export default InitWorkspace;