# Deprecation notice

This Action is deprecated. Instead, one can use [azure/cli@v1 action](https://github.com/Azure/cli) and pass a custom script to it to access [azure key vault](https://docs.microsoft.com/en-us/azure/key-vault/secrets/quick-create-cli).
# GitHub Action to fetch secrets from Azure Key Vault

With the Get Key Vault Secrets action, you can fetch secrets from an [Azure Key Vault](https://docs.microsoft.com/en-us/rest/api/keyvault/about-keys--secrets-and-certificates) instance and consume in your GitHub Action workflows.

Get started today with a [free Azure account](https://azure.com/free/open-source)!

The definition of this GitHub Action is in [action.yml](https://github.com/Azure/get-keyvault-secrets/blob/master/action.yml).

Secrets fetched will be set as [outputs](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/metadata-syntax-for-github-actions#outputs) of the keyvault action instance and can be consumed in the subsequent actions in the workflow using the notation: `${{ steps.<Id-of-the-KeyVault-Action>.outputs.<Secret-Key> }}`. In addition, secrets are also set as environment variables. All the variables are automatically masked if printed to the console or to logs.

Refer to more [Actions for Azure](https://github.com/Azure/actions) and [Starter templates](https://github.com/Azure/actions-workflow-samples) to easily automate your CICD workflows targeting Azure services using GitHub Action workflows.

# End-to-End Sample Workflows

## Dependencies on other Github Actions

* Authenticate using [Azure Login](https://github.com/Azure/login) with an Azure service principal, which also has Get, List permissions on the keyvault under consideration.
  
### Sample workflow to build and deploy a Node.js Web app to Azure using publish profile

```yaml

# File: .github/workflows/workflow.yml

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # checkout the repo
    - uses: actions/checkout@master
    - uses: Azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }} 
    - uses: Azure/get-keyvault-secrets@v1
      with:
        keyvault: "my
        Vault"
        secrets: 'mySecret'  # comma separated list of secret keys that need to be fetched from the Key Vault 
      id: myGetSecretAction
        
```

## Configure Azure credentials:

To fetch the credentials required to authenticate with Azure, run the following command to generate an Azure Service Principal (SPN) with Contributor permissions:

```sh
az ad sp create-for-rbac --name "myApp" --role contributor \
                            --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
                            --sdk-auth
                            
  # Replace {subscription-id}, {resource-group} with the subscription, resource group details of your keyvault

  # The command should output a JSON object similar to this:

  {
    "clientId": "<GUID>",
    "clientSecret": "<GUID>",
    "subscriptionId": "<GUID>",
    "tenantId": "<GUID>",
    (...)
  }
```
Add the json output as [a secret](https://aka.ms/create-secrets-for-GitHub-workflows) (let's say with the name `AZURE_CREDENTIALS`) in the GitHub repository. 

### Enable permissions to access the Key Vault secrets
Provide explicit access policies on the above Azure service principal to be able to access your Key Vault for `get` and `list` operations. Use below command for that:
```
az keyvault set-policy -n $KV_NAME --secret-permissions get list --spn <clientId from the Azure SPN JSON>
```
For more details, refer to [KeyVault Set-Policy](https://docs.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest#az-keyvault-set-policy).

### Consuming secrets fetched using the keyvault action in your workflow
Sample workflow which leverages the Key Vault action to fetch multiple secrets from the Key Vault and use them as credentials for the docker login action.  

```yaml
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # checkout the repo
    - uses: actions/checkout@master
    - uses: Azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }} # Define secret variable in repository settings as per action documentation
    - uses: Azure/get-keyvault-secrets@v1
      with:
        keyvault: "myKeyVault"
        secrets: 'mySecret1, mySecret2'
      id: myGetSecretAction
    - uses: Azure/docker-login@v1
      with:
        login-server: mycontainer.azurecr.io
        username: ${{ steps.myGetSecretAction.outputs.mySecret1 }}
        password: ${{ steps.myGetSecretAction.outputs.mySecret2 }}
    - run: |
        cd go-sample
        docker build . -t my.azurecr.io/myimage:${{ github.sha }}
        docker push my.azurecr.io/myimage:${{ github.sha }}
        cd ..
 
 ```

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

