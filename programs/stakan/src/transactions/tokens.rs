use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint, TokenAccount};
use crate::transactions::set_up_stakan::StakanGlobalState;
use crate::transactions::user::User;

#[derive(Accounts)]
pub struct PurchaseTokens<'info> {
    stakan_state_account: Box<Account<'info, StakanGlobalState>>,

    /// CHECK:` PDA account used as a program wallet for receiving lamports 
    /// when a user purchases tokens
    #[account(mut,
        constraint = stakan_state_account.escrow_account == stakan_escrow_account.key(),
    )]
    stakan_escrow_account: AccountInfo<'info>,

    #[account(mut,
    )]
    mint: Account<'info, Mint>, 

    #[account(
        constraint = user_account.user.user_wallet == user_wallet.key(),
    )]
    user_account: Account<'info, User>,

    #[account(mut,
        constraint = user_token_account.mint == stakan_state_account.mint_token,
        constraint = user_token_account.owner == user_account.key(),
    )]
    user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    user_wallet: Signer<'info>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    stakan_state_account: Box<Account<'info, StakanGlobalState>>,

    /// CHECK:` PDA account used as a program wallet for receiving lamports 
    /// when a user purchases tokens
    #[account(mut,
        constraint = stakan_state_account.escrow_account == stakan_escrow_account.key(),
    )]
    stakan_escrow_account: AccountInfo<'info>,

    #[account(
        constraint = user_account.user.user_wallet == user_wallet.key(),
    )]
    user_account: Account<'info, User>,

    #[account(mut,
        constraint = user_token_account.mint == stakan_state_account.mint_token,
        constraint = user_token_account.owner == user_account.key(),
    )]
    user_token_account: Account<'info, TokenAccount>,

    /// CHECK:` pubkey of user wallet to receive lamports from program wallet
    #[account(mut)]
    user_wallet: AccountInfo<'info>,

    #[account(mut,
        constraint = reward_funds_account.owner == stakan_state_account.key(),
    )]
    reward_funds_account: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

pub fn purchase(
    ctx: Context<PurchaseTokens>,
    token_amount: u64, 
) -> Result<()> {
    solana_program::program::invoke(
        &solana_program::system_instruction::transfer(
            ctx.accounts.user_wallet.key, 
            &ctx.accounts.stakan_state_account.escrow_account,
            token_amount * StakanGlobalState::LAMPORTS_PER_STAKAN_TOKEN),
        &[
            ctx.accounts.user_wallet.to_account_info(),
            ctx.accounts.stakan_escrow_account.to_account_info(),
            ctx.accounts.system_program.to_account_info()
        ],
    )?;

    let temp_bump: [u8; 1] = ctx.accounts.stakan_state_account.stakan_state_account_bump.to_le_bytes();
    let signer_seeds = [
        StakanGlobalState::SEED.as_ref(),
        &temp_bump
    ];
    anchor_spl::token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),

            anchor_spl::token::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.stakan_state_account.to_account_info(),
            },
            &[&signer_seeds]
        ), 
        token_amount
    )?;

    Ok(())
}

pub fn sell(
    ctx: Context<SellTokens>,
    token_amount: u64, 
) -> Result<()> {

    let user_inner = &ctx.accounts.user_account.user;
    let signer_seeds = signer_seeds!(user_inner);

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
        token_amount
    )?;

    let lamports_delta = token_amount * StakanGlobalState::LAMPORTS_PER_STAKAN_TOKEN;
    let escrow_balance_after = ctx.accounts.stakan_escrow_account.lamports()
        .checked_sub(lamports_delta)
        .ok_or(crate::errors::StakanError::NegativeBalance)?;

    if !ctx.accounts.rent.is_exempt(escrow_balance_after, ctx.accounts.stakan_escrow_account.data_len()) {
        // should never happen
        return Err(crate::errors::StakanError::GlobalEscrowAccountDepleted.into());
    }    

    **ctx.accounts.stakan_escrow_account.lamports.borrow_mut() = escrow_balance_after;
    **ctx.accounts.user_wallet.lamports.borrow_mut() =
    ctx.accounts.user_wallet.lamports()
            .checked_add(lamports_delta)
            .ok_or(crate::errors::StakanError::BalanceOverflow)?;

    Ok(())
}
