"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const AzureRestClient_1 = require("azure-actions-webclient/AzureRestClient");
class KeyVaultClient extends AzureRestClient_1.ServiceClient {
    constructor(endpoint, timeOut, keyVaultUrl) {
        super(endpoint, timeOut);
        this.apiVersion = "7.0";
        this.tokenArgs = ["--resource", "https://vault.azure.net"];
        this.keyVaultUrl = keyVaultUrl;
        var keyvaultDns = endpoint.getCloudSuffixUrl("keyvaultDns").substring(1);
        this.tokenArgs[1] = "https://" + keyvaultDns;
    }
    invokeRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                var response = yield this.beginRequest(request, this.tokenArgs);
                return response;
            }
            catch (exception) {
                throw exception;
            }
        });
    }
    getSecrets(nextLink, callback) {
        if (!callback) {
            core.debug("Callback Cannot Be Null");
            throw new Error("Callback Cannot Be Null");
        }
        // Create HTTP transport objects
        var url = nextLink;
        if (!url) {
            url = this.getRequestUriForbaseUrl(this.keyVaultUrl, '/secrets', {}, ['maxresults=25'], this.apiVersion);
        }
        var httpRequest = {
            method: 'GET',
            headers: {},
            uri: url,
        };
        console.log("Downloading Secrets From", url);
        this.invokeRequest(httpRequest).then((response) => __awaiter(this, void 0, void 0, function* () {
            var result = [];
            if (response.statusCode == 200) {
                if (response.body.value) {
                    result = result.concat(response.body.value);
                }
                if (response.body.nextLink) {
                    var nextResult = yield this.accumulateResultFromPagedResult(response.body.nextLink);
                    if (nextResult.error) {
                        return new AzureRestClient_1.ApiResult(nextResult.error);
                    }
                    result = result.concat(nextResult.result);
                    var listOfSecrets = this.convertToAzureKeyVaults(result);
                    return new AzureRestClient_1.ApiResult(null, listOfSecrets);
                }
                else {
                    var listOfSecrets = this.convertToAzureKeyVaults(result);
                    return new AzureRestClient_1.ApiResult(null, listOfSecrets);
                }
            }
            else {
                return new AzureRestClient_1.ApiResult(AzureRestClient_1.ToError(response));
            }
        })).then((apiResult) => callback(apiResult.error, apiResult.result), (error) => callback(error));
    }
    getSecretValue(secretName, callback) {
        if (!callback) {
            core.debug("Callback Cannot Be Null");
            throw new Error("Callback Cannot Be Null");
        }
        // Create HTTP transport objects
        var httpRequest = {
            method: 'GET',
            headers: {},
            uri: this.getRequestUriForbaseUrl(this.keyVaultUrl, '/secrets/{secretName}', {
                '{secretName}': secretName
            }, [], this.apiVersion)
        };
        this.invokeRequest(httpRequest).then((response) => __awaiter(this, void 0, void 0, function* () {
            if (response.statusCode == 200) {
                var result = response.body.value;
                return new AzureRestClient_1.ApiResult(null, result);
            }
            else if (response.statusCode == 400) {
                return new AzureRestClient_1.ApiResult('Get Secret Failed Because Of Invalid Characters', secretName);
            }
            else {
                return new AzureRestClient_1.ApiResult(AzureRestClient_1.ToError(response));
            }
        })).then((apiResult) => callback(apiResult.error, apiResult.result), (error) => callback(error));
    }
    convertToAzureKeyVaults(result) {
        var listOfSecrets = [];
        result.forEach((value, index) => {
            var expires;
            if (value.attributes.exp) {
                expires = new Date(0);
                expires.setSeconds(parseInt(value.attributes.exp));
            }
            var secretIdentifier = value.id;
            var lastIndex = secretIdentifier.lastIndexOf("/");
            var name = secretIdentifier.substr(lastIndex + 1, secretIdentifier.length);
            var azkvSecret = {
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
exports.KeyVaultClient = KeyVaultClient;
