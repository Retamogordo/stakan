use anchor_lang::prelude::*;

pub mod transactions;
pub mod errors;

use crate::transactions::set_up_stakan::*;
use crate::transactions::user::*;
use crate::transactions::tokens::*;
use crate::transactions::game_session::*;

declare_id!("6mEpDuNtJojXtHjBjLgjVM9v2incRGtpz6C52uwDxt98");

solana_security_txt::security_txt! {
    // Required fields
    name: "Stakan",
    project_url: "https://retamogordo.github.io/stakan",
    contacts: "email:yury.yukhananov@tutanota.com",
    policy: "https://github.com/Retamogordo/stakan/SECURITY.md",

    // Optional Fields
    preferred_languages: "en,es,ru",
    source_code: "https://github.com/Retamogordo/stakan",
    auditors: "None",
    acknowledgements: "
        Super useful resources that made development of this project possible:
        - https://lorisleiva.com/create-a-solana-dapp-from-scratch
        - https://github.com/paul-schaaf/solana-escrow/
        - David Choi Solana Programming series on Youtube: https://www.youtube.com/c/DavidChoiProgrammer
"
}


#[program] 
pub mod stakan {
    use super::*;

    pub fn set_up_stakan(
        ctx: Context<SetupStakan>,
        stakan_state_account_bump: u8,
        escrow_account_bump: u8,
    ) -> Result<()> {
        crate::transactions::set_up_stakan::set_up_stakan(
            ctx, 
            stakan_state_account_bump,
            escrow_account_bump
        )
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
        token_amount: u64, 
    ) -> Result<()> {
        crate::transactions::tokens::purchase(ctx, token_amount)
    }

    pub fn sell_tokens(
        ctx: Context<SellTokens>,
        token_amount: u64, 
    ) -> Result<()> {
        crate::transactions::tokens::sell(ctx, token_amount)
    }

    pub fn init_game_session(ctx: Context<InitGameSession>, stake: u64,) -> Result<()> {
        crate::transactions::game_session::init(ctx, stake)
    }
    pub fn finish_game_session(ctx: Context<FinishGameSession>,
        // just to ensure arweave has confirmed storage transaction
        _dummy_arweave_storage_tx_id: Option<String>, 
        score: u64,
    ) -> Result<()> {
        crate::transactions::game_session::finish(
            ctx, 
            _dummy_arweave_storage_tx_id,
            score,
        )
    }

    pub fn sign_out_user(
        ctx: Context<SignOutUser>,
    ) -> Result<()> {
        crate::transactions::user::sign_out(ctx)
    }
    pub fn force_delete_user(
        ctx: Context<ForceDeleteUser>,
    ) -> Result<()> {
        crate::transactions::user::force_delete(ctx)
    }

    pub fn close_global_stakan_account_for_debug(
        ctx: Context<CloseStakanAccountForDebug>,

    ) -> Result<()> {
        crate::transactions::set_up_stakan::close_acc(ctx)
    }

}
