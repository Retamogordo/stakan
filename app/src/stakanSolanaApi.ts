import { web3, BN, Program, Wallet } from "@project-serum/anchor";
import * as spl from '@solana/spl-token';
import Arweave from "arweave";
import { JWKInterface } from 'arweave/node/lib/wallet'

import * as accountsSchema from "./accountsSchema";
import { Stakan } from './idl/stakan'
import { LogTerminalContext } from "./UseLogTerminal";
import { SignatureResult } from "@solana/web3.js";

//export const LAMPORTS_PER_STAKAN_TOKEN = 1000000;
//const ARWEAVE_FEE_WINSTON = 68142907; // 36063945
                   
const axios = require('axios');
const Base58 = require("base-58");

const { SystemProgram } = web3;

export class StakanState {
    program: Program<Stakan>;
    pubKey: web3.PublicKey;
    stateAccount: web3.PublicKey;
    stateAccountBump: number;
    escrowAccount: web3.PublicKey;
    rewardFundsAccount: web3.PublicKey;
    stakanMint: web3.PublicKey;
    globalMaxScore: number;
    championAccount: web3.PublicKey | undefined;
    lamportsPerToken: number;
  
    constructor(
        program: Program<Stakan>,
        pubKey: web3.PublicKey,
        stakanAccountData: accountsSchema.StakanStateSchema
    ) {
        this.program = program;
        this.pubKey = pubKey;
        
        this.stateAccount = new web3.PublicKey(Buffer.from(stakanAccountData['stakan_state_account']));
        this.stateAccountBump = stakanAccountData['stakan_state_account_bump'];
        this.escrowAccount = new web3.PublicKey(Buffer.from(stakanAccountData['escrow_account']));
        this.rewardFundsAccount = new web3.PublicKey(Buffer.from(stakanAccountData['reward_funds_account']));
        this.stakanMint = new web3.PublicKey(Buffer.from(stakanAccountData['mint_token']));
        this.globalMaxScore = (stakanAccountData['global_max_score'] as BN).toNumber();
        this.championAccount = stakanAccountData['champion_account_opt_variant'] === 1
          ?
            new web3.PublicKey(Buffer.from(stakanAccountData['champion_account']))
          : undefined;
        this.lamportsPerToken = (stakanAccountData['lamports_per_stakan_tokens'] as BN).toNumber(); 
    }
    
    async getBalance(): Promise<number> {
      return await this.program.provider.connection.getBalance(this.escrowAccount);
    }
  
    async getRewardFundBalance(): Promise<web3.RpcResponseAndContext<web3.TokenAmount>> {
      return await this.program.provider.connection.getTokenAccountBalance(this.rewardFundsAccount);
    }
}

export async function queryStakanAccount(program: Program<Stakan>): Promise<StakanState | undefined> {
  const accounts 
    = await program.provider.connection.getParsedProgramAccounts(
        program.programId,
        {
          filters: [ 
            { memcmp: { offset: 8 + 4, 
                        bytes: Base58.encode(Buffer.from(accountsSchema.StakanStateSchema.id))
                      } 
            }, 
          ],
        }
  );

//  console.log("queryStakanAccount:", accounts);
  for (let acc of accounts) {
    try {
      const stakanAccountData 
        = accountsSchema.StakanStateSchema.deserialize(acc.account.data as Buffer);

      const stakanState = new StakanState(
        program,
        acc.pubkey,
        stakanAccountData,
      )  
      return stakanState;
    }
    catch(e) {
    }
  }
  return undefined;
}

export async function setUpStakan(program: Program<Stakan>) {    
    const [stakanStateAccount, stakanStateAccountBump] =
      await web3.PublicKey.findProgramAddress(
        [
          Buffer.from(accountsSchema.StakanStateSchema.SEED), 
        ],
        program.programId
      );
//      console.log("setUpStakan->stakanStateAccount: ", stakanStateAccount.toBase58());
    
      const [stakanEscrowAccount, stakanEscrowAccountBump] =
      await web3.PublicKey.findProgramAddress(
        [
          Buffer.from(accountsSchema.StakanStateSchema.SEED),
          Buffer.from('stakan_escrow_account'), 
        ],
        program.programId
      );
//      console.log("setUpStakan->stakanEscrowAccount: ", stakanEscrowAccount.toBase58());

  
    const [stakanMint, _stakanMintBump] = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from(accountsSchema.StakanStateSchema.SEED),
        Buffer.from('stakan_mint'),
      ],
      program.programId
    );
