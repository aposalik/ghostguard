// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title GhostGuard Demo Token
/// @notice Minimal ERC-20 used to demonstrate a transfer backed by real balance changes.
contract DemoToken {
    string public constant name = "GhostGuard Demo Token";
    string public constant symbol = "GGD";
    uint8 public constant decimals = 18;

    uint256 public immutable totalSupply;

    mapping(address account => uint256 balance) public balanceOf;
    mapping(address owner => mapping(address spender => uint256 amount)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error InsufficientAllowance();
    error InsufficientBalance();
    error InvalidReceiver();
    error InvalidSpender();

    constructor(uint256 initialSupply) {
        totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply;
        emit Transfer(address(0), msg.sender, initialSupply);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert InvalidSpender();

        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 availableAllowance = allowance[from][msg.sender];
        if (availableAllowance < amount) revert InsufficientAllowance();

        if (availableAllowance != type(uint256).max) {
            unchecked {
                allowance[from][msg.sender] = availableAllowance - amount;
            }
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }

        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) private {
        if (to == address(0)) revert InvalidReceiver();

        uint256 senderBalance = balanceOf[from];
        if (senderBalance < amount) revert InsufficientBalance();

        unchecked {
            balanceOf[from] = senderBalance - amount;
        }
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
    }
}
