// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

struct BetOption {
    string name;
    uint256 totalBets;
    mapping(address => uint256) bets;
}

struct Bet {
    address creator;
    string title;
    string description;
    string imageUrl;
    uint256 optionsCount;
    mapping(uint256 => BetOption) options;
    uint256 totalPool;
    bool active;
    bool finalized;
    uint256 winningOption;
}

contract BetChain {
    uint256 public constant FEE = 100; // Taxa da casa em wei
    uint256 public nextId = 0;
    
    mapping(uint256 => Bet) public bets;
    
    event BetCreated(uint256 indexed id, address indexed creator, string title);
    event BetPlaced(uint256 indexed id, uint256 optionId, address indexed bettor, uint256 amount);
    event BetFinalized(uint256 indexed id, uint256 winningOption);
    event PrizeWithdrawn(uint256 indexed id, address indexed winner, uint256 amount);
    
    // Criar uma nova aposta
    function createBet(
        string calldata title,
        string calldata description,
        string calldata imageUrl,
        string[] calldata optionNames
    ) public {
        require(optionNames.length >= 2, "Must have at least 2 options");
        require(optionNames.length <= 10, "Maximum 10 options allowed");
        
        nextId++;
        Bet storage newBet = bets[nextId];
        newBet.creator = msg.sender;
        newBet.title = title;
        newBet.description = description;
        newBet.imageUrl = imageUrl;
        newBet.optionsCount = optionNames.length;
        newBet.active = true;
        newBet.finalized = false;
        
        for (uint256 i = 0; i < optionNames.length; i++) {
            newBet.options[i].name = optionNames[i];
            newBet.options[i].totalBets = 0;
        }
        
        emit BetCreated(nextId, msg.sender, title);
    }
    
    // Apostar em uma opção
    function placeBet(uint256 betId, uint256 optionId) public payable {
        Bet storage bet = bets[betId];
        
        require(bet.active, "Bet is not active");
        require(!bet.finalized, "Bet already finalized");
        require(msg.value > 0, "Amount must be greater than 0");
        require(optionId < bet.optionsCount, "Invalid option");
        
        bet.options[optionId].bets[msg.sender] += msg.value;
        bet.options[optionId].totalBets += msg.value;
        bet.totalPool += msg.value;
        
        emit BetPlaced(betId, optionId, msg.sender, msg.value);
    }
    
    // Finalizar aposta e declarar vencedor (apenas o criador pode fazer isso)
    function finalizeBet(uint256 betId, uint256 winningOptionId) public {
        Bet storage bet = bets[betId];
        
        require(bet.active, "Bet is not active");
        require(!bet.finalized, "Bet already finalized");
        require(bet.creator == msg.sender, "Only creator can finalize");
        require(winningOptionId < bet.optionsCount, "Invalid winning option");
        require(bet.totalPool > FEE, "Pool too small to finalize");
        
        bet.finalized = true;
        bet.active = false;
        bet.winningOption = winningOptionId;
        
        emit BetFinalized(betId, winningOptionId);
    }
    
    // Retirar prêmio (para vencedores)
    function withdrawPrize(uint256 betId) public {
        Bet storage bet = bets[betId];
        
        require(bet.finalized, "Bet not finalized yet");
        require(bet.totalPool > FEE, "No prize to withdraw");
        
        uint256 userBet = bet.options[bet.winningOption].bets[msg.sender];
        require(userBet > 0, "You did not bet on winning option");
        
        uint256 winningPool = bet.options[bet.winningOption].totalBets;
        uint256 prizePool = bet.totalPool - FEE;
        
        // Calcula o prêmio proporcional do usuário
        uint256 prize = (prizePool * userBet) / winningPool;
        
        // Zera a aposta do usuário para evitar retiradas múltiplas
        bet.options[bet.winningOption].bets[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: prize}("");
        require(success, "Failed to send prize");
        
        emit PrizeWithdrawn(betId, msg.sender, prize);
    }
    
    // Retirar taxa da casa (apenas o criador da aposta)
    function withdrawFee(uint256 betId) public {
        Bet storage bet = bets[betId];
        
        require(bet.finalized, "Bet not finalized yet");
        require(bet.creator == msg.sender, "Only creator can withdraw fee");
        require(bet.totalPool >= FEE, "No fee to withdraw");
        
        uint256 feeAmount = FEE;
        bet.totalPool -= FEE;
        
        (bool success, ) = payable(bet.creator).call{value: feeAmount}("");
        require(success, "Failed to send fee");
    }
    
    // Visualizar informações de uma opção
    function getOptionInfo(uint256 betId, uint256 optionId) 
        public 
        view 
        returns (string memory name, uint256 totalBets) 
    {
        Bet storage bet = bets[betId];
        require(optionId < bet.optionsCount, "Invalid option");
        
        return (
            bet.options[optionId].name,
            bet.options[optionId].totalBets
        );
    }
    
    // Visualizar quanto um usuário apostou em uma opção
    function getUserBet(uint256 betId, uint256 optionId, address user) 
        public 
        view 
        returns (uint256) 
    {
        Bet storage bet = bets[betId];
        require(optionId < bet.optionsCount, "Invalid option");
        
        return bet.options[optionId].bets[user];
    }
    
    // Visualizar informações básicas da aposta
    function getBetInfo(uint256 betId) 
        public 
        view 
        returns (
            address creator,
            string memory title,
            string memory description,
            uint256 totalPool,
            bool active,
            bool finalized,
            uint256 optionsCount
        ) 
    {
        Bet storage bet = bets[betId];
        return (
            bet.creator,
            bet.title,
            bet.description,
            bet.totalPool,
            bet.active,
            bet.finalized,
            bet.optionsCount
        );
    }
}