(function (context) {
  var noflo = context.require('noflo');
  var Base = context.require('noflo-runtime-base');

  var Iframe = function () {
    this.prototype.constructor.apply(this, arguments);
    this.receive = this.prototype.receive;
  };
  Iframe.prototype = Base;
  Iframe.prototype.send = function (protocol, topic, payload, ctx) {
    context.parent.postMessage({
      protocol: protocol,
      command: topic,
      payload: payload
    }, ctx.href);
  };
  var runtime = new Iframe();

  // The target to communicate with
  var origin = context.parent.location.origin;
  var baseDir = 'noflo-runtime-iframe';

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
        runtime.receive('graph', message.data.command, message.data.payload, {
          href: context.parent.location.href
        });
        break;
      case 'network':
        networkCommand(message.data.command, message.data.payload);
        break;
      case 'component':
        componentCommand(message.data.command, message.data.payload);
        break;
    };
  });

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
        initNetwork(runtime.graph.graph);
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
