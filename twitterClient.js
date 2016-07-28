'use strict'
var twitter = require("twitter")
var request = require("request")
var fs = require("fs")
var q = require("q")

var twitterClient = function() {
  var credentials = fs.readFileSync("./credentials.json", "utf-8").toString()
  credentials = JSON.parse(credentials)
  var clients = []
  var poolPreparationInProgress = false
  var index = 0
  var clientPool = q.defer()

  var preparePool = function() {
    if (!poolPreparationInProgress) {
      poolPreparationInProgress = true
      credentials.forEach(credential => {
        getBearerToken(credential).then(function(token) {
          var client = new twitter({
            "consumer_key": credential["consumer_key"],
            "consumer_secret": credential["consumer_secret"],
            "bearer_token": token
          });
          clients.push(client)
          console.log('client %s ready', client)
          if (clients.length == credentials.length) {
            clientPool.resolve(clients)
          }
        })
      })
    }
  }
  preparePool()

  function getClient() {
    return getBearerToken(credentials[0]).then(function(token) {
        var client = new twitter({
          "consumer_key": credential["consumer_key"],
          "consumer_secret": credential["consumer_secret"],
          "bearer_token": token
        })
        console.log('getClient')
        return client
      })
  }

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
      if (response.statusCode == 200) {
        body = JSON.parse(body)
        deferred.resolve(body["access_token"])

      } else {
        deferred.reject("failed")
      }
    })

    return deferred.promise
  }

  // upto 100 tweetIds per request
  function lookupTweets(tweetIds, hand) {
    var deferred = q.defer()
    clientPool.promise.then(function(clients) {
      var client = clients[index % clients.length]
      index += 1
      client.get('statuses/lookup/', {"id": tweetIds.join(',')}, function(err, tweets, response) {
        var remaining = Number(response.headers['x-rate-limit-remaining'])
        if (client['quota']) {
          client['quota'] = Math.min(client['quota'], remaining)
        } else {
          client['quota'] = remaining
        }
        if (err) {
          hand = hand || 0
          if (hand < credentials.length) {
            fs.writeFile('tmp/response.json', JSON.stringify(response))
            return lookupTweets(tweetIds, hand+1)
          } else {
            console.log(new Date(response.headers['x-rate-limit-reset'] * 1000))
          }
        } else {
          deferred.resolve(tweets)
          console.log("REMAINING RATE LIMITS:")
          console.log(clients.map( client => client["quota"]))
        }
      })      
      
    })

    return deferred.promise
  }

  return {
    "preparePool": preparePool,
    "lookupTweets": lookupTweets
  }
}

module.exports = twitterClient()
