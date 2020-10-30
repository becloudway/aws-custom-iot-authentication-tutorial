const sinon = require('sinon');
const nock = require('nock');
const jtp = require('jwk-to-pem');
const jwt = require('jsonwebtoken');

const jwks = require('./jwks.json');
const lambdaEntry = require('../src');

const { AWS_REGION, USER_POOL_ID } = process.env;

const createToken = (expiresIn = '1 minute') => jwt.sign(
  { 'cognito:username': 'username', 'custom:organizationId': 'organizationid' },
  jtp(jwks.keys[0], { private: true }),
  {
    keyid: jwks.keys[0].kid,
    algorithm: jwks.keys[0].alg,
    expiresIn,
  },
);

describe('index', () => {
  beforeEach(() => {
    this.sandbox = sinon.createSandbox();
    nock(`https://cognito-idp.${AWS_REGION}.amazonaws.com`).get(`/${USER_POOL_ID}/.well-known/jwks.json`).reply(200, jwks);
  });

  afterEach(() => {
    nock.cleanAll();
    this.sandbox.restore();
  });

  it('should return not authenticated if the token is not present', async () => {
    expect(await lambdaEntry.handle({})).toStrictEqual({
      isAuthenticated: false,
      disconnectAfterInSeconds: 86400,
      refreshAfterInSeconds: 300,
    });
    expect(await lambdaEntry.handle({ token: null })).toStrictEqual({
      isAuthenticated: false,
      disconnectAfterInSeconds: 86400,
      refreshAfterInSeconds: 300,
    });
    expect(await lambdaEntry.handle({ token: '' })).toStrictEqual({
      isAuthenticated: false,
      disconnectAfterInSeconds: 86400,
      refreshAfterInSeconds: 300,
    });
  });

  it('should fail on an invalid token', async () => {
    expect(await lambdaEntry.handle({ token: '1234' })).toStrictEqual({ isAuthenticated: false, disconnectAfterInSeconds: 86400, refreshAfterInSeconds: 300 });
  });

  it('should return a policy for an authorized user', async () => {
    expect(await lambdaEntry.handle({ token: createToken() })).toStrictEqual({
      isAuthenticated: true,
      principalId: 'username',
      disconnectAfterInSeconds: 86400,
      refreshAfterInSeconds: 300,
      policyDocuments: [
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
              Resource: [`arn:aws:iot:${AWS_REGION}:*:topicfilter//event/username`, `arn:aws:iot:${AWS_REGION}:*:topic//event/username`],
            },
          ],
        },
      ],
    });
  });
});
