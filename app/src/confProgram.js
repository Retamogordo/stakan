import { Program, Provider } from "@project-serum/anchor";
import { Connection } from '@solana/web3.js'
import { IDL, Stakan } from './idl/stakan'

let stakanProgram = undefined;

function setUpProgram(endpoint, wallet) {
    const rpcUrl = endpoint;
    const connection = new Connection(rpcUrl, 'confirmed');
  
    const opts = {
        commitment: 'processed',
        preflightCommitment: "max",
        skipPreflight: false
      };
      const provider = new Provider(connection, wallet, opts);

    const program = new Program(
        IDL, 
        "C5WmRvAk9BBWyg3uSEZ4EHtrNVn7jZu7qgykckXxLekx",
        provider
    );
    return program
}

export function devNetProgram(endpoint, wallet) {
    if (!stakanProgram) 
        stakanProgram = setUpProgram(endpoint, wallet);
    return stakanProgram;
}