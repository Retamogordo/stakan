
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
class UserWalletsStatus {
  solanaBalance: number;
  arweaveWalletConnected: boolean;
  arweaveBalance: number;
  hasWinstonToStoreSession: boolean;

  constructor() {
    this.solanaBalance = 0;
    this.arweaveWalletConnected = false;
    this.arweaveBalance = 0;
    this.hasWinstonToStoreSession = false;
  }
}

function App() {
//  console.log("window.arweaveWallet: ", window.arweaveWallet);
  if (window.arweaveWallet) window.arweaveWallet.getActiveAddress()
    .then( activeAddress => {
      console.log("window.arweaveWallet, address: ", activeAddress);
    });
   // window.arweaveWallet.
  const stakanControlsRef = useRef<typeof StakanControls>(null);
  const stakePanelRef = useRef<StakePanel>(null);
  const [userWalletCtx, setUserWalletCtx] = useState<WalletContextState | null>(null)
  const [userConnectionCtx, setUserConnectionCtx] = useState<UserConnectionContextState | null>(null);

//  const [displayedBalance, setDisplayedBalance] = useState(0);
//  const [arweaveBalance, setArweaveBalance] = useState('0');
  const [signalStartSession, setSignalStartSession] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  const [userWalletsStatus, setUserWalletsStatus] = useState<UserWalletsStatus>(new UserWalletsStatus())

  const cols = 10;
  const rows = 16;
  const tiles = setupStakan(rows, cols);

  const handleBeforeSessionStarted = async () => {
    const stake = 0;
    try {
      console.log("Srart session, tiles: ", tiles);

      const user = userConnectionCtx?.user;
      const stakanState = userConnectionCtx?.stakanState;
  
      /*
      userConnectionCtx && userConnectionCtx.user && userConnectionCtx.stakanState
      
      && await stakanApi.finishGameSession(
        userConnectionCtx.user, 
        userConnectionCtx.stakanState,
        tiles.colsWithBorder,
        tiles.rowsWithBorder
        )
*/
      if (user && stakanState) {
        if (!user.gameSessionAccount) { // check for pending session
          await stakanApi.initGameSession(
            user, 
            stakanState, 
            stake,
            tiles.colsWithBorder,
            tiles.rowsWithBorder,
          );
          await user?.reloadFromChain(stakanState, user?.username)
        }

        console.log("user.gameSessionAcc: ", user?.gameSessionAccount);
        console.log("user.gameSessionAcc: ", userConnectionCtx?.user?.gameSessionAccount);

        setSignalStartSession(true);
      }
    } catch(e) {
      console.log(e);
    }
  }

  const handleSessionStarted = async (session: StakanSession) => {
    setSessionActive(true);
  }
  
  const handleSessionUpdated = async (session: StakanSession, tiles: any) => {
    const user = userConnectionCtx?.user;
    const stakanState = userConnectionCtx?.stakanState;

    if (user && stakanState) {
    }
  }

  const handleGameOver = async (tiles: any) => {
    console.log("ON GAME OVER, tiles: ", tiles);
    const user = userConnectionCtx?.user;
    const stakanState = userConnectionCtx?.stakanState;

    if (user && stakanState) {
      await stakanApi.finishGameSession(
        user, 
        stakanState,
        tiles.colsWithBorder,
        tiles.rowsWithBorder
        );
      await user?.reloadFromChain(stakanState, user?.username)

      console.log("user.gameSessionAcc: ", user?.gameSessionAccount);
      console.log("user.gameSessionAcc: ", userConnectionCtx?.user?.gameSessionAccount);
    }
    setSessionActive(false);

//    if (stakePanelRef.current) stakePanelRef.current.visible = true;
  }

  const handleDeleteUser = async () => {
    userConnectionCtx && userConnectionCtx.user && userConnectionCtx.stakanState
    && await stakanApi.forceDeleteUser(userConnectionCtx.user, userConnectionCtx.stakanState) 
  }
    
  const handleUserChanged = (loggedUserConnetctionCtx: UserConnectionContextState) => {
    console.log("handleUserChanged -> user: ", loggedUserConnetctionCtx);

    setUserConnectionCtx(loggedUserConnetctionCtx);
  }

  useEffect(() => {
//    console.log('App ->  effect: ');
  }, []);

  useEffect(() => {
      console.log("userConnectionCtx?.user->useEffect: ");

    (async () => {
      const user = userConnectionCtx?.user;

      const userBalance = await user?.getBalance();
      
//      setDisplayedBalance(userBalance ? userBalance : 0);
      
//      user?.isArweaveWalletConnected();

//      console.log("App->userBalance: ", userBalance);
//      try {
        const arweaveConnected = !!user && await user?.isArweaveWalletConnected()
//        await userConnectionCtx?.user?.arweaveAirdrop('1');
    
        const arBalance = arweaveConnected 
          ? await user?.getArweaveBalance()
          : 0;
        const hasWinstonToStoreSession = !!user && await user?.hasWinstonToStoreSession();
//        setArweaveBalance(arBalance ? arBalance : '0');
//      } catch (e) {
//        console.log("ARWEAVE NOT CONNECTED");
//        setArweaveBalance('0');

        setUserWalletsStatus((prevUserWalletsStatus) => {
          prevUserWalletsStatus.solanaBalance = userBalance ? userBalance : 0;
          prevUserWalletsStatus.arweaveWalletConnected = arweaveConnected;
          prevUserWalletsStatus.arweaveBalance = arBalance ? arBalance : 0;
          prevUserWalletsStatus.hasWinstonToStoreSession = hasWinstonToStoreSession;
          return prevUserWalletsStatus;
        })
  
//      }
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
        <div className='left-panel'>
          <WalletConnectionProvider 
            loggedUserChanged={handleUserChanged}
          />
          <div>
            Balance {userWalletsStatus.solanaBalance}
          </div>
          <div>
            Arweave Balance {userWalletsStatus.arweaveBalance}
          </div>
        </div>

        <div className="stakan-wrapper">
          <StakePanel 
            visible={!sessionActive}
            startButtonLabel={
              userConnectionCtx?.user?.gameSessionAccount ? 'Resume' : 'Start'
            }
            startButtonDisabled={!userWalletsStatus.hasWinstonToStoreSession}
            onStartSessionClick={handleBeforeSessionStarted}
            onDeleteUserClick={handleDeleteUser}
          />   

          <StakanControls 
            cols={cols}
            rows={rows}
            startSession={signalStartSession}
            onSessionStarted={handleSessionStarted}
            onSessionUpdated={handleSessionUpdated}
            onGameOver={handleGameOver}
          />       
        </div>

        <div className="side" >
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
