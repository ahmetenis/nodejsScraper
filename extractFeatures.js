'use strict'

var fs = require('fs')
var readline = require('readline')
var stream = require('stream')
var twitterClient = require('./twitterClient')
var scraper = require('./scraper')

var workers = []
const keysToWrite = ['timestamp', 'tweetId', 'userId', 'userName', 'retweetCount', 
                'favoriteCount', 'source', 'latitude', 'longitude', 'text', 'is_retweet', 'is_reply', 'contains_hattip']
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

    try {
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
                getHatTips(tweet)
                getDirectMessageRequests(tweet)
                getRTUsage(tweet)
                getReply(tweet)
                getFavCount(tweet)
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
              dict[tweet['id_str']]['is_retweet'] = tweet['retweeted'] || '0'
              dict[tweet['id_str']]['is_reply'] = Boolean(tweet['in_reply_to_user_id']) 
              dict[tweet['id_str']]['contains_hattip'] = tweet['contains_hattip'] || false
            })
            count += 1
            if (count == 1) {
              fs.writeFileSync(path.replace('.json','') + '.formatted', keysToWrite.join(SEPARATOR) + '\n')
            }

            try {
              formatAndWriteToFile(path.replace('.json','') + '.formatted', dict) 
            } catch(e) {
              console.error(e)
            }
            console.log("DONE:",count) 
          });
      }
    } catch(e) {
      console.log(e)
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
  var result = ""
  for (var id in dict) {
    var formattedString = ''
    var tweet = dict[id]
    keysToWrite.forEach( (key,index) => {
      formattedString += tweet[key] + SEPARATOR
    })

    result += formattedString.slice(0,-2).replace(/[\n\r]/g, ' ') + '\n'
  }

  fs.appendFile(path, result)
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

function getHatTips(tweet) {
  console.log(tweet.text)
  var hattips = tweet.text.match(/(HT|via|by)[ :]?@[a-z0-9]+/ig)
  if (hattips) {
    console.log(hattips)
    var mentions = getUserMentionsString(tweet)
    if (mentions) {
      var urls = tweet.entities.urls || []
      var media = tweet.entities.media || []
      var links = ''
      urls.forEach(item => {
        links +=  item.url + ' '
      })
      media.forEach(item => {
        links += item.url + ' '
      })
      links = links.trim()
      tweet['contains_hattip'] = true
      var hattipString = tweet['id_str'] + '\t' + mentions + '\t' + links + '\n'
      fs.appendFile('tmp/hattip_usage.txt', hattipString)
    }
  }
}

function getDirectMessageRequests(tweet) {
  var dmRequest = tweet.text.match(/DM[\' ]/ig)

  if (dmRequest) {
    var mentions = getUserMentionsString(tweet)
    if (mentions) {
      var dmString = tweet['id_str'] + '\t' + tweet['user']['id_str'] + '\t' + mentions + '\n'
      fs.appendFile('tmp/DM_usage.txt', dmString)
    }
  }
}

function getRTUsage(tweet) {
  // getting manual RTs but retweeted tweet's id is not available   
  var modifiedRT = tweet.text.match(/RT[ \:\-]@[a-z0-9]+/ig)
  if (modifiedRT) {
    console.log(tweet.text)
    var mention = tweet['entities']['user_mentions'][0]['screen_name']
    if (mention) {
      tweet['retweeted'] = "1"
    }
  }

  if (tweet.quoted_status) {
    var retweetString = tweet['id_str'] + '\t' + tweet['user']['id_str'] + '\t' +
                        tweet['quoted_status']['id_str'] + '\n'
    tweet['retweeted'] = "2"
    fs.appendFile('tmp/RT_usage.txt', retweetString)
  }
}

function getFavCount(tweet) {
  var favCount = tweet['favorite_count']
  if (favCount) {
    var favString = tweet['id_str'] + '\t' + tweet['favorite_count'] + '\n'
    fs.appendFile('tmp/favorite_count.txt', favString)
  }
}

function getUserMentionsString(tweet) {
  var userMentions = tweet.entities.user_mentions
  if (userMentions.length) {
    var mentions = ''
    userMentions.forEach(mention => {
      mentions += '|' + mention['id_str']
    })
    return mentions.replace('|', '')
  }
}

function getReply(tweet) {
  if (tweet['in_reply_to_user_id']) {
    var replyString = tweet['id_str'] + '\t' + tweet['user']['id_str'] + '\t' + 
                      tweet['in_reply_to_user_id'] + '\n'
    fs.appendFile('tmp/reply_usage.txt', replyString)
  }
}

function extractEntities(tweet) {
  var hashtags = tweet['entities']['hashtags'] || []
  var urls = tweet['entities']['urls'] || []
  var user_mentions = tweet['entities']['user_mentions'] || []
  var mediaEntities = tweet['entities']['media'] || []
  var hashtagsString = ''
  var urlsString = ''
  var userMentionsString = ''
  var mediaString = ''
  
  hashtags.forEach(hashtag => {
    hashtagsString += tweet['id_str'] + '\t' + tweet['user']['id_str'] + '\t' + hashtag['text'] + '\n'
  })

  urls.forEach(url => {
    urlsString += tweet['id_str'] + '\t' + tweet['user']['id_str'] + '\t' + url['display_url'] + '\n'
  })

  user_mentions.forEach(user_mention => {
    userMentionsString += tweet['id_str'] + '\t' + tweet['user']['id_str'] + '\t' + 
                          user_mention['screen_name'] + '\t' + user_mention['id_str'] + '\n'
  })

  mediaEntities.forEach(mediaEntity => {
    mediaString += tweet['id_str'] + '\t' + tweet['user']['id_str'] + '\t' + 
                    mediaEntity["display_url"] + '\n'
  })

  fs.appendFile('tmp/hashtag_usage.txt', hashtagsString)
  fs.appendFile('tmp/url_usage.txt', urlsString)
  fs.appendFile('tmp/mention_usage.txt', userMentionsString)
  fs.appendFile('tmp/media_usage.txt', mediaString)
}

function main() {
  var query = scraper.generateQuery();
  getAdditionalInfoAboutTweets('./tmp/' + query.replace(/%[0-9a-z]{2}/ig, ' ') + '.json', 0)  
}

if (require.main === module) {
  main();
}
