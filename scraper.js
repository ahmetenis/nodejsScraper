var Xray = require("x-ray")
var fs = require("fs")
var request = require("request")
var x = Xray()


function getJson(html) {
  return x(html, "li.js-stream-item.stream-item:not(.AdaptiveSearchTimeline-beforeModule) .tweet.js-stream-tweet", [{
    text: "p.TweetTextSize.js-tweet-text",
    lang: "p.TweetTextSize.js-tweet-text@lang",
    screenName: "@data-screen-name",
    tweetId: "@data-tweet-id",
    urlPath: "@data-permalink-path",
    userName: "@data-name",
    userId: "@data-user-id",
    retweetCount: "div.stream-item-footer > div.ProfileTweet-actionList.js-actions > div.ProfileTweet-action.ProfileTweet-action--retweet.js-toggleState\
     > button.ProfileTweet-actionButton.js-actionButton.js-actionRetweet > div.IconTextContainer > span > span",
    favoriteCount: "div.stream-item-footer > div.ProfileTweet-actionList.js-actions > div.ProfileTweet-action.ProfileTweet-action--favorite.js-toggleState\
     > button.ProfileTweet-actionButton.js-actionButton.js-actionFavorite > div.IconTextContainer > span > span",
    timestamp: "a.tweet-timestamp span._timestamp @data-time"
  }])
}

function getNext(query, max_pos, count) {
  var url = "https://twitter.com/i/search/timeline?vertical=news&q="+query+"&src=typd&include_available_features=1&include_entities=1&max_position="+max_pos
  request(url, function(err, response, html) {
    json = JSON.parse(html)
    getJson(json["items_html"])(function(err, data) {
      fs.appendFile('tmp/'+query+'.json', ',\n' + JSON.stringify(data))
      if (json.new_latent_count == 0) {
        console.log("No more tweets are returned\nTOTAL COUNT:", count)
        return
      } 
      count += json.new_latent_count
      max_pos = data[data.length-1]["tweetId"]
      console.log(max_pos)
      console.log("TOTAL COUNT: ", count)
      if (count < 200) {
        getNext(query, json["min_position"], count)
      }
    })
  })
  console.log(url)
}

function getTweets(query) {
  console.log("getting tweets for query: " + query)
  var url = "https://twitter.com/search?q="+query+"&src=typd"
  console.log(url)
  var min_position, max_position
  getJson(url)(function(err, data) {
    if (data) {
      fs.writeFile('tmp/'+query+'.json', JSON.stringify(data))
      min_position = data[0]["tweetId"]
      max_position = data[data.length - 1]["tweetId"]
      max_position = "TWEET-" + max_position + "-" + min_position
      console.log('max_position: ', max_position)
      getNext(query, max_position, data.length)
    }
  })
}


function generateQueryFromFiles() {
  var query = ""
  var keywords = fs.readFileSync("./keywords.txt", "utf-8").toString().match(/^.+$/gm)
  console.log(keywords)
  if (keywords) {
    keywords.forEach(function(keyword) {
      query += keyword + " "
    })
    query = query.trim()
  }
  var users = fs.readFileSync("./users.txt", "utf-8").toString().match(/^.+$/gm)
  console.log(users)
  if (users) {
    users.forEach(function(user, index) {
      if (index == 0) {
        query += " from:" + user
      } else {
        query += " OR from:" + user
      }
    })
    query = query.trim()
  }
  var geoCode = fs.readFileSync("./geoCode.json", "utf-8").toString()
  if (geoCode) {
    geoCode = JSON.parse(geoCode)
    var latt = geoCode["latt"]
    var long = geoCode["long"]
    var place = geoCode["place"]
    var mile = geoCode["mile"]
    var lang = geoCode["lang"]
    if    
  }
  var mentioning = fs.readFileSync("./mention.txt", "utf-8").toString().match(/^.+$/gm)
  console.log('query: ' + query)
  query = encodeURI(query)
  return query
}

getTweets(generateQueryFromFiles())
module.exports.getTweets = getTweets
