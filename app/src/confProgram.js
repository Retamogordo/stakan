import { web3, BN, Program, Provider } from "@project-serum/anchor";
import { Connection } from '@solana/web3.js'
import { IDL, Stakan } from './idl/stakan'

//let stakanProgram: Program<Stakan> | undefined = undefined;
let stakanProgram = undefined;

function setUpProgram(endpoint, wallet) {
//    function setUpProgram(endpoint: string, wallet: Wallet): Program<Stakan> {
//    const rpcUrl = 'http://localhost:8899';
    const rpcUrl = endpoint;
    const connection = new Connection(rpcUrl, 'confirmed');
  
    const opts = {
//        const opts: web3.ConfirmOptions =  {
        commitment: 'processed',
        preflightCommitment: "max",
        skipPreflight: false
      };
//      const provider = new Provider(connection, Wallet.local(), opts);
      const provider = new Provider(connection, wallet, opts);

    //const program = anchor.workspace.Stakan as anchor.Program<Stakan>;
    const program = new Program(
        IDL, 
        "C5WmRvAk9BBWyg3uSEZ4EHtrNVn7jZu7qgykckXxLekx",
        provider
    );
    return program
}

//export function localNetProgram(): Program<Stakan> {
/*
export function localNetProgram() {
    if (!stakanProgram) stakanProgram = setUpProgram('http://localhost:8899', Wallet.local());
    return stakanProgram;
}
*/
export function devNetProgram(endpoint, wallet) {
//    export function devNetProgram(endpoint: string, wallet: any): Program<Stakan> {
//    export function devNetProgram(endpoint: string, wallet: Wallet): Program<Stakan> {
    if (!stakanProgram) stakanProgram =  setUpProgram(endpoint, wallet);
    return stakanProgram;
}