import React from 'react'
import {TailSpin} from "react-loader-spinner"
import {NumericNonNegativeInput} from './NumericNonNegativeInput'

class StakePanel extends React.Component {
    props: any;
    loader: any;
    prevTokenBalance: number;
    constructor(props: any) {
        super(props);

        this.props = props;
        this.prevTokenBalance = this.props.userWalletsStatus.tokenBalance;
        this.handleStakeChanged = this.handleStakeChanged.bind(this);
        this.handleStartSessionClick = this.handleStartSessionClick.bind(this);
    }

    handleStakeChanged(value: number) {
        const h = this.props.rewardBalance / 2;
        const s = value;
        const x0 = this.props.userConnectionCtx?.stakanState?.globalMaxScore;
        const estimatedMinNewMaxScore = x0 + 1;
        const estimatedMaxNewMaxScore = x0 + x0;
        const x1 = estimatedMinNewMaxScore;
        const x2 = estimatedMaxNewMaxScore;

        // from game_session.rs
        let rewardMin = h + (s - h) * Math.exp((-s/h * x1*(x1 - x0)/h));
        let rewardMax = h + (s - h) * Math.exp((-s/h * x2*(x2 - x0)/h));

//        console.log("h: " + h + ", s: " + s);
        console.log("rewardMin: " + rewardMin + ", rewardMax: " + rewardMax);
    }

    handleStartSessionClick() {
        this.prevTokenBalance = this.props.userWalletsStatus.tokenBalance;
        console.log("-------------------------- token balance: ", this.prevTokenBalance);
        this.props.onStartSessionClick();
    }

    render() {
        const props = this.props;
        this.loader = {
            Component: TailSpin,
            props: {
              color: "rgba(5, 226, 255, 0.701)",
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
                    : <span style={{color: 'red'}}>&#10005; try running 'npx arlocal' in terminal and reload page</span> 
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
                {props.greetWinnerMode 
                    && this.props.userWalletsStatus.tokenBalance > this.prevTokenBalance
                ?
                <div style={{fontSize:'x-large',
                    height: "5%", width: "100%", margin: "0 auto", clear: "both"}}>
                    Powerful {props.userConnectionCtx?.user?.username}, you hit record score !    
                </div>
                :
                <div style={{
                        height: "5%", width: "10%", margin: "0 auto", clear: "both"}}>
                    <this.loader.Component {...this.loader.props}/>
                </div>
                }
            
                <div style={{ marginRight: "5%"}}>
                    {props.userConnectionCtx?.user?.gameSessionAccount
                        ?
                        <input style={{ display: "block", marginLeft: "auto", marginRight: "0"}} type='button'                          
                                value='    Resume     ' 
                                    
                            disabled={
                                !props.userWalletsStatus.hasWinstonToStoreSession
                                || props.userWalletsStatus.tokenBalance <= 0 
                                || this.props.loadingMode}
                            onClick={this.handleStartSessionClick}>
                        </input>
                        : 
                        <NumericNonNegativeInput
                            visible={true}
                            onInputValueChanged={this.handleStakeChanged}
                            onInput={this.handleStartSessionClick}
                            buttonText={'Stake & Start'}
                        />
                    }

                </div>
                <div style={{textAlign: 'right', marginRight: "5%"}}>
                    <div className='control-panel-section'>Off-chain</div>
                    <div style={{textAlign: 'left', marginLeft: "5%"}}>
                        Play off-chain, your session will not be stored
                    </div>
                    <input className="left-panel-input" type='button' 
                        
                        value='   Free play   ' 
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