'use strict';
var scraper = require("./scraper");
var request = require("request");
var fs = require("fs");


var path;

function getUserTimeline(screenName) {
  var url = "https://twitter.com/" + screenName;
  console.log("getting usertimeline: %s", screenName);
  scraper.getJson(url)(function(err, data) {
    var maxPos = data.slice(-1).pop()["tweetId"];
    var count = data.length;
    fs.writeFile("tmp/" + screenName + "_timeline.json", JSON.stringify(data));
    getNext(screenName, maxPos, count)
  });
}

function getNext(screenName, maxPos, count) {
  var url = "https://twitter.com/i/profiles/show/" + screenName +
            "/timeline/tweets?include_available_features=1&include_entities=1&max_position=" + 
            maxPos + "&reset_error_state=false";
  
  request(url, function(err, response, html) {
    if (err) {
      console.log(err)
      console.log(response)
      console.log(html)
    }
    console.log("response status code:", response.statusCode)
    var json = JSON.parse(html)
    scraper.getJson(json["items_html"])(function(err, data) {
      fs.appendFile('tmp/' + screenName + '_timeline.json', '\n' + JSON.stringify(data))
      if (json.new_latent_count == 0) {
        console.log("No more tweets\nTOTAL COUNT:", count)
        return
      } 
      count += json.new_latent_count
      console.log("TOTAL COUNT for %s: %d", screenName, count)
      if (count < 5000) {
        getNext(screenName, json["min_position"], count)
      }
    })
  });

  scraper.getJson(url)(function(err, data) {
    fs.appendFile(screenName + "_timeline.json", JSON.stringify(data));
  });
}

function main() {
  var users = fs.readFileSync("users.txt", "utf8").match(/^.+$/gm);
  users.forEach(function(user) {
    getUserTimeline(user);
  });
}

if (require.main === module) {
  main();
}