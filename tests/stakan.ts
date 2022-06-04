import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import * as spl from '@solana/spl-token';

//import * as spl from '@solana/spl-token';
//import { Connection } from "@solana/web3.js";
import { Stakan } from "../target/types/stakan";

import Arweave from "arweave";
import { serialize, deserialize } from "borsh";
//import ArLocal from 'arlocal';
const axios = require('axios');

class StakanState {
  stateAccount: anchor.web3.PublicKey
  stateAccountBump: number;
  private mint: spl.Token;
  tokenFaucet: anchor.web3.PublicKey;
  tokenFaucetBump: number;
  rewardFundsAccount: anchor.web3.PublicKey;
  rewardFundsAccountBump: number;
  stakanMintPda: anchor.web3.PublicKey;
  stakanMintPdaBump: number;

  constructor(
    stateAccount: anchor.web3.PublicKey,
    stateAccountBump: number,
    mint: spl.Token, 
    tokenFaucet: anchor.web3.PublicKey,
    tokenFaucetBump: number,
    rewardFundsAccount: anchor.web3.PublicKey,
//    rewardFundsAccountBump: number,
    stakanMintPda: anchor.web3.PublicKey,
    stakanMintPdaBump: number,
    ) {
      this.stateAccount = stateAccount;
      this.stateAccountBump = stateAccountBump;
      this.mint = mint;
      this.tokenFaucet = tokenFaucet;
      this.tokenFaucetBump = tokenFaucetBump;
      this.rewardFundsAccount = rewardFundsAccount;
//      this.rewardFundsAccountBump = rewardFundsAccountBump;
      this.stakanMintPda = stakanMintPda;
      this.stakanMintPdaBump = stakanMintPdaBump;
  }

  getMintPublicKey(): anchor.web3.PublicKey {
    return this.mint.publicKey;
  }
}

class User {
  username: string;
  wallet: anchor.web3.Keypair;
  account: anchor.web3.PublicKey | undefined; // pda user state account
  tokenAccount: anchor.web3.PublicKey | undefined; // pda user token account
  arweaveWallet;
  arweaveStorageAddress: string;
  bump: number;
  gameSessionAccount: anchor.web3.PublicKey | undefined; // pda of ongoing game session account
  gameSessionAccountBump: number | undefined;

  constructor(username: string, wallet: anchor.web3.Keypair) {
    this.username = username;
    this.wallet = wallet;
  }
  
  isSignedUp(): boolean {
    return !this.account === undefined
  }

  async assignArweaveWallet(arweaveWallet) {
    const arweaveStorageAddress = await arweave.wallets.getAddress(arweaveWallet);

    this.arweaveWallet = arweaveWallet;
    this.arweaveStorageAddress = arweaveStorageAddress;
  }

  async getBalance(): Promise<number> {
    return await provider.connection.getBalance(this.wallet.publicKey);
  }
  
  async getTokenBalance(): Promise<anchor.web3.RpcResponseAndContext<anchor.web3.TokenAmount>> {
    return await provider.connection.getTokenAccountBalance(this.tokenAccount);
  }

  setGameSession(gameSessionAccount, gameSessionAccountBump) {
    this.gameSessionAccount = gameSessionAccount;
    this.gameSessionAccountBump = gameSessionAccountBump;
  }
  async getGameSessionInfo() {
    const accountInfo = await provider.connection.getAccountInfo(this.gameSessionAccount);
    let userAccountData = GameSessionAccount.deserialize(accountInfo.data);
    return userAccountData;
  }
}

class Assignable {
  constructor(properties) {
    Object.keys(properties).map((key) => {
      return (this[key] = properties[key]);
    });
  }
}

