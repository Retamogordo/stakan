import { useEffect, useState } from 'react';
import { useConnection, useWallet, useAnchorWallet, WalletContextState } from '@solana/wallet-adapter-react';
import * as stakanApi from "./stakanSolanaApi";
import { Connection, ConfirmOptions } from '@solana/web3.js';
import { Program, Provider, Wallet } from "@project-serum/anchor";
import Arweave from 'arweave'
import { IDL, Stakan } from './idl/stakan'
import { LogTerminalContext } from './UseLogTerminal';

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
    logCtx: LogTerminalContext,
): UserConnectionContextState => {
    const [stakanProgram, setStakanProgram] = useState<Program<Stakan> | null>(null);
    const [stakanState, setStakanState] = useState<stakanApi.StakanState | null>(null);
    const [arweave, setArweave] = useState<Arweave | null>(null);
    const [currUser, setCurrUser] = useState<stakanApi.User | null>(null);
    const anchorConnection = useConnection();
    const walletCtx = useWallet();
    const anchorWallet = useAnchorWallet();

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
  
            logCtx.log("retrieving stakan global state account...")
            
            console.log("retrieving stakan global state account...")
            
            const state = await stakanApi.queryStakanAccount(program);
            logCtx.logLn(state 
                ? "done, pubkey: " + state?.pubKey.toBase58() : "failed");

            setStakanState(state ? state : null);
//            if (state) {
            console.log("Arweave ", arw)
            
            setArweave(arw);
/*            } else {
                setArweave(null);
            }*/
        } else {
            setStakanProgram(null);
            setStakanState(null);
            setCurrUser(null);
            setArweave(null);
        }
    }

    const tryToLogin = async (arweave: Arweave) => {
        if (stakanProgram && stakanState) {
            logCtx.log("logging user in...");
            
            const user = await stakanApi.loginUser(
                stakanProgram.provider.wallet as Wallet, 
                stakanState, 
                arweave,
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
    
    const tryToSignUp = async (user: stakanApi.User, arweave: Arweave) => {
        logCtx.log("signing user up...");
        if (stakanState && arweave) {
            await stakanApi.signUpUser(user, stakanState);
            await tryToLogin(arweave);
        }
        logCtx.logLn("done, username " + user.username)
    }

    useEffect(() => {
        if (stakanProgram && stakanState && arweave) {
            if (!usernameToSignUp) {
                tryToLogin(arweave);
            } else {
                const user = new stakanApi.User(
                    usernameToSignUp, 
                    stakanProgram,
                    stakanProgram.provider.wallet as Wallet,
                    arweave,
                    undefined
                  );

                tryToSignUp(user, arweave);
            }
        } else {
            logout();
        }
    },
    [stakanState, usernameToSignUp, arweave]);
    
    useEffect(() => {
        if (walletCtx.connected)
            logCtx.logLn("wallet connected, pubkey " + walletCtx.publicKey?.toBase58())
        else 
            logCtx.logLn("wallet disconnected ");

        reconnect();
    },
    [walletCtx.connected]);
    
    return new UserConnectionContextState(
        currUser, 
        stakanProgram, 
        stakanState, 
        walletCtx,
        walletCtx.connected
    );
};

export default useLoginUser;