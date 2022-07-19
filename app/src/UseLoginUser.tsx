import { useEffect, useState } from 'react';
import { useConnection, useWallet, useAnchorWallet, WalletContextState } from '@solana/wallet-adapter-react';
import * as stakanApi from "./stakanSolanaApi";
import { Connection, ConfirmOptions, PublicKey } from '@solana/web3.js';
import { Program, Provider, Wallet } from "@project-serum/anchor";
import { IDL, Stakan } from './idl/stakan'
import idl from './idl/stakan.json'
import { LogTerminalContext } from './UseLogTerminal';
import {ArweaveConnectionContext} from './UseArweaveConnection'

export class UserConnectionContextState {
    user: stakanApi.User | null;
    stakanProgram: Program<Stakan> | null;
    stakanState: stakanApi.StakanState | null
    walletContext: WalletContextState;
    connected: boolean;

    constructor(
        user: stakanApi.User | null,
        stakanProgram: Program<Stakan> | null,
        stakanState: stakanApi.StakanState | null,
        walletContext: WalletContextState, 
        connected: boolean,
    ) {
        this.user = user;
        this.stakanProgram = stakanProgram;
        this.stakanState = stakanState;
        this.walletContext = walletContext;
        this.connected = connected;
    }
}

const useLoginUser = (
    usernameToSignUp: string | null,
    arweaveConnection: ArweaveConnectionContext,
    userSignedOut: boolean,
    logCtx: LogTerminalContext,
): UserConnectionContextState => {
    const [stakanProgram, setStakanProgram] = useState<Program<Stakan> | null>(null);
    const [stakanState, setStakanState] = useState<stakanApi.StakanState | null>(null);
    const [currUser, setCurrUser] = useState<stakanApi.User | null>(null);

    const anchorConnection = useConnection();
    const walletCtx = useWallet();
    const anchorWallet = useAnchorWallet();

    const reconnect = async () => {
        const connection = new Connection(anchorConnection.connection.rpcEndpoint, 'confirmed');
        const opts: ConfirmOptions = {
            commitment: 'confirmed',
            preflightCommitment: "max",
            skipPreflight: false
        };

        if (anchorWallet) {
            const provider = new Provider(connection, anchorWallet, opts);
            
            const program = new Program<Stakan>(
                IDL, 
                new PublicKey(idl.metadata.address), // program id
                provider
            );
            setStakanProgram(program);        

            logCtx.log("retrieving stakan global state account...")
            
            const state = await stakanApi.queryStakanAccount(program);
            logCtx.logLn(state 
                ? "done, pubkey: " + state?.pubKey.toBase58() : "failed");

            setStakanState(state ? state : null);
        }
        if (!(walletCtx.publicKey && walletCtx.connected) ) {
            setCurrUser(null);
        }
    }

    const tryToLogin = async () => {
        if (stakanProgram && stakanState) {
            logCtx.log("logging user in...");
            
            const user = await stakanApi.loginUser(
                stakanProgram.provider.wallet as Wallet, 
                stakanState, 
                // arweave wallet - will assign 'use_wallet' internally
                // to connect via ArConnect in browser mode
                undefined
            );
            user ? logCtx.logLn("done, username " + user.username) : logCtx.logLn("failed");

            setCurrUser(user ? user : null);
        }
    }

    const logout = () => {
        setCurrUser(null);
    }
    
    const tryToSignUp = async (user: stakanApi.User) => {
        logCtx.log("signing user up...");
        if (stakanState && arweaveConnection.arweave) {
            await stakanApi.signUpUser(user, stakanState, arweaveConnection.arweave);
            await tryToLogin();
        }
        logCtx.logLn("done, username " + user.username)
    }

    useEffect(() => {
        if (stakanProgram && stakanState && arweaveConnection.connected) {
            if (!usernameToSignUp || userSignedOut) {
                tryToLogin();
            } else {
                const user = new stakanApi.User(
                    usernameToSignUp, 
                    stakanProgram,
                    stakanProgram.provider.wallet as Wallet,
                    undefined // will assign 'use_wallet'
                  );

                tryToSignUp(user);
            }
        } else {
            logout();
        }
    },
    [stakanState, usernameToSignUp, userSignedOut]);
    
    useEffect(() => {
        if (walletCtx.connected)
            logCtx.logLn("wallet connected, pubkey " + walletCtx.publicKey?.toBase58())
        else 
            logCtx.logLn("wallet disconnected ");

        reconnect();
    },
    [walletCtx.connected, arweaveConnection.connected]);

    return new UserConnectionContextState(
        currUser, 
        stakanProgram, 
        stakanState, 
        walletCtx,
        walletCtx.connected,
    );
};

export default useLoginUser;