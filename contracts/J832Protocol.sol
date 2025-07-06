 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title J832Protocol — Enterprise Audit Trail with Multi-Admin Governance & Resource Archiving
/// @author [mfelizweb]
/// @notice This contract enables secure, auditable, and tamper-proof tracking of resource changes for enterprises, with multi-admin approval, customizable uniqueness, and resource archiving.
/// @dev Supports granular admin roles, proposals with majority approval, efficient change tracking, and event logging. Use bytes32 identifiers for maximum efficiency and interoperability.
contract J832Protocol {
    /// @notice Types of changes possible in the system.
    enum ChangeType { CREATE, UPDATE, DELETE, TRANSFER, AUDIT }

    /// @notice Represents a single change record for a resource.
    struct Change {
        uint256 version;
        bytes32 dataHash;
        uint256 timestamp;
        address actor;
        ChangeType changeType;
    }

    /// @notice Holds configuration for each resource.
    struct ResourceConfig {
        address owner;
        bool enforceUniqueness;
    }

    // === Multi-admin management ===

    /// @dev List of current admins for each resource.
    mapping(bytes32 => address[]) private resourceAdmins;  // resourceId => admins array

    /// @notice Returns true if an address is an admin for a resource.
    mapping(bytes32 => mapping(address => bool)) public isAdmin; // resourceId => address => is admin

    /// @dev Admin proposals for add/remove/transfer operations (one at a time per resource).
    struct AdminProposal {
        address candidate;
        uint256 approvals;
        mapping(address => bool) approvedBy;
        bool executed;
        ProposalType proposalType;
    }

    /// @notice Types of proposals possible for admin operations.
    enum ProposalType { NONE, ADD_ADMIN, REMOVE_ADMIN, TRANSFER_OWNERSHIP }
    mapping(bytes32 => AdminProposal) private adminProposals;

    // === Core resource & change logic ===

    /// @notice Configuration for each resource.
    mapping(bytes32 => ResourceConfig) public resourceConfig;

    /// @notice Returns true if an address is an authorized operator for a resource.
    mapping(bytes32 => mapping(address => bool)) public isAuthorized;

    /// @notice Tracks unique dataHashes for resources with uniqueness enforced.
    mapping(bytes32 => mapping(bytes32 => bool)) public isDataHashRegistered;

    /// @dev History of changes per resource.
    mapping(bytes32 => Change[]) private resourceHistory;

    /// @notice Tracks if a resource is active (true) or archived/inactive (false).
    mapping(bytes32 => bool) public isResourceActive;

    /// @dev Operator role identifier (can be expanded if needed).
    bytes32 public constant ROLE_OPERATOR = keccak256("OPERATOR");

    // === Events ===

    /// @notice Emitted when a change is successfully registered.
    event ChangeRegistered(bytes32 indexed resourceId, uint256 version, bytes32 dataHash, uint256 timestamp, address indexed actor, ChangeType changeType);

    /// @notice Emitted when an unauthorized attempt to register a change occurs.
    event UnauthorizedAttempt(bytes32 indexed resourceId, address indexed actor, uint256 timestamp, string reason);

    /// @notice Emitted when a duplicate dataHash is attempted for a resource with uniqueness enforced.
    event DuplicateChangeAttempt(bytes32 indexed resourceId, address indexed actor, uint256 timestamp, bytes32 dataHash, string reason);

    /// @notice Emitted when a role is granted to an address for a resource.
    event RoleGranted(bytes32 indexed resourceId, address indexed account);

    /// @notice Emitted when a role is revoked from an address for a resource.
    event RoleRevoked(bytes32 indexed resourceId, address indexed account);

    /// @notice Emitted when the ownership of a resource is transferred.
    event OwnershipTransferred(bytes32 indexed resourceId, address indexed previousOwner, address indexed newOwner);

    /// @notice Emitted when a multi-admin proposal is created.
    event AdminProposalCreated(bytes32 indexed resourceId, ProposalType proposalType, address candidate, address indexed proposer);

    /// @notice Emitted when an admin approves a proposal.
    event AdminProposalApproved(bytes32 indexed resourceId, ProposalType proposalType, address candidate, address indexed approver, uint256 approvals, uint256 totalAdmins);

    /// @notice Emitted when a proposal has been executed after majority approval.
    event AdminProposalExecuted(bytes32 indexed resourceId, ProposalType proposalType, address candidate);

    /// @notice Emitted when a resource is archived or reactivated.
    event ResourceArchived(bytes32 indexed resourceId, bool archived);

    // === Modifiers ===

    /// @notice Restricts function to only admins of a resource.
    /// @param resourceId The resource identifier.
    modifier onlyAdmin(bytes32 resourceId) {
        require(isAdmin[resourceId][msg.sender], "Not an admin for this resource");
        _;
    }

    // === Resource and Admin Management ===

    /// @notice Creates a new resource with an initial owner/admin.
    /// @param resourceId The identifier of the resource (bytes32).
    /// @param enforceUniqueness If true, prevents duplicate dataHash registration.
    function createResource(bytes32 resourceId, bool enforceUniqueness) external {
        require(resourceConfig[resourceId].owner == address(0), "Resource already exists");
        resourceConfig[resourceId] = ResourceConfig({
            owner: msg.sender,
            enforceUniqueness: enforceUniqueness
        });
        resourceAdmins[resourceId].push(msg.sender);
        isAdmin[resourceId][msg.sender] = true;
        isResourceActive[resourceId] = true; // Mark as active
        emit RoleGranted(resourceId, msg.sender);
    }

    /// @notice Returns the number of admins for a resource.
    /// @param resourceId The identifier of the resource.
    /// @return The number of admins.
    function getAdminCount(bytes32 resourceId) public view returns (uint256) {
        return resourceAdmins[resourceId].length;
    }

    /// @notice Returns the list of admin addresses for a resource.
    /// @param resourceId The identifier of the resource.
    /// @return The list of admin addresses.
    function getAdmins(bytes32 resourceId) public view returns (address[] memory) {
        return resourceAdmins[resourceId];
    }

    // ===== Admin Proposals: Add, Remove, Transfer Ownership =====

    /// @notice Propose to add a new admin (majority approval required).
    /// @param resourceId The resource identifier.
    /// @param newAdmin The address to be added as admin.
    function proposeAddAdmin(bytes32 resourceId, address newAdmin) external onlyAdmin(resourceId) {
        require(newAdmin != address(0), "Zero address");
        AdminProposal storage prop = adminProposals[resourceId];
        require(!prop.executed || prop.proposalType == ProposalType.NONE, "Active proposal exists");
        prop.candidate = newAdmin;
        prop.approvals = 0;
        prop.executed = false;
        prop.proposalType = ProposalType.ADD_ADMIN;
        // Reset votes
        for (uint256 i = 0; i < resourceAdmins[resourceId].length; i++) {
            prop.approvedBy[resourceAdmins[resourceId][i]] = false;
        }
        emit AdminProposalCreated(resourceId, ProposalType.ADD_ADMIN, newAdmin, msg.sender);
    }

    /// @notice Approves a proposal to add a new admin.
    /// @param resourceId The resource identifier.
    function approveAddAdmin(bytes32 resourceId) external onlyAdmin(resourceId) {
        AdminProposal storage prop = adminProposals[resourceId];
        require(prop.proposalType == ProposalType.ADD_ADMIN, "No add admin proposal");
        require(!prop.executed, "Already executed");
        require(!prop.approvedBy[msg.sender], "Already approved");
        prop.approvals++;
        prop.approvedBy[msg.sender] = true;

        emit AdminProposalApproved(resourceId, prop.proposalType, prop.candidate, msg.sender, prop.approvals, resourceAdmins[resourceId].length);

        if (prop.approvals > resourceAdmins[resourceId].length / 2) {
            isAdmin[resourceId][prop.candidate] = true;
            resourceAdmins[resourceId].push(prop.candidate);
            emit RoleGranted(resourceId, prop.candidate);
            prop.executed = true;
            prop.proposalType = ProposalType.NONE;
            emit AdminProposalExecuted(resourceId, ProposalType.ADD_ADMIN, prop.candidate);
        }
    }

    /// @notice Propose to remove an admin (majority approval required).
    /// @param resourceId The resource identifier.
    /// @param adminToRemove The address to be removed as admin.
    function proposeRemoveAdmin(bytes32 resourceId, address adminToRemove) external onlyAdmin(resourceId) {
        require(isAdmin[resourceId][adminToRemove], "Not an admin");
        require(resourceAdmins[resourceId].length > 1, "Cannot remove last admin");
        AdminProposal storage prop = adminProposals[resourceId];
        require(!prop.executed || prop.proposalType == ProposalType.NONE, "Active proposal exists");
        prop.candidate = adminToRemove;
        prop.approvals = 0;
        prop.executed = false;
        prop.proposalType = ProposalType.REMOVE_ADMIN;
        for (uint256 i = 0; i < resourceAdmins[resourceId].length; i++) {
            prop.approvedBy[resourceAdmins[resourceId][i]] = false;
        }
        emit AdminProposalCreated(resourceId, ProposalType.REMOVE_ADMIN, adminToRemove, msg.sender);
    }

    /// @notice Approves a proposal to remove an admin.
    /// @param resourceId The resource identifier.
    function approveRemoveAdmin(bytes32 resourceId) external onlyAdmin(resourceId) {
        AdminProposal storage prop = adminProposals[resourceId];
        require(prop.proposalType == ProposalType.REMOVE_ADMIN, "No remove admin proposal");
        require(!prop.executed, "Already executed");
        require(!prop.approvedBy[msg.sender], "Already approved");
        prop.approvals++;
        prop.approvedBy[msg.sender] = true;

        emit AdminProposalApproved(resourceId, prop.proposalType, prop.candidate, msg.sender, prop.approvals, resourceAdmins[resourceId].length);

        if (prop.approvals > resourceAdmins[resourceId].length / 2) {
            isAdmin[resourceId][prop.candidate] = false;
            // Remove from array (swap and pop)
            for (uint256 i = 0; i < resourceAdmins[resourceId].length; i++) {
                if (resourceAdmins[resourceId][i] == prop.candidate) {
                    resourceAdmins[resourceId][i] = resourceAdmins[resourceId][resourceAdmins[resourceId].length - 1];
                    resourceAdmins[resourceId].pop();
                    break;
                }
            }
            emit RoleRevoked(resourceId, prop.candidate);
            prop.executed = true;
            prop.proposalType = ProposalType.NONE;
            emit AdminProposalExecuted(resourceId, ProposalType.REMOVE_ADMIN, prop.candidate);
        }
    }

    /// @notice Propose to transfer resource ownership (majority approval required).
    /// @param resourceId The resource identifier.
    /// @param newOwner The address to be set as new owner/admin.
    function proposeTransferOwnership(bytes32 resourceId, address newOwner) external onlyAdmin(resourceId) {
        require(newOwner != address(0), "Zero address");
        AdminProposal storage prop = adminProposals[resourceId];
        require(!prop.executed || prop.proposalType == ProposalType.NONE, "Active proposal exists");
        prop.candidate = newOwner;
        prop.approvals = 0;
        prop.executed = false;
        prop.proposalType = ProposalType.TRANSFER_OWNERSHIP;
        for (uint256 i = 0; i < resourceAdmins[resourceId].length; i++) {
            prop.approvedBy[resourceAdmins[resourceId][i]] = false;
        }
        emit AdminProposalCreated(resourceId, ProposalType.TRANSFER_OWNERSHIP, newOwner, msg.sender);
    }

    /// @notice Approves a proposal to transfer ownership.
    /// @param resourceId The resource identifier.
    function approveTransferOwnership(bytes32 resourceId) external onlyAdmin(resourceId) {
        AdminProposal storage prop = adminProposals[resourceId];
        require(prop.proposalType == ProposalType.TRANSFER_OWNERSHIP, "No transfer ownership proposal");
        require(!prop.executed, "Already executed");
        require(!prop.approvedBy[msg.sender], "Already approved");
        prop.approvals++;
        prop.approvedBy[msg.sender] = true;

        emit AdminProposalApproved(resourceId, prop.proposalType, prop.candidate, msg.sender, prop.approvals, resourceAdmins[resourceId].length);

        if (prop.approvals > resourceAdmins[resourceId].length / 2) {
            address previousOwner = resourceConfig[resourceId].owner;
            resourceConfig[resourceId].owner = prop.candidate;
            if (!isAdmin[resourceId][prop.candidate]) {
                isAdmin[resourceId][prop.candidate] = true;
                resourceAdmins[resourceId].push(prop.candidate);
                emit RoleGranted(resourceId, prop.candidate);
            }
            emit OwnershipTransferred(resourceId, previousOwner, prop.candidate);
            prop.executed = true;
            prop.proposalType = ProposalType.NONE;
            emit AdminProposalExecuted(resourceId, ProposalType.TRANSFER_OWNERSHIP, prop.candidate);
        }
    }

    // === Resource archiving/deactivation ===

    /// @notice Admins can archive (disable) or reactivate the resource.
    /// @param resourceId The identifier of the resource.
    /// @param active Set to false to archive, true to reactivate.
    function setResourceActiveStatus(bytes32 resourceId, bool active) external onlyAdmin(resourceId) {
        require(isResourceActive[resourceId] != active, "Resource already in desired state");
        isResourceActive[resourceId] = active;
        emit ResourceArchived(resourceId, !active); // archived = !active
    }

    // === Change registration (auth: ADMIN or authorized OPERATOR) ===

    /// @notice Registers a new change for a resource. Only admins or authorized operators can call this.
    /// @dev Enforces uniqueness if enabled, emits all audit events.
    /// @param resourceId The resource identifier.
    /// @param dataHash The hash of the change data.
    /// @param changeType The type of change (enum).
    function registerChange(
        bytes32 resourceId,
        bytes32 dataHash,
        ChangeType changeType
    ) external {
        require(isAdmin[resourceId][msg.sender] || isAuthorized[resourceId][msg.sender], "Not authorized to register");
        require(isResourceActive[resourceId], "Resource is archived/inactive");
        if (resourceConfig[resourceId].enforceUniqueness) {
            if (isDataHashRegistered[resourceId][dataHash]) {
                emit DuplicateChangeAttempt(resourceId, msg.sender, block.timestamp, dataHash, "Duplicate dataHash for this resource");
                revert("Duplicate dataHash not allowed for this resource");
            }
            isDataHashRegistered[resourceId][dataHash] = true;
        }

        uint256 nextVersion = resourceHistory[resourceId].length + 1;
        Change memory change = Change({
            version: nextVersion,
            dataHash: dataHash,
            timestamp: block.timestamp,
            actor: msg.sender,
            changeType: changeType
        });

        resourceHistory[resourceId].push(change);

        emit ChangeRegistered(
            resourceId,
            change.version,
            change.dataHash,
            change.timestamp,
            change.actor,
            change.changeType
        );
    }

    // === Paginated history ===

    /// @notice Returns a paginated slice of the change history for a resource.
    /// @param resourceId The resource identifier.
    /// @param start The starting index (0-based).
    /// @param count The maximum number of records to return.
    /// @return result Array of Change structs.
    function getHistoryRange(
        bytes32 resourceId,
        uint256 start,
        uint256 count
    ) external view returns (Change[] memory result) {
        Change[] storage history = resourceHistory[resourceId];
        uint256 historyLength = history.length;

        require(start <= historyLength, "Start out of range");

        uint256 end = start + count;
        if (end > historyLength) {
            end = historyLength;
        }
        uint256 returnSize = end > start ? end - start : 0;

        result = new Change[](returnSize);
        for (uint256 i = 0; i < returnSize; i++) {
            result[i] = history[start + i];
        }
    }

    /// @notice Returns the latest change for a resource.
    /// @param resourceId The resource identifier.
    /// @return The latest Change record.
    function getLatestChange(bytes32 resourceId) external view returns (Change memory) {
        uint256 len = resourceHistory[resourceId].length;
        require(len > 0, "No changes recorded");
        return resourceHistory[resourceId][len - 1];
    }

    /// @notice Returns the total number of versions for a resource.
    /// @param resourceId The resource identifier.
    /// @return The number of changes/versions.
    function getVersionCount(bytes32 resourceId) external view returns (uint256) {
        return resourceHistory[resourceId].length;
    }

    /// @notice Returns true if uniqueness enforcement is enabled for a resource.
    /// @param resourceId The resource identifier.
    /// @return True if uniqueness is enforced.
    function isUniquenessEnforced(bytes32 resourceId) external view returns (bool) {
        return resourceConfig[resourceId].enforceUniqueness;
    }

    /// @notice Allows an admin majority to change the uniqueness enforcement setting.
    /// @param resourceId The resource identifier.
    /// @param enforceUniqueness Set to true to enforce unique dataHash.
    function setUniqueness(bytes32 resourceId, bool enforceUniqueness) external onlyAdmin(resourceId) {
        resourceConfig[resourceId].enforceUniqueness = enforceUniqueness;
    }
}
