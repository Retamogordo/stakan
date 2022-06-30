
export const LogTerminal = (props: any) => {
//  const logCtx = UseLogTerminal(props);
//  console.log("------------------------------- LogTerminal: ", props);

  return (
    <div className="output_terminal_container" >
      {props.ctx.logs}
    </div>  
  )
}
