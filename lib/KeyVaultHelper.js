"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const KeyVaultClient_1 = require("./KeyVaultClient");
const util = require("util");
class AzureKeyVaultSecret {
}
exports.AzureKeyVaultSecret = AzureKeyVaultSecret;
class KeyVaultHelper {
    constructor(handler, timeOut, keyVaultActionParameters) {
        this.keyVaultActionParameters = keyVaultActionParameters;
        this.keyVaultClient = new KeyVaultClient_1.KeyVaultClient(handler, timeOut, keyVaultActionParameters.keyVaultUrl);
    }
    downloadSecrets() {
        var downloadAllSecrets = false;
        if (this.keyVaultActionParameters.secretsFilter && this.keyVaultActionParameters.secretsFilter.length === 1 && this.keyVaultActionParameters.secretsFilter[0] === "*") {
            downloadAllSecrets = true;
        }
        if (downloadAllSecrets) {
            return this.downloadAllSecrets();
        }
        else {
            return this.downloadSelectedSecrets(this.keyVaultActionParameters.secretsFilter);
        }
    }
    downloadAllSecrets() {
        return new Promise((resolve, reject) => {
            this.keyVaultClient.getSecrets("", (error, listOfSecrets) => {
                if (error) {
                    return reject(core.debug(util.format("Get Secrets Failed \n%s", this.getError(error))));
                }
                if (listOfSecrets.length == 0) {
                    core.debug(util.format("No secrets found in the vault %s", this.keyVaultActionParameters.keyVaultName));
                    return resolve();
                }
                console.log(util.format("Number of secrets found in keyvault %s: %s", this.keyVaultActionParameters.keyVaultName, listOfSecrets.length));
                listOfSecrets = this.filterDisabledAndExpiredSecrets(listOfSecrets);
                console.log(util.format("Number of enabled secrets found in keyvault %s: %s", this.keyVaultActionParameters.keyVaultName, listOfSecrets.length));
                var getSecretValuePromises = [];
                listOfSecrets.forEach((secret, index) => {
                    getSecretValuePromises.push(this.downloadSecretValue(secret.name));
                });
                Promise.all(getSecretValuePromises).then(() => {
                    return resolve();
                });
            });
        });
    }
    downloadSelectedSecrets(secretsFilter) {
        let selectedSecrets = [];
        if (secretsFilter) {
            selectedSecrets = secretsFilter.split(',');
        }
        return new Promise((resolve, reject) => {
            var getSecretValuePromises = [];
            selectedSecrets.forEach((secretName) => {
                getSecretValuePromises.push(this.downloadSecretValue(secretName));
            });
            Promise.all(getSecretValuePromises).then(() => {
                return resolve();
            }, error => {
                return reject(new Error("Downloading selected secrets failed"));
            });
        });
    }
    downloadSecretValue(secretName) {
        secretName = secretName.trim();
        return new Promise((resolve, reject) => {
            this.keyVaultClient.getSecretValue(secretName, (error, secretValue) => {
                if (error) {
                    core.setFailed(util.format("Could not download the secret %s", secretName));
                }
                else {
                    this.setVaultVariable(secretName, secretValue);
                }
                return resolve();
            });
        });
    }
    setVaultVariable(secretName, secretValue) {
        if (!secretValue) {
            return;
        }
        core.setSecret(secretValue);
        core.exportVariable(secretName, secretValue);
        core.setOutput(secretName, secretValue);
    }
    filterDisabledAndExpiredSecrets(listOfSecrets) {
        var result = [];
        var now = new Date();
        listOfSecrets.forEach((value, index) => {
            if (value.enabled && (!value.expires || value.expires > now)) {
                result.push(value);
            }
        });
        return result;
    }
    getError(error) {
        core.debug(JSON.stringify(error));
        if (error && error.message) {
            return error.message;
        }
        return error;
    }
}
exports.KeyVaultHelper = KeyVaultHelper;
