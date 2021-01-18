const env = require('dotenv-safe').config().parsed
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const LoggerFactory = require('logger.js').LoggerFactory
const logger = LoggerFactory.getLogger('app', 'green')
logger.info('Using Authorization: ' + env.AUTHORIZATION)
const _fs = require('fs')
const fs = _fs.promises
if (!_fs.existsSync('./data.json')) {
  _fs.writeFileSync('./data.json', '{"tps":[],"players":[],"cpm":[]}')
}
const data = JSON.parse(_fs.readFileSync('./data.json'))
app.use(express.static('public'))
app.use(bodyParser.json())
app.get('/api/data.json', (req, res) => {
  res.send(JSON.stringify(data, null, 2))
})
app.post('/api/data.json', (req, res) => {
  if (req.headers['authorization'] !== env.AUTHORIZATION) {
    return res.status(403).send({ error: 'You don\'t have permission to do this.' })
  }
  if (!data.cpm) data.cpm = []
  if (!data.chunkGens) data.chunkGens = []
  const tps = req.body.tps
  const players = req.body.players
  const cpm = req.body.cpm
  if (typeof tps !== 'number' || typeof players !== 'number' || typeof cpm !== 'number') return res.status(400).send({ error: 'invalid json' })
  if (data.tps.length > 20160) data.tps.shift()
  if (data.players.length > 20160) data.players.shift()
  if (data.cpm.length > 20160) data.cps.shift()
  const time = Date.now()
  data.tps.push([ time, Math.round(tps * 100) / 100 ])
  data.players.push([ time, players ])
  data.cpm.push([ time, cpm ])
  res.send({ status: 'ok' })
  save()
})
app.listen(3030)
logger.info('Listening on port 3030')

const save = () => fs.writeFile('./data.json', JSON.stringify(data)).then(() => { logger.info('Written data to file') })

// add exit handler
let exit = false
process.on('SIGINT', () => {
  logger.info('Writing data to file, please wait... (Press CTRL+C for force exit)')
  save().then(() => process.exit())
  if (exit) process.exit()
  exit = true
})
