'use strict'

var fs = require('fs')
var readline = require('readline')
var stream = require('stream')
var twitterClient = require('./twitterClient')
var child_process = require('child_process')

var workers = []
const keysToWrite = ['timestamp', 'tweetId', 'userId', 'userName', 'retweetCount', 'favoriteCount', 'source', 'latitude', 'longitude', 'text']
const SEPARATOR = 'Â§'

function prepareWorkers() {
  var credentials = fs.readFileSync("./credentials.json", "utf-8").toString()
  var twitterClients = []
  credentials = JSON.parse(credentials)
  credentials.forEach(function(credential) {
    twitterClient.getBearerToken(credential)
      .then(function(token) {
        var client = new twitter({
          'consumer_key': credential['consumer_key'],
          'consumer_secret': credential['consumer_secret'],
          'bearer_token': token
        })

        twitterClients.push(client)

      })
  })
}

function getAdditionalInfoAboutTweets(path, start, end) {
  var rl = readline.createInterface({
    input: fs.createReadStream(path) 
  })
  var index = 0
  var count = 0
  rl.on('line', (line) => {
    var endReached = false || (end && index >= end)
    var dict = {}

    if (start <= index) {
      twitterClient.lookupTweets(JSON.parse(line).map( tweet => {
        dict[tweet['tweetId']] = tweet
        return tweet["tweetId"]
      }))
        .then(function(tweets) {
          tweets.forEach(function(tweet) {
            var coordinates = tweet['coordinates']
            if (coordinates) {
              dict[tweet['id_str']]['latitude'] = coordinates.split(',')[0]
              dict[tweet['id_str']]['longitude'] = coordinates.split(',')[1]
            } else {
              dict[tweet['id_str']]['latitude'] = null
              dict[tweet['id_str']]['longitude'] = null
            }
            dict[tweet['id_str']]['source'] = tweet['source']
          })
          count += 1
          if (count == 1) {
            fs.writeFileSync(path+'.extensive', keysToWrite.join(SEPARATOR) + '\n')
          }

          try {
            formatAndWriteToFile(path+".extensive", dict) 
          } catch(e) {
            console.error(e)
          }
          console.log("DONE:",count) 
        });
    }
    
    if (endReached) {
      console.log('calling close')
      rl.close()
    }
    index += 1
  })

  rl.on('close', function() {
    console.log('readline.close() called')
    rl.input.destroy()
  })
}

function formatAndWriteToFile(path, dict) {
  var formattedString = ''
  for (var id in dict) {
    var tweet = dict[id]
    console.log(id)
    keysToWrite.forEach( (key,index) => {
      formattedString += tweet[key] + SEPARATOR
    })

    formattedString = formattedString.slice(0,-1) + '\n'
  }

  fs.appendFile(path, formattedString)
}

getAdditionalInfoAboutTweets('./tmp/london.json', 0)