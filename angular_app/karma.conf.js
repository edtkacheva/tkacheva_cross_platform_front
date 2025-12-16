module.exports = function (config) {
    config.set({
      basePath: '',
      frameworks: ['jasmine'],
      files: [
        'src/test.ts'
      ],
      preprocessors: {
        'src/test.ts': ['coverage']
      },
      coverageReporter: {
        dir: require('path').join(__dirname, './coverage'),
        subdir: '.',
        reporters: [
          { type: 'html' },
          { type: 'lcovonly' }
        ]
      },
      reporters: ['progress', 'coverage'],
      browsers: ['Chrome'],
      singleRun: false,
      restartOnFileChange: true
    });
  };
  