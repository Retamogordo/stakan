import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import StakanView from './StakanView'
import StakePanel from './StakePanel'

const ENTRY_DELAY = 700;
const STEP_DELAY = 300;
const ROTATION_DELAY = 50;
const SHORTER_DELAY = 10;

class StakanSession {
  active: boolean;
  score: number;
  linesCleared: number;
  level: number;
  stepDelay: number;

  constructor() {
      this.active = true;
    this.score = 0;
    this.linesCleared = 0;
    this.level = 0;
    this.stepDelay = STEP_DELAY;
    this.updateScore = this.updateScore.bind(this);
  }

  updateScore(linesCleared: number) {
    this.linesCleared += linesCleared;
    switch (linesCleared) {
      case 1: { this.score += 40*(this.level + 1); break; } 
      case 2: { this.score += 100*(this.level + 1); break; } 
      case 3: { this.score += 300*(this.level + 1); break; } 
      case 4: { this.score += 1200*(this.level + 1); break; } 
    }
  }
} 

function StakanControls(props: any) {
    const stakanRef = useRef<StakanView>(null);
  
    const [session, setSession] = useState<StakanSession | null>(null);
    const [keydown, setKeydown] = useState<number | null>(null);
    const [keydownDelay, setKeydownDelay] = useState<ReturnType<typeof setInterval> | null>(null);
  
    const [moveDelay, setMoveDelay] = useState<ReturnType<typeof setInterval> | null>(null);
    const [disableControls, setDisableControls] = useState(true);
    const [childWillRender, setChildWillRender] = useState(0);
//    const [sessionStarted, setSessionStarted] = useState(props.started);
  
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
    },
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
  
          stakanRef.current && stakanRef.current.pieceEntryCommand();
  
          setDisableControls(false); 
          setMoveDelay(setInterval(() => {
            stakanRef.current && stakanRef.current.moveDown();
  
          }, session.stepDelay)
          );
        }, ENTRY_DELAY);
    }
  
    const handleEntryNewPiece = (linesCleared: number) => {
      if (linesCleared > 0) {
        if (session != null) {
          session.updateScore(linesCleared);
          setSession(session);
        }
/*        
        setSession( (prevSession: StakanSession | null) => {
          if (prevSession !== null) {
//            let session = Object.assign({}, prevSession);
            prevSession.updateScore(linesCleared);
            return prevSession;
          }
          return null;
        })  */
      }
      
      setEntryDelay();
    }
  
    const handleGameOver = () => {
      console.log("Game over: ", session);
  //    console.log("Game over timer id:", moveDelay);
      
      resetMoveDelay();
      resetKeydownDelay();
  
      window.removeEventListener('keydown', handleKeyDown)
      
//      setSession(null);
      if (session !== null) {
        session.active = false;
        setSession(session);
      }
     /* 
      setSession( (prevSession: StakanSession | null) => {
        if (prevSession !== null) {
          let session = Object.assign({}, prevSession);
          session.active = false;
          return session;
        }
        return null;
      })
*/
      props.onGameOver();
    }
  
    const startSession = () => {
      setSession((prevSession: StakanSession | null) => {
        if (prevSession !== null && prevSession.active) throw 'Session already started';
        if (stakanRef.current === null) throw 'in sendStartSession stakanRef.current is null';
//        if (stakePanelRef.current === null) throw 'in sendStartSession stakePanelRef.current is null';
        
//        stakePanelRef.current.visible = false;
        stakanRef.current.focus();
        window.addEventListener('keydown', handleKeyDown)
  
        const session = newSession();      
        return session;
      })
    }
  
    const newSession = (): StakanSession => {
      return new StakanSession();    
    };
  
    useEffect(() => {
      console.log("Stakan Controls use effect, started: ", props.started);

      window.addEventListener('resize', handleResize);
/*
      if (props.started) {
        startSession();
      } else {
        handleGameOver()
      }
*/
      return () => {
//        handleGameOver();
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
      }
    },
    [keydown])
  
    useEffect(() => {
      if (session !== null && session.active) {
        stakanRef.current && stakanRef.current.setSession(session);

  //    console.log("session use effect, stakanRef: ", stakanRef.current, "session: ", session);
        setEntryDelay();
      }
    },
    [session])
  
    useEffect(() => {
      stakanRef.current && stakanRef.current.fitToParent();
    },
    [stakanRef])
  
    return (
      <div className="stakan-wrapper">
        <StakePanel visible={session===null || !session.active} onStartSessionClick={startSession}/>   
        <StakanView 
          ref={stakanRef}
          rows={rows} 
          cols={cols}
          sessionref={session}
          evEntryNewPiece={handleEntryNewPiece}
          willRender={() => setChildWillRender(prev => prev + 1)}
          onFull={handleGameOver}
        />
      </div>
  )
}

export default StakanControls;