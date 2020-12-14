import * as core from '@actions/core';
import { IAuthorizer } from 'azure-actions-webclient/Authorizer/IAuthorizer';
import { KeyVaultActionParameters } from "./KeyVaultActionParameters";
import { KeyVaultClient } from "./KeyVaultClient";
import util = require("util");

export class AzureKeyVaultSecret {
    name: string;
    enabled: boolean;
    expires: Date | undefined;
    contentType: string;
}

export class KeyVaultHelper {

    private keyVaultActionParameters: KeyVaultActionParameters;
    private keyVaultClient: KeyVaultClient;

    constructor(handler: IAuthorizer, timeOut: number, keyVaultActionParameters: KeyVaultActionParameters) {
        this.keyVaultActionParameters = keyVaultActionParameters;
        this.keyVaultClient = new KeyVaultClient(handler, timeOut, keyVaultActionParameters.keyVaultUrl);
    }

    public downloadSecrets(): Promise<void> {
        var downloadAllSecrets = false;
        if (this.keyVaultActionParameters.secretsFilter && this.keyVaultActionParameters.secretsFilter.length === 1 && this.keyVaultActionParameters.secretsFilter[0] === "*") {
            downloadAllSecrets = true;
        }

        if (downloadAllSecrets) {
            return this.downloadAllSecrets();
        } else {
            return this.downloadSelectedSecrets(this.keyVaultActionParameters.secretsFilter);
        }
    }

    private downloadAllSecrets(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.keyVaultClient.getSecrets("", (error, listOfSecrets) => {
                if (error) {
                    return reject(core.debug(util.format("Get Secrets Failed \n%s", this.getError(error))));
                }

                if (listOfSecrets.length == 0) {
                    core.debug(util.format("No secrets found in the vault %s", this.keyVaultActionParameters.keyVaultName))
                    return resolve();
                }

                console.log(util.format("Number of secrets found in keyvault %s: %s", this.keyVaultActionParameters.keyVaultName, listOfSecrets.length));
                listOfSecrets = this.filterDisabledAndExpiredSecrets(listOfSecrets);
                console.log(util.format("Number of enabled secrets found in keyvault %s: %s", this.keyVaultActionParameters.keyVaultName, listOfSecrets.length));
                
                var getSecretValuePromises: Promise<any>[] = [];
                listOfSecrets.forEach((secret: AzureKeyVaultSecret, index: number) => {
                    getSecretValuePromises.push(this.downloadSecretValue(secret.name));
                });

                Promise.all(getSecretValuePromises).then(() => {
                    return resolve();
                });
            });
        });
    }

    private downloadSelectedSecrets(secretsFilter: string): Promise<void> {
        let selectedSecrets: string[] = [];        
        if (secretsFilter) {
            selectedSecrets = secretsFilter.split(',');
        }
        
        return new Promise<void>((resolve, reject) => {
            var getSecretValuePromises: Promise<any>[] = [];
            selectedSecrets.forEach((secretName: string) => {
                getSecretValuePromises.push(this.downloadSecretValue(secretName));
            });

            Promise.all(getSecretValuePromises).then(() => {
                return resolve();
            }, error => {
                return reject(new Error("Downloading selected secrets failed"));
            });
        });
    }

    private downloadSecretValue(secretName: string): Promise<any> {
        secretName = secretName.trim();

        return new Promise<void>((resolve, reject) => {
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

    private setVaultVariable(secretName: string, secretValue: string): void {
        if (!secretValue) {
            return;
        }

        core.setSecret(secretValue);
        core.exportVariable(secretName, secretValue);
        core.setOutput(secretName, secretValue);
    }

    private filterDisabledAndExpiredSecrets(listOfSecrets: AzureKeyVaultSecret[]): AzureKeyVaultSecret[] {
        var result: AzureKeyVaultSecret[] = [];
        var now: Date = new Date();

        listOfSecrets.forEach((value: AzureKeyVaultSecret, index: number) => {
            if (value.enabled && (!value.expires || value.expires > now)) {
                result.push(value);
            }
        });
        
        return result;
    }

    private getError(error: any): any {
        core.debug(JSON.stringify(error));

        if (error && error.message) {
            return error.message;
        }

        return error;
    }
}