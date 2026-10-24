// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title GhostGuard Event-Only Demo
/// @notice Emits a Transfer-shaped event without maintaining or changing token balances.
contract DemoEventOnly {
    address public immutable owner;

    event Transfer(address indexed from, address indexed to, uint256 value);

    error Unauthorized();

    constructor() {
        owner = msg.sender;
    }

    function emitTransfer(address from, address to, uint256 amount) external {
        if (msg.sender != owner) revert Unauthorized();
        emit Transfer(from, to, amount);
    }
}
