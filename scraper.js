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
        console.log("No more tweets\nTOTAL COUNT:", count)
        return
      } 
      count += json.new_latent_count
      max_pos = data[data.length-1]["tweetId"]
      console.log(max_pos)
      console.log("TOTAL COUNT: ", count)
      if (count < 50000) {
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
  getJson(url)(function(err, data) {
    if (data) {
      fs.writeFile('tmp/'+query+'.json', JSON.stringify(data))
      x(url, 'div.stream-container@data-min-position')(function(err, data) {
        console.log(data)
        getNext(query, data, 0)
      })
    }
  })
}


function generateQueryFromFiles() {
  var query = ""

  // KEYWORDS
  var keywords = fs.readFileSync("./keywords.txt", "utf-8").toString().match(/^.+$/gm)
  if (keywords) {
    keywords.forEach(function(keyword) {
      query += keyword + " "
    })
    query = query.trim()
  }
  // USERS
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

  // GEOCODE
  var geoCode = fs.readFileSync("./geoCode.json", "utf-8").toString()
  if (geoCode) {
    geoCode = JSON.parse(geoCode)
    var lat = geoCode["lat"]
    var long = geoCode["long"]
    var place = geoCode["place"]
    var mile = geoCode["mile"]
    var lang = geoCode["lang"]
    mile = mile || "15"
    if (lat && long) {
      query += ' near:"' + lat + "," + long + '" within:' + mile + "mi"
    } else if (place) {
      query += ' near:"' + place + '" within:' + mile + 'mi'
    }

    if (lang) {
      query += " lang:" + lang
    }
    query = query.trim()
  }


  // MENTIONING
  var mentioning = fs.readFileSync("./mention.txt", "utf-8").toString().match(/^.+$/gm)
  if (mentioning) {
    mentioning.forEach(function(user, index) {
      if (index == 0) {
        query += " @" + user
      } else {
        query += " OR @" + user
      }
    })
    query = query.trim()
  }

  console.log('query: ' + query)
  query = encodeURI(query).replace(/\:/g, '%3A').replace(/\"/g, '%22').replace(/\@/g, '%40')
  return query
}

getTweets(generateQueryFromFiles())
module.exports.getTweets = getTweets
