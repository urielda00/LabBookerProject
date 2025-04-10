const path       = require('path');
const i18next    = require('i18next');
const Backend    = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng : 'en',
    preload     : ['en', 'he'],
    backend     : {
      // ../locales relative to THIS file
      loadPath : path.join(__dirname, '..', 'locales/{{lng}}/translation.json')
    },
    debug: false           // set true once, restart, and watch the console
  });

module.exports = {
  i18next,
  i18nMiddleware: middleware.handle(i18next)
};
