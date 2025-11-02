/**
 * BLOCKCHAIN INTEGRATION PLACEHOLDER
 *
 * Your teammate should implement these functions:
 *
 * 1. storeOnBlockchain(designId: string, metadata: any) -> Promise<{hash, txHash}>
 * 2. verifyOnBlockchain(designId: string) -> Promise<boolean>
 *
 * Integration points in uploadController.ts:
 * - After ML scan succeeds (line ~70)
 * - Before saving to MongoDB
 *
 * Flow:
 * Upload → ML Scan → Blockchain Storage → MongoDB Save
 */

export async function storeDesignOnBlockchain(
  designId: string,
  metadata: any
): Promise<{
  blockchainHash: string;
  transactionHash: string;
} | null> {
  // TODO: Implement Aptos blockchain storage
  console.log("⏳ Blockchain integration pending...");
  console.log(`Design ID: ${designId}`);

  return null; // Return null for now
}
