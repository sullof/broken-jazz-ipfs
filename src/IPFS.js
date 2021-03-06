const fs = require('fs-extra')
const path = require('path')

const CID = require('cids')
const ipfsClient = require('ipfs-http-client')
const chalk = require('chalk')

const Metadata = require('./data/Metadata')
const config = require('../config')
const db = require('./Db')

const pinataSDK = require('@pinata/sdk')
const pinata = pinataSDK(config.pinataApiKey, config.pinataApiSecret)

class IPFS {
  constructor() {
    this.ipfs = ipfsClient(config.ipfsApiUrl)
  }

  async addAndPin(options) {

    const content = await fs.readFile(options.file)
    const basename = path.basename(options.file)

    const ipfsPath = '/nft/' + basename
    const {cid: assetCid} = await this.ipfs.add({path: ipfsPath, content})

    const assetURI = ensureIpfsUriPrefix(assetCid) + '/' + basename

    const metadata = await this.makeNFTMetadata(assetURI, options)
    const {cid: metadataCid} = await this.ipfs.add({path: '/nft/metadata.json', content: JSON.stringify(metadata)})

    const metadataURI = ensureIpfsUriPrefix(metadataCid) + '/metadata.json'

    db.set(options.id, {
      metadataURI,
      metadata
    })

    console.log(chalk.grey('Pinning to Pinata...'))

    await this.pin(metadataURI, `metadata${options.id}.json`)
    await this.pin(assetURI, `BrokenJazz${options.id}.mp4`)

    return {
      metadata,
      assetURI,
      metadataURI,
      assetGatewayURL: makeGatewayURL(assetURI),
      metadataGatewayURL: makeGatewayURL(metadataURI),
    }
  }

  async makeNFTMetadata(assetURI, options) {

    const {id, track} = options
    const json = Metadata.getMetadataJSON(id, track)
    json.image = ensureIpfsUriPrefix(assetURI)
    return json
  }

  async pin(cidOrURI, name) {
    console.log('Pinning', name, 'to Pinata')
    const options = {
      pinataMetadata: {
        name
      }
    }
    let cid = cidOrURI.split('/')[2]
    await pinata.pinByHash(cid, options)
  }

  async pinList(options) {
    const list = await pinata.pinList({
      pageLimit: 200
    })
    if (options.onlyHash) {
      let arr = []
      for (let elem of list.rows) {
        arr.push(elem.ipfs_pin_hash)
      }
      return arr
    } else {
      return list
    }
  }

}

function stripIpfsUriPrefix(cidOrURI) {
  if (cidOrURI.startsWith('ipfs://')) {
    return cidOrURI.slice('ipfs://'.length)
  }
  return cidOrURI
}

function ensureIpfsUriPrefix(cidOrURI) {
  if (!cidOrURI.toString().startsWith('ipfs://')) {
    return 'ipfs://' + cidOrURI
  }
  return cidOrURI.toString()
}

function extractCID(cidOrURI) {
  const cidString = stripIpfsUriPrefix(cidOrURI).split('/')[0]
  return new CID(cidString)
}


function makeGatewayURL(ipfsURI) {
  return config.ipfsGatewayUrl + '/' + stripIpfsUriPrefix(ipfsURI)
}

module.exports = IPFS
