import React, { useState, useEffect, useRef } from 'react'
import { WalletConnectionProvider } from './WalletConnectionProvider'
import {UserConnectionContextState} from './UseLoginUser'
import {NumericNonNegativeInput} from './NumericNonNegativeInput'
import * as stakanApi from './stakanSolanaApi'

export class UserWalletsStatus {
    solanaBalance: number;
    arweaveWalletConnected: boolean;
    arweaveBalance: number;
    hasWinstonToStoreSession: boolean;
    arweaveProviderConnected: boolean;
    tokenBalance: number;
  
    constructor() {
      this.solanaBalance = 0;
      this.arweaveWalletConnected = false;
      this.arweaveBalance = 0;
      this.hasWinstonToStoreSession = false;
      this.arweaveProviderConnected = false;
      this.tokenBalance = 0;
    }
}

export const UserWalletsPanel = (props: any) => {
    const [userWalletsStatus, setUserWalletsStatus] = useState<UserWalletsStatus>(new UserWalletsStatus())
    const [userConnectionCtx, setUserConnectionCtx] = useState<UserConnectionContextState | null>(null);

    const [purchaseStakanTokensValue, setPurchaseStakanTokensValue]= useState('');
    const [purchaseStakanTokensLabel, setPurchaseStakanTokensLabel] = useState('');

    const [sellStakanTokensValue, setSellStakanTokensValue]= useState('');
    const [sellStakanTokensLabel, setSellStakanTokensLabel] = useState('');

    const updateUserWalletsStatus = async () => {
        const user = userConnectionCtx?.user;
        const arweave = userConnectionCtx?.arweave;
    
        const userBalance = await user?.getBalance();
        
        const arweaveConnected = !!user && !!arweave 
                                        && await user?.isArweaveWalletConnected(arweave)
        const arweaveProviderConnected = !!arweave 
            && await stakanApi.isArweaveProviderConnected(arweave)

        const arBalance 
            = arweaveConnected && arweaveProviderConnected 
                ? await user?.getArweaveBalance(arweave) : 0;
        const hasWinstonToStoreSession 
            = !!user && !!arweave 
                && await user?.hasWinstonToStoreSession(arweave, props.cols, props.rows);
        const tokenBalance = (await user?.getTokenBalance())?.value.uiAmount;

        setUserWalletsStatus((_prevUserWalletsStatus) => {
          let userWalletsStatus = new UserWalletsStatus();
          
          userWalletsStatus.solanaBalance = userBalance ? userBalance : 0;
          userWalletsStatus.arweaveWalletConnected = arweaveConnected;
          userWalletsStatus.arweaveBalance = arBalance ? arBalance : 0;
          userWalletsStatus.hasWinstonToStoreSession = hasWinstonToStoreSession;
          userWalletsStatus.arweaveProviderConnected = arweaveProviderConnected;
          userWalletsStatus.tokenBalance = tokenBalance ? tokenBalance : 0;
          return userWalletsStatus;
        })
    }

    const airdropWinston = async () => {
        const user = userConnectionCtx?.user;
        const arweave = userConnectionCtx?.arweave;
    
//        console.log("props.cols: ", props.cols);        
        if (!!arweave && await user?.arweaveAirdropMin(arweave, props.cols, props.rows)) 
            await updateUserWalletsStatus();
    }

    const purchaseStakanTokens = (tokens: number) => {
        const user = userConnectionCtx?.user;
        const stakanState = userConnectionCtx?.stakanState;
        
        setPurchaseStakanTokensValue('');
        setPurchaseStakanTokensLabel('');
        
        (async () => { 
            if (user && stakanState) { 
                props.toggleLoadingMode(true);

                try {
                    await stakanApi.purchaseStakanTokens(user, stakanState, tokens, props.logCtx);
                    await updateUserWalletsStatus();
                } catch (e) {
                    props.logCtx.logLn(e);
                }
                props.toggleLoadingMode(false);
            }
        })()
    }

    const sellStakanTokens = async (value: string) => {
        const user = userConnectionCtx?.user;
        const stakanState = userConnectionCtx?.stakanState;
        const tokens = parseInt(value);

        setSellStakanTokensValue('');
        setSellStakanTokensLabel('');

        if (isNaN(tokens) || tokens === 0) return;
    
        if (user && stakanState) { 
            props.toggleLoadingMode(true);

        try {
            const escrowBalance = await stakanState.getBalance();
            console.log("escrow balance: ", escrowBalance);

            await stakanApi.sellStakanTokens(user, stakanState, tokens, props.logCtx);
            await updateUserWalletsStatus();
        } catch (e) {
            props.logCtx.logLn(e);
        }
        props.toggleLoadingMode(false);
        }
    }

    const handleUserChanged = (loggedUserConnetctionCtx: UserConnectionContextState) => {
        setUserConnectionCtx(loggedUserConnetctionCtx);
    }

    const handlePurchaseInputValueChanged = (val: number) => {
        setPurchaseStakanTokensValue(val.toString());
        setPurchaseStakanTokensLabel(val ? '  ' + (1000000*val).toString() + ' lamports' : '');
    }

    const handleSellInputValueChanged = (val: number) => {
        setSellStakanTokensValue(val.toString());
        setSellStakanTokensLabel(val ? '  ' + (1000000*val).toString() + ' lamports' : '');
    }
    
    useEffect(() => {
        updateUserWalletsStatus()
    },
    [])

    useEffect(() => {
        if (props.update) updateUserWalletsStatus()
      },
    [props.update])

    useEffect(() => {
        updateUserWalletsStatus()

        props.onUserConnectionChanged(userConnectionCtx);

    }, [userConnectionCtx?.user]);

    useEffect(() => {
        props.onUserWalletsStatusChanged(userWalletsStatus);        
    }, [userWalletsStatus]);

    return (
        <div className='left-panel'>
            <WalletConnectionProvider 
                loggedUserChanged={handleUserChanged}
                toggleLoadingMode={props.toggleLoadingMode}
                logCtx={props.logCtx}
            />
            <div className="title-div">Solana</div>
            <div style={{marginLeft: "5%"}}>
                Lamport Balance {userWalletsStatus.solanaBalance}
            </div>

            <div className="title-div">Arweave</div>
            {(() => {
                const airdropNeeded = 
                    !userWalletsStatus.hasWinstonToStoreSession 
                    && userWalletsStatus.arweaveWalletConnected
                    && userWalletsStatus.arweaveProviderConnected;
                const divClassName = airdropNeeded ? 'error-msg-div' : '';
                
                return (
                    <div className={divClassName} style={{marginLeft: "5%"}}>
                        Winston Balance {userWalletsStatus.arweaveBalance}
                        <div style={{textAlign: "right", marginRight: "5%"}}>
                        {
                            airdropNeeded
                            ? <input type='button' className='left-panel-input'
                                    value={'Airdrop some winston'} 
                                    onClick={airdropWinston}>
                            </input>
                            : userWalletsStatus.arweaveWalletConnected
                                ? userWalletsStatus.arweaveProviderConnected 
                                    ? null 
                                    : <div className='error-msg-div'>Arweave provider is disconnected. Is arlocal running ?</div>
                                : <div className='error-msg-div'>Arweave wallet is disconnected. Is ArConnect installed ?</div>
                        }
                        </div>
                    </div>
                )
            })()}

            <div className="title-div">Stakan Tokens</div>
            {userWalletsStatus.tokenBalance > 0
            ?
            <div style={{marginLeft: "5%"}}>
                Stakan Token Balance {userWalletsStatus.tokenBalance}
            </div>
            :
            <div className="error-msg-div" style={{ marginLeft: "5%"}}>
                Stakan Token Balance {userWalletsStatus.tokenBalance}
            </div>
            }
            <NumericNonNegativeInput 
                visible={userWalletsStatus.solanaBalance > stakanApi.LAMPORTS_PER_STAKAN_TOKEN}
                onInput={purchaseStakanTokens}
                onInputValueChanged={handlePurchaseInputValueChanged}
                buttonText={'Purchase tokens'}
                value={purchaseStakanTokensValue}
                fieldLabel={purchaseStakanTokensLabel}
            />
            <NumericNonNegativeInput 
                visible={userWalletsStatus.tokenBalance > 0}
                onInput={sellStakanTokens}
                onInputValueChanged={handleSellInputValueChanged}
                buttonText={'   Sell tokens   '}
                max={userWalletsStatus.tokenBalance}
                value={sellStakanTokensValue}
                fieldLabel={sellStakanTokensLabel}
            />
      </div>
    )
}