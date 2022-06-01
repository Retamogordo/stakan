use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint, transfer, TokenAccount};
use anchor_spl::associated_token::{AssociatedToken, };

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

    #[msg("Insufficient tokens on account, can't stake.")]
    InsufficientTokensOnAccount,

    #[msg("Stake is higher than fund can accept.")]
    StakeTooHigh,

    #[msg("Invalid value of game session duration.")]
    InvalidDuration,

//    #[msg("Username too long. Max allowed length: {}", SignUpUser::USERNAME_LEN)]
    #[msg("Username too long")]
    UsernameTooLong,

    #[msg("Score can't decrease")]
    ScoreCantDecrease,

    #[msg("Duration can't decrease")]
    DurationCantDecrease,

}


#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub enum GameSessionStage {
    Ongoing,
    Over
}

#[derive(Accounts)]
pub struct SetupStakan<'info> {

    #[account(init, payer = program_wallet, space = 8 + 100,
        seeds = [
            b"stakan_state_account".as_ref(), 
//            User::username_slice_for_seed(username.as_bytes()),
//            User::arweave_storage_address_for_seed(arweave_storage_address.as_bytes()),
        ],
        bump,
    )]
    stakan_state_account: Account<'info, StakanGlobalState>,

//    #[account(init, payer = program_wallet, space = 8+1000)]
//    #[account(init, payer = program_wallet, space = 8+32+8+1+1+32)]
    mint: Account<'info, Mint>,  

    #[account(init, payer = program_wallet,
        seeds = [
            b"associated_token_account".as_ref(), 
        ],
        bump,
        token::mint = mint,
        token::authority = stakan_state_account,
//        token::authority = program_wallet,
    )]  
    associated_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    program_wallet: Signer<'info>,

    associated_token_program: Program<'info, AssociatedToken>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(username: String, arweave_storage_address: String)]
pub struct SignUpUser<'info> {
    stakan_state_account: Account<'info, StakanGlobalState>,

    #[account(init, payer = user_wallet, space = 8 + 500,
        seeds = [
            b"user_account".as_ref(), 
            User::username_slice_for_seed(username.as_bytes()),
            User::arweave_storage_address_for_seed(arweave_storage_address.as_bytes()),
        ],
        bump,
    )]
    user_account: Account<'info, User>,
    
    #[account(mut)]
    user_wallet: Signer<'info>,

    #[account(
        constraint = mint.key() == stakan_state_account.mint_token,
    )]
    mint: Account<'info, Mint>,  

    #[account(
        init, 
        payer = user_wallet,
        seeds = [
            b"user_token_account".as_ref(),
//            SignUpUser::username_slice_for_seed(username.as_str()),
            User::username_slice_for_seed(username.as_bytes()),
        ],
        bump,
        token::mint = mint,
        token::authority = user_account,
    )]
    token_account: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct PurchaseTokens<'info> {
    stakan_state_account: Account<'info, StakanGlobalState>,

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

    #[account(mut,
        constraint = program_token_account.key() == stakan_state_account.token_account,
        constraint = program_token_account.owner == stakan_state_account.key(),
    )]
    program_token_account: Account<'info, TokenAccount>,

    /// CHECK:` pubkey of programs wallet to receive lamports from user wallet
    #[account(mut)]
    program_wallet: AccountInfo<'info>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitGameSession<'info> {
    stakan_state_account: Account<'info, StakanGlobalState>,

    #[account(
        constraint = user_account.user.user_wallet == user_wallet.key(),
    )]
    user_account: Account<'info, User>,

    #[account(mut,
        constraint = user_token_account.mint == stakan_state_account.mint_token,
        constraint = user_token_account.owner == user_account.key(),
    )]
    user_token_account: Account<'info, TokenAccount>,

    #[account(mut,
        constraint = program_token_account.key() == stakan_state_account.token_account,
        constraint = program_token_account.owner == stakan_state_account.key(),
    )]
    program_token_account: Account<'info, TokenAccount>,

    #[account(
        init, space = 8 + 100,
        payer = user_wallet,
        seeds = [
            b"game_session_account".as_ref(),
//            SignUpUser::username_slice_for_seed(username.as_str()),
//            SignUpUser::username_slice_for_seed(username.as_bytes()),
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
pub struct UpdateGameSession<'info> {
    user_account: Account<'info, User>,

    #[account(mut,
        constraint = game_session_account.user_account == user_account.key()
    )]
    game_session_account: Account<'info, GameSession>,

    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinishGameSession<'info> {
    stakan_state_account: Account<'info, StakanGlobalState>,

    #[account(
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
    program_token_account: Account<'info, TokenAccount>,

    /// CHECK:` user wallet receiving fee back upon game_session_account closing
    #[account(mut)]
    user_wallet: UncheckedAccount<'info>,

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}
/*
#[derive(Accounts)]
#[instruction(pda_game_session_account_bump: u8)]
pub struct InitGameSession<'info> {

    #[account(init, payer = user_wallet, 
        space = InitGameSession::SIZE,
        seeds = [b"game_session", user_wallet.key().as_ref()],
        bump,
    )]
    game_session_account: Account<'info, GameSession>,

    #[account(mut)]
    user: Signer<'info>,
    
    #[account(
        mut,
        constraint=user_wallet.owner == user.key(),
        constraint=user_wallet.mint == stake_mint.key()
    )]
    user_wallet: Account<'info, TokenAccount>,

    #[account(
        init, 
        payer = user_wallet,
        seeds = [b"stake_wallet", user_wallet.key().as_ref()],
        bump,
        token::mint = stake_mint,
        token::authority = game_session_account,
    )]
    stake_wallet: Account<'info, TokenAccount>,

    #[account(mut)]
    game_global_account: Account<'info, GameGlobalState>,

    stake_mint: Account<'info, Mint>,  

    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}


impl InitGameSession<'_> {
    const SIZE: usize = 8 + 1000;
}
*/
#[account]
pub struct GameSession {
    user_account: Pubkey,
    score: u64,
    duration_millis: u64,
    stake: u64,
} 

