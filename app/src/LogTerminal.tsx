
export const LogTerminal = (props: any) => {
  return (
    <div className="output_terminal_container" >
      {props.ctx.logs}
    </div>  
  )
}
