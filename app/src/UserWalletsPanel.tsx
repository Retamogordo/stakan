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

export const UserWalletsPanel = (props: any) => {
    const [userWalletsStatus, setUserWalletsStatus] = useState<UserWalletsStatus>(new UserWalletsStatus())
    const [userConnectionCtx, setUserConnectionCtx] = useState<UserConnectionContextState | null>(null);
    const purchaseTokensInputRef = useRef<HTMLInputElement>(null);
    const sellTokensInputRef = useRef<HTMLInputElement>(null);

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

    const airdropLamports = async () => {
        const user = userConnectionCtx?.user;
        const lamports = 1000000;
        
        props.logCtx.log("airdropping " + lamports + " lamports...")
        const txErr = await user?.airdropLamports(lamports);

        if (null === txErr) {
            props.logCtxLn("done");
        } else props.logCtx.logLn("failed, " + txErr)

        await updateUserWalletsStatus();
    }
    
    const purchaseStakanTokens = async () => {
        const user = userConnectionCtx?.user;
        const stakanState = userConnectionCtx?.stakanState;
        const tokens = purchaseTokensInputRef.current 
            ? parseInt(purchaseTokensInputRef.current.value)
            : 0;
    
        if (user && stakanState) { 
            props.onTokenTransactionStarted(true);

            await stakanApi.purchaseStakanTokens(user, stakanState, tokens, props.logCtx);
            await updateUserWalletsStatus();

            props.onTokenTransactionStarted(false);
        }
    }

    const sellStakanTokens = async () => {
        const user = userConnectionCtx?.user;
        const stakanState = userConnectionCtx?.stakanState;
        const tokens = sellTokensInputRef.current 
            ? parseInt(sellTokensInputRef.current.value)
            : 0;
    
        if (user && stakanState) { 
            props.onTokenTransactionStarted(true);

            await stakanApi.sellStakanTokens(user, stakanState, tokens, props.logCtx);
            await updateUserWalletsStatus();

            props.onTokenTransactionStarted(false);
        }
    }

    const handleUserChanged = (loggedUserConnetctionCtx: UserConnectionContextState) => {
        setUserConnectionCtx(loggedUserConnetctionCtx);
    }
    
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
                    ? <input type='button' className='stakan-input'
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
                            ? <input type='button' className='stakan-input'
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
            
            {userWalletsStatus.solanaBalance > stakanApi.LAMPORTS_PER_STAKAN_TOKEN
                ?
                <div style={{marginLeft: "5%", marginTop: "5%"}}>
                    <input type='number' min='0' ref={purchaseTokensInputRef}></input>
                    <div style={{textAlign: "right", marginRight: "5%"}}>
                        <input type='button' className='stakan-input'
                            value={'Purchase tokens'}
                            onClick={purchaseStakanTokens}
                        >
                        </input>
                    </div>
                </div>
                : null
            }
            
            {userWalletsStatus.tokenBalance > 0
                ?
                <div style={{marginLeft: "5%", marginTop: "5%"}}>
                    <input type='number' min='0' ref={sellTokensInputRef}></input>
                    <div style={{textAlign: "right", marginRight: "5%"}}>
                        <input type='button' className='stakan-input'
                            value={'   Sell tokens   '}
                            onClick={sellStakanTokens}
                        >
                        </input>
                    </div>
                </div>
                : null
            }

            <div style={{marginTop: '30%' }}>                
                <input type='button' value='Delete User' disabled={false} onClick={props.onDeleteUserClick}></input>
            </div>
      </div>
    )
}