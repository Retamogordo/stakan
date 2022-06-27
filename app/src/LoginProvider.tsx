import { useEffect, useState } from 'react';
import useLoginUser from "./UseLoginUser"

import * as stakanApi from "./stakanSolanaApi";

import { IDL, Stakan } from './idl/stakan'

const LoginProvider = (props: any) => {

    const [userName, setUserName] = useState<string | null>(
        null
    );
//    console.log("LoginProvider, userName: ", userName);
    const userConnectionCtx = useLoginUser(userName);
    
//    console.log("LoginProvider: ",  userConnectionCtx);
//    userConnectionCtx.user = null;
    
//    console.log("LoginProvider: ",  userConnectionCtx.user?.username);
//    console.log("LoginProvider: username ",  userName);
           
    const handleChange = (ev: any) => {
//        console.log("LoginProvider.handleChange: ", ev.target.value, "keycode: ", ev.target.keyCode);
    }
    const handleKeyUp = (ev: any) => {
        if (ev.keyCode === 13) {
            setUserName(ev.target.value);
        }
    }

    useEffect(() => {
        console.log("LoginProvider: useEffect ",  userConnectionCtx);
        
        setUserName(userConnectionCtx.user?.username 
            ? userConnectionCtx.user?.username.slice()
            : null);
//        setUserName(null);    
    },
    [])
                
    useEffect(() => {
        console.log("LoginProvider.userName: ", userName);
    },
    [userName])

    useEffect(() => {
        console.log("^^^^^^^^^^^^^^^^^^^^^^^^LoginProvider.userConnectionCtx: ", userConnectionCtx);
        props.loggedUserChanged && props.loggedUserChanged(userConnectionCtx.user);
    },
    [userConnectionCtx.user])

    return (
        <div>
            <input 
                type="text" 
                defaultValue={
                    userConnectionCtx.user &&
                    userConnectionCtx.user?.username ? userConnectionCtx.user?.username : ''}
                onChange={handleChange} 
                onKeyUp={handleKeyUp}
                disabled={!userConnectionCtx.connected || userConnectionCtx.user !== null }>
            </input>
        </div>
    )
};

export default LoginProvider;