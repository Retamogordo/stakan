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

class Assignable {
  constructor(properties) {
    Object.keys(properties).map((key) => {
      return (this[key] = properties[key]);
    });
  }
}

class UserGameAccount extends Assignable { 
  public static deserialize(buffer: Buffer): UserGameAccount {
    const schema = new Map([
      [
        UserGameAccount, 
        { 
          kind: 'struct', 
          fields: [
              ['discriminant', [8]],
              ['max_score', 'u64'], 
              ['saved_game_sessions', 'u64']
            ] 
        }
      ]
    ]);
    let data = deserialize(schema, UserGameAccount, buffer);
    return data;
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
      console.log("Deser Archive: ", data);
      } catch(e) {
        console.log(e);
        throw e;
      }
  }

  public static async getArchiveIds(userWalletPublicKey, numberOfArchives) {
    const queryObject = { query: `{
      transactions(first: ${numberOfArchives},
        tags: [
          {
            name: "App-Name",
            values: ["Stakan"]
          },
          {
            name: "User",
            values: ["${userWalletPublicKey}"]
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

  public static async get(userWalletPublicKey, numberOfArchives) {
    const archiveIds = await this.getArchiveIds(userWalletPublicKey, numberOfArchives);
    
    const archivedData = archiveIds.map(async id => {
      const buffer = await arweave.transactions.getData(id,
        { decode: true, string: false }
      );
      const data = deserialize(GameSessionArchive.schema, GameSessionArchive, Buffer.from(buffer));
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

let arweaveWallet = undefined;

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
let stakanMint: spl.Token;
let userWallet;
let gameGlobalWallet;

async function signUpUser(
  username: string,
  userWallet, 
  mint: spl.Token,
) {

  const userBalanceBefore = await provider.connection.getBalance(userWallet.publicKey);
  console.log("user balance before: ", userBalanceBefore);
/*
  const userMintAccount = await mint.createAssociatedTokenAccount(
        userWallet.publicKey
  );
*/  
//  console.log("after mint acc. creation");
//  const userTokenAccount =  ;

  const [userTokenAccount, userTokenAccountBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('user_token_account')],
      program.programId
    );
  const [userMintAccount, userMintAccountBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('user_mint_account')],
      program.programId
    );

  //  const userTokenAccount = anchor.web3.Keypair.generate();
  
  await program.methods
    .signUpUser(
      username,
    )
    .accounts({
        userTokenAccount,
//      userTokenAccount: userTokenAccount.publicKey,
        userWallet: userWallet.publicKey,
//        userWallet: program.provider.wallet.publicKey,
        mint: mint.publicKey,
        mintAccount: userMintAccount,

        tokenProgram: tokenProgramID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
    })
    .signers([userWallet])
    .rpc();

}

before(async () => {
  anchor.setProvider(provider);
  programWallet = provider.wallet;

  gameGlobalWallet = anchor.web3.Keypair.generate();
  userWallet = anchor.web3.Keypair.generate();

//  anchor.Spl.token()
  console.log("before minting");
  
//  anchor.Spl.token().methods.initializeMint
  stakanMint = await spl.Token.createMint(
    program.provider.connection,
    programWallet.payer,
    programWallet.publicKey,
//    gameGlobalWallet.publicKey, // mint authority
//    gameGlobalWallet.publicKey, // freeze authority
    programWallet.publicKey,    // freeze authority
    0,  // decimals
    tokenProgramID
//    spl.TOKEN_PROGRAM_ID
  );
  let stakanTokens = await stakanMint.createAssociatedTokenAccount(
//    program.provider.wallet.publicKey
    gameGlobalWallet.publicKey
  );

  await stakanMint.mintTo(stakanTokens, program.provider.wallet.publicKey, [], 1000);
//  await stakanMint.mintTo(stakanTokens, gameGlobalWallet.publicKey, [programWallet.payer], 1000);

  let tokenAmount 
    = await program.provider.connection.getTokenAccountBalance(stakanTokens);

  console.log("after minting, owner balance: ", tokenAmount);

  const dummyTokenReceiver = await stakanMint.createAssociatedTokenAccount(
    anchor.web3.Keypair.generate().publicKey
  );

  await stakanMint.transfer(stakanTokens, 
    dummyTokenReceiver, 
    gameGlobalWallet,
    [],
    400
  );

  tokenAmount 
    = await program.provider.connection.getTokenAccountBalance(stakanTokens);
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
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(gameGlobalWallet.publicKey, 100000000000)
    );
    
    await provider.connection.confirmTransaction( 
      await provider.connection.requestAirdrop(userWallet.publicKey, 1000000000)
    );
  });

  it("Sign up user", async () => {
    await signUpUser("superman", userWallet, stakanMint);
  });
//  return;

  // Configure the client to use the local cluster.
  const gameGlobalAccountKeypair = anchor.web3.Keypair.generate();

  const userWallet = anchor.web3.Keypair.generate();


  let gameSessionAccountKeypair;
  let [pdaGameSessionAccount, pdaGameSessionAccountBump] = [undefined, undefined];

  const bip39 = require('bip39');

  const stakanMnemonicToSeed = bip39.mnemonicToSeedSync('Stakan').slice(0, 32);
  const seed = stakanMnemonicToSeed.map( (x, i) => x + userWallet.secretKey[i] );

//  console.log("seed size: ", seed.length);
  const userGameAccountKeypair = anchor.web3.Keypair.fromSeed(
    seed 
  );


  it("Arweave init!", async () => {
//    await arLocal.start();
/*
    arweave = Arweave.init({
      host: 'testnet.redstone.tools',
      port: 443,
      protocol: 'https'
    });
*/
    arweave = Arweave.init({
      host: 'localhost',
      port: 1984,
      protocol: 'http',
      timeout: 20000,
      logging: false,
    });
//    console.log("after init");

    arweaveWallet = await arweave.wallets.generate();

    const addr = await arweave.wallets.getAddress(arweaveWallet);
    console.log("arweave wallet address:", addr, "len: ", addr.length);


//    arweave.wallets.
//    console.log("after wallet get address");

    const tokens = arweave.ar.arToWinston('10')
    await arweave.api.get(`/mint/${addr}/${tokens}`)
//    console.log("after minting token");
 
    const balance = await arweave.wallets.getBalance(addr)
    assert(balance, 10);
  });

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

  it("Airdrop!", async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(gameGlobalWallet.publicKey, 100000000000)
    );
    
    await provider.connection.confirmTransaction( 
      await provider.connection.requestAirdrop(userWallet.publicKey, 1000000000)
    );
  });
 
  it("Game session is started!", async () => {
    const user = anchor.web3.Keypair.generate();
    const stakeWallet = anchor.web3.Keypair.generate();

    await initGameSession(user,
      userWallet, 
      stakeWallet,
      arweaveAddress,
      1000000);
  });
  
  it("User game archive!", async () => {
    await getUserGameArchive();
  });

  
/*
  it("SHOULD FAIL: Game session is saved twice!", async () => {
    try {
      await saveGameSession(userWallet, gameGlobalWallet, gameSessionAccountKeypair, 42, 1234);
    }
    catch {
        return;
    }
    throw "Should have failed upon session saving twice";
  });
  */
  
async function initGameSession(
  user,
  userWallet,
  stakeWallet,
  arweaveAddress,  
  stake
  ) {      
  try {
    const userBalanceBefore = await provider.connection.getBalance(userWallet.publicKey);
//    const globalBalanceBefore = await provider.connection.getBalance(gameGlobalWallet.publicKey);
  
    console.log("User wallet before init: ", userBalanceBefore);
//    console.log("Game account before init: ", globalBalanceBefore);

    const pdaGameSessionAccountBalanceBefore = await provider.connection.getBalance(pdaGameSessionAccount);
    console.log("Game session(PDA) balance before init:", pdaGameSessionAccountBalanceBefore);
    console.log("Stake:", stake);

//    const rentExemption = await provider.connection.getMinimumBalanceForRentExemption(8 + 100);
//    console.log("rentExemption:", rentExemption);

    const [gameSessionAccount, gameSessionAccountBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [user.publicKey.toBuffer()],
        program.programId
      );

    const tx = await program.methods
      .initGameSession(
        arweaveAddress,
        new anchor.BN(stake),
      )
      .accounts({
          gameSessionAccount,
          user: user.publicKey,
          userWallet: userWallet.publicKey,
          stakeWallet: stakeWallet.publicKey,
          gameGlobalAccount: gameGlobalAccountKeypair.publicKey,
          stakeMint: stakeMint.publicKey,

          tokenProgram: tokenProgramID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

      const userBalanceAfter = await provider.connection.getBalance(userWallet.publicKey);
      const globalBalanceAfter = await provider.connection.getBalance(gameGlobalWallet.publicKey);
      const pdaGameSessionAccountBalanceAfter = await provider.connection.getBalance(pdaGameSessionAccount);
    
      console.log("User wallet after init: ", userBalanceAfter, ", delta: ", userBalanceBefore - userBalanceAfter);
//      console.log("Game account after init: ", globalBalanceAfter, ", delta: ", globalBalanceBefore - globalBalanceAfter);
      console.log("Game session(PDA) balance after init: ", pdaGameSessionAccountBalanceAfter);
    } catch(e) {
    console.log(e);
    throw e;
  }
}

async function saveToArweave(userPublicKey, data): Promise<string> {
  const serializedData = GameSessionArchive.serialize(data);
//  console.log("SERIALIZED: ", serializedData);

//  GameSessionArchive.deserialize(serializedData);
  const tx = await arweave.createTransaction({
    data: serializedData
  });
//  console.log("Transaction DATa: ", tx.data);
  tx.addTag('App-Name', 'Stakan');
  tx.addTag('User', userPublicKey.toString());
  
  await arweave.transactions.sign(tx, arweaveWallet);
  await arweave.transactions.post(tx);
  // mine transaction to simulate immediate confirmation
  await axios.get('http://localhost:1984/mine');

  const statusAfterPost = await arweave.transactions.getStatus(tx.id);
//  console.log("status after post: ", statusAfterPost.confirmed);
  return statusAfterPost.status === 200 ? tx.id : undefined;
}

async function getUserGameArchive() {
  const accountInfo = await provider.connection.getAccountInfo(userGameAccountKeypair.publicKey);
  
  let userGameAccountData = UserGameAccount.deserialize(accountInfo.data.slice(0, 8+8+8));
  Promise.all(
    await GameSessionArchive.get(
      userWallet.publicKey, 
      userGameAccountData['saved_game_sessions']
    )
  ).then(archivedData => archivedData.forEach(data => {
    console.log("Archived score: ", data['score'].toString(), ", duration: ", data['duration'].toString());
  }));
}
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
  /*
  it("Transaction list!", async () => {
    
    console.log("Before Game session transactions: ");
    console.log("connection commitment: ", provider.connection.commitment);
    const signatures = 
      await provider.connection.getSignaturesForAddress(
        gameSessionAccountKeypair.publicKey, 
        {},
        'confirmed');
    console.log("After Game session transactions: ");
  
    for ( let i = 0; i < signatures.length; i++ ) {
      const sig = signatures[i].signature;
      const trans = await provider.connection.getTransaction(sig, {commitment: "confirmed"});
      if ( trans ) {
        console.log(trans);
      }
    }
  });
*/

});
