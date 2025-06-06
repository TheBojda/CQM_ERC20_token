import { ethers } from "hardhat";
import { CQMToken } from "../typechain-types";
import { assert } from "chai";

describe("CQM ERC20 token test", () => {

    let contract: CQMToken

    let OWNER: any
    let WORKER: any
    let USER: any

    let cqm_domain: any

    before(async () => {
        const signers = await ethers.getSigners()
        OWNER = signers[0]
        WORKER = signers[1]
        USER = signers[2]

        const CQMToken = await ethers.getContractFactory("CQMToken");
        contract = await CQMToken.deploy(OWNER.address)

        cqm_domain = {
            name: "CQMToken",
            version: "1",
            chainId: 31337,
            verifyingContract: await contract.getAddress(),
        }
    })

    it("Mint 1000 CQM token", async () => {
        await contract.mint(OWNER.address, 1000)
        assert.equal(await contract.balanceOf(OWNER.address), ethers.toBigInt(1000))
        await assert.isOk(
            (await contract.queryFilter(contract.filters.Transfer(ethers.ZeroAddress, OWNER.address)))
                .some(event => event.args && event.args.value === ethers.toBigInt(1000)),
            "Transfer event with correct value not emitted"
        )
        assert.equal(await contract.totalSupply(), ethers.toBigInt(1000))
    })

    it("Transfer 100 CQM token to WORKER", async () => {
        await contract.transfer(WORKER.address, 100)
        assert.equal(await contract.balanceOf(WORKER.address), ethers.toBigInt(100))
        assert.equal(await contract.balanceOf(OWNER.address), ethers.toBigInt(900))
        await assert.isOk(
            (await contract.queryFilter(contract.filters.Transfer(OWNER.address, WORKER.address)))
                .some(event => event.args && event.args.value === ethers.toBigInt(100)),
            "Transfer event with correct value not emitted"
        )
    })

    it("Transfer 50 CQM token from WORKER to USER", async () => {
        await contract.connect(WORKER).transfer(USER.address, 50)
        assert.equal(await contract.balanceOf(USER.address), ethers.toBigInt(50))
        assert.equal(await contract.balanceOf(WORKER.address), ethers.toBigInt(50))
        await assert.isOk(
            (await contract.queryFilter(contract.filters.Transfer(WORKER.address, USER.address)))
                .some(event => event.args && event.args.value === ethers.toBigInt(50)),
            "Transfer event with correct value not emitted"
        )
    })

    const PermitTypes = {
        "Permit": [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
        ]
    }

    function splitSignature(signature: string): { r: string; s: string; v: number } {
        if (signature.startsWith("0x")) signature = signature.slice(2);
        if (signature.length !== 130) throw new Error("Invalid signature length");

        const r = "0x" + signature.slice(0, 64);
        const s = "0x" + signature.slice(64, 128);
        let v = parseInt(signature.slice(128, 130), 16);

        // Normalize v (some sources use 0/1 instead of 27/28)
        if (v < 27) v += 27;

        return { r, s, v };
    }

    it("Permit 20 CQM token from USER to WORKER", async () => {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        const currentTimestamp = block != null ? block.timestamp : 0;

        const oneDay = 24 * 60 * 60; // seconds in a day
        const deadline = currentTimestamp + oneDay;

        const nonce = await contract.nonces(USER.address);

        const message = {
            owner: USER.address,
            spender: WORKER.address,
            value: 20,
            nonce,
            deadline
        }

        const signature = await USER.signTypedData(cqm_domain, PermitTypes, message);

        const { v, r, s } = splitSignature(signature);

        await contract.connect(WORKER).permit(USER.address, WORKER.address, 20, deadline, v, r, s);

        await assert.isOk(
            (await contract.queryFilter(contract.filters.Approval(USER.address, WORKER.address)))
                .some(event => event.args && event.args.value === ethers.toBigInt(20)),
            "Approval event with correct value not emitted"
        )
    })

    it("Pull 20 CQM token from USER to WORKER", async () => {
        await contract.connect(WORKER).transferFrom(USER.address, WORKER.address, 20);
        assert.equal(await contract.balanceOf(WORKER.address), ethers.toBigInt(70))
        assert.equal(await contract.balanceOf(USER.address), ethers.toBigInt(30))
        await assert.isOk(
            (await contract.queryFilter(contract.filters.Transfer(USER.address, WORKER.address)))
                .some(event => event.args && event.args.value === ethers.toBigInt(20)),
            "Transfer event with correct value not emitted"
        )
    })

    const TransferTypes = {
        "Transfer": [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
        ]
    }

    it("Transfer 20 CQM token from USER to WORKER by using signature", async () => {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        const currentTimestamp = block != null ? block.timestamp : 0;

        const oneDay = 24 * 60 * 60; // seconds in a day
        const deadline = currentTimestamp + oneDay;

        const nonce = await contract.nonces(USER.address);

        const message = {
            from: USER.address,
            to: WORKER.address,
            amount: 20,
            nonce,
            deadline
        }

        const signature = await USER.signTypedData(cqm_domain, TransferTypes, message);

        const { v, r, s } = splitSignature(signature);

        await contract.connect(WORKER).metaTransfer(USER.address, WORKER.address, 20, deadline, v, r, s);

        assert.equal(await contract.balanceOf(USER.address), ethers.toBigInt(10))
        assert.equal(await contract.balanceOf(WORKER.address), ethers.toBigInt(90))
        await assert.isOk(
            (await contract.queryFilter(contract.filters.Transfer(USER.address, WORKER.address)))
                .some(event => event.args && event.args.value === ethers.toBigInt(20)),
            "Transfer event with correct value not emitted"
        )
    })

    it("Burn 10 CQM token from WORKER", async () => {
        await contract.connect(WORKER).burn(10);
        assert.equal(await contract.balanceOf(WORKER.address), ethers.toBigInt(80))
        await assert.isOk(
            (await contract.queryFilter(contract.filters.Transfer(WORKER.address, ethers.ZeroAddress)))
                .some(event => event.args && event.args.value === ethers.toBigInt(10)),
            "Transfer event with correct value not emitted"
        )
        assert.equal(await contract.totalSupply(), ethers.toBigInt(990))
    })

});