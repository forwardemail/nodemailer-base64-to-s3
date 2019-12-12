const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const AWS = require('aws-sdk');
const Lipo = require('lipo');
const _ = require('lodash');
const debug = require('debug')('nodemailer-base64-to-s3');
const isSANB = require('is-string-and-not-blank');
const mime = require('mime-types');
const ms = require('ms');
const revHash = require('rev-hash');

const regexp = new RegExp(
  /(<img[\s\S]*? src=")data:(image\/(?:png|jpe?g|gif|svg\+xml));base64,([\s\S]*?)("[\s\S]*?>)/g
);
const PROD = process.env.NODE_ENV === 'production';
const mkdir = promisify(fs.mkdir).bind(fs);
const writeFile = promisify(fs.writeFile).bind(fs);
const gzip = promisify(zlib.gzip).bind(zlib);
const cache = {};

const base64ToS3 = (options = {}) => {
  // set defaults
  const opts = _.defaults(options, {
    aws: {},
    maxAge: ms('1yr'),
    dir: '/',
    cloudFrontDomainName: process.env.AWS_CLOUDFRONT_DOMAIN || '',
    fallbackDir: process.env.NODE_ENV === 'production' ? false : os.tmpdir(),
    fallbackPrefix: false,
    logger: console
  });

  if (!_.isNumber(opts.maxAge))
    throw new Error('Cache max age `maxAge` must be a Number');

  if (!_.isString(opts.dir))
    throw new Error('Directory name `dir` must be a String');
  else if (!_.endsWith(opts.dir, '/')) opts.dir += '/';

  if (_.startsWith(opts.dir, '/')) opts.dir = opts.dir.slice(1);

  // prepare AWS upload using config
  const s3 = new AWS.S3(opts.aws);

  // we cannot currently use this since it does not return a promise
  // <https://github.com/aws/aws-sdk-js/pull/1079>
  // await s3obj.upload({ Body }).promise();
  //
  // so instead we use promisify to convert it to a promise
  const upload = promisify(s3.upload).bind(s3);

  async function compile(mail, fn) {
    try {
      // get the html content from the mail
      let html = await mail.resolveContent(mail.data, 'html');

      // create a transformation array of promises
      const arr = [];
      let result;
      do {
        result = regexp.exec(html);
        if (result) {
          const [original, start, mimeType, base64, end] = result;
          arr.push({
            original,
            start,
            mimeType,
            base64,
            end
          });
        }
      } while (result);

      // fulfill promises
      const replacements = await Promise.all(
        arr.map(obj => transformImage(obj))
      );

      // go through each replacement and replace original with new
      for (const element of replacements) {
        html = html.replace(...element);
      }

      // update the HTML of the email
      mail.data.html = html;

      // all done!
      fn();
    } catch (err) {
      fn(err);
    }
  }

  async function transformImage({ original, start, mimeType, base64, end }) {
    // get the image extension
    let extension = mime.extension(mimeType);
    // convert and optimize the image if it is an SVG file
    if (extension === 'svg') extension = 'png';
    // if we already cached the base64 then return it
    const hash = revHash(`${extension}:${base64}`);
    let buffer;
    if (cache[hash]) {
      buffer = cache[hash];
      debug(`hitting cache for ${hash}`);
    } else {
      // create a buffer of the base64 image
      // and convert it to a png
      buffer = Buffer.from(base64, 'base64');
      const lipo = new Lipo();
      buffer = await lipo(buffer)
        .png()
        .toBuffer();
      cache[hash] = buffer;
    }

    // apply transformation and gzip file
    const Body = await gzip(buffer);

    // generate random filename
    // get the file extension based on mimeType
    const fileName = `${hash}.${extension}`;
    const Key = `${opts.dir}${fileName}`;

    const obj = {
      Key,
      ACL: 'public-read',
      Body,
      CacheControl: `public, max-age=${opts.maxAge}`,
      ContentEncoding: 'gzip',
      ContentType: 'image/png'
    };

    // use a fallback dir if the upload fails
    // but only if the environment is not production
    try {
      const data = cache[Key] ? cache[Key] : await upload(obj);
      if (cache[Key]) debug(`hitting cache for ${Key}`);

      const replacement = isSANB(opts.cloudFrontDomainName)
        ? `${start}https://${opts.cloudFrontDomainName}/${data.key}${end}`
        : `${start}${data.Location}${end}`;

      cache[Key] = data;

      return [original, replacement];
    } catch (err) {
      // fallback in case upload to S3 fails for whatever reason
      if (opts.fallbackDir) {
        if (PROD) opts.logger.error(err);
        if (!_.isString(opts.fallbackPrefix) && PROD)
          throw new Error(
            'fallbackPrefix was not specified, you cannot use file:/// in production mode'
          );
        const filePath = path.join(opts.fallbackDir, fileName);
        try {
          await mkdir(opts.fallbackDir, { recursive: true });
        } catch (err) {
          if (err.code !== 'EEXIST') throw err;
        }

        await writeFile(filePath, buffer);
        const replacement = _.isString(opts.fallbackPrefix)
          ? `${start}${opts.fallbackPrefix}${fileName}${end}`
          : `${start}file://${filePath}${end}`;
        return [original, replacement];
      }

      throw err;
    }
  }

  return compile;
};

module.exports = base64ToS3;
