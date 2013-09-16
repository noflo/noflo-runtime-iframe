describe 'IFRAME component runtime with core/Repeat', ->
  iframe = document.getElementById('componentRepeat').contentWindow
  origin = window.location.origin
  describe 'receiving a CONNECT', ->
    it 'should CONNECT back', (done) ->
      listener = (message) ->
        chai.expect(message).to.be.an 'object'
        chai.expect(message.data.port).to.equal 'out'
        chai.expect(message.data.event).to.equal 'connect'
        chai.expect(message.data.payload).to.be.a 'null'
        window.removeEventListener 'message', listener, false
        done()
      window.addEventListener 'message', listener, false
      iframe.postMessage
        port: 'in'
        event: 'connect'
      , iframe.location.href
  describe 'receiving a DATA', ->
    it 'should send DATA back', (done) ->
      data = [1, 2, 3]
      listener = (message) ->
        chai.expect(message).to.be.an 'object'
        chai.expect(message.data.port).to.equal 'out'
        chai.expect(message.data.event).to.equal 'data'
        chai.expect(message.data.payload).to.eql data
        window.removeEventListener 'message', listener, false
        done()
      window.addEventListener 'message', listener, false
      iframe.postMessage
        port: 'in'
        event: 'data'
        payload: data
      , iframe.location.href
