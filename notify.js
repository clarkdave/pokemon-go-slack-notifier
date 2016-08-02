'use strict'

let express = require('express')
let bodyParser = require('body-parser')
let axios = require('axios')
let moment = require('moment-timezone')
let config = require('./config')

let app = express()
app.use(bodyParser.urlencoded({ extended : true }))
app.use(bodyParser.json())

let server = require('http').Server(app)
let port = process.env.PORT || 7800
let googleKey = config.google_api_key
let iconBaseUrl = config.icon_base_url

server.listen(port, function (err) {
  console.log('Listening on port ' + port)
});

app.post('/', function(req, res) {
  res.sendStatus(200)

  if (req.body.type !== 'pokemon') return

  let message = req.body.message
  let lat = message.latitude
  let lng = message.longitude
  let pokemon = message.pokemon_id
  let despawnTime = moment(message.disappear_time).tz(config.timezone)

  let imageUrl = encodeURI(`https://maps.googleapis.com/maps/api/staticmap?` +
    `center=${lat}+${lng}&zoom=18&size=400x200&scale=2&` +
    `markers=icon:${config.icon_base_url}/${pokemon}.png|${lat}+${lng}&` +
    `key=${config.google_api_key}`)
  let mapsUrl = encodeURI(`https://maps.google.com?q=${lat},${lng}`)

  axios.post(config.slack_webhook_url, {
    text: `Who's that Pokémon? It's :${pokemon}:`,
    attachments: [{
      fallback: '',
      title: '',
      title_link: mapsUrl,
      image_url: imageUrl,
      color: '#764fa5',
      fields: [{
        title: 'Despawn',
        value: `${despawnTime.format('HH:mm')} (${despawnTime.diff(moment(), 'minutes')} minutes)`,
        short: true,
      }, {
        title: 'Location',
        value: `<${mapsUrl}|Google Maps>`,
        short: true,
      }],
    }],
    unfurl_links: true,
  }).
  then(() => {
    console.log(`<${new Date().toISOString()}> Slack webhook succeeded`)
  }).
  catch(err => {
    console.error(`<${new Date().toISOString()}> Slack webhook error`, err)
  })
})
