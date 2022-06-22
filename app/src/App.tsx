
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
import { findOnChainStakanAccount } from './stakanSolanaApi'
import  ArweaveConnectionProvider  from './ArweaveConnectionProvider'
import * as stakanApi from "../src/stakanSolanaApi";
//import { ArjsProvider, useArjs } from 'arjs-react'

function App() {


  const stakanControlsRef = useRef<typeof StakanControls>(null);
  const stakePanelRef = useRef<StakePanel>(null);
  const [stakanProgram, setStakanProgram] = useState<Program<Stakan> | null>(null);
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

  const reportWalletChanged = (walletCtx: WalletContextState) => {
    console.log("wallet ", 
      walletCtx.publicKey ? walletCtx.publicKey.toBase58() : '', 
      walletCtx.connecting ? " connecting..." 
      : 
      walletCtx.connected ? " connected" : " disconnected" 
    );
  }

  const reportProgramChanged = (program: Program<Stakan> | null) => {

    if (program !== null) {
      console.log("program id -> ", program.programId.toBase58());
  
      findOnChainStakanAccount(program)
        .then((stakanState) => {
          if (stakanState) {
            console.log("state account located, pubkey -> ", stakanState.pubKey.toBase58());
          } else {
            console.log("state account not found on chain", );
          }
        });
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
