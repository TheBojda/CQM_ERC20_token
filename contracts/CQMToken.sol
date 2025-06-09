// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract CQMToken is ERC20, ERC20Burnable, Ownable2Step, ERC20Permit {
    constructor(
        address initialOwner
    ) ERC20("CQM", "CQM") Ownable(initialOwner) ERC20Permit("CQMToken") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // -- Meta transacion support --

    error CQMExpiredSignature(uint256 deadline);
    error CQMInvalidSigner(address signer, address owner);

    bytes32 constant TRANSFER_TYPEHASH =
        keccak256(
            "Transfer(address from,address to,uint256 amount,uint256 nonce,uint256 deadline)"
        );

    function metaTransfer(
        address from,
        address to,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        if (block.timestamp > deadline) {
            revert CQMExpiredSignature(deadline);
        }

        bytes32 structHash = keccak256(
            abi.encode(
                TRANSFER_TYPEHASH,
                from,
                to,
                amount,
                _useNonce(from),
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(hash, v, r, s);
        if (signer != from) {
            revert CQMInvalidSigner(signer, from);
        }

        _transfer(signer, to, amount);
    }
}
