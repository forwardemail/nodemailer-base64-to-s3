# nodemailer-base64-to-s3

[![build status](https://img.shields.io/travis/ladjs/nodemailer-base64-to-s3.svg)](https://travis-ci.org/ladjs/nodemailer-base64-to-s3)
[![code coverage](https://img.shields.io/codecov/c/github/ladjs/nodemailer-base64-to-s3.svg)](https://codecov.io/gh/ladjs/nodemailer-base64-to-s3)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://lass.js.org)
[![license](https://img.shields.io/github/license/ladjs/nodemailer-base64-to-s3.svg)](<>)

> Convert your base64 encoded data URI's in `<img>` tags to Amazon S3/CloudFront URL's

<img src="https://cdn.rawgit.com/ladjs/nodemailer-base64-to-s3/master/media/screenshot.png" width="361.5" height="80.75" />

> It's the perfect alternative to cid-based [embedded images][nodemailer-doc]!


## Table of Contents

* [Features](#features)
* [Install](#install)
* [Usage](#usage)
* [Options](#options)
* [Gmail Example](#gmail-example)
* [Contributors](#contributors)
* [License](#license)


## Features

> **Tip:** This package is bundled with [Lad][] and already pre-configured for you.

* Converts `<img>` tags with base64 encoded data URI's to absolute paths stored on [S3][] (or optionally [CloudFront][]).
* Supports all standard data URI image types (PNG, JPEG, GIF, SVG)
* Converts SVG images to PNG images using [Lipo][lipo] (since SVG doesn't render in all email clients)
* Checks Amazon S3 bucket before uploading images to prevent a redundant double-upload of the same file (better performance)
* Uses [rev-hash][] to prevent asset naming collisions in your S3 bucket (and to avoid Gmail image cache issues).
* Encodes your images using gzip so your downloads are [compressed and faster][s3-article] (uses `zlib.gzip`) via [zlib][].
* Perfect alternative to [cid][cid-url] embedded images.
* Built for [Lad][] and [font-awesome-assets][].


## Install

[npm][]:

```sh
npm install nodemailer-base64-to-s3
```

[yarn][]:

```sh
yarn add nodemailer-base64-to-s3
```


## Usage

```js
const base64ToS3 = require('nodemailer-base64-to-s3');
const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  // pass some options here to create a transport
  // this example simply shows a JSONTransport type
  // <https://nodemailer.com/transports/>
  jsonTransport: true
});
transport.use('compile', base64ToS3(options));
```


## Options

Accepts the following arguments and returns a [Nodemailer plugin][nodemailer-plugin].

* `options` (Object) - configuration options for `base64ToS3`
  * `maxAge` (Number) - `Cache-Control` headers `max-age` value in milliseconds (defaults to 1 year = `31557600000`)
  * `dir` (String) - Amazon S3 directory inside of `aws.params.Bucket` to upload assets to (defaults to `/` (root) - must end with a trailing forward slash `/`) – if you want to upload to a particular folder in a bucket, then set it here
  * `cloudFrontDomainName` (String) - Amazon CloudFront domain name (e.g. `gzpnk2i1spnlm.cloudfront.net`) (will use `process.env.AWS_CLOUDFRONT_DOMAIN` environment variable by default if available)
  * `aws` (Object) **Required** - configuration options for Amazon Web Services
    * `params` (Object) **Required**
      * `Bucket` (String) **Required** - AWS Bucket Name
  * `fallbackDir` (String) - a fallback directory to write to in case Amazon S3 upload fails (automatically set to `os.tmpdir()` otherwise if `NODE_ENV` is production then it is set to false and disabled) - you may want to specify the full path to your build directory so files are stored there (e.g. `fallbackDir: path.join(__dirname, 'build', 'img', 'nodemailer')`)
  * `fallbackPrefix` (String or Boolean) - the prefix to use for relative paths, e.g. you don't want to have `file:///some/tmp/dir/foo.png`, but you want to have `https://example.com/img/foo.png` instead - so specify that prefix here (e.g. `fallbackPrefix: 'http://localhost:3000/img/nodemailer/'` if you have a build directory `fallbackDir` of `path.join(__dirname, 'build', 'img', 'nodemailer')` and `path.join(__dirname, 'build')` is being served by your web server).  The default value is `false` and therefore `file:///` relative path will be used instead.
  * `logger` (Object) - a logger to use in the event of an error while uploading to S3 (defaults to `console`)


## Gmail Example

**This is a screenshot taken directly from Gmail on a Retina-supported device.**

<img src="https://cdn.rawgit.com/ladjs/nodemailer-base64-to-s3/master/media/gmail-screenshot.png" width="808" height="916" />

Above we have a [Lad][] sample email sent using [Nodemailer][nodemailer] and [Nunjucks][nunjucks].

> What does it look like behind the scenes?

Here's a snippet from the navbar shown in the screenshot above. We utilize [font-awesome-assets][font-awesome-assets] and [nunjucks-highlight.js][nunjucks-highlight.js] for rendering the icons/images and code block.

```nunjucks
<div class="container header p-y-1">
  <nav>
    <ul class="nav nav-pills pull-xs-right">
      <li class="nav-item"><a title="Book" class="btn btn-md btn-outline-secondary" href="{{ config.urls.web }}/{{ locale }}">{{ fa.png2x('book', '#ccc', 20, 20, [ [ 'class', 'fa-img' ] ]) | safe }}<span class="hidden-sm-down"> {{ t('Book') }}</span></a></li>
      <li class="nav-item"><a title="Jobs" class="btn btn-md btn-outline-secondary" href="{{ config.urls.web }}/{{ locale }}/jobs">{{ fa.png2x('briefcase', '#ccc', 20, 20, [ [ 'class', 'fa-img' ] ]) | safe }}<span class="hidden-sm-down"> {{ t('Jobs') }}</a></a></li>
      <li class="nav-item"><a title="GitHub" class="btn btn-md btn-outline-secondary" href="https://github.com/ladjs/lad">{{ fa.png2x('github', '#ccc', 20, 20, [ [ 'class', 'fa-img' ] ]) | safe }}<span class="hidden-sm-down"> GitHub</span></a></li>
    </ul>
  </nav>
  <h1 class="m-b-0 h4"><a class="text-muted" href="{{ config.urls.web }}/{{ locale }}">{{ 'crocodile' | emoji }}<span class="hidden-sm-down"> Lad</span></a></h3>
</div>
```


## Contributors

| Name           | Website                    |
| -------------- | -------------------------- |
| **Nick Baugh** | <http://niftylettuce.com/> |


## License

[MIT](LICENSE) © [Nick Baugh](http://niftylettuce.com/)


## 

[npm]: https://www.npmjs.com/

[yarn]: https://yarnpkg.com/

[font-awesome-assets]: https://github.com/crocodilejs/font-awesome-assets

[cid-url]: https://sendgrid.com/blog/embedding-images-emails-facts/

[s3-article]: http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html

[nodemailer-doc]: https://nodemailer.com/using-embedded-images/

[nodemailer-plugin]: https://github.com/nodemailer/nodemailer#plugin-api

[s3]: https://aws.amazon.com/s3/#pricing

[cloudfront]: https://aws.amazon.com/cloudfront/pricing/

[rev-hash]: https://github.com/sindresorhus/rev-hash

[zlib]: https://nodejs.org/api/zlib.html

[nodemailer]: https://nodemailer.com

[nunjucks]: https://github.com/mozilla/nunjucks

[nunjucks-highlight.js]: https://github.com/niftylettuce/nunjucks-highlight.js

[lad]: https://lad.js.org

[lipo]: https://lipo.io
