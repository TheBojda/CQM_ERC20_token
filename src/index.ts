import 'bootstrap';
import * as bootstrap from 'bootstrap';
import './style.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import detectEthereumProvider from '@metamask/detect-provider';

// Extend the Window interface to include the ethereum property
import copy from "copy-to-clipboard";
import QRCode from 'qrcode';
import { JsonRpcProvider, Contract } from 'ethers';

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

    private showPage(pageId: string): void {
        document.querySelectorAll<HTMLElement>('.page').forEach(page => {
            page.classList.add('d-none');
        });

        const target = document.getElementById(`page-${pageId}`);
        if (target) {
            target.classList.remove('d-none');
        }
    }

    private handleHashChange(): void {
        const hash = window.location.hash.slice(1);
        const [page] = hash.split('?');

        switch (page) {
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
    }

    private async onLoad() {
        this.handleHashChange();

        this.addEventHandlers();

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
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                console.error('Failed to get Ethereum address:', message);
            }
        }
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
    }

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

            const qrData = `http://${this.SITE_HOST}#sign?address=${ethAddress}&amount=${requestAmount}`;
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
            const amount = amountElement.value;

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
                    name: 'MyETHMeta',
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
}

new ERC20App();