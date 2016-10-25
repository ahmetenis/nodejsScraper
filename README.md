# nodejsScraper

scraper.js - using query_config.json, users.txt and keywords.txt make searches on twitter

extractFeatures.js - generate txt files for extracted features
### keywords.txt
To make searchs like Twitter Advanced Search https://twitter.com/search-advanced
using keywords.txt file you need to format the txt file as described below.

For the words you put in
- "All of these words" Field: put a space between words
- "This exact phrase" Field: put the words inside quotes
- "Any of these words" Field: use OR between words (OR with capital letters)
- "None of these words" Field: put a minus(-) sign before each word that you want to exclude
- "These hashtags" Field: include "#" sign before the hashtag text
  
### users.txt
To get tweets from certain users, provide the screen names in users.txt file.

### query_config.json
Using query_config.json file you can further filter the results that the scraper returns.

You can see an example usage of query_config.json file below, all fields are optional.

{
  "lati": "52.2",
  "long": "20.2",
  "mile": "40",
  "lang": "en",
  "place": "istanbul",
  "mentions": ["screenName1", "screenName2"],
  "since": "2016-05-22",
  "until": "2016-06-22"
}

