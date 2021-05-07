const JSONdb = require('simple-json-db')
const path = require('path')
const fs = require('fs-extra')

class Db {

  constructor() {
    const dbDir = path.resolve(__dirname, '../db')
    fs.ensureDirSync(dbDir)
    this.db = new JSONdb(path.resolve(dbDir, 'data.json'))
  }

  get(key) {
    return this.db.get(key)
  }

  set(key, value) {
    return this.db.set(key, value)
  }
}
let instance
if (!instance) {
  instance = new Db()
}
module.exports = instance

