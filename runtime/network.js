const { iframe: IframeRuntime } = require('noflo-runtime-postmessage');

(function (context) {
  context.NofloIframeRuntime = IframeRuntime;
})(window);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.NofloIframeRuntime;
}
