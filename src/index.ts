import 'bootstrap';
import * as bootstrap from 'bootstrap';
import './style.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import detectEthereumProvider from '@metamask/detect-provider';
import { Html5Qrcode } from "html5-qrcode";
import copy from "copy-to-clipboard";
import QRCode from 'qrcode';
import { JsonRpcProvider, Contract, BrowserProvider } from 'ethers';

const CONTRACT_ADDRESS = '0xF988A1b6d4C00832ed3570a4e50DdA4357a22F7D';
const RPC_URL = 'https://rpc.chiadochain.net';

const eip712domain_type_definition = {
    "EIP712Domain": [
        {
            "name": "name",
            "type": "string"
        },
        {
            "name": "version",
            "type": "string"
        },
        {
            "name": "chainId",
            "type": "uint256"
        },
        {
            "name": "verifyingContract",
            "type": "address"
        }
    ]
}

const TransferTypes = {
    "Transfer": [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
    ]
}

class ERC20App {
    private SITE_HOST: string;
    private provider: any;

    constructor() {
        this.SITE_HOST = window.location.host;
        window.addEventListener('hashchange', this.handleHashChange.bind(this));
        window.addEventListener('load', this.onLoad.bind(this));
    }

    private async getProvider(): Promise<any> {
        if (!this.provider) {
            this.provider = await detectEthereumProvider();
            if (!this.provider) {
                return null;
            }
        }
        return this.provider;
    }

    // -- PAGE LOGIC --

    private showPage(pageId: string): void {
        document.querySelectorAll<HTMLElement>('.page').forEach(page => {
            page.classList.add('d-none');
        });

        const target = document.getElementById(`page-${pageId}`);
        if (target) {
            target.classList.remove('d-none');
        }
    }

