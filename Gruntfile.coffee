module.exports = ->
  # Project configuration
  @initConfig
    pkg: @file.readJSON 'package.json'

    # CoffeeScript compilation
    coffee:
      spec:
        options:
          bare: true
        expand: true
        cwd: 'spec'
        src: ['**.coffee']
        dest: 'spec'
        ext: '.js'

    # Browser version building
    noflo_browser:
      build:
        options:
          exposed_modules:
            'noflo': 'noflo'
            'noflo-runtime-postmessage': 'noflo-runtime-postmessage'
        files:
          'browser/noflo-runtime-iframe.js': ['package.json']

    # Automated recompilation and testing when developing
    watch:
      files: ['spec/*.coffee', 'runtime/*.js']
      tasks: ['test']

    # Web server for the browser tests
    connect:
      server:
        options:
          port: 8000

    # BDD tests on browser
    mocha_phantomjs:
      all:
        options:
          output: 'spec/result.xml'
          reporter: 'spec'
          urls: ['http://localhost:8000/spec/runner.html']
          failWithOutput: true

    # Coding standards
    coffeelint:
      components: ['components/*.coffee']
      spec: ['spec/*.coffee']

  # Grunt plugins used for building
  @loadNpmTasks 'grunt-contrib-coffee'
  @loadNpmTasks 'grunt-noflo-browser'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-contrib-connect'
  @loadNpmTasks 'grunt-mocha-phantomjs'
  @loadNpmTasks 'grunt-coffeelint'

  # Our local tasks
  @registerTask 'build', ['noflo_browser']
  @registerTask 'test', ['coffeelint', 'noflo_browser', 'coffee', 'connect', 'mocha_phantomjs']
  @registerTask 'default', ['test']
