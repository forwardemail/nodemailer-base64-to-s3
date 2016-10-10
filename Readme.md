
# nodemailer-base64-to-s3

[![Slack Status][slack-image]][slack-url]
[![NPM version][npm-image]][npm-url]
[![Standard JS Style][standard-image]][standard-url]
[![MIT License][license-image]][license-url]

Convert your Base64-Encoded Data URI's in `<img>` tags to Amazon S3/CloudFront URL's.

<img src="https://cdn.rawgit.com/crocodilejs/nodemailer-base64-to-s3/master/media/screenshot.png" width="361.5" height="80.75" />

It's the perfect alternative to cid-based [embedded images][nodemailer-doc]!


## Index

* [Gmail Example](#gmail-example)
* [Features](#features)
* [Install](#install)
* [Usage](#usage)
* [API](#api)
* [License](#license)


## Gmail Example

**This is a screenshot taken directly from Gmail on a Retina-supported device.**

<img src="https://cdn.rawgit.com/crocodilejs/nodemailer-base64-to-s3/master/media/gmail-screenshot.png" width="808" height="916" />

Above we have a [CrocodileJS][crocodile-url] sample email sent using [Nodemailer][nodemailer] and [Nunjucks][nunjucks].

**What does it look like behind the scenes?**

Here's a snippet from the navbar shown in the screenshot above. We utilize [font-awesome-assets][font-awesome-assets] and [nunjucks-highlight.js][nunjucks-highlight.js] for rendering the icons/images and code block.

```nunjucks
<div class="container header p-y-1">
  <nav>
    <ul class="nav nav-pills pull-xs-right">
      <li class="nav-item"><a title="Book" class="btn btn-md btn-outline-secondary" href="{{ config.urls.web }}/{{ locale }}">{{ fa.png2x('book', '#ccc', 20, 20, [ [ 'class', 'fa-img' ] ]) | safe }}<span class="hidden-sm-down"> {{ t('Book') }}</span></a></li>
      <li class="nav-item"><a title="Jobs" class="btn btn-md btn-outline-secondary" href="{{ config.urls.web }}/{{ locale }}/jobs">{{ fa.png2x('briefcase', '#ccc', 20, 20, [ [ 'class', 'fa-img' ] ]) | safe }}<span class="hidden-sm-down"> {{ t('Jobs') }}</a></a></li>
      <li class="nav-item"><a title="GitHub" class="btn btn-md btn-outline-secondary" href="https://github.com/crocodilejs/crocodile-node-mvc-framework">{{ fa.png2x('github', '#ccc', 20, 20, [ [ 'class', 'fa-img' ] ]) | safe }}<span class="hidden-sm-down"> GitHub</span></a></li>
    </ul>
  </nav>
  <h1 class="m-b-0 h4"><a class="text-muted" href="{{ config.urls.web }}/{{ locale }}">{{ 'crocodile' | emoji }}<span class="hidden-sm-down"> CrocodileJS</span></a></h3>
</div>
```


## Features

* :cloud: Converts `<img>` tags with Base64-Encoded Data URI's to absolute paths stored on [S3][s3] (or optionally [CloudFront][cloudfront]).
* :muscle: Supports all image types (`png|jpg|jpeg|gif|svg`) and converts them to optimized `png`'s using [sharp][sharp].  Unfortunately Gmail does not have great SVG support, and not all clients can render SVG &ndash; so we use PNG's for now.
* :lock: Uses `uuid.v4()` to prevent asset naming collisions in your S3 bucket (and to avoid Gmail image cache issues) via [uuid][uuid].
* :zap: Encodes your images using gzip so your downloads are [compressed and faster][s3-article] (uses `zlib.gzip`) via [zlib][zlib].
* :tada: Perfect alternative to [cid][cid-url] embedded images.
* :crystal_ball: Built for [CrocodileJS][crocodile-url] and [font-awesome-assets][font-awesome-assets].

> **Don't want to configure this yourself?**  Try [CrocodileJS][crocodile-url]!


## Install

```bash
npm install -s nodemailer-base64-to-s3
```


## Usage

ES6:

```js
import base64ToS3 from 'nodemailer-base64-to-s3';
import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({});
transport.use('compile', base64ToS3(opts));
```

ES5:

```js
var base64ToS3 = require('nodemailer-base64-to-s3');
var nodemailer = require('nodemailer');

var transport = nodemailer.createTransport({});
transport.use('compile', base64ToS3(opts));
```


## API

```js
import base64ToS3 from 'nodemailer-base64-to-s3';
```

### `base64ToS3(options)`

Accepts the following arguments and returns a [Nodemailer plugin][nodemailer-plugin].

* `options` (Object) - configuration options for `base64ToS3`
  * `maxAge` (Number) - `Cache-Control` headers `max-age` value in milliseconds (defaults to 1 year = `31557600000`)
  * `dir` (String) - Amazon S3 directory inside of `aws.params.Bucket` to upload assets to (defaults to `/` (root) - must end with a trailing forward slash `/`) &ndash; if you want to upload to a particular folder in a bucket, then set it here
  * `cloudFrontDomainName` (String) - Amazon CloudFront domain name (e.g. `gzpnk2i1spnlm.cloudfront.net`)
  * `aws` (Object) **Required** - configuration options for Amazon Web Services
    * `accessKeyId` (String) **Required** - AWS IAM Access Key ID
    * `secretAccessKey` (String) **Required** - AWS IAM Access Key ID
    * `params` (Object) **Required**
      * `Bucket` (String) **Required** - AWS Bucket Name


## License

[MIT][license-url]


[license-image]: http://img.shields.io/badge/license-MIT-blue.svg
[license-url]: LICENSE
[npm-image]: https://img.shields.io/npm/v/nodemailer-base64-to-s3.svg
[npm-url]: https://npmjs.org/package/nodemailer-base64-to-s3
[crocodile-url]: https://crocodilejs.com
[standard-image]: https://img.shields.io/badge/code%20style-standard%2Bes7-brightgreen.svg
[standard-url]: https://github.com/crocodilejs/eslint-config-crocodile
[slack-image]: http://slack.crocodilejs.com/badge.svg
[slack-url]: http://slack.crocodilejs.com
[font-awesome-assets]: https://github.com/crocodilejs/font-awesome-assets
[cid-url]: https://sendgrid.com/blog/embedding-images-emails-facts/
[sharp]: https://github.com/lovell/sharp
[s3-article]: http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html
[nodemailer-doc]: https://nodemailer.com/using-embedded-images/
[nodemailer-plugin]: https://github.com/nodemailer/nodemailer#plugin-api
[s3]: https://aws.amazon.com/s3/#pricing
[cloudfront]: https://aws.amazon.com/cloudfront/pricing/
[uuid]: https://www.npmjs.com/package/uuid
[zlib]: https://nodejs.org/api/zlib.html
[nodemailer]: https://nodemailer.com
[nunjucks]: https://github.com/mozilla/nunjucks
[nunjucks-highlight.js]: https://github.com/niftylettuce/nunjucks-highlight.js
