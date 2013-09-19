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

  function initGraph (baseDir) {
    var graph = new noflo.Graph('IFRAME runtime');
    graph.baseDir = baseDir;

    graph.on('addNode', function (node) {
      send('graph', 'addnode', node);
    });
    graph.on('removeNode', function (node) {
      send('graph', 'removenode', node);
    });
    graph.on('renameNode', function (oldId, newId) {
      send('graph', 'renamenode', {
        from: oldId,
        to: newId
      });
    });
    graph.on('addEdge', function (edge) {
      send('graph', 'addedge', edge);
    });
    graph.on('removeEdge', function (edge) {
      send('graph', 'removeedge', edge);
    });
    graph.on('addInitial', function (iip) {
      send('graph', 'addinitial', iip);
    });
    graph.on('removeInitial', function (iip) {
      send('graph', 'removeinitial', iip);
    });

    return graph;
  };

  function graphCommand (command, payload) {
    switch (command) {
      case 'clear':
        graph = initGraph(payload.baseDir);
        break;
      case 'addnode':
        graph.addNode(payload.id, payload.component, payload.metadata);
        break;
      case 'removenode':
        graph.removeNode(payload.id);
        break;
      case 'renamenode':
        graph.renameNode(payload.from, payload.to);
        break;
      case 'addedge':
        graph.addEdge(payload.from.node, payload.from.port, payload.to.node, payload.to.port, payload.metadata);
        break;
      case 'removeedge':
        graph.removeEdge(payload.from.node, payload.from.port, payload.to.node, payload.to.port);
        break;
      case 'addinitial':
        graph.addInitial(payload.from.data, payload.to.node, payload.to.port, payload.metadata);
        break;
      case 'removeinitial':
        graph.removeInitial(payload.to.node, payload.to.port);
        break;
    }
    return graph;
  };

  function initNetwork (graph) {
    noflo.createNetwork(graph, function (network) {
      network.on('start', function (event) {
        send('network', 'start', event.start);
      });

      prepareSocketEvent = function (event) {
        var data = {
          id: event.id
        };
        if (event.socket.from) {
          data.from = {
            node: event.socket.from.process.id,
            port: event.socket.from.port
          };
        }
        if (event.socket.to) {
          data.to = {
            node: event.socket.to.process.id,
            port: event.socket.to.port
          };
        }
        if (event.group) {
          data.group = event.group;
        }
        if (event.data) {
          if (event.data.toJSON) {
            data.data = event.data.toJSON();
          } else if (event.data.toString) {
            data.data = event.data.toString();
          } else {
            data.data = event.data;
          }
        }
        if (event.subgraph) {
          data.subgraph = event.subgraph;
        }
        return data;
      };

      network.on('connect', function (event) {
        send('network', 'connect', prepareSocketEvent(event));
      });
      network.on('begingroup', function (event) {
        send('network', 'begingroup', prepareSocketEvent(event));
      });
      network.on('data', function (event) {
        send('network', 'data', prepareSocketEvent(event));
      });
      network.on('endgroup', function (event) {
        send('network', 'endgroup', prepareSocketEvent(event));
      });
      network.on('disconnect', function (event) {
        send('network', 'disconnect', prepareSocketEvent(event));
      });

      network.on('stop', function (event) {
        send('network', 'stop', event.uptime);
      });
      network.connect(function () {
        network.sendInitials();
        graph.on('addInitial', function () {
          network.sendInitials();
        });
      });
    }, true);
  };

  function networkCommand (command, payload) {
    switch (command) {
      case 'start':
        initNetwork(graph);
        break;
    }
  };

  function sendComponent (component, instance) {
    var inPorts = [];
    var outPorts = [];
    for (port in instance.inPorts) {
      inPorts.push({
        id: port,
        type: instance.inPorts[port].type
      });
    }
    for (port in instance.outPorts) {
      outPorts.push({
        id: port,
        type: instance.outPorts[port].type
      });
    }
    send('component', 'component', {
      name: component,
      description: instance.description,
      inPorts: inPorts,
      outPorts: outPorts
    });
  };

  function listComponents (baseDir) {
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
        listComponents(payload);
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
