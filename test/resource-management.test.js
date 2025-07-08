// =========================
// Category: Resource Management
// Tested functions:
//   - createResource()
//   - setResourceActiveStatus()
//   - isResourceActive()
//   - setUniqueness()
//   - isUniquenessEnforced()
//   - getVersionCount()
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

describe("Resource Management", function () {
  this.timeout(15000);  
  let resourceId;

  before("Generate unique resourceId", function () {
    
    resourceId = "resource-mgmt-" + Date.now() + "-" + Math.floor(Math.random() * 1e6);
  });

  it("should create a new resource", async function () {
    try {
      const res = await sdk.createResource({ resourceId, enforceUniqueness: false });
      expect(res.hash).to.be.a("string").and.match(/^0x[a-fA-F0-9]{64}$/);
    } catch (err) {
      if (err.shortMessage && err.shortMessage.includes("Resource already exists")) {
        this.skip();  
      } else {
        throw err;
      }
    }
  });

  it("should set resource as inactive and then active", async function () {
    let tx = await sdk.setResourceActiveStatus(resourceId, false);
    expect(tx.hash).to.be.a("string");
    let isActive = await sdk.isResourceActive(resourceId);
    expect(isActive).to.equal(false);

    tx = await sdk.setResourceActiveStatus(resourceId, true);
    expect(tx.hash).to.be.a("string");
    isActive = await sdk.isResourceActive(resourceId);
    expect(isActive).to.equal(true);
  });

  it("should enforce uniqueness for the resource", async function () {
    const tx = await sdk.setUniqueness(resourceId, true);
    expect(tx.hash).to.be.a("string");
    const unique = await sdk.isUniquenessEnforced(resourceId);
    expect(unique).to.equal(true);
  });

  it("should get correct version count (should be 0 at start)", async function () {
    const versionCount = await sdk.getVersionCount(resourceId);
    expect(versionCount).to.be.a("number").and.satisfy(num => num === 0);
  });
});