class UserAccountWrapped extends Assignable { 
  public static deserialize(buffer: Buffer): [number, Buffer] {
    const schema = new Map([
      [
        UserAccountWrapped, 
        { 
          kind: 'struct', 
          fields: [
              ['discriminant', [8]],
              ['inner_size', 'u16'], 
            ] 
        }
      ]
    ]);
    const wrapped = deserialize(schema, UserAccountWrapped, buffer.slice(0, 8+2));
    const inner_size = wrapped['inner_size'];
    return [inner_size, buffer.slice(8+2, 8+2+inner_size)];
  }
}

class UserAccount extends Assignable { 
  public static deserialize(buffer: Buffer): UserAccount {
    const schema = new Map([
      [
        UserAccount, 
        { 
          kind: 'struct', 
          fields: [
            ['username', 'String'], 
            ['max_score', 'u64'], 
            ['saved_game_sessions', 'u64'],
            ['user_wallet', [32]],
//            ['mint', [32]],
            ['token_account', [32]],
            ['arweave_storage_address', 'String'], 
          ] 
        }
      ]
    ]);
    const [data_size, inner_buffer] = UserAccountWrapped.deserialize(buffer);
//    console.log("----------- DATA SIZE: ", data_size);
    let data = deserialize(schema, UserAccount, inner_buffer);
//    let data = deserialize(schema, UserAccount, buffer.slice(8+2, buffer.length));
//    console.log("----------- DATA: ", data);
    return data;
  }
}

class GameSessionAccount extends Assignable { 
  public static deserialize(buffer: Buffer): GameSessionAccount {
    const schema = new Map([
      [
        GameSessionAccount, 
        { 
          kind: 'struct', 
          fields: [
              ['discriminant', [8]],
              ['user_account', [32]],
              ['score', 'u64'], 
              ['duration_millis', 'u64'], 
              ['stake', 'u64'], 
            ] 
        }
      ]
    ]);
    const acc = deserialize(schema, GameSessionAccount, 
      buffer.slice(0, 8+32+8+8+8));
    return acc;
  }
}

class GameSessionArchive extends Assignable { 
  static schema = new Map([
    [
      GameSessionArchive, 
      { 
        kind: 'struct', 
        fields: [
            ['score', 'u64'], 
            ['duration', 'u64']
          ] 
      }
    ]
  ]);

  public static serialize(data): Uint8Array {
    let buffer = serialize(GameSessionArchive.schema, new GameSessionArchive(data));
    return buffer;
  }

  public static deserialize(buffer: Uint8Array) {
    try {
      const data = deserialize(GameSessionArchive.schema, GameSessionArchive, Buffer.from(buffer));
      } catch(e) {
        console.log(e);
        throw e;
      }
  }

  public static async getArchiveIds(userAccount, numberOfArchives) {
    const queryObject = { query: `{
      transactions(first: ${numberOfArchives},
        tags: [
          {
            name: "App-Name",
            values: ["Stakan"]
          },
          {
            name: "User",
            values: ["${userAccount}"]
          },
        ]
      ) {
        edges {
          node {
            id
            owner {
              address
            }
            data {
              size
            }
            block {
              height
              timestamp
            }
            tags {
              name,
              value
            }
          }
        }
      }
    }`}
//    console.log("queryObject: ", queryObject);
    let results = await arweave.api.post('/graphql', queryObject);

    return results.data.data.transactions.edges.map(edge => edge.node.id);
  }

  public static async get(userAccount, numberOfArchives) {
    const archiveIds = await this.getArchiveIds(userAccount, numberOfArchives);

//    console.log("ARCHIVE IDS: ", archiveIds);    
    const archivedData = archiveIds.map(async id => {
      const buffer = await arweave.transactions.getData(id,
        { decode: true, string: false }
      );
      const data = deserialize(GameSessionArchive.schema, GameSessionArchive, Buffer.from(buffer));
//      console.log("DATA: ", data);
      return data;
    });
    return archivedData;
/*    
    edges.map(async edge => {
      console.log("Node ID: " + edge.node.id);
      const buffer = await arweave.transactions.getData(
        edge.node.id,
        { decode: true, string: false }
      );

      console.log("BUFFER FROM ARCHIVE: ", buffer);

      try {
      const data = deserialize(GameSessionArchive.schema, GameSessionArchive, Buffer.from(buffer));
      console.log("Data from Arweave: score, ", data['score'].toString(), ", duration: ", data['duration'].toString() );
      } catch(e) {
        console.log(e);
        throw e;
      }
      //      const data =  Buffer.from(buffer);
    });
    */

//    return edges;
  }
}

