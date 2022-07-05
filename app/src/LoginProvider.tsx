import { useEffect, useState } from 'react';
import useLoginUser from "./UseLoginUser"

const LoginProvider = (props: any) => {

    const [userName, setUserName] = useState<string | null>(
        null
    );
    const userConnectionCtx = useLoginUser(userName, props.logCtx);
    
    const handleChange = (ev: any) => {
    }

    const handleKeyUp = (ev: any) => {
        if (ev.keyCode === 13) {
            console.log("handleKeyUp: ", ev.target.value)
            setUserName(ev.target.value);
        }
    }

    useEffect(() => {
        setUserName(userConnectionCtx.user?.username 
            ? userConnectionCtx.user?.username.slice()
            : null);
    },
    [])
                
    useEffect(() => {
        props.loggedUserChanged && props.loggedUserChanged(userConnectionCtx);
    },
    [userConnectionCtx.user])

    useEffect(() => {
        setUserName(null);
    },
    [userName])

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
                <div style={{textAlign: "center", fontSize: "larger"}}>
                    {userConnectionCtx.user?.username}
                </div>
            </div>
            :
                userConnectionCtx.connected 
                ?
                <div style={{marginLeft: "5%"}}>
                    Sign up:
                    <div style={{textAlign: "center"}}>
                        <input className='stakan-input' 
                            type="text" 
                            defaultValue={''}
                            onChange={handleChange} 
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