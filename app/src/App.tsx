
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import './App.css';
import StakanView from './StakanView'
import StakePanel from './StakePanel'
import RecordPanel from './RecordPanel'
import { WalletConnectionProvider } from './WalletConnectionProvider';
import { StakeButton } from './WalletAdapter';


const ENTRY_DELAY = 700;
const STEP_DELAY = 300;
const ROTATION_DELAY = 50;
const SHORTER_DELAY = 10;

class StakanSession {
  score: number;
  linesCleared: number;
  level: number;
  stepDelay: number;

  constructor() {
    this.score = 0;
    this.linesCleared = 0;
    this.level = 0;
    this.stepDelay = STEP_DELAY;
  }

} 

function App() {
  let stakanMatrix;
  let pieceMatrix;

  const stakanRef = useRef<StakanView>(null);
  const stakePanelRef = useRef<StakePanel>(null);

  const [session, setSession] = useState<StakanSession | null>(null);
  const [keydown, setKeydown] = useState<number | null>(null);
  const [keydownDelay, setKeydownDelay] = useState<ReturnType<typeof setInterval> | null>(null);

  const [moveDelay, setMoveDelay] = useState<ReturnType<typeof setInterval> | null>(null);
  const [disableControls, setDisableControls] = useState(true);
  const [childWillRender, setChildWillRender] = useState(0);

  const rows = 16;
  const cols = 10;

  const handleKeyDown = useCallback( (event: KeyboardEvent) => {
  //    console.log("keydown: ", event.keyCode);
      setKeydown(event.keyCode);
    },
  []);

  const handleResize = useCallback( () => {
    console.log("handleResize: ");
    stakanRef.current && stakanRef.current.fitToParent()
/* 
    setDelayedCommand(prevCmd => 
      ({ tick: prevCmd.tick + 1, cmd: stakanRef.current.fitToParent })
    ) */ },
  []);
  
  const actionControl = () => {
    if (stakanRef.current === null) return;

    switch (keydown) {
      case 38:
      case 88: { // arrow up or 'x' 
        stakanRef.current.rotateCounterClockwise();
        break;
      }
      case 17:
      case 90: { // Ctrl or 'z' 
        stakanRef.current.rotateClockwise();
        break;
      }
      case 39: { // ->
        stakanRef.current.moveRight();
        break;
      }
      case 37: {// <-
        stakanRef.current.moveLeft();
        break;
      }
      case 40: {// arrow down - soft drop
        stakanRef.current.softDrop();
        break;
      }
      case 32: {// space
        stakanRef.current.hardDrop();
        break;
      }
    }
  }

  const actionKind = (keydown: number | null) => {
    switch (keydown) {
      case 38:
      case 88: 
      case 17:
      case 90:   
        return 'rotation';
      
      case 39: 
      case 37: 
      case 40: 
      case 32: 
        return 'linear'
      }
  }

  const recordsMock = [{key: 1, score: 42}, {key: 2, score: 55},]; 

  const resetMoveDelay = () => {
    moveDelay && clearInterval(moveDelay);
    setMoveDelay(null);
  }

  const resetKeydownDelay = () => {
    keydownDelay && clearTimeout(keydownDelay); 
    setKeydown(null); 
    setKeydownDelay(null);    
  }

  const setEntryDelay = () => {
//      console.log("setEntryDelay timer id:", moveDelay);  
      setDisableControls(true);    
      resetMoveDelay();
      resetKeydownDelay();

      if (stakanRef.current === null || session === null) return;

      const entryDelay = setTimeout(() => {
        clearTimeout(entryDelay);
/*   
        setSession((prevSession: StakanSession) => {
          return prevSession;
        })
*/
        stakanRef.current && stakanRef.current.pieceEntryCommand();

        setDisableControls(false); 
        setMoveDelay(setInterval(() => {

          stakanRef.current && stakanRef.current.moveDown();

        }, session.stepDelay)
        );
      }, ENTRY_DELAY);
  }

  const handleEntryNewPiece = () => {
/*    setSession((prevSession) => {
      return prevSession;
    })
*/
//    console.log("handleEntryNewPiece");
    setEntryDelay();
  }

  const handleGameOver = () => {
//    console.log("Game over: ", session);
//    console.log("Game over timer id:", moveDelay);
    
    resetMoveDelay();
    resetKeydownDelay();

    window.removeEventListener('keydown', handleKeyDown)
    
    setSession(null);
    if (stakePanelRef.current) stakePanelRef.current.visible = true;
  }

  const sendStartSession = () => {
    setSession((prevSession: StakanSession | null) => {
      if (prevSession !== null) throw 'Session already started';
      if (stakanRef.current === null) throw 'in sendStartSession stakanRef.current is null';
      if (stakePanelRef.current === null) throw 'in sendStartSession stakePanelRef.current is null';
      
      stakePanelRef.current.visible = false;
      stakanRef.current.focus();
      window.addEventListener('keydown', handleKeyDown)

      const session = newSession();      
      return session;
    })
  }
/*
  const sendStopSession = () => {
    handleGameOver(session);
  }
*/
  const newSession = (): StakanSession => {
    return new StakanSession();    
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);

//    console.log("app use effect, stakanRef: ", stakanRef.current);
    return () => {
      handleGameOver();
      window.removeEventListener('resize', handleResize);
    }
  },
  [])

  useEffect(() => {
    if (!disableControls) {
      actionControl();

      setKeydownDelay(
        setTimeout(
          () => { 
            resetKeydownDelay();
          },
          actionKind(keydown) === 'rotation' ? ROTATION_DELAY : SHORTER_DELAY
        )
      )
    }
    return () => {
      resetKeydownDelay();
//      clearTimeout(keydownDelay);
    }
  },
  [keydown])

  useEffect(() => {
    stakanRef.current && stakanRef.current.setSession(session);
    if (session === null) return;
//    console.log("session use effect, stakanRef: ", stakanRef.current, "session: ", session);
    setEntryDelay();
  },
  [session])

  useEffect(() => {
    stakanRef.current && stakanRef.current.fitToParent();
  },
  [stakanRef])

  return (
    <div className="App">
      <div className="main-wrapper">
        <div className="stakan-wrapper">
          <StakePanel ref={stakePanelRef} onStartSessionClick={sendStartSession}/>          
          <StakanView 
            ref={stakanRef}
            rows={rows} 
            cols={cols}
            sessionref={session}
            evEntryNewPiece={handleEntryNewPiece}
            willRender={() => setChildWillRender(prev => prev + 1)}
            onGameOver={handleGameOver}
          />
        </div>
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
