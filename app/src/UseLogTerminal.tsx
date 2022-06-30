import { useEffect, useState } from 'react'

export class LogTerminalContext {
  logs: string;

  constructor() {
    this.logs = '';
    this.log = this.log.bind(this);
  }

  log(text: string) {
    this.logs += text;
  }

  logLn(text: string) {
    this.logs += text + '\n';
  }
}

export const UseLogTerminal = (props: any): LogTerminalContext => {
    const [logCtx, setLogCtx] = useState(new LogTerminalContext());
    
    useEffect(() =>
        setLogCtx(ctx => { ctx.log(props.log); return ctx; }),
    []);

    return logCtx;
}
