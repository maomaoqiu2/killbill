// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Kill Bill Game - A FHE-based blockchain game (Fixed underflow)
/// @author Based on fhevm-hardhat-template
/// @notice A game where players attack Bill 3 times with random damage, then verify if Bill is defeated
/// @dev Fixed: Prevents underflow when damage exceeds remaining health
contract KillBillGame is SepoliaConfig {
    /// @notice Game state for each player
    struct GameSession {
        euint32 billHealth;      // Bill's encrypted health
        uint8 attackCount;       // Number of attacks performed (0-3)
        bool gameActive;         // Whether game is active
        bool billDefeated;       // Whether Bill was defeated in this session
        uint32 totalDamage;      // Track total damage dealt (for verification)
    }

    /// @notice Mapping from player address to their game session
    mapping(address => GameSession) public gameSessions;
    
    /// @notice Total number of times Bill has been defeated across all players
    uint256 public totalDefeats;
    
    /// @notice Initial health for Bill (public constant)
    uint32 public constant INITIAL_HEALTH = 1000;
    
    /// @notice Maximum damage per attack
    uint32 public constant MAX_DAMAGE = 500;
    
    /// @notice Minimum damage per attack
    uint32 public constant MIN_DAMAGE = 200;

    /// @notice Events
    event GameStarted(address indexed player, uint32 initialHealth);
    event AttackPerformed(address indexed player, uint8 attackNumber, uint32 damage);
    event GameVerified(address indexed player, bool billDefeated, uint256 totalDefeats);

    /// @notice Initializes a new game session for the caller
    /// @dev Creates a new game with encrypted initial health
    function initializeGame() external {
        require(!gameSessions[msg.sender].gameActive, "Game already active");
        
        // Create encrypted health value
        euint32 encryptedHealth = FHE.asEuint32(INITIAL_HEALTH);
        
        // Initialize game session
        gameSessions[msg.sender] = GameSession({
            billHealth: encryptedHealth,
            attackCount: 0,
            gameActive: true,
            billDefeated: false,
            totalDamage: 0
        });
        
        // Set permissions
        FHE.allowThis(encryptedHealth);
        FHE.allow(encryptedHealth, msg.sender);
        
        emit GameStarted(msg.sender, INITIAL_HEALTH);
    }

    /// @notice Performs an attack on Bill with random damage
    /// @dev Generates pseudo-random damage and subtracts from Bill's health
    /// @dev FIXED: Prevents underflow by checking if health >= damage before subtraction
    /// @return damage The amount of damage dealt
    function attackBill() external returns (uint32 damage) {
        GameSession storage session = gameSessions[msg.sender];
        
        require(session.gameActive, "No active game");
        require(session.attackCount < 3, "All attacks used");
        
        // Generate pseudo-random damage between MIN_DAMAGE and MAX_DAMAGE
        damage = _generateRandomDamage();
        
        // Track total damage
        session.totalDamage += damage;
        
        // Convert damage to encrypted value
        euint32 encryptedDamage = FHE.asEuint32(damage);
        
        // ========== FIX: Prevent underflow ==========
        // Check if current health >= damage
        ebool healthGreaterOrEqual = FHE.ge(session.billHealth, encryptedDamage);
        
        // Calculate new health (might underflow if health < damage)
        euint32 healthAfterDamage = FHE.sub(session.billHealth, encryptedDamage);
        
        // Create encrypted zero
        euint32 zero = FHE.asEuint32(0);
        
        // Use FHE.select to choose:
        // - If health >= damage: use the subtraction result
        // - If health < damage: set health to 0
        session.billHealth = FHE.select(
            healthGreaterOrEqual,
            healthAfterDamage,
            zero
        );
        // ============================================
        
        // Increment attack count
        session.attackCount++;
        
        // Update permissions
        FHE.allowThis(session.billHealth);
        FHE.allow(session.billHealth, msg.sender);
        
        emit AttackPerformed(msg.sender, session.attackCount, damage);
        
        return damage;
    }

    /// @notice Verifies if Bill has been defeated (health <= 0)
    /// @dev Can only be called after all 3 attacks are used
    /// @dev Uses totalDamage to determine defeat since FHE.decrypt is not available in contracts
    /// @return billDefeated Whether Bill was defeated
    function verifyDefeat() external returns (bool billDefeated) {
        GameSession storage session = gameSessions[msg.sender];
        
        require(session.gameActive, "No active game");
        require(session.attackCount == 3, "Must complete all 3 attacks first");
        
        // Use totalDamage to determine if Bill is defeated
        // If totalDamage >= INITIAL_HEALTH, Bill is defeated
        billDefeated = session.totalDamage >= INITIAL_HEALTH;
        
        // Update game state
        session.gameActive = false;
        session.billDefeated = billDefeated;
        
        // If defeated, increment total defeats counter
        if (billDefeated) {
            totalDefeats++;
        }
        
        emit GameVerified(msg.sender, billDefeated, totalDefeats);
        
        return billDefeated;
    }

    /// @notice Decrypts and returns the actual health value (for testing/verification)
    /// @dev This should only be called after the game is complete in production
    /// @return The decrypted health value
    function decryptHealth() external view returns (uint32) {
        GameSession storage session = gameSessions[msg.sender];
        require(!session.gameActive, "Game still active");
        
        // Calculate remaining health based on total damage
        // With the underflow fix, this calculation is now accurate
        if (session.totalDamage >= INITIAL_HEALTH) {
            return 0;
        }
        return INITIAL_HEALTH - session.totalDamage;
    }

    /// @notice Gets the current game session info for a player
    /// @param player The player's address
    /// @return attackCount Number of attacks performed
    /// @return gameActive Whether game is active
    /// @return billDefeated Whether Bill was defeated
    /// @return totalDamage Total damage dealt
    function getGameSession(address player) 
        external 
        view 
        returns (
            uint8 attackCount,
            bool gameActive,
            bool billDefeated,
            uint32 totalDamage
        ) 
    {
        GameSession storage session = gameSessions[player];
        return (
            session.attackCount,
            session.gameActive,
            session.billDefeated,
            session.totalDamage
        );
    }

    /// @notice Gets the encrypted health value for a player's game
    /// @dev Returns the encrypted health handle, or zero hash if no active game
    /// @return The encrypted health value
    function getBillHealth() external view returns (euint32) {
        GameSession storage session = gameSessions[msg.sender];
        
        // Return the health handle even if game is not active
        // This allows frontend to decrypt after game ends
        return session.billHealth;
    }

    /// @notice Generates pseudo-random damage value
    /// @dev Uses block data for randomness (not secure for production, but ok for game)
    /// @return Random damage value between MIN_DAMAGE and MAX_DAMAGE
    function _generateRandomDamage() private view returns (uint32) {
        uint256 randomHash = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    gameSessions[msg.sender].attackCount
                )
            )
        );
        
        uint32 range = MAX_DAMAGE - MIN_DAMAGE + 1;
        return MIN_DAMAGE + uint32(randomHash % range);
    }

    /// @notice Resets a player's game (for testing purposes)
    /// @dev Allows a player to start a new game after finishing one
    function resetGame() external {
        require(!gameSessions[msg.sender].gameActive, "Game still active");
        delete gameSessions[msg.sender];
    }
}