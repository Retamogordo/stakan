
import { web3, BN, Program, Wallet, Provider } from "@project-serum/anchor";
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import './App.css';
import StakanControls from './StakanControls';
import StakePanel from './StakePanel'
import RecordPanel from './RecordPanel'
import { WalletConnectionProvider } from './WalletConnectionProvider';
import { StakeButton } from './WalletAdapter';
import { Connection } from '@solana/web3.js'
import * as StakanApi from './stakanSolanaApi'
import { IDL, Stakan } from './idl/stakan'
//import { localNetProgram } from './confProgram'
import { useConnection, useWallet, 
  useAnchorWallet, AnchorWallet, 
  ConnectionContextState, WalletContextState } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { devNetProgram } from './confProgram'
import * as stakanApi from './stakanSolanaApi'
import  ArweaveConnectionProvider  from './ArweaveConnectionProvider'
import Arweave from 'arweave'
//import * as ArConnect from 'arconnect'
//import { ArjsProvider, useArjs } from 'arjs-react'


function App() {
  console.log("window.arweaveWallet: ", window.arweaveWallet);
  if (window.arweaveWallet) window.arweaveWallet.getActiveAddress()
    .then( activeAddress => {
      console.log("window.arweaveWallet, address: ", activeAddress);
    });

  const stakanControlsRef = useRef<typeof StakanControls>(null);
  const stakePanelRef = useRef<StakePanel>(null);
  const [stakanProgram, setStakanProgram] = useState<Program<Stakan> | null>(null);
  const [userWalletCtx, setUserWalletCtx] = useState<WalletContextState | null>(null)
  const [anchorWallet, setanchorWallet] = useState<AnchorWallet | null>(null)
//  const [sessionStarted, setSessionStarted] = useState(false);

  const handleStartSession = () => {
//    if (stakePanelRef.current) stakePanelRef.current.visible = false;

//    setSessionStarted(true);
//    stakanControlsRef.current.startSession();
  }

  const handleGameOver = () => {
//    setSessionStarted(false);

//    if (stakePanelRef.current) stakePanelRef.current.visible = true;
  }

  const reportConnectionChanged = (connCtx: ConnectionContextState) => {
    console.log("connection endpoint -> ", connCtx.connection.rpcEndpoint);
  }

  const reportWalletChanged = (walletCtx: WalletContextState, anchorWallet: AnchorWallet) => {
    console.log("wallet ", 
      walletCtx.publicKey ? walletCtx.publicKey.toBase58() : '', 
      walletCtx.connecting ? " connecting..." 
      : 
      walletCtx.connected ? " connected" : " disconnected" 
    );
    setUserWalletCtx(walletCtx);
  }

  const reportProgramChanged = (program: Program<Stakan> | null) => {

    if (program !== null) {
      console.log("program id -> ", program.programId.toBase58());
  
      stakanApi.findOnChainStakanAccount(program)
        .then((stakanState) => {
          if (stakanState) {
            console.log("stakan state account located, pubkey -> ", stakanState.pubKey.toBase58());          

//            const arweave = Arweave.init({});

            const arweave = Arweave.init({
              host: 'localhost',
              port: 1984,
              protocol: 'http',
              timeout: 20000,
              logging: false,
            });
            
          
//            if (anchorWallet !== null) { 
      
              stakanApi.loginUser(
                program.provider.wallet as Wallet, 
                stakanState, 
                arweave,
                undefined, // arweave wallet - will assing 'use_wallet' internally
//                255, // todo: set bump
              )
              .then((user) => {
                console.log("After login user: ", user);
                if (user) {
                  console.log("Before signing out");
                  stakanApi.signOutUser(user as stakanApi.User, stakanState)
                    .then( () => console.log("User signed out") );
                }  
                else {
                  console.log("Trying to sign up user... ");

                  const currUser = new stakanApi.User(
                    "spiderman", 
                    program,
                    program.provider.wallet as Wallet,
                    arweave,
                    undefined
                  );
                  console.log("currUser wallet: ", currUser.wallet.publicKey.toBase58());

                  stakanApi.signUpUser(currUser, stakanState)
                    .then( () => {
                      
                      console.log("Logging in after user signed up... ");

                      stakanApi.loginUser(
                        program.provider.wallet as Wallet, 
                        stakanState, 
                        arweave,
                        undefined, // arweave wallet - will assign 'use_wallet' internally
//                        currUser.bump as number, 
                      )
                      .then( user => {
                          console.log("After login user: ", user)

                          stakanApi.signOutUser(user as stakanApi.User, stakanState);
                        }
                      )

                    });
                }
              });
              
//            }
            
          } else {
            console.log("stakan state account not found on chain", );
          }
        })

    }
    setStakanProgram(program);
  }

  const handleArweaveAddressGenerated = (address: string) => {
    let user:  stakanApi.User | null;

    if (stakanProgram !== null) {
//      user = new stakanApi.User("𝖠Β𝒞𝘋𝙴𝓕ĢȞỈ𝕵ꓗʟ𝙼ℕ", stakanProgram, 
//        userWallet, arweave, arweaveWallet, arweaveStorageAddress);
    }

  }

/*
  useEffect(() => {
    console.log('App -> sessionStarted effect: ', sessionStarted);
  //  if (stakePanelRef.current !== null) stakePanelRef.current.visible = !sessionStarted;
  }, [sessionStarted]);
//  <StakePanel ref={stakePanelRef} onStartSessionClick={handleStartSession}/>   
*/
/*
<ArweaveConnectionProvider 
onAddressGenerated={handleArweaveAddressGenerated}
/>
*/
  return (
    <div className="App">
      <div className="main-wrapper">
        <div className='left-panel'></div>
        <StakanControls onGameOver={handleGameOver} />       
        <div className="side" >
          <WalletConnectionProvider 
            onConnectionChanged={reportConnectionChanged}
            onWalletChanged={reportWalletChanged}
            onProgramChanged={reportProgramChanged}
          />
        </div>

      </div>
      
      <div className="output_terminal_container">
        <textarea id="output_terminal">
        </textarea>
      </div>  

      <footer className="main-footer">
        sdfdsafsafdsa
      </footer>
    </div>
  );

}

export default App;
