const { promisify } = require('util');
const zlib = require('zlib');
const _ = require('lodash');
const ms = require('ms');
const AWS = require('aws-sdk');
const revHash = require('rev-hash');

const regexp = new RegExp(
  // eslint-disable-next-line max-len
  /(<img[\s\S]*? src=")data:(image\/(?:png|jpe?g|gif|svg\+xml));base64,([\s\S]*?)("[\s\S]*?>)/g
);

const base64ToS3 = opts => {
  // set defaults
  opts = _.defaults(opts, {
    maxAge: ms('1yr'),
    dir: '/'
  });

  if (!_.isNumber(opts.maxAge))
    throw new Error('Cache max age `maxAge` must be a Number');

  if (!_.isString(opts.dir))
    throw new Error('Directory name `dir` must be a String');
  else if (!_.endsWith(opts.dir, '/')) opts.dir += '/';

  if (_.startsWith(opts.dir, '/')) opts.dir = opts.dir.substring(1);

  if (!_.isObject(opts.aws))
    throw new Error(
      'AWS config object `aws` missing (e.g. `base64ToS3({ aws: { ... } })`'
    );

  // prepare AWS upload using config
  const s3 = new AWS.S3(opts.aws);

  async function compile(mail, fn) {
    try {
      // get the html content from the mail
      let html = await mail.resolveContent(mail.data, 'html');

      // create a transformation array of promises
      const promises = [];
      let result;
      do {
        result = regexp.exec(html);
        if (result) promises.push(transformImage(...result));
      } while (result);

      // fulfill promises
      const replacements = await Promise.all(promises);

      // go through each replacement and replace original with new
      _.each(replacements, replacement => {
        html = html.replace(...replacement);
      });

      // update the HTML of the email
      mail.data.html = html;

      // all done!
      fn();
    } catch (err) {
      fn(err);
    }
  }

  function transformImage(original, start, mimeType, base64, end) {
    return new Promise(async (resolve, reject) => {
      try {
        // create a buffer of the base64 image
        // and convert it to a png
        const buffer = Buffer.from(base64, 'base64');

        // apply transformation and gzip file
        const Body = await promisify(zlib.gzip).bind(zlib)(buffer);

        // generate random filename
        // get the file extension based on mimeType
        const Key = `${opts.dir}${revHash(base64)}.png`;

        const obj = {
          Key,
          ACL: 'public-read',
          Body,
          CacheControl: `public, max-age=${opts.maxAge}`,
          ContentEncoding: 'gzip',
          ContentType: 'image/png'
        };

        // we cannot currently use this since it does not return a promise
        // <https://github.com/aws/aws-sdk-js/pull/1079>
        // await s3obj.upload({ Body }).promise();
        //
        // so instead we use promisify to convert it to a promise
        const data = await promisify(s3.upload).bind(s3)(obj);

        const replacement = _.isString(opts.cloudFrontDomainName)
          ? `${start}https://${opts.cloudFrontDomainName}/${data.key}${end}`
          : `${start}${data.Location}${end}`;

        resolve([original, replacement]);
      } catch (err) {
        reject(err);
      }
    });
  }

  return compile;
};

module.exports = base64ToS3;
