# IoT Authoriser Lambda

The implementation of the authoriser lambda is pretty straightforward. The lambda has two objectives:
- Verify the incoming JWT token against a JWT provider
- Create and return the correct IoT Policy for the user

## Verifying the token

Since we have decided to use Cognito in this tutorial, we only need the `AWS_REGION` & `USER_POOL_ID` as environment variables. These two values are used to construct the URI to retrieve the `jwks.json` from the token provider, which should contain the public keys needed to verify the signature of the JWT tokens.

After retrieving the `jwks.json` we can convert the `jwk` keys to `PEM` format which we subsequently use to verify the signature of the token. If the token is valid, the username is extracted from the token in order to create the IoT policy.


## Creating IoT Policy

Given a user with a valid token and the username `testuser` while running in the `eu-west-1` region we will be returning the following policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["iot:Connect", "iot:Receive"],
      "Resource": ["*"]
    },
    {
      "Effect": "Allow",
      "Action": ["iot:Subscribe", "iot:Publish"],
      "Resource": [
        "arn:aws:iot:eu-west-1:*:topicfilter//event/testuser",
        "arn:aws:iot:eu-west-1:*:topic//event/testuser"
      ]
    }
  ]
}
```
This will allow the user to receive events on a single topic and send events on that same topic. Ideal for demo purposes!
