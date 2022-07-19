import { useState, useEffect } from 'react'
import Arweave from 'arweave';

export class ArweaveConnectionContext {
    arweave: Arweave | null;
    address: string | null;
    connected: boolean;

    constructor(
        arweave: Arweave | null,
        address: string | null,
        connected: boolean,
    ) {
        this.arweave = arweave;
        this.address = address;
        this.connected = connected;
    }
}

export const UseArweaveConnection = (props: any) => {
    const [arweave, setArweave] = useState<Arweave | null>(null);
    const [connected, setConnected] = useState(false);
    const [address, setAddress] = useState<string | null>(null);

    const handleWalletLoaded = () => {
        window.arweaveWallet.getActiveAddress()
            .then(arweaveAddress => {
                setConnected(true);
                setAddress(arweaveAddress);
            });
    }

    const init = () => {
        const arweaveApiConfig = {
            host: 'localhost',
            port: 1984,
            protocol: 'http',
            timeout: 20000,
            logging: false,
        }
        const arweave = Arweave.init(arweaveApiConfig);

        setArweave(arweave);

        const url = arweaveApiConfig.protocol + '://' + arweaveApiConfig.host
                    + ':' + arweaveApiConfig.port;
    
        arweave.network.getInfo()
          .then(info => {
              props.logCtx.logLn("arweave provider on " + url);
        });

        window.addEventListener('arweaveWalletLoaded', handleWalletLoaded)
    }

    useEffect(() => {
        init();

        return () => {
            window.removeEventListener('arweaveWalletLoaded', handleWalletLoaded)
        }
    }, 
    []);

    useEffect(() => {
        address && props.logCtx.logLn("arweave address " + address);
    },
    [address]);

    return new ArweaveConnectionContext(arweave, address, connected)
        
}; 
