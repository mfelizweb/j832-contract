import { J832, ChangeType } from 'j832';
import { keccak256, toUtf8Bytes } from 'ethers';

const config = {
  providerUrl: "https://rpc-amoy.polygon.technology",
  contractAddress: "0x1Cb32a904b39D019bE14706D1aCA504002059d9e",
  privateKey: "0xa917d4a839db02dd29e6228bb02ecbc7e16e11db95dcfc73b75c4190e436a9b5"
};

const sdk = new J832(config);

async function main() {
  try {
    // 1. Crear recurso
    const createRes = await sdk.createResource({
      resourceId: "test-item",
      enforceUniqueness: false
    });
    console.log("\n✅ createResource:", createRes.hash);

    // 2. Registrar un cambio
    const data = JSON.stringify({ test: "PRIMER CAMBIO", value: 42 });
    const dataHash = keccak256(toUtf8Bytes(data));

    const regRes = await sdk.registerChange({
      resourceId: "test-item",
      dataHash,
      changeType: ChangeType.CREATE,
    });
    console.log("\n✅ registerChange:", regRes.hash);

    // 3. Consultar último cambio
    const latest = await sdk.getLatestChange("test-item");
    console.log("\nℹ️ getLatestChange:", latest);

    // 4. Consultar historial (los primeros 5)
    const history = await sdk.getHistoryRange("test-item", 0, 5);
    console.log("\n📜 getHistoryRange:", history);

    // 5. Consultar admins y owner
    const admins = await sdk.getAdmins("test-item");
    const owner = await sdk.getResourceOwner("test-item");
    console.log("\n👥 Admins:", admins);
    console.log("👑 Owner:", owner);

    // 6. Consultar estado y unicidad
    const active = await sdk.isResourceActive("test-item");
    const unique = await sdk.isUniquenessEnforced("test-item");
    console.log("\n🔎 isResourceActive:", active);
    console.log("🔎 isUniquenessEnforced:", unique);

    // 7. Proponer agregar un nuevo admin (usa otra wallet válida)
    // const newAdmin = "0x..."; // Pega aquí otra address si quieres probarlo de verdad
    // const propAddAdmin = await sdk.proposeAddAdmin("test-item", newAdmin);
    // console.log("\n🔧 proposeAddAdmin:", propAddAdmin.hash);

    // 8. Aprobar la propuesta de nuevo admin (debe hacerse desde la wallet del nuevo admin)
    // const approveAdmin = await sdk.approveAddAdmin("test-item");
    // console.log("\n🔧 approveAddAdmin:", approveAdmin.hash);

    // 9. Leer todos los hashes del historial y decodificarlos (si los pusiste como strings JSON)
    console.log("\n🧩 Decodificando dataHash (ejemplo):");
    for (const change of history) {
      try {
        // Si el dataHash fue calculado desde un string, no puedes revertir a string,
        // pero si usas los mismos datos para comparar, puedes verificar la integridad.
        console.log(`Versión: ${change.version} | dataHash: ${change.dataHash}`);
      } catch (e) {
        console.log(`Versión: ${change.version} | dataHash: ${change.dataHash} (no reversible a string)`);
      }
    }
    console.log("\n✅ Todos los tests principales ejecutados.\n");
  } catch (err) {
    console.error("\n❌ Error en pruebas:", err);
  }
}

main();
