const tracks = require('./tracks')
const serials = require('../../store/serials')

class Metadata {

  static getMetadataJSON(id, track) {
    if (!serials[id]) {
      throw new Error('Serial not found')
    }
    return {
      description: `Francesco Sullo printed only 50 copies of his Broken Jazz record, numbered from 1 to 50, plus four printing tests numbered as A, B, C, and F. First owners of a physical CD can connect to https://brokenjazz.cc to claim their NFT.`,
      external_url: `https://brokenjazz.cc/items/${id}`,
      name: `Broken Jazz ${id < 51
          ? 'NE ' + id + '/50'
          : id === 54
              ? 'AC 1/1'
              : 'AP ' + (id - 50) + '/3'} (serial: ${serials[id]})`,
      attributes: [
        {
          trait_type: 'Track Number',
          value: (track < 10 ? '0' : '') + track
        },
        {
          trait_type: 'Track Title',
          value: tracks[track]
        },
        {
          trait_type: 'Serial',
          value: serials[id]
        },
        {
          trait_type: id < 51
              ? 'Numbered Edition'
              : id === 54
                  ? "Artists's copy"
                  : "Artist's Proof",
          value: id < 51
              ? id + '/50'
              : id === 54
                  ? '1/1'
                  : (id - 50) + '/3'
        }
      ]
    }
  }

}

module.exports = Metadata
