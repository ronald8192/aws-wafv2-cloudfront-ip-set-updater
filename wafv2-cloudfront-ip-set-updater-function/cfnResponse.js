const axios = require('axios')

exports.SUCCESS = "SUCCESS";
exports.FAILED = "FAILED";

exports.send = (event, context, responseStatus, responseData, physicalResourceId, noEcho) => {
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
    PhysicalResourceId: physicalResourceId || context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    NoEcho: noEcho || false,
    Data: responseData
  });
  console.log("Response body:\n", responseBody);

  return axios.request({
    method: 'PUT',
    url: event.ResponseURL,
    headers:{
      "content-type": "",
      "content-length": responseBody.length
    },
    data: responseBody,
  })
}