import { web3 } from "@project-serum/anchor";
import {useState, useEffect, useRef} from 'react'
import {GameSessionArchive} from './accountsSchema'
import * as stakanApi from './stakanSolanaApi'
import { BN } from "@project-serum/anchor";

//import {UserConnectionContextState} from './UseLoginUser'

export const RightPanel = (props: any) => {
    const [sessionsArchive, SetSessionsArchive] = useState<GameSessionArchive[]>();
    const [rewardBalance, setRewardBalance] = useState(0);
    const [activeUsers, setActiveUsers] = useState<any>();
    const pollChainRef = useRef<() => void>();

    const getSessionsArchive = () => {
        const user = props.userConnectionCtx?.user;

        if (user?.arweave && user?.account) { 
            props.logCtx.log("retrieving sessions archive...");

            GameSessionArchive.get(user?.arweave, user?.account, 100)
                .then(archives => {
                    props.logCtx.logLn("done, retrieved " + archives.length + " sessions");
                    
                    SetSessionsArchive(archives)
                })
        }      
    }

    const archiveRows = () => {
        return sessionsArchive?.map((archive, ind) => 
            ( 
            <tr key={archive['date_time']} className='session-archive-item'
            
                onMouseEnter={ props.enabled ?
                    (e) => {
                        const parent =  ((e.target as HTMLTableCellElement).parentNode as HTMLTableRowElement)                        
                        parent.style.borderBottom = '1px solid yellowgreen'
                        parent.style.cursor = 'pointer'
                } : undefined }

                onMouseLeave={ props.enabled ? (e) => {
                    const parent = ((e.target as HTMLTableCellElement).parentNode as HTMLTableRowElement);                        
                    parent.style.borderBottom = 'hidden'
                    parent.style.cursor = (parent.parentNode as HTMLTableElement).style.cursor;
                } : undefined }

                onClick={ props.enabled ? (e) => {
                    const archiveIndStr = (e.target as HTMLElement).getAttribute('data-archive-index');
                  
                    if (archiveIndStr) {
                        const archiveInd = parseInt(archiveIndStr);
//                        console.log("click ", new BN(archive['score']).toString());
                        props.onArchivedSessionChosen(sessionsArchive[archiveInd]);
                    }
                } : undefined }
            >    
           <td style={{border: 'inherit', textAlign: 'left'}} data-archive-index={ind}>{new BN(archive['score']).toString()}</td>
           <td style={{border: 'inherit', textAlign: 'right'}} data-archive-index={ind}>{archive['date_time']}</td>
            </tr>
            )
        )
    }
 
    const pollChain = () => {
//        console.log("polling chain: ", props.userConnectionCtx?.stakanState);

        const stakanState = props.userConnectionCtx?.stakanState;

        stakanState?.getRewardFundBalance()
          .then( (balance: web3.RpcResponseAndContext<web3.TokenAmount>) => {
            setRewardBalance(balance?.value.uiAmount ? balance?.value.uiAmount : 0)
          });
    
        if (stakanState) {
          stakanApi.queryActiveUsers(stakanState)
            .then( users => {
                setActiveUsers( 
                  users.map(([_accPubkey, userAccount]) => 
                    (<li key={userAccount['username']}>{userAccount['username']}</li>)
                  )
                )
            })
        }
    }    

    useEffect(() => {
        const pollingTimer = setInterval(
            () => pollChainRef.current && pollChainRef.current(), 
        2000)
        
        getSessionsArchive();

        return () => {
//            console.log("clear interval");
            clearInterval(pollingTimer); 
        }     
    },
    [])

    useEffect(() => {
        pollChainRef.current = pollChain;  
    });

    useEffect(() => {
        getSessionsArchive()
    },
    [props.update]);

    return (
        <div className="right-panel">
            <div className="right-panel-active-users">
                <div style={{textAlign: "left"}}>
                    Reward Fund balance {rewardBalance}
                </div>
                <div style={{textAlign: "left"}}>
                    Estimated Winner Reward {(() => {
                        const stake = 1; // supposing that stake is always 1
                        return Math.floor(rewardBalance/2 - stake);
                    })()}
                </div>
                <p></p>
                <div className='right-panel-active-users'>
                    Active Users
                    <ul style={{textAlign: "left"}}>{activeUsers}</ul>
                </div>
            </div>
            
            <div className="right-panel-sessions-archive">
                Onchain Stored Sessions 
                <table className="stored-sessions-table">
                    <th scope="col">Score</th>
                    <th scope="col">When</th>

                    <tbody style={{ textAlign: "left"}} className='session-archive-list'>
                        {archiveRows()}
                    </tbody>
                </table>
            </div>
        </div>    
    )
} 