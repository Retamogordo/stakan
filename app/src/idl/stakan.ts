export type Stakan = {
  "version": "0.1.0",
  "name": "stakan",
  "instructions": [
    {
      "name": "setUpStakan",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardFundsAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "programWallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "stakanStateAccountBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "signUpUser",
      "accounts": [
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakanStateAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "username",
          "type": "string"
        },
        {
          "name": "userAccountBump",
          "type": "u8"
        },
        {
          "name": "arweaveStorageAddress",
          "type": "string"
        }
      ]
    },
    {
      "name": "purchaseTokens",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakanEscrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tokenAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sellTokens",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakanEscrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardFundsAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "userAccountBump",
          "type": "u8"
        },
        {
          "name": "tokenAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initGameSession",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardFundsAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameSessionAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "stake",
          "type": "u64"
        },
        {
          "name": "tilesCols",
          "type": "u8"
        },
        {
          "name": "tilesRows",
          "type": "u8"
        }
      ]
    },
    {
      "name": "updateGameSession",
      "accounts": [
        {
          "name": "userAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSessionAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "score",
          "type": "u64"
        },
        {
          "name": "durationMillis",
          "type": "u64"
        },
        {
          "name": "tiles",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "finishGameSession",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameSessionAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardFundsAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "dummyArweaveStorageTxId",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "userAccountBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "signOutUser",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardFundsAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakanEscrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "forceDeleteUser",
      "accounts": [
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "gameSession",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "userAccount",
            "type": "publicKey"
          },
          {
            "name": "score",
            "type": "u64"
          },
          {
            "name": "durationMillis",
            "type": "u64"
          },
          {
            "name": "stake",
            "type": "u64"
          },
          {
            "name": "tilesCols",
            "type": "u8"
          },
          {
            "name": "tilesRows",
            "type": "u8"
          },
          {
            "name": "tiles",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "user",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "innerSize",
            "type": "u16"
          },
          {
            "name": "user",
            "type": {
              "defined": "UserInner"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "UserInner",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "userWallet",
            "type": "publicKey"
          },
          {
            "name": "username",
            "type": "bytes"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "maxScore",
            "type": "u64"
          },
          {
            "name": "savedGameSessions",
            "type": "u64"
          },
          {
            "name": "tokenAccount",
            "type": "publicKey"
          },
          {
            "name": "arweaveStorageAddress",
            "type": "bytes"
          },
          {
            "name": "gameSession",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "GlobalFundsTooLow",
      "msg": "Initialize global wallet with more funds."
    },
    {
      "code": 6001,
      "name": "InvalidGlobalStateKey",
      "msg": "Invalid Game Global Account public key."
    },
    {
      "code": 6002,
      "name": "CouldNotTransferStake",
      "msg": "Could not transfer stake to Global Account."
    },
    {
      "code": 6003,
      "name": "CouldNotTransferReward",
      "msg": "Could not transfer reward from Global Account."
    },
    {
      "code": 6004,
      "name": "InsufficientTokensOnAccount",
      "msg": "Insufficient tokens on account, can't stake."
    },
    {
      "code": 6005,
      "name": "GlobalEscrowAccountDepleted",
      "msg": "Stakan Escrow Account Depleted - should not happen - bug."
    },
    {
      "code": 6006,
      "name": "NegativeBalance",
      "msg": "Negative balance"
    },
    {
      "code": 6007,
      "name": "BalanceOverflow",
      "msg": "Balance overflow"
    },
    {
      "code": 6008,
      "name": "StakeTooHigh",
      "msg": "Stake is higher than fund can accept."
    },
    {
      "code": 6009,
      "name": "InvalidDuration",
      "msg": "Invalid value of game session duration."
    },
    {
      "code": 6010,
      "name": "UsernameTooLong",
      "msg": "Username too long"
    },
    {
      "code": 6011,
      "name": "ScoreCantDecrease",
      "msg": "Score can't decrease"
    },
    {
      "code": 6012,
      "name": "DurationCantDecrease",
      "msg": "Duration can't decrease"
    }
  ]
};

export const IDL: Stakan = {
  "version": "0.1.0",
  "name": "stakan",
  "instructions": [
    {
      "name": "setUpStakan",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardFundsAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "programWallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "stakanStateAccountBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "signUpUser",
      "accounts": [
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakanStateAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "username",
          "type": "string"
        },
        {
          "name": "userAccountBump",
          "type": "u8"
        },
        {
          "name": "arweaveStorageAddress",
          "type": "string"
        }
      ]
    },
    {
      "name": "purchaseTokens",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakanEscrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "tokenAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sellTokens",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakanEscrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardFundsAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "userAccountBump",
          "type": "u8"
        },
        {
          "name": "tokenAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initGameSession",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardFundsAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameSessionAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "stake",
          "type": "u64"
        },
        {
          "name": "tilesCols",
          "type": "u8"
        },
        {
          "name": "tilesRows",
          "type": "u8"
        }
      ]
    },
    {
      "name": "updateGameSession",
      "accounts": [
        {
          "name": "userAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSessionAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "score",
          "type": "u64"
        },
        {
          "name": "durationMillis",
          "type": "u64"
        },
        {
          "name": "tiles",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "finishGameSession",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameSessionAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardFundsAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "dummyArweaveStorageTxId",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "userAccountBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "signOutUser",
      "accounts": [
        {
          "name": "stakanStateAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardFundsAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakanEscrowAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "forceDeleteUser",
      "accounts": [
        {
          "name": "userAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "gameSession",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "userAccount",
            "type": "publicKey"
          },
          {
            "name": "score",
            "type": "u64"
          },
          {
            "name": "durationMillis",
            "type": "u64"
          },
          {
            "name": "stake",
            "type": "u64"
          },
          {
            "name": "tilesCols",
            "type": "u8"
          },
          {
            "name": "tilesRows",
            "type": "u8"
          },
          {
            "name": "tiles",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "user",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "innerSize",
            "type": "u16"
          },
          {
            "name": "user",
            "type": {
              "defined": "UserInner"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "UserInner",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "userWallet",
            "type": "publicKey"
          },
          {
            "name": "username",
            "type": "bytes"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "maxScore",
            "type": "u64"
          },
          {
            "name": "savedGameSessions",
            "type": "u64"
          },
          {
            "name": "tokenAccount",
            "type": "publicKey"
          },
          {
            "name": "arweaveStorageAddress",
            "type": "bytes"
          },
          {
            "name": "gameSession",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "GlobalFundsTooLow",
      "msg": "Initialize global wallet with more funds."
    },
    {
      "code": 6001,
      "name": "InvalidGlobalStateKey",
      "msg": "Invalid Game Global Account public key."
    },
    {
      "code": 6002,
      "name": "CouldNotTransferStake",
      "msg": "Could not transfer stake to Global Account."
    },
    {
      "code": 6003,
      "name": "CouldNotTransferReward",
      "msg": "Could not transfer reward from Global Account."
    },
    {
      "code": 6004,
      "name": "InsufficientTokensOnAccount",
      "msg": "Insufficient tokens on account, can't stake."
    },
    {
      "code": 6005,
      "name": "GlobalEscrowAccountDepleted",
      "msg": "Stakan Escrow Account Depleted - should not happen - bug."
    },
    {
      "code": 6006,
      "name": "NegativeBalance",
      "msg": "Negative balance"
    },
    {
      "code": 6007,
      "name": "BalanceOverflow",
      "msg": "Balance overflow"
    },
    {
      "code": 6008,
      "name": "StakeTooHigh",
      "msg": "Stake is higher than fund can accept."
    },
    {
      "code": 6009,
      "name": "InvalidDuration",
      "msg": "Invalid value of game session duration."
    },
    {
      "code": 6010,
      "name": "UsernameTooLong",
      "msg": "Username too long"
    },
    {
      "code": 6011,
      "name": "ScoreCantDecrease",
      "msg": "Score can't decrease"
    },
    {
      "code": 6012,
      "name": "DurationCantDecrease",
      "msg": "Duration can't decrease"
    }
  ]
};
