// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
  Refactored BetChain contract.

  - Adds deadline support per bet.
  - Provides view helpers:
    - getAllBets()
    - getBetFullInfo(uint256)
    - getBetOptions(uint256)
  - Keeps placeBet, finalizeBet, withdrawPrize, withdrawFee semantics.
  - Uses Option[] array inside Bet to allow collecting names/totals in view functions.
*/

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
    uint256 deadline; // unix timestamp; 0 means no deadline
    Option[] options;
    uint256 totalPool;
    bool active;
    bool finalized;
    uint256 winningOption;
}

contract BetChain {
    // house fee in wei (kept as constant for simplicity)
    uint256 public constant FEE = 100;

    // next bet id (starts from 1)
    uint256 public nextId = 0;

    // bets storage
    mapping(uint256 => Bet) private bets;

    // events
    event BetCreated(uint256 indexed id, address indexed creator, string title, uint256 deadline);
    event BetPlaced(uint256 indexed id, uint256 optionId, address indexed bettor, uint256 amount);
    event BetFinalized(uint256 indexed id, uint256 winningOption);
    event PrizeWithdrawn(uint256 indexed id, address indexed winner, uint256 amount);
    event FeeWithdrawn(uint256 indexed id, address indexed creator, uint256 amount);

    // ----------------------------
    // Create a new bet
    // ----------------------------
    /*
      @param title - bet title
      @param description - bet description
      @param imageUrl - image URL (could be empty)
      @param optionNames - list of option names (2..10)
      @param deadline - unix timestamp (0 for no deadline)
    */
    function createBet(
        string calldata title,
        string calldata description,
        string calldata imageUrl,
        string[] calldata optionNames,
        uint256 deadline
    ) external {
        require(optionNames.length >= 2, "Must have at least 2 options");
        require(optionNames.length <= 10, "Maximum 10 options allowed");

        nextId++;
        uint256 id = nextId;

        // initialize storage bet
        Bet storage b = bets[id];
        b.creator = msg.sender;
        b.title = title;
        b.description = description;
        b.imageUrl = imageUrl;
        b.deadline = deadline;
        b.totalPool = 0;
        b.active = true;
        b.finalized = false;
        b.winningOption = type(uint256).max; // sentinel until finalized

        // push options
        for (uint256 i = 0; i < optionNames.length; i++) {
            b.options.push();
            b.options[i].name = optionNames[i];
            b.options[i].totalBets = 0;
        }

        emit BetCreated(id, msg.sender, title, deadline);
    }

    // ----------------------------
    // Place a bet on a given option
    // ----------------------------
    /*
      - Requires bet to be active
      - Requires optionId to be valid
      - Requires msg.value > 0
      - If deadline > 0, requires current time < deadline
    */
    function placeBet(uint256 betId, uint256 optionId) external payable {
        require(betId > 0 && betId <= nextId, "Invalid betId");
        Bet storage b = bets[betId];

        require(b.active, "Bet is not active");
        require(msg.value > 0, "Amount must be greater than 0");
        require(optionId < b.options.length, "Invalid option");

        // enforce deadline if set
        if (b.deadline != 0) {
            require(block.timestamp < b.deadline, "Betting deadline passed");
        }

        b.options[optionId].bets[msg.sender] += msg.value;
        b.options[optionId].totalBets += msg.value;
        b.totalPool += msg.value;

        emit BetPlaced(betId, optionId, msg.sender, msg.value);
    }

    // ----------------------------
    // Finalize a bet (only creator)
    // ----------------------------
    /*
      - Only creator can finalize
      - winningOptionId must be valid
      - pool must exceed FEE (same logic as before)
    */
    function finalizeBet(uint256 betId, uint256 winningOptionId) external {
        require(betId > 0 && betId <= nextId, "Invalid betId");
        Bet storage b = bets[betId];

        require(b.active, "Bet is not active");
        require(b.creator == msg.sender, "Only creator can finalize");
        require(winningOptionId < b.options.length, "Invalid winning option");
        require(b.totalPool > FEE, "Pool too small to finalize");

        b.finalized = true;
        b.active = false;
        b.winningOption = winningOptionId;

        emit BetFinalized(betId, winningOptionId);
    }

    // ----------------------------
    // Withdraw prize (winners)
    // ----------------------------
    function withdrawPrize(uint256 betId) external {
        require(betId > 0 && betId <= nextId, "Invalid betId");
        Bet storage b = bets[betId];

        require(b.finalized, "Bet not finalized yet");
        uint256 winningOption = b.winningOption;
        require(winningOption < b.options.length, "Invalid winning option set");

        uint256 userBet = b.options[winningOption].bets[msg.sender];
        require(userBet > 0, "You did not bet on winning option");

        uint256 winningPool = b.options[winningOption].totalBets;
        uint256 prizePool = 0;
        // protect against underflow: if totalPool < FEE (shouldn't happen), prizePool = 0
        if (b.totalPool > FEE) {
            prizePool = b.totalPool - FEE;
        }

        uint256 prize = 0;
        if (winningPool > 0) {
            prize = (prizePool * userBet) / winningPool;
        }

        // reset user's bet to prevent re-entrancy double withdraws
        b.options[winningOption].bets[msg.sender] = 0;

        // transfer
        (bool success, ) = payable(msg.sender).call{value: prize}("");
        require(success, "Failed to send prize");

        emit PrizeWithdrawn(betId, msg.sender, prize);
    }

    // ----------------------------
    // Withdraw house fee (only creator)
    // ----------------------------
    function withdrawFee(uint256 betId) external {
        require(betId > 0 && betId <= nextId, "Invalid betId");
        Bet storage b = bets[betId];

        require(b.finalized, "Bet not finalized yet");
        require(b.creator == msg.sender, "Only creator can withdraw fee");

        uint256 feeAmount = FEE;

        // Ensure there is enough in totalPool
        if (b.totalPool < feeAmount) {
            feeAmount = b.totalPool;
        }

        b.totalPool -= feeAmount;

        (bool success, ) = payable(b.creator).call{value: feeAmount}("");
        require(success, "Failed to send fee");

        emit FeeWithdrawn(betId, b.creator, feeAmount);
    }

    // ----------------------------
    // View helpers
    // ----------------------------

    /*
      Return summary arrays for all bets.
      Arrays are parallel: ids[i] corresponds to creators[i], etc.
    */
    function getAllBets()
        external
        view
        returns (
            uint256[] memory ids,
            address[] memory creators,
            string[] memory titles,
            string[] memory imageUrls,
            uint256[] memory totalPools,
            bool[] memory actives,
            bool[] memory finalizeds,
            uint256[] memory optionsCounts,
            uint256[] memory deadlines
        )
    {
        uint256 total = nextId;
        ids = new uint256[](total);
        creators = new address[](total);
        titles = new string[](total);
        imageUrls = new string[](total);
        totalPools = new uint256[](total);
        actives = new bool[](total);
        finalizeds = new bool[](total);
        optionsCounts = new uint256[](total);
        deadlines = new uint256[](total);

        for (uint256 i = 0; i < total; i++) {
            uint256 id = i + 1;
            Bet storage b = bets[id];

            ids[i] = id;
            creators[i] = b.creator;
            titles[i] = b.title;
            imageUrls[i] = b.imageUrl;
            totalPools[i] = b.totalPool;
            actives[i] = b.active;
            finalizeds[i] = b.finalized;
            optionsCounts[i] = b.options.length;
            deadlines[i] = b.deadline;
        }

        return (ids, creators, titles, imageUrls, totalPools, actives, finalizeds, optionsCounts, deadlines);
    }

    /*
      Return full info for a single bet including imageUrl and deadline.
    */
    function getBetFullInfo(uint256 betId)
        external
        view
        returns (
            address creator,
            string memory title,
            string memory description,
            string memory imageUrl,
            uint256 totalPool,
            bool active,
            bool finalized,
            uint256 optionsCount,
            uint256 deadline
        )
    {
        require(betId > 0 && betId <= nextId, "Invalid betId");
        Bet storage b = bets[betId];

        creator = b.creator;
        title = b.title;
        description = b.description;
        imageUrl = b.imageUrl;
        totalPool = b.totalPool;
        active = b.active;
        finalized = b.finalized;
        optionsCount = b.options.length;
        deadline = b.deadline;

        return (creator, title, description, imageUrl, totalPool, active, finalized, optionsCount, deadline);
    }

    /*
      Return arrays with option names and their totals for a bet.
      Useful for front-end graphs.
    */
    function getBetOptions(uint256 betId)
        external
        view
        returns (string[] memory names, uint256[] memory totals)
    {
        require(betId > 0 && betId <= nextId, "Invalid betId");
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

    /*
      Return how much a user bet on a given bet option.
    */
    function getUserBetAmount(uint256 betId, uint256 optionId, address user) external view returns (uint256) {
        require(betId > 0 && betId <= nextId, "Invalid betId");
        Bet storage b = bets[betId];
        require(optionId < b.options.length, "Invalid option");
        return b.options[optionId].bets[user];
    }
}
