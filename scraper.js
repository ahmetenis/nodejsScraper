'use strict';
var Xray = require("x-ray")
var fs = require("fs")
var request = require("request")
var json2csv = require("json2csv");

var generateQuery = require('./generateQuery').generateQuery;

var x = Xray()

const CSVCOLUMNS = ['screenName', 'retweetCount', 'favoriteCount', 'timestamp', 'text'];

function getJson(html) {
  return x(html, "li.js-stream-item.stream-item:not(.AdaptiveSearchTimeline-beforeModule) \
    .tweet.js-stream-tweet", [{
    text: "p.TweetTextSize.js-tweet-text",
    lang: "p.TweetTextSize.js-tweet-text@lang",
    screenName: "@data-screen-name",
    tweetId: "@data-tweet-id",
    urlPath: "@data-permalink-path",
    userName: "@data-name",
    userId: "@data-user-id",
    retweetId: "@data-retweet-id",
    retweeter: "@data-retweeter",
    retweetCount: "div.stream-item-footer > div.ProfileTweet-actionList.js-actions > div.ProfileTweet-action.ProfileTweet-action--retweet.js-toggleState\
     > button.ProfileTweet-actionButton.js-actionButton.js-actionRetweet > div.IconTextContainer > span > span",
    favoriteCount: "div.stream-item-footer > div.ProfileTweet-actionList.js-actions > div.ProfileTweet-action.ProfileTweet-action--favorite.js-toggleState\
     > button.ProfileTweet-actionButton.js-actionButton.js-actionFavorite > div.IconTextContainer > span > span",
    quotedTweetId: "div.QuoteTweet-container > div.QuoteTweet-innerContainer@data-item-id",
    quotedUserId: "div.QuoteTweet-container > div.QuoteTweet-innerContainer@data-user-id",
    timestamp: "a.tweet-timestamp span._timestamp @data-time"
  }])
}

function getNext(query, max_pos, count, filterFunc) {
  var url = "https://twitter.com/i/search/timeline?vertical=news&q="+query+
    "&src=typd&include_available_features=1&include_entities=1&max_position="+max_pos
  console.log("making request to:\n", url)
  request(url, function(err, response, html) {
    if (err) {
      console.log(err)
      console.log(response)
      console.log(html)
      getNext(query, max_pos, count, filterFunc)
      return
    }
    console.log("response status code:", response.statusCode)
    var json = JSON.parse(html)
    getJson(json["items_html"])(function(err, data) {
      if (filterFunc) {
        data = data.filter(filterFunc)
      }
      fs.appendFile('tmp/' + decodeURI(query).substring(0,15) + '.json', '\n' + JSON.stringify(data))

      fs.appendFile('tmp/' + decodeURI(query).substring(0,15) + '.csv', '\n' + json2csv({data: data, fields: CSVCOLUMNS, hasCSVColumnTitle: false}));
      if (json.new_latent_count == 0) {
        console.log("No more tweets\nTOTAL COUNT:", count)
        return
      } 
      count += json.new_latent_count
      console.log("TOTAL COUNT: ", count)
      if (count < 500000) {
        getNext(query, json["min_position"], count, filterFunc)
      }
    })
  })
}

function getTweets(query, filterFunc) {
  console.log("getting tweets for query: " + query)
  var url = "https://twitter.com/search?q="+query+"&src=typd"
  console.log(url)
  getJson(url)(function(err, data) {
    if (data) {
      if (filterFunc) {
        data = data.filter(filterFunc)
      }
      var count = data.length
      var path = 'tmp/' + decodeURI(query).substring(0,15)
      console.log("writing tweets to file %s", path)
      fs.writeFile(path + '.json', JSON.stringify(data))
      var CSVCOLUMNS = ['screenName', 'retweetCount', 'favoriteCount', 'timestamp', 'text'];
      var csvStr = '';

      try {
        var result = json2csv({ data: data, fields: CSVCOLUMNS });
        console.log(result);
        fs.writeFile(path+'.csv', result);
      } catch (err) {
        // Errors are thrown for bad options, or if the data is empty and no fields are provided. 
        // Be sure to provide fields if it is possible that your data array will be empty. 
        console.error(err);
      }
      fs.writeFile(path+'.csv', csvStr);


      x(url, 'div.stream-container@data-min-position')(function(err, data) {
        console.log(data)
        getNext(query, data, count, filterFunc)
      })
    }
  })
}

function getUserIds() {
  var queryConfig = fs.readFileSync("./query_config.json", "utf8").toString()
  var users = fs.readFileSync("users.txt", "utf8").toString().match(/^.+$/gm)
  var userIds = []
  if (users && users.length) {
    users.forEach(function(user) {
      var userId = user.split(/[ ]+/)[1]
      console.log(userId)
      if (userId) {
        userIds.push(userId)
      }
    })
  }
  console.log(userIds)
  return userIds
}

var userIdList = getUserIds()
var filterUserIds
if (userIdList.length > 0) {
  filterUserIds = function(item) {
    return userIdList.indexOf(item["userId"]) >= 0
  }
}


var main = function() {
  fs.stat('tmp', function(err, stats) {
    if (err) {
      fs.mkdirSync('tmp')
    }
  })
  getTweets(generateQuery());
}

if (require.main === module) {
  main();
}

module.exports.getTweets = getTweets
module.exports.generateQuery = generateQuery
module.exports.getJson = getJson

