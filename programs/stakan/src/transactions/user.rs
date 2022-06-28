use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint, TokenAccount};
use anchor_spl::associated_token::{AssociatedToken, };
use crate::transactions::set_up_stakan::StakanGlobalState;
use crate::errors::StakanError;

#[account]
//#[derive(agsol_borsh_schema::BorshSchema)]
pub struct User {
    inner_size: u16,
    pub user: UserInner,    
} 

impl User {
    pub(crate) fn size_for_init() -> usize {
        use std::mem::size_of;

        8
        + size_of::<u16>()
        + UserInner::size_for_init(
            UserInner::MAX_USERNAME_LEN,
            UserInner::MAX_ARWEAVE_LEN
        )
    }

    pub(crate) fn username_slice_for_seed(username: &[u8]) -> &[u8] {
        let len = if UserInner::MAX_USERNAME_LEN_FOR_SEED > username.len() {
            username.len()
        } else { UserInner::MAX_USERNAME_LEN_FOR_SEED };

        &username[..len]
    }

    pub(crate) fn arweave_storage_address_for_seed(arweave_storage_address: &[u8]) -> &[u8] {
        let len = if UserInner::MAX_ARWEAVE_LEN_FOR_SEED > arweave_storage_address.len() {
            arweave_storage_address.len()
        } else { UserInner::MAX_ARWEAVE_LEN_FOR_SEED };

        &arweave_storage_address[..len]
    }

    pub(crate) fn set_game_session(&mut self, game_session: Option<Pubkey>) {
        self.user.game_session = game_session;

        self.inner_size = self.user.size_for_borsh() as u16;
    }
/*
    pub(crate) fn compose_user_account_seeds_with_bump<'a>(&self,
        bump_vec: &'a [u8; 1],
    //    username: &'a str,
    //    arweave_storage_address: &'a str,
    ) -> [&'a [u8]; 4] {
    //    let temp_bump: [u8; 1] = bump.to_le_bytes();
        let seeds = [
            b"user_account".as_ref(), 
//            SignUpUser::username_slice_for_seed(username.as_str())
            Self::username_slice_for_seed(&self.user.username),
            Self::arweave_storage_address_for_seed(&self.user.arweave_storage_address),
            bump_vec
        ];
        seeds
    }
*/
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct UserInner {
    pub user_wallet: Pubkey,
    pub username: Vec<u8>,
    pub bump: u8,
    
    pub max_score: u64,
    pub saved_game_sessions: u64,
    pub token_account: Pubkey,
    pub arweave_storage_address: Vec<u8>, 
//    pub has_active_game_session: bool,
    pub game_session: Option<Pubkey>,
} 

impl UserInner {
    const MAX_USERNAME_LEN: usize = 80;
    // Arweave Wallet addresses are 43 characters long and can contain any alphanumeric characters, 
    // as wall as dashes and underscores (a-z0–9-_).
    const MAX_ARWEAVE_LEN: usize = 43;

    const MAX_USERNAME_LEN_FOR_SEED: usize = 20;
    const MAX_ARWEAVE_LEN_FOR_SEED: usize = 20;
    
    pub(crate) fn size_for_init(username_len: usize, arweave_storage_address_len: usize) -> usize {
        use std::mem::size_of;

        size_of::<Pubkey>()
        // borsh serializes strings as: repr(s.len() as u32) repr(s as Vec<u8>) 
        + size_of::<u32>() + username_len 
        + size_of::<u8>()
        + size_of::<u64>()
        + size_of::<u64>()
        + size_of::<Pubkey>()
        + size_of::<u32>() + arweave_storage_address_len
        + (1)
    }    

    fn size_for_borsh(&self) -> u16 {
        if self.game_session.is_none() {
            Self::size_for_init(self.username.len(), self.arweave_storage_address.len()) as u16
        } else {
            (Self::size_for_init(
                self.username.len(), 
                self.arweave_storage_address.len()
            ) + std::mem::size_of::<Pubkey>()) as u16
        }
    }    
}

#[derive(Accounts)]
#[instruction(username: String, user_account_bump: u8, arweave_storage_address: String)]
pub struct SignUpUser<'info> {

