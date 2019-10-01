import Web3 from 'web3';
import browser from 'webextension-polyfill';
import Web3Service from '~/utils/Web3Service';
import defaultContractConfig from '~config/contracts';
import {
    errorLog,
} from '~utils/log';


// The goals of the web3 service
// In the background
// 1. return to the developer the correct Web3Instance with contract ABI's and addresses for interacting with the same
// contract as metamask.
// 2. send transactions from the users address TODO replace with GSN.
// 3. provide EVENT apis for syncing
//
//
// The service needs to be initialised with a config for each network. The client scripts should copy contract addresses
// into this config.
//


class NetworkSwitcher {
    constructor() {
        this.networkId = 0;
        browser.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.networkId) {
                this.networkId = changes.networkId.newValue;
            }
        });
    }

    web3ServicesByNetworks = {};

    networksConfigs = {};

    ensureWeb3Service = (account) => {
        const config = this.networksConfigs[this.networkId];
        if (!config) {
            errorLog(`No network config for such networkId: ${this.networkId}`);
            return;
        }
        if (this.web3ServicesByNetworks[this.networkId]) {
            return;
        }
        const {
            providerUrl,
            contractsConfigs = [],
        } = config;

        const service = new Web3Service();
        const provider = new Web3.providers.WebsocketProvider(providerUrl);
        service.init({
            provider,
            account,
        });
        for (let i = 0; i < contractsConfigs.length; i += 1) {
            const contractConfig = contractsConfigs[i];
            if (contractConfig.bytecode === '0x') {
                service.registerInterface(contractConfig);
            } else {
                service.registerContract(contractConfig);
            }
        }
        this.web3ServicesByNetworks[this.networkId] = service;
    };

    setConfigs(networksConfigs) {
        if (!networksConfigs) {
            errorLog('Config should not be null in Web3ServiceFactory');
            return;
        }

        if (!Array.isArray(networksConfigs)) {
            errorLog('"networksConfigs" should be array of elements');
            return;
        }

        const tempConfig = {};
        for (let i = 0; i < networksConfigs.length; i += 1) {
            const {
                title,
                networkId,
                providerUrl,
            } = networksConfigs[i];

            if (!title || (!networkId && networkId !== 0) || !providerUrl) {
                errorLog(`Network Config must consist of title, networkId and providerUrl fields. Was provided: ${JSON.stringify(networksConfigs[i])}`);
                return;
            }

            tempConfig[networkId] = networksConfigs[i];
        }

        this.networksConfigs = tempConfig;
    }

    getConfigs() {
        return {
            ...this.networksConfigs,
        };
    }

    create(account) {
        this.ensureWeb3Service(account);
        return this.web3ServicesByNetworks[this.networkId];
    }
}

export default new NetworkSwitcher();
