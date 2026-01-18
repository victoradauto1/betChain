// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BetChain is ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/

    enum BetStatus {
        OPEN,
        CLOSED,
        SETTLED
    }

    struct Option {
        string name;
        uint256 totalAmount;
    }

    struct Bet {
        string title;
        BetStatus status;
        uint256 deadline;
        uint256 winningOption;
        uint256 totalPool;
        bool optionsLocked;
    }

    /*//////////////////////////////////////////////////////////////
                               STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 public betCount;

    mapping(uint256 => Bet) public bets;
    mapping(uint256 => Option[]) public betOptions;

    mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
        public userBets;
    mapping(uint256 => mapping(address => uint256)) public userTotalBets;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event BetCreated(uint256 indexed betId, string title, uint256 deadline);
    event OptionAdded(
        uint256 indexed betId,
        uint256 indexed optionId,
        string name
    );
    event BetPlaced(
        uint256 indexed betId,
        uint256 indexed optionId,
        address indexed user,
        uint256 amount
    );
    event BetClosed(uint256 indexed betId);
    event BetSettled(uint256 indexed betId, uint256 winningOption);
    event WinningsWithdrawn(
        uint256 indexed betId,
        address indexed user,
        uint256 amount
    );

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error BetDoesNotExist();
    error BetNotOpen();
    error BetNotClosed();
    error BetNotSettled();
    error InvalidOption();
    error NothingToWithdraw();
    error InvalidDeadline();
    error OptionsLocked();
    error InsufficientOptions();
    error InvalidAmount();
    error InvalidBetState();

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier betExists(uint256 betId) {
        if (betId >= betCount) revert BetDoesNotExist();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        DEADLINE SOVEREIGNTY
    //////////////////////////////////////////////////////////////*/

    /// @notice Lazily synchronizes bet status based on deadline
    function _syncBetStatus(uint256 betId) internal {
        Bet storage bet = bets[betId];

        if (bet.status == BetStatus.OPEN && block.timestamp >= bet.deadline) {
            bet.status = BetStatus.CLOSED;
            bet.optionsLocked = true;
            emit BetClosed(betId);
        }
    }

    /// @notice Returns the logical status without mutating storage
    function _getLogicalStatus(
        uint256 betId
    ) internal view returns (BetStatus) {
        Bet storage bet = bets[betId];

        if (bet.status == BetStatus.OPEN && block.timestamp >= bet.deadline) {
            return BetStatus.CLOSED;
        }

        return bet.status;
    }

    /*//////////////////////////////////////////////////////////////
                             BET CREATION
    //////////////////////////////////////////////////////////////*/

    function createBet(string calldata title, uint256 deadline) external {
        if (deadline <= block.timestamp) revert InvalidDeadline();

        Bet storage bet = bets[betCount];
        bet.title = title;
        bet.status = BetStatus.OPEN;
        bet.deadline = deadline;

        emit BetCreated(betCount, title, deadline);
        betCount++;
    }

    function addOption(
        uint256 betId,
        string calldata name
    ) external betExists(betId) {
        Bet storage bet = bets[betId];
        _syncBetStatus(betId);

        if (bet.status != BetStatus.OPEN) revert BetNotOpen();
        if (bet.optionsLocked) revert OptionsLocked();

        betOptions[betId].push(Option({name: name, totalAmount: 0}));

        emit OptionAdded(betId, betOptions[betId].length - 1, name);
    }

    /*//////////////////////////////////////////////////////////////
                              BETTING
    //////////////////////////////////////////////////////////////*/

    function placeBet(
        uint256 betId,
        uint256 optionId
    ) external payable betExists(betId) {
        Bet storage bet = bets[betId];
        _syncBetStatus(betId);

        if (bet.status != BetStatus.OPEN) revert BetNotOpen();
        if (optionId >= betOptions[betId].length) revert InvalidOption();
        if (betOptions[betId].length < 2) revert InsufficientOptions();
        if (msg.value == 0) revert InvalidAmount();

        if (!bet.optionsLocked) {
            bet.optionsLocked = true;
        }

        betOptions[betId][optionId].totalAmount += msg.value;
        bet.totalPool += msg.value;
        userBets[betId][optionId][msg.sender] += msg.value;
        userTotalBets[betId][msg.sender] += msg.value;

        emit BetPlaced(betId, optionId, msg.sender, msg.value);
    }

    /*//////////////////////////////////////////////////////////////
                           FINALIZATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Permissionless bet closure after deadline
    function closeBet(uint256 betId) external betExists(betId) {
        Bet storage bet = bets[betId];

        if (bet.status != BetStatus.OPEN) revert BetNotOpen();
        if (block.timestamp < bet.deadline) revert BetNotOpen();

        bet.status = BetStatus.CLOSED;
        bet.optionsLocked = true;

        emit BetClosed(betId);
    }

    function settleBet(
        uint256 betId,
        uint256 winningOption
    ) external betExists(betId) {
        Bet storage bet = bets[betId];
        _syncBetStatus(betId);

        if (bet.status != BetStatus.CLOSED) revert BetNotClosed();

        // Defensive invariant check.
        // Unreachable in normal flow since placeBet enforces at least 2 options.
        // Kept as a safeguard against future changes.
        // coverage-ignore-next-line
        if (betOptions[betId].length < 2) revert InsufficientOptions();

        if (bet.totalPool == 0) revert NothingToWithdraw();
        if (winningOption >= betOptions[betId].length) revert InvalidOption();
        if (betOptions[betId][winningOption].totalAmount == 0)
            revert InvalidOption();

        bet.winningOption = winningOption;
        bet.status = BetStatus.SETTLED;

        emit BetSettled(betId, winningOption);
    }

    /*//////////////////////////////////////////////////////////////
                              WITHDRAW
    //////////////////////////////////////////////////////////////*/

    function withdraw(uint256 betId) external nonReentrant betExists(betId) {
        Bet storage bet = bets[betId];

        if (bet.status != BetStatus.SETTLED) revert BetNotSettled();

        uint256 userAmount = userBets[betId][bet.winningOption][msg.sender];
        if (userAmount == 0) revert NothingToWithdraw();

        uint256 winningPool = betOptions[betId][bet.winningOption].totalAmount;

        // Defensive invariant check.
        // Unreachable since settleBet guarantees winning option has a non-zero pool.
        // Kept to protect against state corruption or future changes.
        // coverage-ignore-next-line
        if (winningPool == 0) revert InvalidBetState();

        uint256 payout = (bet.totalPool * userAmount) / winningPool;

        userBets[betId][bet.winningOption][msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Transfer failed");

        emit WinningsWithdrawn(betId, msg.sender, payout);
    }

    /*//////////////////////////////////////////////////////////////
                                VIEWS
    //////////////////////////////////////////////////////////////*/

    function isOpen(
        uint256 betId
    ) external view betExists(betId) returns (bool) {
        return _getLogicalStatus(betId) == BetStatus.OPEN;
    }

    function isExpired(
        uint256 betId
    ) external view betExists(betId) returns (bool) {
        return block.timestamp >= bets[betId].deadline;
    }

    function canClose(
        uint256 betId
    ) external view betExists(betId) returns (bool) {
        Bet storage bet = bets[betId];
        return bet.status == BetStatus.OPEN && block.timestamp >= bet.deadline;
    }

    function canSettle(
        uint256 betId
    ) external view betExists(betId) returns (bool) {
        BetStatus status = _getLogicalStatus(betId);
        Bet storage bet = bets[betId];

        return
            status == BetStatus.CLOSED &&
            bet.totalPool > 0 &&
            betOptions[betId].length >= 2;
    }

    function getOptions(
        uint256 betId
    ) external view betExists(betId) returns (Option[] memory) {
        return betOptions[betId];
    }

    function getBetInfo(
        uint256 betId
    )
        external
        view
        betExists(betId)
        returns (
            string memory title,
            BetStatus storedStatus,
            BetStatus logicalStatus,
            uint256 deadline,
            uint256 winningOption,
            uint256 totalPool,
            bool optionsLocked,
            bool expired
        )
    {
        Bet storage bet = bets[betId];

        return (
            bet.title,
            bet.status,
            _getLogicalStatus(betId),
            bet.deadline,
            bet.winningOption,
            bet.totalPool,
            bet.optionsLocked,
            block.timestamp >= bet.deadline
        );
    }

    function calculatePayout(
        uint256 betId,
        address user
    ) external view betExists(betId) returns (uint256) {
        Bet storage bet = bets[betId];

        if (bet.status != BetStatus.SETTLED) return 0;

        uint256 userAmount = userBets[betId][bet.winningOption][user];
        if (userAmount == 0) return 0;

        uint256 winningPool = betOptions[betId][bet.winningOption].totalAmount;

        // Defensive check — graceful fallback for unexpected edge cases
        if (winningPool == 0) return 0;

        return (bet.totalPool * userAmount) / winningPool;
    }

    function getUserBet(
        uint256 betId,
        uint256 optionId,
        address user
    ) external view betExists(betId) returns (uint256) {
        return userBets[betId][optionId][user];
    }

    function getUserTotalBet(
        uint256 betId,
        address user
    ) external view betExists(betId) returns (uint256) {
        return userTotalBets[betId][user];
    }
}