#[account]
//#[derive(agsol_borsh_schema::BorshSchema)]
pub struct User {
    inner_size: u16,
    user: UserInner,    
} 

impl User {
    const USERNAME_LEN: usize = 120;
    const MAX_USERNAME_LEN_FOR_SEED: usize = 20;
    const MAX_ARWEAVE_LEN_FOR_SEED: usize = 20;

    fn username_slice_for_seed(username: &[u8]) -> &[u8] {
        let len = if Self::MAX_USERNAME_LEN_FOR_SEED > username.len() {
            username.len()
        } else { Self::MAX_USERNAME_LEN_FOR_SEED };

        &username[..len]
    }

    fn arweave_storage_address_for_seed(arweave_storage_address: &[u8]) -> &[u8] {
        let len = if Self::MAX_ARWEAVE_LEN_FOR_SEED > arweave_storage_address.len() {
            arweave_storage_address.len()
        } else { Self::MAX_ARWEAVE_LEN_FOR_SEED };

        &arweave_storage_address[..len]
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
    username: Vec<u8>,
    
    max_score: u64,
    saved_game_sessions: u64,
    user_wallet: Pubkey,
    mint: Pubkey,
    token_account: Pubkey,
    arweave_storage_address: Vec<u8>, 

} 

impl UserInner {
    pub(crate) fn size_for_borsh(&self) -> u16 {
        use std::mem::size_of;

        (
            // borsh serializes strings as: repr(s.len() as u32) repr(s as Vec<u8>) 
            size_of::<u32>() + self.username.len() 
            + size_of::<u64>()
            + size_of::<u64>()
            + size_of::<Pubkey>()
            + size_of::<Pubkey>()
            + size_of::<Pubkey>()
            + size_of::<u32>() + self.arweave_storage_address.len() 
        ) as u16
    }    
}

#[account]
pub struct StakanGlobalState {
    global_max_score: u64,
    funds: u64,
    mint_token: Pubkey,
    token_account: Pubkey,
} 

declare_id!("StakanXf8bymj5JEgJYH4qUQ7xTtoR1W2BeHUbDjCJb");

#[program]
pub mod stakan {
    use super::*;
    pub fn set_up_stakan(ctx: Context<SetupStakan>
    ) -> Result<()> {
        let acc = &mut ctx.accounts.stakan_state_account;

        acc.mint_token = ctx.accounts.mint.key();
        acc.token_account = ctx.accounts.associated_token_account.key();
        acc.global_max_score = 0;
        acc.funds = 0;
        Ok(())
    }
    