/*
const arweave = Arweave.init({
  host: 'localhost',
  port: 1984,
  protocol: 'http',
  timeout: 20000,
  logging: false,
}); 
*/
import Bip39 from 'bip39';

let duration = 0;
let arweave: Arweave = undefined;
//let arLocal: ArLocal = undefined;

//let arweaveWallet = undefined;

function simulateGameLoop(
  program: Program<Stakan>,
  gameSessionAccount: any,
  interval: number
) {

  const intervalId = setInterval( async () => {
    duration += interval;

    console.log("Game session running:  ", duration, " ms");
  }, interval);

  return intervalId;
}


let assert = require('assert');

const program = anchor.workspace.Stakan as Program<Stakan>;
//const tokenProgramID = anchor.Spl.token().programId;
const tokenProgramID = spl.TOKEN_PROGRAM_ID;

const { SystemProgram } = anchor.web3;
const provider = anchor.Provider.env();
let programWallet;

let user: User;
let user2: User;
let stakanState: StakanState;

async function setUpStakan(
  ) {
    anchor.setProvider(provider);
    programWallet = program.provider.wallet;

    let stakanTokensAmount = 1000;
  
    console.log("before minting ", stakanTokensAmount, " Stakan Tokens...");
  
    const [stakanStateAccount, stakanStateAccountBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('stakan_state_account'), 
        ],
        program.programId
      );

    const [tokenFaucet, tokenFaucetBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('token_faucet'),
      ],
        program.programId
    );
/*
    const [rewardFundsAccount, rewardFundsAccountBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('reward_funds_account'),
      ],
        program.programId
    );
*/
    
    const [stakanMintPda, stakanMintPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('stakan_mint'),
      ],
      program.programId
    );

    let rewardFundsAccount = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      stakanMintPda,
      stakanStateAccount,
      true,
    );
//    const rewardFundsAccountBump = undefined;

    const stakanMint = await spl.Token.createMint(
      program.provider.connection,
      programWallet.payer,
      programWallet.publicKey,
      programWallet.publicKey,    // freeze authority
      0,  // decimals
      tokenProgramID
    );

    console.log("before init mint");
/*
    await program.methods
      .initMint(
        stakanMintPdaBump,
      )
      .accounts({
          stakanStateAccount,
          mintPda: stakanMintPda,

          programWallet: programWallet.publicKey,
          
          tokenProgram: tokenProgramID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
      })
      .signers([programWallet.payer])
      .rpc();
*/
    console.log("after init mint");

    await program.methods
      .setUpStakan(
        stakanStateAccountBump,
      )
      .accounts({
          stakanStateAccount,
//          mint: stakanMint.publicKey,
          mint: stakanMintPda,
//          tokenFaucet,
          rewardFundsAccount,

          programWallet: programWallet.publicKey,
          
          tokenProgram: tokenProgramID,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID, //tokenProgramID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
      })
      .signers([programWallet.payer])
      .rpc();

      console.log("after setup");
      stakanState = new StakanState(
        stakanStateAccount,
        stakanStateAccountBump,
        stakanMint, 
        tokenFaucet,
        tokenFaucetBump,
        rewardFundsAccount,
//        rewardFundsAccountBump,
        stakanMintPda,
        stakanMintPdaBump,
      );
