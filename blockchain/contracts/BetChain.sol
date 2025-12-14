// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

struct Option {
    string name;
    uint256 totalBets;
    mapping(address => uint256) bets;
}

struct Bet {
    address creator;
    string title;
    string description;
    string imageUrl;
    uint256 deadline;
    Option[] options;
    uint256 totalPool;
    bool active;
    bool finalized;
    bool feeWithdrawn;
    uint256 winningOption;
}

contract BetChain is ReentrancyGuard {
    uint256 public constant FEE = 100; // wei
    uint256 public nextId = 0;

    mapping(uint256 => Bet) private bets;

    event BetCreated(
        uint256 indexed id,
        address indexed creator,
        string title,
        uint256 deadline
    );
    event BetPlaced(
        uint256 indexed id,
        uint256 optionId,
        address indexed bettor,
        uint256 amount
    );
    event BetFinalized(uint256 indexed id, uint256 winningOption);
    event PrizeWithdrawn(
        uint256 indexed id,
        address indexed winner,
        uint256 amount
    );
    event FeeWithdrawn(
        uint256 indexed id,
        address indexed creator,
        uint256 amount
    );

    modifier validBetId(uint256 betId) {
        require(betId != 0 && betId <= nextId, "Invalid betId");
        _;
    }

    /**
     * @notice Create a new bet
     * @param title Bet title (required)
     * @param description Bet description
     * @param imageUrl Image URL (optional)
     * @param optionNames Array of option names (2-10 options)
     * @param deadline Unix timestamp (0 = no deadline)
     */
    function createBet(
        string calldata title,
        string calldata description,
        string calldata imageUrl,
        string[] calldata optionNames,
        uint256 deadline
    ) external {
        require(optionNames.length >= 2, "At least 2 options");
        require(optionNames.length <= 10, "Max 10 options");
        require(bytes(title).length > 0, "Empty title");

        if (deadline != 0) {
            require(deadline > block.timestamp, "Invalid deadline");
        }

        nextId++;
        uint256 id = nextId;

        Bet storage b = bets[id];
        b.creator = msg.sender;
        b.title = title;
        b.description = description;
        b.imageUrl = imageUrl;
        b.deadline = deadline;
        b.active = true;
        b.finalized = false;
        b.feeWithdrawn = false;
        b.winningOption = type(uint256).max;

        for (uint256 i = 0; i < optionNames.length; i++) {
            b.options.push();
            b.options[i].name = optionNames[i];
        }

        emit BetCreated(id, msg.sender, title, deadline);
    }

    /**
     * @notice Place a bet on a specific option
     * @param betId ID of the bet
     * @param optionId Index of the option to bet on
     */
    function placeBet(
        uint256 betId,
        uint256 optionId
    ) external payable validBetId(betId) {
        Bet storage b = bets[betId];

        require(b.active, "Bet inactive");
        require(msg.value > 0, "Zero amount");
        require(optionId < b.options.length, "Invalid option");

        if (b.deadline != 0) {
            require(block.timestamp < b.deadline, "Deadline passed");
        }

        b.options[optionId].bets[msg.sender] += msg.value;
        b.options[optionId].totalBets += msg.value;
        b.totalPool += msg.value;

        emit BetPlaced(betId, optionId, msg.sender, msg.value);
    }

    /**
     * @notice Finalize bet and declare winner (creator only)
     * @param betId ID of the bet
     * @param winningOptionId Index of the winning option
     */
    function finalizeBet(
        uint256 betId,
        uint256 winningOptionId
    ) external validBetId(betId) {
        Bet storage b = bets[betId];

        require(b.creator == msg.sender, "Not creator");
        require(b.active, "Already finalized");
        require(winningOptionId < b.options.length, "Invalid option");
        require(b.totalPool > FEE, "Pool too small");

        b.active = false;
        b.finalized = true;
        b.winningOption = winningOptionId;

        emit BetFinalized(betId, winningOptionId);
    }

    /**
     * @notice Withdraw prize for winners
     * @param betId ID of the bet
     */
    function withdrawPrize(
        uint256 betId
    ) external nonReentrant validBetId(betId) {
        Bet storage b = bets[betId];
        require(b.finalized, "Not finalized");

        uint256 winnerOpt = b.winningOption;

        uint256 userBet = b.options[winnerOpt].bets[msg.sender];
        require(userBet > 0, "No winnings");

        uint256 winningPool = b.options[winnerOpt].totalBets;

        uint256 prizePool = b.totalPool > FEE ? b.totalPool - FEE : 0;
        uint256 prize = (prizePool * userBet) / winningPool;

        // CEI pattern: Checks-Effects-Interactions
        b.options[winnerOpt].bets[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: prize}("");
        require(ok, "Transfer failed");

        emit PrizeWithdrawn(betId, msg.sender, prize);
    }

    /**
     * @notice Withdraw house fee (creator only)
     * @param betId ID of the bet
     */
    function withdrawFee(
        uint256 betId
    ) external nonReentrant validBetId(betId) {
        Bet storage b = bets[betId];
        require(b.finalized, "Not finalized");
        require(b.creator == msg.sender, "Not creator");
        require(!b.feeWithdrawn, "Fee already claimed");

        uint256 fee = FEE;

        // CEI pattern
        b.feeWithdrawn = true;
        b.totalPool -= fee;

        (bool ok, ) = payable(msg.sender).call{value: fee}("");
        require(ok, "Transfer failed");

        emit FeeWithdrawn(betId, msg.sender, fee);
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @notice Get paginated list of all bets
     * @param start Starting bet ID (1-indexed, use 0 to start from 1)
     * @param count Number of bets to return
     */
    function getAllBets(
        uint256 start,
        uint256 count
    )
        external
        view
        returns (
            uint256[] memory ids,
            address[] memory creators,
            string[] memory titles,
            string[] memory imageUrls,
            uint256[] memory pools,
            bool[] memory actives,
            bool[] memory finals,
            uint256[] memory optionsCounts,
            uint256[] memory deadlines
        )
    {
        // Auto-adjust start to 1 if 0
        if (start == 0) start = 1;

        uint256 end = start + count - 1;
        if (end > nextId) end = nextId;

        // Return empty arrays if invalid range
        if (start > end) {
            return (
                new uint256[](0),
                new address[](0),
                new string[](0),
                new string[](0),
                new uint256[](0),
                new bool[](0),
                new bool[](0),
                new uint256[](0),
                new uint256[](0)
            );
        }

        uint256 size = end - start + 1;

        ids = new uint256[](size);
        creators = new address[](size);
        titles = new string[](size);
        imageUrls = new string[](size);
        pools = new uint256[](size);
        actives = new bool[](size);
        finals = new bool[](size);
        optionsCounts = new uint256[](size);
        deadlines = new uint256[](size);

        for (uint256 i = 0; i < size; i++) {
            uint256 betId = start + i;
            Bet storage b = bets[betId];

            ids[i] = betId;
            creators[i] = b.creator;
            titles[i] = b.title;
            imageUrls[i] = b.imageUrl;
            pools[i] = b.totalPool;
            actives[i] = b.active;
            finals[i] = b.finalized;
            optionsCounts[i] = b.options.length;
            deadlines[i] = b.deadline;
        }

        return (
            ids,
            creators,
            titles,
            imageUrls,
            pools,
            actives,
            finals,
            optionsCounts,
            deadlines
        );
    }

    /**
     * @notice Get complete information for a specific bet
     * @param betId ID of the bet
     */
    function getBetFullInfo(
        uint256 betId
    )
        external
        view
        validBetId(betId)
        returns (
            address creator,
            string memory title,
            string memory description,
            string memory imageUrl,
            uint256 totalPool,
            bool active,
            bool finalized,
            uint256 optionsCount,
            uint256 deadline,
            uint256 winningOption
        )
    {
        Bet storage b = bets[betId];
        return (
            b.creator,
            b.title,
            b.description,
            b.imageUrl,
            b.totalPool,
            b.active,
            b.finalized,
            b.options.length,
            b.deadline,
            b.finalized ? b.winningOption : type(uint256).max
        );
    }

    /**
     * @notice Get all options for a bet with their current totals
     * @param betId ID of the bet
     */
    function getBetOptions(
        uint256 betId
    )
        external
        view
        validBetId(betId)
        returns (string[] memory names, uint256[] memory totals)
    {
        Bet storage b = bets[betId];
        uint256 len = b.options.length;

        names = new string[](len);
        totals = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            names[i] = b.options[i].name;
            totals[i] = b.options[i].totalBets;
        }

        return (names, totals);
    }

    /**
     * @notice Get user's bet amount on a specific option
     */
    function getUserBetAmount(
        uint256 betId,
        uint256 optionId,
        address user
    ) external view validBetId(betId) returns (uint256) {
        Bet storage b = bets[betId];
        require(optionId < b.options.length, "Invalid option");
        return b.options[optionId].bets[user];
    }

    /**
     * @notice Get total number of bets created
     */
    function getTotalBets() external view returns (uint256) {
        return nextId;
    }
}
