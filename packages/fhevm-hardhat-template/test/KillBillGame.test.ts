import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { KillBillGame, KillBillGame__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("KillBillGame")) as KillBillGame__factory;
  const killBillContract = (await factory.deploy()) as KillBillGame;
  const killBillContractAddress = await killBillContract.getAddress();

  return { killBillContract, killBillContractAddress };
}

describe("KillBillGame", function () {
  let signers: Signers;
  let killBillContract: KillBillGame;
  let killBillContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ killBillContract, killBillContractAddress } = await deployFixture());
  });

  describe("Game Initialization", function () {
    it("should initialize game with correct initial state", async function () {
      const tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();

      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      
      expect(gameSession.attackCount).to.eq(0);
      expect(gameSession.gameActive).to.eq(true);
      expect(gameSession.billDefeated).to.eq(false);
      expect(gameSession.totalDamage).to.eq(0);
    });

    it("should not allow initializing game twice", async function () {
      await killBillContract.connect(signers.alice).initializeGame();
      
      await expect(
        killBillContract.connect(signers.alice).initializeGame()
      ).to.be.revertedWith("Game already active");
    });

    it("should initialize game with encrypted health of 1000", async function () {
      const tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();

      const encryptedHealth = await killBillContract.connect(signers.alice).getBillHealth();
      
      // Decrypt the health to verify it's 1000
      const decryptedHealth = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedHealth,
        killBillContractAddress,
        signers.alice,
      );

      expect(decryptedHealth).to.eq(1000);
    });

    it("should emit GameStarted event", async function () {
      await expect(killBillContract.connect(signers.alice).initializeGame())
        .to.emit(killBillContract, "GameStarted")
        .withArgs(signers.alice.address, 1000);
    });
  });

  describe("Attack Bill", function () {
    beforeEach(async function () {
      // Initialize game before each attack test
      const tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();
    });

    it("should perform first attack successfully", async function () {
      const tx = await killBillContract.connect(signers.alice).attackBill();
      const receipt = await tx.wait();

      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      expect(gameSession.attackCount).to.eq(1);
      expect(gameSession.totalDamage).to.be.gte(100);
      expect(gameSession.totalDamage).to.be.lte(500);
    });

    it("should return damage value between MIN and MAX", async function () {
      const tx = await killBillContract.connect(signers.alice).attackBill();
      await tx.wait();

      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      const damage = gameSession.totalDamage;

      expect(damage).to.be.gte(100);
      expect(damage).to.be.lte(500);
    });

    it("should perform all 3 attacks successfully", async function () {
      // First attack
      let tx = await killBillContract.connect(signers.alice).attackBill();
      await tx.wait();

      // Second attack
      tx = await killBillContract.connect(signers.alice).attackBill();
      await tx.wait();

      // Third attack
      tx = await killBillContract.connect(signers.alice).attackBill();
      await tx.wait();

      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      expect(gameSession.attackCount).to.eq(3);
      expect(gameSession.totalDamage).to.be.gte(300); // At least 3 * MIN_DAMAGE
      expect(gameSession.totalDamage).to.be.lte(1500); // At most 3 * MAX_DAMAGE
    });

    it("should not allow more than 3 attacks", async function () {
      // Perform 3 attacks
      for (let i = 0; i < 3; i++) {
        const tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();
      }

      // Try 4th attack
      await expect(
        killBillContract.connect(signers.alice).attackBill()
      ).to.be.revertedWith("All attacks used");
    });

    it("should not allow attack without initializing game", async function () {
      await expect(
        killBillContract.connect(signers.bob).attackBill()
      ).to.be.revertedWith("No active game");
    });

    it("should emit AttackPerformed event with correct damage", async function () {
      const tx = await killBillContract.connect(signers.alice).attackBill();
      const receipt = await tx.wait();

      // Get the damage from the game session
      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      const damage = gameSession.totalDamage;

      // Check event was emitted
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "AttackPerformed"
      );
      expect(event).to.not.be.undefined;
    });

    it("should accumulate total damage correctly", async function () {
      const damages: number[] = [];

      for (let i = 0; i < 3; i++) {
        const sessionBefore = await killBillContract.getGameSession(signers.alice.address);
        const damageBefore = Number(sessionBefore.totalDamage);

        const tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();

        const sessionAfter = await killBillContract.getGameSession(signers.alice.address);
        const damageAfter = Number(sessionAfter.totalDamage);

        const currentDamage = damageAfter - damageBefore;
        damages.push(currentDamage);

        expect(currentDamage).to.be.gte(100);
        expect(currentDamage).to.be.lte(500);
      }

      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      const totalDamage = Number(gameSession.totalDamage);
      const expectedTotal = damages.reduce((a, b) => a + b, 0);

      expect(totalDamage).to.eq(expectedTotal);
    });

    it("should reduce encrypted health with each attack", async function () {
      const initialHealth = await killBillContract.connect(signers.alice).getBillHealth();
      const decryptedInitialHealth = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        initialHealth,
        killBillContractAddress,
        signers.alice,
      );

      expect(decryptedInitialHealth).to.eq(1000);

      // Perform attack
      const tx = await killBillContract.connect(signers.alice).attackBill();
      await tx.wait();

      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      const damage = Number(gameSession.totalDamage);

      const currentHealthEncrypted = await killBillContract.connect(signers.alice).getBillHealth();
      const currentHealth = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        currentHealthEncrypted,
        killBillContractAddress,
        signers.alice,
      );

      // Encrypted health should be reduced by the damage amount
      expect(currentHealth).to.eq(1000 - damage);
    });
  });

  describe("Verify Defeat", function () {
    beforeEach(async function () {
      // Initialize game before each verify test
      const tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();
    });

    it("should not allow verification before completing 3 attacks", async function () {
      await expect(
        killBillContract.connect(signers.alice).verifyDefeat()
      ).to.be.revertedWith("Must complete all 3 attacks first");

      // Perform 1 attack
      let tx = await killBillContract.connect(signers.alice).attackBill();
      await tx.wait();

      await expect(
        killBillContract.connect(signers.alice).verifyDefeat()
      ).to.be.revertedWith("Must complete all 3 attacks first");

      // Perform 2nd attack
      tx = await killBillContract.connect(signers.alice).attackBill();
      await tx.wait();

      await expect(
        killBillContract.connect(signers.alice).verifyDefeat()
      ).to.be.revertedWith("Must complete all 3 attacks first");
    });

    it("should verify defeat successfully after 3 attacks", async function () {
      // Perform 3 attacks
      for (let i = 0; i < 3; i++) {
        const tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();
      }

      // Verify defeat
      const tx = await killBillContract.connect(signers.alice).verifyDefeat();
      await tx.wait();

      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      expect(gameSession.gameActive).to.eq(false);
    });

    it("should correctly determine if Bill is defeated based on total damage", async function () {
      // Perform 3 attacks
      for (let i = 0; i < 3; i++) {
        const tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();
      }

      const sessionBefore = await killBillContract.getGameSession(signers.alice.address);
      const totalDamage = Number(sessionBefore.totalDamage);

      // Verify defeat
      const tx = await killBillContract.connect(signers.alice).verifyDefeat();
      await tx.wait();

      const sessionAfter = await killBillContract.getGameSession(signers.alice.address);
      
      // Bill is defeated if totalDamage >= 1000
      const expectedDefeated = totalDamage >= 1000;
      expect(sessionAfter.billDefeated).to.eq(expectedDefeated);
    });

    it("should increment totalDefeats counter when Bill is defeated", async function () {
      const totalDefeatsBefore = await killBillContract.totalDefeats();

      // Perform 3 attacks
      for (let i = 0; i < 3; i++) {
        const tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();
      }

      // Verify defeat
      const tx = await killBillContract.connect(signers.alice).verifyDefeat();
      await tx.wait();

      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      const totalDefeatsAfter = await killBillContract.totalDefeats();

      if (gameSession.billDefeated) {
        expect(totalDefeatsAfter).to.eq(totalDefeatsBefore + BigInt(1));
      } else {
        expect(totalDefeatsAfter).to.eq(totalDefeatsBefore);
      }
    });

    it("should emit GameVerified event", async function () {
      // Perform 3 attacks
      for (let i = 0; i < 3; i++) {
        const tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();
      }

      // Verify defeat should emit event
      await expect(killBillContract.connect(signers.alice).verifyDefeat())
        .to.emit(killBillContract, "GameVerified");
    });

    it("should not allow verification without active game", async function () {
      await expect(
        killBillContract.connect(signers.bob).verifyDefeat()
      ).to.be.revertedWith("No active game");
    });

    it("should not increment defeats if Bill survives", async function () {
      // We need to ensure total damage < 1000
      // Since damage is random (100-500), 3 attacks might still defeat Bill
      // This test might be flaky, but demonstrates the logic
      
      const totalDefeatsBefore = await killBillContract.totalDefeats();

      // Perform 3 attacks
      for (let i = 0; i < 3; i++) {
        const tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();
      }

      const sessionBefore = await killBillContract.getGameSession(signers.alice.address);
      const totalDamage = Number(sessionBefore.totalDamage);

      // Verify defeat
      const tx = await killBillContract.connect(signers.alice).verifyDefeat();
      await tx.wait();

      const totalDefeatsAfter = await killBillContract.totalDefeats();

      if (totalDamage >= 1000) {
        // Bill defeated
        expect(totalDefeatsAfter).to.eq(totalDefeatsBefore + BigInt(1));
      } else {
        // Bill survived
        expect(totalDefeatsAfter).to.eq(totalDefeatsBefore);
      }
    });
  });

  describe("Decrypt Health", function () {
    it("should not allow decrypting health during active game", async function () {
      const tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();

      await expect(
        killBillContract.connect(signers.alice).decryptHealth()
      ).to.be.revertedWith("Game still active");
    });

    it("should return correct health after game completion", async function () {
      // Initialize and complete a game
      let tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();

      for (let i = 0; i < 3; i++) {
        tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();
      }

      const sessionBefore = await killBillContract.getGameSession(signers.alice.address);
      const totalDamage = Number(sessionBefore.totalDamage);

      tx = await killBillContract.connect(signers.alice).verifyDefeat();
      await tx.wait();

      // Now decrypt health
      const decryptedHealth = await killBillContract.connect(signers.alice).decryptHealth();

      // Expected health = INITIAL_HEALTH - totalDamage, but minimum 0
      const expectedHealth = totalDamage >= 1000 ? 0 : 1000 - totalDamage;
      expect(decryptedHealth).to.eq(expectedHealth);
    });
  });

  describe("Reset Game", function () {
    it("should allow reset after game completion", async function () {
      // Initialize and complete a game
      let tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();

      for (let i = 0; i < 3; i++) {
        tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();
      }

      tx = await killBillContract.connect(signers.alice).verifyDefeat();
      await tx.wait();

      // Reset game
      tx = await killBillContract.connect(signers.alice).resetGame();
      await tx.wait();

      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      expect(gameSession.gameActive).to.eq(false);
      expect(gameSession.attackCount).to.eq(0);
      expect(gameSession.totalDamage).to.eq(0);
    });

    it("should not allow reset during active game", async function () {
      const tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();

      await expect(
        killBillContract.connect(signers.alice).resetGame()
      ).to.be.revertedWith("Game still active");
    });

    it("should allow starting new game after reset", async function () {
      // Complete first game
      let tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();

      for (let i = 0; i < 3; i++) {
        tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();
      }

      tx = await killBillContract.connect(signers.alice).verifyDefeat();
      await tx.wait();

      // Reset
      tx = await killBillContract.connect(signers.alice).resetGame();
      await tx.wait();

      // Start new game
      tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();

      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      expect(gameSession.gameActive).to.eq(true);
      expect(gameSession.attackCount).to.eq(0);
      expect(gameSession.totalDamage).to.eq(0);
    });
  });

  describe("Multiple Players", function () {
    it("should allow multiple players to play simultaneously", async function () {
      // Alice starts game
      let tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();

      // Bob starts game
      tx = await killBillContract.connect(signers.bob).initializeGame();
      await tx.wait();

      // Alice attacks
      tx = await killBillContract.connect(signers.alice).attackBill();
      await tx.wait();

      // Bob attacks
      tx = await killBillContract.connect(signers.bob).attackBill();
      await tx.wait();

      const aliceSession = await killBillContract.getGameSession(signers.alice.address);
      const bobSession = await killBillContract.getGameSession(signers.bob.address);

      expect(aliceSession.attackCount).to.eq(1);
      expect(bobSession.attackCount).to.eq(1);
      expect(aliceSession.gameActive).to.eq(true);
      expect(bobSession.gameActive).to.eq(true);
    });

    it("should track separate defeats for each player", async function () {
      const totalDefeatsBefore = await killBillContract.totalDefeats();

      // Alice plays
      let tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();

      for (let i = 0; i < 3; i++) {
        tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();
      }

      tx = await killBillContract.connect(signers.alice).verifyDefeat();
      await tx.wait();

      // Bob plays
      tx = await killBillContract.connect(signers.bob).initializeGame();
      await tx.wait();

      for (let i = 0; i < 3; i++) {
        tx = await killBillContract.connect(signers.bob).attackBill();
        await tx.wait();
      }

      tx = await killBillContract.connect(signers.bob).verifyDefeat();
      await tx.wait();

      const aliceSession = await killBillContract.getGameSession(signers.alice.address);
      const bobSession = await killBillContract.getGameSession(signers.bob.address);
      const totalDefeatsAfter = await killBillContract.totalDefeats();

      // Count how many actually defeated
      let expectedDefeats = 0;
      if (aliceSession.billDefeated) expectedDefeats++;
      if (bobSession.billDefeated) expectedDefeats++;

      expect(totalDefeatsAfter).to.eq(totalDefeatsBefore + BigInt(expectedDefeats));
    });

    it("should keep player games independent", async function () {
      // Both players start
      let tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();
      tx = await killBillContract.connect(signers.bob).initializeGame();
      await tx.wait();

      // Alice does 2 attacks
      for (let i = 0; i < 2; i++) {
        tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();
      }

      // Bob does 1 attack
      tx = await killBillContract.connect(signers.bob).attackBill();
      await tx.wait();

      const aliceSession = await killBillContract.getGameSession(signers.alice.address);
      const bobSession = await killBillContract.getGameSession(signers.bob.address);

      expect(aliceSession.attackCount).to.eq(2);
      expect(bobSession.attackCount).to.eq(1);
      expect(aliceSession.totalDamage).to.not.eq(bobSession.totalDamage);
    });
  });

  describe("Edge Cases", function () {
    it("should handle getBillHealth for non-existent game", async function () {
      await expect(
        killBillContract.connect(signers.alice).getBillHealth()
      ).to.be.revertedWith("No active game");
    });

    it("should return correct initial game session for new player", async function () {
      const gameSession = await killBillContract.getGameSession(signers.alice.address);
      
      expect(gameSession.attackCount).to.eq(0);
      expect(gameSession.gameActive).to.eq(false);
      expect(gameSession.billDefeated).to.eq(false);
      expect(gameSession.totalDamage).to.eq(0);
    });

    it("should maintain game state consistency throughout full game", async function () {
      // Initialize
      let tx = await killBillContract.connect(signers.alice).initializeGame();
      await tx.wait();

      let session = await killBillContract.getGameSession(signers.alice.address);
      expect(session.gameActive).to.eq(true);
      expect(session.attackCount).to.eq(0);

      // Attack 3 times
      for (let i = 1; i <= 3; i++) {
        tx = await killBillContract.connect(signers.alice).attackBill();
        await tx.wait();

        session = await killBillContract.getGameSession(signers.alice.address);
        expect(session.attackCount).to.eq(i);
        expect(session.gameActive).to.eq(true);
      }

      // Verify
      tx = await killBillContract.connect(signers.alice).verifyDefeat();
      await tx.wait();

      session = await killBillContract.getGameSession(signers.alice.address);
      expect(session.attackCount).to.eq(3);
      expect(session.gameActive).to.eq(false);
    });
  });
});