//    console.log("setUpStakan->stakanMint: ", stakanMint.toBase58());
  
    let rewardFundsAccount = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      stakanMint,
      stakanStateAccount,
      true,
    );
    const tx = program.transaction.setUpStakan(
      stakanStateAccountBump,
      stakanEscrowAccountBump,
      {
          accounts: {
            stakanStateAccount,
            escrowAccount: stakanEscrowAccount,
            mint: stakanMint,
            rewardFundsAccount,
    
            programWallet: program.provider.wallet.publicKey,
            
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID, //tokenProgramID,
            rent: web3.SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
          },
          signers: [],
      }
    )
    tx.feePayer = program.provider.wallet.publicKey
    tx.recentBlockhash = (await program.provider.connection.getLatestBlockhash()).blockhash
    const signedTx = await program.provider.wallet.signTransaction(tx)
    const txId = await program.provider.connection.sendRawTransaction(signedTx.serialize())
    await program.provider.connection.confirmTransaction(txId)
}

export async function queryActiveUsers(
  stakanState: StakanState,
) : Promise<[web3.PublicKey, accountsSchema.UserAccount][]> {
  const program = stakanState.program;
  const accounts 
    = await program.provider.connection.getParsedProgramAccounts(
        program.programId,
        {
          filters: [ 
            { memcmp: { offset: 8 + 4, 
                        bytes: Base58.encode(Buffer.from(accountsSchema.GameSessionAccount.id))
                      } 
            }, 
          ],
        }
  );

  const arr = new Array<[web3.PublicKey, accountsSchema.UserAccount]>();  

  for (const acc of accounts) {
    let sessionAccount;
    try {
      sessionAccount 
        = accountsSchema.GameSessionAccount.deserialize(acc.account.data as Buffer);      
    }
    catch { 
    }
    if (sessionAccount) {
      const sessionOwnerUserAccount = new web3.PublicKey(Buffer.from(sessionAccount['user_account']));
        
      const accountInfo 
        = await program.provider.connection.getAccountInfo(sessionOwnerUserAccount)
      
      if (accountInfo?.data) {
        const userAccountData: accountsSchema.UserAccount 
          = accountsSchema.UserAccount.deserialize(accountInfo?.data)

        arr.push([acc.pubkey, userAccountData]);
      }
    }
  } 
  return arr;
}

export class User {
    static localDir = __dirname + '/user_local_files/';

    username: string;
    program: Program<Stakan>;
    wallet: Wallet;
//    arweave: Arweave;
    account?: web3.PublicKey; // pda user state account
    tokenAccount?: web3.PublicKey; // pda user token account
    arweaveWallet: JWKInterface | "use_wallet";
    bump?: number;
    gameSessionAccount?: web3.PublicKey; // pda of ongoing game session account
    gameSessionAccountBump?: number;
    savedGameSessions: number;
    maxScore: number;
  
    constructor(
        username: string, 
        program: Program<Stakan>,
        wallet: Wallet, 
//        arweave: Arweave, 
        arweaveWallet: JWKInterface | undefined,
    ) {
      this.username = username;
      this.program = program;
      this.wallet = wallet;
//      this.arweave = arweave;
      this.arweaveWallet = arweaveWallet ? arweaveWallet : "use_wallet";
      this.savedGameSessions = 0;
      this.maxScore = 0;

    }
    
    isSignedUp(): boolean {
      return !this.account === undefined
    }

    async getBalance(): Promise<number> {
      return await this.program.provider.connection.getBalance(this.wallet.publicKey);
    }
    
    async airdropLamports(lamports: number): Promise<SignatureResult> {
      const signature 
        = await this.program.provider.connection.requestAirdrop(this.wallet.publicKey, lamports)

      const txCtx = await this.program.provider.connection.confirmTransaction(signature);
      const txErr = txCtx.value;
      return txErr;
    }
  
    async getTokenBalance(): Promise<web3.RpcResponseAndContext<web3.TokenAmount>> {
      return await this.program.provider.connection.getTokenAccountBalance(this.tokenAccount as web3.PublicKey);
    }

    async arweaveAirdrop(arweave: Arweave, winston: number): Promise<boolean> {
      const tokens = winston.toString();
      const arweaveStorageAddress = await arweave.wallets.getAddress(this.arweaveWallet);

      const resp = await arweave.api.get(`/mint/${arweaveStorageAddress}/${tokens}`)
      
      return (resp.status === 200)
    }

