import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Arweave from 'arweave';


//const arLocal = new ArLocal();
/*
(async () => {
  
    // Start is a Promise, we need to start it inside an async function.
//    await arLocal.start();
  
    // Your tests here...
  
    // After we are done with our tests, let's close the connection.
//    await arLocal.stop();
})();
*/
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
                console.log(arweaveStorageAddress);
                props.onAddressGenerated && props.onAddressGenerated(arweaveStorageAddress);
            
            });
//          console.log(arweave);
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

/*
const arLocal = new ArLocal();

arLocal.start().then( () => {
  const arweave = Arweave.init({
    host: 'localhost',
    port: 1984,
    protocol: 'http',
    timeout: 20000,
    logging: false,
  });
//  const arweaveWallet = await arweave.wallets.generate();

//  const arweaveStorageAddress = await arweave.wallets.getAddress(arweaveWallet);
  return arweave;
})

.then( (arweave) => {
  return arweave.wallets.generate();
})
.then( (arweaveWallet) => {
  console.log(arweaveWallet);
  //  return arweave.wallets.getAddress(arweaveWallet);
})
.then( () => {
  arLocal.stop();
});
*/      
