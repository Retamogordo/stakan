import { web3 } from "@project-serum/anchor";
import {useState, useEffect, useRef} from 'react'
import {GameSessionArchive} from './accountsSchema'
import * as stakanApi from './stakanSolanaApi'
//import {UserConnectionContextState} from './UseLoginUser'

export const RightPanel = (props: any) => {
    const [sessionsArchive, SetSessionsArchive] = useState<GameSessionArchive[]>();
    const [rewardBalance, setRewardBalance] = useState(0);
    const [activeUsers, setActiveUsers] = useState<any>();
    const pollChainRef = useRef<() => void>();

    const getSessionsArchive = () => {
//        console.log("****************** getSessionsArchive");
        const user = props.userConnectionCtx?.user;

        if (user?.arweave && user?.account) { 
            props.logCtx.log("retrieving sessions archive...");

            GameSessionArchive.get(user?.arweave, user?.account, 10)
                .then(archives => {
                    props.logCtx.logLn("done, retrieved ", archives.length, " sessions");
                    
                    SetSessionsArchive(archives)
                })
        }      
    }

    const archiveLIs = () => {
        return sessionsArchive?.map((archive, ind) => 
            ( 
                <li key={archive['date_time']}
                    className='session-archive-item'
                    data-archive-index={ind}
                    onMouseEnter={(e) => {
                        (e.target as HTMLLIElement).style.borderBottom = '1px solid red'
                    }}
                    onMouseLeave={(e) => {
                        (e.target as HTMLLIElement).style.borderBottom = 'hidden'
                    }}
                    onClick={(e) => {
                        const archiveIndStr = (e.target as HTMLLIElement).getAttribute('data-archive-index');
                        if (archiveIndStr) {
                            const archiveInd = parseInt(archiveIndStr);
                            props.onArchivedSessionChosen(sessionsArchive[archiveInd]);
                        }
                    }}

                >{archive['date_time']} {archive['duration'].toNumber()}</li>
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
                Stored Sessions 
                <ul style={{ textAlign: "left"}} className='session-archive-list'>
                    {archiveLIs()}
                </ul>
            </div>
        </div>    
    )
} 