    pub fn set_up_stakan_new(ctx: Context<SetupStakan>, associated_token_account_bump: u8,
    ) -> Result<()> {
//        spl_token::state::Account;
//        let space = ExtensionType::get_account_len::<TokenAccount>(&[]);
        let space = 8+500;
        let owner = &ctx.accounts.program_wallet.key();
/*
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),

            anchor_lang::system_program::CreateAccount {
                from: ctx.accounts.program_wallet.to_account_info(),
                to: ctx.accounts.associated_token_account.to_account_info(),
            }
        );

        anchor_lang::system_program::create_account(
            cpi_ctx,
            ctx.accounts.rent.minimum_balance(space), 
            space as u64, 
            owner)?;
*/
/*
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),

            anchor_spl::token::InitializeMint {
                mint: ctx.accounts.mint.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            }
        );        
        let decimals = 0;
        let authority = ctx.accounts.program_wallet.key();
        let freeze_authority = None; // ctx.accounts.program_wallet.key();

        anchor_spl::token::initialize_mint(cpi_ctx, decimals, &authority, freeze_authority)?;
*/        
//        anchor_spl::associated_token::get_associated_token_address(wallet_address: &Pubkey, spl_token_mint_address: &Pubkey)
        let temp_bump: [u8; 1] = associated_token_account_bump.to_le_bytes();
        let signer_seeds = [
            b"associated_token_account".as_ref(),
//            User::username_slice_for_seed(&username[..]),
//            User::arweave_storage_address_for_seed(&arweave_storage_address[..]),
            &temp_bump
        ];
       
        anchor_spl::associated_token::create(
            CpiContext::new_with_signer(
                ctx.accounts.associated_token_program.to_account_info(),

                anchor_spl::associated_token::Create {
                    payer: ctx.accounts.program_wallet.to_account_info(),
                    associated_token: ctx.accounts.associated_token_account.to_account_info(),
                    authority: ctx.accounts.program_wallet.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    token_program: ctx.accounts.associated_token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                &[&signer_seeds]
            )
        )?;        
        
/*
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),

            anchor_spl::token::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.associated_token_account.to_account_info(),
                authority: ctx.accounts.program_wallet.to_account_info(),
            }
        );        
        anchor_spl::token::mint_to(
            cpi_ctx, 
            1000)?;
            */
        Ok(())
    }

    pub fn sign_up_user(ctx: Context<SignUpUser>,
        username: String, 
        arweave_storage_address: String,
    ) -> Result<()> {
            if User::USERNAME_LEN < username.len() {
                return Err(GameError::UsernameTooLong.into())
            }
            
            let user_account = &mut ctx.accounts.user_account;
            
            user_account.user = UserInner {
                username: username.into_bytes(),          
                max_score: 0,
                saved_game_sessions: 0,
                user_wallet: ctx.accounts.user_wallet.key(),
                mint: ctx.accounts.stakan_state_account.mint_token.key(),
                token_account: ctx.accounts.token_account.key(),
                arweave_storage_address: arweave_storage_address.into_bytes(),
            };

            user_account.inner_size = user_account.user.size_for_borsh() as u16;
            
            Ok(())
    }

    pub fn purchase_tokens(ctx: Context<PurchaseTokens>,
        stakan_state_account_bump: u8,
        token_amount: u64, 
    ) -> Result<()> {
//        solana_program::
        solana_program::program::invoke(
            &solana_program::system_instruction::transfer(
                ctx.accounts.user_wallet.key, 
                ctx.accounts.program_wallet.key, 
                token_amount * 1000000),
            &[
                ctx.accounts.user_wallet.to_account_info(),
                ctx.accounts.program_wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info()
            ],
        )?;

        let temp_bump: [u8; 1] = stakan_state_account_bump.to_le_bytes();

        let signer_seeds = [
            b"stakan_state_account".as_ref(),
            &temp_bump
        ];        

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),

                anchor_spl::token::Transfer {
                    from: ctx
                        .accounts
                        .program_token_account
                        .to_account_info(),
                    to: ctx
                        .accounts
                        .user_token_account
                        .to_account_info(),
//                        authority: ctx.accounts.program_wallet.to_account_info(),
                    authority: ctx.accounts.stakan_state_account.to_account_info(),
                },
                &[&signer_seeds]
            ),
            token_amount,
        )?;

