'use strict'

let _ = require('lodash')
let express = require('express')
let bodyParser = require('body-parser')
let axios = require('axios')
let moment = require('moment-timezone')
let co = require('co')
let config = require('./config')
let pokemonLookup = require('./pokemon')

let app = express()
app.use(bodyParser.urlencoded({ extended : true }))
app.use(bodyParser.json())

let server = require('http').Server(app)
let port = process.env.PORT || 7800

server.listen(port, function (err) {
  console.log(`<${new Date().toISOString()}> Listening on port ${port}`)
})

app.post('/', function(req, res) {
  console.log(`<${new Date().toISOString()}> ${JSON.stringify(req.body)}`)
  res.sendStatus(200)

  if (req.body.type !== 'pokemon') return

  let message = req.body.message
  let lat = message.latitude
  let lng = message.longitude
  let pokemonId = message.pokemon_id
  let despawnTime = moment.unix(message.disappear_time).tz(config.timezone)

  co(function *() {
    let pokemon = pokemonLookup.find(p => p.id === pokemonId)

    if (_.includes(config.ignore_pokemon, pokemon.short_name)) {
      console.log(`<${new Date().toISOString()}> Skipping ${pokemon.short_name}`)
      return
    }

    let icon = `${config.icon_base_url}/${pokemon.short_name}.png`
    let imageUrl = encodeURI(`https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${lat}+${lng}&zoom=17&size=400x200&scale=2&` +
      `markers=icon:${icon}|${lat}+${lng}&` +
      `key=${config.google_api_key}`)
    let mapsUrl = encodeURI(`https://maps.google.com?q=${lat},${lng}`)

    yield axios.post(config.slack_webhook_url, {
      text: `Who's that Pokémon? It's :${pokemon.name}:`,
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
    })
  }).
  catch(err => {
    console.error(`<${new Date().toISOString()}> Error`, err)
  })
})
