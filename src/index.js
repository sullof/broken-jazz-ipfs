#!/usr/bin/env node

const fs = require('fs-extra')
const path = require('path')

const pkg = require('../package.json')
const chalk = require('chalk')
const colorize = require('json-colorizer')
const IPFS = require('./IPFS')
const ethers = require('ethers')
const {Contract} = require('@ethersproject/contracts')

const {infuraApiKey, oracleKey, signableAddress} = require('../config/env.json')
const {contractABI} = require('../config')

const db = require('./Db')

const commandLineArgs = require('command-line-args')

const optionDefinitions = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean
  },
  {
    name: 'list',
    alias: 'l',
    type: Boolean
  },
  {
    name: 'only-hash',
    alias: 'o',
    type: Boolean
  },
  {
    name: 'id',
    alias: 'i',
    type: Number
  },
  {
    name: 'track',
    alias: 't',
    type: Number
  },
  {
    name: 'claimer',
    alias: 'c',
    type: String
  }
]

function error(message) {
  if (!Array.isArray(message)) {
    message = [message]
  }
  console.error(chalk.red(message[0]))
  if (message[1]) {
    console.info(message[1])
  }
  /*eslint-disable-next-line*/
  process.exit(1)
}

let options = {}
try {
  options = commandLineArgs(optionDefinitions, {
    camelCase: true
  })
} catch (e) {
  error(e.message)
}

if (options.list) {
  listPins(options)
} else if (options.claimer && options.id) {
  signClaim(options)
} else if (options.id && options.track) {
  let id = options.id
  if (id < 10) id = '0' + id
  options.file = path.resolve(__dirname, '../issues', `BrokenJazz${id}.mp4`)
  if (!fs.existsSync(options.file)) {
    console.error('ERROR: Missing video file\n')
  } else {
    addToIPFSAndPin(options)
  }
} else {
  console.error('ERROR: Missing parameters\n')
  options.help = true
}


if (options.help) {
  console.info(`${pkg.description}

Options:
  -h, --help            This help.
  -i, --id              The id of the NFT
  -t, --track           The track number for the NFT
                          
Examples:
  $ bji -i 23 -t 12                                           Creates a pin
  $ bji -i 23 -c 0x79F7e5286B87F090A678a334fDD5bbD439733eaA   Authorize a claim
`)
  // eslint-disable-next-line no-process-exit
  process.exit(0)
}


const colorizeOptions = {
  pretty: true,
  colors: {
    STRING_KEY: 'blue.bold',
    STRING_LITERAL: 'green'
  }
}

async function listPins(options) {
  const ipfs = new IPFS()
  const list = await ipfs.pinList(options)

  console.log(list)
}

async function signClaim(options) {

  const token = db.get(options.id)
  if (!token) {
    return console.error('Token not found')
  }

  const provider = new ethers.providers.InfuraProvider(1, infuraApiKey)
  const contract = new Contract(signableAddress, contractABI, provider)
  const hash = await contract.encodeForSignature(options.claimer, options.id, token.metadataURI)

  const signingKey = new ethers.utils.SigningKey(oracleKey)
  const signedDigest = signingKey.signDigest(hash)
  const signature = ethers.utils.joinSignature(signedDigest)

  const verify = await contract.isSignedByOracle(hash, signature)
  if (verify) {
    token.claimer = options.claimer
    token.signature = signature
    db.set(options.id, token)
    console.error('Token signed by the oracle')
  } else {
    console.error('Not signed by the oracle')
  }
  process.exit(0)
}

async function addToIPFSAndPin(options) {
  const ipfs = new IPFS()
  console.log(chalk.grey('Starting...'))

  const nft = await ipfs.addAndPin(options)

  console.log('🌿 Added and pinned new NFT data: ')

  alignOutput([
    ['Metadata URI:', chalk.blue(nft.metadataURI)],
    ['Metadata Gateway URL:', chalk.blue(nft.metadataGatewayURL)],
    ['Asset URI:', chalk.blue(nft.assetURI)],
    ['Asset Gateway URL:', chalk.blue(nft.assetGatewayURL)],
  ])
  console.log('NFT Metadata:')
  console.log(colorize(JSON.stringify(nft.metadata), colorizeOptions))
}

function alignOutput(labelValuePairs) {
  const maxLabelLength = labelValuePairs
      .map(([l, _]) => l.length)
      .reduce((len, max) => len > max ? len : max)
  for (const [label, value] of labelValuePairs) {
    console.log(label.padEnd(maxLabelLength + 1), value)
  }
}
