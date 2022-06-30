use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::transactions::user::User;
use crate::transactions::set_up_stakan::StakanGlobalState;
use crate::errors::StakanError;

#[account]
pub struct GameSession {
    user_account: Pubkey,
    score: u64,
    duration_millis: u64,
    stake: u64,
    tiles_cols: u8,
    tiles_rows: u8,
    tiles: Vec<u8>,
}

impl GameSession {
    pub(crate) fn size_for_init(tiles_cols: u8, tiles_rows: u8) -> usize {
        use std::mem::size_of;

        8
        + size_of::<Pubkey>()
        + size_of::<u64>()
        + size_of::<u64>()
        + size_of::<u64>()
        + size_of::<u8>()
        + size_of::<u8>()
        + (size_of::<u32>() + (tiles_cols as usize * tiles_rows as usize)*size_of::<u8>())
//        + (tiles_cols as usize * tiles_rows as usize)*size_of::<u8>()
    }
}

#[derive(Accounts)]
#[instruction(stake: u64, tiles_cols: u8, tiles_rows: u8)]

pub struct InitGameSession<'info> {
    stakan_state_account: Account<'info, StakanGlobalState>,

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
        init, space = GameSession::size_for_init(tiles_cols, tiles_rows),
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
/*
#[derive(Accounts)]
pub struct UpdateGameSession<'info> {
    user_account: Account<'info, User>,

    #[account(mut,
        constraint = game_session_account.user_account == user_account.key(),
//        constraint = user_account.user.game_session == None
        constraint = user_account.user.game_session == Some(game_session_account.key())
    )]
    game_session_account: Account<'info, GameSession>,

    system_program: Program<'info, System>,
}
*/
#[derive(Accounts)]
pub struct FinishGameSession<'info> {
    #[account(mut)]
    stakan_state_account: Account<'info, StakanGlobalState>,

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
    tiles_cols: u8,
    tiles_rows: u8,
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
    
    game_session_account.user_account = ctx.accounts.user_account.key();
    game_session_account.stake = stake;
    game_session_account.duration_millis = 0;
    game_session_account.score = 0;
    game_session_account.tiles_cols = tiles_cols;
    game_session_account.tiles_rows = tiles_rows;
    game_session_account.tiles = vec![0; (tiles_cols as usize)*(tiles_rows as usize)];

    ctx.accounts.user_account.set_game_session(Some(game_session_account.key()));
/*
    ctx.accounts.user_account.user.game_session = Some(game_session_account.key());
    ctx.accounts.user_account.inner_size = ctx.accounts.user_account.user.size_for_borsh() as u16;
*/
    Ok(())
}

pub fn finish(ctx: Context<FinishGameSession>,
    // just to ensure arweave has confirmed storage transaction
    _dummy_arweave_storage_tx_id: Option<String>, 
    user_account_bump: u8,
    score: u64,
//    stakan_state_account_bump: u8,
) -> Result<()> {
//    return Ok(());

    let global_max_score = ctx.accounts.stakan_state_account.global_max_score;
//    let game_session_score = ctx.accounts.game_session_account.score;
    let game_session_score = score;
    let stake = ctx.accounts.game_session_account.stake;
    let username = ctx.accounts.user_account.user.username.clone();
    let arweave_storage_address = ctx.accounts.user_account.user.arweave_storage_address.clone();
    
    let record_hit = game_session_score > global_max_score;

    if record_hit {
        ctx.accounts.stakan_state_account.global_max_score = game_session_score;
    }

    if stake > 0 {   
        if record_hit {
            let funds_div_2 = ctx.accounts.reward_funds_account.amount / 2;
            
                // if funds_div_2 <= stake, nothing is transferred, 
                // so user keeps their stake
            if funds_div_2 > stake {
                let reward = funds_div_2 - stake;

                let temp_bump: [u8; 1] = ctx.accounts.stakan_state_account.stakan_state_account_bump.to_le_bytes();
                let signer_seeds = [
                    b"stakan_state_account".as_ref(),
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
                    reward,
                    )?;
            }
        } else {
            let temp_bump: [u8; 1] = user_account_bump.to_le_bytes();
//            let signer_seeds 
//                = ctx.accounts.user_account.compose_user_account_seeds_with_bump(&temp_bump);          
            let signer_seeds = [
                b"user_account".as_ref(),
                User::username_slice_for_seed(&username[..]),
                User::arweave_storage_address_for_seed(&arweave_storage_address[..]),
                &temp_bump
            ];
            
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
/*
pub fn update(ctx: Context<UpdateGameSession>,
    score: u64,
    duration_millis: u64,
    tiles: Vec<u8>,
) -> Result<()> {

    if ctx.accounts.game_session_account.score > score {
        return Err(StakanError::ScoreCantDecrease.into());
    }
    if ctx.accounts.game_session_account.duration_millis > duration_millis {
        return Err(StakanError::DurationCantDecrease.into());
    }
    ctx.accounts.game_session_account.score = score;
    ctx.accounts.game_session_account.duration_millis = duration_millis;
    ctx.accounts.game_session_account.tiles = tiles;

    Ok(())
}
*/