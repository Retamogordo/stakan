
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import './App.css';
import {StakanControls, StakanSession} from './StakanControls';
import StakePanel from './StakePanel'
import * as stakanApi from './stakanSolanaApi'
import {UserConnectionContextState} from './UseLoginUser'
import { setupStakan } from './stakanLogic'
import { LogTerminal } from './LogTerminal'
import { UseLogTerminal } from './UseLogTerminal';
import { UserWalletsPanel, UserWalletsStatus } from './UserWalletsPanel';

function App() {  
  const [userConnectionCtx, setUserConnectionCtx] = useState<UserConnectionContextState | null>(null);

  const [signalStartSession, setSignalStartSession] = useState(false);
  const [signalUserWalletsStatus, setSignalUserWalletsStatus] = useState(false);
  const [rewardBalance, setRewardBalance] = useState(0);

  const [sessionActive, setSessionActive] = useState(false);
  const [userWalletsStatus, setUserWalletsStatus] = useState<UserWalletsStatus>(new UserWalletsStatus())
  const [loadingMode, setLoadingMode] = useState(false);
  const [pollTimer, setPollTimer] = useState<NodeJS.Timer | null>(null);
  
  const logCtx = UseLogTerminal({log: ''}); 

  const cols = 10;
  const rows = 16;
  const tiles = setupStakan(rows, cols);

  const handleBeforeSessionStarted = async () => {
    const stake = 1;
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
            logCtx,
          );
          await user?.reloadFromChain(stakanState, user?.username)
        }

//        await updateUserWalletsStatus();
        setSignalUserWalletsStatus(true);

        console.log("user.gameSessionAcc: ", user?.gameSessionAccount);

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
  }

  const handleGameOver = async (session: StakanSession, tiles: any) => {
    const user = userConnectionCtx?.user;
    const stakanState = userConnectionCtx?.stakanState;

    setSessionActive(false);
    setLoadingMode(true);

    try {
      if (user && stakanState) {
        await stakanApi.finishGameSession(
          user, 
          stakanState,
          logCtx,
          session.score,
          tiles.colsWithBorder,
          tiles.rowsWithBorder
          );
        await user?.reloadFromChain(stakanState, user?.username);

        setSignalUserWalletsStatus(true);
      }
    } catch(e) {
      setLoadingMode(false);
      throw e;
    }
    setLoadingMode(false);
  }

  const handleDeleteUser = async () => {
    userConnectionCtx && userConnectionCtx.user && userConnectionCtx.stakanState
    && await stakanApi.forceDeleteUser(userConnectionCtx.user, userConnectionCtx.stakanState) 
  }
    
  const handleUserConnectionChanged = (loggedUserConnetctionCtx: UserConnectionContextState,) => {
//    console.log("handleUserChanged -> user: ", loggedUserConnetctionCtx);
    setUserConnectionCtx(loggedUserConnetctionCtx);
  }

  const handleUserWalletsStatusChanged = (userWalletsSt: UserWalletsStatus) => {
    setUserWalletsStatus(userWalletsSt);
  }

  const pollChain = () => {
    userConnectionCtx?.stakanState?.getRewardFundBalance()
      .then( balance => {
//    console.log(balance?.value.uiAmount);
        setRewardBalance(balance?.value.uiAmount ? balance?.value.uiAmount : 0)
      });

    if (userConnectionCtx?.stakanState?.program) {
      stakanApi.queryActiveUsers(userConnectionCtx?.stakanState?.program)
        .then( users => {
          //console.log(users);

          users.forEach(async userWithAccPubkeyPromise => {
            const userWithAccPubkey = userWithAccPubkeyPromise;
            if (userWithAccPubkey) {
              const [accPubkey, userAccount] = userWithAccPubkey;
            
              console.log(userAccount['username'])            
            }
          }
          )
        });
    }
  }

  useEffect(() => {
    if (userConnectionCtx?.stakanState) {
      !pollTimer && setPollTimer(setInterval(pollChain, 2000))
    } else {
      clearInterval(pollTimer ? pollTimer : undefined);
      setPollTimer(null);
    }
    return () => clearInterval(pollTimer ? pollTimer : undefined);
  }, [userConnectionCtx?.stakanState]);

  useEffect(() => {
    setSignalUserWalletsStatus(true);
  }, [userConnectionCtx?.user]);

  useEffect(() => {
    if (signalStartSession) {
      setSignalStartSession(false);
    } 
  }, [signalStartSession]);

  useEffect(() => {
    if (signalUserWalletsStatus) {
      setSignalUserWalletsStatus(false);
    } 
  }, [signalUserWalletsStatus]);

  return (
    <div className="App">
      <div className="main-wrapper">
        <UserWalletsPanel 
          update={signalUserWalletsStatus} 
          logCtx={logCtx}
          onUserConnectionChanged={handleUserConnectionChanged}
          onUserWalletsStatusChanged={handleUserWalletsStatusChanged}
        />

        <div className="stakan-wrapper">
          <StakePanel 
            visible={!sessionActive}
            startButtonLabel={
              userConnectionCtx?.user?.gameSessionAccount ? 'Resume' : 'Stake 1 & Start'
            }
            startButtonDisabled={
              !userWalletsStatus.hasWinstonToStoreSession
              || userWalletsStatus.tokenBalance <= 0
            }
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

        <div className="right-panel">
          <div>
            Reward Fund balance {rewardBalance}
          </div>
          <div>
            Estimated Winner Reward {(() => {
              const stake = 1; // supposing that stake is always 1
              return Math.floor(rewardBalance/2 - stake);
            })()}
          </div>
        </div>

      </div>
      
      <LogTerminal ctx={logCtx}/>

      <footer className="main-footer">
        sdfdsafsafdsa
      </footer>
    </div>
  );
}

export default App;
