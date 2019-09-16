const path = require('path');

const cheerio = require('cheerio');
const dotenv = require('dotenv');
const imageToUri = require('image-to-uri');
const ms = require('ms');
const nodemailer = require('nodemailer');
const test = require('ava');
const validator = require('validator');

const base64ToS3 = require('..');

const html = {};

['png', 'jpg', 'jpeg', 'gif', 'svg'].forEach(type => {
  html[type] = `<img src="${imageToUri(
    path.join(__dirname, 'fixtures', `image.${type}`)
  )}" />`;
});

const transport = nodemailer.createTransport({ jsonTransport: true });

dotenv.config();

transport.use(
  'compile',
  base64ToS3({
    maxAge: ms('1d'),
    dir: 'nodemailer/',
    cloudFrontDomainName: process.env.AWS_CLOUDFRONT_DOMAIN,
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      params: {
        Bucket: process.env.AWS_S3_BUCKET
      }
    }
  })
);

test('returns a function', t => {
  t.true(typeof base64ToS3 === 'function');
});

Object.keys(html).forEach(key => {
  test(`converts base64 encoded ${key}`, async t => {
    const res = await transport.sendMail({
      html: html[key],
      subject: 'subject',
      to: 'niftylettuce@gmail.com',
      from: 'niftylettuce@gmail.com'
    });

    const $ = cheerio.load(JSON.parse(res.message).html);
    t.true(validator.isURL($('img').attr('src')));
  });

  test(`converts the same ${key} and does not create new path`, async t => {
    let res = await transport.sendMail({
      html: html[key],
      subject: 'subject',
      to: 'niftylettuce@gmail.com',
      from: 'niftylettuce@gmail.com'
    });

    let $ = cheerio.load(JSON.parse(res.message).html);

    const url = $('img').attr('src');

    t.true(validator.isURL(url));

    res = await transport.sendMail({
      html: html[key],
      subject: 'subject',
      to: 'niftylettuce@gmail.com',
      from: 'niftylettuce@gmail.com'
    });

    $ = cheerio.load(JSON.parse(res.message).html);

    const clone = $('img').attr('src');
    t.true(validator.isURL(clone));
    t.is(url, clone);
  });
});

test('writes to a fallback directory if AWS upload failed (e.g. no bucket param)', async t => {
  const customTransport = nodemailer.createTransport({ jsonTransport: true });
  customTransport.use(
    'compile',
    base64ToS3({
      maxAge: ms('1d')
    })
  );
  const res = await customTransport.sendMail({
    html: html.png,
    subject: 'subject',
    to: 'niftylettuce@gmail.com',
    from: 'niftylettuce@gmail.com'
  });

  const message = JSON.parse(res.message);
  const $ = cheerio.load(message.html);
  t.true(
    validator.isURL($('img').attr('src'), {
      protocols: ['file'],
      require_host: false
    })
  );
});
