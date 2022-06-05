import * as anchor from "@project-serum/anchor";
import * as spl from '@solana/spl-token';
import Arweave from "arweave";

import { Stakan } from "../../target/types/stakan";
import * as accountsSchema from "../../app/src/accountsSchema";

const axios = require('axios');

const program = anchor.workspace.Stakan as anchor.Program<Stakan>;
//const programWallet = program.provider.wallet;
const { SystemProgram } = anchor.web3;

export class StakanState {
    connection: anchor.web3.Connection
    wallet
    stateAccount: anchor.web3.PublicKey
    stateAccountBump: number;
    rewardFundsAccount: anchor.web3.PublicKey;
    rewardFundsAccountBump: number;
    stakanMint: anchor.web3.PublicKey;
    stakanMintBump: number;
  
    constructor(
        connection: anchor.web3.Connection,
        wallet,
        stateAccount: anchor.web3.PublicKey,
        stateAccountBump: number,
        rewardFundsAccount: anchor.web3.PublicKey,
        stakanMint: anchor.web3.PublicKey,
        stakanMintBump: number,
    ) {
        this.connection = connection;
        this.wallet = wallet;
        this.stateAccount = stateAccount;
        this.stateAccountBump = stateAccountBump;
        this.rewardFundsAccount = rewardFundsAccount;
        this.stakanMint = stakanMint;
        this.stakanMintBump = stakanMintBump;
    }
    
    async getBalance(): Promise<number> {
        return await this.connection.getBalance(this.wallet.publicKey);
    }
  
    async getRewardFundsBalance(): Promise<anchor.web3.RpcResponseAndContext<anchor.web3.TokenAmount>> {
      return await this.connection.getTokenAccountBalance(this.rewardFundsAccount);
    }
  }
  
export async function setUpStakan(connection: anchor.web3.Connection): Promise<StakanState> {
    const stakanTokensAmount = 1000;
    
    const [stakanStateAccount, stakanStateAccountBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('stakan_state_account'), 
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
          mint: stakanMint,
          rewardFundsAccount,
  
          programWallet: program.provider.wallet.publicKey,
          
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID, //tokenProgramID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
      })
      .signers([program.provider.wallet.payer])
      .rpc();
  
    console.log("after setup");
    const stakanState = new StakanState(
        connection,
        program.provider.wallet,
        stakanStateAccount,
        stakanStateAccountBump,
        rewardFundsAccount,
        stakanMint,
        stakanMintBump,
    );
    return stakanState;
}

export class User {
    username: string;
    connection: anchor.web3.Connection;
    wallet: anchor.web3.Keypair;
    arweave: Arweave;
    account: anchor.web3.PublicKey | undefined; // pda user state account
    tokenAccount: anchor.web3.PublicKey | undefined; // pda user token account
    arweaveWallet;
    arweaveStorageAddress: string;
    bump: number;
    gameSessionAccount: anchor.web3.PublicKey | undefined; // pda of ongoing game session account
    gameSessionAccountBump: number | undefined;
  
    constructor(
        username: string, 
        connection: anchor.web3.Connection,
        wallet: anchor.web3.Keypair, 
        arweave: Arweave, 
        arweaveWallet
    ) {
      this.username = username;
      this.connection = connection;
      this.wallet = wallet;
      this.arweave = arweave;
      this.arweaveWallet = arweaveWallet;

      arweave.wallets.getAddress(arweaveWallet)
        .then(arweaveStorageAddress => {
            this.arweaveStorageAddress = arweaveStorageAddress;
        });
    }
    
    isSignedUp(): boolean {
      return !this.account === undefined
    }

    async getBalance(): Promise<number> {
      return await this.connection.getBalance(this.wallet.publicKey);
    }
    
    async getTokenBalance(): Promise<anchor.web3.RpcResponseAndContext<anchor.web3.TokenAmount>> {
      return await this.connection.getTokenAccountBalance(this.tokenAccount);
    }
  
    setGameSession(gameSessionAccount, gameSessionAccountBump) {
      this.gameSessionAccount = gameSessionAccount;
      this.gameSessionAccountBump = gameSessionAccountBump;
    }
    async getGameSessionInfo() {
      const accountInfo = await this.connection.getAccountInfo(this.gameSessionAccount);
      let userAccountData = accountsSchema.GameSessionAccount.deserialize(accountInfo.data);
      return userAccountData;
    }
}
  
export async function signUpUser(user: User,stakanState: StakanState,) {  
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
        stakanState.stateAccountBump,
        new anchor.BN(tokenAmount),
      )
      .accounts({
        stakanStateAccount: stakanState.stateAccount,
        mint: stakanState.stakanMint,
        userAccount: user.account,
        userTokenAccount: user.tokenAccount,
        userWallet: user.wallet.publicKey,
        programWallet: stakanState.wallet.publicKey,
  
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
        user.bump,
        new anchor.BN(tokenAmount),
      )
      .accounts({
        stakanStateAccount: stakanState.stateAccount,
        userAccount: user.account,
        userTokenAccount: user.tokenAccount,
        userWallet: user.wallet.publicKey,
        programWallet: stakanState.wallet.publicKey,
        rewardFundsAccount: stakanState.rewardFundsAccount,
  
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([stakanState.wallet.payer])
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

  async function saveToArweave(user: User, data): Promise<string> {
    const serializedData = accountsSchema.GameSessionArchive.serialize(data);
  
  //  GameSessionArchive.deserialize(serializedData);
    const tx = await user.arweave.createTransaction({
      data: serializedData
    });
    tx.addTag('App-Name', 'Stakan');
    tx.addTag('stakanApi.User', user.account.toString());
    
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
  
    const txid = await saveToArweave(user, 
      {
        score: gameSessionInfo['score'],
        duration: gameSessionInfo['duration_millis'],
      }
    );
  
    await program.methods
      .finishGameSession(
        txid,
        user.bump,
        stakanState.stateAccountBump,
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
        user.bump,
      )
      .accounts({
        stakanStateAccount: stakanState.stateAccount,
        userAccount: user.account,
        userTokenAccount: user.tokenAccount,
        userWallet: user.wallet.publicKey,
        programWallet: stakanState.wallet.publicKey,
        rewardFundsAccount: stakanState.rewardFundsAccount,
  
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([stakanState.wallet.payer])
      .rpc();  
  }
  