        Ok(())
    }

    pub fn init_game_session(ctx: Context<InitGameSession>,
//        arweave_storage_address: String, 
        stake: u64,
        bump: u8,
    ) -> Result<()> {
    
        let username = &ctx.accounts.user_account.user.username;
        let arweave_storage_address = &ctx.accounts.user_account.user.arweave_storage_address;
        let program_tokens_funds = ctx.accounts.program_token_account.amount;

        if ctx.accounts.user_token_account.amount < stake {
            return Err(GameError::InsufficientTokensOnAccount.into());
        }
        // reward is funds/2, so stake should be smaller than funds 
        // in order the reward to be greater than stake in case the user is rewarded 
        if program_tokens_funds <= stake {
            return Err(GameError::StakeTooHigh.into());
        }

/*
        if stake > 0 { 
            let temp_bump: [u8; 1] = bump.to_le_bytes();
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
                        to: ctx.accounts.program_token_account.to_account_info(),
                        authority: ctx.accounts.user_account.to_account_info(),
                    },
                    &[&signer_seeds]
                ),
                stake,
            )?;
        }
*/
        let game_session_account = &mut ctx.accounts.game_session_account;
        
        game_session_account.user_account = ctx.accounts.user_account.key();
        game_session_account.stake = stake;
        game_session_account.duration_millis = 0;
        game_session_account.score = 0;

        Ok(())
    }

    pub fn finish_game_session(ctx: Context<FinishGameSession>,
        // just to ensure arweave has confirmed storage transaction
        _dummy_arweave_storage_tx_id: Option<String>, 
        bump: u8,
        program_token_account_bump: u8,
    ) -> Result<()> {
        let global_max_score = ctx.accounts.stakan_state_account.global_max_score;
        let game_session_score = ctx.accounts.game_session_account.score;
        let stake = ctx.accounts.game_session_account.stake;
        let username = &ctx.accounts.user_account.user.username;
        let arweave_storage_address = &ctx.accounts.user_account.user.arweave_storage_address;
        let record_hit = game_session_score > global_max_score;

        if record_hit {
            ctx.accounts.stakan_state_account.global_max_score = game_session_score;
        }

        if stake > 0 {   
            if record_hit {
                let funds_div_2 = ctx.accounts.program_token_account.amount / 2;
                
                if funds_div_2 > stake {
                    let reward = funds_div_2 - stake;
                    let temp_bump: [u8; 1] = program_token_account_bump.to_le_bytes();
        //            let signer_seeds 
        //                = ctx.accounts.user_account.compose_user_account_seeds_with_bump(&temp_bump);          
                    let signer_seeds = [
                        b"stakan_state_account".as_ref(),
                        &temp_bump
                    ];

                    anchor_spl::token::transfer(
                        CpiContext::new_with_signer(
                            ctx.accounts.token_program.to_account_info(),
        
                            anchor_spl::token::Transfer {
                                from: ctx.accounts.program_token_account.to_account_info(),                       
                                to: ctx.accounts.user_token_account.to_account_info(),
                                authority: ctx.accounts.stakan_state_account.to_account_info(),
                            },
                            &[&signer_seeds]
                        ),
                        reward,
                        )?;
                } else { 
                    return Ok(()) 
                };
            } else {
                let temp_bump: [u8; 1] = bump.to_le_bytes();
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
                            to: ctx.accounts.program_token_account.to_account_info(),
                            authority: ctx.accounts.user_account.to_account_info(),
                        },
                        &[&signer_seeds]
                    ),
                    stake,
                )?;
            }
//            if stake > ctx.accounts.program_token_account
//            ctx.accounts.program_token_account.reload()?;
            
//            let funds = ctx.accounts.program_token_account.amount; 
        }

        Ok(())
    }

    pub fn update_game_session(ctx: Context<UpdateGameSession>,
        score: u64,
        duration_millis: u64,
    ) -> Result<()> {

        if ctx.accounts.game_session_account.score >= score {
            return Err(GameError::ScoreCantDecrease.into());
        }
        if ctx.accounts.game_session_account.duration_millis >= duration_millis {
            return Err(GameError::DurationCantDecrease.into());
        }
        ctx.accounts.game_session_account.score = score;
        ctx.accounts.game_session_account.duration_millis = duration_millis;

        Ok(())
    }

        /*
    pub fn init_game_session(ctx: Context<InitGameSession>,
        arweave_storage_address: String, 
//        bump: u8,
        stake: u64) -> Result<()> {
        // reward is funds/2, so stake should be smaller than funds 
        // in order the reward is greater than stake in case the user is rewarded 
        if ctx.accounts.game_global_account.funds <= stake {
            return Err(GameError::StakeTooHigh.into())
        }
        ctx.accounts.game_session_account.user_wallet = ctx.accounts.user_wallet.key();
        ctx.accounts.game_session_account.stake_wallet = ctx.accounts.stake_wallet.key();
        ctx.accounts.game_session_account.stake_mint = ctx.accounts.stake_mint.key();

        ctx.accounts.game_session_account.stake = stake;
        ctx.accounts.game_session_account.arweave_storage_address = arweave_storage_address;
        ctx.accounts.game_session_account.duration_millis = 0;
        ctx.accounts.game_session_account.score = 0;
        ctx.accounts.game_session_account.stage = GameSessionStage::Ongoing;

        if stake > 0 {
            match
                anchor_spl::token::transfer(
                    CpiContext::new(
 //                       ctx.accounts.system_program.to_account_info(),
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: ctx
                                .accounts
                                .user_wallet
                                .to_account_info(),
                            to: ctx
                                .accounts
                                .stake_wallet
                                .to_account_info(),
                            authority: ctx.accounts.user.to_account_info(),
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
    }
*/

}



