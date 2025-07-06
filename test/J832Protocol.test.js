const { ethers } = require("hardhat");

let expect;
before(async () => {
  ({ expect } = await import("chai"));
});

describe("J832Protocol", function () {
  let J832Protocol, j832Protocol, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    J832Protocol = await ethers.getContractFactory("J832Protocol");
    j832Protocol = await J832Protocol.deploy();
    await j832Protocol.deployed();
  });

  describe("Deployment", function () {
    it("should deploy and initialize correctly", async function () {
      // No initial state to check in constructor, just deployed
      expect(j832Protocol.address).to.be.properAddress;
    });
  });

  describe("Resource Management", function () {
    it("should allow creating a resource and set msg.sender as owner/admin", async function () {
      const resourceId = ethers.utils.formatBytes32String("res1");

      await expect(j832Protocol.createResource(resourceId, true))
        .to.emit(j832Protocol, "RoleGranted")
        .withArgs(resourceId, owner.address);

      // Should set owner and enforceUniqueness flag
      const config = await j832Protocol.resourceConfig(resourceId);
      expect(config.owner).to.equal(owner.address);
      expect(config.enforceUniqueness).to.equal(true);

      // Should be marked as active
      expect(await j832Protocol.isResourceActive(resourceId)).to.equal(true);

      // Admin count should be 1 (owner)
      expect(await j832Protocol.getAdminCount(resourceId)).to.equal(1);

      // Owner should be admin
      expect(await j832Protocol.isAdmin(resourceId, owner.address)).to.equal(true);
    });
  });

  // Agrega aquí más bloques describe para cada función del contrato,
  // siguiendo el mismo esquema: deploy, actions, events, edge cases.
});
