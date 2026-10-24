// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {DemoEventOnly} from "../src/DemoEventOnly.sol";
import {DemoToken} from "../src/DemoToken.sol";

interface Vm {
    function startBroadcast() external;

    function stopBroadcast() external;
}

/// @notice Deploys both controlled demo contracts and creates their seed events.
contract DeployAndSeed {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    error InvalidInitialSupply();
    error InvalidRecipient();
    error InvalidTransferAmount();

    function run(address recipient, uint256 initialSupply, uint256 transferAmount)
        external
        returns (DemoToken token, DemoEventOnly eventOnly)
    {
        if (recipient == address(0)) revert InvalidRecipient();
        if (initialSupply == 0) revert InvalidInitialSupply();
        if (transferAmount == 0 || transferAmount > initialSupply) revert InvalidTransferAmount();

        vm.startBroadcast();

        token = new DemoToken(initialSupply);
        eventOnly = new DemoEventOnly();

        token.transfer(recipient, transferAmount);
        eventOnly.emitTransfer(msg.sender, recipient, transferAmount);

        vm.stopBroadcast();
    }
}
