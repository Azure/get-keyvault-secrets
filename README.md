# GitHub Action to fetch secrets from azure key vault

With the Get KeyVault Secrets action, you can consume the secrets from your azure keyvaults in your github actions workflow.

Get started today with a [free Azure account](https://azure.com/free/open-source)!


The definition of this Github Action is in [action.yml](https://github.com/Azure/webapps-deploy/blob/master/action.yml).

# End-to-End Sample Workflows

## Dependencies on other Github Actions

* Authenticate using [Azure Login](https://github.com/Azure/login)
  
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
    - uses: azure/actions/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }} # Define secret variable in repository settings as per action documentation
    - uses: actions/get-keyvault-secrets
      with:
        keyvault: "myKeyVault"
        secrets: 'mySecret'
      id: myGetSecretAction
        
```

#### Configure deployment credentials:

For any credentials like Azure Service Principal, Publish Profile etc add them as [secrets](https://help.github.com/en/articles/virtual-environments-for-github-actions#creating-and-using-secrets-encrypted-variables) in the GitHub repository and then use them in the workflow.

The above example uses user-level credentials i.e., Azure Service Principal for deployment. 

Follow the steps to configure the secret:
  * Define a new secret under your repository settings, Add secret menu
  * Paste the contents of the below [az cli](https://docs.microsoft.com/en-us/cli/azure/?view=azure-cli-latest) command as the value of secret variable, for example 'AZURE_CREDENTIALS'
```bash  

   az ad sp create-for-rbac --name "myApp" --role contributor \
                            --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
                            --sdk-auth
                            
  # Replace {subscription-id}, {resource-group} with the subscription, resource group details of the WebApp
  
  # The command should output a JSON object similar to this:

  {
    "clientId": "<GUID>",
    "clientSecret": "<GUID>",
    "subscriptionId": "<GUID>",
    "tenantId": "<GUID>",
    (...)
  }
  
```
  * Now in the workflow file in your branch: `.github/workflows/workflow.yml` replace the secret in Azure login action with your secret (Refer to the example above)

### Other points to note
You will need to provide explicit access policies for your keyvault to be accessed for get and list operations. Use below command for that:
```
az keyvault set-policy -n $KV_NAME --secret-permissions get list --spn <YOUR SPN CLIENT ID>
```
[KeyVault Set-Policy](https://docs.microsoft.com/en-us/cli/azure/keyvault?view=azure-cli-latest#az-keyvault-set-policy)

### Using the keyvault action in your workflow
Take a look at the following workflow which leverages the keyvault action to fetch a secret from the keyvault and uses it as the password for the docker login action. This 

```
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # checkout the repo
    - uses: actions/checkout@master
    - uses: azure/actions/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }} # Define secret variable in repository settings as per action documentation
    - uses: actions/get-keyvault-secrets
      with:
        keyvault: "myKeyVault"
        secrets: 'mySecret'
      id: myGetSecretAction
    - uses: azure/docker-login@v1
      with:
        login-server: mycontainer.azurecr.io
        username: 'username'
        password: ${{ steps.myGetSecretAction.outputs.mySecret }}
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

