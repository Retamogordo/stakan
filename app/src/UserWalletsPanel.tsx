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
    
    const purchaseStakanTokens = async () => {
        const user = userConnectionCtx?.user;
        const stakanState = userConnectionCtx?.stakanState;
        const tokens = purchaseTokensInputRef.current 
            ? parseInt(purchaseTokensInputRef.current.value)
            : 0;
    
        if (user && stakanState) { 
            await stakanApi.purchaseStakanTokens(user, stakanState, tokens, props.logCtx);
            await updateUserWalletsStatus();
        }
    }

    const sellStakanTokens = async () => {
        const user = userConnectionCtx?.user;
        const stakanState = userConnectionCtx?.stakanState;
        const tokens = sellTokensInputRef.current 
            ? parseInt(sellTokensInputRef.current.value)
            : 0;
    
        if (user && stakanState) { 
            await stakanApi.sellStakanTokens(user, stakanState, tokens, props.logCtx);
            await updateUserWalletsStatus();
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
        <div>
          Lamport Balance {userWalletsStatus.solanaBalance}
        </div>

        <div>
          Winston Balance {userWalletsStatus.arweaveBalance}
          {
            !userWalletsStatus.hasWinstonToStoreSession 
            && userWalletsStatus.arweaveWalletConnected
            && userWalletsStatus.arweaveProviderConnected
            ? <input type='button' 
                    value={'Airdrop some winston'} 
                    onClick={airdropWinston}>
            </input>
            : userWalletsStatus.arweaveWalletConnected
              ? userWalletsStatus.arweaveProviderConnected 
                ? null 
                : <div>Arweave provider is disconnected. Is arlocal running ?</div>
              : <div>Arweave wallet is disconnected. Is ArConnect installed ?</div>
          }
        </div>
        <div>
            Stakan Token Balance {userWalletsStatus.tokenBalance}
        </div>
        {userWalletsStatus.solanaBalance > stakanApi.LAMPORTS_PER_STAKAN_TOKEN
            ?
            <div>
                <input type='text' ref={purchaseTokensInputRef}></input>

                <input type='button'
                    value={'Purchase tokens'}
                    onClick={purchaseStakanTokens}
                >
                </input>
            </div>
            : null
        }
        {userWalletsStatus.tokenBalance > 0
            ?
            <div>
                <input type='text' ref={sellTokensInputRef}></input>

                <input type='button'
                    value={'Sell tokens'}
                    onClick={sellStakanTokens}
                >
                </input>
            </div>
            : null
        }

      </div>
    )
}