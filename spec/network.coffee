describe 'IFRAME network runtime', ->
  iframe = null
  origin = null

  send = (protocol, command, payload) ->
    msg =
      protocol: protocol
      command: command
      payload: payload
    serialized = JSON.stringify msg
    iframe.postMessage serialized, '*'
  receive = (protocol, expects, done) ->
    listener = (message) ->
      msg = JSON.parse message.data
      return if msg.protocol isnt protocol
      expected = expects.shift()
      return done() unless expected
      unless expected.payload
        chai.expect(msg.command).to.equal expected.command
      else
        chai.expect(msg).to.eql expected
      if expects.length is 0
        window.removeEventListener 'message', listener, false
        done()
    window.addEventListener 'message', listener, false
  before (done) ->
    iframeElement = document.getElementById 'network'
    iframe = iframeElement.contentWindow
    origin = window.location.origin
    iframeElement.onload = ->
      done()

  describe 'Runtime Protocol', ->
    describe 'requesting runtime metadata', ->
      it 'should provide it back', (done) ->
        listener = (message) ->
          window.removeEventListener 'message', listener, false
          msg = message.data
          msg = JSON.parse msg
          chai.expect(msg.protocol).to.equal 'runtime'
          chai.expect(msg.command).to.equal 'runtime'
          chai.expect(msg.payload).to.be.an 'object'
          chai.expect(msg.payload.type).to.equal 'noflo-browser'
          chai.expect(msg.payload.capabilities).to.be.an 'array'
          done()
        window.addEventListener 'message', listener, false
        send 'runtime', 'getruntime', ''

  describe 'Graph Protocol', ->
    describe 'receiving a graph and nodes', ->
      it 'should provide the nodes back', (done) ->
        expects = [
            protocol: 'graph'
            command: 'clear'
         ,
            protocol: 'graph'
            command: 'addnode'
            payload:
              id: 'Foo'
              component: 'core/Repeat'
              metadata:
                hello: 'World'
              graph: 'foo'
          ,
            protocol: 'graph'
            command: 'addnode'
            payload:
              id: 'Bar'
              component: 'core/Drop'
              metadata: {}
              graph: 'foo'
        ]
        receive 'graph', expects, done
        send 'graph', 'clear',
          baseDir: '/noflo-runtime-iframe'
          id: 'foo'
          main: true
        send 'graph', 'addnode', expects[1].payload
        send 'graph', 'addnode', expects[2].payload
    describe 'receiving an edge', ->
      it 'should provide the edge back', (done) ->
        expects = [
          protocol: 'graph'
          command: 'addedge'
          payload:
            src:
              node: 'Foo'
              port: 'out'
            tgt:
              node: 'Bar'
              port: 'in'
              index: 2
            metadata:
              route: 5
            graph: 'foo'
        ]
        receive 'graph', expects, done
        send 'graph', 'addedge', expects[0].payload
    describe 'receiving an IIP', ->
      it 'should provide the IIP back', (done) ->
        expects = [
          protocol: 'graph'
          command: 'addinitial'
          payload:
            src:
              data: 'Hello, world!'
            tgt:
              node: 'Foo'
              port: 'in'
            metadata: {}
            graph: 'foo'
        ]
        receive 'graph', expects, done
        send 'graph', 'addinitial', expects[0].payload
    describe 'removing an IIP', ->
      it 'should provide the IIP back', (done) ->
        expects = [
          protocol: 'graph'
          command: 'removeinitial'
          payload:
            src:
              data: 'Hello, world!'
            tgt:
              node: 'Foo'
              port: 'in'
            graph: 'foo'
        ]
        receive 'graph', expects, done
        send 'graph', 'removeinitial',
          tgt:
            node: 'Foo'
            port: 'in'
          graph: 'foo'
    describe 'removing a node', ->
      it 'should remove the node and its associated edges', (done) ->
        expects = [
          protocol: 'graph'
          command: 'changeedge'
        ,
          protocol: 'graph'
          command: 'removeedge'
          payload:
            src:
              node: 'Foo'
              port: 'out'
            tgt:
              node: 'Bar'
              port: 'in'
              index: 2
            graph: 'foo'
        ,
          protocol: 'graph'
          command: 'changenode'
        ,
          protocol: 'graph'
          command: 'removenode'
          payload:
            id: 'Bar'
            graph: 'foo'
        ]
        receive 'graph', expects, done
        send 'graph', 'removenode',
          id: 'Bar'
          graph: 'foo'
    describe 'renaming a node', ->
      it 'should send the renamenode event', (done) ->
        expects = [
          protocol: 'graph'
          command: 'renamenode'
          payload:
            from: 'Foo'
            to: 'Baz'
            graph: 'foo'
        ]
        receive 'graph', expects, done
        send 'graph', 'renamenode',
          from: 'Foo'
          to: 'Baz'
          graph: 'foo'

  describe 'Network protocol', ->
    # Set up a clean graph
    beforeEach (done) ->
      waitFor = 4
      listener = (message) ->
        waitFor--
        return if waitFor
        window.removeEventListener 'message', listener, false
        done()
      window.addEventListener 'message', listener, false
      send 'graph', 'clear',
        baseDir: '/noflo-runtime-iframe'
        id: 'bar'
        main: true
      send 'graph', 'addnode',
        id: 'Hello'
        component: 'core/Repeat'
        metadata: {}
        graph: 'bar'
      send 'graph', 'addnode',
        id: 'World'
        component: 'core/Drop'
        metadata: {}
        graph: 'bar'
      send 'graph', 'addedge',
        src:
          node: 'Hello'
          port: 'out'
        tgt:
          node: 'World'
          port: 'in'
        graph: 'bar'
      send 'graph', 'addinitial',
        src:
          data: 'Hello, world!'
        tgt:
          node: 'Hello'
          port: 'in'
        graph: 'bar'
    describe 'on starting the network', ->
      it 'should get started and stopped', (done) ->
        @timeout 15000
        expected = [
          protocol: 'network'
          command: 'started'
        ,
          protocol: 'network'
          command: 'connect'
        ,
          protocol: 'network'
          command: 'data'
        ,
          protocol: 'network'
          command: 'connect'
        ,
          protocol: 'network'
          command: 'data'
        ,
          protocol: 'network'
          command: 'disconnect'
        ,
          protocol: 'network'
          command: 'disconnect'
        ,
          protocol: 'network'
          command: 'stopped'
        ]
        receive 'network', expected, done
        send 'network', 'start',
          graph: 'bar'

  describe 'Component protocol', ->
    describe 'on requesting a component list', ->
      it 'should receive some known components', (done) ->
        received = 0
        listener = (message) ->
          msg = JSON.parse message.data
          return unless msg.protocol is 'component'

          if msg.command is 'component'
            chai.expect(msg.payload).to.be.an 'object'
            received++

            if msg.payload.name is 'core/Output'
              chai.expect(msg.payload.icon).to.equal 'bug'
              chai.expect(msg.payload.inPorts).to.eql [
                id: 'in'
                type: 'all'
                schema: null
                required: false
                addressable: false
                description: 'Packet to be printed through console.log'
              ,
                id: 'options'
                type: 'object'
                schema: null
                required: false
                addressable: false
                description: 'Options to be passed to console.log'
              ]
              chai.expect(msg.payload.outPorts).to.eql [
                id: 'out'
                type: 'all'
                schema: null
                required: false
                addressable: false
              ]
          if msg.command is 'componentsready'
            chai.expect(msg.payload).to.equal received
            chai.expect(received).to.be.above 5
            window.removeEventListener 'message', listener, false
            done()
        window.addEventListener 'message', listener, false
        send 'component', 'list', '/noflo-runtime-iframe'
