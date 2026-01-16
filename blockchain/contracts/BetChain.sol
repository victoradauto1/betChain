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
        uint256 winningOption;
        uint256 totalPool;
    }

    /*//////////////////////////////////////////////////////////////
                               STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 public betCount;

    mapping(uint256 => Bet) public bets;
    mapping(uint256 => Option[]) public betOptions;

    // betId => optionId => user => amount
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public userBets;

    // betId => user => total amount bet
    mapping(uint256 => mapping(address => uint256)) public userTotalBets;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event BetCreated(uint256 indexed betId, string title);
    event OptionAdded(uint256 indexed betId, uint256 indexed optionId, string name);
    event BetPlaced(uint256 indexed betId, uint256 indexed optionId, address indexed user, uint256 amount);
    event BetClosed(uint256 indexed betId);
    event BetSettled(uint256 indexed betId, uint256 winningOption);
    event WinningsWithdrawn(uint256 indexed betId, address indexed user, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error BetDoesNotExist();
    error BetNotOpen();
    error BetNotClosed();
    error BetNotSettled();
    error InvalidOption();
    error NothingToWithdraw();

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier betExists(uint256 betId) {
        if (betId >= betCount) revert BetDoesNotExist();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                             BET MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function createBet(string calldata title) external {
        Bet storage bet = bets[betCount];
        bet.title = title;
        bet.status = BetStatus.OPEN;

        emit BetCreated(betCount, title);
        betCount++;
    }

    function addOption(uint256 betId, string calldata name) external betExists(betId) {
        Bet storage bet = bets[betId];
        if (bet.status != BetStatus.OPEN) revert BetNotOpen();

        betOptions[betId].push(Option({
            name: name,
            totalAmount: 0
        }));

        emit OptionAdded(betId, betOptions[betId].length - 1, name);
    }

    /*//////////////////////////////////////////////////////////////
                              BETTING
    //////////////////////////////////////////////////////////////*/

    function placeBet(uint256 betId, uint256 optionId) external payable betExists(betId) {
        Bet storage bet = bets[betId];
        if (bet.status != BetStatus.OPEN) revert BetNotOpen();
        if (optionId >= betOptions[betId].length) revert InvalidOption();
        if (msg.value == 0) revert();

        betOptions[betId][optionId].totalAmount += msg.value;
        bet.totalPool += msg.value;

        userBets[betId][optionId][msg.sender] += msg.value;
        userTotalBets[betId][msg.sender] += msg.value;

        emit BetPlaced(betId, optionId, msg.sender, msg.value);
    }

    /*//////////////////////////////////////////////////////////////
                           BET FINALIZATION
    //////////////////////////////////////////////////////////////*/

    function closeBet(uint256 betId) external betExists(betId) {
        Bet storage bet = bets[betId];
        if (bet.status != BetStatus.OPEN) revert BetNotOpen();

        bet.status = BetStatus.CLOSED;
        emit BetClosed(betId);
    }

    function settleBet(uint256 betId, uint256 winningOption)
        external
        betExists(betId)
    {
        Bet storage bet = bets[betId];
        if (bet.status != BetStatus.CLOSED) revert BetNotClosed();
        if (winningOption >= betOptions[betId].length) revert InvalidOption();

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
        uint256 payout = (bet.totalPool * userAmount) / winningPool;

        // effects
        userBets[betId][bet.winningOption][msg.sender] = 0;

        // interaction
        (bool success, ) = msg.sender.call{value: payout}("");
        require(success);

        emit WinningsWithdrawn(betId, msg.sender, payout);
    }

    /*//////////////////////////////////////////////////////////////
                              VIEW
    //////////////////////////////////////////////////////////////*/

    function getOptions(uint256 betId) external view betExists(betId) returns (Option[] memory) {
        return betOptions[betId];
    }
}
