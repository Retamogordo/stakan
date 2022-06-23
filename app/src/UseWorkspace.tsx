import { useEffect, useState } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import * as stakanApi from "./stakanSolanaApi";
//import { devNetProgram } from './confProgram'
import { Connection, clusterApiUrl, ConfirmOptions } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Program, Provider } from "@project-serum/anchor";
//import { program } from '@project-serum/anchor/dist/cjs/spl/token';
import { IDL, Stakan } from './idl/stakan'
//import { program } from '@project-serum/anchor/dist/cjs/spl/token';

const InitWorkspace = (props: any) => {
    const [stakanProgram, setStakanProgram] = useState<Program<Stakan> | null>(null);
    const anchorConnection = useConnection();
    const walletCtx = useWallet();
    const anchorWallet = useAnchorWallet();
/*
    console.log("Connection: ", anchorConnection.connection.rpcEndpoint);
    console.log("wallet pubkey: ", walletCtx.publicKey);
    console.log("anchorWallet: ", anchorWallet);
*/
    const reconnect = () => {
        if (walletCtx.publicKey && walletCtx.connected && anchorWallet) {
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
            setStakanProgram(null);
        }
    }

    useEffect(() => {
        props.onConnectionChanged && props.onConnectionChanged(anchorConnection);
    //    reconnect();
    },
    [anchorConnection.connection.rpcEndpoint]);
    
    useEffect(() => {
        props.onWalletChanged && props.onWalletChanged(walletCtx, anchorWallet);
        reconnect();
    },
    [walletCtx.connected, walletCtx.connecting]);

    useEffect(() => {
        props.onProgramChanged && props.onProgramChanged(stakanProgram);
    },
    [stakanProgram?.programId]);
    
    return (
        <div>

        </div>
    )
};

export default InitWorkspace;