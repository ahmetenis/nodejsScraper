'use strict'
var Xray = require("x-ray")
var fs = require("fs")
var request = require("request")
var process = require
var x = Xray()
var q = require("q")

function getAccountsWithActivity(tweetId, activity) {
  activity = activity || "retweeted"
  var url = "https://twitter.com/i/activity/" + activity + "_popup?id="+tweetId
  var deferred = q.defer()
  request(url, function(err, response, html) {
    var json = JSON.parse(html)
    console.log('getting popup')
    getJsonRetweetPopup(json.htmlUsers)(function(err, data) {
      if (err) {
        console.log("icerde ",err)
        deferred.reject(err)
      } else {
        deferred.resolve(data)
      }
    })
  })
  return deferred
}

function getJsonFromPopup(html) {
  return x(html, "li.js-stream-item.stream-item", [{
    userId: "div.account.js-actionable-user@data-user-id",
    screenName: "div.account.js-actionable-user@data-screen-name"
  }])
}


function getActivityDetails(tweetIdList) {
  
}