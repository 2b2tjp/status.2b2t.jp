const env = require('dotenv-safe').config().parsed
const express = require('express')
const app = express()
const LoggerFactory = require('logger.js').LoggerFactory
const logger = LoggerFactory.getLogger('app', 'green')
logger.info('Using Authorization: ' + env.AUTHORIZATION)
const crypto = require('crypto')
const _fs = require('fs')
const fs = _fs.promises
if (!_fs.existsSync('./data.json')) {
  _fs.writeFileSync('./data.json', '{"tps":[],"players":[],"cpm":[],"playersInQueue":[]}')
}
if (!_fs.existsSync('./payments.json')) {
  _fs.writeFileSync('./payments.json', '[]')
}
const data = JSON.parse(_fs.readFileSync('./data.json'))
const payments = JSON.parse(_fs.readFileSync('./payments.json'))
app.use(express.static('public'))
app.use(express.json({ limit: '10kb' }))

const save = () =>
  Promise.all([fs.writeFile('./data.json', JSON.stringify(data)), fs.writeFile('./payments.json', JSON.stringify(payments))])
    .then(() => { logger.info('Written data to file') })

app.get('/api/payments.json', (req, res) => {
  const uuid = req.query.uuid
  const since = req.query.since
  let filtered = payments
  if (uuid)  filtered = filtered.filter(payment => payment.customer.uuid === uuid.replace(/-/g, ''))
  try {
    if (since) filtered = filtered.filter(payment => payment.payment.timestamp >= parseInt(since, 10))
  } catch (e) {} // eslint-disable-line no-empty
  res.send(JSON.stringify(filtered, null, 2))
})

app.post('/api/payments.json', (req, res) => {
  const json = req.body
  if (!json.payment || !json.customer) {
    return res.status(400).send({ error: 'invalid json' })
  }
  if (json.payment.status !== 'complete') {
    res.status(400).send({ error: 'cannot accept non-completed payments' })
  }
  if (req.headers['x-bc-sig'] !== crypto.createHash('sha256').update(env.TEBEX_SECRET + json['payment']['txn_id'] + json['payment']['status'] + json['customer']['email']).digest('hex')) {
    return res.status(403).send({ error: 'You don\'t have permission to do this.' })
  }
  logger.info('Accepted payment: ' + JSON.stringify(json, null, 2))
  // remove sensitive data
  delete json['payment']['txn_id']
  delete json['customer']['address']
  delete json['customer']['name']
  delete json['customer']['ip']
  delete json['customer']['email']
  delete json['customer']['country']
  delete json['coupons']
  payments.push(json)
  res.send({ status: 'ok' })
  save()
})

app.get('/api/data.json', (req, res) => {
  res.send(JSON.stringify(data, null, 2))
})

app.post('/api/data.json', (req, res) => {
  try {
    if (req.headers['authorization'] !== env.AUTHORIZATION) {
      return res.status(403).send({ error: 'You don\'t have permission to do this.' })
    }
    if (!data.cpm) data.cpm = []
    if (!data.playersInQueue) data.playersInQueue = []
    const isQueue = req.query['queue']
    const players = req.body.players
    if (typeof players !== 'number') return res.status(400).send({ error: 'invalid json' })
    if (isQueue) {
      if (data.playersInQueue.length > 5760) { data.playersInQueue.shift() }
      const time = Date.now()
      data.playersInQueue.push([ time, players ])
    } else {
      const tps = req.body.tps
      const cpm = req.body.cpm
      if (typeof tps !== 'number' || typeof cpm !== 'number') return res.status(400).send({ error: 'invalid json' })
      if (data.tps.length > 5760) { data.tps.shift() }
      if (data.players.length > 5760) { data.players.shift() }
      if (data.cpm.length > 5760) { data.cpm.shift() }
      const time = Date.now()
      data.tps.push([ time, Math.round(tps * 100) / 100 ])
      data.players.push([ time, players ])
      data.cpm.push([ time, cpm ])
    }
    res.send({ status: 'ok' })
    save()
  } catch (e) {
    logger.error(e.stack || e)
    res.status(500).send({ error: 'an internal error occurred' })
  }
})
app.listen(env.PORT)
logger.info('Listening on port ' + env.PORT)

// add exit handler
let exit = false
process.on('SIGINT', () => {
  logger.info('Writing data to file, please wait... (Press CTRL+C for force exit)')
  save().then(() => process.exit())
  if (exit) process.exit()
  exit = true
})
