"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const crypto = __importStar(require("crypto"));
const AuthorizerFactory_1 = require("azure-actions-webclient/AuthorizerFactory");
const KeyVaultActionParameters_1 = require("./KeyVaultActionParameters");
const KeyVaultHelper_1 = require("./KeyVaultHelper");
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
var azPath;
var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let usrAgentRepo = crypto.createHash('sha256').update(`${process.env.GITHUB_REPOSITORY}`).digest('hex');
            let actionName = 'GetKeyVaultSecrets';
            let userAgentString = (!!prefix ? `${prefix}+` : '') + `GITHUBACTIONS_${actionName}_${usrAgentRepo}`;
            core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString);
            let handler = null;
            try {
                handler = yield AuthorizerFactory_1.AuthorizerFactory.getAuthorizer();
            }
            catch (error) {
                core.setFailed("Could not login to Azure.");
            }
            if (handler != null) {
                var actionParameters = new KeyVaultActionParameters_1.KeyVaultActionParameters().getKeyVaultActionParameters(handler);
                var keyVaultHelper = new KeyVaultHelper_1.KeyVaultHelper(handler, 100, actionParameters);
                azPath = yield io.which("az", true);
                var environment = yield executeAzCliCommand("cloud show --query name");
                environment = environment.replace(/"|\s/g, '');
                console.log('Running keyvault action against ' + environment);
                if (environment.toLowerCase() == "azurestack") {
                    yield keyVaultHelper.initKeyVaultClient();
                }
                keyVaultHelper.downloadSecrets();
            }
        }
        catch (error) {
            core.debug("Get secret failed with error: " + error);
            core.setFailed(!!error.message ? error.message : "Error occurred in fetching the secrets.");
        }
        finally {
            core.exportVariable('AZURE_HTTP_USER_AGENT', prefix);
        }
    });
}
function executeAzCliCommand(command) {
    return __awaiter(this, void 0, void 0, function* () {
        let stdout = '';
        let stderr = '';
        try {
            core.debug(`"${azPath}" ${command}`);
            yield exec.exec(`"${azPath}" ${command}`, [], {
                silent: true,
                listeners: {
                    stdout: (data) => { stdout += data.toString(); },
                    stderr: (data) => { stderr += data.toString(); }
                }
            });
        }
        catch (error) {
            throw new Error(stderr);
        }
        return stdout;
    });
}
run();
