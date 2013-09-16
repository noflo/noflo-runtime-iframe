(function (context) {
  var noflo = context.require('noflo');

  // The target to communicate with
  var origin = context.parent.location.origin;
  var baseDir = 'noflo-runtime-iframe';

  var graph = null;

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
      case 'network':
        networkCommand(message.data.command, message.data.payload);
        break;
      case 'component':
        componentCommand(message.data.command, message.data.payload);
        break;
    };
  });

  function initGraph () {
    var graph = new noflo.Graph('IFRAME runtime');
    graph.baseDir = baseDir;

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
  };

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
    return graph;
  };

  function initNetwork (graph) {
    noflo.createNetwork(graph, function (network) {
      network.on('start', function (event) {
        send('network', 'start', event.start);
      });
      network.on('stop', function (event) {
        send('network', 'stop', event.uptime);
      });
    });
  };

  function networkCommand (command, payload) {
    switch (command) {
      case 'start':
        initNetwork(graph);
        break;
    }
  };

  function sendComponent (component, instance) {
    send('component', 'component', {
      name: component,
      description: instance.description,
      inPorts: Object.keys(instance.inPorts),
      outPorts: Object.keys(instance.outPorts)
    });
  };

  function listComponents () {
    var loader = new noflo.ComponentLoader(baseDir);
    loader.listComponents(function (components) {
      Object.keys(components).forEach(function (component) {
        loader.load(component, function (instance) {
          if (!instance.isReady()) {
            instance.once('ready', function () {
              sendComponent(component, instance);
            });
            return;
          }
          sendComponent(component, instance);
        });
      });
    });
  };

  function componentCommand (command, payload) {
    switch (command) {
      case 'list':
        listComponents();
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
