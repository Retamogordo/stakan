import { web3, BN, Program, Wallet, Provider } from "@project-serum/anchor";
import { AnchorWallet } from '@solana/wallet-adapter-react';

//import * as anchor from "@project-serum/anchor";
import * as spl from '@solana/spl-token';
import Arweave from "arweave";
import { JWKInterface } from 'arweave/node/lib/wallet'
import fs from 'fs';

//import { Stakan } from "../../target/types/stakan";
import * as accountsSchema from "./accountsSchema";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { IDL, Stakan } from './idl/stakan'

const axios = require('axios');
/*
const provider = new Provider(connection, Wallet.local(), opts);

//const program = anchor.workspace.Stakan as anchor.Program<Stakan>;
const program = new Program<Stakan>(
  IDL, 
  "StakanXf8bymj5JEgJYH4qUQ7xTtoR1W2BeHUbDjCJb",
  provider
);
*/
//const programWallet = program.provider.wallet;
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
//      return await this.program.provider.connection.getBalance(this.escrowAccount);
    }
  
    async getRewardFundsBalance(): Promise<web3.RpcResponseAndContext<web3.TokenAmount>> {
      return await this.program.provider.connection.getTokenAccountBalance(this.rewardFundsAccount);
    }
}

export async function findOnChainStakanAccount(
  program: Program<Stakan>,
//  connection: web3.Connection
  ): 
//Promise<accountsSchema.StakanStateSchema | undefined> {
  Promise<StakanState | undefined> {
  const Base58 = require("base-58");
  const accounts 
    = await program.provider.connection.getParsedProgramAccounts(
        program.programId,
        {
          filters: [ 
            { memcmp: { offset: 8 + 4, 
                        bytes: Base58.encode(Buffer.from(accountsSchema.StakanStateSchema.id))
//                        bytes: Base58.encode(Buffer.from(program.programId.toBase58()))
                      } 
            }, 
          ],
        }
  );
//  console.log(program.programId.toBase58());
  for (let acc of accounts) {
    // deserialization success indicates this account is that we looked for
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
//      console.log(stakanState);
      return stakanState;
//      return stakanAccountData;
    }
    catch(e) {
//      console.log(e);
    }
  }
  return undefined;
}

