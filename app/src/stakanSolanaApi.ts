import * as anchor from "@project-serum/anchor";
import * as spl from '@solana/spl-token';
import Arweave from "arweave";
import { JWKInterface } from 'arweave/node/lib/wallet'

import { Stakan } from "../../target/types/stakan";
import * as accountsSchema from "../../app/src/accountsSchema";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

const axios = require('axios');

const program = anchor.workspace.Stakan as anchor.Program<Stakan>;
//const programWallet = program.provider.wallet;
const { SystemProgram } = anchor.web3;

export class StakanState {
    connection: anchor.web3.Connection
//    wallet: NodeWallet
    stateAccount: anchor.web3.PublicKey
    stateAccountBump: number;
    escrowAccount: anchor.web3.PublicKey;
    rewardFundsAccount: anchor.web3.PublicKey;
    stakanMint: anchor.web3.PublicKey;
  
    constructor(
        connection: anchor.web3.Connection,
        stateAccount: anchor.web3.PublicKey,
        stateAccountBump: number,
        escrowAccount: anchor.web3.PublicKey,
        rewardFundsAccount: anchor.web3.PublicKey,
        stakanMint: anchor.web3.PublicKey,
    ) {
        this.connection = connection;
        this.stateAccount = stateAccount;
        this.stateAccountBump = stateAccountBump;
        this.escrowAccount = escrowAccount;
        this.rewardFundsAccount = rewardFundsAccount;
        this.stakanMint = stakanMint;
    }
    
    async getBalance(): Promise<number> {
        return await this.connection.getBalance(this.escrowAccount);
    }
  
    async getRewardFundsBalance(): Promise<anchor.web3.RpcResponseAndContext<anchor.web3.TokenAmount>> {
      return await this.connection.getTokenAccountBalance(this.rewardFundsAccount);
    }
}

export async function findOnChainStakanAccount(connection: anchor.web3.Connection): 
//Promise<accountsSchema.StakanStateSchema | undefined> {
  Promise<StakanState | undefined> {
  const Base58 = require("base-58");
  const accounts 
    = await connection.getParsedProgramAccounts(
        program.programId,
        {
          filters: [ 
            { memcmp: { offset: 8 + 4, 
                        bytes: Base58.encode(Buffer.from(program.programId.toBase58()))
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
        connection,
        new anchor.web3.PublicKey(Buffer.from(stakanAccountData['stakan_state_account'])),
        stakanAccountData['stakan_state_account_bump'],
        new anchor.web3.PublicKey(Buffer.from(stakanAccountData['escrow_account'])),
        new anchor.web3.PublicKey(Buffer.from(stakanAccountData['reward_funds_account'])),
        new anchor.web3.PublicKey(Buffer.from(stakanAccountData['mint_token'])),
        stakanAccountData['global_max_score'],

      )  
      return stakanState;
//      return stakanAccountData;
    }
    catch {
    }
  }
  return undefined;
}

export async function setUpStakan(connection: anchor.web3.Connection) {
//: Promise<StakanState> {
    const stakanTokensAmount = 1000;
    
    const [stakanStateAccount, stakanStateAccountBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('stakan_state_account'), 
        ],
        program.programId
      );
    const [stakanEscrowAccount, stakanEscrowAccountBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('stakan_escrow_account'), 
        ],
        program.programId
      );

  
    const [stakanMint, stakanMintBump] = await anchor.web3.PublicKey.findProgramAddress(
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
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
      })
      .signers([(program.provider.wallet as NodeWallet).payer])
      .rpc();
  
/*
    const stakanState = new StakanState(
        connection,
//        program.provider.wallet as NodeWallet,
        stakanStateAccount,
        stakanStateAccountBump,
        stakanEscrowAccount,
        rewardFundsAccount,
        stakanMint,
//        stakanMintBump,
    );
    return stakanState;
    */
}

export class User {
    username: string;
    connection: anchor.web3.Connection;
    wallet: anchor.web3.Keypair;
    arweave: Arweave;
    account?: anchor.web3.PublicKey; // pda user state account
    tokenAccount?: anchor.web3.PublicKey; // pda user token account
    arweaveWallet: JWKInterface;
    arweaveStorageAddress: string;
    bump?: number;
    gameSessionAccount?: anchor.web3.PublicKey; // pda of ongoing game session account
    gameSessionAccountBump?: number;
  
    constructor(
        username: string, 
        connection: anchor.web3.Connection,
        wallet: anchor.web3.Keypair, 
        arweave: Arweave, 
        arweaveWallet: JWKInterface,
        arweaveStorageAddress: string,
    ) {
      this.username = username;
      this.connection = connection;
      this.wallet = wallet;
      this.arweave = arweave;
      this.arweaveWallet = arweaveWallet;
      this.arweaveStorageAddress = arweaveStorageAddress;
    }
    
    isSignedUp(): boolean {
      return !this.account === undefined
    }

    async getBalance(): Promise<number> {
      return await this.connection.getBalance(this.wallet.publicKey);
    }
    
    async getTokenBalance(): Promise<anchor.web3.RpcResponseAndContext<anchor.web3.TokenAmount>> {
      return await this.connection.getTokenAccountBalance(this.tokenAccount as anchor.web3.PublicKey);
    }
  
    setGameSession(
      gameSessionAccount?: anchor.web3.PublicKey, 
      gameSessionAccountBump?: number,
    ) {
      this.gameSessionAccount = gameSessionAccount;
      this.gameSessionAccountBump = gameSessionAccountBump;
    }

    async getGameSessionInfo(): Promise<accountsSchema.GameSessionAccount | undefined> {
      const accountInfo 
        = await this.connection.getAccountInfo(this.gameSessionAccount as anchor.web3.PublicKey);
      
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
        = await this.connection.getParsedProgramAccounts(
            program.programId,
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

    const [userAccount, userAccountBump] = await anchor.web3.PublicKey.findProgramAddress(
        [
            Buffer.from('user_account'), 
            Buffer.from(user.username).slice(0, 20),
            Buffer.from(user.arweaveStorageAddress).slice(0, 20),
        ],
        program.programId
    );

    const tokenAccount = await spl.Token.getAssociatedTokenAddress(
        spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        spl.TOKEN_PROGRAM_ID,
        stakanState.stakanMint,
        userAccount,
        true,
    );

    await program.methods
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
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
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
  
    await program.methods
      .purchaseTokens(
        new anchor.BN(tokenAmount),
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
  
    await program.methods
      .sellTokens(
        user.bump as number,
        new anchor.BN(tokenAmount),
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
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
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
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('game_session_account'), 
          Buffer.from(user.username).slice(0, 20),
          Buffer.from(user.arweaveStorageAddress).slice(0, 20),
        ],
        program.programId
      );
    
    await program.methods
      .initGameSession(
        new anchor.BN(stake),
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
    tx.addTag('stakanApi.User', (user.account as anchor.web3.PublicKey).toString());
    
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
    
    await program.methods
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
  
    await program.methods
      .updateGameSession(
        new anchor.BN(score),
        new anchor.BN(duration),
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
    await program.methods
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
  