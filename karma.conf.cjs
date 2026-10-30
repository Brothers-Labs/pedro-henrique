const path = require('node:path');

module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],
    plugins: [require('karma-jasmine'), require('karma-chrome-launcher'), require('karma-coverage')],
    reporters: ['dots', 'coverage'],
    browsers: ['ChromeHeadlessWebGL'],
    customLaunchers: {
      ChromeHeadlessWebGL: {
        base: 'ChromeHeadless',
        flags: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
      },
    },
    coverageReporter: {
      dir: path.join(__dirname, 'coverage', 'pedro-henrique'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'lcovonly' }, { type: 'json' }, { type: 'text-summary' }],
      check: { global: { statements: 80, lines: 80, functions: 80 } },
    },
  });
};
