use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::transactions::user::User;
use crate::transactions::set_up_stakan::StakanGlobalState;
use crate::errors::StakanError;

#[account]
pub struct GameSession {
    // use this id for quering this type of accounts 
    // with getParsedProgramAccounts on frontend side
    id: Vec<u8>, 
    user_account: Pubkey,
    stake: u64,
}

impl GameSession {
    const ID: &'static str = "GameSession";

    pub(crate) fn size_for_init() -> usize {
        use std::mem::size_of;

        8
        + size_of::<u32>() + Self::ID.len()
        + size_of::<Pubkey>()
        + size_of::<u64>()
    }
}

#[derive(Accounts)]
#[instruction(stake: u64)]

pub struct InitGameSession<'info> {
    stakan_state_account: Box<Account<'info, StakanGlobalState>>,

    #[account(mut,
        constraint = user_account.user.user_wallet == user_wallet.key(),
    )]
    user_account: Account<'info, User>,

    #[account(mut,
        constraint = user_token_account.mint == stakan_state_account.mint_token,
        constraint = user_token_account.owner == user_account.key(),
    )]
    user_token_account: Account<'info, TokenAccount>,

    #[account(mut,
        constraint = reward_funds_account.owner == stakan_state_account.key(),
    )]
    reward_funds_account: Account<'info, TokenAccount>,

    #[account(
        init, space = GameSession::size_for_init(),
        payer = user_wallet,
        seeds = [
            b"game_session_account".as_ref(),
            User::username_slice_for_seed(user_account.user.username.as_ref()),
            User::arweave_storage_address_for_seed(user_account.user.arweave_storage_address.as_ref()),
        ],
        bump,
    )]
    game_session_account: Account<'info, GameSession>,

    #[account(mut)]
    user_wallet: Signer<'info>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinishGameSession<'info> {
    #[account(mut)]
    stakan_state_account: Box<Account<'info, StakanGlobalState>>,

    #[account(mut,
        constraint = user_account.user.user_wallet == user_wallet.key(),
    )]
    user_account: Account<'info, User>,

    #[account(mut,
        constraint = user_token_account.owner == user_account.key(),
    )]
    user_token_account: Account<'info, TokenAccount>,

    #[account(mut,
        close = user_wallet,
        constraint = game_session_account.user_account == user_account.key()
    )]
    game_session_account: Account<'info, GameSession>,

    #[account(mut,
    )]
    reward_funds_account: Account<'info, TokenAccount>,

    /// CHECK:` user wallet receiving fee back upon game_session_account closing
    #[account(mut)]
    user_wallet: UncheckedAccount<'info>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

pub fn init(
    ctx: Context<InitGameSession>, 
    stake: u64,
) -> Result<()> {
    let reward_tokens_funds = ctx.accounts.reward_funds_account.amount;

    if ctx.accounts.user_token_account.amount < stake {
        return Err(StakanError::InsufficientTokensOnAccount.into());
    }
    // reward is funds/2, so stake should be smaller than funds 
    // in order the reward to be greater than stake in case the user is rewarded 
    if reward_tokens_funds <= stake {
        return Err(StakanError::StakeTooHigh.into());
    }

    let game_session_account = &mut ctx.accounts.game_session_account;
    
    game_session_account.id = GameSession::ID.as_bytes().to_vec();
    game_session_account.user_account = ctx.accounts.user_account.key();
    game_session_account.stake = stake;

    ctx.accounts.user_account.set_game_session(Some(game_session_account.key()));

    Ok(())
}

pub fn finish(ctx: Context<FinishGameSession>,
    // just to ensure arweave has confirmed storage transaction
    _dummy_arweave_storage_tx_id: Option<String>, 
    score: u64,
) -> Result<()> {

    let global_max_score = ctx.accounts.stakan_state_account.global_max_score;
    let game_session_score = score;
    let stake = ctx.accounts.game_session_account.stake;
//    let username = ctx.accounts.user_account.user.username.clone();
//    let arweave_storage_address = ctx.accounts.user_account.user.arweave_storage_address.clone();
    
    let record_hit = game_session_score > global_max_score;

    if record_hit {
        ctx.accounts.stakan_state_account.global_max_score = game_session_score;
        ctx.accounts.stakan_state_account.champion_account = Some(ctx.accounts.user_account.key());
    }

    if stake > 0 {   
        if record_hit {
            let half_funds = ctx.accounts.reward_funds_account.amount / 2;
            
                // if half_funds <= stake, nothing is transferred, 
                // so user keeps their stake
            if half_funds > stake {
                let h: f64 = half_funds as f64;
                let s: f64 = stake as f64;
                let x: f64 = game_session_score as f64;
                let x0: f64 = global_max_score as f64;
                let reward = h + (s - h) * ((-s/h * x*(x - x0)/h) as f64).exp();

                let temp_bump: [u8; 1] = ctx.accounts.stakan_state_account.stakan_state_account_bump.to_le_bytes();
                let signer_seeds = [
                    StakanGlobalState::SEED.as_ref(),
                    &temp_bump
                ];

                anchor_spl::token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
    
                        anchor_spl::token::Transfer {
                            from: ctx.accounts.reward_funds_account.to_account_info(),                       
                            to: ctx.accounts.user_token_account.to_account_info(),
                            authority: ctx.accounts.stakan_state_account.to_account_info(),
                        },
                        &[&signer_seeds]
                    ),
                    reward as u64,
                    )?;
            }
        } else {
            let user = &ctx.accounts.user_account.user;
            let signer_seeds = signer_seeds!(user);
          
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),

                    anchor_spl::token::Transfer {
                        from: ctx.accounts.user_token_account.to_account_info(),                       
                        to: ctx.accounts.reward_funds_account.to_account_info(),
                        authority: ctx.accounts.user_account.to_account_info(),
                    },
                    &[&signer_seeds]
                ),
                stake,
            )?;
        }
    }
    let user_account = &mut ctx.accounts.user_account;
    
    if game_session_score > user_account.user.max_score {
        user_account.user.max_score = game_session_score;
    }
    user_account.user.saved_game_sessions += 1;

    user_account.set_game_session(None);
    Ok(())
}
