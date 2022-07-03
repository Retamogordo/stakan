import React, {useState, useEffect} from 'react'
import {GameSessionArchive} from './accountsSchema'
import * as stakanApi from './stakanSolanaApi'
import { web3 } from "@project-serum/anchor";

export const RightPanel = (props: any) => {
//    const [sessionsArchive, SetSessionsArchive] = useState<any>();
    const [sessionsArchive, SetSessionsArchive] = useState<GameSessionArchive[]>();
    const [pollTimer, setPollTimer] = useState<NodeJS.Timer | null>(null);
    const [rewardBalance, setRewardBalance] = useState(0);
    const [activeUsers, setActiveUsers] = useState<any>();

    const getSessionsArchive = () => {
        const user = props.user;

        if (user?.arweave && user?.account) { 
            props.logCtx.log("retrieving sessions archive...");

            GameSessionArchive.get(user?.arweave, user?.account, 10)
                .then(archives => {
                    props.logCtx.logLn("done, retrieved ", archives.length, " sessions");
                    
                    SetSessionsArchive(archives)

                    console.log("archives[0]: ", archives[0]);
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
//                            console.log("arcive: ", sessionsArchive[archiveInd]);
                        }
                    }}

                >{archive['date_time']} {archive['duration'].toNumber()}</li>
            )
        )
    }

    const pollChain = () => {
        props.stakanState?.getRewardFundBalance()
          .then( (balance: web3.RpcResponseAndContext<web3.TokenAmount>) => {
            setRewardBalance(balance?.value.uiAmount ? balance?.value.uiAmount : 0)
          });
    
        if (props.stakanState) {
          stakanApi.queryActiveUsers(props.stakanState)
            .then( users => {
                setActiveUsers( 
                  users.map(([accPubkey, userAccount]) => 
                    (<li key={userAccount['username']}>{userAccount['username']}</li>)
                  )
                )
            })
        }
    }    

    useEffect(() => {

//        getSessionsArchive();
    },
    [])

    useEffect(() => {
        if (props.update) {
            if (props.stakanState) {
                !pollTimer && setPollTimer(setInterval(pollChain, 2000))
            } else {
                clearInterval(pollTimer ? pollTimer : undefined);
                setPollTimer(null);
            }
            getSessionsArchive()
        }
        return () => clearInterval(pollTimer ? pollTimer : undefined);      
      },
    [props.update])


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