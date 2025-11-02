import dotenv from "dotenv";
dotenv.config();
import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk";
import crypto from "crypto";

// Initialize Aptos client
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Your wallet account
const privateKeyHex = process.env.APTOS_PRIVATE_KEY!.replace("0x", "");
const privateKey = new Ed25519PrivateKey(privateKeyHex);
const account = Account.fromPrivateKey({ privateKey });

// Module address (same as your wallet address)
const moduleAddress = process.env.APTOS_MODULE_ADDRESS!;

/**
 * Generate SHA-256 hash of image buffer
 */
export function generateImageHash(imageBuffer: Buffer): string {
  return crypto.createHash("sha256").update(imageBuffer).digest("hex");
}

/**
 * Initialize the design registry (run once)
 */
export async function initializeRegistry() {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${moduleAddress}::design_registry::initialize`,
        functionArguments: [],
      },
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    await aptos.waitForTransaction({ transactionHash: committedTxn.hash });

    console.log("✅ Registry initialized:", committedTxn.hash);
    return { success: true, txHash: committedTxn.hash };
  } catch (error: any) {
    // If already initialized, that's okay
    if (error.message?.includes("already exists")) {
      console.log("✅ Registry already initialized");
      return { success: true, message: "Already initialized" };
    }
    throw error;
  }
}

/**
 * Register a design on blockchain
 */
export async function registerDesign(imageBuffer: Buffer, title: string) {
  try {
    // Generate hash from image
    const designHash = generateImageHash(imageBuffer);

    console.log("📝 Registering design on blockchain...");
    console.log("   Hash:", designHash);
    console.log("   Title:", title);

    // Build transaction
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${moduleAddress}::design_registry::register_design`,
        functionArguments: [designHash, title],
      },
    });

    // Sign and submit
    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    // Wait for confirmation
    await aptos.waitForTransaction({ transactionHash: committedTxn.hash });

    console.log("✅ Design registered! TX:", committedTxn.hash);

    return {
      success: true,
      designHash,
      transactionHash: committedTxn.hash,
      timestamp: Math.floor(Date.now() / 1000),
      explorerUrl: `https://explorer.aptoslabs.com/txn/${committedTxn.hash}?network=testnet`,
    };
  } catch (error: any) {
    console.error("❌ Blockchain registration failed:", error.message);
    throw new Error(`Blockchain error: ${error.message}`);
  }
}

/**
 * Check if a design already exists on blockchain
 */
export async function checkDesignExists(imageBuffer: Buffer): Promise<boolean> {
  try {
    const designHash = generateImageHash(imageBuffer);

    const exists = await aptos.view({
      payload: {
        function: `${moduleAddress}::design_registry::design_exists`,
        functionArguments: [account.accountAddress.toString(), designHash],
      },
    });

    return exists[0] as boolean;
  } catch (error) {
    console.error("Error checking design existence:", error);
    return false;
  }
}

/**
 * Get total number of registered designs
 */
export async function getDesignCount(): Promise<number> {
  try {
    const count = await aptos.view({
      payload: {
        function: `${moduleAddress}::design_registry::get_design_count`,
        functionArguments: [account.accountAddress.toString()],
      },
    });

    return Number(count[0]);
  } catch (error) {
    console.error("Error getting design count:", error);
    return 0;
  }
}

/**
 * Get account balance
 */
export async function getAccountBalance(): Promise<string> {
  try {
    const resources = await aptos.getAccountResources({
      accountAddress: account.accountAddress,
    });

    const coinResource = resources.find(
      (r: any) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
    );

    if (coinResource) {
      const balance = (coinResource.data as any).coin.value;
      return (Number(balance) / 100000000).toFixed(4); // Convert octas to APT
    }

    return "0";
  } catch (error) {
    console.error("Error fetching balance:", error);
    return "0";
  }
}
