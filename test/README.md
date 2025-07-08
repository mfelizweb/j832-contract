# J832 Protocol — Integration & Testing Suite

This directory contains professional integration tests for the J832 Protocol smart contract and its official SDK.

## Test Structure

- **Resource Management**
  - Creation, archiving, reactivation, uniqueness enforcement, version tracking.
  - File: `resource-management.test.js`
- **Change Tracking & Audit Trail**
  - Registers changes, fetches history, validates audit trail integrity.
  - File: `change-tracking.test.js`
- **Governance & Admin Management**
  - (Recommended for multi-admin/governance scenarios)
  - Manages admin proposals, confirmations, removals, and ownership transfers.
  - File: `governance.test.js`

## Running the Tests

1. **Install all dependencies:**
    ```bash
    npm install
    ```

2. **Run all tests:**
    ```bash
    npm test
    ```

    Or run an individual test file:
    ```bash
    npx mocha ./test/resource-management.test.js
    ```

3. **Requirements:**
   - A testnet-deployed contract (Polygon Amoy, etc).
   - A funded test wallet (set in `privateKey`).
   - The SDK must be published or linked locally as `j832`.

## Example Successful Output




Resource Management
✔ should create a new resource
✔ should set resource as inactive and then active
✔ should enforce uniqueness for the resource
✔ should get correct version count (should be 0 at start)

Change Tracking & Audit Trail
✔ should register a first change
✔ should register a second change
✔ should get the latest change with correct data
✔ should return full history and match dataHash values
✔ should get correct version count (should be 2)

Governance & Admin Management
✔ should have the creator as the only admin initially
✔ should have correct admin count
✔ should propose and approve adding a new admin
✔ should confirm new admin is recognized
✔ should propose and approve removing the new admin
✔ should propose and approve ownership transfer



## Security Notes

- **Never commit private keys** or sensitive credentials to public repositories.
- Contract should be professionally audited before mainnet or production use.
- Review your API keys, admin roles, and contract addresses before publishing.

## Contribution

Open to pull requests and improvements. For bug reports or suggestions, please open an Issue.

---

**Community and Support:**  
[Discord](https://discord.gg/tCZCpGnC) | [X (Twitter)](https://x.com/j832protocol)

---

*J832 Protocol — Enterprise-grade, open audit trail for any system.*

