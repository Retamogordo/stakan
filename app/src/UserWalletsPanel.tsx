import React, { useState, useEffect, useRef } from 'react'
import { WalletConnectionProvider } from './WalletConnectionProvider';
import {UserConnectionContextState} from './UseLoginUser'
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

const NumericNonNegativeInput = (props: any) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState(0);

    const handleButtonClick = () => {
        props.onInput(inputValue);
    } 

    const handleInputChange = () => {
        setInputValue(inputRef.current ? parseInt(inputRef.current?.value) : 0)
    } 

    useEffect(() => {
        props.inputFieldChanged && props.inputFieldChanged(inputValue);
    },
    [inputValue]);

    return (
        props.visible 
        ?
        <div className='numeric-input'>
            <input className='numeric-input-field' type='number' min='0' 
                onChange={handleInputChange}
                ref={inputRef}
            >                    
            </input>
            <span>{inputValue > 0 ? props.fieldLabel : ''}</span>
            <div>
                <input type='button' className='numeric-input-button'
                    ref={buttonRef}
                    disabled={!inputValue || inputValue <= 0}
                    value={props.buttonText}
                    onClick={handleButtonClick}
                >
                </input>
            </div>
        </div>
        :
        null
    )
}

export const UserWalletsPanel = (props: any) => {
    const [userWalletsStatus, setUserWalletsStatus] = useState<UserWalletsStatus>(new UserWalletsStatus())
    const [userConnectionCtx, setUserConnectionCtx] = useState<UserConnectionContextState | null>(null);
    const purchaseTokensInputRef = useRef<HTMLInputElement>(null);
    const purchaseTokensButtonRef = useRef<HTMLInputElement>(null);
//    const sellTokensInputRef = useRef<HTMLInputElement>(null);

    const updateUserWalletsStatus = async () => {
        const user = userConnectionCtx?.user;
    
        const userBalance = await user?.getBalance();
        
        const arweaveConnected = !!user && await user?.isArweaveWalletConnected()
        const arweaveProviderConnected = !!user && await user?.isArweaveProviderConnected()
        const arBalance 
            = arweaveConnected && arweaveProviderConnected ? await user?.getArweaveBalance() : 0;
        const hasWinstonToStoreSession 
            = !!user && await user?.hasWinstonToStoreSession(props.cols, props.rows);
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
    
//        console.log("props.cols: ", props.cols);        
        if (await user?.arweaveAirdropMin(props.cols, props.rows)) 
            await updateUserWalletsStatus();
    }

    const purchaseStakanTokens = (tokens: number) => {
        const user = userConnectionCtx?.user;
        const stakanState = userConnectionCtx?.stakanState;
    
        (async () => { 
            if (user && stakanState) { 
                props.onTokenTransactionStarted(true);

                try {
                    await stakanApi.purchaseStakanTokens(user, stakanState, tokens, props.logCtx);
                    await updateUserWalletsStatus();
                } catch (e) {
                    props.logCtx.logLn(e);
                }
                props.onTokenTransactionStarted(false);
            }
        })()
    }

    const sellStakanTokens = async (value: string) => {
        const user = userConnectionCtx?.user;
        const stakanState = userConnectionCtx?.stakanState;
        const tokens = parseInt(value);

        if (isNaN(tokens) || tokens === 0) return;

        console.log('tokens: ', tokens);
    
        if (user && stakanState) { 
            props.onTokenTransactionStarted(true);

        try {
            await stakanApi.sellStakanTokens(user, stakanState, tokens, props.logCtx);
            await updateUserWalletsStatus();
        } catch (e) {
            props.logCtx.logLn(e);
        }
        props.onTokenTransactionStarted(false);
        }
    }

    const handleUserChanged = (loggedUserConnetctionCtx: UserConnectionContextState) => {
        setUserConnectionCtx(loggedUserConnetctionCtx);
    }
/*
    const handleUserSignedOut = (userConnetctionCtx: UserConnectionContextState) => {
        
    }
*/    
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
                logCtx={props.logCtx}
            />
            <div className="title-div">Solana</div>
            <div style={{marginLeft: "5%"}}>
                Lamport Balance {userWalletsStatus.solanaBalance}
                {/*
                userConnectionCtx?.connected 
                    ? <input type='button' className='left-panel-input'
                            value={'Airdrop some lamports'} 
                            onClick={airdropLamports}>
                    </input>
                    :
                    null
                */}
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
                buttonText={'Purchase tokens'}
            />
            <NumericNonNegativeInput 
                visible={userWalletsStatus.tokenBalance > 0}
                onInput={sellStakanTokens}
                buttonText={'Sell tokens'}
            />
      </div>
    )
}