import { J832, ChangeType } from 'j832';
import { keccak256, toUtf8Bytes } from 'ethers';

const config = {
  providerUrl: process.env.PROVIDER_URL,
  contractAddress: process.env.CONTRACT_ADDRESS,
  privateKey: process.env.PRIVATE_KEY
};


const resourceId = "audit-demo-" + Date.now(); 

const sdk = new J832(config);

async function main() {
  try {
     // 1. Create resource
    const createRes = await sdk.createResource({
      resourceId,
      enforceUniqueness: false
    });
    console.log("\n✅ createResource:", createRes.hash);

     // 2. Register a change
    const data = JSON.stringify({ test: "PRIMER CAMBIO", value: 42 });
    const dataHash = keccak256(toUtf8Bytes(data));

    const regRes = await sdk.registerChange({
      resourceId,
      dataHash,
      changeType: ChangeType.CREATE,
    });
    console.log("\n✅ registerChange:", regRes.hash);

     // 3. Get latest change
    const latest = await sdk.getLatestChange(resourceId);
    console.log("\nℹ️ getLatestChange:", latest);

    // 4. Consultar historial (los primeros 5)
    const history = await sdk.getHistoryRange(resourceId, 0, 5);
    console.log("\n📜 getHistoryRange:", history);

    // 5. Get admins and owner
    const admins = await sdk.getAdmins(resourceId);
    const owner = await sdk.getResourceOwner(resourceId);
    console.log("\n👥 Admins:", admins);
    console.log("👑 Owner:", owner);

    // 6. Check status and uniqueness
    const active = await sdk.isResourceActive(resourceId);
    const unique = await sdk.isUniquenessEnforced(resourceId);
    console.log("\n🔎 isResourceActive:", active);
    console.log("🔎 isUniquenessEnforced:", unique);

    // 7. Propose adding a new admin (use another valid wallet address)
    // const newAdmin = "0x..."; // Paste another address here if you want to test it for real
    // const propAddAdmin = await sdk.proposeAddAdmin("test-item", newAdmin);
    // console.log("\n🔧 proposeAddAdmin:", propAddAdmin.hash);

    // 8. Approve the new admin proposal (must be done from the new admin's wallet)
    // const approveAdmin = await sdk.approveAddAdmin("test-item");
    // console.log("\n🔧 approveAddAdmin:", approveAdmin.hash);

    // 9. Read all hashes in history and print them (if you stored data as JSON string)
    console.log("\n🧩 Decodificando dataHash (ejemplo):");
    for (const change of history) {
      try {
         // If dataHash was calculated from a string, you can't revert to string,
        // but if you use the same data to compare, you can verify integrity.
        console.log(`Versión: ${change.version} | dataHash: ${change.dataHash}`);
      } catch (e) {
        console.log(`Versión: ${change.version} | dataHash: ${change.dataHash} (no reversible a string)`);
      }
    }
       console.log("\n✅ All main tests executed.\n");
  } catch (err) {
       console.error("\n❌ Error in tests:", err);
  }
}

main();
