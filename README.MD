#  AWS IoT Core Custom Authentication Tutorial

## Introduction

This is a small working example and tutorial of the AWS IoT Core Custom authentication service. There is a blogpost accompanying this repository (or there will be soon) with more background around the use case in which this solution can be viable and also some in-depth look into some technical choices. You can find it [here](https://www.cloudway.be/blog).

## Custom Authentication setup

### Amazon Cognito

We will be using an Amazon Cognito user pool to manage the user credentials and provide the tokens for the user. This would allow us to use the tokens for authentication requests for an HTTP/REST API as well as for authentication with AWS IoT Core. It also serves as a demo for any other service that provides JWT tokens. With minor changes, this demo could be adapted to use any other OAuth token provider.

### Authorization lambda

AWS IoT Core Custom Authentication requires us to provide an AWS Lambda function that will be provided with the context depending on the way the client is trying to authenticate with AWS IoT Core. The lambda should return the IoT policy that should be linked to the user or it should return a message to indicate the user is not authenticated.

More information about the implementation of the iot authentication lambda can be found [here](functions/iot-authoriser-lambda/).

## How to deploy this repository

This repository is created to be deployed using AWS SAM. The following `samconfig.toml` can be placed in the `iac` folder (don't forget to update the values). You can also use the guided deployment procedure that SAM provides, more info [here](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html).

```toml
version = 0.1
[default]
[default.deploy]
[default.deploy.parameters]
stack_name = "iot-custom-auth-tutorial"
s3_bucket = "<bucket for SAM>" # Provide the name of a bucket for SAM
s3_prefix = "iot-custom-auth-tutorial"
region = "eu-west-1" # Change to the appropriate region
capabilities = "CAPABILITY_IAM CAPABILITY_NAMED_IAM"
```

After creating the samconfig.toml, you can execute the following command from the root of the project:
```bash
sam deploy -t iac/iot-custom-auth.yaml
```

> Note: We are creating the Cognito user pool - for simplicity's sake - in the cloudformation template. However, given the way cloudformation tends to recreate resources when changing read-only parameters, we do not recommend this for production purposes.

## It's deployed, does it work?

Well, easy to find out. First, we'll need to add a user to the created user pool. You can use the AWS Console to do this. However, the user will be created and be required to change their password. Since there is no UI deployed to interact with the user pool, changing the password is easiest using the CLI:
```bash
aws cognito-idp admin-set-user-password --user-pool-id <USERPOOLID> --username <TESTUSERNAME> --password <TESTPASSWORD> --permanent
```

Now that we have a user, we can use the script located in `scripts/connect-iot.js`. The script will use information extracted from the environment variables, e.g., stored in a `.env` file. The following values should be available:
```properties
TEST_USER_USERNAME=
TEST_USER_PASSWORD=
COGNITO_CLIENT_ID=
COGNITO_USER_POOL_ID=
AWS_REGION=
IOT_ENDPOINT=
```

The script will use the `adminInitiateAuth` functionality of the AWS SDK for JavaScript in Node.js to use the test user's credentials to retrieve the necessary tokens from the user pool. The returned `IdToken` will be used for authenticating the IoT connection. If the IoT connection is established, the script will subscribe to the event topic based on their username and send a hello message. You can use the AWS Console to see the incoming MQTT message and to send messages back to the client.

You can also execute these actions on the command line to test the different authentication mechanisms provided by the IoT Custom Authentication service:

```bash
# Using HTTP upgrade request headers
aws iot test-invoke-authorizer --authorizer-name CognitoAuthorizer --http-context 'headers={x-amz-customauthorizer-name=CognitoAuthorizer,CognitoToken=<token>}'

# Using HTTP upgrade request querystring
aws iot test-invoke-authorizer --authorizer-name CognitoAuthorizer --http-context 'queryString=?x-amz-customauthorizer-name=CognitoAuthorizer&CognitoToken=<token>'
```

Other supported variants can be constructed similarly. More information can be found [here](https://docs.aws.amazon.com/iot/latest/developerguide/custom-auth.html).

The script as well as the commands above are based on the default AWS authentication mechanisms in the AWS SDK for JavaScript in Node.js and the AWS CLI (v1) respectively. Please ensure you have the correct permissions to execute these actions.

## Future work

Since we are validating and verifying the token ourselves in the lambda function, it is executed (almost) every time a user tries to connect to the IoT endpoint using the custom authentication provider. This means malicious users might be able to spam the endpoint and increase the cost for the AWS stack. Hence, the custom authentication service allows some signature to be verified against a public key that is provided during the setup. Therein lies the problem: the keys have to be configured as a static value. This ensures we cannot use any key rotation in the token provider, or that we have to set up another flow that is triggered by, or polls the changes of the public keys and updates the Custom Authentication configuration accordingly.