    async arweaveAirdropMin(arweave: Arweave, tilesCols: number, tilesRows: number): Promise<boolean> {
      const savePrice = parseInt(
        await arweave.transactions
          .getPrice(accountsSchema.GameSessionArchive.maxSize(tilesCols, tilesRows), '')
      );
//      console.log("max size: ",    accountsSchema.GameSessionArchive.maxSize(tilesCols, tilesRows));
      return await this.arweaveAirdrop(arweave, savePrice);
    }

    async getArweaveBalance(arweave: Arweave): Promise<number> {
      const arweaveStorageAddress = await arweave.wallets.getAddress(this.arweaveWallet);
      const balance = await arweave.wallets.getBalance(arweaveStorageAddress);
      return parseInt(balance);
    }

    async hasWinstonToStoreSession(arweave: Arweave, tilesCols: number, tilesRows: number): Promise<boolean> {
      try {
        const savePrice = parseInt(
          await arweave.transactions.getPrice(accountsSchema.GameSessionArchive.maxSize(tilesCols, tilesRows), ''));
        return (
          await this.isArweaveWalletConnected(arweave) 
          && 
          (savePrice <= await this.getArweaveBalance(arweave))
        );
      } catch {
        return false;
      }
    }

    async isArweaveWalletConnected(arweave: Arweave): Promise<boolean> {
      try {
        await arweave.wallets.getAddress(this.arweaveWallet);
      } catch {
        return false;
      }
      return true;
    }
    
    setGameSession(
      gameSessionAccount?: web3.PublicKey, 
      gameSessionAccountBump?: number,
    ) {
      this.gameSessionAccount = gameSessionAccount;
      this.gameSessionAccountBump = gameSessionAccountBump;
    }

    async getGameSessionInfo(): Promise<accountsSchema.GameSessionAccount | undefined> {
      console.log("this.gameSessionAccount: ", this.gameSessionAccount);

      const accountInfo 
        = await this.program.provider.connection.getAccountInfo(this.gameSessionAccount as web3.PublicKey);
      
        let userAccountData 
          = accountInfo ?
            accountsSchema.GameSessionAccount.deserialize(accountInfo.data)
            : undefined;

      return userAccountData;
    }

    async reloadFromChain(stakanState: StakanState, username: string | undefined) {
      const acc = await queryWalletOwnerAccount(this.wallet.publicKey, stakanState, username);
    
      if (!acc) 
        throw new Error('Can not reload User from chain, account: ' + this.account?.toBase58());

      const [accPubkey, userAccount] = acc;

      this.account = accPubkey;
      this.username = userAccount['username'];
      this.bump = userAccount['bump'];
      this.maxScore = (userAccount['max_score'] as BN).toNumber();
      this.savedGameSessions = (userAccount['saved_game_sessions'] as BN).toNumber();
      this.tokenAccount = new web3.PublicKey(userAccount['token_account']);
      if (userAccount['game_session_opt_variant'] === accountsSchema.OPTION_SOME)
        this.gameSessionAccount = new web3.PublicKey(userAccount['game_session']);
      else    
        this.gameSessionAccount = undefined;
    }
}

// after user is signed up their user_account is present on-chain.
// this function is useful for searching users account when they
// connect their wallet using wallet adapter.
export async function queryWalletOwnerAccount(
  walletPubkey: web3.PublicKey, 
  stakanState: StakanState,
  username: string | undefined)
: Promise<[web3.PublicKey, accountsSchema.UserAccount] | undefined> {
  const program = stakanState.program;

  const accounts 
    = await program.provider.connection.getParsedProgramAccounts(
        program.programId,
        {
          filters: [
            { memcmp: { offset: accountsSchema.UserAccountWrapped.innerOffset, 
                        bytes: walletPubkey.toBase58() 
                      } 
            }, 
          ],
        }
    );
//  console.log("queryWalletOwnerAccount: ", accounts)
//  accounts.map(acc => console.log(acc.pubkey.toBase58()));

  for (let acc of accounts) {
    // deserialization success indicates this account is that we looked for
    try {
      const userAccountData 
        = accountsSchema.UserAccount.deserialize(acc.account.data as Buffer);
      
        if (username){
           if (userAccountData['username'] === username
              && userAccountData['stakan_seed'] === accountsSchema.StakanStateSchema.SEED ) return [acc.pubkey, userAccountData]
        } else {    
          if (userAccountData['stakan_seed'] === accountsSchema.StakanStateSchema.SEED)  
            return [acc.pubkey, userAccountData];
        }
    }
    catch(e) {
    }
  }
  return undefined;
}

