import { web3, BN, Program, Wallet, Provider } from "@project-serum/anchor";
import { AnchorWallet } from '@solana/wallet-adapter-react';

//import * as anchor from "@project-serum/anchor";
import * as spl from '@solana/spl-token';
import Arweave from "arweave";
import { JWKInterface } from 'arweave/node/lib/wallet'

//import { Stakan } from "../../target/types/stakan";
import * as accountsSchema from "../../app/src/accountsSchema";
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
//    connection: web3.Connection
//    wallet: NodeWallet
    stateAccount: web3.PublicKey
    stateAccountBump: number;
    escrowAccount: web3.PublicKey;
    rewardFundsAccount: web3.PublicKey;
    stakanMint: web3.PublicKey;
    globalMaxScore: number;
  
    constructor(
        program: Program<Stakan>,
//        connection: web3.Connection,
        stateAccount: web3.PublicKey,
        stateAccountBump: number,
        escrowAccount: web3.PublicKey,
        rewardFundsAccount: web3.PublicKey,
        stakanMint: web3.PublicKey,
        globalMaxScore: number,
    ) {
        this.program = program;
//        this.program.provider.connection = connection;
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

  for (let acc of accounts) {
    // deserialization success indicates this account is that we looked for
    try {
      const stakanAccountData 
        = accountsSchema.StakanStateSchema.deserialize(acc.account.data as Buffer);

      const stakanState = new StakanState(
        program,
//        connection,
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
    username: string;
    program: Program<Stakan>;
//    connection: web3.Connection;
    wallet: web3.Keypair;
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
        //        connection: web3.Connection,
        wallet: web3.Keypair, 
        arweave: Arweave, 
        arweaveWallet: JWKInterface,
        arweaveStorageAddress: string,
    ) {
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
    // after user is signed up their user_account is present on-chain.
    // this function is useful for searching users account when they
    // connect their wallet using wallet adapter.
    async findOnChainUserAccount(): Promise<accountsSchema.UserAccount | undefined> {
      const accounts 
        = await this.program.provider.connection.getParsedProgramAccounts(
            this.program.programId,
            {
              filters: [
                { memcmp: { offset: accountsSchema.UserAccountWrapped.innerOffset, 
                            bytes: this.wallet.publicKey.toBase58() 
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
          return userAccountData;
        }
        catch {
        }
      }
      return undefined;
    }
}
  
export async function signUpUser(user: User, stakanState: StakanState,) {  
//    console.log("arweave wallet address:", user.arweaveStorageAddress, "len: ", user.arweaveStorageAddress.length);

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

    user.bump = userAccountBump;
    user.account = userAccount;
    user.tokenAccount = tokenAccount;
}
  
export async function purchaseStakanTokens(
    user: User,
    stakanState: StakanState,
    tokenAmount: number,
) {
  
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
  }
  