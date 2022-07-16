import { useState, useEffect } from 'react'
import Arweave from 'arweave';

const ArweaveConnectionProvider = (props: any) => {
    const [arweave, setArweave] = useState< Arweave | null>(null);

    const init = () => {
        const arweave = Arweave.init({
            host: 'localhost',
            port: 1984,
            protocol: 'http',
            timeout: 20000,
            logging: false,
          });

          setArweave(arweave);

          arweave.wallets.generate()
            .then( arweaveWallet => {
                return arweave.wallets.getAddress(arweaveWallet);
            })
            .then( arweaveStorageAddress => {
                props.onAddressGenerated && props.onAddressGenerated(arweaveStorageAddress);            
            });
    }

    useEffect(() => {
        init();
    }, 
    []);

    useEffect(() => {
    },
    [arweave]);

    return (
        <div>

        </div>
    )
}; 

export default ArweaveConnectionProvider;