/*    
    stakanTokens = await stakanMint.createAssociatedTokenAccount(
      programWallet.publicKey
    );
*/  
//await stakanMint.mintTo(associatedTokenAccount, stakanStateAccount, [programWallet.payer], stakanTokensAmount);
//await stakanMint.mintTo(tokenFaucet, programWallet.publicKey, [], stakanTokensAmount);
/*  
    let tokenAmount 
      = await program.provider.connection.getTokenAccountBalance(tokenFaucet);
  
    console.log("after minting, owner balance: ", tokenAmount);
    */
}
  
async function signUpUser(
  user: User,
  stakanState: StakanState,
//  mint: spl.Token,
//  mintPublicKey: anchor.web3.PublicKey,
) {  
  const arweaveWallet = await arweave.wallets.generate();

  await user.assignArweaveWallet(arweaveWallet);

  console.log("arweave wallet address:", user.arweaveStorageAddress, "len: ", user.arweaveStorageAddress.length);

  const tokens = arweave.ar.arToWinston('10')
  await arweave.api.get(`/mint/${user.arweaveStorageAddress}/${tokens}`)

  const balance = await arweave.wallets.getBalance(user.arweaveStorageAddress);
  assert(balance, 10);

/*
  const userBalanceBefore = await provider.connection.getBalance(userWallet.publicKey);
  console.log("user balance before: ", userBalanceBefore);
*/

  const [userAccount, userAccountBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('user_account'), 
        Buffer.from(user.username).slice(0, 20),
        Buffer.from(user.arweaveStorageAddress).slice(0, 20),
      ],
      program.programId
    );

    console.log("stakanState.stakanMintPda: ", stakanState.stakanMintPda);

    const tokenAccount = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      stakanState.stakanMintPda,
      userAccount,
      true,
    );
/*  
  const [tokenAccount, tokenAccountBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('user_token_account'), Buffer.from(user.username).slice(0, 20)],
      program.programId
    );
*/  
  await program.methods
    .signUpUser(
      user.username,
      user.arweaveStorageAddress,
    )
    .accounts({
        stakanStateAccount: stakanState.stateAccount,
        userAccount,
        userWallet: user.wallet.publicKey,
        mint: stakanState.stakanMintPda,
        tokenAccount,

        tokenProgram: tokenProgramID,
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

async function purchaseStakanTokens(user: User,
//  mint: spl.Token,
  stakanState: StakanState,
  tokenAmount: number,
) {
  console.log("before purchasing tokens...");
  console.log("userWallet balance: ", 
    await user.getBalance());
  console.log("programWallet balance: ", 
    await provider.connection.getBalance(programWallet.publicKey));
  console.log("userMintAccount balance: ", 
    await user.getTokenBalance());
//    await provider.connection.getTokenAccountBalance(user.tokenAccount));

//await stakanState.mint.mintTo(user.tokenAccount, programWallet.publicKey, [], 10000);


  await program.methods
    .purchaseTokens(
      stakanState.stateAccountBump,
      new anchor.BN(tokenAmount),
    )
    .accounts({
      stakanStateAccount: stakanState.stateAccount,
//      mint: stakanState.getMintPublicKey(),
      mint: stakanState.stakanMintPda,
      userAccount: user.account,
      userTokenAccount: user.tokenAccount,
      userWallet: user.wallet.publicKey,
//      tokenFaucet: stakanState.tokenFaucet,
      programWallet: programWallet.publicKey,

      tokenProgram: tokenProgramID,
      systemProgram: SystemProgram.programId,
    })
    .signers([user.wallet])
    .rpc();

    console.log("after purchasing tokens");
    console.log("userWallet balance: ", 
      await user.getBalance());
    console.log("programWallet balance: ", 
      await provider.connection.getBalance(programWallet.publicKey));
    
    const userTokenBalance = await user.getTokenBalance();
    console.log("user token balance: ", userTokenBalance);

    assert(userTokenBalance, tokenAmount);
//      await provider.connection.getTokenAccountBalance(user.tokenAccount)); 
}

async function initGameSession(
  user: User,
  stake: number,
) {
  const [gameSessionAccount, gameSessionAccountBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('game_session_account'), 
//        Buffer.from(user.username).slice(0, 20)
      ],
      program.programId
    );
  
  await program.methods
    .initGameSession(
      new anchor.BN(stake),
      user.bump,
    )
    .accounts({
        stakanStateAccount: stakanState.stateAccount,
        rewardFundsAccount: stakanState.rewardFundsAccount,
        userAccount: user.account,
        userTokenAccount: user.tokenAccount,
//        programTokenAccount: stakanState.tokenFaucet,
        gameSessionAccount,
        userWallet: user.wallet.publicKey,

        tokenProgram: tokenProgramID,
        systemProgram: SystemProgram.programId,
    })
    .signers([user.wallet])
    .rpc();
  
  user.setGameSession(gameSessionAccount, gameSessionAccountBump);
//  return [gameSessionAccount, gameSessionAccountBump];
}

async function saveToArweave(user: User, data): Promise<string> {
  const serializedData = GameSessionArchive.serialize(data);
//  console.log("SERIALIZED: ", serializedData);

//  GameSessionArchive.deserialize(serializedData);
  const tx = await arweave.createTransaction({
    data: serializedData
  });
//  console.log("Transaction DATa: ", tx.data);
  tx.addTag('App-Name', 'Stakan');
  tx.addTag('User', user.account.toString());
  
  await arweave.transactions.sign(tx, user.arweaveWallet);
  await arweave.transactions.post(tx);
  // mine transaction to simulate immediate confirmation
  await axios.get('http://localhost:1984/mine');

  const statusAfterPost = await arweave.transactions.getStatus(tx.id);
//  console.log("status after post: ", statusAfterPost.confirmed);
  return statusAfterPost.status === 200 ? tx.id : undefined;
}

async function finishGameSession(
  user: User,
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
//        programTokenAccount: stakanState.tokenFaucet,       
        rewardFundsAccount: stakanState.rewardFundsAccount,

        tokenProgram: tokenProgramID,
        systemProgram: SystemProgram.programId,
    })
    .signers([])
    .rpc();

   user.setGameSession(undefined, undefined);
}

