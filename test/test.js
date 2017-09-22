const test = require('ava');

const base64ToS3 = require('../');

test('returns a function', t => {
  t.true(typeof base64ToS3 === 'function');
});
