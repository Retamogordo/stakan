import { useEffect, useState } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import * as stakanApi from "./stakanSolanaApi";
//import { devNetProgram } from './confProgram'
import { Connection, clusterApiUrl, ConfirmOptions } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Program, Provider, Wallet } from "@project-serum/anchor";
import Arweave from 'arweave'

//import { program } from '@project-serum/anchor/dist/cjs/spl/token';
import { IDL, Stakan } from './idl/stakan'
//import { program } from '@project-serum/anchor/dist/cjs/spl/token';

const InitWorkspace = (props: any) => {
    const [stakanProgram, setStakanProgram] = useState<Program<Stakan> | null>(null);
    const [stakanState, setStakanState] = useState<stakanApi.StakanState | null>(null);
    const [arweave, setArweave] = useState<Arweave | null>(null);
    const [currUser, setCurrUser] = useState<stakanApi.User | null>(null);
    const anchorConnection = useConnection();
    const walletCtx = useWallet();
    const anchorWallet = useAnchorWallet();
/*
    console.log("Connection: ", anchorConnection.connection.rpcEndpoint);
    console.log("wallet pubkey: ", walletCtx.publicKey);
    console.log("anchorWallet: ", anchorWallet);
*/
    const reconnect = async () => {
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

            const arw = Arweave.init({
                host: 'localhost',
                port: 1984,
                protocol: 'http',
                timeout: 20000,
                logging: false,
            });
  
            const state = await stakanApi.findOnChainStakanAccount(program);

            console.log("stakanState: ", state);

            setStakanState(state ? state : null);
            if (state) {
                setArweave(arw);
            } else {
                setArweave(null);
            }

    //        const stakanProgram = devNetProgram(anchorConnection.endpoint, anchorWallet);
        } else {
            setStakanProgram(null);
            setStakanState(null);
            setCurrUser(null);
            setArweave(null);
        }
    }

    const tryToLogin = async (arweave: Arweave) => {
        console.log("in tryToLogin");

        if (stakanProgram && stakanState) {
            const user = await stakanApi.loginUser(
                stakanProgram.provider.wallet as Wallet, 
                stakanState, 
                arweave,
                undefined, // arweave wallet - will assign 'use_wallet' internally
            );
    
            console.log("User: ", user);

            setCurrUser(user ? user : null);
        }
    }

    const logout = () => {
        console.log("in logout");
        setCurrUser(null);
    }
    
    const tryToSignUp = async (user: stakanApi.User, arweave: Arweave) => {
        if (stakanState && arweave) {
            await stakanApi.signUpUser(user, stakanState);
            await tryToLogin(arweave);
        }
    }

    useEffect(() => {
        props.onUserChanged && props.onUserChanged(currUser);
    },
    [currUser]);

    useEffect(() => {
        if (stakanProgram && stakanState && arweave) {
            if (!props.userToSignUp) {
                tryToLogin(arweave);
            } else {
                const currUser = new stakanApi.User(
                    props.userToSignUp, 
                    stakanProgram,
                    stakanProgram.provider.wallet as Wallet,
                    arweave,
                    undefined
                  );

                tryToSignUp(currUser, arweave);
            }
        } else {
            logout();
        }
    },
    [stakanState]);

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