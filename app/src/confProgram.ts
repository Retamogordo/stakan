import { web3, BN, Program, Wallet, Provider } from "@project-serum/anchor";
import { Connection } from '@solana/web3.js'
import { IDL, Stakan } from './idl/stakan'

let stakanProgram: Program<Stakan> | undefined = undefined;

function setUpProgram(endpoint: string, wallet: Wallet): Program<Stakan> {
//    const rpcUrl = 'http://localhost:8899';
    const rpcUrl = endpoint;
    const connection = new Connection(rpcUrl, 'confirmed');
  
    const opts: web3.ConfirmOptions =  {
        commitment: 'processed',
        preflightCommitment: "max",
        skipPreflight: false
      };
//      const provider = new Provider(connection, Wallet.local(), opts);
      const provider = new Provider(connection, wallet, opts);

    //const program = anchor.workspace.Stakan as anchor.Program<Stakan>;
    const program = new Program<Stakan>(
        IDL, 
        "StakanXf8bymj5JEgJYH4qUQ7xTtoR1W2BeHUbDjCJb",
        provider
    );
    return program
}

export function localNetProgram(): Program<Stakan> {
    if (!stakanProgram) stakanProgram = setUpProgram('http://localhost:8899', Wallet.local());
    return stakanProgram;
}

export function devNetProgram(endpoint: string, wallet: Wallet): Program<Stakan> {
    if (!stakanProgram) stakanProgram =  setUpProgram(endpoint, wallet);
    return stakanProgram;
}