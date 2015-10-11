## Main file
async = module.parent.require 'async'
Mtg = {}
request = require 'request'
_ = require 'lodash'

## Initial Setup
cache = module.parent.require('lru-cache')({
    maxAge: 100*60*60*24,
    max: 100
})

## HTML template
template = '<span data-cardurl="http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=_IMG_&amp;type=card" class="plugin-mtg-a">_NAME_</span>'
templateBroken = '<span class="plugin-mtg-a-broken">_NAME_</span>'

## Regex for [mtg][/mtg] custom bbcode
Mtg.regex = /\[mtg\][A-Za-z0-9\&\#\-;'",.\(\)\[\]\s]+\[\/mtg\]/gm

## Function which filters out text this plugin should not parse (code, blockquotes, etc.)
Mtg.clean = (input, isMarkdown, stripBlockquote, stripCode) ->
	return input unless input
	if stripBlockquote
		bqMatch = if isMarkdown then /^>.*$/gm else /^<blockquote>.*<\/blockquote>/gm
		input = input.replace bqMatch, ''
	if stripCode
		pfMatch = if isMarkdown then /`[^`\n]+`/gm else /<code>.*<\/code>/gm;
		input = input.replace pfMatch, ''
	return input

## Function which fires on post creation
Mtg.parsePost = (data, callback) ->
	return callback null, data unless _.get(data, 'postData.content')
	Mtg.parseRaw data.postData.content, (err, content) ->
		callback err if err
		data.postData.content = content
		callback null, data

## Function which parses the raw html of a post
Mtg.parseRaw = (content, callback) ->
	cleanedContent = Mtg.clean(content, false, false, true)
	matches = cleanedContent.match(Mtg.regex)
	return callback null, content unless matches
	cardNames = _.uniq matches
	async.map cardNames, ((cardName, next) -> 
		return next null, cache.get(cardName) if cache.has cardName
		getCard cardName, (err, cardObj) ->
      return next err if err
      cache.set cardName, cardObj
      return next err, cardObj
  ), ((err, cards) ->
  	if err
      return callback err, content 
    for card, i in cards
      content = Mtg.render content, cardNames, card, i
    callback err, content)

## Function to replace test with template
Mtg.render = (content, cardNames, card, i) ->
  return content.replace(cardNames[i], template.replace(/_IMG_/g, card.ID).replace(/_NAME_/, card.Name)) if card
  return content.replace(cardNames[i], templateBroken.replace(/_NAME_/, cardNames[i].replace('[mtg]', '').replace('[/mtg]', '')))

## Function to retrieve a magic the gathering card
getCard = (mtgCardName, callback) -> 
  mtgCardName = mtgCardName.replace('[mtg]', '')
  mtgCardName = mtgCardName.replace('[/mtg]', '')
  mtgCardName = mtgCardName.replace('&#39;', "'")
  uriSafeCardName = encodeURIComponent mtgCardName 
  request.get {url: "http://gatherer.wizards.com/Handlers/InlineCardSearch.ashx?nameFragment=#{ uriSafeCardName }"}, (err, response, body) ->
  	if response.statusCode is 200 then responseData = JSON.parse body else return callback err
  	if _.get(responseData, 'Results.length') then callback null, responseData.Results[0] else return callback err

module.exports = Mtg
