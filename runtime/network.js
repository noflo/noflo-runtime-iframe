(function (context) {
  var noflo = context.require('noflo');

  // The target to communicate with
  var origin = context.parent.location.origin;

  var graph = null;
  var network = null;

  context.addEventListener('message', function (message) {
    if (message.origin !== origin) {
      return;
    }
    if (!message.data.protocol) {
      return;
    }
    if (!message.data.command) {
      return;
    }
    switch (message.data.protocol) {
      case 'graph':
        graphCommand(message.data.command, message.data.payload);
        break;
    };
  });

  function initGraph () {
    var graph = new noflo.Graph('IFRAME runtime');
    graph.baseDir = 'noflo-runtime-iframe';

    graph.on('addNode', function (node) {
      send('graph', 'addnode', node);
    });
    graph.on('addEdge', function (edge) {
      send('graph', 'addedge', edge);
    });
    graph.on('addInitial', function (iip) {
      send('graph', 'addinitial', iip);
    });

    return graph;
  }

  function graphCommand (command, payload) {
    switch (command) {
      case 'graph':
        graph = initGraph();
        break;
      case 'addnode':
        graph.addNode(payload.id, payload.component, payload.metadata);
        break;
      case 'addedge':
        graph.addEdge(payload.from.node, payload.from.port, payload.to.node, payload.to.port, payload.metadata);
        break;
      case 'addinitial':
        graph.addInitial(payload.from.data, payload.to.node, payload.to.port, payload.metadata);
        break;
    }
  };

  function send (protocol, command, payload) {
    context.parent.postMessage({
      protocol: protocol,
      command: command,
      payload: payload
    }, context.parent.location.href);
  };

})(window);
