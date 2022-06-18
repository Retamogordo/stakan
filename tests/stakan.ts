import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import * as spl from '@solana/spl-token';

//import * as spl from '@solana/spl-token';
//import { Connection } from "@solana/web3.js";
import * as accountsSchema from "../app/src/accountsSchema";
import * as stakanApi from "../app/src/stakanSolanaApi";
import { Stakan } from "../target/types/stakan";

import Arweave from "arweave";
import { serialize, deserialize } from "borsh";
//import ArLocal from 'arlocal';
const axios = require('axios');

import Bip39 from 'bip39';

let duration = 0;
let arweave: Arweave = undefined;

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
const provider = anchor.Provider.env();
let programWallet;

let user:  stakanApi.User;
let user2: stakanApi.User;
let stakanState: stakanApi.StakanState;

before(async () => {
  anchor.setProvider(provider);
  programWallet = program.provider.wallet;

  arweave = Arweave.init({
    host: 'localhost',
    port: 1984,
    protocol: 'http',
    timeout: 20000,
    logging: false,
  });
    
  stakanState = await stakanApi.setUpStakan(provider.connection);

  const acc = await stakanApi.findOnChainStakanAccount(provider.connection);
  console.log("After setup, found on-chain: ", acc);

  const userWallet = anchor.web3.Keypair.generate();
  const arweaveWallet = await arweave.wallets.generate();

  const arweaveStorageAddress = await arweave.wallets.getAddress(arweaveWallet);

  user = new stakanApi.User("𝖠Β𝒞𝘋𝙴𝓕ĢȞỈ𝕵ꓗʟ𝙼ℕ", provider.connection, 
    userWallet, arweave, arweaveWallet, arweaveStorageAddress);
//  user = new stakanApi.User("𝖠Β𝒞𝘋𝙴𝓕ĢȞỈ𝕵ꓗʟ𝙼ℕ০𝚸𝗤ՀꓢṰǓⅤ𝔚Ⲭ𝑌𝙕𝘢𝕤", userWallet);

  const arweaveWallet2 = await arweave.wallets.generate();
  const arweaveStorageAddress2 = await arweave.wallets.getAddress(arweaveWallet2);
  user2 = new stakanApi.User("superman", provider.connection, 
    userWallet, arweave, arweaveWallet2, arweaveStorageAddress2);
});