//export async function setUpStakan(program: Program<Stakan>, connection: web3.Connection) {
export async function setUpStakan(program: Program<Stakan>) {
//: Promise<StakanState> {
    const stakanTokensAmount = 1000;
    
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
/*  
    await program.methods
      .setUpStakan(
        stakanStateAccountBump,
      )
      .accounts({
          stakanStateAccount,
          escrowAccount: stakanEscrowAccount,
          mint: stakanMint,
          rewardFundsAccount,
  
          programWallet: program.provider.wallet.publicKey,
          
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID, //tokenProgramID,
          rent: web3.SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
      })
      .signers([(program.provider.wallet as NodeWallet).payer])
      .rpc();
  */
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
    arweaveWallet: JWKInterface;
    arweaveStorageAddress: string;
    bump?: number;
    gameSessionAccount?: web3.PublicKey; // pda of ongoing game session account
    gameSessionAccountBump?: number;
  
    constructor(
        username: string, 
        program: Program<Stakan>,
        wallet: Wallet, 
        arweave: Arweave, 
        arweaveWallet: JWKInterface,
        arweaveStorageAddress: string,
    ) {
      var dir = User.localDir;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      this.username = username;
      this.program = program;
      this.wallet = wallet;
      this.arweave = arweave;
      this.arweaveWallet = arweaveWallet;
      this.arweaveStorageAddress = arweaveStorageAddress;
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
  
    setGameSession(
      gameSessionAccount?: web3.PublicKey, 
      gameSessionAccountBump?: number,
    ) {
      this.gameSessionAccount = gameSessionAccount;
      this.gameSessionAccountBump = gameSessionAccountBump;
    }

    async getGameSessionInfo(): Promise<accountsSchema.GameSessionAccount | undefined> {
      const accountInfo 
        = await this.program.provider.connection.getAccountInfo(this.gameSessionAccount as web3.PublicKey);
      
        let userAccountData 
          = accountInfo ?
            accountsSchema.GameSessionAccount.deserialize(accountInfo.data)
            : undefined;

      return userAccountData;
    }
}

    // after user is signed up their user_account is present on-chain.
    // this function is useful for searching users account when they
    // connect their wallet using wallet adapter.
export async function findOnChainUserAccount(walletPubkey: web3.PublicKey, stakanState: StakanState)
: Promise<[web3.PublicKey, accountsSchema.UserAccount] | undefined> {
//  : Promise<web3.AccountInfo<Buffer | web3.ParsedAccountData> | undefined> {
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
  for (let acc of accounts) {
    // deserialization success indicates this account is that we looked for
    try {
      const userAccountData 
        = accountsSchema.UserAccount.deserialize(acc.account.data as Buffer);
      return [acc.pubkey, userAccountData];
    }
    catch {
    }
  }
  return undefined;
}


export async function signUpUser(user: User, stakanState: StakanState,) {  
//    console.log("arweave wallet address:", user.arweaveStorageAddress, "len: ", user.arweaveStorageAddress.length);
    /*
    fs.writeFile(user.username + '_arweave_wallet.json', JSON.stringify(user.arweaveWallet), 
      err => { 
        if (err !== null) 
          throw 'Failed to save arweave wallet for user: ' + user.username + ', error: ' + err
      } );
      */
    
//    const wallet = JSON.parse(fs.readFileSync(user.username + '_arweave_wallet.json', "utf-8"));
//    console.log("Arweave wallet read from Json file: ", wallet);
    
    const tokens = user.arweave.ar.arToWinston('10')
    await user.arweave.api.get(`/mint/${user.arweaveStorageAddress}/${tokens}`)

//    const balance = await arweave.wallets.getBalance(user.arweaveStorageAddress);
//    assert(balance, 10);

    const [userAccount, userAccountBump] = await web3.PublicKey.findProgramAddress(
        [
            Buffer.from('user_account'), 
            Buffer.from(user.username).slice(0, 20),
            Buffer.from(user.arweaveStorageAddress).slice(0, 20),
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
/*
    await stakanState.program.methods
        .signUpUser(
        user.username,
        user.arweaveStorageAddress,
        )
        .accounts({
            stakanStateAccount: stakanState.stateAccount,
            userAccount,
            userWallet: user.wallet.publicKey,
            mint: stakanState.stakanMint,
            tokenAccount,

            tokenProgram: spl.TOKEN_PROGRAM_ID,
            associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID, 
            rent: web3.SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
        })
        .signers([user.wallet])
        .rpc();
*/
    const tx = stakanState.program.transaction.signUpUser(
      user.username,
      user.arweaveStorageAddress,
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

//    const bump_file = User.localDir + user.username + '_bump.json';
    
    fs.writeFileSync(User.localDir + user.username + '_bump.json', JSON.stringify(userAccountBump.toString()));
    fs.writeFileSync(User.localDir + user.username + '_arweave_wallet.json', JSON.stringify(user.arweaveWallet));

    user.bump = userAccountBump;
    user.account = userAccount;
    user.tokenAccount = tokenAccount;
}

//export async function loginUser(userWallet: web3.Keypair, stakanState: StakanState, arweave: Arweave)
export async function loginUser(userWallet: Wallet, stakanState: StakanState, arweave: Arweave)
    : Promise<User | undefined> {

  const acc = await findOnChainUserAccount(userWallet.publicKey, stakanState);
  console.log("User acc: ", acc);

  if (acc) {
    const [accPubkey, userAccount] = acc;
    try {
      const arweaveWallet = JSON.parse(fs.readFileSync(User.localDir + userAccount['username'] + '_arweave_wallet.json', "utf-8"));
      const userAccountBump = JSON.parse(fs.readFileSync(User.localDir + userAccount['username'] + '_bump.json', "utf-8"));

      const user = new User(
        userAccount['username'],
        stakanState.program,
        userWallet,
        arweave,
        arweaveWallet,
        userAccount['arweave_storage_address'],
      );
      user.bump = userAccountBump;
      user.account = accPubkey;
  //    console.log("!!!!!!!!!!!!!!!!!!! ", userAccount);
      user.tokenAccount = new web3.PublicKey(userAccount['token_account']);
      
    return user;

    } catch(e) {
      console.log(e);
      return undefined;
    }
  }
  return undefined
}

export async function purchaseStakanTokens(
    user: User,
    stakanState: StakanState,
    tokenAmount: number,
) {
/*  
    await stakanState.program.methods
      .purchaseTokens(
        new BN(tokenAmount),
      )
      .accounts({
        stakanStateAccount: stakanState.stateAccount,
        stakanEscrowAccount: stakanState.escrowAccount,
        mint: stakanState.stakanMint,
        userAccount: user.account,
        userTokenAccount: user.tokenAccount,
        userWallet: user.wallet.publicKey,
  
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user.wallet])
      .rpc();
*/
    if (!user.account || !user.tokenAccount) return;
    
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
}
  
export async function sellStakanTokens(
    user: User,
    stakanState: StakanState,
    tokenAmount: number,
  ) {
  
    await stakanState.program.methods
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
/*
      if (!user.account || !user.tokenAccount) return;

      const tx = stakanState.program.transaction
        .sellTokens(
          user.bump as number,
          new BN(tokenAmount),
          {
            accounts: {
              stakanStateAccount: stakanState.stateAccount,
              stakanEscrowAccount: stakanState.escrowAccount,
              userAccount: user.account,
              userTokenAccount: user.tokenAccount,
              userWallet: user.wallet.publicKey,
              rewardFundsAccount: stakanState.rewardFundsAccount,
        
              tokenProgram: spl.TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
              rent: web3.SYSVAR_RENT_PUBKEY,
            },
            signers: [],
          }
      )
      tx.feePayer = stakanState.program.provider.wallet.publicKey
      tx.recentBlockhash = (await stakanState.program.provider.connection.getLatestBlockhash()).blockhash
      const signedTx = await stakanState.program.provider.wallet.signTransaction(tx)
      const txId = await stakanState.program.provider.connection.sendRawTransaction(signedTx.serialize())
      await stakanState.program.provider.connection.confirmTransaction(txId)
      */
  }
  
export async function initGameSession(
    user: User,
    stakanState: StakanState,
    stake: number,
) {
    const [gameSessionAccount, gameSessionAccountBump] =
      await web3.PublicKey.findProgramAddress(
        [
          Buffer.from('game_session_account'), 
          Buffer.from(user.username).slice(0, 20),
          Buffer.from(user.arweaveStorageAddress).slice(0, 20),
        ],
        stakanState.program.programId
      );
/*    
    await stakanState.program.methods
      .initGameSession(
        new BN(stake),
      )
      .accounts({
          stakanStateAccount: stakanState.stateAccount,
          rewardFundsAccount: stakanState.rewardFundsAccount,
          userAccount: user.account,
          userTokenAccount: user.tokenAccount,
          gameSessionAccount,
          userWallet: user.wallet.publicKey,
  
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
      })
      .signers([user.wallet])
      .rpc();
*/
    if (!user.account || !user.tokenAccount) return;
    
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
    await stakanState.program.provider.connection.confirmTransaction(txId)

    user.setGameSession(gameSessionAccount, gameSessionAccountBump);
  }

  async function saveToArweave(user: User, data: any): Promise<string | undefined> {
    const serializedData = accountsSchema.GameSessionArchive.serialize(data);
  
  //  GameSessionArchive.deserialize(serializedData);
    const tx = await user.arweave.createTransaction({
      data: serializedData
    });
    tx.addTag('App-Name', 'Stakan');
    tx.addTag('stakanApi.User', (user.account as web3.PublicKey).toString());
    
    await user.arweave.transactions.sign(tx, user.arweaveWallet);
    await user.arweave.transactions.post(tx);
    // mine transaction to simulate immediate confirmation
    await axios.get('http://localhost:1984/mine');
  
    const statusAfterPost = await user.arweave.transactions.getStatus(tx.id);
  //  console.log("status after post: ", statusAfterPost.confirmed);
    return statusAfterPost.status === 200 ? tx.id : undefined;
  }

  export async function finishGameSession(
    user: User,
    stakanState: StakanState,
  ) {
    const gameSessionInfo = await user.getGameSessionInfo();
  
    if (!gameSessionInfo) 
      throw 'Cannot get Session Info';

    const txid = await saveToArweave(user, 
      {
        score: (gameSessionInfo as any)['score'],
        duration: (gameSessionInfo as any)['duration_millis'] ,
      }
    );

    if (!txid) throw "Failed saving to Arweave";
    let saveTxId: string = txid as string; 
    let bump: number = user.bump as number;
  
    if (!user.account || !user.tokenAccount || !user.gameSessionAccount) return;

    const tx = stakanState.program.transaction
      .finishGameSession(
        saveTxId,
        bump,
        {
          accounts: {
            stakanStateAccount: stakanState.stateAccount,
            userAccount: user.account,
            userTokenAccount: user.tokenAccount,
            gameSessionAccount: user.gameSessionAccount,
            userWallet: user.wallet.publicKey,
            rewardFundsAccount: stakanState.rewardFundsAccount,
    
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          },
          signers: [],
        }
      )
    
    await stakanState.program.methods
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
  
     user.setGameSession(undefined, undefined);
  }
  
  export async function updateGameSession(
    user: User,
    score: number,
    duration: number,
  ) {
  
    await user.program.methods
      .updateGameSession(
        new BN(score),
        new BN(duration),
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
        user.bump as number,
      )
      .accounts({
        stakanStateAccount: stakanState.stateAccount,
        stakanEscrowAccount: stakanState.escrowAccount,
        userAccount: user.account,
        userTokenAccount: user.tokenAccount,
        userWallet: user.wallet.publicKey,
//        programWallet: stakanState.wallet.publicKey,
        rewardFundsAccount: stakanState.rewardFundsAccount,
  
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([])
//      .signers([stakanState.wallet.payer])
      .rpc();  
/*
      if (!user.account || !user.tokenAccount) return;

      const tx = stakanState.program.transaction
        .signOutUser(
          user.bump as number,
          {
            accounts: {
              stakanStateAccount: stakanState.stateAccount,
              stakanEscrowAccount: stakanState.escrowAccount,
              userAccount: user.account,
              userTokenAccount: user.tokenAccount,
              userWallet: user.wallet.publicKey,
      //        programWallet: stakanState.wallet.publicKey,
              rewardFundsAccount: stakanState.rewardFundsAccount,
        
              tokenProgram: spl.TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
              rent: web3.SYSVAR_RENT_PUBKEY,
            }
          }  
      )
      */

  }
  