import {useState, useEffect, useRef} from 'react'
import {GameSessionArchive} from './accountsSchema'
import * as stakanApi from './stakanSolanaApi'
import { BN } from "@project-serum/anchor";

export const RightPanel = (props: any) => {
    const [sessionsArchive, setSessionsArchive] = useState<GameSessionArchive[]>();
    const [rewardBalance, setRewardBalance] = useState(0);
    const [championAccount, setChampionAccount] = useState<string | null>(null);
    const [activeUsers, setActiveUsers] = useState<any>();
    const pollChainRef = useRef<() => void>();

    const getSessionsArchive = () => {
        const user = props.userConnectionCtx?.user;
        const arweave = props.arweaveConnection.arweave;

        console.log("getSessionsArchive->arweave: ", arweave);

        if (arweave && user?.account) { 
            props.logCtx.log("retrieving sessions archive...");
            const maxArchivesToLoad = 100;

            GameSessionArchive.get(arweave, user?.account, maxArchivesToLoad)
                .then(archives => {
                    props.logCtx.logLn("done, retrieved " + archives.length + " sessions");
                    
                    setSessionsArchive(archives)
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
        if (!props.userConnectionCtx?.stakanState) return;

        stakanApi.queryStakanAccount(props.userConnectionCtx?.stakanState.program)
            // reload state to refresh Record Score
            .then(reloadedStakanState => {
                props.userConnectionCtx.stakanState = reloadedStakanState
                return props.userConnectionCtx.stakanState
            })
            // reload balance from Reward Fund account
            .then(stakanState => {
                return stakanState.getRewardFundBalance();
            })
            .then(onChainBalance => {
                const balance = onChainBalance?.value.uiAmount ? onChainBalance?.value.uiAmount : 0
                setRewardBalance(balance)
            })
            .then(() => {
                const stakanState = props.userConnectionCtx?.stakanState as stakanApi.StakanState;
                return stakanState.championAccount 
                    ? stakanApi.getUserFromAccount(stakanState.championAccount, stakanState)
                    : undefined
            })
            .then(acc => {
                setChampionAccount(acc ? acc.username : null)
            })
            .then(() => {
                const stakanState = props.userConnectionCtx?.stakanState as stakanApi.StakanState;
                return stakanApi.queryActiveUsers(stakanState)
            })        
            .then( users => {
                setActiveUsers( 
                  users.map(([_accPubkey, userAccount]) => 
                    (<li key={userAccount['username']}>{userAccount['username']}</li>)
                  )
                )
            })
    }    

    useEffect(() => {
        const pollingTimer = setInterval(
            () => pollChainRef.current && pollChainRef.current(), 
        2000)
        
        getSessionsArchive();

        return () => {
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

    useEffect(() => {
        props.onGlobalStateRefreshed(rewardBalance);
    },
    [rewardBalance]);

    return (
        <div className="right-panel">
            <div style={{textAlign: "left", marginLeft: "5%"}}>Record Score  
                <span style={{color:'hsl(59, 88%, 59%)'}}>
                    {   props.userConnectionCtx?.stakanState?.globalMaxScore
                        ?
                        ' ' + props.userConnectionCtx?.stakanState?.globalMaxScore.toString()
                        : ''
                    }
                </span>
            </div>
            <div style={{textAlign: "left", marginLeft: "5%"}}>Champion 
                { championAccount ? <span style={{color:'hsl(59, 88%, 59%)'}}>{' ' + championAccount}</span> : <span>{' <unknown>'}</span>}
            </div>
            <div className="right-panel-active-users">
                <div style={{textAlign: "left", marginLeft: "5%"}}>
                    Reward Fund balance {rewardBalance}
                </div>
                <p></p>
                <div className='right-panel-active-users'>
                    <div className="title-div">
                        Active Users
                    </div>
                    <ul style={{textAlign: "left", color: "yellow"}}>{activeUsers}</ul>
                </div>
            </div>
            
            <div className="right-panel-sessions-archive">
                <div className="title-div">
                    Onchain Stored Sessions 
                </div>
                <div style={{overflowY: 'auto'}}>
                <table className="stored-sessions-table">
                    <thead>
                        <tr>
                            <th scope="col">Score</th>
                            <th scope="col">When</th>
                        </tr>
                    </thead>
                    <tbody style={{ textAlign: "left"}} className='session-archive-list'>
                        {archiveRows()}
                    </tbody>
                </table>

                </div>
            </div>
        </div>    
    )
} 