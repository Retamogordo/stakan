import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import * as spl from '@solana/spl-token';
import fs from 'fs';

//import * as spl from '@solana/spl-token';
//import { Connection } from "@solana/web3.js";
import * as accountsSchema from "../app/src/accountsSchema";
import * as stakanApi from "../app/src/stakanSolanaApi";
import { Stakan } from "../target/types/stakan";

import Arweave from "arweave";
import ArLocal from 'arlocal';

//import { localNetProgram } from "../app/src/confProgram"
//import ArLocal from 'arlocal';
const axios = require('axios');

import Bip39 from 'bip39';
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
//import {setupStakan} from '../app/src/stakanLogic'
//import TestWeave from "testweave-sdk";
const stakanMatrix = Array.from(
  { length: 10 }, 
  (_, column) => {   
    return Array.from(
        { length: 16 }, 
        (_, row) => { 
          return 0;
    })
}) 

let arweave: Arweave;
//let testWeave: TestWeave;

let assert = require('assert');

const provider = anchor.Provider.env();
anchor.setProvider(provider);

const program = anchor.workspace.Stakan as Program<Stakan>;

let programWallet;

let user:  stakanApi.User | undefined;
let user2: stakanApi.User | undefined;
let stakanState: stakanApi.StakanState;

const arLocal = new ArLocal();

before(async () => {

  // Start is a Promise, we need to start it inside an async function.
  await arLocal.start();

  programWallet = program.provider.wallet;

  const dir = stakanApi.User.localDir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }


  arweave = Arweave.init({
    host: 'localhost',
    port: 1984,
    protocol: 'http',
    timeout: 20000,
    logging: false,
  });
//  testWeave = await TestWeave.init(arweave);
    

  console.log("searching stakan global state on chain...");
  stakanState = await stakanApi.queryStakanAccount(program) as stakanApi.StakanState;

  if (!stakanState) {
    console.log("not found, trying to initialize stakan global state...");

    await stakanApi.setUpStakan(program);
  
    stakanState = await stakanApi.queryStakanAccount(program) as stakanApi.StakanState;
    
    if (!stakanState) {
      console.log("Failed to set up stakan global state, exitting");
      
      throw "Failed to set up stakan global state";
    }
  }

//  console.log("After setup, found on-chain: ", acc['id']);
//  console.log("After setup, found on-chain: ", stakanState);
  const amount = 1000000000;
  console.log("airdropping ", amount, " to stakan global(escrow) account...");
  await provider.connection.confirmTransaction( 
    await provider.connection.requestAirdrop(stakanState.escrowAccount, amount)
  );
  console.log("stakan Escrow Account balance: ", await stakanState.getBalance());

  const userWallet = new NodeWallet(anchor.web3.Keypair.generate());
  const arweaveWallet = await arweave.wallets.generate();

//  const arweaveStorageAddress = await arweave.wallets.getAddress(arweaveWallet);

  user = new stakanApi.User("𝖠Β𝒞𝘋𝙴𝓕ĢȞỈ𝕵ꓗʟ𝙼ℕ", program, 
    userWallet, arweave, arweaveWallet);
//  user = new stakanApi.User("𝖠Β𝒞𝘋𝙴𝓕ĢȞỈ𝕵ꓗʟ𝙼ℕ০𝚸𝗤ՀꓢṰǓⅤ𝔚Ⲭ𝑌𝙕𝘢𝕤", userWallet);

  const arweaveWallet2 = await arweave.wallets.generate();
  const arweaveStorageAddress2 = await arweave.wallets.getAddress(arweaveWallet2);
  user2 = new stakanApi.User("superman", program, 
    userWallet, arweave, arweaveWallet2);
});

after(async () => {
  await arLocal.stop();
});

