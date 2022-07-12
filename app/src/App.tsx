
import React, { useState, useRef, useEffect, useCallback, useMemo, SetStateAction } from 'react'
import './App.css';
import {StakanControls, StakanSession} from './StakanControls';
import StakePanel from './StakePanel'
import { RightPanel } from './RightPanel';
import * as stakanApi from './stakanSolanaApi'
import {UserConnectionContextState} from './UseLoginUser'
import { setupStakan } from './stakanLogic'
import { LogTerminal } from './LogTerminal'
import { UseLogTerminal } from './UseLogTerminal';
import { UserWalletsPanel, UserWalletsStatus } from './UserWalletsPanel';
import {GameSessionArchive} from './accountsSchema'

function App() {  
  const [userConnectionCtx, setUserConnectionCtx] = useState<UserConnectionContextState | null>(null);

  const [signalStartSession, setSignalStartSession] = useState(false);
  const [signalUserWalletsStatus, setSignalUserWalletsStatus] = useState(false);
  const [signalUpdateRightPanel, setSignalUpdateRightPanel] = useState(false);

  const [sessionActive, setSessionActive] = useState({active: false, staked: false});
  const [userWalletsStatus, setUserWalletsStatus] = useState<UserWalletsStatus>(new UserWalletsStatus())
  const [loadingMode, setLoadingMode] = useState(false);
  const [greetWinnerMode, setGreetWinnerMode] = useState(false);
  const [resumedSession, setResumedSession] = useState<StakanSession | null>(null);
  const [archivedSession, setArchivedSession] = useState<GameSessionArchive | null>(null);
  const [stakanWidthBiggerThanHalf, setStakanWidthBiggerThanHalf] = useState(false);
  const [rewardBalance, setRewardBalance] = useState(0);
  
  const logCtx = UseLogTerminal({log: ''}); 

  const cols = 10;
  const rows = 16;
  const tiles = setupStakan(rows, cols);

  const handleBeforeSessionStarted = async (stakeValue: number) => {
    try {
      console.log("Srart session, stake: ", stakeValue);

      setGreetWinnerMode(false);

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

      if (user && stakanState && userConnectionCtx.arweave) {
        if (!user.gameSessionAccount) { // check for pending session
          await stakanApi.initGameSession(
            user, 
            stakanState, 
            userConnectionCtx.arweave,
            stakeValue,
            logCtx,
          );
          await user?.reloadFromChain(stakanState, user?.username)

          setResumedSession(null);

        } else {
          const sessionJSON = localStorage.getItem("stakanSession");
          if (!sessionJSON) {
            // cannot resume interrupted session -> need to
            // call finishGameSession to charge stake and unlock UI
            logCtx.log("cannot load session from local storage, cancelling...")
            try {
              await stakanApi.cancelBrokenSession(user, stakanState, logCtx);
            } catch {
              logCtx.logLn("failed, stale account " +  
                user.gameSessionAccount.toBase58() + "still hangs on-chain");
            }
            logCtx.logLn("done");
          } else {
            const storedSessionShallow = StakanSession.fromJson(sessionJSON);

            setResumedSession(storedSessionShallow);
          }
        }
        setSignalUserWalletsStatus(true);
        setSignalStartSession(true);
      }
    } catch(e) {
      console.log(e);
    }
    setLoadingMode(false);
  }

  const handleSessionStarted = async (session: StakanSession) => {
    if (!sessionActive.active) // check if this session is already started as free session
      setSessionActive({active: true, staked: true});
  }
  
  const handleSessionUpdated = async (session: StakanSession, tiles: any) => {
    const sessionJson = JSON.stringify(session);

    localStorage.setItem("stakanSession", sessionJson);
  }

  const handleGameOver = async (session: StakanSession, tiles: any) => {
    const user = userConnectionCtx?.user;
    const stakanState = userConnectionCtx?.stakanState;
    const currStaked = sessionActive.staked;

    setSessionActive({active: false, staked: false});
    
    if (currStaked) {
      setLoadingMode(true);

      try {
        if (user && stakanState && userConnectionCtx.arweave) {
          await stakanApi.finishGameSession(
            user, 
            stakanState,
            session,
            userConnectionCtx.arweave,
            tiles,
            logCtx,
            );
          await user?.reloadFromChain(stakanState, user?.username);

          setSignalUserWalletsStatus(true);
          setSignalUpdateRightPanel(true);
        }
      } catch(e) {
        setLoadingMode(false);
        throw e;
      }
      setLoadingMode(false);
      setGreetWinnerMode(true);
    }
  }

  const handleStartFreePlayStarted = () => {
    setGreetWinnerMode(false);
    setSignalStartSession(true);
    setSessionActive({active: true, staked: false});
  }

  const handleDeleteUser = async () => {
    if (userConnectionCtx && userConnectionCtx.user && userConnectionCtx.stakanState) {
      setLoadingMode(true);
      await stakanApi.forceDeleteUser(userConnectionCtx.user, userConnectionCtx.stakanState) 
      setLoadingMode(false);
    }
  }

  const handleUserConnectionChanged = (loggedUserConnetctionCtx: UserConnectionContextState,) => {
//    console.log("handleUserChanged -> user: ", loggedUserConnetctionCtx);
    setUserConnectionCtx(loggedUserConnetctionCtx);
  }

  const handleUserWalletsStatusChanged = (userWalletsSt: UserWalletsStatus) => {
    setUserWalletsStatus(userWalletsSt);
  }

  const handleArchivedSessionChosen = (archSession: GameSessionArchive) => {
    setArchivedSession({...archSession});
  }

  const handleRewardBalanceRefreshed = (refreshedRewardBalance: number) => {
    setRewardBalance(refreshedRewardBalance);
  }

  const handleStakanWidthBiggerThanHalf = (isBigger: boolean) => {
    setStakanWidthBiggerThanHalf(isBigger);
  }

  const handleToggleLoadingMode = (started: boolean) => {
    setLoadingMode(started);
  }

  useEffect(() => {
  }, [userConnectionCtx?.stakanState]);

  useEffect(() => {
    const user = userConnectionCtx?.user;
    setSignalUserWalletsStatus(true);
    setSignalUpdateRightPanel(true);
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

  useEffect(() => {
    if (signalUpdateRightPanel) {
      setSignalUpdateRightPanel(false);
    } 
  }, [signalUpdateRightPanel]);

  useEffect(() => {
      console.log("useEffect->setArchivedSession: ", archivedSession)
//      setArchivedSession(null);
  }, [archivedSession]);

  return (
    <div className="App">
      <div className='app-wrapper'>
        <div className="main-area-wrapper">
          <UserWalletsPanel 
            update={signalUserWalletsStatus} 
            logCtx={logCtx}
            cols={tiles.colsWithBorder}
            rows={tiles.rowsWithBorder}
            onUserConnectionChanged={handleUserConnectionChanged}
            onUserWalletsStatusChanged={handleUserWalletsStatusChanged}
            onDeleteUserClick={handleDeleteUser}
            toggleLoadingMode={handleToggleLoadingMode}
          />

          <div className="stakan-wrapper">
            <StakePanel 
              visible={!sessionActive.active}
              userConnectionCtx={userConnectionCtx}
              userWalletsStatus={userWalletsStatus}
              loadingMode={loadingMode}
              greetWinnerMode={greetWinnerMode}
              rewardBalance={rewardBalance}
              onStartSessionClick={handleBeforeSessionStarted}
              onStartFreePlayClick={handleStartFreePlayStarted}
            />   

            <StakanControls 
              cols={cols}
              rows={rows}
              startSession={signalStartSession}
              resumedSession={resumedSession}
              archivedSession={archivedSession}
              onSessionStarted={handleSessionStarted}
              onSessionUpdated={handleSessionUpdated}
              onGameOver={handleGameOver}
              onStakanWidthBiggerThanHalf={handleStakanWidthBiggerThanHalf}
            />       
          </div>
          { !stakanWidthBiggerThanHalf     
            ? <RightPanel 
                update={signalUpdateRightPanel} 
                userConnectionCtx={userConnectionCtx}
                logCtx={logCtx}
                enabled={!sessionActive.active}
                onArchivedSessionChosen={handleArchivedSessionChosen}
                onGlobalStateRefreshed={handleRewardBalanceRefreshed}
              />
            : null
          }
        </div>
        
        <LogTerminal ctx={logCtx}/>
      </div>

    </div>
  );
}

export default App;
