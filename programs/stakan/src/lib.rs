use anchor_lang::prelude::*;
use anchor_spl::token::{Token, transfer, TokenAccount};

//use agsol_borsh_schema::BorshSchema;

mod game_global_account;

#[error_code]
pub enum GameError {
    #[msg("Initialize global wallet with more funds.")]
    GlobalFundsTooLow,

    #[msg("Invalid Game Global Account public key.")]
    InvalidGlobalStateKey,

    #[msg("Could not transfer stake to Global Account.")]
    CouldNotTransferStake,

    #[msg("Could not transfer reward from Global Account.")]
    CouldNotTransferReward,

    #[msg("Stake is higher than fund can accept.")]
    StakeTooHigh,

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

    pub fn init_global_state(ctx: Context<InitGlobalState>, funds: u64) -> Result<()> {
/*
        if funds < GameGlobalState::MIN_STAKE_LAMPORTS {
            return Err(GameError::StakeTooHigh.into())
        }

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.global_wallet.key(),
            &ctx.accounts.global_wallet.key(),
            funds,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.global_wallet.to_account_info(),
                ctx.accounts.global_wallet.to_account_info(),
            ],
        )?;
*/
//        ctx.accounts.game_global_account.funds = GameGlobalState::MIN_STAKE_LAMPORTS;
        ctx.accounts.game_global_account.funds = funds;
        ctx.accounts.game_global_account.global_max_score = 0;
        Ok(())
    }

    pub fn sign_up_user(ctx: Context<InitUserGameAccount>) -> Result<()> {
        ctx.accounts.user_game_account.max_score = 0; //0xbeef;
        ctx.accounts.user_game_account.saved_game_sessions = 0; //0xdead;
        Ok(())
    }

    pub fn init_game_session(ctx: Context<InitGameSession>,
        authority: Pubkey, 
        stake: u64) -> Result<()> {
        // reward is funds/2, so stake should be smaller than funds 
        // in order the reward is greater than stake in case the user is rewarded 
        if ctx.accounts.game_global_account.funds <= stake {
            return Err(GameError::StakeTooHigh.into())
        }

        ctx.accounts.game_session_account.stake = stake;
//        ctx.accounts.pda_game_session_account.authority = authority;
//        return Ok(());

        if stake > 0 {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.user_wallet.key(),
                &ctx.accounts.pda_game_session_account.key(),
//                &ctx.accounts.game_session_account.key(),
                stake,
            );
            match 
                anchor_lang::solana_program::program::invoke(
                    &ix,
                    &[
                        ctx.accounts.user_wallet.to_account_info(),
                        ctx.accounts.pda_game_session_account.to_account_info(),
//                        ctx.accounts.game_session_account.to_account_info(),
                    ],
                ) {
                Ok(()) => {
//                    ctx.accounts.game_global_account.funds += stake;
                    Ok(())
                },
                Err(_) => Err(GameError::CouldNotTransferStake.into()),
            }
/*
            match
                anchor_spl::token::transfer(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: ctx
                                .accounts
                                .user_wallet
                                .to_account_info(),
                            to: ctx
                                .accounts
                                .pda_game_session_account
                                .to_account_info(),
                            authority: ctx.accounts.user_wallet.to_account_info(),
                        },
                    ),
                    stake,
                ) 
                {
                    Ok(()) => {
                    //                    ctx.accounts.game_global_account.funds += stake;
                        Ok(())
                    },
                    Err(_) => Err(GameError::CouldNotTransferStake.into()),
                }        
        } else {
            Ok(())
        }
*/
        } else {
            Ok(())
        }
    }

    pub fn save_game_session(ctx: Context<SaveGameSession>, score: u64, millis: u64) -> Result<()> {
        ctx.accounts.game_session_account.duration_millis = millis;
        ctx.accounts.game_session_account.score = score;

        ctx.accounts.user_game_account.saved_game_sessions += 1;
        if ctx.accounts.user_game_account.max_score < score {
            ctx.accounts.user_game_account.max_score = score;
        }

        let stake = ctx.accounts.game_session_account.stake;
/*
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                
                anchor_spl::token::Transfer {
                    from: ctx
                        .accounts
                        .game_session_account
                        .to_account_info(),
                    to: ctx
                        .accounts
                        .global_wallet
                        .to_account_info(),
                    authority: ctx
                        .accounts
                        .game_session_account
                        .to_account_info(),
                },

                &[&[
                    ctx.accounts.offer.key().as_ref(),
                    &[ctx.accounts.offer.escrowed_tokens_of_offer_maker_bump],
                ]],

            ),

            ctx.accounts.escrowed_tokens_of_offer_maker.amount,

        )?;
*/

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.game_session_account.key(),
            &ctx.accounts.global_wallet.key(),
            stake,
        );
        match 
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.game_session_account.to_account_info(),
                    ctx.accounts.global_wallet.to_account_info(),
                ],
            ) {
            Ok(()) => {
                    ctx.accounts.game_global_account.funds += stake;
            },
            Err(_) => return Err(GameError::CouldNotTransferStake.into()),
        }

        if score > ctx.accounts.game_global_account.global_max_score {
            ctx.accounts.game_global_account.global_max_score = score;

            let reward = ctx.accounts.game_global_account.funds / 2;

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
                Ok(()) => {
                    ctx.accounts.game_global_account.funds -= reward;
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
    pub game_global_account: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
//#[instruction(pda_game_session_account_bump: u8)]
pub struct InitGameSession<'info> {
    #[account(init, payer = user_wallet, space = InitGameSession::SIZE)]
    pub game_session_account: Account<'info, GameSession>,
    
    #[account(
        init, space = 8 + 100,
        payer = user_wallet,
        seeds = [game_session_account.key().as_ref()],
        bump,
    )]
    pub pda_game_session_account: Account<'info, GameSessionStake>,
//    pub pda_game_session_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub game_global_account: Account<'info, GameGlobalState>,

    #[account(mut)]
    pub user_wallet: Signer<'info>,
    #[account(mut)]
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    pub global_wallet: UncheckedAccount<'info>,
//    pub token_program: Program<'info, Token>,
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
pub struct GameSessionStake {
    pub authority: Pubkey,
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
    pub funds: u64,
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
