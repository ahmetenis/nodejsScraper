'use strict'
var twitter = require("twitter")
var request = require("request")
var fs = require("fs")
var q = require("q")

var credentials = fs.readFileSync("./credentials.json", "utf-8").toString()
credentials = JSON.parse(credentials)

function getBearerToken(credential) {
  // TODO: RFC 1738 encode consumer key and consumer secret
  var deferred = q.defer()
  var bearerTokenCredentials = credential.consumer_key + ":" + credential.consumer_secret
  var base64encoded = new Buffer(bearerTokenCredentials).toString('base64')

  var options = {
    url: "https://api.twitter.com/oauth2/token",
    headers: {
      "Authorization": "Basic " + base64encoded,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: "grant_type=client_credentials"
  }

  request.post(options, function(err, response, body) {
    // fs.appendFile("bearer.json", "\n" + JSON.stringify(response))
    if (response.statusCode == 200) {
      body = JSON.parse(body)
      deferred.resolve(body["access_token"])

    } else {
      deferred.reject("failed")
    }
  })

  return deferred.promise
}

function getTwitterClient() {
  // TODO: pooling
  var deferred = q.defer()
  var credential = credentials[1]
  if (!credential["bearer_token"]) {
    getBearerToken(credential).
      then(function(bearer_token) {
        credential["bearer_token"] = bearer_token
        var client = new twitter({
          "consumer_key": credential["consumer_key"],
          "consumer_secret": credential["consumer_secret"],
          "bearer_token": credential["bearer_token"]
        })
        deferred.resolve(client)
      }, function(err) {
        deferred.reject(err)
      })
  }

  return deferred.promise
}

function lookupTweets(tweetIds) {
  var deferred = q.defer()
  getTwitterClient().
    then(function(client) {
      client.get('statuses/lookup/', {"id": tweetIds.join(',')}, function(err, tweets, response) {
        console.log(tweets)
        // fs.writeFile("./tmp/lookups", JSON.stringify(tweets))
        deferred.resolve(tweets)
      })
    }, function(err) {
      deferred.reject(err)
    })
  return deferred.promise
}

var tweetIds = ['733674280437719041', '732858842195865600']
lookupTweets(tweetIds)
