import React, { useState, useRef, useEffect, useCallback } from 'react'
import { setupStakan, stakanFrom } from './stakanLogic'
import StakanView from './StakanView'

const ENTRY_DELAY = 700;
const STEP_DELAY = 300;
const ROTATION_DELAY = 50;
const SHORTER_DELAY = 10;

export class StakanSession {
  active: boolean;
  score: number;
  linesCleared: number;
  level: number;
  duration: number;
  stepDelay: number;
  tiles: any

  constructor(rows: number, cols: number) {
    this.active = true;
    this.score = 0;
    this.linesCleared = 0;
    this.level = 0;
    this.duration = 0;
    this.stepDelay = STEP_DELAY;
    this.tiles = setupStakan(rows, cols);
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

export function StakanControls(props: any) {
    const stakanRef = useRef<StakanView>(null);
  
    const [session, setSession] = useState<StakanSession | null>(null);
    const [keydown, setKeydown] = useState<number | null>(null);
    const [keydownDelay, setKeydownDelay] = useState<ReturnType<typeof setInterval> | null>(null);
  
    const [moveDelayTimer, setMoveDelayTimer] = useState<ReturnType<typeof setInterval> | null>(null);
    const moveDelayRef = useRef<() => void>();

    const [entryDelayTimer, setEntryDelayTimer] = useState<ReturnType<typeof setInterval> | null>(null);
    
    const [disableControls, setDisableControls] = useState(true);
    const [childWillRender, setChildWillRender] = useState(0);
  
    const rows = 16;
    const cols = 10;
    
    const handleKeyDown = useCallback( (event: KeyboardEvent) => {
        setKeydown(event.keyCode);
      },
    []);
  
    const handleResize = useCallback( () => {
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
          stakanRef.current.moveDown();
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
  
    const resetMoveDelay = () => {
      moveDelayTimer && clearInterval(moveDelayTimer);
      setMoveDelayTimer(null);
    }
  
    const resetKeydownDelay = () => {
      keydownDelay && clearTimeout(keydownDelay); 
      setKeydown(null); 
      setKeydownDelay(null);    
    }
  
    const moveDownTick = () => {
        stakanRef.current?.moveDown();
    }

    const setEntryDelay = () => {
        setDisableControls(true);    
        resetMoveDelay();
        resetKeydownDelay();
  
        if (stakanRef.current === null || session === null) return;
  
        setEntryDelayTimer(
          setTimeout(() => {
            entryDelayTimer && clearTimeout(entryDelayTimer);
            setEntryDelayTimer(null);
    
//            console.log("pieceEntryCommand");
            stakanRef.current?.pieceEntryCommand();
    
            setDisableControls(false); 

            setMoveDelayTimer( 
              setInterval(
                () => moveDelayRef.current && moveDelayRef.current(), 
                session.stepDelay
              )
            )
          }, ENTRY_DELAY)
        );
    }
  
    const handleEntryNewPiece = (linesCleared: number) => {
      if (linesCleared > 0) {
        if (session != null) {
          session.updateScore(linesCleared);
          setSession(session);
        }
      }      
      setEntryDelay();
    }
  
    const handleGameOver = () => {
      resetMoveDelay();
      resetKeydownDelay();
  
      window.removeEventListener('keydown', handleKeyDown)
      
      if (session !== null) {
        session.active = false;
        setSession(session);
      }
      props.onGameOver(session, stakanRef.current?.tiles);
    }

    const beforeSessionStarted = () => {
      props.onBeforeSessionStarted(session);
    }
  
    const startSession = () => {
      setSession((prevSession: StakanSession | null) => {
        if (prevSession !== null && prevSession.active) throw 'Session already started';
        if (stakanRef.current === null) throw 'in sendStartSession stakanRef.current is null';

        window.addEventListener('keydown', handleKeyDown)
  
        let session = new StakanSession(props.rows, props.cols); 
//        session.tiles = setupStakan(props.rows, props.cols);     

        props.onSessionStarted(session);
        return session;
      })
    }
  
    useEffect(() => {
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      }
    },
    [])

    useEffect(() => {
      moveDelayRef.current = moveDownTick;  
    });


    useEffect(() => {
      if (props.startSession) startSession()
    },
    [props.startSession])
      
  
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
      if (session !== null) {

        stakanRef.current?.setSession(session);
        
        if (session.active) {
          console.log("useEffect->setEntryDelay");
          setEntryDelay();

          props.onSessionUpdated(session, stakanRef.current?.tiles);
        }
        stakanRef.current?.focus();
      }
    },
    [session])
  
    useEffect(() => {
      stakanRef.current?.fitToParent();
    },
    [stakanRef])

    useEffect(() => {

      if (props.archivedSession) {
        const rowsWithBorder = props.archivedSession['tiles_rows'];
        const colsWithBorder = props.archivedSession['tiles_cols'];
        const tilesFlat = Array<number>.from(props.archivedSession['tiles']);

        const tiles = stakanFrom(rowsWithBorder, colsWithBorder, tilesFlat);   

        let session = new StakanSession(tiles.rows, tiles.cols);
        
        session.tiles = tiles;
        session.active = false;
        session.score = props.archivedSession['score'];
        session.linesCleared = props.archivedSession['lines_cleared'];
        session.level = props.archivedSession['level'];
        session.duration = props.archivedSession['duration'];

        setSession(session);
      } 
    },
    [props.archivedSession])    
  
    return (
        <StakanView 
          ref={stakanRef}
          rows={rows} 
          cols={cols}
          sessionref={session}
          evEntryNewPiece={handleEntryNewPiece}
          willRender={() => setChildWillRender(prev => prev + 1)}
          onFull={handleGameOver}
          onStakanWidthBiggerThanHalf={props.onStakanWidthBiggerThanHalf}
        />
    )
}