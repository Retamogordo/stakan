import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import fs from 'fs';

import * as accountsSchema from "../app/src/accountsSchema";
import * as stakanApi from "../app/src/stakanSolanaApi";
import * as stakanLogic from "../app/src/stakanLogic";
import { Stakan } from "../target/types/stakan";

import Arweave from "arweave";
import ArLocal from 'arlocal';

import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

let arweave: Arweave;

let assert = require('assert');

const provider = anchor.Provider.env();
anchor.setProvider(provider);

const program = anchor.workspace.Stakan as Program<Stakan>;

let programWallet;

let user:  stakanApi.User | undefined;
let user2: stakanApi.User | undefined;
let stakanState: stakanApi.StakanState;

const arLocal = new ArLocal(1984, true);

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

  const amount = 1000000000;
  console.log("airdropping ", amount, " to stakan global(escrow) account...");
  await provider.connection.confirmTransaction( 
    await provider.connection.requestAirdrop(stakanState.escrowAccount, amount)
  );
  console.log("stakan Escrow Account balance: ", await stakanState.getBalance());

  const userWallet = new NodeWallet(anchor.web3.Keypair.generate());
  const arweaveWallet = await arweave.wallets.generate();

  user = new stakanApi.User("𝖠Β𝒞𝘋𝙴𝓕ĢȞỈ𝕵ꓗʟ𝙼ℕ", program, userWallet, arweaveWallet);

  const arweaveWallet2 = await arweave.wallets.generate();
  user2 = new stakanApi.User("superman", program, 
    userWallet, arweaveWallet2);
});

after(async () => {
  await arLocal.stop();
});

