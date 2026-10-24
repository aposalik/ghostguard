// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {DemoEventOnly} from "../src/DemoEventOnly.sol";
import {DemoToken} from "../src/DemoToken.sol";

interface Vm {
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData, address emitter) external;

    function prank(address sender) external;

    function expectRevert(bytes4 selector) external;
}

contract DemoContractsTest {
    event Transfer(address indexed from, address indexed to, uint256 value);

    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant RECIPIENT = address(0xBEEF);
    address private constant OUTSIDER = address(0xCAFE);
    uint256 private constant INITIAL_SUPPLY = 1_000_000 ether;
    uint256 private constant TRANSFER_AMOUNT = 25 ether;

    DemoToken private token;
    DemoEventOnly private eventOnly;

    function setUp() public {
        token = new DemoToken(INITIAL_SUPPLY);
        eventOnly = new DemoEventOnly();
    }

    function testRealTransferChangesBalancesAndEmitsFromToken() public {
        vm.expectEmit(true, true, false, true, address(token));
        emit Transfer(address(this), RECIPIENT, TRANSFER_AMOUNT);

        bool success = token.transfer(RECIPIENT, TRANSFER_AMOUNT);

        assert(success);
        assert(token.balanceOf(address(this)) == INITIAL_SUPPLY - TRANSFER_AMOUNT);
        assert(token.balanceOf(RECIPIENT) == TRANSFER_AMOUNT);
    }

    function testEventOnlyEmitsTransferShapeWithoutChangingTokenBalances() public {
        uint256 senderBalanceBefore = token.balanceOf(address(this));
        uint256 recipientBalanceBefore = token.balanceOf(RECIPIENT);

        vm.expectEmit(true, true, false, true, address(eventOnly));
        emit Transfer(address(this), RECIPIENT, TRANSFER_AMOUNT);
        eventOnly.emitTransfer(address(this), RECIPIENT, TRANSFER_AMOUNT);

        assert(token.balanceOf(address(this)) == senderBalanceBefore);
        assert(token.balanceOf(RECIPIENT) == recipientBalanceBefore);
    }

    function testEventOnlyRejectsNonOwner() public {
        vm.prank(OUTSIDER);
        vm.expectRevert(DemoEventOnly.Unauthorized.selector);
        eventOnly.emitTransfer(OUTSIDER, RECIPIENT, TRANSFER_AMOUNT);
    }
}
