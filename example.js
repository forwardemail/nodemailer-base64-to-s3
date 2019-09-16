const ms = require('ms');
const nodemailer = require('nodemailer');

const base64ToS3 = require('.');

const html =
  '<img width="16" height="16" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABYklEQVRoge2ZsUoDQRCGv4uigsRgEQOBwya1WlsIdnmYPIOFvW1eRPuAjyDkBS6VsQlaxeYssgfnarzc3OpkZT5YuOV2Z/6fnTtub0HONTAF8oZt6mL9KcfAoqHwclu4mLVpCQ1cAB3h3O/oAOeSibvChPte/xZ4qRmjC9yU+gdCLSKGfC6BgSDGwIsxlAiRltDW4JfQHpACScW8vtc/FeT25/SpXskcmAHv/o0UeACWhHuz/FZbOq1pIb4HzLdAWN02B3o7wBi49JckAg6BbgJklJYjMrKE1XJES/SvUTOgjRnQxgxoYwa0SYCRtggjdkJ9nxeMfhhTLtcgeaN/iKM3EHI/UPwIOAOu1ox5BJ7cdZC8IQ0cAW8bjm0DryGShiyhO1bCqmi7sUGwLaU2ZkAbM6DNvzAw0xbRgKwFTLRVNGAC8f5efwZOCiexHXDcO81fjpI2PWLSImfNEZNhGIYOH2xyJC1ddamJAAAAAElFTkSuQmCC" />';

const transport = nodemailer.createTransport({
  service: 'postmark',
  auth: {
    user: process.env.POSTMARK_API_TOKEN,
    pass: process.env.POSTMARK_API_TOKEN
  }
});

transport.use(
  'compile',
  base64ToS3({
    maxAge: ms('1d'),
    dir: 'base64-to-s3-test/',
    cloudFrontDomainName: process.env.AWS_CLOUDFRONT_DOMAIN,
    aws: {
      params: {
        Bucket: process.env.AWS_S3_BUCKET
      }
    }
  })
);

transport.sendMail(
  {
    html,
    subject: process.env.SUBJECT_EMAIL,
    to: process.env.TO_EMAIL,
    from: process.env.FROM_EMAIL
  },
  (err, data) => {
    if (err) throw err;
    console.log('data', data);
  }
);
