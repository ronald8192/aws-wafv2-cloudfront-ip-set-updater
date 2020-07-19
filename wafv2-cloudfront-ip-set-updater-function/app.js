const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
// const AWS = require('aws-sdk')
const axios = require('axios')
const CryptoJS = require("crypto-js");
const cfnResponse = require('./cfnResponse.js')

let response;
let enforceIntegrity = process.env['EnforceIntegrity'] == 'true'
const ipset_ipv4_id = process.env['ipset_ipv4_id']
const ipset_ipv4_name = process.env['ipset_ipv4_name']
const ipset_ipv6_id = process.env['ipset_ipv6_id']
const ipset_ipv6_name = process.env['ipset_ipv6_name']

exports.lambdaHandler = async (event, context) => {
  console.log(JSON.stringify(event))
  if (event.RequestType === 'Delete') {
    const cfnResDelete = await cfnResponse.send(event, context, cfnResponse.SUCCESS)
    console.log("cfnResDelete: ", cfnResDelete)
    return {
      'statusCode': 200,
      'body': 'cfn delete event'
    }
  }

  try {
    let md5 = null
    let url = 'https://ip-ranges.amazonaws.com/ip-ranges.json'

    if (event.RequestType /* 'Create' or 'Update' */ || event.Records === undefined) {
      enforceIntegrity = false
    } else {
      const snsMessage = JSON.parse(event.Records[0].Sns.Message)
      md5 = snsMessage.md5
      url = snsMessage.url
    }

    const ip = await getIpCloudFrontRanges(url, enforceIntegrity, md5)
    const cloudfront_ipv4 = ip.prefixes.filter(p => p.service === "CLOUDFRONT").map(p => p.ip_prefix)
    const cloudfront_ipv6 = ip.ipv6_prefixes.filter(p => p.service === "CLOUDFRONT").map(p => p.ipv6_prefix)

    const wafv2 = new AWS.WAFV2()
    const ipsetIpv4 = await wafv2.getIPSet({
      Id: ipset_ipv4_id,
      Name: ipset_ipv4_name,
      Scope: 'REGIONAL',
    }).promise();
    const ipsetIpv6 = await wafv2.getIPSet({
      Id: ipset_ipv6_id,
      Name: ipset_ipv6_name,
      Scope: 'REGIONAL',
    }).promise();

    console.log(`IPv4 Set Lock Token: ${ipsetIpv4.LockToken}`)
    console.log(`IPv6 Set Lock Token: ${ipsetIpv6.LockToken}`)

    const ipv4Update = await wafv2.updateIPSet({
      Addresses: cloudfront_ipv4,
      Id: ipset_ipv4_id,
      LockToken: ipsetIpv4.LockToken,
      Name: ipset_ipv4_name,
      Scope: 'REGIONAL',
      Description: `Last update: ${new Date().toISOString()} UTC`,
    }).promise();
    const ipv6Update = await wafv2.updateIPSet({
      Addresses: cloudfront_ipv6,
      Id: ipset_ipv6_id,
      LockToken: ipsetIpv6.LockToken,
      Name: ipset_ipv6_name,
      Scope: 'REGIONAL',
      Description: `Last update: ${new Date().toISOString()} UTC`,
    }).promise();

    console.log(`IPv4 Set Next Lock Token: ${ipv4Update.NextLockToken}`)
    console.log(`IPv6 Set Next Lock Token: ${ipv6Update.NextLockToken}`)

    response = {
      'statusCode': 200,
      'body': JSON.stringify({
        ipv4: cloudfront_ipv4,
        ipv6: cloudfront_ipv6,
        ipv4NextLockToken: ipv4Update.NextLockToken,
        ipv6NextLockToken: ipv6Update.NextLockToken,
      })
    }
  } catch (err) {
    console.log(err)
    if (event.RequestType) {
      const cfnResOnLambdaError = await cfnResponse.send(event, context, cfnResponse.FAILED, err)
      console.log("cfnResOnLambdaError:", cfnResOnLambdaError)
    }
    throw err
  }

  if (event.RequestType === 'Create' || event.RequestType === 'Update') {
    const cfnResCreate = await cfnResponse.send(event, context, cfnResponse.SUCCESS, response)
    console.log("cfnResCreate:", cfnResCreate)
  }

  return response
};

const getIpCloudFrontRanges = async (url, checkMD5, md5) => {
  console.log("Check MD5: ",  checkMD5)
  const response = await axios.request({
    url,
    responseType: 'text', // not work
    transformResponse: [data => data], // workaround: https://github.com/axios/axios/issues/2791
  })
  console.log("Response status code: ", response.status)

  const responseDataMD5 = CryptoJS.MD5(response.data).toString(CryptoJS.enc.Hex)
  console.log("Response data MD5: ", responseDataMD5)
  console.log("Expected MD5     : ", md5)
  
  if (checkMD5 && md5 !== responseDataMD5) {
    throw Error(`MD5 mismatch: expreted: ${md5}, response: ${responseDataMD5}`)
  } else {
    return JSON.parse(response.data)
  }
}

// const getIpCloudFrontRanges = async (url, checkMD5, md5) => {
//   console.log("Check MD5: ",  checkMD5)
//   const response = await axios.request({
//     url: url,
//     methon: 'GET',
//     responseType: 'arraybuffer'
//   })
//   // https://javascript.info/text-decoder
//   let uint8Array = new Uint8Array(response.data)
//   let ipRanges = `{${new TextDecoder().decode(uint8Array)}}`
  
//   const responseDataMD5 = CryptoJS.MD5(ipRanges).toString(CryptoJS.enc.Hex)
//   console.log("Response data MD5: ", responseDataMD5)
//   console.log("Expected MD5     : ", md5)
  
//   if (checkMD5 && md5 !== responseDataMD5) {
//     throw Error(`MD5 mismatch: expreted: ${md5}, response: ${responseDataMD5}`)
//   } else {
//     //return response.data
//     return JSON.parse(ipRanges)
//   }
// }