    private async handleHashChange(): Promise<void> {
        const hash = window.location.hash.slice(1);
        const [page] = hash.split('?');

        switch (page) {
            case 'direct':
                this.showPage('direct');
                break;
            case 'process':
                this.showPage('process');
                break;
            case 'request':
                this.showPage('request');
                break;
            case 'sign':
                this.showPage('sign');
                const params = new URLSearchParams(window.location.hash.split('?')[1]);
                const address = params.get('address');
                const amount = params.get('amount');

                const signToAddressElement = document.getElementById('sign-to-address') as HTMLInputElement;
                const signAmountElement = document.getElementById('sign-amount') as HTMLInputElement;

                if (signToAddressElement && address) {
                    signToAddressElement.value = address;
                }

                if (signAmountElement && amount) {
                    signAmountElement.value = amount;
                }
                break;
            default:
                this.showPage('main');
        }

        // Update the Ethereum address and balance when the page loads
        setTimeout(async () => {
            const provider = await this.getProvider();
            if (provider && (provider as any).request) {
                try {
                    const accounts = await (provider as any).request({
                        method: 'eth_requestAccounts'
                    });
                    const addressElement = document.getElementById('request-eth-address') as HTMLInputElement;
                    if (addressElement && accounts[0]) {
                        addressElement.value = accounts[0];
                    }
                    const signFromAddressElement = document.getElementById('sign-from-address') as HTMLInputElement;
                    if (signFromAddressElement && accounts[0]) {
                        signFromAddressElement.value = accounts[0];
                    }
                    const balanceElement = document.getElementById('balance') as HTMLElement;
                    if (balanceElement && accounts[0]) {
                        const ethersProvider = new JsonRpcProvider(RPC_URL);
                        const abi = [
                            "function balanceOf(address account) public view returns (uint256)"
                        ];
                        const contract = new Contract(CONTRACT_ADDRESS, abi, ethersProvider);
                        const rawBalance = await contract.balanceOf(accounts[0]);
                        const formattedBalance = Math.floor(parseFloat(rawBalance.toString()) / Math.pow(10, 18)).toString();
                        balanceElement.innerText = formattedBalance + ' CQM';
                    }
                } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : String(e);
                    console.error('Failed to get Ethereum address:', message);
                }
            }
        }, 3000);
    }

    private async onLoad() {
        this.handleHashChange();
        this.addEventHandlers();
    }

    private addEventHandlers() {
        const addChiadoBtn = document.getElementById('add-chiado-btn');
        if (addChiadoBtn) {
            addChiadoBtn.onclick = this.handleAddChiado.bind(this);
        }

        const addCqmBtn = document.getElementById('add-cqm-btn');
        if (addCqmBtn) {
            addCqmBtn.onclick = this.handleAddCqm.bind(this);
        }

        const contractAddressElement = document.getElementById('contract-address');
        if (contractAddressElement) {
            contractAddressElement.onclick = this.handleCopyContractAddress.bind(this);
        }

        const generateQrBtn = document.getElementById('generate-qr');
        if (generateQrBtn) {
            generateQrBtn.onclick = this.handleGenerateQr.bind(this);
        }

        const signTransferBtn = document.getElementById('sign-transfer-btn');
        if (signTransferBtn) {
            signTransferBtn.onclick = this.handleSignTransfer.bind(this);
        }

        const startQrReaderBtn = document.getElementById('start-qr-reader-btn');
        if (startQrReaderBtn) {
            startQrReaderBtn.onclick = this.handleStartQrReader.bind(this);
        }

        const directScanQrBtn = document.getElementById('direct-scan-qr-btn');
        if (directScanQrBtn) {
            directScanQrBtn.onclick = this.handleDirectScanQr.bind(this);
        }

        const directTransferBtn = document.getElementById('direct-transfer-btn');
        if (directTransferBtn) {
            directTransferBtn.onclick = this.handleDirectTransfer.bind(this);
        }
    }

    // -- HANDLERS --

    private async handleAddChiado() {
        const provider = await this.getProvider();
        if (provider && (provider as any).request) {
            try {
                await (provider as any).request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x27d8', // 10200 in hex
                        chainName: 'Gnosis Chiado Testnet',
                        nativeCurrency: {
                            name: 'XDAI',
                            symbol: 'XDAI',
                            decimals: 18
                        },
                        rpcUrls: ['https://rpc.chiadochain.net'],
                        blockExplorerUrls: ['https://blockscout.chiadochain.net']
                    }]
                });
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                alert('Failed to add Chiado Testnet: ' + message);
            }
        } else {
            alert('MetaMask is not detected.');
        }
    }

    private async handleAddCqm() {
        const provider = await this.getProvider();
        if (provider && (provider as any).request) {
            try {
                await (provider as any).request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: 'ERC20',
                        options: {
                            address: CONTRACT_ADDRESS,
                            symbol: 'CQM',
                            decimals: 18,
                            image: '' // Optionally add a token image URL
                        }
                    }
                });
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                alert('Failed to add CQM token: ' + message);
            }
        } else {
            alert('MetaMask is not detected.');
        }
    }

    private handleCopyContractAddress() {
        try {
            copy(CONTRACT_ADDRESS);
            alert('Contract address copied to clipboard!');
        } catch (e) {
            alert('Failed to copy contract address to clipboard');
        }
    }

    private handleGenerateQr() {
        const addressElement = document.getElementById('request-eth-address') as HTMLInputElement;
        const amountElement = document.getElementById('request-amount') as HTMLInputElement;
        const qrCodePopup = document.getElementById('request-qr-code-modal');
        const container = document.getElementById('qr-code-container');

        if (addressElement && amountElement && qrCodePopup && container) {
            const ethAddress = addressElement.value;
            const requestAmount = amountElement.value;

            if (!ethAddress) {
                alert('Ethereum address is required.');
                return;
            }

            if (!requestAmount) {
                alert('Request amount is required.');
                return;
            }

            const qrData = `https://metamask.app.link/dapp/${this.SITE_HOST}#sign?address=${ethAddress}&amount=${requestAmount}`;
            try {
                container.innerHTML = '';
                QRCode.toCanvas(qrData, { width: 256 }, (err, canvas) => {
                    if (err) return;
                    container.appendChild(canvas);

                    // Use Bootstrap's modal API to show the modal
                    const modal = new bootstrap.Modal(qrCodePopup);
                    modal.show();
                });
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                alert('Failed to generate QR code: ' + message);
            }
        } else {
            alert('Required elements are missing.');
        }
    }

    private async handleSignTransfer() {
        const provider = await this.getProvider();
        if (provider && (provider as any).request) {
            const fromAddressElement = document.getElementById('sign-from-address') as HTMLInputElement;
            const toAddressElement = document.getElementById('sign-to-address') as HTMLInputElement;
            const amountElement = document.getElementById('sign-amount') as HTMLInputElement;

            if (!fromAddressElement || !toAddressElement || !amountElement) {
                alert('Required fields are missing.');
                return;
            }

            const fromAddress = fromAddressElement.value;
            const toAddress = toAddressElement.value;
            const amount = (parseFloat(amountElement.value) * Math.pow(10, 18)).toString();

            if (!fromAddress || !toAddress || !amount) {
                alert('All fields are required.');
                return;
            }

            if (provider && (provider as any).request) {
                const ethersProvider = new JsonRpcProvider(RPC_URL);
                const abi = [
                    "function nonces(address owner) view returns (uint256)"
                ];
                const contract = new Contract(CONTRACT_ADDRESS, abi, ethersProvider);
                const nonce = await contract.nonces(fromAddress);
                const block = await ethersProvider.getBlock('latest');
                if (!block) {
                    throw new Error('Failed to fetch the latest block.');
                }
                const currentTimestamp = block.timestamp;
                const deadline = currentTimestamp + 86400; // Add 1 day (86400 seconds)

                const accounts = await (provider as any).request({
                    method: 'eth_requestAccounts'
                });

                const chainId = await (provider as any).request({ method: 'eth_chainId' });
                const domain = {
                    name: 'CQMToken',
                    version: '1',
                    chainId: parseInt(chainId, 16),
                    verifyingContract: CONTRACT_ADDRESS
                };

                const message = {
                    from: fromAddress,
                    to: toAddress,
                    amount,
                    nonce: nonce.toString(),
                    deadline: deadline.toString()
                }

                const metamask_request = {
                    "types": {
                        ...eip712domain_type_definition,
                        ...TransferTypes
                    },
                    "primaryType": "Transfer",
                    domain,
                    message
                }

                try {
                    let signature = await (provider as any).request({
                        "method": "eth_signTypedData_v4",
                        "params": [
                            accounts[0],
                            JSON.stringify(metamask_request)
                        ]
                    })

                    const qrCodePopup = document.getElementById('sign-qr-code-modal');
                    const container = document.getElementById('sign-qr-code-container');
                    if (qrCodePopup && container) {
                        const qrData = `${fromAddress}:${toAddress}:${amount}:${nonce.toString()}:${deadline.toString()}:${signature}`;
                        try {
                            container.innerHTML = '';
                            QRCode.toCanvas(qrData, { width: 256 }, (err, canvas) => {
                                if (err) return;
                                container.appendChild(canvas);

                                // Use Bootstrap's modal API to show the modal
                                const modal = new bootstrap.Modal(qrCodePopup);
                                modal.show();
                            });
                        } catch (e: unknown) {
                            const message = e instanceof Error ? e.message : String(e);
                            alert('Failed to generate QR code: ' + message);
                        }
                    }
                } catch (e) {
                    const message = e instanceof Error ? e.message : JSON.stringify(e);
                    alert("Signature request failed: " + message);
                }
            } else {
                alert('MetaMask is not detected.');
            }
        }
    }

    private splitSignature(signature: string): { r: string; s: string; v: number } {
        if (signature.startsWith("0x")) signature = signature.slice(2);
        if (signature.length !== 130) throw new Error("Invalid signature length");

        const r = "0x" + signature.slice(0, 64);
        const s = "0x" + signature.slice(64, 128);
        let v = parseInt(signature.slice(128, 130), 16);

        // Normalize v (some sources use 0/1 instead of 27/28)
        if (v < 27) v += 27;

        return { r, s, v };
    }

    private async handleStartQrReader() {
        const provider = await this.getProvider();
        const qrReaderDiv = document.getElementById('qr-reader');
        const qrResultElement = document.getElementById('qr-result') as HTMLInputElement;

        if (qrReaderDiv && qrResultElement) {
            qrReaderDiv.innerHTML = ''; // Clear previous content

            const html5QrCode = new Html5Qrcode("qr-reader");
            html5QrCode.start(
                { facingMode: "environment" }, // Use the environment camera
                {
                    fps: 10, // Frames per second for scanning
                    qrbox: { width: 250, height: 250 } // Size of the scanning box
                },
                (decodedText) => {
                    qrResultElement.value = decodedText; // Set the decoded text to the input field
                    html5QrCode.stop(); // Stop scanning after a successful read
                    const parts = decodedText.split(':');
                    if (parts.length === 6) {
                        const [fromAddress, toAddress, amount, nonce, deadline, signature] = parts;
                        const parsedData = new Map<string, string>([
                            ['fromAddress', fromAddress],
                            ['toAddress', toAddress],
                            ['amount', amount],
                            ['nonce', nonce],
                            ['deadline', deadline],
                            ['signature', signature]
                        ]);
                        console.log('Parsed QR Code Data:', parsedData);
                        const { v, r, s } = this.splitSignature(signature);

                        const ethersProvider = new BrowserProvider(provider);
                        const abi = [
                            "function metaTransfer(address from,address to,uint256 amount,uint256 deadline,uint8 v,bytes32 r,bytes32 s)"
                        ];
                        const callContract = async () => {
                            const signer = await ethersProvider.getSigner();
                            const contract = new Contract(CONTRACT_ADDRESS, abi, signer);
                            contract.metaTransfer(
                                fromAddress,
                                toAddress,
                                amount,
                                deadline,
                                v,
                                r,
                                s
                            )
                        }
                        callContract()
                    } else {
                        console.error('Invalid QR Code format.');
                    }
                },
                (errorMessage) => {
                    console.warn(`QR Code scanning error: ${errorMessage}`);
                }
            ).catch((err) => {
                console.error(`Failed to start QR Code scanning: ${err}`);
                alert('Failed to start QR Code scanning.');
            });
        } else {
            alert('Required elements for QR Code scanning are missing.');
        }
    }

    private async handleDirectScanQr() {
        const toAddressElement = document.getElementById('direct-to-address') as HTMLInputElement;
        const html5QrCode = new Html5Qrcode("direct-qr-reader");
        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
                const address = decodedText.split('@')[0].replace('ethereum:', ''); // Extract the address by removing the prefix and chain information
                toAddressElement.value = address; // Set the extracted address to the input field
                html5QrCode.stop();
            },
            (errorMessage) => {
                console.warn(`QR Code scanning error: ${errorMessage}`);
            }
        ).catch((err) => {
            console.error(`Failed to start QR Code scanning: ${err}`);
            alert('Failed to start QR Code scanning.');
        });
    }

    private async handleDirectTransfer() {
        const provider = await this.getProvider();
        const toAddressElement = document.getElementById('direct-to-address') as HTMLInputElement;
        const amountElement = document.getElementById('direct-amount') as HTMLInputElement;

        if (!toAddressElement || !amountElement) {
            alert('Required fields are missing.');
            return;
        }

        const toAddress = toAddressElement.value;
        const amount = (parseFloat(amountElement.value) * Math.pow(10, 18)).toString();

        if (!toAddress || !amount) {
            alert('All fields are required.');
            return;
        }

        const ethersProvider = new BrowserProvider(provider);
        const abi = [
            " function transfer(address to, uint256 value) public returns (bool)"
        ];
        const signer = await ethersProvider.getSigner();
        const contract = new Contract(CONTRACT_ADDRESS, abi, signer);
        await contract.transfer(toAddress, amount)
    }

}

new ERC20App();