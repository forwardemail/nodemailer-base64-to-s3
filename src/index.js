import sharp from 'sharp';
import uuid from 'uuid';
import _ from 'lodash';
import ms from 'ms';
import promisify from 'es6-promisify';
import zlib from 'zlib';
import AWS from 'aws-sdk';

// eslint-disable-next-line max-len
const regexp = new RegExp(/(<img[\s\S]*? src=")data:(image\/(?:png|jpe?g|gif|svg\+xml));base64,([\s\S]*?)("[\s\S]*?>)/g);

export default function base64ToS3(opts) {

  // set defaults
  opts = _.defaults(opts, {
    maxAge: ms('1yr'),
    dir: '/'
  });

  if (!_.isNumber(opts.maxAge))
    throw new Error('Cache max age `maxAge` must be a Number');

  if (!_.isString(opts.dir))
    throw new Error('Directory name `dir` must be a String');
  else if (!_.endsWith(opts.dir, '/'))
    opts.dir += '/';

  if (_.startsWith(opts.dir, '/'))
    opts.dir = opts.dir.substring(1);

  if (!_.isObject(opts.aws))
    throw new Error('AWS config object `aws` missing (e.g. `base64ToS3({ aws: { ... } })`');

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
        if (result)
          promises.push(transformImage(...result));
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

      // create a buffer of the base64 image
      // and convert it to a png
      const buffer = await sharp(new Buffer(base64, 'base64')).png().toBuffer();

      try {

        // apply transformation and gzip file
        const Body = await promisify(zlib.gzip, zlib)(buffer);

        // generate random filename
        // get the file extension based on mimeType
        const Key = `${opts.dir}${uuid.v4()}.png`;

        const obj = {
          Key,
          ACL: 'public-read',
          Body,
          CacheControl: `public, max-age=${opts.maxAge}`,
          ContentEncoding: 'gzip',
          ContentType: 'image/png'
        };

        const data = await s3.upload(obj).promise();

        const replacement = (_.isString(opts.cloudFrontDomainName)) ?
          `${start}https://${opts.cloudFrontDomainName}/${data.key}${end}`
          : `${start}${data.Location}${end}`;

        resolve([ original, replacement ]);

      } catch (err) {
        reject(err);
      }

    });

  }

  return compile;

}
