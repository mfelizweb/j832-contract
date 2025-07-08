// ===============================
// Category: Change Tracking & Audit Trail
// Tested functions:
//   - registerChange()
//   - getLatestChange()
//   - getHistoryRange()
//   - getVersionCount()
// ===============================

import { J832, ChangeType } from "j832";
import { keccak256, toUtf8Bytes } from "ethers";
import { expect } from "chai";

const config = {
  providerUrl: process.env.PROVIDER_URL,
  contractAddress: process.env.CONTRACT_ADDRESS,
  privateKey: process.env.PRIVATE_KEY
};
const sdk = new J832(config);

describe("Change Tracking & Audit Trail", function () {
  this.timeout(20000); // Increase timeout for blockchain calls
  let resourceId;
  let firstDataHash, secondDataHash;

  before("Create unique resource for change tracking", async function () {
    resourceId = "change-track-" + Date.now();
    await sdk.createResource({ resourceId, enforceUniqueness: false });
  });

  it("should register a first change", async function () {
    const data1 = JSON.stringify({ foo: "bar", v: 1 });
    firstDataHash = keccak256(toUtf8Bytes(data1));

    const tx = await sdk.registerChange({
      resourceId,
      dataHash: firstDataHash,
      changeType: ChangeType.CREATE,
    });
    expect(tx.hash).to.be.a("string").and.match(/^0x[a-fA-F0-9]{64}$/);
  });

  it("should register a second change", async function () {
    const data2 = JSON.stringify({ foo: "baz", v: 2 });
    secondDataHash = keccak256(toUtf8Bytes(data2));

    const tx = await sdk.registerChange({
      resourceId,
      dataHash: secondDataHash,
      changeType: ChangeType.UPDATE,
    });
    expect(tx.hash).to.be.a("string").and.match(/^0x[a-fA-F0-9]{64}$/);
  });

  it("should get the latest change with correct data", async function () {
    const latest = await sdk.getLatestChange(resourceId);
    expect(latest).to.have.property("version", 2);
    expect(latest).to.have.property("dataHash", secondDataHash);
    expect(latest).to.have.property("changeType", ChangeType.UPDATE);
  });

  it("should return full history and match dataHash values", async function () {
    const history = await sdk.getHistoryRange(resourceId, 0, 5);
    expect(history).to.have.lengthOf(2);
    expect(history[0]).to.have.property("version", 1);
    expect(history[0]).to.have.property("dataHash", firstDataHash);
    expect(history[1]).to.have.property("version", 2);
    expect(history[1]).to.have.property("dataHash", secondDataHash);
  });

  it("should get correct version count (should be 2)", async function () {
    const count = await sdk.getVersionCount(resourceId);
    expect(count).to.equal(2);
  });
});
