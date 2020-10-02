import util = require("util");
import * as core from '@actions/core';
import { IAuthorizer } from 'azure-actions-webclient/Authorizer/IAuthorizer';

export class KeyVaultActionParameters {

    public keyVaultName: string;
    public secretsFilter: string;
    public keyVaultUrl: string;
    public environment: string;
D
    public getKeyVaultActionParameters(handler: IAuthorizer) : KeyVaultActionParameters {
        this.environment = core.getInput("environment");
        this.keyVaultName = core.getInput("keyvault");
        this.secretsFilter = core.getInput("secrets");

        if (!this.keyVaultName) {
            core.setFailed("Vault name not provided.");
        }

        if (!this.secretsFilter) {
            core.setFailed("Secret filter not provided.");
        }

        var azureKeyVaultDnsSuffix = handler.getCloudSuffixUrl("keyvaultDns").substring(1);
        this.keyVaultUrl = util.format("https://%s.%s", this.keyVaultName, azureKeyVaultDnsSuffix);
        return this;
    }
}