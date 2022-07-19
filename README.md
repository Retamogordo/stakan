# Stakan

## Overview

A simple old funny arcade puzzle game that demonstrates usage 
of Solana contracts combined with Arweave persistance.

![Stakan Overview](readme_images/overview.png)

## Disclaimer

This product was designed for exclusively demonstration purpose,
it leverages Solana Devnet for transactions, which means no real assets
are involved.
The same reasoning applies to Arweave transactions which are executed on a local node only.

## Function

The simplest and least interesting mode to play is for free. You just press the Free Play button and play, nothing more happens.
If you want to stake you'll need to properly set up your wallet adapters and sign up by entering a username so your name appears on the glory board when you hit all the record scores.

## Setup procedure

### Solana
I tested the code with Solflare and Phantom wallet adapters on Firefox and Chromium browsers. 
First you'll need to set your wallet adapters network to Devnet.

![Solana Devnet](readme_images/wallet-devnet.png)

Next you'll need to airdrop some lamports onto your wallet. This can be done, for instance, by using solana-cli.
Please refer to https://docs.solana.com/cli/install-solana-cli-tools for installation instructions.
Once installed, open a terminal and configure it by:
solana config set --url devnet
Then airdrop some sol:
solana airdrop 2 <your wallet pubkey>

### Arweave
Please install ArConnect browser extention. You will need to set up an Arweave Wallet by a standard procedure involving seedphrase feeding.
On ArConnect from Settings->Gateway->Custom choose your gateway to be localhost, port 1984, protocol http.
In a terminal window run Arweave local server by:
npx arlocal
This should run on its default port 1984.

![Terminal](readme_images/terminal.png)
![ArConnect](readme_images/arconnect.png)

## Staking
Stakan contract maintains an account which holds the winner reward fund of Stakan Tokens. This account was initialized once soon after contract deployment. When initialized the initial token supply was minted. Besides, the account holds another global data, like maximum score ever and champions account public key.
The upper bound of reward is calculated by simple exponential backoff and is limited to half of the current token supply on the global account.
The lower bound equals to amount of tokens on stake.
The exact formula for reward calculation is explained futher.

## Before you start
Observe the left panel. Basically, if you see red things there, something is not set up or went wrong.
If you see you are logged in, this means the contract is accessed on Solana Devnet.
If the arlocal is running you'll need to press Airdrop Winston button so your game session can be stored on Arweave when finished. 
Also you'll need to purchase Stakan Token(s) in order to be able to stake.


