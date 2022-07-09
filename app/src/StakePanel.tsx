import React from 'react'
import {TailSpin} from "react-loader-spinner"

class StakePanel extends React.Component {
    props: any;
    loader: any;
    constructor(props: any) {
        super(props);

        this.props = props;
    }

    render() {
        const props = this.props;
        this.loader = {
            Component: TailSpin,
            props: {
              color: "#0ead69",
              height: 40,
              width: 40,
              radius: 1,
              visible: props.loadingMode,
            },
            name: "RevolvingDot"
          };

         
        return props.visible ?
        (
        <div className='control-panel'>
            
            <div className='control-panel-main'>
                <div className='control-panel-section'>Connection and Balance Status</div>

                <div style={{textAlign: 'left', marginLeft: "5%"}}>{'Logged in    '} {
                    !!props.userConnectionCtx?.user 
                    ? <span style={{color: 'green'}}>&#10003;</span>
                    : <span style={{color: 'red'}}>&#10005;</span> 
                }</div>

                <div style={{textAlign: 'left', marginLeft: "5%"}}>Token balance {
                    props.userWalletsStatus.tokenBalance > 0
                    ? <span style={{color: 'green'}}>&#10003;</span>
                    : <span style={{color: 'red'}}>&#10005;</span> 
                }</div>
                
                <div style={{textAlign: 'left', marginLeft: "5%"}}>Arweave provider {
                    props.userWalletsStatus.arweaveProviderConnected
                    ? <span style={{color: 'green'}}>&#10003;</span>
                    : <span style={{color: 'red'}}>&#10005; try running 'npx arlocal' in terminal</span> 
                }</div>

                <div style={{textAlign: 'left', marginLeft: "5%"}}>Arweave balance {
                    props.userWalletsStatus.hasWinstonToStoreSession
                    ? <span style={{color: 'green'}}>&#10003;</span>
                    : <span style={{color: 'red'}}>&#10005;</span> 
                }</div>

                <table style={{marginTop: '5%'}} className='game-controls-table'>
                    <caption>Game Controls</caption>
                    <tbody>
                        <tr>
                        <td>move right</td>
                        <td>→</td>
                        </tr>
                        <tr>
                        <td>move left</td>
                        <td>←</td>
                        </tr>
                        <tr>
                        <td>rotate clockwise</td>
                        <td>Ctrl or z</td>
                        </tr>
                        <tr>
                        <td>rotate counter clockwise</td>
                        <td>↑ or x</td>
                        </tr>
                        <tr>
                        <td>soft drop</td>
                        <td>↓</td>
                        </tr>
                        <tr>
                        <td>hard drop</td>
                        <td>Space</td>
                        </tr>
                    </tbody>
                </table>
                <div style={{
                        height: "5%", width: "10%", margin: "0 auto", clear: "both"}}>
                    <this.loader.Component {...this.loader.props}/>
                </div>
            
                <div style={{textAlign: 'right', marginRight: "5%"}}>
                    <input className="left-panel-input" type='button'                          
                        value={props.userConnectionCtx?.user?.gameSessionAccount 
                                ? ' Resume ' 
                                : 'Stake & Start'} 
                        disabled={
                            !props.userWalletsStatus.hasWinstonToStoreSession
                            || props.userWalletsStatus.tokenBalance <= 0 
                            || this.props.loadingMode}
                        onClick={this.props.onStartSessionClick}>
                    </input>
                </div>
                <div style={{textAlign: 'right', marginRight: "5%"}}>
                    <div className='control-panel-section'>Off-chain</div>
                    <div style={{textAlign: 'left', marginLeft: "5%"}}>
                        Play off-chain, your session will not be stored
                    </div>
                    <input className="left-panel-input" type='button' 
                        
                        value='    Free play    ' 
                        onClick={this.props.onStartFreePlayClick}>
                    </input>
                </div>
            </div>

        </div>
        )
        :
        null
    }
}

export default StakePanel;