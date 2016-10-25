'use strict';
var fs = require('fs');

function generateQuery() {
  var queryConfig = fs.readFileSync('./query_config.json', 'utf8').toString()
  queryConfig = JSON.parse(queryConfig)
  
  var query = ""
  // KEYWORDS
  var keywords = fs.readFileSync("./keywords.txt", "utf8").toString().match(/^.+$/gm)
  if (keywords) {
    keywords.forEach(function(keyword) {
      query += keyword + " "
    })
    query = query.trim()
  }

  // USERS
  var users = fs.readFileSync("users.txt", "utf8").toString().match(/^.+$/gm)
  console.log(users)
  if (users && users.length) {
    users.forEach(function(user, index) {
      var screenName = user.split(/[ ]+/)[0]
      if (index == 0) {
        query += " from:" + screenName
      } else {
        query += " OR from:" + screenName
      }
    })
    query = query.trim()
  }

  // GEOCODE
  var lat = queryConfig["lati"]
  var long = queryConfig["long"]
  var place = queryConfig["place"]
  var mile = queryConfig["mile"]
  var lang = queryConfig["lang"]
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

  // MENTIONING
  var mentions = queryConfig['mentions']
  if (mentions && mentions.length) {
    mentions.forEach(function(user, index) {
      if (index == 0) {
        query += " @" + user
      } else {
        query += " OR @" + user
      }
    })
    query = query.trim()
  }

  // DATE
  var since = queryConfig['since']
  var until = queryConfig['until']
  if (since) {
    query += " since:" + since
  }
  if (until) {
    query += " until:" + until
  }

  query = query.trim()
  
  console.log('query: ' + query)
  query = encodeURIComponent(query)
  // (/\:/g, '%3A').replace(/\@/g, '%40')
  //         .replace(/ /g, '%20').replace(/\#/g, '%23')
  return query
}

module.exports = {
  "generateQuery": generateQuery
}