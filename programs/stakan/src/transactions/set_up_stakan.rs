use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint, TokenAccount};
use anchor_spl::associated_token::{AssociatedToken, };

#[account]
pub(crate) struct StakanGlobalState {
    // use this id for searching this global account 
    // with getParsedProgramAccounts on frontend side
    pub id: Vec<u8>, 
    pub stakan_state_account: Pubkey,
    pub stakan_state_account_bump: u8,
    pub global_max_score: u64,
    pub lamports_per_stakan_tokens: u64,

    pub reward_funds_account: Pubkey,

    pub escrow_account: Pubkey,
    pub escrow_account_bump: u8,

    pub mint_token: Pubkey,

    pub program_wallet: Pubkey,
    pub champion_account: Option<Pubkey>,
} 

impl StakanGlobalState {
    pub(crate) const ID: &'static str = "StakanState3";
    pub(crate) const SEED: &'static [u8] = b"stakan_state_account3";
    pub(crate) const ESCROW_ACCOUNT_SEED: &'static [u8] = b"stakan_escrow_account";
    pub(crate) const LAMPORTS_PER_STAKAN_TOKEN: u64 = 1000000;

    pub(crate) fn size_for_borsh() -> usize {
        use std::mem::size_of;
            8
            + size_of::<u32>() + Self::ID.len()
            + size_of::<Pubkey>() // stakan_state_account
            + size_of::<u8>()     // stakan_state_account_bump
            + size_of::<u64>()    // global_max_score
            + size_of::<u64>()    // lamports_per_stakan_tokens
            + size_of::<Pubkey>() // reward_funds_account
            + size_of::<Pubkey>() + size_of::<u8>() // escrow_account + bump
            + size_of::<Pubkey>() // mint_token
            + size_of::<Pubkey>() // program_wallet
            + (1 + size_of::<Pubkey>())
    }    
}

#[derive(Accounts)]
pub struct SetupStakan<'info> {
    #[account(init, payer = program_wallet, 
        space = StakanGlobalState::size_for_borsh(),
        seeds = [
            StakanGlobalState::SEED.as_ref(), 
        ],
        bump,
    )]
    stakan_state_account: Box<Account<'info, StakanGlobalState>>,

    /// CHECK:` PDA account used as a program wallet for receiving lamports 
    /// when a user purchases tokens
    #[account(init_if_needed, payer = program_wallet, 
        space = 8,
        seeds = [
            StakanGlobalState::SEED.as_ref(), StakanGlobalState::ESCROW_ACCOUNT_SEED.as_ref(), 
        ],
        bump,
    )]
    escrow_account: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = program_wallet,
        seeds = [StakanGlobalState::SEED.as_ref(), b"stakan_mint".as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = stakan_state_account
    )]
    mint: Account<'info, Mint>,

    #[account(init, payer = program_wallet,
        associated_token::mint = mint,
        associated_token::authority = stakan_state_account,
    )]  
    reward_funds_account: Account<'info, TokenAccount>,

    #[account(mut)]
    program_wallet: Signer<'info>,
    
    associated_token_program: Program<'info, AssociatedToken>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

impl SetupStakan<'_> {
    const INITIAL_REWARD_FUNDS: u64 = 10000;
}

#[derive(Accounts)]
pub struct CloseStakanAccountForDebug<'info> {
    #[account(mut, 
        close = program_wallet,
    )]
    stakan_state_account: Box<Account<'info, StakanGlobalState>>,

    /// CHECK:` pubkey of program wallet to receive lamports 
    #[account(mut)]
    program_wallet: AccountInfo<'info>,

    /// CHECK:` account to be closed
    #[account(mut,
//        close = program_wallet,
    )]
    escrow_account: AccountInfo<'info>,

    #[account(mut,
    )]
    mint: Account<'info, Mint>,

    #[account(mut)]
    reward_funds_account: Account<'info, TokenAccount>,

    associated_token_program: Program<'info, AssociatedToken>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

pub fn set_up_stakan(ctx: Context<SetupStakan>,
    stakan_state_account_bump: u8,
    escrow_account_bump: u8,
) -> Result<()> {

    // set up escrow account and deposit lamports according to 
    // initial token supply
    // dev program wallet is charged 
    solana_program::program::invoke(
        &solana_program::system_instruction::transfer(
            ctx.accounts.program_wallet.key, 
            &ctx.accounts.escrow_account.key(),
            SetupStakan::INITIAL_REWARD_FUNDS * StakanGlobalState::LAMPORTS_PER_STAKAN_TOKEN),
        &[
            ctx.accounts.program_wallet.to_account_info(),
            ctx.accounts.escrow_account.to_account_info(),
            ctx.accounts.system_program.to_account_info()
        ],
    )?;

    // mint initial token supply
    let temp_bump: [u8; 1] = stakan_state_account_bump.to_le_bytes();
    let signer_seeds = [
        StakanGlobalState::SEED.as_ref(),
        &temp_bump
    ];
    anchor_spl::token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),

            anchor_spl::token::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.reward_funds_account.to_account_info(),
                authority: ctx.accounts.stakan_state_account.to_account_info(),
            },
            &[&signer_seeds]
        ), 
        SetupStakan::INITIAL_REWARD_FUNDS
    )?;

    let acc = &mut ctx.accounts.stakan_state_account;
    
    acc.id = StakanGlobalState::ID.as_bytes().to_vec();
    acc.stakan_state_account = acc.key();
    acc.stakan_state_account_bump = stakan_state_account_bump;
    acc.lamports_per_stakan_tokens = StakanGlobalState::LAMPORTS_PER_STAKAN_TOKEN;
    
    acc.mint_token = ctx.accounts.mint.key();

    acc.escrow_account = ctx.accounts.escrow_account.key();
    acc.escrow_account_bump = escrow_account_bump;

    acc.reward_funds_account = ctx.accounts.reward_funds_account.key(); 
    acc.global_max_score = 0;
    acc.program_wallet = ctx.accounts.program_wallet.key();
    acc.champion_account = None;
    Ok(())    
}
// this is used for dev & debug only
pub fn close_acc(ctx: Context<CloseStakanAccountForDebug>,
) -> Result<()> {

    let escrow_balance = ctx.accounts.escrow_account.lamports();
    ctx.accounts.escrow_account.lamports()
        .checked_sub(escrow_balance)
        .ok_or(crate::errors::StakanError::NegativeBalance)?;

    ctx.accounts.program_wallet.lamports()
        .checked_add(escrow_balance)
        .ok_or(crate::errors::StakanError::BalanceOverflow)?;

    let temp_bump: [u8; 1] = ctx.accounts.stakan_state_account.stakan_state_account_bump.to_le_bytes();
    let signer_seeds = [
        StakanGlobalState::SEED.as_ref(),
        &temp_bump
    ];

    anchor_spl::token::burn(
        CpiContext::new_with_signer(
            ctx.accounts.associated_token_program.to_account_info(),
            
            anchor_spl::token::Burn {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.reward_funds_account.to_account_info(),
                authority: ctx.accounts.stakan_state_account.to_account_info(),
            },

            &[&signer_seeds]
        ),
        ctx.accounts.reward_funds_account.amount
    )?;
 
    anchor_spl::token::close_account(
        CpiContext::new_with_signer(
            ctx.accounts.associated_token_program.to_account_info(),

            anchor_spl::token::CloseAccount {
                account: ctx.accounts.reward_funds_account.to_account_info(),
                destination: ctx.accounts.program_wallet.to_account_info(),
                authority: ctx.accounts.stakan_state_account.to_account_info()
            },
            &[&signer_seeds]
        )
    )?;

    Ok(())    
}
