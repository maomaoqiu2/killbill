
/*
  This file is auto-generated.
  By commands: 'npx hardhat deploy' or 'npx hardhat node'
*/
export const KillBillGameABI = {
  "abi": [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "attackNumber",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "damage",
          "type": "uint32"
        }
      ],
      "name": "AttackPerformed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint32",
          "name": "initialHealth",
          "type": "uint32"
        }
      ],
      "name": "GameStarted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "player",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "billDefeated",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "totalDefeats",
          "type": "uint256"
        }
      ],
      "name": "GameVerified",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "INITIAL_HEALTH",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_DAMAGE",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MIN_DAMAGE",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "attackBill",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "damage",
          "type": "uint32"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decryptHealth",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "gameSessions",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "billHealth",
          "type": "bytes32"
        },
        {
          "internalType": "uint8",
          "name": "attackCount",
          "type": "uint8"
        },
        {
          "internalType": "bool",
          "name": "gameActive",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "billDefeated",
          "type": "bool"
        },
        {
          "internalType": "uint32",
          "name": "totalDamage",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getBillHealth",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "player",
          "type": "address"
        }
      ],
      "name": "getGameSession",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "attackCount",
          "type": "uint8"
        },
        {
          "internalType": "bool",
          "name": "gameActive",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "billDefeated",
          "type": "bool"
        },
        {
          "internalType": "uint32",
          "name": "totalDamage",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "initializeGame",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "resetGame",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalDefeats",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "verifyDefeat",
      "outputs": [
        {
          "internalType": "bool",
          "name": "billDefeated",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
} as const;

