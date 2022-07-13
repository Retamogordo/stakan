export const SigningOutDialog = (props: any) => {
    return (
      <div className="signing-out-dialog">

        <span style={{marginLeft:"5%"}}>Your user account will be closed as well as your token account.</span>
        <br></br>
        {props.tokenBalance 
        ?
        <span style={{marginLeft:"5%"}}>{props.tokenBalance} token(s) will be sold,  
            {props.tokenBalance*props.lamportsPerToken} lamports will be deposited to your wallet.</span>
        :
        null
        }
        <br></br>
        <span style={{marginLeft:"5%"}}>You can sign up with the same or another username </span>
        <br></br>
        <span style={{marginLeft:"5%"}}>unless it is taken by another user</span>
        <div style={{position: "absolute", bottom: 0, width: "80%", height: "15%",
            display: "flex", flexDirection: "row"}}>
            
            <input type="button" value="Cancel" 
                style={{flex: "1 0 auto", marginLeft:"10%", marginBottom: "2px"}}
                onClick={props.onCancelSigningOut}
            >      
            </input>

            <span style={{flex: "1 0 auto", width:"80%"}}></span>
            
            <input type="button" value="Proceed" 
                style={{flex: "1 0 auto", marginRight:"10%", marginBottom: "2px"}}
                onClick={props.onProceedSigningOut}
            >
               
            </input>
        </div> 
      </div>  
    )
  }