export async function isArweaveProviderConnected(arweave: Arweave): Promise<boolean> {
  try {
//    await this.getArweaveBalance(arweave)
    await arweave.network.getInfo();
  } catch {
    return false;
  }
  return true;
}

export async function getUserFromAccount(
  account: web3.PublicKey,
  stakanState: StakanState,
): Promise<accountsSchema.UserAccount | undefined> {
  const accountInfo 
    = await stakanState.program.provider.connection.getAccountInfo(account);
  
  try {
    const userAccountData 
      = accountsSchema.UserAccount.deserialize(accountInfo?.data as Buffer);
    return userAccountData
  }
  catch(e) {
    return undefined;
  }
}

export async function signUpUser(user: User, stakanState: StakanState, arweave: Arweave) {  
    const arweaveStorageAddress = await arweave.wallets.getAddress(user.arweaveWallet);

    const [userAccount, userAccountBump] = await web3.PublicKey.findProgramAddress(
        [
            Buffer.from(accountsSchema.StakanStateSchema.SEED),
            Buffer.from('user_account'), 
            Buffer.from(user.username).slice(0, 20),
            Buffer.from(arweaveStorageAddress).slice(0, 20),
        ],
        stakanState.program.programId
    );

    const tokenAccount = await spl.Token.getAssociatedTokenAddress(
        spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        spl.TOKEN_PROGRAM_ID,
        stakanState.stakanMint,
        userAccount,
        true,
    );

    const tx = stakanState.program.transaction.signUpUser(
      user.username,
      userAccountBump,
      arweaveStorageAddress,
      {
        accounts: {
          stakanStateAccount: stakanState.stateAccount,
          userAccount,
          userWallet: user.wallet.publicKey,
          mint: stakanState.stakanMint,
          tokenAccount,

          tokenProgram: spl.TOKEN_PROGRAM_ID,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID, 
          rent: web3.SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        },
        signers: [],
      }
    )
    const conn = stakanState.program.provider.connection;
    tx.feePayer = user.wallet.publicKey;
    tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
    const signedTx = await user.wallet.signTransaction(tx)
    
    const txId = await conn.sendRawTransaction(signedTx.serialize())
    await conn.confirmTransaction(txId)

    user.bump = userAccountBump;
    user.account = userAccount;
    user.tokenAccount = tokenAccount;
}

export async function loginUser(
  userWallet: Wallet, 
  stakanState: StakanState, 
//  arweave: Arweave,
  arweaveWallet: JWKInterface | undefined,
) : Promise<User | undefined> {
  const user = new User(
    'dummy_user',
    stakanState.program,
    userWallet,
//    arweave,
    arweaveWallet,
  );
  
  try {
    await user.reloadFromChain(stakanState, undefined);

  } 
  catch(e) {
    return undefined;
  }
  return user
}

export async function purchaseStakanTokens(
    user: User,
    stakanState: StakanState,
    tokenAmount: number,
    logCtx: LogTerminalContext | undefined
) {
    if (!user.account || !user.tokenAccount) return;
  
    try {
      logCtx?.log("sending purchase tokens transaction...");
      const tx = stakanState.program.transaction
        .purchaseTokens(
          new BN(tokenAmount),
          {
            accounts: {
              stakanStateAccount: stakanState.stateAccount,
              stakanEscrowAccount: stakanState.escrowAccount,
              mint: stakanState.stakanMint,
              userAccount: user.account,
              userTokenAccount: user.tokenAccount,
              userWallet: user.wallet.publicKey,
        
              tokenProgram: spl.TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            },
            signers: [],
          }
      )
      const conn = stakanState.program.provider.connection;
      tx.feePayer = user.wallet.publicKey
      tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
      const signedTx = await user.wallet.signTransaction(tx)
      const txId = await conn.sendRawTransaction(signedTx.serialize())
      await conn.confirmTransaction(txId)
      
      logCtx?.logLn("done, tx id " + txId);
    } catch(e) {
      logCtx?.logLn('failed ' + e);

      throw e;
    }

//    console.log(logCtx);
}
  