describe("stakan", () => {

  it("Airdrop", async () => {
/*    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(gameGlobalWallet.publicKey, 100000000000)
    );
*/    
    await provider.connection.confirmTransaction( 
      await provider.connection.requestAirdrop(user.wallet.publicKey, 1000000000)
    );
  });

  it("Sign up user", async () => {
    await stakanApi.signUpUser(user, stakanState);
//    await signUpUser(user, stakanState.getMintPublicKey());

    const accountInfo = await provider.connection.getAccountInfo(user.account);
    let userAccountData = accountsSchema.UserAccount.deserialize(accountInfo.data);

    console.log("stakanApi.User ", userAccountData['username'], " signed up");
      //    await signUpUser("суперман", userWallet, stakanState.mint.publicKey);
//    await signUpUser("superman&supergirl", userWallet, stakanState.mint.publicKey);
  });

  it("User accounts list", async () => {
    const acc = await user.findOnChainUserAccount();
    if (!acc) throw "Cannot find user on-chain account after signing up";
  });

  it("Sign up another user with the same wallet (allowed for now)", async () => {
    await stakanApi.signUpUser(user2, stakanState);
 //   await signUpUser(user2, stakanState.getMintPublicKey());          

    const accountInfo = await provider.connection.getAccountInfo(user2.account);
    let userAccountData = accountsSchema.UserAccount.deserialize(accountInfo.data);

    console.log("stakanApi.User ", userAccountData['username'], " signed up");
  });

  it("SHOULD FAIL: Init game session (no tokens on account to stake)", async () => {
    const stake = 1;
    try {
      await stakanApi.initGameSession(user, stakanState, stake);
      
      const accountInfo = await provider.connection.getAccountInfo(user.gameSessionAccount);
      let accountData = accountsSchema.GameSessionAccount.deserialize(accountInfo.data);
    
      console.log("Game session initialized: score: ", accountData['score'].toString());
    } catch {
      return;
    }
    throw "Should have failed for insufficient tokens to stake";
  });

  it("Purchase tokens", async () => {
    console.log("before purchasing tokens...");
    console.log("userWallet balance: ", await user.getBalance());
    console.log("programWallet balance: ", await provider.connection.getBalance(programWallet.publicKey));
    console.log("userMintAccount balance: ", await user.getTokenBalance());

    await stakanApi.purchaseStakanTokens(user, stakanState, 20);

    console.log("after purchasing tokens");
    console.log("userWallet balance: ", await user.getBalance());
    console.log("programWallet balance: ", await provider.connection.getBalance(programWallet.publicKey));
    
    const userTokenBalance = await user.getTokenBalance();
    console.log("user token balance: ", userTokenBalance);
//      assert(userTokenBalance, tokenAmount);
  })

  it("Sell tokens", async () => {
    console.log("before selling tokens...");
    console.log("userWallet balance: ", await user.getBalance());
//    console.log("programWallet balance: ", await provider.connection.getBalance(programWallet.publicKey));
    console.log("program escrow balance: ", await provider.connection.getBalance(stakanState.escrowAccount));
    console.log("userMintAccount balance: ", await user.getTokenBalance());
    let rewardFundsAccountBalance = await stakanState.getRewardFundsBalance();
      console.log("reward funds token balance: ", rewardFundsAccountBalance);
    
    await stakanApi.sellStakanTokens(user, stakanState, 10);

    console.log("after selling tokens");
    console.log("userWallet balance: ", await user.getBalance());
//    console.log("programWallet balance: ", await provider.connection.getBalance(programWallet.publicKey));
    console.log("program escrow balance: ", await provider.connection.getBalance(stakanState.escrowAccount));
    
    const userTokenBalance = await user.getTokenBalance();
    console.log("user token balance: ", userTokenBalance);
    rewardFundsAccountBalance = await stakanState.getRewardFundsBalance();
    console.log("reward funds token balance: ", rewardFundsAccountBalance);  
//      assert(userTokenBalance, tokenAmount);
  })

  it("Init game session", async () => {
    const stake = 1;
    await stakanApi.initGameSession(user, stakanState, stake);
    
    const accountInfo = await provider.connection.getAccountInfo(user.gameSessionAccount);
    let accountData = accountsSchema.GameSessionAccount.deserialize(accountInfo.data);
  
    const gameSessionInfo = await user.getGameSessionInfo();

    console.log("Game session initialized: score: ", 
      accountData['score'].toString(),
      ", stake: ", gameSessionInfo['stake']);
  });

  it("Update game session 1", async () => {
    await stakanApi.updateGameSession(user, 10, 100);      
    
    const accountInfo = await provider.connection.getAccountInfo(user.gameSessionAccount);
    let accountData = accountsSchema.GameSessionAccount.deserialize(accountInfo.data);
  
    console.log("Game session updated: score: ", accountData['score'].toString());  
  });

  it("Update game session 2", async () => {
    await stakanApi.updateGameSession(user, 20, 200);      
    
    const accountInfo = await provider.connection.getAccountInfo(user.gameSessionAccount);
    let accountData = accountsSchema.GameSessionAccount.deserialize(accountInfo.data);
  
    console.log("Game session updated: score: ", accountData['score'].toString());  
  });

  it("Finish game session", async () => {
    await stakanApi.finishGameSession(user, stakanState);      

    const numberOfArchives = 1;
    const archivedData = await accountsSchema.GameSessionArchive.get(arweave, user.account, numberOfArchives);

    Promise.all(
      archivedData
    ).then(archivedData => archivedData.forEach(data => {
      console.log("Archived score: ", data['score'].toString(), ", duration: ", data['duration'].toString());
    }));     

    const userTokenBalance = await user.getTokenBalance();
    console.log("stakanApi.User token balance: ", userTokenBalance);
  });

  it("Sign user out", async () => {
    console.log("before signing out user...");
    console.log("userWallet balance: ", await user.getBalance());
    console.log("programWallet balance: ", await provider.connection.getBalance(programWallet.publicKey));
    console.log("userMintAccount balance: ", await user.getTokenBalance());
    let rewardFundsAccountBalance = await stakanState.getRewardFundsBalance();
      console.log("reward funds token balance: ", rewardFundsAccountBalance);
  
    await stakanApi.signOutUser(user, stakanState);

    console.log("after signing user out");
    console.log("userWallet balance: ", await user.getBalance());
//    console.log("programWallet balance: ", await stakanState.getBalance());
    
    const userTokenBalance = await user.getTokenBalance();
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
