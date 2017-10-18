const test = require('ava');
const nodemailer = require('nodemailer');
const ms = require('ms');
const dotenv = require('dotenv');
const cheerio = require('cheerio');
const validator = require('validator');
const base64ToS3 = require('../');

const html =
  // eslint-disable-next-line max-len
  '<img width="16" height="16" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABYklEQVRoge2ZsUoDQRCGv4uigsRgEQOBwya1WlsIdnmYPIOFvW1eRPuAjyDkBS6VsQlaxeYssgfnarzc3OpkZT5YuOV2Z/6fnTtub0HONTAF8oZt6mL9KcfAoqHwclu4mLVpCQ1cAB3h3O/oAOeSibvChPte/xZ4qRmjC9yU+gdCLSKGfC6BgSDGwIsxlAiRltDW4JfQHpACScW8vtc/FeT25/SpXskcmAHv/o0UeACWhHuz/FZbOq1pIb4HzLdAWN02B3o7wBi49JckAg6BbgJklJYjMrKE1XJES/SvUTOgjRnQxgxoYwa0SYCRtggjdkJ9nxeMfhhTLtcgeaN/iKM3EHI/UPwIOAOu1ox5BJ7cdZC8IQ0cAW8bjm0DryGShiyhO1bCqmi7sUGwLaU2ZkAbM6DNvzAw0xbRgKwFTLRVNGAC8f5efwZOCiexHXDcO81fjpI2PWLSImfNEZNhGIYOH2xyJC1ddamJAAAAAElFTkSuQmCC" />';
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
        Bucket: process.env.AWS_BUCKET
      }
    }
  })
);

test('returns a function', t => {
  t.true(typeof base64ToS3 === 'function');
});

test('converts base64 encoded image', async t => {
  const res = await transport.sendMail({
    html,
    subject: 'subject',
    to: 'niftylettuce@gmail.com',
    from: 'niftylettuce@gmail.com'
  });

  const $ = cheerio.load(JSON.parse(res.message).html);
  t.true(validator.isURL($('img').attr('src')));
});

test('converts the same image and does not create new path', async t => {
  let res = await transport.sendMail({
    html,
    subject: 'subject',
    to: 'niftylettuce@gmail.com',
    from: 'niftylettuce@gmail.com'
  });

  let $ = cheerio.load(JSON.parse(res.message).html);

  const url = $('img').attr('src');

  t.true(validator.isURL(url));

  res = await transport.sendMail({
    html,
    subject: 'subject',
    to: 'niftylettuce@gmail.com',
    from: 'niftylettuce@gmail.com'
  });

  $ = cheerio.load(JSON.parse(res.message).html);

  const clone = $('img').attr('src');
  t.true(validator.isURL(clone));

  t.is(url, clone);
});
