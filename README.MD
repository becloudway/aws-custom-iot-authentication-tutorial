# 


```bash
aws iot test-invoke-authorizer --authorizer-name CognitoAuthorizer --http-context 'headers={x-amz-customauthorizer-name=CognitoAuthorizer,CognitoToken=<token>}'
```


```bash
aws iot test-invoke-authorizer --authorizer-name CognitoAuthorizer --http-context 'queryString=?x-amz-customauthorizer-name=CognitoAuthorizer&CognitoToken=<token>'
```


```bash
aws iot test-invoke-authorizer --authorizer-name CognitoAuthorizer --mqtt-context 'username=?x-amz-customauthorizer-name=CognitoAuthorizer&CognitoToken=<token>'
```


