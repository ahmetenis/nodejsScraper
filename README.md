# nodejsScraper

scraper.js - using query_config.json, users.txt and keywords.txt make searches on twitter

extractFeatures.js - generate txt files for extracted features

### query_config.json example usage
all fields are optional

{
  "lati": "52.2",
  "long": "20.2",
  "mile": "40",
  "lang": "en",
  "place": "istanbul",
  "mentions": "screenName",
  "since": "2016-05-22",
  "until": "2016-06-22"
}

### generated files format
- `hashtag_usage.txt` : `tweet_id`  `user_id` `hashtag_text`
- `media_usage.txt  ` : `tweet_id`  `user_id` `media_entity_url`
- `mention_usage.txt` : `tweet_id`  `user_id` `user_mention_screen_name` `user_mention_id`
- `reply_usage.txt  ` : `tweet_id`  `user_id` `in_reply_to_user_id`
- `RT_usage.txt     ` : `tweet_id`  `user_id` `quoted_tweet`
- `url_usage.txt    ` : `tweet_id`  `user_id` `url`
- `favorite_count.txt`     : `tweet_id`  `favorite_count`
