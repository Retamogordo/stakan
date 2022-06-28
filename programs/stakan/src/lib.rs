use anchor_lang::prelude::*;

pub mod transactions;
pub mod errors;

use crate::transactions::set_up_stakan::*;
use crate::transactions::user::*;
use crate::transactions::tokens::*;
use crate::transactions::game_session::*;

declare_id!("C5WmRvAk9BBWyg3uSEZ4EHtrNVn7jZu7qgykckXxLekx");
/*
pub fn program_id() -> Pubkey {
    id()
}
*/
#[program] 
pub mod stakan {
    use super::*;

    pub fn set_up_stakan(
        ctx: Context<SetupStakan>,
        stakan_state_account_bump: u8,
//        stakan_escrow_account_bump: u8,
    ) -> Result<()> {
        crate::transactions::set_up_stakan::set_up_stakan(ctx, stakan_state_account_bump)
    }

    pub fn sign_up_user(
        ctx: Context<SignUpUser>,
        username: String, 
        user_account_bump: u8,
        arweave_storage_address: String,
    ) -> Result<()> {
        crate::transactions::user::sign_up(ctx, username, user_account_bump, arweave_storage_address)
    }

    pub fn purchase_tokens(
        ctx: Context<PurchaseTokens>,
//        stakan_state_account_bump: u8,
        token_amount: u64, 
    ) -> Result<()> {
        crate::transactions::tokens::purchase(ctx, token_amount)
    }

    pub fn sell_tokens(
        ctx: Context<SellTokens>,
        user_account_bump: u8,
        token_amount: u64, 
//        stakan_state_account_bump: u8,
    ) -> Result<()> {
        crate::transactions::tokens::sell(ctx, user_account_bump, token_amount)
    }

    pub fn init_game_session(ctx: Context<InitGameSession>, stake: u64, 
        tiles_cols: u8, tiles_rows: u8) -> Result<()> {
        crate::transactions::game_session::init(ctx, stake, tiles_cols, tiles_rows)
    }

    pub fn update_game_session(ctx: Context<UpdateGameSession>, score: u64,
        duration_millis: u64, tiles: Vec<u8>) -> Result<()> {
        crate::transactions::game_session::update(ctx, score, duration_millis, tiles)
    }

    pub fn finish_game_session(ctx: Context<FinishGameSession>,
        // just to ensure arweave has confirmed storage transaction
        _dummy_arweave_storage_tx_id: Option<String>, 
        user_account_bump: u8,
    ) -> Result<()> {
        crate::transactions::game_session::finish(
            ctx, 
            _dummy_arweave_storage_tx_id,
            user_account_bump,
        )
    }

    pub fn sign_out_user(
        ctx: Context<SignOutUser>,
//        user_account_bump: u8,
    ) -> Result<()> {
        crate::transactions::user::sign_out(ctx)
    }
}
