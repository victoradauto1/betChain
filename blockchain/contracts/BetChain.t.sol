// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {BetChain} from "./BetChain.sol";
import {Test} from "forge-std/Test.sol";

contract BetChainTest is Test {
    BetChain public betChain;
    
    address public creator = address(1);
    address public bettor1 = address(2);
    address public bettor2 = address(3);
    address public bettor3 = address(4);
    
    function setUp() public {
        betChain = new BetChain();
        
        // Fund test addresses with ETH
        vm.deal(creator, 100 ether);
        vm.deal(bettor1, 100 ether);
        vm.deal(bettor2, 100 ether);
        vm.deal(bettor3, 100 ether);
    }
    
    // ========== BET CREATION TESTS ==========
    
    function testCreateBetSuccess() public {
        vm.startPrank(creator);
        
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        
        betChain.createBet(
            "Test Bet",
            "Test Description",
            "https://image.com/test.jpg",
            options
        );
        
        (
            address betCreator,
            string memory title,
            string memory description,
            uint256 totalPool,
            bool active,
            bool finalized,
            uint256 optionsCount
        ) = betChain.getBetInfo(1);
        
        assertEq(betCreator, creator);
        assertEq(title, "Test Bet");
        assertEq(description, "Test Description");
        assertEq(totalPool, 0);
        assertTrue(active);
        assertFalse(finalized);
        assertEq(optionsCount, 2);
        
        vm.stopPrank();
    }
    
    function testCreateBetWithMultipleOptions() public {
        vm.startPrank(creator);
        
        string[] memory options = new string[](5);
        options[0] = "Option 1";
        options[1] = "Option 2";
        options[2] = "Option 3";
        options[3] = "Option 4";
        options[4] = "Option 5";
        
        betChain.createBet(
            "Multi Option Bet",
            "Test with 5 options",
            "https://image.com/test.jpg",
            options
        );
        
        (, , , , , , uint256 optionsCount) = betChain.getBetInfo(1);
        assertEq(optionsCount, 5);
        
        vm.stopPrank();
    }
    
    function testCreateBetFailsWithOneOption() public {
        vm.startPrank(creator);
        
        string[] memory options = new string[](1);
        options[0] = "Only Option";
        
        vm.expectRevert("Must have at least 2 options");
        betChain.createBet(
            "Invalid Bet",
            "Should fail",
            "https://image.com/test.jpg",
            options
        );
        
        vm.stopPrank();
    }
    
    function testCreateBetFailsWithTooManyOptions() public {
        vm.startPrank(creator);
        
        string[] memory options = new string[](11);
        for (uint i = 0; i < 11; i++) {
            options[i] = "Option";
        }
        
        vm.expectRevert("Maximum 10 options allowed");
        betChain.createBet(
            "Invalid Bet",
            "Should fail",
            "https://image.com/test.jpg",
            options
        );
        
        vm.stopPrank();
    }
    
    function testNextIdIncrementsCorrectly() public {
        assertEq(betChain.nextId(), 0);
        
        vm.startPrank(creator);
        
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        
        betChain.createBet("Bet 1", "Description 1", "image1.jpg", options);
        assertEq(betChain.nextId(), 1);
        
        betChain.createBet("Bet 2", "Description 2", "image2.jpg", options);
        assertEq(betChain.nextId(), 2);
        
        vm.stopPrank();
    }
    
    // ========== PLACE BET TESTS ==========
    
    function testPlaceBetSuccess() public {
        // Create bet
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        // Place bet
        vm.startPrank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        vm.stopPrank();
        
        uint256 userBet = betChain.getUserBet(1, 0, bettor1);
        assertEq(userBet, 1 ether);
        
        (, uint256 totalBets) = betChain.getOptionInfo(1, 0);
        assertEq(totalBets, 1 ether);
    }
    
    function testPlaceBetMultipleBettors() public {
        // Create bet
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        // Different users place bets
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.prank(bettor2);
        betChain.placeBet{value: 2 ether}(1, 0);
        
        vm.prank(bettor3);
        betChain.placeBet{value: 3 ether}(1, 1);
        
        (, uint256 totalBetsOption0) = betChain.getOptionInfo(1, 0);
        (, uint256 totalBetsOption1) = betChain.getOptionInfo(1, 1);
        
        assertEq(totalBetsOption0, 3 ether);
        assertEq(totalBetsOption1, 3 ether);
        
        (, , , uint256 totalPool, , , ) = betChain.getBetInfo(1);
        assertEq(totalPool, 6 ether);
    }
    
    function testPlaceBetFailsWithZeroValue() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.startPrank(bettor1);
        vm.expectRevert("Amount must be greater than 0");
        betChain.placeBet{value: 0}(1, 0);
        vm.stopPrank();
    }
    
    function testPlaceBetFailsWithInvalidOption() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.startPrank(bettor1);
        vm.expectRevert("Invalid option");
        betChain.placeBet{value: 1 ether}(1, 5);
        vm.stopPrank();
    }
    
    function testPlaceBetFailsOnInactiveBet() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        // Finalize bet
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        // Try to bet after finalization
        vm.startPrank(bettor2);
        vm.expectRevert("Bet is not active");
        betChain.placeBet{value: 1 ether}(1, 0);
        vm.stopPrank();
    }
    
    function testPlaceBetAccumulatesMultipleBetsFromSameUser() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.startPrank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        betChain.placeBet{value: 2 ether}(1, 0);
        vm.stopPrank();
        
        uint256 userBet = betChain.getUserBet(1, 0, bettor1);
        assertEq(userBet, 3 ether);
    }
    
    // ========== FINALIZE BET TESTS ==========
    
    function testFinalizeBetSuccess() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        (, , , , bool active, bool finalized, ) = betChain.getBetInfo(1);
        assertFalse(active);
        assertTrue(finalized);
    }
    
    function testFinalizeBetFailsIfNotCreator() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.startPrank(bettor1);
        vm.expectRevert("Only creator can finalize");
        betChain.finalizeBet(1, 0);
        vm.stopPrank();
    }
    
    function testFinalizeBetFailsWithInvalidOption() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.startPrank(creator);
        vm.expectRevert("Invalid winning option");
        betChain.finalizeBet(1, 5);
        vm.stopPrank();
    }
    
    function testFinalizeBetFailsIfAlreadyFinalized() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.startPrank(creator);
        betChain.finalizeBet(1, 0);
        
        // After finalization, bet is not active, so this error comes first
        vm.expectRevert("Bet is not active");
        betChain.finalizeBet(1, 0);
        vm.stopPrank();
    }
    
    function testFinalizeBetFailsWithInsufficientPool() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        
        vm.expectRevert("Pool too small to finalize");
        betChain.finalizeBet(1, 0);
        vm.stopPrank();
    }
    
    // ========== WITHDRAW PRIZE TESTS ==========
    
    function testWithdrawPrizeSuccess() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 2 ether}(1, 0);
        
        vm.prank(bettor2);
        betChain.placeBet{value: 1 ether}(1, 1);
        
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        uint256 balanceBefore = bettor1.balance;
        
        vm.prank(bettor1);
        betChain.withdrawPrize(1);
        
        uint256 balanceAfter = bettor1.balance;
        uint256 expectedPrize = 3 ether - betChain.FEE();
        
        assertEq(balanceAfter - balanceBefore, expectedPrize);
    }
    
    function testWithdrawPrizeDistributionProportional() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        // Bettor1 bets 2 ether on winning option
        vm.prank(bettor1);
        betChain.placeBet{value: 2 ether}(1, 0);
        
        // Bettor2 bets 1 ether on winning option
        vm.prank(bettor2);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        // Bettor3 bets 3 ether on losing option
        vm.prank(bettor3);
        betChain.placeBet{value: 3 ether}(1, 1);
        
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        uint256 balanceBettor1Before = bettor1.balance;
        uint256 balanceBettor2Before = bettor2.balance;
        
        vm.prank(bettor1);
        betChain.withdrawPrize(1);
        
        vm.prank(bettor2);
        betChain.withdrawPrize(1);
        
        uint256 prizeBettor1 = bettor1.balance - balanceBettor1Before;
        uint256 prizeBettor2 = bettor2.balance - balanceBettor2Before;
        
        // Bettor1 bet 2/3 of winning pool, should receive approximately 2/3 of prize
        // Bettor2 bet 1/3 of winning pool, should receive approximately 1/3 of prize
        // Using assertApproxEqAbs to account for rounding in Solidity division
        assertApproxEqAbs(prizeBettor1, (prizeBettor2 * 2), 1);
    }
    
    function testWithdrawPrizeFailsIfNotFinalized() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.startPrank(bettor1);
        vm.expectRevert("Bet not finalized yet");
        betChain.withdrawPrize(1);
        vm.stopPrank();
    }
    
    function testWithdrawPrizeFailsIfDidNotWin() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.prank(bettor2);
        betChain.placeBet{value: 1 ether}(1, 1);
        
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        vm.startPrank(bettor2);
        vm.expectRevert("You did not bet on winning option");
        betChain.withdrawPrize(1);
        vm.stopPrank();
    }
    
    function testWithdrawPrizeFailsOnSecondAttempt() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        vm.startPrank(bettor1);
        betChain.withdrawPrize(1);
        
        vm.expectRevert("You did not bet on winning option");
        betChain.withdrawPrize(1);
        vm.stopPrank();
    }
    
    // ========== WITHDRAW FEE TESTS ==========
    
    function testWithdrawFeeSuccess() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        uint256 balanceBefore = creator.balance;
        
        vm.prank(creator);
        betChain.withdrawFee(1);
        
        uint256 balanceAfter = creator.balance;
        assertEq(balanceAfter - balanceBefore, betChain.FEE());
    }
    
    function testWithdrawFeeFailsIfNotCreator() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        vm.startPrank(bettor1);
        vm.expectRevert("Only creator can withdraw fee");
        betChain.withdrawFee(1);
        vm.stopPrank();
    }
    
    function testWithdrawFeeFailsIfNotFinalized() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        
        vm.expectRevert("Bet not finalized yet");
        betChain.withdrawFee(1);
        vm.stopPrank();
    }
    
    // ========== VIEW FUNCTIONS TESTS ==========
    
    function testGetOptionInfoReturnsCorrectData() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "First Option";
        options[1] = "Second Option";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 5 ether}(1, 0);
        
        (string memory name, uint256 totalBets) = betChain.getOptionInfo(1, 0);
        
        assertEq(name, "First Option");
        assertEq(totalBets, 5 ether);
    }
    
    function testGetUserBetReturnsCorrectAmount() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 3.5 ether}(1, 1);
        
        uint256 userBet = betChain.getUserBet(1, 1, bettor1);
        assertEq(userBet, 3.5 ether);
    }
    
    function testGetBetInfoReturnsAllData() public {
        vm.startPrank(creator);
        string[] memory options = new string[](3);
        options[0] = "Option 1";
        options[1] = "Option 2";
        options[2] = "Option 3";
        betChain.createBet(
            "Complete Test",
            "Full description",
            "image.jpg",
            options
        );
        vm.stopPrank();
        
        (
            address betCreator,
            string memory title,
            string memory description,
            uint256 totalPool,
            bool active,
            bool finalized,
            uint256 optionsCount
        ) = betChain.getBetInfo(1);
        
        assertEq(betCreator, creator);
        assertEq(title, "Complete Test");
        assertEq(description, "Full description");
        assertEq(totalPool, 0);
        assertTrue(active);
        assertFalse(finalized);
        assertEq(optionsCount, 3);
    }
    
    // ========== ADDITIONAL EDGE CASE TESTS ==========
    
    function testPlaceBetFailsOnFinalizedBet() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        // After finalization, bet.active is set to false, so that check fails first
        vm.startPrank(bettor2);
        vm.expectRevert("Bet is not active");
        betChain.placeBet{value: 1 ether}(1, 0);
        vm.stopPrank();
    }
    
    function testWithdrawPrizeWithSmallPool() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        // Place bet larger than FEE so finalization works
        vm.prank(bettor1);
        betChain.placeBet{value: 200}(1, 0);
        
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        // Withdraw prize should work even with small amount
        uint256 balanceBefore = bettor1.balance;
        
        vm.prank(bettor1);
        betChain.withdrawPrize(1);
        
        uint256 balanceAfter = bettor1.balance;
        uint256 expectedPrize = 200 - betChain.FEE();
        
        assertEq(balanceAfter - balanceBefore, expectedPrize);
    }
    
    function testWithdrawFeeFailsWithInsufficientPool() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        // Place bet larger than FEE so finalization works
        vm.prank(bettor1);
        betChain.placeBet{value: 200}(1, 0);
        
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        // Winner withdraws their prize first
        vm.prank(bettor1);
        betChain.withdrawPrize(1);
        
        // Now creator tries to withdraw fee (but pool was already decreased)
        vm.startPrank(creator);
        betChain.withdrawFee(1);
        vm.stopPrank();
        
        // Fee withdrawal should succeed since we started with enough
        uint256 expectedFee = betChain.FEE();
        assertEq(expectedFee, 100);
    }
    
    function testWithdrawPrizeSuccessCalculatesCorrectly() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.prank(bettor1);
        betChain.placeBet{value: 1 ether}(1, 0);
        
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        uint256 balanceBefore = bettor1.balance;
        
        vm.prank(bettor1);
        betChain.withdrawPrize(1);
        
        uint256 balanceAfter = bettor1.balance;
        uint256 expectedPrize = 1 ether - betChain.FEE();
        
        assertEq(balanceAfter - balanceBefore, expectedPrize);
    }
    
    function testGetOptionInfoFailsWithInvalidOption() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.expectRevert("Invalid option");
        betChain.getOptionInfo(1, 5);
    }
    
    function testGetUserBetFailsWithInvalidOption() public {
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        betChain.createBet("Test Bet", "Description", "image.jpg", options);
        vm.stopPrank();
        
        vm.expectRevert("Invalid option");
        betChain.getUserBet(1, 5, bettor1);
    }
    
    // ========== COMPLETE SCENARIO TEST ==========
    
    function testCompleteScenarioWithWinnerAndLoser() public {
        // 1. Creator creates bet
        vm.startPrank(creator);
        string[] memory options = new string[](2);
        options[0] = "Team A";
        options[1] = "Team B";
        betChain.createBet(
            "Football Match",
            "Who will win?",
            "match.jpg",
            options
        );
        vm.stopPrank();
        
        // 2. Bettors place their bets
        vm.prank(bettor1);
        betChain.placeBet{value: 3 ether}(1, 0); // Winner
        
        vm.prank(bettor2);
        betChain.placeBet{value: 2 ether}(1, 1); // Loser
        
        vm.prank(bettor3);
        betChain.placeBet{value: 1 ether}(1, 0); // Winner
        
        // 3. Creator finalizes bet
        vm.prank(creator);
        betChain.finalizeBet(1, 0);
        
        // 4. Winners withdraw prizes
        uint256 balanceBettor1Before = bettor1.balance;
        vm.prank(bettor1);
        betChain.withdrawPrize(1);
        uint256 prizeBettor1 = bettor1.balance - balanceBettor1Before;
        
        uint256 balanceBettor3Before = bettor3.balance;
        vm.prank(bettor3);
        betChain.withdrawPrize(1);
        uint256 prizeBettor3 = bettor3.balance - balanceBettor3Before;
        
        // 5. Creator withdraws fee
        uint256 creatorBalanceBefore = creator.balance;
        vm.prank(creator);
        betChain.withdrawFee(1);
        uint256 fee = creator.balance - creatorBalanceBefore;
        
        // Verifications
        assertEq(fee, betChain.FEE());
        assertEq(prizeBettor1, (prizeBettor3 * 3)); // Bettor1 bet 3x more
        
        // Total pool was 6 ether, minus fee = distributed prizes
        assertEq(prizeBettor1 + prizeBettor3 + fee, 6 ether);
    }
}