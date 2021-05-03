const {pinataApiKey} = require('./env.json')

const config = {

    pinningService: {
        name: 'pinata',
        endpoint: 'https://api.pinata.cloud/psa',
        key: pinataApiKey
    },

    ipfsApiUrl: 'http://localhost:5001',

    ipfsGatewayUrl: 'http://localhost:8080/ipfs',
}

module.exports = config