export async function sellStakanTokens(
    user: User,
    stakanState: StakanState,
    tokenAmount: number,
    logCtx: LogTerminalContext | undefined
  ) {
    try {
      logCtx?.log("sending sell tokens transaction...");
    
      const txId = await stakanState.program.methods
        .sellTokens(
          new BN(tokenAmount),
        )
        .accounts({
          stakanStateAccount: stakanState.stateAccount,
          stakanEscrowAccount: stakanState.escrowAccount,
          userAccount: user.account,
          userTokenAccount: user.tokenAccount,
          userWallet: user.wallet.publicKey,
          rewardFundsAccount: stakanState.rewardFundsAccount,
    
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([])
        .rpc(); 

        logCtx?.logLn("done, tx id " + txId);
      } catch(e) {
        logCtx?.logLn('failed ' + e);

        throw e;
    }
  }
  
export async function initGameSession(
    user: User,
    stakanState: StakanState,
    arweave: Arweave,
    stake: number,
    logCtx: LogTerminalContext | undefined,
) {
    const arweaveStorageAddress = await arweave.wallets.getAddress(user.arweaveWallet); 
    
    logCtx?.log('sending session initializing transaction...');
    try {
      const [gameSessionAccount, gameSessionAccountBump] =
        await web3.PublicKey.findProgramAddress(
          [
            Buffer.from('game_session_account'), 
            Buffer.from(user.username).slice(0, 20),
            Buffer.from(arweaveStorageAddress).slice(0, 20),
          ],
          stakanState.program.programId
        );
      if (!user.account || !user.tokenAccount) 
        throw new Error('User is not connected');
      
      const tx = stakanState.program.transaction
        .initGameSession(
          new BN(stake),
          {
            accounts: {
              stakanStateAccount: stakanState.stateAccount,
              rewardFundsAccount: stakanState.rewardFundsAccount,
              userAccount: user.account,
              userTokenAccount: user.tokenAccount,
              gameSessionAccount,
              userWallet: user.wallet.publicKey,
      
              tokenProgram: spl.TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            },
            signers: [],
          }
      )
      tx.feePayer = user.wallet.publicKey
      tx.recentBlockhash = (await stakanState.program.provider.connection.getLatestBlockhash()).blockhash
      const signedTx = await user.wallet.signTransaction(tx)
      const txId = await stakanState.program.provider.connection.sendRawTransaction(signedTx.serialize())
      const res = await stakanState.program.provider.connection.confirmTransaction(txId)

      logCtx?.logLn(!res.value.err ? 'done, tx id '+txId : 'failed');

      user.setGameSession(gameSessionAccount, gameSessionAccountBump);
    } catch(e) {
      logCtx?.logLn('failed ' + e);

      throw e;
    }
  }

  async function saveToArweave(user: User, arweave: Arweave, data: any): Promise<string | undefined> {
//    console.log("before serialize: ", data);

    const serializedData = accountsSchema.GameSessionArchive.serialize(data);

//    console.log("serializedData: ", serializedData);

    if (!user.account) 
      throw new Error('Error saving to Arweave: user.account is undefined');

    const tx = await arweave.createTransaction({
      data: serializedData
    }, user.arweaveWallet);

    tx.addTag('App-Name', 'Stakan');
    tx.addTag('User', user.account?.toBase58());

    await arweave.transactions.sign(tx, user.arweaveWallet);
    await arweave.transactions.post(tx);

    // mine transaction to simulate immediate confirmation
    await axios.get('http://localhost:1984/mine');

    const statusAfterPost = await arweave.transactions.getStatus(tx.id);

    return statusAfterPost.status === 200 ? tx.id : undefined;
  }

  export async function finishGameSession(
    user: User,
    stakanState: StakanState,
    session: any,
    arweave: Arweave,
    stakanTiles: any,
    logCtx: LogTerminalContext | undefined,
  ) {
/*
    const gameSessionInfo 
      = await user.getGameSessionInfo();
  
    if (!gameSessionInfo) {
      logCtx?.logLn('could not retrieve session account');
      throw 'Cannot retrieve Session Info';
    }
*/    
    logCtx?.log('saving session data to arweave...');
    
    const dateTime = new Date();
    const tilesArray = stakanTiles.tiles.flat();

    let txid = await saveToArweave(user, arweave,
      {
        score: session.score,
        lines_cleared: session.linesCleared,
        level: session.level,
        date_time: dateTime.toUTCString(),
        duration: session.duration,
        tiles_cols: stakanTiles.colsWithBorder,
        tiles_rows: stakanTiles.rowsWithBorder,
        tiles: tilesArray,
      }
    );

//    txid = "dummy_bad_tx";
    if (!txid) {
      logCtx?.logLn('failed');
      throw new Error("Failed saving to Arweave");
    }
    logCtx?.logLn('done, tx id ' + txid);
  
    if (!user.account || !user.tokenAccount || !user.gameSessionAccount)
      throw new Error('Invalid User state');

    logCtx?.log('sending session finalizing transaction...');
    try {
      const txId = await stakanState.program.methods
        .finishGameSession(
          txid as string,
          new BN(session.score),
        )
        .accounts({
            stakanStateAccount: stakanState.stateAccount,
            userAccount: user.account,
            userTokenAccount: user.tokenAccount,
            gameSessionAccount: user.gameSessionAccount,
            userWallet: user.wallet.publicKey,
            rewardFundsAccount: stakanState.rewardFundsAccount,
    
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
        .signers([])
        .rpc();
      
      logCtx?.logLn(txId ? 'done, tx id '+txId : 'failed');
      
      await user.reloadFromChain(stakanState, user.username);
    } catch(e) {
      logCtx?.logLn('failed ' + e);

      throw e;
    }
  }

  export async function cancelBrokenSession(
    user: User,
    stakanState: StakanState,
    logCtx: LogTerminalContext | undefined,
  ) {
    if (!user.account || !user.tokenAccount || !user.gameSessionAccount)
      throw new Error('Invalid User state');

    logCtx?.log('sending session finalizing transaction...');
    try {
      const txId = await stakanState.program.methods
        .finishGameSession(
          '',
          new BN(0),
        )
        .accounts({
            stakanStateAccount: stakanState.stateAccount,
            userAccount: user.account,
            userTokenAccount: user.tokenAccount,
            gameSessionAccount: user.gameSessionAccount,
            userWallet: user.wallet.publicKey,
            rewardFundsAccount: stakanState.rewardFundsAccount,
    
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
        .signers([])
        .rpc();
      
      logCtx?.logLn(txId ? 'done, tx id '+txId : 'failed');
      
      await user.reloadFromChain(stakanState, user.username);
    } catch(e) {
      logCtx?.logLn('failed ' + e);

      throw e;
    }
  }

  export async function signOutUser(
    user: User,
    stakanState: StakanState,
    logCtx: LogTerminalContext | undefined
  ) {
//    const tokenBalance = parseInt((await user.getTokenBalance()).value.amount);
//    if (isNaN(tokenBalance)) throw "Parsed token balance is NaN";
    
//    await sellStakanTokens(user, stakanState, tokenBalance, logCtx)

    logCtx?.log("sending sign out user transaction...");
    try {
      await stakanState.program.methods
        .signOutUser(
        )
        .accounts({
          stakanStateAccount: stakanState.stateAccount,
          stakanEscrowAccount: stakanState.escrowAccount,
          userAccount: user.account,
          userTokenAccount: user.tokenAccount,
          userWallet: user.wallet.publicKey,
          rewardFundsAccount: stakanState.rewardFundsAccount,
    
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          rent: web3.SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .signers([])
        .rpc(); 
      } catch(e) {  
        logCtx?.logLn('failed ' + e);
//        throw e;
    }
    logCtx?.logLn('done ');
  }

  export async function forceDeleteUser(
    user: User,
    stakanState: StakanState,
  ) {
    await stakanState.program.methods
      .forceDeleteUser(
      )
      .accounts({
        userAccount: user.account,
        userWallet: user.wallet.publicKey,
        tokenAccount: user.tokenAccount,
        mint: stakanState.stakanMint,

        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([])
      .rpc();  
  }

  export async function closeGlobalStakanAccountForDebug(stakanState: StakanState) {
    console.log("closeGlobalStakanAccountForDebug: ", stakanState);
    await stakanState.program.methods
      .closeGlobalStakanAccountForDebug(
      )
      .accounts({
        stakanStateAccount: stakanState.stateAccount,
        programWallet: stakanState.program.provider.wallet.publicKey,
        escrowAccount: stakanState.escrowAccount,
        mint: stakanState.stakanMint,
        rewardFundsAccount: stakanState.rewardFundsAccount,

        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([])
      .rpc();  
  }
