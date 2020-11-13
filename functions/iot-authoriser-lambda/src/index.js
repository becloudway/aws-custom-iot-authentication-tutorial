const jwt = require('jsonwebtoken');
const jtp = require('jwk-to-pem');
const axios = require('axios');

const { AWS_REGION, USER_POOL_ID } = process.env;
const timing = {
  disconnectAfterInSeconds: 86400,
  refreshAfterInSeconds: 300,
};

const cognitoJwksUri = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;
let keyStore;

const getKeyStore = (arrayOfKeys) => ({
  get: (kidToFind) => arrayOfKeys.filter(({ kid }) => kid === kidToFind)[0],
});

exports.handle = async (event) => {
  try {
    console.log(event);

    if (!keyStore) {
      // Storing the keystore reduces latency for non-cold starts, however, there should be a
      // 'cache' invalidation system in case the token provider uses key rotation.
      keyStore = getKeyStore((await axios.get(cognitoJwksUri)).data.keys);
    }

    const { token } = event;

    if (!token) {
      throw new Error('Token could not be retrieved from the event');
    }
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      throw new Error(`Invalid token ${token}`);
    }

    jwt.verify(token, jtp(keyStore.get(decoded.header.kid)));

    const {
      payload: { 'cognito:username': username },
    } = decoded;

    const policyDocuments = [
      {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['iot:Connect', 'iot:Receive'],
            Resource: ['*'],
          },
          {
            Effect: 'Allow',
            Action: ['iot:Subscribe', 'iot:Publish'],
            Resource: [`arn:aws:iot:${AWS_REGION}:*:topicfilter//event/${username}`, `arn:aws:iot:${AWS_REGION}:*:topic//event/${username}`],
          },
        ],
      },
    ];

    return {
      isAuthenticated: true,
      principalId: username, // A string that identifies the connection in logs.
      ...timing,
      policyDocuments,
    };
  } catch (error) {
    console.error(error);
    console.log({ detail: 'DENY', error, event });
    return { isAuthenticated: false, ...timing };
  }
};