describe("stakan", () => {
  it("Arweave create test transaction", async () => {
    const arweave1 = Arweave.init({
      host: 'localhost',
      port: 1984,
      protocol: 'http',
      timeout: 20000,
      logging: false,
    });
//    const testWeave1 = await TestWeave.init(arweave1);
    //    const testWeave = await TestWeave.init(arweave);
      let data = "test arweave transaction creation";
  
      const dataTransaction = await arweave1.createTransaction({
        data
      });
  })    

  it("Airdrop", async () => {
    const currUser = user as stakanApi.User;  
    await provider.connection.confirmTransaction( 
      await provider.connection.requestAirdrop(currUser.wallet.publicKey, 1000000000)
    );
  });


  it("Sign up user", async () => {
    const currUser = user as stakanApi.User;  
    
    await stakanApi.signUpUser(currUser, stakanState as stakanApi.StakanState);
//    await signUpUser(user, stakanState.getMintPublicKey());
    fs.writeFileSync(stakanApi.User.localDir + currUser.username + '_bump.json', JSON.stringify(currUser.bump?.toString()));
    fs.writeFileSync(stakanApi.User.localDir + currUser.username + '_arweave_wallet.json', JSON.stringify(currUser.arweaveWallet));

    const userAccount = currUser.account as anchor.web3.PublicKey;
    const accountInfo 
      = await provider.connection.getAccountInfo(userAccount);
    
    if (!accountInfo) throw "accountInfo is null";

    let userAccountData = accountsSchema.UserAccount.deserialize(
      accountInfo.data);

    console.log("stakanApi.User ", userAccountData['username'], " signed up");
      //    await signUpUser("суперман", userWallet, stakanState.mint.publicKey);
//    await signUpUser("superman&supergirl", userWallet, stakanState.mint.publicKey);
  });

  it("Check logging user", async () => {
//    const nodeWallet = new NodeWallet(user.wallet);
      const arweaveWallet = JSON.parse(fs.readFileSync(stakanApi.User.localDir + user?.username + '_arweave_wallet.json', "utf-8"));
//      const arweaveWallet = testWeave.rootJWK;
      const userAccountBump = JSON.parse(fs.readFileSync(stakanApi.User.localDir + user?.username + '_bump.json', "utf-8"));

    user 
      = await stakanApi.loginUser(
        (user as stakanApi.User).wallet, 
        stakanState as stakanApi.StakanState, 
        arweave,
        arweaveWallet,
//        userAccountBump
      );
    const currUser = user as stakanApi.User;  

    const accountInfo = await provider.connection.getAccountInfo(currUser.account as anchor.web3.PublicKey);
    
    if (!accountInfo) throw "accountInfo is null"
    let userAccountData = accountsSchema.UserAccount.deserialize(accountInfo.data);

    console.log("stakanApi.User ", userAccountData['username'], " signed up");
  });
/*
  it("Sign up another user with the same wallet (allowed for now)", async () => {
    const currUser = user2 as stakanApi.User;  
    
    await stakanApi.signUpUser(currUser, stakanState);
 //   await signUpUser(user2, stakanState.getMintPublicKey());          
    fs.writeFileSync(stakanApi.User.localDir + currUser.username + '_bump.json', JSON.stringify(currUser.bump?.toString()));
    fs.writeFileSync(stakanApi.User.localDir + currUser.username + '_arweave_wallet.json', JSON.stringify(currUser.arweaveWallet));

    const accountInfo 
      = await provider.connection.getAccountInfo(currUser.account as anchor.web3.PublicKey);

    if (!accountInfo) throw "accountInfo is null"
    let userAccountData = accountsSchema.UserAccount.deserialize(accountInfo.data);

    console.log("stakanApi.User ", userAccountData['username'], " signed up");
  });

  it("SHOULD FAIL: Init game session (no tokens on account to stake)", async () => {
    const currUser = user as stakanApi.User;  
    const stake = 1;
    const cols = 10;
    const rows = 16;
    try {
      await stakanApi.initGameSession(currUser, stakanState, stake, cols, rows);
      
      const accountInfo 
        = await provider.connection.getAccountInfo(currUser.gameSessionAccount as anchor.web3.PublicKey);

      if (!accountInfo) throw "accountInfo is null"
      let accountData = accountsSchema.GameSessionAccount.deserialize(accountInfo.data, cols, rows);
    
      console.log("Game session initialized: score: ", accountData['score'].toString());
    } catch {
      return;
    }
    throw "Should have failed for insufficient tokens to stake";
  });

  it("Purchase tokens", async () => {
    const currUser = user as stakanApi.User;  
    console.log("before purchasing tokens...");
    console.log("userWallet balance: ", await currUser.getBalance());
    console.log("programWallet balance: ", await provider.connection.getBalance(programWallet.publicKey));
    console.log("userMintAccount balance: ", await currUser.getTokenBalance());

    await stakanApi.purchaseStakanTokens(currUser, stakanState, 20);

    console.log("after purchasing tokens");
    console.log("userWallet balance: ", await currUser.getBalance());
    console.log("programWallet balance: ", await provider.connection.getBalance(programWallet.publicKey));
    
    const userTokenBalance = await currUser.getTokenBalance();
    console.log("user token balance: ", userTokenBalance);
//      assert(userTokenBalance, tokenAmount);
  })

  it("Sell tokens", async () => {
    const currUser = user as stakanApi.User;  
    console.log("before selling tokens...");
    console.log("userWallet balance: ", await currUser.getBalance());
//    console.log("programWallet balance: ", await provider.connection.getBalance(programWallet.publicKey));
    console.log("program escrow balance: ", await provider.connection.getBalance(stakanState.escrowAccount));
    console.log("userMintAccount balance: ", await currUser.getTokenBalance());
    let rewardFundsAccountBalance = await stakanState.getRewardFundsBalance();
      console.log("reward funds token balance: ", rewardFundsAccountBalance);
    
    await stakanApi.sellStakanTokens(currUser, stakanState, 10);

    console.log("after selling tokens");
    console.log("userWallet balance: ", await currUser.getBalance());
//    console.log("programWallet balance: ", await provider.connection.getBalance(programWallet.publicKey));
    console.log("program escrow balance: ", await provider.connection.getBalance(stakanState.escrowAccount));
    
    const userTokenBalance = await currUser.getTokenBalance();
    console.log("user token balance: ", userTokenBalance);
    rewardFundsAccountBalance = await stakanState.getRewardFundsBalance();
    console.log("reward funds token balance: ", rewardFundsAccountBalance);  
//      assert(userTokenBalance, tokenAmount);
  })
*/
  it("Init game session", async () => {
    const currUser = user as stakanApi.User;  
    const stake = 0;
//    const stake = 1;
    const cols = 10;
    const rows = 16;
    await stakanApi.initGameSession(currUser, stakanState, stake, cols, rows);
    
    const accountInfo 
      = await provider.connection.getAccountInfo(currUser.gameSessionAccount as anchor.web3.PublicKey);

    console.log("§§§§§§§§§§§§§§ account Info:", accountInfo?.data);

    if (!accountInfo) throw "accountInfo is null"
    let accountData = accountsSchema.GameSessionAccount.deserialize(accountInfo.data, cols, rows);
  
    const gameSessionInfo = await currUser.getGameSessionInfo(cols, rows) as accountsSchema.GameSessionAccount;

    console.log("Game session initialized: score: ", 
      accountData['score'].toString(),
      ", stake: ", gameSessionInfo['stake'],
      ", tiles_cols: ", gameSessionInfo['tiles_cols'],
      ", tiles_rows: ", gameSessionInfo['tiles_rows'],
      ", tiles: ", gameSessionInfo,
      );
  });
/*
  it("Update game session 1", async () => {
    const cols = 10;
    const rows = 16;
    const tiles = stakanMatrix;

    const currUser = user as stakanApi.User;  
    await stakanApi.updateGameSession(currUser, 10, 100, tiles);      
    
    const accountInfo 
      = await provider.connection.getAccountInfo(currUser.gameSessionAccount as anchor.web3.PublicKey);
    if (!accountInfo) throw "accountInfo is null";
    let accountData = accountsSchema.GameSessionAccount.deserialize(accountInfo.data, cols, rows);
  
    console.log("Game session updated: score: ", accountData['score'].toString());  

    const userAccountInfo = await provider.connection.getAccountInfo(currUser.account as anchor.web3.PublicKey);
    
    if (!userAccountInfo) throw "accountInfo is null"
    let userAccountData = accountsSchema.UserAccount.deserialize(userAccountInfo.data);

    console.log("stakanApi.User ", userAccountData);

  });

  it("Update game session 2", async () => {
    const cols = 10;
    const rows = 16;
    const tiles = stakanMatrix;

    const currUser = user as stakanApi.User;  
    await stakanApi.updateGameSession(currUser, 20, 200, tiles);      
    
    const accountInfo 
      = await provider.connection.getAccountInfo(currUser.gameSessionAccount as anchor.web3.PublicKey);
    if (!accountInfo) throw "accountInfo is null"
    let accountData = accountsSchema.GameSessionAccount.deserialize(accountInfo.data, cols, rows);
  
    console.log("Game session updated: score: ", accountData['score'].toString());  
  });
*/
  it("Finish game session", async () => {
    const currUser = user as stakanApi.User;  
    const cols = 10;
    const rows = 16;
    await stakanApi.finishGameSession(currUser, stakanState, undefined);      

    const numberOfArchives = 1;
    const archivedData 
      = await accountsSchema.GameSessionArchive.get(
        arweave, 
        currUser.account as anchor.web3.PublicKey, 
        numberOfArchives);

    Promise.all(
      archivedData
    ).then(archivedData => archivedData.forEach(data => {
      console.log("Archived score: ", data['score'].toString(), ", duration: ", data['duration'].toString());
    }));     

    const userTokenBalance = await currUser.getTokenBalance();
    console.log("stakanApi.User token balance: ", userTokenBalance);
  });

  it("Sign user out", async () => {
    const currUser = user as stakanApi.User;  
    console.log("before signing out user...");
    console.log("userWallet balance: ", await currUser.getBalance());
    console.log("programWallet balance: ", await provider.connection.getBalance(programWallet.publicKey));
    console.log("userMintAccount balance: ", await currUser.getTokenBalance());
    let rewardFundsAccountBalance = await stakanState.getRewardFundsBalance();
      console.log("reward funds token balance: ", rewardFundsAccountBalance);
  
    await stakanApi.signOutUser(currUser, stakanState);

    console.log("after signing user out");
    console.log("userWallet balance: ", await currUser.getBalance());
//    console.log("programWallet balance: ", await stakanState.getBalance());
    
    const userTokenBalance = await currUser.getTokenBalance();
    console.log("user token balance: ", userTokenBalance);
    rewardFundsAccountBalance = await stakanState.getRewardFundsBalance();
    console.log("reward funds token balance: ", rewardFundsAccountBalance);
//    assert(userTokenBalance, tokenAmount);
//      await provider.connection.getTokenAccountBalance(user.tokenAccount)); 
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

  
  it("stakanApi.User game archive!", async () => {
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

        console.log("stakanApi.User wallet before saving: ", 
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

      console.log("stakanApi.User wallet after saving: ", 
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
