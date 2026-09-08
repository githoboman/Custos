// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/**
 * @title Custos
 * @notice Real (two-key) escrow for freelance retainers on BOT Chain, denominated in ERC-20 tokens.
 * Ported from custos.clar (Stacks) with complete state machine & security parity.
 *
 * State machine per retainer:
 *
 *   Active -----markDelivered(freelancer)----> Delivered
 *   Active -----reclaimAbandoned(client, after deliveryDeadline)---> Reclaimed
 *
 *   Delivered --approveAndRelease(client)-----------------> Paid
 *   Delivered --autoRelease(anyone, after approvalDeadline)-> Paid
 *   Delivered --dispute(client, before approvalDeadline)----> Disputed
 *
 *   Disputed ---resolveDispute(client & freelancer submit matching
 *               freelancerAmount)-------------------------> Resolved
 */
contract Custos {
    // ---------- Enums & Structs ----------

    enum RetainerState {
        Active,      // 0
        Delivered,   // 1
        Disputed,    // 2
        Paid,        // 3
        Resolved,    // 4
        Reclaimed    // 5
    }

    struct Retainer {
        address client;
        address freelancer;
        address token;              // ERC-20 contract address
        uint256 upfrontAmount;
        uint256 lockAmount;
        uint256 deliveryDeadline;   // Unix timestamp: freelancer must markDelivered by this time
        uint256 approvalWindow;     // Seconds client gets to act after delivery
        uint256 approvalDeadline;   // Set once delivered: delivered timestamp + approvalWindow
        RetainerState state;
    }

    // ---------- State Variables ----------

    uint256 public nextId;
    mapping(uint256 => Retainer) public retainers;

    // Proposal mapping: id => proposer => suggested freelancer amount
    mapping(uint256 => mapping(address => uint256)) public disputeProposals;
    mapping(uint256 => mapping(address => bool)) public hasProposed;

    // Reentrancy guard
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // ---------- Events ----------

    event RetainerCreated(
        uint256 indexed id,
        address indexed client,
        address indexed freelancer,
        address token,
        uint256 upfrontAmount,
        uint256 lockAmount,
        uint256 deliveryDeadline,
        uint256 approvalWindow
    );

    event WorkDelivered(uint256 indexed id, uint256 approvalDeadline);
    event ApprovedAndReleased(uint256 indexed id, address indexed freelancer, uint256 amount);
    event AutoReleased(uint256 indexed id, address indexed freelancer, uint256 amount);
    event Disputed(uint256 indexed id, address indexed client);
    event DisputeProposed(uint256 indexed id, address indexed proposer, uint256 freelancerAmount);
    event DisputeResolved(uint256 indexed id, uint256 freelancerAmount, uint256 clientAmount);
    event AbandonedReclaimed(uint256 indexed id, address indexed client, uint256 amount);

    // ---------- Custom Errors ----------

    error RetainerNotFound();
    error Unauthorized();
    error NotActive();
    error NotDelivered();
    error NotDisputed();
    error ZeroAmount();
    error InvalidParties();
    error ZeroDuration();
    error TooEarly();
    error DeliveryDeadlinePassed();
    error DeliveryDeadlineNotReached();
    error DisputeWindowPassed();
    error InvalidSplit();
    error TokenTransferFailed();
    error ReentrancyGuardReentrantCall();

    // ---------- Modifiers ----------

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyGuardReentrantCall();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor() {
        _status = _NOT_ENTERED;
    }

    // ---------- Public / External Functions ----------

    /**
     * @notice Client creates and funds a retainer.
     * upfrontAmount pays the freelancer immediately.
     * lockAmount is held in this contract until released or resolved.
     */
    function createRetainer(
        address token,
        address freelancer,
        uint256 upfrontAmount,
        uint256 lockAmount,
        uint256 deliveryWindow,
        uint256 approvalWindow
    ) external nonReentrant returns (uint256 id) {
        if (msg.sender == freelancer || freelancer == address(0)) revert InvalidParties();
        if (token == address(0)) revert InvalidParties();
        if (deliveryWindow == 0 || approvalWindow == 0) revert ZeroDuration();
        if (upfrontAmount + lockAmount == 0) revert ZeroAmount();

        id = nextId++;
        uint256 deliveryDeadline = block.timestamp + deliveryWindow;

        retainers[id] = Retainer({
            client: msg.sender,
            freelancer: freelancer,
            token: token,
            upfrontAmount: upfrontAmount,
            lockAmount: lockAmount,
            deliveryDeadline: deliveryDeadline,
            approvalWindow: approvalWindow,
            approvalDeadline: 0,
            state: RetainerState.Active
        });

        // Pay upfront amount directly to freelancer if any
        if (upfrontAmount > 0) {
            _safeTransferFrom(token, msg.sender, freelancer, upfrontAmount);
        }

        // Deposit lock amount into Custos escrow
        if (lockAmount > 0) {
            _safeTransferFrom(token, msg.sender, address(this), lockAmount);
        }

        emit RetainerCreated(
            id,
            msg.sender,
            freelancer,
            token,
            upfrontAmount,
            lockAmount,
            deliveryDeadline,
            approvalWindow
        );
    }

    /**
     * @notice Freelancer confirms delivery before the delivery deadline.
     * Opens the client's approval / dispute window.
     */
    function markDelivered(uint256 id) external {
        Retainer storage r = retainers[id];
        if (r.client == address(0)) revert RetainerNotFound();
        if (msg.sender != r.freelancer) revert Unauthorized();
        if (r.state != RetainerState.Active) revert NotActive();
        if (block.timestamp > r.deliveryDeadline) revert DeliveryDeadlinePassed();

        r.state = RetainerState.Delivered;
        r.approvalDeadline = block.timestamp + r.approvalWindow;

        emit WorkDelivered(id, r.approvalDeadline);
    }

    /**
     * @notice Client explicitly approves delivered work and releases full lockAmount to freelancer.
     */
    function approveAndRelease(uint256 id) external nonReentrant {
        Retainer storage r = retainers[id];
        if (r.client == address(0)) revert RetainerNotFound();
        if (msg.sender != r.client) revert Unauthorized();
        if (r.state != RetainerState.Delivered) revert NotDelivered();

        r.state = RetainerState.Paid;
        uint256 amount = r.lockAmount;

        if (amount > 0) {
            _safeTransfer(r.token, r.freelancer, amount);
        }

        emit ApprovedAndReleased(id, r.freelancer, amount);
    }

    /**
     * @notice Anyone can trigger autoRelease once approvalDeadline has passed without dispute.
     */
    function autoRelease(uint256 id) external nonReentrant {
        Retainer storage r = retainers[id];
        if (r.client == address(0)) revert RetainerNotFound();
        if (r.state != RetainerState.Delivered) revert NotDelivered();
        if (block.timestamp <= r.approvalDeadline) revert TooEarly();

        r.state = RetainerState.Paid;
        uint256 amount = r.lockAmount;

        if (amount > 0) {
            _safeTransfer(r.token, r.freelancer, amount);
        }

        emit AutoReleased(id, r.freelancer, amount);
    }

    /**
     * @notice Client disputes delivered work before approvalDeadline.
     */
    function dispute(uint256 id) external {
        Retainer storage r = retainers[id];
        if (r.client == address(0)) revert RetainerNotFound();
        if (msg.sender != r.client) revert Unauthorized();
        if (r.state != RetainerState.Delivered) revert NotDelivered();
        if (block.timestamp > r.approvalDeadline) revert DisputeWindowPassed();

        r.state = RetainerState.Disputed;

        emit Disputed(id, msg.sender);
    }

    /**
     * @notice Mutual dispute resolution. Client or freelancer submits proposed freelancer amount.
     * Executes when both submit matching values.
     */
    function resolveDispute(uint256 id, uint256 freelancerAmount) external nonReentrant returns (bool executed) {
        Retainer storage r = retainers[id];
        if (r.client == address(0)) revert RetainerNotFound();
        if (r.state != RetainerState.Disputed) revert NotDisputed();
        if (msg.sender != r.client && msg.sender != r.freelancer) revert Unauthorized();
        if (freelancerAmount > r.lockAmount) revert InvalidSplit();

        disputeProposals[id][msg.sender] = freelancerAmount;
        hasProposed[id][msg.sender] = true;

        emit DisputeProposed(id, msg.sender, freelancerAmount);

        address otherParty = (msg.sender == r.client) ? r.freelancer : r.client;

        if (hasProposed[id][otherParty] && disputeProposals[id][otherParty] == freelancerAmount) {
            r.state = RetainerState.Resolved;
            uint256 clientAmount = r.lockAmount - freelancerAmount;

            if (freelancerAmount > 0) {
                _safeTransfer(r.token, r.freelancer, freelancerAmount);
            }
            if (clientAmount > 0) {
                _safeTransfer(r.token, r.client, clientAmount);
            }

            emit DisputeResolved(id, freelancerAmount, clientAmount);
            return true;
        }

        return false;
    }

    /**
     * @notice Client reclaims lockAmount if freelancer never marked delivered before deliveryDeadline.
     */
    function reclaimAbandoned(uint256 id) external nonReentrant {
        Retainer storage r = retainers[id];
        if (r.client == address(0)) revert RetainerNotFound();
        if (msg.sender != r.client) revert Unauthorized();
        if (r.state != RetainerState.Active) revert NotActive();
        if (block.timestamp <= r.deliveryDeadline) revert DeliveryDeadlineNotReached();

        r.state = RetainerState.Reclaimed;
        uint256 amount = r.lockAmount;

        if (amount > 0) {
            _safeTransfer(r.token, r.client, amount);
        }

        emit AbandonedReclaimed(id, r.client, amount);
    }

    // ---------- Read-Only / View Functions ----------

    function getRetainer(uint256 id) external view returns (Retainer memory) {
        if (retainers[id].client == address(0)) revert RetainerNotFound();
        return retainers[id];
    }

    function getDisputeProposal(uint256 id, address proposer) external view returns (uint256 amount, bool proposed) {
        return (disputeProposals[id][proposer], hasProposed[id][proposer]);
    }

    // ---------- Internal Helpers ----------

    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, value)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TokenTransferFailed();
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TokenTransferFailed();
        }
    }
}
