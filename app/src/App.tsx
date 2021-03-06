
import './App.css';
import { useState, useEffect, } from 'react'
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
import {UseArweaveConnection} from './UseArweaveConnection'

function App() {  
  const [userConnectionCtx, setUserConnectionCtx] = useState<UserConnectionContextState | null>(null);

  const [signalStartSession, setSignalStartSession] = useState(false);
  const [signalUserWalletsStatus, setSignalUserWalletsStatus] = useState(false);
  const [signalUpdateRightPanel, setSignalUpdateRightPanel] = useState(false);

  const [sessionActive, setSessionActive] = useState({active: false, staked: false});
  const [userWalletsStatus, setUserWalletsStatus] = useState<UserWalletsStatus>(new UserWalletsStatus())
  const [loadingMode, setLoadingMode] = useState(false);
  const [greetWinnerMode, setGreetWinnerMode] = useState(false);
  
  const [signingOutMode, setSigningOutMode] = useState(false);
  const [proceedSigningOut, setProceedSigningOut] = useState(false);
  
  const [resumedSession, setResumedSession] = useState<StakanSession | null>(null);
  const [archivedSession, setArchivedSession] = useState<GameSessionArchive | null>(null);
  const [stakanWidthBiggerThanHalf, setStakanWidthBiggerThanHalf] = useState(false);
  const [rewardBalance, setRewardBalance] = useState(0);

//  console.log("window.arweaveWallet #1:", window)
  
  const logCtx = UseLogTerminal({log: ''}); 
  const arweaveConnection = UseArweaveConnection({logCtx});

  const cols = 10;
  const rows = 16;
  const tiles = setupStakan(rows, cols);

  const handleBeforeSessionStarted = async (stakeValue: number) => {
    try {

      setGreetWinnerMode(false);

      const user = userConnectionCtx?.user;
      const stakanState = userConnectionCtx?.stakanState;
  
      setLoadingMode(true);

      if (user && stakanState && arweaveConnection.arweave ) {
//        if (user && stakanState && userConnectionCtx.arweave) {
        if (!user.gameSessionAccount) { // check for pending session
          await stakanApi.initGameSession(
            user, 
            stakanState, 
            arweaveConnection?.arweave,
//            userConnectionCtx.arweave,
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
        if (user && stakanState && arweaveConnection.arweave) {
          await stakanApi.finishGameSession(
            user, 
            stakanState,
            session,
            arweaveConnection.arweave,
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
  const handleSigningOut = (started: boolean) => {
    setSigningOutMode(started);
  }
  
  const handleCancelSigningOut = () => {
    setSigningOutMode(false);
  }

  const handleProceedSigningOut = () => {
    setLoadingMode(true);
    setProceedSigningOut(true);
    setSigningOutMode(false);
  }

  useEffect(() => {
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
    setProceedSigningOut(false);
  }, [proceedSigningOut]);

  return (
    <div className="App">
      <div className='app-wrapper'>
        <div className="main-area-wrapper">
          <UserWalletsPanel 
            arweaveConnection={arweaveConnection}
            update={signalUserWalletsStatus} 
            disabled={sessionActive.active || loadingMode || signingOutMode}
            logCtx={logCtx}
            cols={tiles.colsWithBorder}
            rows={tiles.rowsWithBorder}
            onUserConnectionChanged={handleUserConnectionChanged}
            onUserWalletsStatusChanged={handleUserWalletsStatusChanged}
            onSigningOut={handleSigningOut}
            proceedSigningOut={proceedSigningOut}
            onDeleteUserClick={handleDeleteUser}
            toggleLoadingMode={handleToggleLoadingMode}
          />

          <div className="stakan-wrapper">
            <StakePanel 
              arweaveConnection={arweaveConnection}
              visible={!sessionActive.active}
              userConnectionCtx={userConnectionCtx}
              userWalletsStatus={userWalletsStatus}
              loadingMode={loadingMode}
              greetWinnerMode={greetWinnerMode}
              signingOutMode={signingOutMode}
              rewardBalance={rewardBalance}
              onStartSessionClick={handleBeforeSessionStarted}
              onStartFreePlayClick={handleStartFreePlayStarted}
              onCancelSigningOut={handleCancelSigningOut}
              onProceedSigningOut={handleProceedSigningOut}
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
                arweaveConnection={arweaveConnection}
                update={signalUpdateRightPanel} 
                userConnectionCtx={userConnectionCtx}
                logCtx={logCtx}
                enabled={!sessionActive.active && !loadingMode && !signingOutMode}
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
