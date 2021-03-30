import * as core from '@actions/core';
import * as crypto from "crypto";
import { AuthorizerFactory } from 'azure-actions-webclient/AuthorizerFactory';
import { IAuthorizer } from 'azure-actions-webclient/Authorizer/IAuthorizer';
import { KeyVaultActionParameters } from './KeyVaultActionParameters';
import { KeyVaultHelper } from './KeyVaultHelper';
import * as exec from '@actions/exec';
import * as io from '@actions/io';

var azPath: string;
var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";
async function run() {
    try {
        let usrAgentRepo = crypto.createHash('sha256').update(`${process.env.GITHUB_REPOSITORY}`).digest('hex');
        let actionName = 'GetKeyVaultSecrets';
        let userAgentString = (!!prefix ? `${prefix}+` : '') + `GITHUBACTIONS_${actionName}_${usrAgentRepo}`;
        core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString);

        let handler: IAuthorizer = null;

        try {
            handler = await AuthorizerFactory.getAuthorizer();
        }
        catch (error) {
            core.setFailed("Could not login to Azure.")
        }

        if (handler != null) {
            var actionParameters = new KeyVaultActionParameters().getKeyVaultActionParameters(handler);
            var keyVaultHelper = new KeyVaultHelper(handler, 100, actionParameters);  
            azPath = await io.which("az", true);
            var environment = await executeAzCliCommand("cloud show --query name");
            environment = environment.replace(/"|\s/g, '');
            console.log('Running keyvault action against ' + environment);
            if (environment.toLowerCase() == "azurestack") {
                await keyVaultHelper.initKeyVaultClient();
            }    
            keyVaultHelper.downloadSecrets();
        }        
    } catch (error) {
        core.debug("Get secret failed with error: " + error);
        core.setFailed(!!error.message ? error.message : "Error occurred in fetching the secrets.");
    }
    finally {
        core.exportVariable('AZURE_HTTP_USER_AGENT', prefix);
    }
}

async function executeAzCliCommand(command: string) {
    let stdout = '';
    let stderr = '';
    try {
        core.debug(`"${azPath}" ${command}`);
        await exec.exec(`"${azPath}" ${command}`, [], {
            silent: true, // this will prevent priniting access token to console output
            listeners: {
                stdout: (data: Buffer) => { stdout += data.toString(); },
                stderr: (data: Buffer) => { stderr += data.toString(); }
            }
        });
    } catch (error) {
        throw new Error(stderr);
    }
    return stdout;
}

run();