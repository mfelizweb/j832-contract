// =========================
// Category: Governance & Admin Management
// Tested functions:
//   - getAdmins()
//   - getAdminCount()
//   - proposeAddAdmin()
//   - approveAddAdmin()
//   - proposeRemoveAdmin()
//   - approveRemoveAdmin()
//   - isAdmin()
//   - proposeTransferOwnership()
//   - approveTransferOwnership()
//   - getResourceOwner()
// =========================

import { J832 } from "j832";
import { expect } from "chai";

// -------- CONFIG ---------
const config = {
  providerUrl: process.env.PROVIDER_URL,
  contractAddress: process.env.CONTRACT_ADDRESS,
  privateKey: process.env.PRIVATE_KEY
};
const sdk = new J832(config);

describe("Governance & Admin Management", function () {
  this.timeout(20000);  

  let resourceId;
  let initialAdmin;
  const newAdmin = "XXXXXXXXXXXXXXXXX"; //  

  before("Create resource for governance tests", async function () {
    resourceId = "governance-" + Date.now();
    const tx = await sdk.createResource({ resourceId, enforceUniqueness: false });
    expect(tx.hash).to.be.a("string");
    initialAdmin = config.privateKey;  
  });

  it("should have the creator as the only admin initially", async function () {
    const admins = await sdk.getAdmins(resourceId);
    expect(admins).to.be.an("array").with.lengthOf(1);
    expect(admins[0].toLowerCase()).to.match(/^0x[0-9a-f]{40}$/);
  });

  it("should have correct admin count", async function () {
    const count = await sdk.getAdminCount(resourceId);
    expect(count).to.equal(1);
  });

  it("should propose and approve adding a new admin", async function () {
    // Propose to add
    const proposeTx = await sdk.proposeAddAdmin(resourceId, newAdmin);
    expect(proposeTx.hash).to.be.a("string");
    // Approve as current admin
    const approveTx = await sdk.approveAddAdmin(resourceId);
    expect(approveTx.hash).to.be.a("string");
    // Should now have two admins
    const admins = await sdk.getAdmins(resourceId);
    expect(admins.map(a => a.toLowerCase())).to.include(newAdmin.toLowerCase());
  });

  it("should confirm new admin is recognized", async function () {
    const isAdmin = await sdk.isAdmin(resourceId, newAdmin);
    expect(isAdmin).to.equal(true);
  });

  it("should propose and approve removing the new admin", async function () {
    // Propose to remove
    const proposeTx = await sdk.proposeRemoveAdmin(resourceId, newAdmin);
    expect(proposeTx.hash).to.be.a("string");
    // Approve as current admin
    const approveTx = await sdk.approveRemoveAdmin(resourceId);
    expect(approveTx.hash).to.be.a("string");
    // Should no longer include newAdmin
    const admins = await sdk.getAdmins(resourceId);
    expect(admins.map(a => a.toLowerCase())).not.to.include(newAdmin.toLowerCase());
  });

  it("should propose and approve ownership transfer", async function () {
    // Propose transfer to newAdmin
    const proposeTx = await sdk.proposeTransferOwnership(resourceId, newAdmin);
    expect(proposeTx.hash).to.be.a("string");
    // Approve as current admin
    const approveTx = await sdk.approveTransferOwnership(resourceId);
    expect(approveTx.hash).to.be.a("string");
    // New owner should be newAdmin
    const owner = await sdk.getResourceOwner(resourceId);
    expect(owner.toLowerCase()).to.equal(newAdmin.toLowerCase());
  });
});
