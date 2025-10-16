"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FhevmDecryptionSignature,
  type FhevmInstance,
  type GenericStringStorage,
} from "../../fhevm-react";

import { KillBillGameAddresses } from "@/abi/KillBillGameAddresses";
import { KillBillGameABI } from "@/abi/KillBillGameABI";

export type GameSessionType = {
  attackCount: number;
  gameActive: boolean;
  billDefeated: boolean;
  totalDamage: number;
};

export type ClearHealthType = {
  handle: string;
  clear: string | bigint | boolean;
};

type KillBillGameInfoType = {
  abi: typeof KillBillGameABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getKillBillGameByChainId(
  chainId: number | undefined
): KillBillGameInfoType {
  if (!chainId) {
    return { abi: KillBillGameABI.abi };
  }

  const entry =
    KillBillGameAddresses[chainId.toString() as keyof typeof KillBillGameAddresses];

  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: KillBillGameABI.abi, chainId };
  }

  return {
    address: entry.address as `0x${string}` | undefined,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: KillBillGameABI.abi,
  };
}

export const useKillBillGame = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  //////////////////////////////////////////////////////////////////////////////
  // States + Refs
  //////////////////////////////////////////////////////////////////////////////

  const [gameSession, setGameSession] = useState<GameSessionType | undefined>(undefined);
  const [healthHandle, setHealthHandle] = useState<string | undefined>(undefined);
  const [clearHealth, setClearHealth] = useState<ClearHealthType | undefined>(undefined);
  const clearHealthRef = useRef<ClearHealthType>(undefined);
  const [totalDefeats, setTotalDefeats] = useState<number>(0);
  const [lastDamage, setLastDamage] = useState<number | undefined>(undefined);
  
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const killBillGameRef = useRef<KillBillGameInfoType | undefined>(undefined);
  const isInitializingRef = useRef<boolean>(isInitializing);
  const isAttackingRef = useRef<boolean>(isAttacking);
  const isVerifyingRef = useRef<boolean>(isVerifying);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isRefreshingRef = useRef<boolean>(isRefreshing);

  const isHealthDecrypted = healthHandle && healthHandle === clearHealth?.handle;

  //////////////////////////////////////////////////////////////////////////////
  // Contract Info
  //////////////////////////////////////////////////////////////////////////////

  const killBillGame = useMemo(() => {
    const c = getKillBillGameByChainId(chainId);
    killBillGameRef.current = c;

    if (!c.address) {
      setMessage(`KillBillGame deployment not found for chainId=${chainId}.`);
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!killBillGame) {
      return undefined;
    }
    return (
      Boolean(killBillGame.address) && killBillGame.address !== ethers.ZeroAddress
    );
  }, [killBillGame]);

  //////////////////////////////////////////////////////////////////////////////
  // Refresh Game Session
  //////////////////////////////////////////////////////////////////////////////

  const canRefresh = useMemo(() => {
    return killBillGame.address && ethersReadonlyProvider && ethersSigner && !isRefreshing;
  }, [killBillGame.address, ethersReadonlyProvider, ethersSigner, isRefreshing]);

  const refreshGameSession = useCallback(() => {
    console.log("[useKillBillGame] call refreshGameSession()");
    if (isRefreshingRef.current) {
      return;
    }

    if (
      !killBillGameRef.current ||
      !killBillGameRef.current?.chainId ||
      !killBillGameRef.current?.address ||
      !ethersReadonlyProvider ||
      !ethersSigner
    ) {
      setGameSession(undefined);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = killBillGameRef.current.chainId;
    const thisContractAddress = killBillGameRef.current.address;

    const contract = new ethers.Contract(
      thisContractAddress,
      killBillGameRef.current.abi,
      ethersReadonlyProvider
    );

    Promise.all([
      contract.getGameSession(ethersSigner.address),
      contract.totalDefeats(),
    ])
      .then(([session, defeats]) => {
        console.log("[useKillBillGame] getGameSession()=", session);
        console.log("[useKillBillGame] totalDefeats()=", defeats);
        
        if (
          sameChain.current(thisChainId) &&
          thisContractAddress === killBillGameRef.current?.address
        ) {
          setGameSession({
            attackCount: Number(session.attackCount),
            gameActive: session.gameActive,
            billDefeated: session.billDefeated,
            totalDamage: Number(session.totalDamage),
          });
          setTotalDefeats(Number(defeats));
          
          // Also refresh health handle if game is active
          if (session.gameActive) {
            contract.getBillHealth().then((health: string) => {
              setHealthHandle(health);
            }).catch(() => {
              setHealthHandle(undefined);
            });
          }
        }

        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e) => {
        setMessage("Failed to refresh game session! error=" + e);
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersReadonlyProvider, ethersSigner, sameChain]);

  // Auto refresh
  useEffect(() => {
    refreshGameSession();
  }, [refreshGameSession]);

  //////////////////////////////////////////////////////////////////////////////
  // Initialize Game
  //////////////////////////////////////////////////////////////////////////////

  const canInitialize = useMemo(() => {
    return (
      killBillGame.address &&
      ethersSigner &&
      !isInitializing &&
      (!gameSession || !gameSession.gameActive)
    );
  }, [killBillGame.address, ethersSigner, isInitializing, gameSession]);

  const initializeGame = useCallback(() => {
    if (isInitializingRef.current) {
      return;
    }

    if (!killBillGame.address || !ethersSigner) {
      return;
    }

    const thisChainId = chainId;
    const thisContractAddress = killBillGame.address;
    const thisEthersSigner = ethersSigner;
    const contract = new ethers.Contract(
      thisContractAddress,
      killBillGame.abi,
      thisEthersSigner
    );

    isInitializingRef.current = true;
    setIsInitializing(true);
    setMessage("Initializing game...");

    const run = async () => {
      const isStale = () =>
        thisContractAddress !== killBillGameRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const tx: ethers.TransactionResponse = await contract.initializeGame();
        setMessage(`Waiting for tx: ${tx.hash}...`);

        const receipt = await tx.wait();
        setMessage(`Game initialized! Status=${receipt?.status}`);

        if (isStale()) {
          setMessage("Ignoring stale initialization");
          return;
        }

        refreshGameSession();
      } catch (e: any) {
        setMessage(`Failed to initialize game: ${e.message}`);
      } finally {
        isInitializingRef.current = false;
        setIsInitializing(false);
      }
    };

    run();
  }, [killBillGame.address, killBillGame.abi, ethersSigner, chainId, refreshGameSession, sameChain, sameSigner]);

  //////////////////////////////////////////////////////////////////////////////
  // Attack Bill
  //////////////////////////////////////////////////////////////////////////////

  const canAttack = useMemo(() => {
    return (
      killBillGame.address &&
      ethersSigner &&
      gameSession?.gameActive &&
      gameSession?.attackCount < 3 &&
      !isAttacking
    );
  }, [killBillGame.address, ethersSigner, gameSession, isAttacking]);

  const attackBill = useCallback(() => {
    if (isAttackingRef.current) {
      return;
    }

    if (!killBillGame.address || !ethersSigner || !gameSession?.gameActive) {
      return;
    }

    const thisChainId = chainId;
    const thisContractAddress = killBillGame.address;
    const thisEthersSigner = ethersSigner;
    const contract = new ethers.Contract(
      thisContractAddress,
      killBillGame.abi,
      thisEthersSigner
    );

    isAttackingRef.current = true;
    setIsAttacking(true);
    setMessage("Attacking Bill...");

    const run = async () => {
      const isStale = () =>
        thisContractAddress !== killBillGameRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const tx: ethers.TransactionResponse = await contract.attackBill();
        setMessage(`Waiting for tx: ${tx.hash}...`);

        const receipt = await tx.wait();
        
        // Parse event to get damage
        const event = receipt?.logs.find((log: any) => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed?.name === "AttackPerformed";
          } catch {
            return false;
          }
        });
        
        if (event) {
          const parsed = contract.interface.parseLog(event);
          const damage = Number(parsed?.args[2]);
          setLastDamage(damage);
          setMessage(`Attack dealt ${damage} damage!`);
        } else {
          setMessage(`Attack completed! Status=${receipt?.status}`);
        }

        if (isStale()) {
          setMessage("Ignoring stale attack");
          return;
        }

        refreshGameSession();
      } catch (e: any) {
        setMessage(`Failed to attack: ${e.message}`);
      } finally {
        isAttackingRef.current = false;
        setIsAttacking(false);
      }
    };

    run();
  }, [killBillGame.address, killBillGame.abi, ethersSigner, chainId, gameSession, refreshGameSession, sameChain, sameSigner]);

  //////////////////////////////////////////////////////////////////////////////
  // Verify Defeat
  //////////////////////////////////////////////////////////////////////////////

  const canVerify = useMemo(() => {
    return (
      killBillGame.address &&
      ethersSigner &&
      gameSession?.gameActive &&
      gameSession?.attackCount === 3 &&
      !isVerifying
    );
  }, [killBillGame.address, ethersSigner, gameSession, isVerifying]);

  const verifyDefeat = useCallback(() => {
    if (isVerifyingRef.current) {
      return;
    }

    if (!killBillGame.address || !ethersSigner || !gameSession?.gameActive) {
      return;
    }

    const thisChainId = chainId;
    const thisContractAddress = killBillGame.address;
    const thisEthersSigner = ethersSigner;
    const contract = new ethers.Contract(
      thisContractAddress,
      killBillGame.abi,
      thisEthersSigner
    );

    isVerifyingRef.current = true;
    setIsVerifying(true);
    setMessage("Verifying defeat...");

    const run = async () => {
      const isStale = () =>
        thisContractAddress !== killBillGameRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const tx: ethers.TransactionResponse = await contract.verifyDefeat();
        setMessage(`Waiting for tx: ${tx.hash}...`);

        const receipt = await tx.wait();
        setMessage(`Verification completed! Status=${receipt?.status}`);

        if (isStale()) {
          setMessage("Ignoring stale verification");
          return;
        }

        refreshGameSession();
      } catch (e: any) {
        setMessage(`Failed to verify: ${e.message}`);
      } finally {
        isVerifyingRef.current = false;
        setIsVerifying(false);
      }
    };

    run();
  }, [killBillGame.address, killBillGame.abi, ethersSigner, chainId, gameSession, refreshGameSession, sameChain, sameSigner]);

  //////////////////////////////////////////////////////////////////////////////
  // Decrypt Health (after game completion)
  //////////////////////////////////////////////////////////////////////////////

  const canDecrypt = useMemo(() => {
    return (
      killBillGame.address &&
      instance &&
      ethersSigner &&
      !isDecrypting &&
      healthHandle &&
      healthHandle !== ethers.ZeroHash &&
      healthHandle !== clearHealth?.handle
    );
  }, [killBillGame.address, instance, ethersSigner, isDecrypting, healthHandle, clearHealth]);

  const decryptHealth = useCallback(() => {
    if (isDecryptingRef.current) {
      return;
    }

    if (!killBillGame.address || !instance || !ethersSigner) {
      return;
    }

    if (healthHandle === clearHealthRef.current?.handle) {
      return;
    }

    if (!healthHandle || healthHandle === ethers.ZeroHash) {
      setClearHealth(undefined);
      clearHealthRef.current = undefined;
      return;
    }

    const thisChainId = chainId;
    const thisContractAddress = killBillGame.address;
    const thisHealthHandle = healthHandle;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Decrypting Bill's health...");

    const run = async () => {
      const isStale = () =>
        thisContractAddress !== killBillGameRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [killBillGame.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignoring decryption");
          return;
        }

        setMessage("Calling FHEVM userDecrypt...");

        const res = await instance.userDecrypt(
          [{ handle: thisHealthHandle, contractAddress: thisContractAddress }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("Decryption completed!");

        if (isStale()) {
          setMessage("Ignoring decryption");
          return;
        }

        setClearHealth({ handle: thisHealthHandle, clear: res[thisHealthHandle] });
        clearHealthRef.current = {
          handle: thisHealthHandle,
          clear: res[thisHealthHandle],
        };

        setMessage(`Bill's remaining health: ${clearHealthRef.current.clear}`);
      } catch (e: any) {
        setMessage(`Failed to decrypt: ${e.message}`);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    killBillGame.address,
    instance,
    healthHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  return {
    contractAddress: killBillGame.address,
    isDeployed,
    gameSession,
    totalDefeats,
    lastDamage,
    healthHandle,
    clearHealth: clearHealth?.clear,
    isHealthDecrypted,
    canInitialize,
    canAttack,
    canVerify,
    canDecrypt,
    canRefresh,
    initializeGame,
    attackBill,
    verifyDefeat,
    decryptHealth,
    refreshGameSession,
    isInitializing,
    isAttacking,
    isVerifying,
    isDecrypting,
    isRefreshing,
    message,
  };
};