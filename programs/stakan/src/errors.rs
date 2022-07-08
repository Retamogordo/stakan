use anchor_lang::prelude::*;

#[error_code]
pub enum StakanError {
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

    #[msg("Stakan Escrow Account Depleted - should not happen - bug.")]
    GlobalEscrowAccountDepleted,

    #[msg("Negative balance")]
    NegativeBalance,

    #[msg("Balance overflow")]
    BalanceOverflow,

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

    #[msg("Should sell all tokens in separate transaction prior to signing out")]
    ShouldSellTokensBeforeSigningOut
}
