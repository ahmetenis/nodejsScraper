'use strict'

var fs = require('fs')
var readline = require('readline')
var stream = require('stream')
var twitterClient = require('./twitterClient')
var child_process = require('child_process')

var workers = []
const keysToWrite = ['timestamp', 'tweetId', 'userId', 'userName', 'retweetCount', 
                'favoriteCount', 'source', 'latitude', 'longitude', 'text', 'is_retweet']
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
            // var keywordLines = fs.readFileSync("./keywordsWithIds.txt", "utf8").toString().match(/^.+$/gm)
            try {
              // getUsedKeywords(tweet, keywordLines)
              extractEntities(tweet)
            } catch(err) {
              console.log('problem extracting data', err)
            }
            var coordinates = tweet['coordinates']
            if (coordinates) {
              dict[tweet['id_str']]['latitude'] = coordinates.split(',')[0]
              dict[tweet['id_str']]['longitude'] = coordinates.split(',')[1]
            } else {
              dict[tweet['id_str']]['latitude'] = null
              dict[tweet['id_str']]['longitude'] = null
            }
            dict[tweet['id_str']]['source'] = tweet['source']
            dict[tweet['id_str']]['is_retweet'] = tweet['retweeted_status'] || false
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
    keysToWrite.forEach( (key,index) => {
      formattedString += tweet[key] + SEPARATOR
    })

    formattedString = formattedString.slice(0,-2) + '\n'
  }

  fs.appendFile(path, formattedString)
}

function getUsedKeywords(tweet, keywordLines) {
  var usedKeywordLinesString = ""
  if (keywordLines) {
    keywordLines.forEach(function(keywordLine) {
      var split = keywordLine.split(/[ ]+/)
      var keyword = split[2]
      var regexp = new RegExp(keyword, 'i')
      if (tweet["text"].match(regexp)) {
        usedKeywordsString += tweet["tweetId"] + '\t' + tweet["userId"] + '\t' +
                      split[0] + '\t' + split[1] + '\t' + keyword + '\n'
      }
    })
    fs.appendFile("tmp/keyword_usage.txt", usedKeywordsString)
  }
}

function extractEntities(tweet) {
  var hashtags = tweet['entities']['hashtags']
  var urls = tweet['entities']['urls']
  var user_mentions = tweet['entities']['user_mentions']
  var hashtagsString = ''
  var urlsString = ''
  var userMentionsString = ''
  
  hashtags.forEach(hashtag => {
    hashtagsString = tweet["id_str"] + '\t' + tweet["user"]["id_str"] + '\t' + hashtag['text'] + '\n'
  })

  urls.forEach(url => {
    urlsString = tweet["id_str"] + '\t' + tweet["user"]["id_str"] + '\t' + url['display_url'] + '\n'
  })

  user_mentions.forEach(user_mention => {
    userMentionsString = tweet["id_str"] + '\t' + tweet["user"]["id_str"] + '\t' + 
                          user_mention['screen_name'] + '\t' + user_mention['id_str'] + '\n'
  })

  fs.appendFile('tmp/hashtag_usage.txt', hashtagsString)
  fs.appendFile('tmp/url_usage.txt', urlsString)
  fs.appendFile('tmp/mention_usage.txt', userMentionsString)
}

getAdditionalInfoAboutTweets('./tmp/london.json', 0)
