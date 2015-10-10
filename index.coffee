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
template = '<a href="http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=_IMG_&amp;type=card" title="" class="plugin-mtg-a strip">_NAME_</a>'

## Regex for [mtg][/mtg] custom bbcode
Mtg.regex = /\[mtg\][A-Za-z0-9\&\#;'",.\(\)\[\]\s]+\[\/mtg\]/gm

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
	console.log 'In parsePost!'
	return callback null, data unless _.get(data, 'postData.content')
	Mtg.parseRaw data.postData.content, (err, content) ->
		callback err if err
		data.postData.content = content
		callback null, data

## Function which parses the raw html of a post
Mtg.parseRaw = (content, callback) ->
	console.log 'In parseRaw!'
	cleanedContent = Mtg.clean(content, false, false, true)
	matches = cleanedContent.match(Mtg.regex)
	return callback null, content unless matches
	cardNames = _.uniq matches
	async.map cardNames, ((cardName, next) -> 
		if cache.has cardName
    	next null, cache.get(cardName)
    else
    	console.log "#{cardName} does not exist in cache, getting card.."
			getCard cardName, (err, cardObj) ->
        return next err if err
        console.log "Retrieved #{cardName}! Adding card to cache.."
        console.log "Card obj", cardObj
        cache.set cardName, cardObj
        next err, cardObj
  ), ((err, cards) ->
  	return callback err, content if err
  	console.log "Replacing #{cardNames[i]} with #{card.Name}" for card, i in cards
  	content = content.replace(cardNames[i], template.replace(/_IMG_/g, card.ID).replace(/_NAME_/, card.Name)) for card, i in cards 
  	callback err, content)

## Function to retrieve a magic the gathering card
getCard = (mtgCardName, callback) -> 
  mtgCardName = mtgCardName.replace('[mtg]', '')
  mtgCardName = mtgCardName.replace('[/mtg]', '')
  mtgCardName = mtgCardName.replace('&#39;', "'")
  console.log 'Getting MtG card', mtgCardName
  # console.log encodeURIComponent(mtgCardName)
  uriSafeCardName = encodeURIComponent mtgCardName 
  request.get {url: "http://gatherer.wizards.com/Handlers/InlineCardSearch.ashx?nameFragment=#{ uriSafeCardName }"}, (err, response, body) ->
  	if response.statusCode is 200 then responseData = JSON.parse body else callback err
  	if _.get(responseData, 'Results.length') then callback null, responseData.Results[0] else callback err

module.exports = Mtg
