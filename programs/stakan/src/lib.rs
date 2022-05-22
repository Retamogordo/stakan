use anchor_lang::prelude::*;
//use agsol_borsh_schema::BorshSchema;

mod game_global_account;

#[error_code]
pub enum GameError {
    #[msg("Invalid Game Global Account public key.")]
    InvalidGlobalStateKey,

    #[msg("Could not transfer stake to Global Account.")]
    CouldNotTransferStake,

    #[msg("Could not transfer reward from Global Account.")]
    CouldNotTransferReward,

    #[msg("Invalid value of game session duration.")]
    InvalidDuration,
}

//declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
declare_id!("StakanXf8bymj5JEgJYH4qUQ7xTtoR1W2BeHUbDjCJb");
/*
use std::str::{FromStr};
static global_account_key: Pubkey 
    = Pubkey::from_str("StGlStatebymj5JEgJYH4qUQ7xTtoR1W2BeHUbDjCJb").unwrap();*/
//static global_account_key_str: &str = "StGlStatebymj5JEgJYH4qUQ7xTtoR1W2BeHUbDjCJb";

#[program]
pub mod stakan {
    use super::*;

    pub fn init_global_state(ctx: Context<InitGlobalState>) -> Result<()> {
        ctx.accounts.game_global_account.global_stake = GameGlobalState::MIN_STAKE_LAMPORTS;
        Ok(())
    }

    pub fn init_user_game_account(ctx: Context<InitUserGameAccount>) -> Result<()> {
        ctx.accounts.user_game_account.max_score = 0xbeef;
        ctx.accounts.user_game_account.saved_game_sessions = 0xdead;
        Ok(())
    }

    pub fn init_game_session(ctx: Context<InitGameSession>, stake: u64) -> Result<()> {
        ctx.accounts.game_session_account.stake = stake;
//        return Ok(());

        if stake > 0 {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.user_wallet.key(),
                &ctx.accounts.global_wallet.key(),
                stake,
            );
            match 
                anchor_lang::solana_program::program::invoke(
                    &ix,
                    &[
                        ctx.accounts.user_wallet.to_account_info(),
                        ctx.accounts.global_wallet.to_account_info(),
                    ],
                ) {
                Ok(_) => {
                    ctx.accounts.game_global_account.global_stake += stake;
                    Ok(())
                },
                Err(_) => Err(GameError::CouldNotTransferStake.into()),
            }
        } else {
            Ok(())
        }
    }
 /*   pub fn update_game_session(ctx: Context<UpdateGameDuration>, millis: u64) -> Result<()> {
        ctx.accounts.game_session_account.set_duration(millis)?;
        Ok(())
    }
*/
    pub fn save_game_session(ctx: Context<SaveGameSession>, score: u64, millis: u64) -> Result<()> {
        ctx.accounts.game_session_account.duration_millis = millis;
        ctx.accounts.game_session_account.score = score;

        ctx.accounts.user_game_account.saved_game_sessions += 1;
        if ctx.accounts.user_game_account.max_score < score {
            ctx.accounts.user_game_account.max_score = score;
        }

        if score > ctx.accounts.game_global_account.global_max_score {
            ctx.accounts.game_global_account.global_max_score = score;

            let reward = ctx.accounts.game_global_account.global_stake / 2;

            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.global_wallet.key(),
                &ctx.accounts.user_wallet.key(),
                reward,
            );
            match 
                anchor_lang::solana_program::program::invoke(
                    &ix,
                    &[
                        ctx.accounts.global_wallet.to_account_info(),
                        ctx.accounts.user_wallet.to_account_info(),
                    ],
                ) {
                Ok(_) => {
                    ctx.accounts.game_global_account.global_stake -= reward;
                    Ok(())
                },
                Err(_) => Err(GameError::CouldNotTransferReward.into()),
            }
        } else {
//        anchor_lang::rpc
            Ok(())
        }
    }
}

#[derive(Accounts)]
pub struct InitGlobalState<'info> {
    #[account(init, payer = global_wallet, space = 8 + 100)]
    pub game_global_account: Account<'info, GameGlobalState>,
    #[account(mut)]
    pub global_wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitUserGameAccount<'info> {
    #[account(init, payer = user_wallet, space = 8 + 100)]
    pub user_game_account: Account<'info, UserGame>,
    #[account(mut)]
    pub user_wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct InitGameSession<'info> {
    #[account(init, payer = user_wallet, space = InitGameSession::SIZE)]
    pub game_session_account: Account<'info, GameSession>,
    #[account(mut)]
    pub game_global_account: Account<'info, GameGlobalState>,
    #[account(mut)]
    pub user_wallet: Signer<'info>,
    #[account(mut)]
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    pub global_wallet: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}


impl InitGameSession<'_> {
    const SIZE: usize = 8 + 100;
}

#[derive(Accounts)]
pub struct SaveGameSession<'info> {
    #[account(mut, close = user_wallet)]
    pub game_session_account: Account<'info, GameSession>,
    #[account(mut)]
    pub game_global_account: Account<'info, GameGlobalState>,
    #[account(mut)]
    pub user_game_account: Account<'info, UserGame>,
    #[account(mut)]
//    /// CHECK:` doc comment explaining why no checks through types are necessary.
    pub user_wallet: Signer<'info>,
    #[account(mut)]
    pub global_wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}


/*
#[derive(Accounts)]
pub struct UpdateGameDuration<'info> {
    #[account(mut)]
    pub game_session_account: Account<'info, GameSession>,
}
*/

/*
#[derive(Accounts)]
pub struct CloseGameSessionAccount<'info> {
    #[account(mut, close = user_wallet)]
    pub game_session_account: Account<'info, GameSession>,
    #[account(mut)]
    pub user_wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}
*/
#[account]
pub struct GameSession {
    pub score: u64,
    pub duration_millis: u64,
    pub stake: u64,
} 

#[account]
//#[derive(agsol_borsh_schema::BorshSchema)]
pub struct UserGame {
    pub saved_game_sessions: u64,
    pub max_score: u64,
} 


#[account]
pub struct GameGlobalState {
    pub global_max_score: u64,
    pub global_stake: u64,
} 

impl GameGlobalState {
    const MIN_STAKE_LAMPORTS: u64 = 1000000;
}

//#[account]
//pub struct WalletForReward(());

/*
impl GameSession {
    fn set_duration(&mut self, millis: u64) -> Result<()> {
        if self.duration_millis < millis {
            self.duration_millis = millis;
            Ok(())
        } else {
            Err(GameError::InvalidDuration.into())
        }
    }
}
*/
