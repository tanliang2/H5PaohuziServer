'use strict';
/**
 * db config
 * @type {Object}
 */
export default {
  type: 'mongo',
  adapter: {
    mongo: {
      host: 'localhost',
      port: '27017',
      database: 'mahjong',
      user: 'hotniao',
      password: '18665872276',
      prefix: '',
      encoding: 'utf8'
    }
  }
};