async function updateGameSession(
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

before(async () => {
  arweave = Arweave.init({
    host: 'localhost',
    port: 1984,
    protocol: 'http',
    timeout: 20000,
    logging: false,
  });
    
  anchor.setProvider(provider);
//  programWallet = program.provider.wallet;

  await setUpStakan();

  const userWallet = anchor.web3.Keypair.generate();
  user = new User("𝖠Β𝒞𝘋𝙴𝓕ĢȞỈ𝕵ꓗʟ𝙼ℕ০𝚸𝗤ՀꓢṰǓⅤ𝔚Ⲭ𝑌𝙕𝘢𝕤", userWallet);

  user2 = new User("superman", userWallet);

//  [gameSessionAccount, gameSessionAccountBump] = [undefined, undefined];
/*
  const dummyTokenReceiver = await stakanMint.createAssociatedTokenAccount(
    anchor.web3.Keypair.generate().publicKey
  );

  await stakanMint.transfer(stakanTokens, 
    dummyTokenReceiver,
    program.provider.wallet.publicKey, 
//    gameGlobalWallet,
    [],
    400
  );

  const tokenAmount 
    = await program.provider.connection.getTokenAccountBalance(stakanTokens);
    */
/*
  console.log("after transfer, owner balance: ", tokenAmount, 
    "receiver balance:",
    await program.provider.connection.getTokenAccountBalance(dummyTokenReceiver)
  );
*/
  /*
  [alice, aliceWallet] = await createUserAndAssociatedWallet(provider.connection, mintAddress);

  let _rest;
  [bob, ..._rest] = await createUserAndAssociatedWallet(provider.connection);
*/

});


describe("stakan", () => {
  it("Airdrop!", async () => {
/*    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(gameGlobalWallet.publicKey, 100000000000)
    );
*/    
    await provider.connection.confirmTransaction( 
      await provider.connection.requestAirdrop(user.wallet.publicKey, 1000000000)
    );
  });

  it("Sign up user", async () => {
    await signUpUser(user, stakanState);
//    await signUpUser(user, stakanState.getMintPublicKey());

    const accountInfo = await provider.connection.getAccountInfo(user.account);
    let userAccountData = UserAccount.deserialize(accountInfo.data);

    console.log("User ", userAccountData['username'], " signed up");
      //    await signUpUser("суперман", userWallet, stakanState.mint.publicKey);
//    await signUpUser("superman&supergirl", userWallet, stakanState.mint.publicKey);
  });

  it("Sign up another user with the same wallet (allowed for now)", async () => {
    await signUpUser(user2, stakanState);
 //   await signUpUser(user2, stakanState.getMintPublicKey());          

    const accountInfo = await provider.connection.getAccountInfo(user2.account);
    let userAccountData = UserAccount.deserialize(accountInfo.data);

    console.log("User ", userAccountData['username'], " signed up");
  });

  it("SHOULD FAIL: Init game session (no tokens on account to stake)", async () => {
    const stake = 1;
    try {
      await initGameSession(user, stake);
      
      const accountInfo = await provider.connection.getAccountInfo(user.gameSessionAccount);
      let accountData = GameSessionAccount.deserialize(accountInfo.data);
    
      console.log("Game session initialized: score: ", accountData['score'].toString());
    } catch {
      return;
    }
    throw "Should have failed for insufficient tokens to stake";
  });

  it("Purchase tokens", async () => {
    await purchaseStakanTokens(user, stakanState, 10);
  })

  it("Init game session", async () => {
    const stake = 1;
    await initGameSession(user, stake);
    
    const accountInfo = await provider.connection.getAccountInfo(user.gameSessionAccount);
    let accountData = GameSessionAccount.deserialize(accountInfo.data);
  
    const gameSessionInfo = await user.getGameSessionInfo();

    console.log("Game session initialized: score: ", 
      accountData['score'].toString(),
      ", stake: ", gameSessionInfo['stake']);
  });

  it("Update game session 1", async () => {
    await updateGameSession(user, 10, 100);      
    
    const accountInfo = await provider.connection.getAccountInfo(user.gameSessionAccount);
    let accountData = GameSessionAccount.deserialize(accountInfo.data);
  
    console.log("Game session updated: score: ", accountData['score'].toString());  
  });

  it("Update game session 2", async () => {
    await updateGameSession(user, 20, 200);      
    
    const accountInfo = await provider.connection.getAccountInfo(user.gameSessionAccount);
    let accountData = GameSessionAccount.deserialize(accountInfo.data);
  
    console.log("Game session updated: score: ", accountData['score'].toString());  
  });

  it("Finish game session", async () => {
    await finishGameSession(user);      

    const numberOfArchives = 1;
    const archivedData = await GameSessionArchive.get(user.account, numberOfArchives);

    Promise.all(
      archivedData
    ).then(archivedData => archivedData.forEach(data => {
      console.log("Archived score: ", data['score'].toString(), ", duration: ", data['duration'].toString());
    }));     

    const userTokenBalance = await user.getTokenBalance();
    console.log("User token balance: ", userTokenBalance);
  });

  const bip39 = require('bip39');

//  const stakanMnemonicToSeed = bip39.mnemonicToSeedSync('Stakan').slice(0, 32);
//  const seed = stakanMnemonicToSeed.map( (x, i) => x + userWallet.secretKey[i] );

//  console.log("seed size: ", seed.length);
/*  const UserAccountKeypair = anchor.web3.Keypair.fromSeed(
    seed 
  );
*/
/*
  it("Arweave create test transaction!", async () => {
//    const testWeave = await TestWeave.init(arweave);
    let data = "test arweave transaction creation";

    const dataTransaction = await arweave.createTransaction({
      data
    });
    
    dataTransaction.addTag('App-Name', 'Stakan');

    await arweave.transactions.sign(dataTransaction, arweaveWallet)
    const statusBeforePost = await arweave.transactions.getStatus(dataTransaction.id)
    assert(statusBeforePost, 404);
    await arweave.transactions.post(dataTransaction)
    const statusAfterPost = await arweave.transactions.getStatus(dataTransaction.id)
    assert(statusAfterPost, 202);

    await axios.get('http://localhost:1984/mine');
    const statusAfterMine = await arweave.transactions.getStatus(dataTransaction.id)
    console.log(statusAfterMine); // this will return 200
    assert(statusAfterPost, 200);
  });

  
  it("User game archive!", async () => {
    await getUserGameArchive();
  });


async function getUserGameArchive() {
  const accountInfo = await provider.connection.getAccountInfo(UserAccountKeypair.publicKey);
  
  let UserAccountData = UserAccount.deserialize(accountInfo.data.slice(0, 8+8+8));
  Promise.all(
    await GameSessionArchive.get(
      userWallet.publicKey, 
      UserAccountData['saved_game_sessions']
    )
  ).then(archivedData => archivedData.forEach(data => {
    console.log("Archived score: ", data['score'].toString(), ", duration: ", data['duration'].toString());
  }));
}
*/
/*
  it("Short game loop run!", async () => {
    const interval = 400;
    const intervalId = simulateGameLoop(program, gameSessionAccountKeypair.publicKey, interval);
  
    setTimeout( async () => {
        clearInterval(intervalId);

        console.log("before saving session");

        console.log("User wallet before saving: ", 
          await provider.connection.getBalance(userWallet.publicKey));
        console.log("Program wallet before saving: ", 
          await provider.connection.getBalance(programWallet.publicKey));

        const tx = await program.rpc.saveGameSession(
          new anchor.BN(42),
          new anchor.BN(duration),
          {
            accounts: {
              gameSessionAccount: gameSessionAccountKeypair.publicKey,
              gameGlobalAccount: gameGlobalAccountKeypair.publicKey,
              userWalletForReward: userWallet.publicKey,
              globalWallet: programWallet.publicKey,
              systemProgram: SystemProgram.programId,
          },
//          signers: [],
          signers: [],
        });


      console.log("after saving: ");

      console.log("User wallet after saving: ", 
          await provider.connection.getBalance(userWallet.publicKey));
        console.log("Game account after saving: ", 
          await provider.connection.getBalance(programWallet.publicKey));

        const gameSession = 
          await program.account.gameSession.fetch(gameSessionAccountKeypair.publicKey);
  
        console.log("Game session after saved: ", gameSession);


        const gameGlobalAccount = 
          await program.account.gameGlobalState.fetch(gameGlobalAccountKeypair.publicKey);
  
        console.log("Game global account after saved: ", gameGlobalAccount);

        await program.rpc.closeGameSessionAccount(
          {
            accounts: {
              gameSessionAccount: gameSessionAccountKeypair.publicKey,
              userWallet: userWallet.publicKey,
              systemProgram: SystemProgram.programId,
          },
          signers: [userWallet],
        });

        console.log("after closing account");

        const signatures = 
      await provider.connection.getSignaturesForAddress(
        SystemProgram.programId,
 //       gameSessionAccountKeypair.publicKey, 
        {},
        'confirmed');
    console.log("After Game session transactions: ");
  
    for ( let i = 0; i < signatures.length; i++ ) {
      const sig = signatures[i].signature;
      const trans = await provider.connection.getTransaction(sig, {commitment: "confirmed"});
      if ( trans ) {
//        console.log("transaction account keys: ", trans);
      }
    }
    
      }, 4*interval + 10 
    );
  });
*/

});
