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
            ['mint', [32]],
            ['mint_account', [32]],
            ] 
        }
      ]
    ]);
    const [data_size, inner_buffer] = UserAccountWrapped.deserialize(buffer);
//    console.log("----------- DATA SIZE: ", data_size);
    let data = deserialize(schema, UserAccount, inner_buffer);
//    let data = deserialize(schema, UserAccount, buffer.slice(8+2, buffer.length));
    console.log("----------- DATA: ", data['username']);
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
let stakanTokens: anchor.web3.PublicKey;

let userWallet;

async function setUpStakan(
  ) {
    anchor.setProvider(provider);
    programWallet = program.provider.wallet;
    let stakanTokensAmount = 1000;
  
    console.log("before minting ", stakanTokensAmount, " Stakan Tokens...");
  
    stakanMint = await spl.Token.createMint(
      program.provider.connection,
      programWallet.payer,
      programWallet.publicKey,
      programWallet.publicKey,    // freeze authority
      0,  // decimals
      tokenProgramID
    );
    stakanTokens = await stakanMint.createAssociatedTokenAccount(
      program.provider.wallet.publicKey
    );
  
    await stakanMint.mintTo(stakanTokens, program.provider.wallet.publicKey, [], stakanTokensAmount);
  
    let tokenAmount 
      = await program.provider.connection.getTokenAccountBalance(stakanTokens);
  
    console.log("after minting, owner balance: ", tokenAmount);
}
  
async function signUpUser(
  username: string,
  userWallet, 
  mint: spl.Token,
): Promise<[anchor.web3.PublicKey, anchor.web3.PublicKey]> {
/*
  const userBalanceBefore = await provider.connection.getBalance(userWallet.publicKey);
  console.log("user balance before: ", userBalanceBefore);
*/
  const [userAccount, userTokenAccountBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('user_account')],
      program.programId
    );
  const [mintAccount, mintAccountBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('user_mint_account')],
      program.programId
    );
  
  await program.methods
    .signUpUser(
      username,
    )
    .accounts({
        userAccount,
        userWallet: userWallet.publicKey,
        mint: mint.publicKey,
        mintAccount,

        tokenProgram: tokenProgramID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
    })
    .signers([userWallet])
    .rpc();
  
    const accountInfo = await provider.connection.getAccountInfo(userAccount);
    let userAccountData = UserAccount.deserialize(accountInfo.data);
    console.log(userAccountData);

    return [userAccount, mintAccount];
}

async function purchaseStakanTokens(
  userAccount: anchor.web3.PublicKey,
  userWallet: anchor.web3.Keypair, 
  userMintAccount: anchor.web3.PublicKey,
  mint: spl.Token,
  tokenAmount: number,
) {
  console.log("before purchasing tokens...");
  console.log("userWallet balance: ", 
    await provider.connection.getBalance(userWallet.publicKey));
  console.log("programWallet balance: ", 
    await provider.connection.getBalance(programWallet.publicKey));

  const tx = await program.transaction
    .purchaseTokens(
      new anchor.BN(tokenAmount),
      {
        accounts: {
          userAccount,
          userMintAccount,
          userWallet: userWallet.publicKey,
          mint: mint.publicKey,
          programMintAccount: stakanTokens,
          programWallet: programWallet.publicKey,

          tokenProgram: tokenProgramID,
          systemProgram: SystemProgram.programId,
        },
          signers: []
//        signers: [userWallet, programWallet]
      }
    )
    
    tx.feePayer = await userWallet.publicKey;
    let blockhashObj = await provider.connection.getLatestBlockhash();
    tx.recentBlockhash = await blockhashObj.blockhash;
    tx.sign(userWallet);
    const signedTx = await programWallet.signTransaction(tx);    
    const txid = await provider.connection.sendRawTransaction(
      signedTx.serialize()
    );
    await provider.connection.confirmTransaction(txid);

    console.log("after purchasing tokens");
    console.log("userWallet balance: ", 
      await provider.connection.getBalance(userWallet.publicKey));
    console.log("programWallet balance: ", 
      await provider.connection.getBalance(programWallet.publicKey));

}

before(async () => {
  anchor.setProvider(provider);
  programWallet = program.provider.wallet;

  await setUpStakan();

  userWallet = anchor.web3.Keypair.generate();

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
      await provider.connection.requestAirdrop(userWallet.publicKey, 1000000000)
    );
  });

  it("Sign up user", async () => {
    
    let [userAccount, userMintAccount] 
      = await signUpUser("𝖠Β𝒞𝘋𝙴𝓕ĢȞỈ𝕵ꓗʟ𝙼ℕ০𝚸𝗤ՀꓢṰǓⅤ𝔚Ⲭ𝑌𝙕𝘢𝕤", userWallet, stakanMint);
          
    await purchaseStakanTokens(
      userAccount,
      userWallet,
      userMintAccount,
      stakanMint,
      3
    );
      //    await signUpUser("суперман", userWallet, stakanMint);
//    await signUpUser("superman&supergirl", userWallet, stakanMint);
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
  const UserAccountKeypair = anchor.web3.Keypair.fromSeed(
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
/*
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(gameGlobalWallet.publicKey, 100000000000)
    );
 */   
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
    //  const globalBalanceAfter = await provider.connection.getBalance(gameGlobalWallet.publicKey);
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
