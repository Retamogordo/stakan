
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
import { useConnection, useWallet, useAnchorWallet, AnchorWallet } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { devNetProgram } from './confProgram'
/*
interface AnchorWalletExtInterface extends AnchorWallet {
  readonly payer: web3.Keypair;
}
class AnchorWalletExt implements AnchorWalletExtInterface {
  readonly payer: web3.Keypair;
  constructor() {
    this.payer = undefined;
  }
}

function from(anchorWallet: AnchorWallet): AnchorWalletExt {
}
*/
function App() {
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const { publicKey, sendTransaction } = useWallet();

  const anchorWallet: AnchorWallet | undefined = useAnchorWallet();

  if (anchorWallet) devNetProgram(endpoint, anchorWallet);
/*  const rpcUrl = 'http://localhost:8899';
  const connection = new Connection(rpcUrl, 'confirmed');
  connection.getVersion().then(version => {
    console.log('Connection to cluster established:', rpcUrl, version)
  });

  const opts: web3.ConfirmOptions =  {
    commitment: 'processed',
    preflightCommitment: "max",
    skipPreflight: false
  };

  const provider = new Provider(connection, Wallet.local(), opts);

//const program = anchor.workspace.Stakan as anchor.Program<Stakan>;
  const program = new Program<Stakan>(
    IDL, 
    "StakanXf8bymj5JEgJYH4qUQ7xTtoR1W2BeHUbDjCJb",
    provider
  );
*/
/*
const program = localNetProgram();

  StakanApi.setUpStakan(program)
    .then(() => {
      StakanApi.findOnChainStakanAccount(program)
    })
    */
//    .then( stakanState => console.log(stakanState) );

//  stakanState = await stakanApi.findOnChainStakanAccount(provider.connection);
//  stakanState && console.log("done");

  
  const stakanControlsRef = useRef<typeof StakanControls>(null);
  const stakePanelRef = useRef<StakePanel>(null);
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

/*
  useEffect(() => {
    console.log('App -> sessionStarted effect: ', sessionStarted);
  //  if (stakePanelRef.current !== null) stakePanelRef.current.visible = !sessionStarted;
  }, [sessionStarted]);
//  <StakePanel ref={stakePanelRef} onStartSessionClick={handleStartSession}/>   
*/
  return (
    <div className="App">
      <div className="main-wrapper">
        <div className='left-panel'></div>
        <StakanControls onGameOver={handleGameOver} />       
        <div className="side" >
          <WalletConnectionProvider />
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
