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

function getNext(query, max_pos, count, lang) {
  lang = lang || "en"
  var url = "https://twitter.com/i/search/timeline?vertical=news&q="+query+"&src=typd&include_available_features=1&include_entities=1&lang="+lang+"&max_position="+max_pos
  request(url, function(err, response, html) {
    json = JSON.parse(html)
    getJson(json["items_html"])(function(err, data) {
      fs.appendFile(query+'.json', ',\n' + JSON.stringify(data))
      count += json.new_latent_count
      max_pos = data[data.length-1]["tweetId"]
      console.log(max_pos)
      console.log("TOTAL COUNT: ", count)
      getNext(query, json["min_position"], count, lang)
    })
  })
  console.log(url)
}

function getTweets(query, lang) {
  lang = lang || "en"
  var url = "https://twitter.com/search?q="+query+"&src=typd&lang="+lang
  console.log(url)
  var min_position, max_position
  getJson(url)(function(err, data) {
    fs.writeFile(query+'.json', JSON.stringify(data))
    min_position = data[0]["tweetId"]
    max_position = data[data.length - 1]["tweetId"]
    max_position = "TWEET-" + max_position + "-" + min_position
    getNext(query, max_position, 0, lang)
  })
}

getTweets("syria", "fr")
