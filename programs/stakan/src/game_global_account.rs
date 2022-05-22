/*
use anchor_client::solana_sdk::commitment_config::CommitmentConfig;
use anchor_client::solana_sdk::signature::{Keypair, Signer};
use anchor_client::solana_sdk::signature::read_keypair_file;
*/
/*
use solana_client::client_error::ClientError;
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::RpcSendTransactionConfig;
use solana_sdk::signature::Signature;
use solana_sdk::transaction::Transaction;
*/
//use anchor_client::{Client};
use anchor_lang::prelude::*;

pub(crate) fn create_game_global_account<'info>(
    system_program: AccountInfo<'info>,
    program_wallet: AccountInfo<'info>,
    global_account: AccountInfo<'info>,
) -> Result<()> {
/*    use std::str::{FromStr};

    let key = match Pubkey::from_str("StGlStatebymj5JEgJYH4qUQ7xTtoR1W2BeHUbDjCJb") {
        Ok(key) => key,
        Err(err) => { unimplemented!() },
    };
*/
    let lamports = 1000000;
    let data: [u8; 0];
    let rent_epoch = 0;
    let space = 8 + 100;
    //anchor_lang::system_program::System::clock::Epoch;
//    let key = Keypair::new();

    let owner_key = program_wallet.key;

    let create_global_account = anchor_lang::system_program::CreateAccount {
        from: program_wallet,
        to: global_account,
    };

    let cpi_ctx = CpiContext::new(system_program, create_global_account);
 
    anchor_lang::system_program::create_account(
        cpi_ctx,
        lamports, 
        space, 
        owner_key,
    )
}


