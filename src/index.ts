import 'bootstrap';
import './style.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import detectEthereumProvider from '@metamask/detect-provider';
import copy from "copy-to-clipboard";

function showPage(pageId: string): void {
    document.querySelectorAll<HTMLElement>('.page').forEach(page => {
        page.classList.add('d-none');
    });

    const target = document.getElementById(`page-${pageId}`);
    if (target) {
        target.classList.remove('d-none');
    }
}

function handleHashChange(): void {
    const hash = window.location.hash.slice(1);
    switch (hash) {
        case 'request':
            showPage('request');
            break;
        case 'sign':
            showPage('sign');
            break;
        default:
            showPage('main');
    }
}

window.addEventListener('hashchange', handleHashChange);
window.addEventListener('load', handleHashChange);

const addChiadoBtn = document.getElementById('add-chiado-btn');
if (addChiadoBtn) {
    addChiadoBtn.onclick = async () => {
        const provider = await detectEthereumProvider();
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
    };
}

const addCqmBtn = document.getElementById('add-cqm-btn');
if (addCqmBtn) {
    addCqmBtn.onclick = async () => {
        const provider = await detectEthereumProvider();
        if (provider && (provider as any).request) {
            try {
                await (provider as any).request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: 'ERC20',
                        options: {
                            address: '0xF988A1b6d4C00832ed3570a4e50DdA4357a22F7D',
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
    };
}

const contractAddressElement = document.getElementById('contract-address');
if (contractAddressElement) {
    contractAddressElement.onclick = async () => {
        try {
            copy('0xF988A1b6d4C00832ed3570a4e50DdA4357a22F7D');
            alert('Contract address copied to clipboard!');
        } catch (e) {
            alert('Failed to copy contract address to clipboard');
        }
    };
}