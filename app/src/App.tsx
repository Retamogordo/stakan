
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
import { LogTerminal } from './LogTerminal'
import { UseLogTerminal } from './UseLogTerminal';

//import * as ArConnect from 'arconnect'
//import { ArjsProvider, useArjs } from 'arjs-react'
class UserWalletsStatus {
  solanaBalance: number;
  arweaveWalletConnected: boolean;
  arweaveBalance: number;
  hasWinstonToStoreSession: boolean;
  arweaveProviderConnected: boolean;

  constructor() {
    this.solanaBalance = 0;
    this.arweaveWalletConnected = false;
    this.arweaveBalance = 0;
    this.hasWinstonToStoreSession = false;
    this.arweaveProviderConnected = false;
  }
}

function App() {
  
  const stakanControlsRef = useRef<typeof StakanControls>(null);
  const stakePanelRef = useRef<StakePanel>(null);
  const [userWalletCtx, setUserWalletCtx] = useState<WalletContextState | null>(null)
  const [userConnectionCtx, setUserConnectionCtx] = useState<UserConnectionContextState | null>(null);

  const [signalStartSession, setSignalStartSession] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [userWalletsStatus, setUserWalletsStatus] = useState<UserWalletsStatus>(new UserWalletsStatus())
  const [loadingMode, setLoadingMode] = useState(false);
  
  const logCtx = UseLogTerminal({log: ''}); 

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
      setLoadingMode(true);

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

        await updateUserWalletsStatus();

        console.log("user.gameSessionAcc: ", user?.gameSessionAccount);
        console.log("user.gameSessionAcc: ", userConnectionCtx?.user?.gameSessionAccount);

        setSignalStartSession(true);
      }
    } catch(e) {
      console.log(e);
    }
    setLoadingMode(false);
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

    setSessionActive(false);
    setLoadingMode(true);

    try {
      if (user && stakanState) {
        await stakanApi.finishGameSession(
          user, 
          stakanState,
          tiles.colsWithBorder,
          tiles.rowsWithBorder
          );
        await user?.reloadFromChain(stakanState, user?.username);

        await updateUserWalletsStatus();

        console.log("user.gameSessionAcc: ", user?.gameSessionAccount);
        console.log("user.gameSessionAcc: ", userConnectionCtx?.user?.gameSessionAccount);
      }
    } catch(e) {
      setLoadingMode(false);
      throw e;
    }
    setLoadingMode(false);
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

  const updateUserWalletsStatus = async () => {
    const user = userConnectionCtx?.user;

    const userBalance = await user?.getBalance();
    
    const arweaveConnected = !!user && await user?.isArweaveWalletConnected()
    const arweaveProviderConnected = !!user && await user?.isArweaveProviderConnected()
   // const arweavePro
    const arBalance = arweaveConnected && arweaveProviderConnected 
                        ? await user?.getArweaveBalance() : 0;
    const hasWinstonToStoreSession = !!user && await user?.hasWinstonToStoreSession();

    setUserWalletsStatus((prevUserWalletsStatus) => {
      let userWalletsStatus = new UserWalletsStatus();
      
      userWalletsStatus.solanaBalance = userBalance ? userBalance : 0;
      userWalletsStatus.arweaveWalletConnected = arweaveConnected;
      userWalletsStatus.arweaveBalance = arBalance ? arBalance : 0;
      userWalletsStatus.hasWinstonToStoreSession = hasWinstonToStoreSession;
      userWalletsStatus.arweaveProviderConnected = arweaveProviderConnected;

      return userWalletsStatus;
    })
  }

  const airdropWinston = async () => {
    const user = userConnectionCtx?.user;

    if (await user?.arweaveAirdropMin()) await updateUserWalletsStatus();
  }

  useEffect(() => {
//    console.log('App ->  effect: ');
  }, []);

  useEffect(() => {
    console.log("userConnectionCtx?.user->useEffect: ", userConnectionCtx?.user?.username);

    updateUserWalletsStatus();
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
            logCtx={logCtx}
          />
          <div>
            Balance {userWalletsStatus.solanaBalance}
          </div>

          <div>
            Arweave Balance {userWalletsStatus.arweaveBalance}
            {!userWalletsStatus.hasWinstonToStoreSession 
              && userWalletsStatus.arweaveWalletConnected
              && userWalletsStatus.arweaveProviderConnected
              ? <input type='button' 
                            value={'Airdrop some winston'} 
                            onClick={airdropWinston}>
              </input>
              : userWalletsStatus.arweaveWalletConnected
                ? userWalletsStatus.arweaveProviderConnected 
                  ? null 
                  : <div>Arweave provider is disconnected. Is arlocal running ?</div>
                : <div>Arweave wallet is disconnected. Is ArConnect installed ?</div>
            }
          </div>
        </div>

        <div className="stakan-wrapper">
          <StakePanel 
            visible={!sessionActive}
            startButtonLabel={
              userConnectionCtx?.user?.gameSessionAccount ? 'Resume' : 'Start'
            }
            startButtonDisabled={!userWalletsStatus.hasWinstonToStoreSession}
            loadingMode={loadingMode}
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
      
{/*      <LogTerminal ctx={logCtx}/> */}
      <LogTerminal ctx={logCtx}/>

      <footer className="main-footer">
        sdfdsafsafdsa
      </footer>
    </div>
  );

}

export default App;
