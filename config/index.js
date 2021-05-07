const {pinataApiKey, pinataApiSecret} = require('./env.json')

const config = {
    pinataApiKey,
    pinataApiSecret,
    pinningService: {
        name: 'pinata',
        endpoint: 'https://api.pinata.cloud/psa',
        key: pinataApiKey
    },
    ipfsApiUrl: 'http://localhost:5001',
    ipfsGatewayUrl: 'http://localhost:8080/ipfs',
    contractABI: require('./BrokenJazz.json').abi
}

module.exports = config
