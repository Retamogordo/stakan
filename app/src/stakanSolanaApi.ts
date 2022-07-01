import { web3, BN, Program, Wallet } from "@project-serum/anchor";
import * as spl from '@solana/spl-token';
import Arweave from "arweave";
import { JWKInterface } from 'arweave/node/lib/wallet'

import * as accountsSchema from "./accountsSchema";
import { Stakan } from './idl/stakan'
import { LogTerminalContext } from "./UseLogTerminal";

export const LAMPORTS_PER_STAKAN_TOKEN = 1000000;
const ARWEAVE_FEE_WINSTON = 67506057; // 36063945
                            
const axios = require('axios');

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
  
    constructor(
        program: Program<Stakan>,
        pubKey: web3.PublicKey,
        stateAccount: web3.PublicKey,
        stateAccountBump: number,
        escrowAccount: web3.PublicKey,
        rewardFundsAccount: web3.PublicKey,
        stakanMint: web3.PublicKey,
        globalMaxScore: number,
    ) {
        this.program = program;
        this.pubKey = pubKey;
        this.stateAccount = stateAccount;
        this.stateAccountBump = stateAccountBump;
        this.escrowAccount = escrowAccount;
        this.rewardFundsAccount = rewardFundsAccount;
        this.stakanMint = stakanMint;
        this.globalMaxScore = globalMaxScore;
    }
    
    async getBalance(): Promise<number> {
      return await this.program.provider.connection.getBalance(this.escrowAccount);
    }
  
    async getRewardFundBalance(): Promise<web3.RpcResponseAndContext<web3.TokenAmount>> {
      return await this.program.provider.connection.getTokenAccountBalance(this.rewardFundsAccount);
    }
}

