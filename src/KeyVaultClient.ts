import * as core from '@actions/core';
import util = require("util");
import { AzureKeyVaultSecret } from "./KeyVaultHelper";
import { IAuthorizer } from 'azure-actions-webclient/Authorizer/IAuthorizer';
import { WebRequest, WebResponse } from 'azure-actions-webclient/WebClient';
import { ServiceClient as AzureRestClient, ToError, AzureError, ApiCallback, ApiResult } from 'azure-actions-webclient/AzureRestClient'

export class KeyVaultClient extends AzureRestClient {    
    private keyVaultUrl: string;
    private apiVersion: string = "7.0";
    private tokenArgs: string[] = ["--resource", "https://vault.azure.net"];
    
    constructor(endpoint: IAuthorizer, timeOut: number, keyVaultUrl: string) {
        super(endpoint, timeOut);
        this.keyVaultUrl = keyVaultUrl;
        var keyvaultDns = endpoint.getCloudSuffixUrl("keyvaultDns").substring(1);
        this.tokenArgs[1] = "https://" + keyvaultDns;
    }

    public async invokeRequest(request: WebRequest): Promise<WebResponse> {
        try {
            var response = await this.beginRequest(request, this.tokenArgs);
            return response;
        } catch(exception) {
            throw exception;
        }
    }
    
    public getSecrets(nextLink: string, callback: ApiCallback) {
        if (!callback) {
            core.debug("Callback Cannot Be Null");
            throw new Error("Callback Cannot Be Null");
        }

        // Create HTTP transport objects
        var url = nextLink;
        if (!url)
        {
            url = this.getRequestUriForbaseUrl(
                this.keyVaultUrl,
                '/secrets',
                {},
                ['maxresults=25'],
                this.apiVersion);
        }

        var httpRequest: WebRequest = {
            method: 'GET',
            headers: {},
            uri: url,
        }        

        console.log("Downloading Secrets From", url);
        
        this.invokeRequest(httpRequest).then(async (response: WebResponse) => {
            var result = [];
            if (response.statusCode == 200) {
                if (response.body.value) {
                    result = result.concat(response.body.value);
                }
                
                if (response.body.nextLink) {
                    var nextResult = await this.accumulateResultFromPagedResult(response.body.nextLink);
                    if (nextResult.error) {
                        return new ApiResult(nextResult.error);
                    }
                    result = result.concat(nextResult.result);

                    var listOfSecrets = this.convertToAzureKeyVaults(result);
                    return new ApiResult(null, listOfSecrets);
                }
                else {
                    var listOfSecrets = this.convertToAzureKeyVaults(result);
                    return new ApiResult(null, listOfSecrets);
                }
            }
            else {
                return new ApiResult(ToError(response));
            }
        }).then((apiResult: ApiResult) => callback(apiResult.error, apiResult.result),
            (error) => callback(error));
    }

    public getSecretValue(secretName: string, callback: ApiCallback) {
        if (!callback) {
            core.debug("Callback Cannot Be Null");
            throw new Error("Callback Cannot Be Null");
        }

        // Create HTTP transport objects
        var httpRequest: WebRequest = {
            method: 'GET',
            headers: {},
            uri: this.getRequestUriForbaseUrl(
                this.keyVaultUrl,
                '/secrets/{secretName}',
                {
                    '{secretName}': secretName
                },
                [],
                this.apiVersion
            )
        };        

        this.invokeRequest(httpRequest).then(async (response: WebResponse) => {
            if (response.statusCode == 200) {
                var result = response.body.value;
                return new ApiResult(null, result);
            }
            else if (response.statusCode == 400) {
                return new ApiResult('Get Secret Failed Because Of Invalid Characters', secretName);
            }
            else {
                return new ApiResult(ToError(response));
            }
        }).then((apiResult: ApiResult) => callback(apiResult.error, apiResult.result),
            (error) => callback(error));
    }

    private convertToAzureKeyVaults(result: any[]): AzureKeyVaultSecret[] {
        var listOfSecrets: AzureKeyVaultSecret[] = [];
        result.forEach((value: any, index: number) => {
            var expires;
            if (value.attributes.exp)
            {
                expires = new Date(0);
                expires.setSeconds(parseInt(value.attributes.exp));
            }

            var secretIdentifier: string = value.id;
            var lastIndex = secretIdentifier.lastIndexOf("/");
            var name: string = secretIdentifier.substr(lastIndex + 1, secretIdentifier.length);

            var azkvSecret: AzureKeyVaultSecret = {
                name: name,
                contentType: value.contentType,
                enabled: value.attributes.enabled,
                expires: expires
            };

            listOfSecrets.push(azkvSecret);
        });

        return listOfSecrets;
    }
}