describe("stakan", () => {
/*
  it("Close Global Account", async () => {
    await stakanApi.closeGlobalStakanAccountForDebug(stakanState);
  })
  return;
*/
  it("Create test Arweave transaction", async () => {
    const arweave1 = Arweave.init({
      host: 'localhost',
      port: 1984,
      protocol: 'http',
      timeout: 20000,
      logging: false,
    });
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

    await currUser?.arweaveAirdropMin(arweave, 160, 100) 
  });


  it("Sign up user", async () => {
    const currUser = user as stakanApi.User;  
    
    await stakanApi.signUpUser(currUser, stakanState as stakanApi.StakanState, arweave);

    fs.writeFileSync(stakanApi.User.localDir + currUser.username + '_bump.json', JSON.stringify(currUser.bump?.toString()));
    fs.writeFileSync(stakanApi.User.localDir + currUser.username + '_arweave_wallet.json', JSON.stringify(currUser.arweaveWallet));

    const userAccount = currUser.account as anchor.web3.PublicKey;
    const accountInfo 
      = await provider.connection.getAccountInfo(userAccount);
    
    if (!accountInfo) throw "accountInfo is null";

    let userAccountData = accountsSchema.UserAccount.deserialize(
      accountInfo.data);

    console.log("stakanApi.User ", userAccountData['username'], " signed up");
  });

  it("Check logging user", async () => {
      const arweaveWallet = JSON.parse(fs.readFileSync(stakanApi.User.localDir + user?.username + '_arweave_wallet.json', "utf-8"));
      const userAccountBump = JSON.parse(fs.readFileSync(stakanApi.User.localDir + user?.username + '_bump.json', "utf-8"));

    user 
      = await stakanApi.loginUser(
        (user as stakanApi.User).wallet, 
        stakanState as stakanApi.StakanState, 
        arweaveWallet,
      );
    const currUser = user as stakanApi.User;  

    const accountInfo = await provider.connection.getAccountInfo(currUser.account as anchor.web3.PublicKey);
    
    if (!accountInfo) throw "accountInfo is null"
    let userAccountData = accountsSchema.UserAccount.deserialize(accountInfo.data);

    console.log("stakanApi.User ", userAccountData['username'], " signed up");
  });

  it("Check signing user OUT", async () => {
    await stakanApi.signOutUser(user as stakanApi.User, stakanState, undefined)

    const userAccount = user?.account as anchor.web3.PublicKey;
    const accountInfo 
      = await provider.connection.getAccountInfo(userAccount);
    
    if (accountInfo) throw "user account was not closed";

    const userTokenAccount = user?.tokenAccount as anchor.web3.PublicKey;
    const tokenAccountInfo 
      = await provider.connection.getAccountInfo(userTokenAccount);
    
    if (tokenAccountInfo) throw "user Token account was not closed";
  });

  it("Repeat signing user up", async () => {
    const currUser = user as stakanApi.User;  
    
    await stakanApi.signUpUser(currUser, stakanState as stakanApi.StakanState, arweave);

    const userAccount = currUser.account as anchor.web3.PublicKey;
    const accountInfo 
      = await provider.connection.getAccountInfo(userAccount);
    
    if (!accountInfo) throw "accountInfo is null";
  })

  it("Sign up another user with the same wallet (allowed for now)", async () => {
    const currUser = user2 as stakanApi.User;  
    
    await stakanApi.signUpUser(currUser, stakanState, arweave);

    fs.writeFileSync(stakanApi.User.localDir + currUser.username + '_bump.json', JSON.stringify(currUser.bump?.toString()));
    fs.writeFileSync(stakanApi.User.localDir + currUser.username + '_arweave_wallet.json', JSON.stringify(currUser.arweaveWallet));

    const accountInfo 
      = await provider.connection.getAccountInfo(currUser.account as anchor.web3.PublicKey);

    if (!accountInfo) throw "accountInfo is null"
    let userAccountData = accountsSchema.UserAccount.deserialize(accountInfo.data);

    console.log("stakanApi.User ", userAccountData['username'], " signed up");
  });

  it("Force delete user", async () => {
    const currUser = user2 as stakanApi.User;  

    await stakanApi.purchaseStakanTokens(currUser, stakanState, 42, undefined);
    
    await stakanApi.forceDeleteUser(currUser, stakanState);
 //   await signUpUser(user2, stakanState.getMintPublicKey());          
  });

  it("Re-create second user after force delete", async () => {
    const currUser = user2 as stakanApi.User;  
    
    await stakanApi.signUpUser(currUser, stakanState, arweave);
  });

  
  it("SHOULD FAIL: Init game session (no tokens on account to stake)", async () => {
    const currUser = user as stakanApi.User;  
    const stake = 1;
    const cols = 10;
    const rows = 16;
    try {
      await stakanApi.initGameSession(currUser, stakanState, arweave, stake, undefined);
      
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
    console.log("userTokenAccount balance: ", await currUser.getTokenBalance());

    await stakanApi.purchaseStakanTokens(currUser, stakanState, 20, undefined);

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
    console.log("program escrow balance: ", await provider.connection.getBalance(stakanState.escrowAccount));
    console.log("userMintAccount balance: ", await currUser.getTokenBalance());

    let rewardFundsAccountBalance = await stakanState.getRewardFundBalance();
      console.log("reward funds token balance: ", rewardFundsAccountBalance);
    
    await stakanApi.sellStakanTokens(currUser, stakanState, 10, undefined);

    console.log("after selling tokens");
    console.log("userWallet balance: ", await currUser.getBalance());
    console.log("program escrow balance: ", await provider.connection.getBalance(stakanState.escrowAccount));
    
    const userTokenBalance = await currUser.getTokenBalance();
    console.log("user token balance: ", userTokenBalance);
    rewardFundsAccountBalance = await stakanState.getRewardFundBalance();
    console.log("reward funds token balance: ", rewardFundsAccountBalance);  
//      assert(userTokenBalance, tokenAmount);
  })

  it("Init game session", async () => {
    const currUser = user as stakanApi.User;  
    const stake = 0;
    const cols = 10;
    const rows = 16;
    await stakanApi.initGameSession(currUser, stakanState, arweave, stake, undefined);
    
    const accountInfo 
      = await provider.connection.getAccountInfo(currUser.gameSessionAccount as anchor.web3.PublicKey);

    if (!accountInfo) throw "accountInfo is null"
    let accountData = accountsSchema.GameSessionAccount.deserialize(accountInfo.data);
  
    const gameSessionInfo = await currUser.getGameSessionInfo() as accountsSchema.GameSessionAccount;

    console.log("Game session initialized: ", accountData);
  });


  it("Finalize game session", async () => {
    const currUser = user as stakanApi.User;  
    const cols = 10;
    const rows = 16;
    const stakanObj = stakanLogic.setupStakan(rows, cols);
    
    await stakanApi.finishGameSession(currUser, 
      stakanState, 
      {
        tiles: stakanObj.tiles,
        score: 42,
        linesCleared: 17,
        level: 3,
        duration: 123,
      },
      arweave,
      stakanObj,
      undefined);      
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
    console.log("userTokenAccount balance: ", await currUser.getTokenBalance());

    let rewardFundsAccountBalance = await stakanState.getRewardFundBalance();
      console.log("reward funds token balance: ", rewardFundsAccountBalance);
  
    await stakanApi.signOutUser(currUser, stakanState, undefined);

    console.log("after signing user out");
    console.log("userWallet balance: ", await currUser.getBalance());

    rewardFundsAccountBalance = await stakanState.getRewardFundBalance();
    console.log("reward funds token balance: ", rewardFundsAccountBalance);
  });
});
