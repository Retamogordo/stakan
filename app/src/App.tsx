
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import './App.css';
import StakanControls from './StakanControls';
import StakePanel from './StakePanel'
import RecordPanel from './RecordPanel'
import { WalletConnectionProvider } from './WalletConnectionProvider';
import { StakeButton } from './WalletAdapter';

function App() {
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