    #[account(init, 
        constraint = username.len() < UserInner::MAX_USERNAME_LEN,
        payer = user_wallet, 
        space = User::size_for_init(),
        seeds = [
            b"user_account".as_ref(), 
            User::username_slice_for_seed(username.as_bytes()),
            User::arweave_storage_address_for_seed(arweave_storage_address.as_bytes()),
        ],
        bump,
    )]
    user_account: Account<'info, User>,

    stakan_state_account: Account<'info, StakanGlobalState>,
    
    #[account(mut)]
    user_wallet: Signer<'info>,

    #[account(
        constraint = mint.key() == stakan_state_account.mint_token,
    )]
    mint: Account<'info, Mint>,  

    #[account(init, payer = user_wallet,
        associated_token::mint = mint,
        associated_token::authority = user_account,
    )]  
    token_account: Account<'info, TokenAccount>,

    associated_token_program: Program<'info, AssociatedToken>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SignOutUser<'info> {
    stakan_state_account: Account<'info, StakanGlobalState>,

    #[account(mut, 
        close = user_wallet,
//        constraint = user_account.user.has_active_game_session == false,
        constraint = user_account.user.game_session == None,
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

 /*   #[account(mut)]
    program_wallet: Signer<'info>,
    */

    /// CHECK:` PDA account used as a program wallet for receiving lamports 
    /// when a user purchases tokens
    #[account(mut,
        constraint = stakan_state_account.escrow_account == stakan_escrow_account.key(),
    )]
    stakan_escrow_account: AccountInfo<'info>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}


pub fn sign_up(ctx: Context<SignUpUser>,
    username: String, 
    user_account_bump: u8,
    arweave_storage_address: String,
) -> Result<()> {
    if UserInner::MAX_USERNAME_LEN < username.len() {
        return Err(StakanError::UsernameTooLong.into())
    }
    
    let user_account = &mut ctx.accounts.user_account;
    
    user_account.user = UserInner {
        user_wallet: ctx.accounts.user_wallet.key(),
        username: username.into_bytes(),   
        bump: user_account_bump,      
        max_score: 0,
        saved_game_sessions: 0,
//                mint: ctx.accounts.stakan_state_account.mint_token.key(),
        token_account: ctx.accounts.token_account.key(),
        arweave_storage_address: arweave_storage_address.into_bytes(),
        game_session: None,
    };

    user_account.inner_size = user_account.user.size_for_borsh() as u16;
    
    Ok(())
}

pub fn sign_out(ctx: Context<SignOutUser>, 
    //user_account_bump: u8
) -> Result<()> {
    let token_amount = ctx.accounts.user_token_account.amount;
    let temp_bump: [u8; 1] = ctx.accounts.user_account.user.bump.to_le_bytes();
//    let temp_bump: [u8; 1] = user_account_bump.to_le_bytes();
    let signer_seeds = [
        b"user_account".as_ref(),
        User::username_slice_for_seed(ctx.accounts.user_account.user.username.as_ref()),
        User::arweave_storage_address_for_seed(ctx.accounts.user_account.user.arweave_storage_address.as_ref()),
        
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
        token_amount
    )?;
    // give lamports back to user
    let escrow_account = &mut ctx.accounts.stakan_escrow_account;
    let lamports_delta = token_amount * crate::transactions::tokens::PurchaseTokens::LAMPORTS_PER_STAKAN_TOKEN;
    let escrow_balance_after = escrow_account.lamports()
        .checked_sub(lamports_delta)
        .ok_or(crate::errors::StakanError::NegativeBalance)?;

    if !ctx.accounts.rent.is_exempt(escrow_balance_after, escrow_account.data_len()) {
        // should never happen
        return Err(crate::errors::StakanError::GlobalEscrowAccountDepleted.into());
    }    

    **escrow_account.lamports.borrow_mut() = escrow_balance_after;
    **ctx.accounts.user_wallet.lamports.borrow_mut() =
        ctx.accounts.user_wallet.lamports()
            .checked_add(lamports_delta)
            .ok_or(crate::errors::StakanError::BalanceOverflow)?;

/*
    solana_program::program::invoke(
        &solana_program::system_instruction::transfer(
            ctx.accounts.program_wallet.key, 
            ctx.accounts.user_wallet.key, 
            token_amount * crate::transactions::tokens::PurchaseTokens::LAMPORTS_PER_STAKAN_TOKEN),
        &[
            ctx.accounts.program_wallet.to_account_info(),
            ctx.accounts.user_wallet.to_account_info(),
            ctx.accounts.system_program.to_account_info()
        ],
    )?;
*/
    Ok(())
}