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

    return (
        <div>
            <input 
                type="text" 
                defaultValue={
                    userConnectionCtx.user &&
                    userConnectionCtx.user?.username ? userConnectionCtx.user?.username : ''
                }
                onChange={handleChange} 
                onKeyUp={handleKeyUp}
                disabled={!userConnectionCtx.connected || userConnectionCtx.user !== null }>
            </input>
        </div>
    )
};

export default LoginProvider;