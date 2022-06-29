
import { web3, BN, Program, Wallet, Provider } from "@project-serum/anchor";
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import './App.css';
import {StakanControls, StakanSession} from './StakanControls';
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
import {UserConnectionContextState} from './UseLoginUser'
import { setupStakan } from './stakanLogic'

//import * as ArConnect from 'arconnect'
//import { ArjsProvider, useArjs } from 'arjs-react'


function App() {
//  console.log("window.arweaveWallet: ", window.arweaveWallet);
  if (window.arweaveWallet) window.arweaveWallet.getActiveAddress()
    .then( activeAddress => {
      console.log("window.arweaveWallet, address: ", activeAddress);
    });

  const stakanControlsRef = useRef<typeof StakanControls>(null);
  const stakePanelRef = useRef<StakePanel>(null);
//  const [userToSignUp, setUserToSignUp] = useState<string | null>(null);
//  const [stakanProgram, setStakanProgram] = useState<Program<Stakan> | null>(null);
  const [userWalletCtx, setUserWalletCtx] = useState<WalletContextState | null>(null)
//  const [anchorWallet, setAnchorWallet] = useState<AnchorWallet | null>(null)
//  const [sessionStarted, setSessionStarted] = useState(false);
  const [userConnectionCtx, setUserConnectionCtx] = useState<UserConnectionContextState | null>(null);

  const [displayedBalance, setDisplayedBalance] = useState(0);
  const [arweaveBalance, setArweaveBalance] = useState('0');
  const [signalStartSession, setSignalStartSession] = useState(false);

  const cols = 10;
  const rows = 16;
  const tiles = setupStakan(rows, cols);

  const handleStartSession = () => {
//    if (stakePanelRef.current) stakePanelRef.current.visible = false;

//    setSessionStarted(true);
//    stakanControlsRef.current.startSession();
  }
  
  const handleBeforeSessionStarted = async () => {
    const stake = 0;
    try {
      console.log("Srart session, tiles: ", tiles);
/*
      userConnectionCtx && userConnectionCtx.user && userConnectionCtx.stakanState
      
      && await stakanApi.finishGameSession(
        userConnectionCtx.user, 
        userConnectionCtx.stakanState,
        tiles.colsWithBorder,
        tiles.rowsWithBorder
        )
*/
        userConnectionCtx && userConnectionCtx.user && userConnectionCtx.stakanState
        && await stakanApi.initGameSession(
          userConnectionCtx.user, 
          userConnectionCtx.stakanState, 
          stake,
          tiles.colsWithBorder,
          tiles.rowsWithBorder,
      );

      setSignalStartSession(true);

    } catch(e) {
      console.log(e);
    }
  }

  const handleDeleteUser = async () => {
    userConnectionCtx && userConnectionCtx.user && userConnectionCtx.stakanState
    && await stakanApi.forceDeleteUser(userConnectionCtx.user, userConnectionCtx.stakanState) 
  }
    
  const handleGameOver = async (tiles: any) => {
    console.log("ON GAME OVER, tiles: ", tiles);

    userConnectionCtx && userConnectionCtx.user && userConnectionCtx.stakanState
      && await stakanApi.finishGameSession(
        userConnectionCtx.user, 
        userConnectionCtx.stakanState,
        tiles.colsWithBorder,
        tiles.rowsWithBorder
        );
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

  const handleUserChanged = (loggedUserConnetctionCtx: UserConnectionContextState) => {
    console.log("handleUserChanged -> user: ", loggedUserConnetctionCtx);

    setUserConnectionCtx(loggedUserConnetctionCtx);
  }

  useEffect(() => {
//    console.log('App ->  effect: ');
  }, []);

  useEffect(() => {
    (async () => {
      const userBalance = await userConnectionCtx?.user?.getBalance();
      setDisplayedBalance(userBalance ? userBalance : 0);
//      console.log("App->userBalance: ", userBalance);
      try {
        await userConnectionCtx?.user?.arweaveAirdrop('1');
    
        const arBalance = await userConnectionCtx?.user?.getArweaveBalance();
        setArweaveBalance(arBalance ? arBalance : '0');
      } catch (e) {
        console.log("ARWEAVE NOT CONNECTED");
        setArweaveBalance('0');
      }
    })();
  }, [userConnectionCtx?.user]);
  //  <StakePanel ref={stakePanelRef} onStartSessionClick={handleStartSession}/>   

  useEffect(() => {
    if (signalStartSession) {
      setSignalStartSession(false);
    } 
  }, [signalStartSession]);
    
  return (
    <div className="App">
      <div className="main-wrapper">
        <div className='left-panel'></div>
          <div className="stakan-wrapper">
            <StakePanel 
//              visible={session===null || !session.active}
              startButtonLabel={
                userConnectionCtx?.user?.gameSessionAccount ? 'Resume' : 'Start'
              }
              onStartSessionClick={handleBeforeSessionStarted}
              onDeleteUserClick={handleDeleteUser}
            />   

            <StakanControls 
              cols={cols}
              rows={rows}
              startSession={signalStartSession}
              onGameOver={handleGameOver}
            />       
          </div>
        <div className="side" >
          <WalletConnectionProvider 
            loggedUserChanged={handleUserChanged}
          />
          <div>
            Balance {displayedBalance}
          </div>
          <div>
            Arweave Balance {arweaveBalance}
          </div>
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
