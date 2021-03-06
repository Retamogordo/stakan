import { useEffect, useState } from 'react';
import useLoginUser from "./UseLoginUser"
import * as stakanApi from './stakanSolanaApi'

const LoginProvider = (props: any) => {

    const [enteredUserName, setEnteredUserName] = useState<string | null>(
        null
    );
    const [userSignedOut, setUserSignedOut] = useState(false);
    const userConnectionCtx = useLoginUser(enteredUserName, props.arweaveConnection, userSignedOut, props.logCtx);

    const handleKeyUp = (ev: any) => {
        if (ev.keyCode === 13) {
            setEnteredUserName(ev.target.value);
        }
    }

    const handleSignOutButtonClicked = (ev: any) => {
        if (userConnectionCtx.user && userConnectionCtx.stakanState) {
            props.onSigningOut && props.onSigningOut(true);
        }
    }

    const signOutUser = () => {
        if (userConnectionCtx.user && userConnectionCtx.stakanState) {
            stakanApi.signOutUser(
                userConnectionCtx.user, 
                userConnectionCtx.stakanState,
                props.logCtx,
            )
            .then(() => {
                userConnectionCtx.user = null;
                setUserSignedOut(true);

                props.toggleLoadingMode(false);
            });
        }
    }
/*
    const handleForceDeleteUser = (ev: any) => {
        if (userConnectionCtx.user && userConnectionCtx.stakanState) {
            stakanApi.forceDeleteUser(
                userConnectionCtx.user, 
                userConnectionCtx.stakanState
            )
            .then(() => {
                userConnectionCtx.user = null;
                setUserSignedOut(true);
            });
        }
    }
*/ 
    useEffect(() => {
        setEnteredUserName(userConnectionCtx.user?.username 
            ? userConnectionCtx.user?.username.slice()
            : null);
    },
    [])
                
    useEffect(() => {
        props.loggedUserChanged && props.loggedUserChanged(userConnectionCtx);
    },
    [userConnectionCtx.user])

    useEffect(() => {
        setEnteredUserName(null);
    },
    [enteredUserName])

    useEffect(() => {
        setUserSignedOut(false);
    },
    [userSignedOut])

    useEffect(() => {
        props.proceedSigningOut && signOutUser()
    },
    [props.proceedSigningOut])

    return (
        <div style={{marginTop: "5%"}}>
            {userConnectionCtx.connected 
            ?
            <div style={{marginLeft: "5%"}}>
                Connected on
                {userConnectionCtx.connected 
                    ?
                    <div style={{textAlign: "center"}}>
                        {props.endpoint}
                    </div>
                    :
                    null
                }
            </div>
            :
            <div className="error-msg-div" style={{marginLeft: "5%"}}>Disconnected</div>
            }
            {
            userConnectionCtx.user !== null
            ?
            <div style={{marginLeft: "5%", marginTop: "5%"}}>
                Logged in: 
                <span style={{textAlign: "center", fontSize: "larger"}}>
                    {' ' + userConnectionCtx.user?.username}
                </span>
                <div style={{textAlign: "right"}}>
                    <input type="button" value='Sign out'
                        style={{marginRight: "5%"}}
                        disabled={!userConnectionCtx.user || props.disabled}
                        onClick={handleSignOutButtonClicked}
                    ></input>
                </div>
                {/*
                <div style={{textAlign: "right"}}>
                    <input type="button" value='force delete'
                        disabled={!userConnectionCtx.user}
                        onClick={handleForceDeleteUser}
                    ></input> 
            </div> */}
            </div>
            :
                !userConnectionCtx.stakanState && userConnectionCtx.connected
                ?
                <div style={{marginLeft: "5%", color: "red"}}>
                    Fatal: Stakan Global State not present
                </div>
                :
                !props.arweaveConnection.connected
                ?
                <div style={{marginLeft: "5%", color: "red"}}>
                    Connect Arweave wallet before signing up
                </div>
                : 
                userConnectionCtx.connected 
                ?
                <div style={{marginLeft: "5%"}}>
                    Sign up:
                        <div style={{textAlign: "center"}}>
                            <input className='left-panel-input' 
                                type="text" 
                                defaultValue={''}
                                onKeyUp={handleKeyUp}
                                disabled={!userConnectionCtx.connected || userConnectionCtx.user !== null }>
                            </input>
                        </div>
                </div>
                :
                null
            }
        </div>
    )
};

export default LoginProvider;