export async function findOnChainStakanAccount(
  program: Program<Stakan>,
  ): 
  Promise<StakanState | undefined> {
  const Base58 = require("base-58");
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

  for (let acc of accounts) {
    try {
      const stakanAccountData 
        = accountsSchema.StakanStateSchema.deserialize(acc.account.data as Buffer);

      const stakanState = new StakanState(
        program,
        acc.pubkey,
        new web3.PublicKey(Buffer.from(stakanAccountData['stakan_state_account'])),
        stakanAccountData['stakan_state_account_bump'],
        new web3.PublicKey(Buffer.from(stakanAccountData['escrow_account'])),
        new web3.PublicKey(Buffer.from(stakanAccountData['reward_funds_account'])),
        new web3.PublicKey(Buffer.from(stakanAccountData['mint_token'])),
        stakanAccountData['global_max_score'],

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
          Buffer.from('stakan_state_account'), 
        ],
        program.programId
      );
    
      const [stakanEscrowAccount, stakanEscrowAccountBump] =
      await web3.PublicKey.findProgramAddress(
        [
          Buffer.from('stakan_escrow_account'), 
        ],
        program.programId
      );

  
    const [stakanMint, stakanMintBump] = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from('stakan_mint'),
      ],
      program.programId
    );
  
    let rewardFundsAccount = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      stakanMint,
      stakanStateAccount,
      true,
    );
    const tx = program.transaction.setUpStakan(
      stakanStateAccountBump,
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

export class User {
    static localDir = __dirname + '/user_local_files/';

    username: string;
    program: Program<Stakan>;
    wallet: Wallet;
    arweave: Arweave;
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
        arweave: Arweave, 
        arweaveWallet: JWKInterface | undefined,
    ) {
      this.username = username;
      this.program = program;
      this.wallet = wallet;
      this.arweave = arweave;
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
    
    async getTokenBalance(): Promise<web3.RpcResponseAndContext<web3.TokenAmount>> {
      return await this.program.provider.connection.getTokenAccountBalance(this.tokenAccount as web3.PublicKey);
    }
/*
    async purchaseTokens(tokens: number) {
      await purchaseStakanTokens(this, this.sta
    }
*/    
    async arweaveAirdrop(winston: number): Promise<boolean> {
      const tokens = winston.toString();
      const arweaveStorageAddress = await this.arweave.wallets.getAddress(this.arweaveWallet);

      const resp = await this.arweave.api.get(`/mint/${arweaveStorageAddress}/${tokens}`)
      
      if (resp.status != 200) return false;
      return true;
    }

    async arweaveAirdropMin(): Promise<boolean> {
      return await this.arweaveAirdrop(ARWEAVE_FEE_WINSTON);
    }

    async getArweaveBalance(): Promise<number> {
      const arweaveStorageAddress = await this.arweave.wallets.getAddress(this.arweaveWallet);
      const balance = await this.arweave.wallets.getBalance(arweaveStorageAddress);
      return parseInt(balance);
    }

    async hasWinstonToStoreSession(): Promise<boolean> {
      try {
        return (
          await this.isArweaveWalletConnected() 
          && 
          (ARWEAVE_FEE_WINSTON <= await this.getArweaveBalance())
        );
      } catch {
        return false;
      }
    }

    async isArweaveWalletConnected(): Promise<boolean> {
      try {
        await this.arweave.wallets.getAddress(this.arweaveWallet);
      } catch {
        return false;
      }
      return true;
    }
    async isArweaveProviderConnected(): Promise<boolean> {
      try {
        await this.getArweaveBalance()
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

    async getGameSessionInfo(tiles_cols: number, tiles_rows: number): Promise<accountsSchema.GameSessionAccount | undefined> {
      const accountInfo 
        = await this.program.provider.connection.getAccountInfo(this.gameSessionAccount as web3.PublicKey);
      
        let userAccountData 
          = accountInfo ?
            accountsSchema.GameSessionAccount.deserialize(accountInfo.data, tiles_cols, tiles_rows)
            : undefined;

      return userAccountData;
    }

    async reloadFromChain(stakanState: StakanState, username: string | undefined) {
      const acc = await findOnChainUserAccount(this.wallet.publicKey, stakanState, username);
    
      if (!acc) throw 'Can not reload User from chain, account: ' + this.account?.toBase58();

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
export async function findOnChainUserAccount(
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
//  console.log("findOnChainUserAccount: ", accounts)
  accounts.map(acc => console.log(acc.pubkey.toBase58()));

  for (let acc of accounts) {
    // deserialization success indicates this account is that we looked for
    try {
      const userAccountData 
        = accountsSchema.UserAccount.deserialize(acc.account.data as Buffer);
      
        if (username){
           if (userAccountData['username'] === username) return [acc.pubkey, userAccountData]
        } else {      
          return [acc.pubkey, userAccountData];
        }
    }
    catch(e) {
    }
  }
  return undefined;
}


export async function signUpUser(user: User, stakanState: StakanState,) {  
    const arweaveStorageAddress = await user.arweave.wallets.getAddress(user.arweaveWallet);

    const [userAccount, userAccountBump] = await web3.PublicKey.findProgramAddress(
        [
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
  arweave: Arweave,
  arweaveWallet: JWKInterface | undefined,
) : Promise<User | undefined> {
  const user = new User(
    'dummy_user',
    stakanState.program,
    userWallet,
    arweave,
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
          user.bump as number,
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

      console.log(logCtx);

      throw e;
    }
  }
  
export async function initGameSession(
    user: User,
    stakanState: StakanState,
    stake: number,
    logCtx: LogTerminalContext | undefined,
    tiles_cols: number,
    tiles_rows: number,
) {
    const arweaveStorageAddress = await user.arweave.wallets.getAddress(user.arweaveWallet); 
    
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
      if (!user.account || !user.tokenAccount) throw 'User is not connected';
      
      const tx = stakanState.program.transaction
        .initGameSession(
          new BN(stake),
          tiles_cols,
          tiles_rows,
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

  async function saveToArweave(user: User, data: any): Promise<string | undefined> {
    const serializedData = accountsSchema.GameSessionArchive.serialize(data);

    const tx = await user.arweave.createTransaction({
      data: serializedData
    }, user.arweaveWallet);

    tx.addTag('App-Name', 'Stakan');
    tx.addTag('stakanApi.User', (user.account as web3.PublicKey).toString());

    await user.arweave.transactions.sign(tx, user.arweaveWallet);
    await user.arweave.transactions.post(tx);

    // mine transaction to simulate immediate confirmation
    await axios.get('http://localhost:1984/mine');

    const statusAfterPost = await user.arweave.transactions.getStatus(tx.id);

    return statusAfterPost.status === 200 ? tx.id : undefined;
  }

  export async function finishGameSession(
    user: User,
    stakanState: StakanState,
    logCtx: LogTerminalContext | undefined,
    tiles_cols: number, tiles_rows: number
  ) {
    const gameSessionInfo = await user.getGameSessionInfo(tiles_cols, tiles_rows);
  
    if (!gameSessionInfo) {
      logCtx?.logLn('could not retrieve session account');
      throw 'Cannot get Session Info';
    }
    
    logCtx?.log('saving session data to arweave...');
    let txid = await saveToArweave(user, 
      {
        score: (gameSessionInfo as any)['score'],
        duration: (gameSessionInfo as any)['duration_millis'] ,
      }
    );

//    txid = "dummy_bad_tx";
    if (!txid) {
      logCtx?.logLn('failed');
      throw "Failed saving to Arweave";
    }
    logCtx?.logLn('done, tx id ' + txid);

    let saveTxId: string = txid as string; 
    let bump: number = user.bump as number;
  
    if (!user.account || !user.tokenAccount || !user.gameSessionAccount)
      throw 'Invalid User state';

    logCtx?.log('sending session finalizing transaction...');
    try {
      const txId = await stakanState.program.methods
        .finishGameSession(
          saveTxId,
          bump,
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
  
  export async function updateGameSession(
    user: User,
    score: number,
    duration: number,
    tiles: any,
  ) {
    const tilesArray = tiles.flat();

    await user.program.methods
      .updateGameSession(
        new BN(score),
        new BN(duration),
        Buffer.from(tilesArray),
      )
      .accounts({
          userAccount: user.account,
          gameSessionAccount: user.gameSessionAccount,
  
          systemProgram: SystemProgram.programId,
      })
      .signers([])
      .rpc();
  }
  
  export async function signOutUser(
    user: User,
    stakanState: StakanState,
  ) {

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
  
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([])
      .rpc();  
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

        systemProgram: SystemProgram.programId,
      })
      .signers([])
      .rpc();  
  }
