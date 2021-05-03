const fs = require('fs-extra')
const path = require('path')

const CID = require('cids')
const ipfsClient = require('ipfs-http-client')
const chalk = require('chalk')
// const uint8ArrayConcat = require('uint8arrays/concat')
// const uint8ArrayToString = require('uint8arrays/to-string')

const Metadata = require('./data/Metadata')
const config = require('../config')
const db = require('../db')

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

    db[options.id] = {
      metadataURI,
      metadata
    }

    await fs.writeFile(path.resolve(__dirname, '../db/index.json'), JSON.stringify(db, null, 2))

    console.log(chalk.grey('Pinning to Pinata...'))



    await this.pin(assetURI)
    await this.pin(metadataURI)

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

  async pin(cidOrURI) {
    const cid = extractCID(cidOrURI)
    await this._configurePinningService()
    const pinned = await this.isPinned(cid)
    if (pinned) {
      return
    }
    await this.ipfs.pin.remote.add(cid, {service: config.pinningService.name})
  }

  // /**
  //  * Get the full contents of the IPFS object identified by the given CID or URI.
  //  *
  //  * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
  //  * @returns {Promise<Uint8Array>} - contents of the IPFS object
  //  */
  // async getIPFS(cidOrURI) {
  //   const cid = stripIpfsUriPrefix(cidOrURI)
  //   return uint8ArrayConcat(await all(this.ipfs.cat(cid)))
  // }
  //
  // /**
  //  * Get the contents of the IPFS object identified by the given CID or URI, and return it as a string.
  //  *
  //  * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
  //  * @returns {Promise<string>} - the contents of the IPFS object as a string
  //  */
  // async getIPFSString(cidOrURI) {
  //   const bytes = await this.getIPFS(cidOrURI)
  //   return uint8ArrayToString(bytes)
  // }
  //
  // /**
  //  * Get the full contents of the IPFS object identified by the given CID or URI, and return it as a base64 encoded string.
  //  *
  //  * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
  //  * @returns {Promise<string>} - contents of the IPFS object, encoded to base64
  //  */
  // async getIPFSBase64(cidOrURI) {
  //   const bytes = await this.getIPFS(cidOrURI)
  //   return uint8ArrayToString(bytes, 'base64')
  // }
  //
  // /**
  //  * Get the contents of the IPFS object identified by the given CID or URI, and parse it as JSON, returning the parsed object.
  //  *
  //  * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
  //  * @returns {Promise<string>} - contents of the IPFS object, as a javascript object (or array, etc depending on what was stored). Fails if the content isn't valid JSON.
  //  */
  // async getIPFSJSON(cidOrURI) {
  //   const str = await this.getIPFSString(cidOrURI)
  //   return JSON.parse(str)
  // }
  //
  async isPinned(cid) {
    if (typeof cid === 'string') {
      cid = new CID(cid)
    }

    const opts = {
      service: config.pinningService.name,
      cid: [cid], // ls expects an array of cids
    }
    for await (const result of this.ipfs.pin.remote.ls(opts)) {
      return true
    }
    return false
  }

  async _configurePinningService() {
    if (!config.pinningService) {
      throw new Error(`No pinningService set up in minty config. Unable to pin.`)
    }

    // check if the service has already been added to js-ipfs
    for (const svc of await this.ipfs.pin.remote.service.ls()) {
      if (svc.service === config.pinningService.name) {
        // service is already configured, no need to do anything
        return
      }
    }

    // add the service to IPFS
    const {name, endpoint, key} = config.pinningService
    if (!name) {
      throw new Error('No name configured for pinning service')
    }
    if (!endpoint) {
      throw new Error(`No endpoint configured for pinning service ${name}`)
    }
    if (!key) {
      throw new Error(`No key configured for pinning service ${name}.` +
          `If the config references an environment variable, e.g. '$$PINATA_API_TOKEN', ` +
          `make sure that the variable is defined.`)
    }
    await this.ipfs.pin.remote.service.add(name, {endpoint, key})
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

function makeGatewayURL(ipfsURI) {
  return config.ipfsGatewayUrl + '/' + stripIpfsUriPrefix(ipfsURI)
}

function extractCID(cidOrURI) {
  const cidString = stripIpfsUriPrefix(cidOrURI).split('/')[0]
  return new CID(cidString)
}

module.exports = IPFS
