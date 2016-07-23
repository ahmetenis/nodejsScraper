'use strict'
var Xray = require("x-ray")
var fs = require("fs")
var request = require("request")
var x = Xray()
var q = require("q")

function getAccountsWithActivity(tweetId, activity) {
  activity = activity || "retweeted"
  var url = "https://twitter.com/i/activity/" + activity + "_popup?id="+tweetId
  var deferred = q.defer()
  request(url, function(err, response, html) {
    try {
      var json = JSON.parse(html)
      console.log('getting ' + activity + ' popup')
      var count = json.htmlTitle.match(/[0-9]+/)[0]
      getJsonFromPopup(json.htmlUsers)(function(err, data) {
        if (err) {
          console.log(err)
          deferred.reject(err)
        } else {

          deferred.resolve({count: count, data:data})
        }
      })
    } catch(e) {
      console.log("problem", tweetId)
      console.log(url)
    }
  })

  return deferred.promise
}

function getJsonFromPopup(html) {
  return x(html, "li.js-stream-item.stream-item", [{
    userId: "div.account.js-actionable-user@data-user-id",
    screenName: "div.account.js-actionable-user@data-screen-name"
  }])
}

function getActivityDetails(tweetIdList) {
  tweetIdList.forEach(function(tweetId) {
    getAccountsWithActivity(tweetId).then(function(response) {
      var data = {
        tweetId: tweetId,
        rtCount: response.count,
        retweetedAccounts: response.data
      }
      getAccountsWithActivity(tweetId, 'favorited').then(function(response) {
        data['favCount'] = response.count
        data['favoritedAccounts'] = response.data

        fs.appendFileSync("activity.json", JSON.stringify(data) + ",\n")
      })
    })
  })
}


function main() {
  fs.readFile('manisa.json', 'utf-8', function(err, data) {
    var tweetsJson = JSON.parse("["+data+"]")

    var tweetIdList = tweetsJson[0].map(function(tweet) {
      return tweet["tweetId"]
    })

    console.log(tweetIdList)

    getActivityDetails(tweetIdList)
  })
}
fs.writeFileSync("activity.json", "")
main()