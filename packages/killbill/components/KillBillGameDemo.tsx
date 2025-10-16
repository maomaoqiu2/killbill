"use client";

import { useFhevm } from "../../fhevm-react";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useKillBillGame } from "../hooks/useKillBillGame";
import { errorNotDeployed } from "./ErrorNotDeployed";

export const KillBillGameDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  //////////////////////////////////////////////////////////////////////////////
  // FHEVM instance
  //////////////////////////////////////////////////////////////////////////////

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  //////////////////////////////////////////////////////////////////////////////
  // useKillBillGame hook
  //////////////////////////////////////////////////////////////////////////////

  const game = useKillBillGame({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  //////////////////////////////////////////////////////////////////////////////
  // UI Styles - Kill Bill Theme (Yellow & Black)
  //////////////////////////////////////////////////////////////////////////////

  const buttonClass =
    "inline-flex items-center justify-center rounded-none border-4 border-black px-8 py-4 " +
    "font-bold text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] " +
    "transition-all duration-200 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] " +
    "active:shadow-none active:translate-x-[8px] active:translate-y-[8px] " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none " +
    "text-xl uppercase tracking-wider";

  const attackButtonClass = buttonClass + " bg-yellow-400";
  const verifyButtonClass = buttonClass + " bg-red-600 text-white";
  const connectButtonClass = buttonClass + " bg-yellow-400";

  const titleClass = "font-black text-4xl text-black mb-4 uppercase tracking-wider";
  const sectionClass = "bg-yellow-400 border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]";

  // Loading state for FHEvm initialization
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-yellow-400 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-black text-8xl text-black mb-8 uppercase tracking-wider">
            KILL BILL
          </h1>
          <p className="text-2xl text-black mb-8 font-bold">THE BLOCKCHAIN GAME</p>
          <button className={connectButtonClass} onClick={connect}>
            <span className="text-3xl px-8">CONNECT WALLET</span>
          </button>
        </div>
      </div>
    );
  }

  // FHEvm Loading State
  if (fhevmStatus !== "ready") {
    return (
      <div className="min-h-screen bg-yellow-400 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-black text-6xl text-black mb-8 uppercase tracking-wider">
            KILL BILL
          </h1>
          <div className="bg-black border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400"></div>
            </div>
            <p className="text-yellow-400 font-black text-2xl mb-2">INITIALIZING FHE</p>
            <p className="text-yellow-400 font-bold text-lg">
              {fhevmStatus === "loading" && "Loading encryption system..."}
              {fhevmStatus === "error" && "Error loading encryption system"}
              {fhevmStatus === "idle" && "Preparing..."}
            </p>
            {fhevmError && (
              <p className="text-red-500 font-bold text-sm mt-4">
                Error: {fhevmError.message}
              </p>
            )}
          </div>
          <p className="text-black font-bold text-sm max-w-md mx-auto">
            Please wait while we initialize the Fully Homomorphic Encryption system.
            This may take a few moments...
          </p>
        </div>
      </div>
    );
  }

  if (game.isDeployed === false) {
    return errorNotDeployed(chainId);
  }

  const renderBillImage = () => {
    // Don't show health bar if health is encrypted
    const showHealthBar = game.isHealthDecrypted && game.clearHealth !== undefined;
    
    return (
      <div className="relative">
        <div className="w-64 h-64 bg-black border-4 border-black flex items-center justify-center">
          <div className="text-center">
            <div className="text-8xl mb-4">💀</div>
            <div className="font-black text-white text-2xl">BILL</div>
          </div>
        </div>
        {game.gameSession?.gameActive && showHealthBar && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-700 border-2 border-black">
            <div 
              className="h-full bg-red-600 transition-all duration-500"
              style={{ width: `${Math.max(0, (Number(game.clearHealth) / 1000) * 100)}%` }}
            />
          </div>
        )}
        {game.gameSession?.gameActive && !showHealthBar && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-700 border-2 border-black">
            <div className="h-full bg-purple-600 animate-pulse" style={{ width: '100%' }} />
          </div>
        )}
      </div>
    );
  };

  const renderGameStatus = () => {
    if (!game.gameSession) {
      return (
        <div className={sectionClass}>
          <p className="text-2xl font-bold text-center">NO ACTIVE GAME</p>
          <p className="text-lg text-center mt-2">Start a new game to kill Bill!</p>
        </div>
      );
    }

    if (!game.gameSession.gameActive && game.gameSession.billDefeated) {
      return (
        <div className="bg-red-600 border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black text-6xl text-yellow-400 text-center animate-pulse">
            BILL IS DEAD!
          </p>
          {game.isHealthDecrypted && game.clearHealth !== undefined && (
            <p className="text-2xl text-white text-center mt-4 font-bold">
              Final Health: {String(game.clearHealth)} HP
            </p>
          )}
        </div>
      );
    }

    if (!game.gameSession.gameActive && !game.gameSession.billDefeated) {
      return (
        <div className="bg-black border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black text-4xl text-yellow-400 text-center">
            BILL SURVIVED!
          </p>
          {game.isHealthDecrypted && game.clearHealth !== undefined && (
            <p className="text-xl text-white text-center mt-4 font-bold">
              Remaining Health: {String(game.clearHealth)} HP
            </p>
          )}
        </div>
      );
    }

    return (
      <div className={sectionClass}>
        <div className="text-center">
          <p className="font-black text-xl mb-2">ATTACKS COMPLETED</p>
          <p className="text-6xl font-bold mb-4">{game.gameSession.attackCount} / 3</p>
          <p className="font-black text-xl mb-2">BILL'S HEALTH</p>
          <p className="text-6xl font-bold text-purple-600">??? HP</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-yellow-400 py-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-black border-4 border-black p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="font-black text-6xl text-yellow-400 text-center uppercase tracking-wider">
            KILL BILL
          </h1>
          <p className="text-yellow-400 text-center text-xl mt-2 font-bold">
            REVENGE IS A DISH BEST SERVED ON BLOCKCHAIN
          </p>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Bill Image */}
        <div className="flex items-center justify-center">
          <div className={sectionClass}>
            {renderBillImage()}
            <div className="mt-4 text-center">
              <p className="font-black text-2xl">TARGET: BILL</p>
              <p className="text-lg font-bold">HP: 1000</p>
            </div>
          </div>
        </div>

        {/* Game Status */}
        <div className="space-y-6">
          {renderGameStatus()}
          
          {/* Global Stats */}
          <div className="bg-black border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-2xl text-yellow-400 mb-3">GLOBAL STATS</p>
            <p className="text-yellow-400 text-lg font-bold">
              Total Bills Killed: {game.totalDefeats}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Initialize / Reset Game */}
        {game.canInitialize && (
          <button
            className={attackButtonClass + " w-full"}
            onClick={game.initializeGame}
            disabled={game.isInitializing}
          >
            {game.isInitializing ? "INITIALIZING..." : "START NEW GAME"}
          </button>
        )}

        {/* Attack Buttons */}
        {game.gameSession?.gameActive && game.gameSession.attackCount < 3 && (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((attackNum) => (
              <button
                key={attackNum}
                className={attackButtonClass + " w-full " + (attackNum <= game.gameSession!.attackCount ? "opacity-50" : "")}
                onClick={game.attackBill}
                disabled={!game.canAttack || attackNum <= game.gameSession!.attackCount}
              >
                {attackNum <= game.gameSession!.attackCount 
                  ? `ATTACK ${attackNum} ✓` 
                  : attackNum === game.gameSession!.attackCount + 1
                    ? game.isAttacking 
                      ? "ATTACKING..." 
                      : `ATTACK ${attackNum}`
                    : `ATTACK ${attackNum}`
                }
              </button>
            ))}
          </div>
        )}

        {/* Verify Button - replaced with Decrypt and Verify */}
        {game.canDecryptAndVerify && (
          <button
            className={verifyButtonClass + " w-full"}
            onClick={game.decryptAndVerify}
            disabled={game.isVerifying || game.isDecrypting}
          >
            {game.isVerifying || game.isDecrypting 
              ? game.message || "PROCESSING..." 
              : "🔓 DECRYPT & VERIFY KILL"
            }
          </button>
        )}

        {/* Show result after verification */}
        {!game.gameSession?.gameActive && game.isHealthDecrypted && game.clearHealth !== undefined && (
          <div className={
            game.gameSession?.billDefeated 
              ? "bg-red-600 border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              : "bg-black border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          }>
            <p className={
              game.gameSession?.billDefeated
                ? "text-yellow-400 font-black text-3xl text-center"
                : "text-yellow-400 font-black text-3xl text-center"
            }>
              {game.gameSession?.billDefeated ? "🎉 VICTORY!" : "💔 DEFEAT!"}
            </p>
            <p className="text-white font-bold text-xl text-center mt-3">
              Final Health: {String(game.clearHealth)} HP
            </p>
          </div>
        )}
      </div>

      {/* Debug Info & Contract Details */}
      <div className="max-w-6xl mx-auto mt-8 space-y-4">
        <details className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <summary className="font-black text-2xl cursor-pointer uppercase">
            Contract Info
          </summary>
          <div className="mt-4 space-y-2 font-mono text-sm">
            <p><strong>Contract:</strong> {game.contractAddress || "Not deployed"}</p>
            <p><strong>Chain ID:</strong> {chainId}</p>
            <p><strong>Deployed:</strong> {game.isDeployed ? "✓" : "✗"}</p>
            <p><strong>Your Address:</strong> {ethersSigner?.address || "Not connected"}</p>
          </div>
        </details>

        <details className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <summary className="font-black text-2xl cursor-pointer uppercase">
            FHEVM Status
          </summary>
          <div className="mt-4 space-y-2 font-mono text-sm">
            <p><strong>Instance:</strong> {fhevmInstance ? "✓ Ready" : "✗ Not ready"}</p>
            <p><strong>Status:</strong> {fhevmStatus}</p>
            <p><strong>Error:</strong> {fhevmError?.message || "None"}</p>
          </div>
        </details>

        <details className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <summary className="font-black text-2xl cursor-pointer uppercase">
            Game State Debug
          </summary>
          <div className="mt-4 space-y-2 font-mono text-sm">
            <p><strong>Game Active:</strong> {game.gameSession?.gameActive ? "✓" : "✗"}</p>
            <p><strong>Attack Count:</strong> {game.gameSession?.attackCount || 0}</p>
            <p><strong>Bill Defeated:</strong> {game.gameSession?.billDefeated ? "✓" : "✗"}</p>
            <p><strong>Health Handle:</strong> {game.healthHandle || "None"}</p>
            <p><strong>Health Decrypted:</strong> {game.isHealthDecrypted ? "✓" : "✗"}</p>
            {game.isHealthDecrypted && (
              <p><strong>Clear Health:</strong> {String(game.clearHealth)} HP</p>
            )}
            <p><strong>Can Initialize:</strong> {game.canInitialize ? "✓" : "✗"}</p>
            <p><strong>Can Attack:</strong> {game.canAttack ? "✓" : "✗"}</p>
            <p><strong>Can Verify:</strong> {game.canVerify ? "✓" : "✗"}</p>
            <p><strong>Can Decrypt:</strong> {game.canDecrypt ? "✓" : "✗"}</p>
          </div>
        </details>

        {/* Message Display */}
        {game.message && (
          <div className="bg-black border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-yellow-400 font-bold text-center">
              {game.message}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <p className="text-black font-bold text-lg">
          A game powered by Fully Homomorphic Encryption
        </p>
        <p className="text-black font-bold text-sm mt-2">
          Bill's health is encrypted on-chain. Only you can decrypt it.
        </p>
      </div>
    </div>
  );
};