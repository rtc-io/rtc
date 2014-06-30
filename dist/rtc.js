(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var EventEmitter = require('eventemitter3');
var crel = require('crel');
var defaults = require('cog/defaults');
var extend = require('cog/extend');
var quickconnect = require('rtc-quickconnect');
var captureconfig = require('rtc-captureconfig');
var media = require('rtc-media');
var DEFAULT_CONSTRAINTS = { video: true, audio: true };

/**
  # rtc

  This is a package that will provide you a "one-stop shop" for building
  WebRTC applications.  It aggregates together a variety of packages (primarily
  from the [rtc.io](https://github.com/rtc-io) suite) to deliver a single
  package for building a WebRTC application.

  ## Getting Started

  <<< docs/getting-started.md

  ## Example Usage

  <<< docs/examples.md

**/

module.exports = function(opts) {
  var rtc = new EventEmitter();
  var constraints = [].concat((opts || {}).capture || [ DEFAULT_CONSTRAINTS ]);
  var plugins = (opts || {}).plugins || [];
  var signalhost = (opts || {}).signaller || '//switchboard.rtc.io';
  var localStreams = [];
  var localVideo;
  var remoteVideo;

  // capture media
  var captureTargets = constraints.map(parseConstraints).map(function(constraints) {
    return media({ constraints: constraints, plugins: plugins });
  });

  function announce() {
    // create the signaller
    var signaller = rtc.signaller = quickconnect(signalhost, opts);

    signaller
      .on('call:started', handleCallStart)
      .on('call:ended', handleCallEnd);

    // add the local streams
    localStreams.forEach(function(stream) {
      signaller.addStream(stream);
    });

    // emit a ready event for the rtc
    rtc.emit('ready', signaller);
  }

  function gotLocalStream(stream) {
    media({ stream: stream, plugins: plugins, muted: true }).render(localVideo);

    localStreams.push(stream);
    if (localStreams.length >= captureTargets.length) {
      announce();
    }
  }

  function handleCallStart(id, pc, data) {
    // create the container for this peers streams
    var container = crel('div', {
      class: 'rtc-peer',
      'data-peerid': id
    });

    console.log('call started with peer: ' + id);
    pc.getRemoteStreams().forEach(function(stream) {
      media({ stream: stream, plugins: plugins }).render(container);
    });

    remoteVideo.appendChild(container);
  }

  function handleCallEnd(id, pc, data) {
    var el = remoteVideo.querySelector('div[data-peerid="' + id + '"]');

    if (el) {
      el.parentNode.removeChild(el);
    }
  }

  function parseConstraints(input) {
    if (typeof input == 'string') {
      return captureconfig(input).toConstraints();
    }

    return input;
  }

  // once we've captured all the streams start the call
  captureTargets.forEach(function(target) {
    target.once('capture', gotLocalStream);
  });

  // create the local container
  localVideo = rtc.local = crel('div', {
    class: 'rtc-media rtc-localvideo'
  });

  // create the remote container
  remoteVideo = rtc.remote = crel('div', {
    class: 'rtc-media rtc-remotevideo'
  });

  return rtc;
}

},{"cog/defaults":3,"cog/extend":4,"crel":9,"eventemitter3":10,"rtc-captureconfig":11,"rtc-media":12,"rtc-quickconnect":18}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
## cog/defaults

```js
var defaults = require('cog/defaults');
```

### defaults(target, *)

Shallow copy object properties from the supplied source objects (*) into
the target object, returning the target object once completed.  Do not,
however, overwrite existing keys with new values:

```js
defaults({ a: 1, b: 2 }, { c: 3 }, { d: 4 }, { b: 5 }));
```

See an example on [requirebin](http://requirebin.com/?gist=6079475).
**/
module.exports = function(target) {
  // ensure we have a target
  target = target || {};

  // iterate through the sources and copy to the target
  [].slice.call(arguments, 1).forEach(function(source) {
    if (! source) {
      return;
    }

    for (var prop in source) {
      if (target[prop] === void 0) {
        target[prop] = source[prop];
      }
    }
  });

  return target;
};
},{}],4:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
## cog/extend

```js
var extend = require('cog/extend');
```

### extend(target, *)

Shallow copy object properties from the supplied source objects (*) into
the target object, returning the target object once completed:

```js
extend({ a: 1, b: 2 }, { c: 3 }, { d: 4 }, { b: 5 }));
```

See an example on [requirebin](http://requirebin.com/?gist=6079475).
**/
module.exports = function(target) {
  [].slice.call(arguments, 1).forEach(function(source) {
    if (! source) {
      return;
    }

    for (var prop in source) {
      target[prop] = source[prop];
    }
  });

  return target;
};
},{}],5:[function(require,module,exports){
/**
  ## cog/getable

  Take an object and provide a wrapper that allows you to `get` and
  `set` values on that object.

**/
module.exports = function(target) {
  function get(key) {
    return target[key];
  }

  function set(key, value) {
    target[key] = value;
  }

  function remove(key) {
    return delete target[key];
  }

  function keys() {
    return Object.keys(target);
  };

  function values() {
    return Object.keys(target).map(function(key) {
      return target[key];
    });
  };

  if (typeof target != 'object') {
    return target;
  }

  return {
    get: get,
    set: set,
    remove: remove,
    delete: remove,
    keys: keys,
    values: values
  };
};

},{}],6:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## cog/jsonparse

  ```js
  var jsonparse = require('cog/jsonparse');
  ```

  ### jsonparse(input)

  This function will attempt to automatically detect stringified JSON, and
  when detected will parse into JSON objects.  The function looks for strings
  that look and smell like stringified JSON, and if found attempts to
  `JSON.parse` the input into a valid object.

**/
module.exports = function(input) {
  var isString = typeof input == 'string' || (input instanceof String);
  var reNumeric = /^\-?\d+\.?\d*$/;
  var shouldParse ;
  var firstChar;
  var lastChar;

  if ((! isString) || input.length < 2) {
    if (isString && reNumeric.test(input)) {
      return parseFloat(input);
    }

    return input;
  }

  // check for true or false
  if (input === 'true' || input === 'false') {
    return input === 'true';
  }

  // check for null
  if (input === 'null') {
    return null;
  }

  // get the first and last characters
  firstChar = input.charAt(0);
  lastChar = input.charAt(input.length - 1);

  // determine whether we should JSON.parse the input
  shouldParse =
    (firstChar == '{' && lastChar == '}') ||
    (firstChar == '[' && lastChar == ']') ||
    (firstChar == '"' && lastChar == '"');

  if (shouldParse) {
    try {
      return JSON.parse(input);
    }
    catch (e) {
      // apparently it wasn't valid json, carry on with regular processing
    }
  }


  return reNumeric.test(input) ? parseFloat(input) : input;
};
},{}],7:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## cog/logger

  ```js
  var logger = require('cog/logger');
  ```

  Simple browser logging offering similar functionality to the
  [debug](https://github.com/visionmedia/debug) module.

  ### Usage

  Create your self a new logging instance and give it a name:

  ```js
  var debug = logger('phil');
  ```

  Now do some debugging:

  ```js
  debug('hello');
  ```

  At this stage, no log output will be generated because your logger is
  currently disabled.  Enable it:

  ```js
  logger.enable('phil');
  ```

  Now do some more logger:

  ```js
  debug('Oh this is so much nicer :)');
  // --> phil: Oh this is some much nicer :)
  ```

  ### Reference
**/

var active = [];
var unleashListeners = [];
var targets = [ console ];

/**
  #### logger(name)

  Create a new logging instance.
**/
var logger = module.exports = function(name) {
  // initial enabled check
  var enabled = checkActive();

  function checkActive() {
    return enabled = active.indexOf('*') >= 0 || active.indexOf(name) >= 0;
  }

  // register the check active with the listeners array
  unleashListeners[unleashListeners.length] = checkActive;

  // return the actual logging function
  return function() {
    var args = [].slice.call(arguments);

    // if we have a string message
    if (typeof args[0] == 'string' || (args[0] instanceof String)) {
      args[0] = name + ': ' + args[0];
    }

    // if not enabled, bail
    if (! enabled) {
      return;
    }

    // log
    targets.forEach(function(target) {
      target.log.apply(target, args);
    });
  };
};

/**
  #### logger.reset()

  Reset logging (remove the default console logger, flag all loggers as
  inactive, etc, etc.
**/
logger.reset = function() {
  // reset targets and active states
  targets = [];
  active = [];

  return logger.enable();
};

/**
  #### logger.to(target)

  Add a logging target.  The logger must have a `log` method attached.

**/
logger.to = function(target) {
  targets = targets.concat(target || []);

  return logger;
};

/**
  #### logger.enable(names*)

  Enable logging via the named logging instances.  To enable logging via all
  instances, you can pass a wildcard:

  ```js
  logger.enable('*');
  ```

  __TODO:__ wildcard enablers
**/
logger.enable = function() {
  // update the active
  active = active.concat([].slice.call(arguments));

  // trigger the unleash listeners
  unleashListeners.forEach(function(listener) {
    listener();
  });

  return logger;
};
},{}],8:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## cog/throttle

  ```js
  var throttle = require('cog/throttle');
  ```

  ### throttle(fn, delay, opts)

  A cherry-pickable throttle function.  Used to throttle `fn` to ensure
  that it can be called at most once every `delay` milliseconds.  Will
  fire first event immediately, ensuring the next event fired will occur
  at least `delay` milliseconds after the first, and so on.

**/
module.exports = function(fn, delay, opts) {
  var lastExec = (opts || {}).leading !== false ? 0 : Date.now();
  var trailing = (opts || {}).trailing;
  var timer;
  var queuedArgs;
  var queuedScope;

  // trailing defaults to true
  trailing = trailing || trailing === undefined;
  
  function invokeDefered() {
    fn.apply(queuedScope, queuedArgs || []);
    lastExec = Date.now();
  }

  return function() {
    var tick = Date.now();
    var elapsed = tick - lastExec;

    // always clear the defered timer
    clearTimeout(timer);

    if (elapsed < delay) {
      queuedArgs = [].slice.call(arguments, 0);
      queuedScope = this;

      return trailing && (timer = setTimeout(invokeDefered, delay - elapsed));
    }

    // call the function
    lastExec = tick;
    fn.apply(this, arguments);
  };
};
},{}],9:[function(require,module,exports){
//Copyright (C) 2012 Kory Nunn

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/*

    This code is not formatted for readability, but rather run-speed and to assist compilers.

    However, the code's intention should be transparent.

    *** IE SUPPORT ***

    If you require this library to work in IE7, add the following after declaring crel.

    var testDiv = document.createElement('div'),
        testLabel = document.createElement('label');

    testDiv.setAttribute('class', 'a');
    testDiv['className'] !== 'a' ? crel.attrMap['class'] = 'className':undefined;
    testDiv.setAttribute('name','a');
    testDiv['name'] !== 'a' ? crel.attrMap['name'] = function(element, value){
        element.id = value;
    }:undefined;


    testLabel.setAttribute('for', 'a');
    testLabel['htmlFor'] !== 'a' ? crel.attrMap['for'] = 'htmlFor':undefined;



*/

(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.crel = factory();
    }
}(this, function () {
    // based on http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
    var isNode = typeof Node === 'function'
        ? function (object) { return object instanceof Node; }
        : function (object) {
            return object
                && typeof object === 'object'
                && typeof object.nodeType === 'number'
                && typeof object.nodeName === 'string';
        };
    var isArray = function(a){ return a instanceof Array; };
    var appendChild = function(element, child) {
      if(!isNode(child)){
          child = document.createTextNode(child);
      }
      element.appendChild(child);
    };


    function crel(){
        var document = window.document,
            args = arguments, //Note: assigned to a variable to assist compilers. Saves about 40 bytes in closure compiler. Has negligable effect on performance.
            element = args[0],
            child,
            settings = args[1],
            childIndex = 2,
            argumentsLength = args.length,
            attributeMap = crel.attrMap;

        element = isNode(element) ? element : document.createElement(element);
        // shortcut
        if(argumentsLength === 1){
            return element;
        }

        if(typeof settings !== 'object' || isNode(settings) || isArray(settings)) {
            --childIndex;
            settings = null;
        }

        // shortcut if there is only one child that is a string
        if((argumentsLength - childIndex) === 1 && typeof args[childIndex] === 'string' && element.textContent !== undefined){
            element.textContent = args[childIndex];
        }else{
            for(; childIndex < argumentsLength; ++childIndex){
                child = args[childIndex];

                if(child == null){
                    continue;
                }

                if (isArray(child)) {
                  for (var i=0; i < child.length; ++i) {
                    appendChild(element, child[i]);
                  }
                } else {
                  appendChild(element, child);
                }
            }
        }

        for(var key in settings){
            if(!attributeMap[key]){
                element.setAttribute(key, settings[key]);
            }else{
                var attr = crel.attrMap[key];
                if(typeof attr === 'function'){
                    attr(element, settings[key]);
                }else{
                    element.setAttribute(attr, settings[key]);
                }
            }
        }

        return element;
    }

    // Used for mapping one kind of attribute to the supported version of that in bad browsers.
    // String referenced so that compilers maintain the property name.
    crel['attrMap'] = {};

    // String referenced so that compilers maintain the property name.
    crel["isNode"] = isNode;

    return crel;
}));

},{}],10:[function(require,module,exports){
'use strict';

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() {
  this._events = {};
}

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  return Array.apply(this, this._events[event] || []);
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  if (!this._events || !this._events[event]) return false;

  var listeners = this._events[event]
    , length = listeners.length
    , len = arguments.length
    , fn = listeners[0]
    , args
    , i;

  if (1 === length) {
    if (fn.__EE3_once) this.removeListener(event, fn);

    switch (len) {
      case 1:
        fn.call(fn.__EE3_context || this);
      break;
      case 2:
        fn.call(fn.__EE3_context || this, a1);
      break;
      case 3:
        fn.call(fn.__EE3_context || this, a1, a2);
      break;
      case 4:
        fn.call(fn.__EE3_context || this, a1, a2, a3);
      break;
      case 5:
        fn.call(fn.__EE3_context || this, a1, a2, a3, a4);
      break;
      case 6:
        fn.call(fn.__EE3_context || this, a1, a2, a3, a4, a5);
      break;

      default:
        for (i = 1, args = new Array(len -1); i < len; i++) {
          args[i - 1] = arguments[i];
        }

        fn.apply(fn.__EE3_context || this, args);
    }
  } else {
    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    for (i = 0; i < length; fn = listeners[++i]) {
      if (fn.__EE3_once) this.removeListener(event, fn);
      fn.apply(fn.__EE3_context || this, args);
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Functon} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  if (!this._events) this._events = {};
  if (!this._events[event]) this._events[event] = [];

  fn.__EE3_context = context;
  this._events[event].push(fn);

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  fn.__EE3_once = true;
  return this.on(event, fn, context);
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn) {
  if (!this._events || !this._events[event]) return this;

  var listeners = this._events[event]
    , events = [];

  for (var i = 0, length = listeners.length; i < length; i++) {
    if (fn && listeners[i] !== fn) {
      events.push(listeners[i]);
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) this._events[event] = events;
  else this._events[event] = null;

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) this._events[event] = null;
  else this._events = {};

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the module.
//
EventEmitter.EventEmitter = EventEmitter;
EventEmitter.EventEmitter2 = EventEmitter;
EventEmitter.EventEmitter3 = EventEmitter;

try { module.exports = EventEmitter; }
catch (e) {}

},{}],11:[function(require,module,exports){
/* jshint node: true */
'use strict';

var reSeparator = /[\,\s]\s*/;
var offFlags = ['false', 'none', 'off'];


/**
  # rtc-captureconfig

  This is a simple parser that takes a string of text and determines what
  that means in the context of WebRTC.

  ## Why?

  It provides a simple, textual way of describing your requirements for
  media capture.  Trying to remember the structure of the constraints object
  is painful.

  ## How

  A simple text string is converted to an intermediate JS object
  representation, which can then be converted to a getUserMedia constraints
  data structure using a `toConstraints()` call.

  For example, the following text input:

  ```
  camera min:1280x720 max:1280x720 min:15fps max:25fps
  ```

  Is converted into an intermedia representation (via the `CaptureConfig`
  utility class) that looks like the following:

  ```js
  {
    camera: 0,
    microphone: 0,
    res: {
      min: { w: 1280, h: 720 },
      max: { w: 1280, h: 720 }
    },

    fps: {
      min: 15,
      max: 25
    }
  }
  ```

  Which in turn is converted into the following media constraints for
  a getUserMedia call:

  ```js
  {
    audio: true,
    video: {
      mandatory: {
        minFrameRate: 15,
        maxFrameRate: 25,

        minWidth: 1280,
        minHeight: 720,
        maxWidth: 1280,
        maxHeight: 720
      },

      optional: []
    }
  }
  ```

  ### Experimental: Targeted Device Capture

  While the `rtc-captureconfig` module itself doesn't contain any media
  identification logic, it is able to the sources information from a
  `MediaStreamTrack.getSources` call to generate device targeted constraints.

  For instance, the following example demonstrates how we can request
  `camera:1` (the 2nd video device on our local machine) when we are making
  a getUserMedia call:

  <<< examples/camera-two.js

  It's worth noting that if the requested device does not exist on the
  machine (in the case above, if your machine only has a single webcam - as
  is common) then no device selection constraints will be generated (i.e.
  the standard `{ video: true, audio: true }` constraints will be returned
  from the `toConstraints` call).

  ### Experimental: Screen Capture

  If you are working with chrome and serving content of a HTTPS connection,
  then you will be able to experiment with experimental getUserMedia screen
  capture.

  In the simplest case, screen capture can be invoked by using the capture
  string of:

  ```
  screen
  ```

  Which generates the following contraints:

  ```js
  {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'screen'
      },

      optional: []
    }
  }
  ```

  ## Reference

**/

module.exports = function(input) {
  // create a new configuration object using defaults
  var config = new CaptureConfig();

  // process each of the directives
  (input || '').split(reSeparator).forEach(function(directive) {
    // now further split the directive on the : character
    var parts = directive.split(':');
    var method = config[(parts[0] || '').toLowerCase()];

    // if we have the method apply
    if (typeof method == 'function') {
      method.apply(config, parts.slice(1));
    }
  });

  return config;
};

/**
  ### CaptureConfig

  This is a utility class that is used to update capture configuration
  details and is able to generate suitable getUserMedia constraints based
  on the configuration.

**/
function CaptureConfig() {
  if (! (this instanceof CaptureConfig)) {
    return new CaptureConfig();
  }

  // initialise the base config
  this.cfg = {
    microphone: true
  };
}

var prot = CaptureConfig.prototype;

/**
  #### camera(index)

  Update the camera configuration to the specified index
**/
prot.camera = function(index) {
  this.cfg.camera = trueOrValue(index);
};

/**
  #### microphone(index)

  Update the microphone configuration to the specified index
**/
prot.microphone = function(index) {
  this.cfg.microphone = trueOrValue(index);
};

/**
  #### screen(target)

  Specify that we would like to capture the screen
**/
prot.screen = function() {
  // unset the microphone config
  delete this.cfg.microphone;

  // set the screen configuration
  this.cfg.screen = true;
};

/**
  #### max(data)

  Update a maximum constraint.  If an fps constraint this will be directed
  to the `maxfps` modifier.

**/
prot.max = function(data) {
  var res;

  // if this is an fps specification parse
  if (data.slice(-3).toLowerCase() == 'fps') {
    return this.maxfps(data);
  }

  // parse the resolution
  res = this._parseRes(data);

  // initialise the fps config stuff
  this.cfg.res = this.cfg.res || {};
  this.cfg.res.max = res;
};

/**
  #### maxfps(data)

  Update the maximum fps
**/
prot.maxfps = function(data) {
  // ensure we have an fps component
  this.cfg.fps = this.cfg.fps || {};

  // set the max fps
  this.cfg.fps.max = parseFloat(data.slice(0, -3));
};

/**
  #### min(data)

  Update a minimum constraint.  This can be either related to resolution
  or FPS.
**/
prot.min = function(data) {
  var res;

  // if this is an fps specification parse
  if (data.slice(-3).toLowerCase() == 'fps') {
    return this.minfps(data);
  }

  // parse the resolution
  res = this._parseRes(data);

  // initialise the fps config stuff
  this.cfg.res = this.cfg.res || {};

  // add the min
  this.cfg.res.min = res;
};

/**
  #### minfps(data)

  Update the minimum fps
**/
prot.minfps = function(data) {
  // ensure we have an fps component
  this.cfg.fps = this.cfg.fps || {};

  // set the max fps
  this.cfg.fps.min = parseFloat(data.slice(0, -3));
};

prot.hd = prot['720p'] = function() {
  this.cfg.camera = true;
  this.min('1280x720');
};

prot.fullhd = prot['1080p'] = function() {
  this.cfg.camera = true;
  this.min('1920x1080');
};

/**
  #### toConstraints(opts?)

  Convert the internal configuration object to a valid media constraints
  representation.  In compatible browsers a list of media sources can
  be passed through in the `opts.sources` to create contraints that will
  target a specific device when captured.

  <<< examples/capture-targets.js

**/
prot.toConstraints = function(opts) {
  var cfg = this.cfg;
  var constraints = {
    audio: cfg.microphone === true ||
      (typeof cfg.microphone == 'number' && cfg.microphone >= 0),

    video: cfg.camera === true || cfg.screen ||
      (typeof cfg.camera == 'number' && cfg.camera >= 0)
  };

  // mandatory constraints
  var m = {
    video: {},
    audio: {}
  };

  // optional constraints
  var o = {
    video: [],
    audio: []
  };

  var sources = (opts || {}).sources || [];
  var cameras = sources.filter(function(info) {
    return info && info.kind === 'video';
  });
  var microphones = sources.filter(function(info) {
    return info && info.kind === 'audio';
  });
  var selectedSource;

  function complexConstraints(target) {
    if (constraints[target] && typeof constraints[target] != 'object') {
      constraints[target] = {
        mandatory: m[target],
        optional: o[target]
      };
    }
  }

  // fps
  if (cfg.fps) {
    complexConstraints('video');
    cfg.fps.min && (m.video.minFrameRate = cfg.fps.min);
    cfg.fps.max && (m.video.maxFrameRate = cfg.fps.max);
  }

  // min res specified
  if (cfg.res && cfg.res.min) {
    complexConstraints('video');
    m.video.minWidth = cfg.res.min.w;
    m.video.minHeight = cfg.res.min.h;
  }

  // max res specified
  if (cfg.res && cfg.res.max) {
    complexConstraints('video');
    m.video.maxWidth = cfg.res.max.w;
    m.video.maxHeight = cfg.res.max.h;
  }

  // input camera selection
  if (typeof cfg.camera == 'number' && cameras.length) {
    selectedSource = cameras[cfg.camera];

    if (selectedSource) {
      complexConstraints('video');
      o.video.push({ sourceId: selectedSource.id });
    }
  }

  // input microphone selection
  if (typeof cfg.microphone == 'number' && microphones.length) {
    selectedSource = microphones[cfg.microphone];

    if (selectedSource) {
      complexConstraints('audio');
      o.audio.push({ sourceId: selectedSource.id });
    }
  }

  // if we have screen constraints, make magic happen
  if (typeof cfg.screen != 'undefined') {
    complexConstraints('video');
    m.video.chromeMediaSource = 'screen';
  }

  return constraints;
};

/**
  ### "Internal" methods
**/

/**
  #### _parseRes(data)

  Parse a resolution specifier (e.g. 1280x720) into a simple JS object
  (e.g. { w: 1280, h: 720 })
**/
prot._parseRes = function(data) {
  // split the data on the 'x' character
  var parts = data.split('x');

  // if we don't have two parts, then complain
  if (parts.length < 2) {
    throw new Error('Invalid resolution specification: ' + data);
  }

  // return the width and height object
  return {
    w: parseInt(parts[0], 10),
    h: parseInt(parts[1], 10)
  };
};

/* internal helper */

function trueOrValue(val) {
  if (typeof val == 'string' && offFlags.indexOf(val.toLowerCase()) >= 0) {
    return false;
  }

  return val === undefined || val === '' || parseInt(val || 0, 10);
}

},{}],12:[function(require,module,exports){
/* jshint node: true */
/* global navigator: false */
/* global window: false */
/* global document: false */
/* global MediaStream: false */
/* global HTMLVideoElement: false */
/* global HTMLAudioElement: false */

/**
  # rtc-media

  Simple [getUserMedia](http://dev.w3.org/2011/webrtc/editor/getusermedia.html)
  cross-browser wrappers.  Part of the [rtc.io](http://rtc.io/) suite, which is
  sponsored by [NICTA](http://opennicta.com) and released under an
  [Apache 2.0 license](/LICENSE).

  ## Example Usage

  Capturing media on your machine is as simple as:

  ```js
  require('rtc-media')();
  ```

  While this will in fact start the user media capture process, it won't
  do anything with it.  Lets take a look at a more realistic example:

  <<< examples/render-to-body.js

  [run on requirebin](http://requirebin.com/?gist=6085450)

  In the code above, we are creating a new instance of our userMedia wrapper
  using the `media()` call and then telling it to render to the
  `document.body` once video starts streaming.  We can further expand the
  code out to the following to aid our understanding of what is going on:

  <<< examples/capture-explicit.js

  The code above is written in a more traditional JS style, but feel free
  to use the first style as it's quite safe (thanks to some checks in the
  code).

  ### Events

  Once a media object has been created, it will provide a number of events
  through the standard node EventEmitter API.

  #### `capture`

  The `capture` event is triggered once the requested media stream has
  been captured by the browser.

  <<< examples/capture-event.js

  #### `render`

  The `render` event is triggered once the stream has been rendered
  to the any supplied (or created) video elements.

  While it might seem a little confusing that when the `render` event
  fires that it returns an array of elements rather than a single element
  (which is what is provided when calling the `render` method).

  This occurs because it is completely valid to render a single captured
  media stream to multiple media elements on a page.  The `render` event
  is reporting once the render operation has completed for all targets that
  have been registered with the capture stream.

  ## Reference

**/

'use strict';

var debug = require('cog/logger')('rtc-media');
var extend = require('cog/extend');
var detect = require('rtc-core/detect');
var plugin = require('rtc-core/plugin');
var EventEmitter = require('eventemitter3');
var inherits = require('inherits');

// monkey patch getUserMedia from the prefixed version
navigator.getUserMedia = navigator.getUserMedia ||
  detect.call(navigator, 'getUserMedia');

// patch window url
window.URL = window.URL || detect('URL');

// patch media stream
window.MediaStream = detect('MediaStream');

/**
  ### media

  ```
  media(opts?)
  ```

  Capture media using the underlying
  [getUserMedia](http://www.w3.org/TR/mediacapture-streams/) API.

  The function accepts a single argument which can be either be:

  - a. An options object (see below), or;
  - b. An existing
    [MediaStream](http://www.w3.org/TR/mediacapture-streams/#mediastream) that
    the media object will bind to and provide you some DOM helpers for.

  The function supports the following options:

  - `capture` - Whether capture should be initiated automatically. Defaults
    to true, but toggled to false automatically if an existing stream is
    provided.

  - `muted` - Whether the video element created for this stream should be
    muted.  Default is true but is set to false when an existing stream is
    passed.

  - `constraints` - The constraint option allows you to specify particular
    media capture constraints which can allow you do do some pretty cool
    tricks.  By default, the contraints used to request the media are
    fairly standard defaults:

    ```js
      {
        video: {
          mandatory: {},
          optional: []
        },
        audio: true
      }
    ```

**/
function Media(opts) {
  var media = this;

  // check the constructor has been called
  if (! (this instanceof Media)) {
    return new Media(opts);
  }

  // inherited
  EventEmitter.call(this);

  // if the opts is a media stream instance, then handle that appropriately
  if (opts && MediaStream && opts instanceof MediaStream) {
    opts = {
      stream: opts
    };
  }

  // if we've been passed opts and they look like constraints, move things
  // around a little
  if (opts && (opts.audio || opts.video)) {
    opts = {
      constraints: opts
    };
  }

  // ensure we have opts
  opts = extend({}, {
    capture: (! opts) || (! opts.stream),
    muted: (! opts) || (! opts.stream),
    constraints: {
      video: {
        mandatory: {},
        optional: []
      },
      audio: true,

      // specify the fake flag if we detect we are running in the test
      // environment, on chrome this will do nothing but in firefox it will
      // use a fake video device
      fake: typeof __testlingConsole != 'undefined'
    }
  }, opts);

  // save the constraints
  this.constraints = opts.constraints;

  // if a name has been specified in the opts, save it to the media
  this.name = opts.name;

  // initialise the stream to null
  this.stream = opts.stream || null;

  // initialise the muted state
  this.muted = typeof opts.muted == 'undefined' || opts.muted;

  // create a bindings array so we have a rough idea of where
  // we have been attached to
  // TODO: revisit whether this is the best way to manage this
  this._bindings = [];

  // see if we are using a plugin
  this.plugin = plugin((opts || {}).plugins);
  if (this.plugin) {
    // if we are using a plugin, give it an opportunity to patch the
    // media capture interface
    media._pinst = this.plugin.init(opts, function(err) {
      console.log('initialization complete');
      if (err) {
        return media.emit('error', err);
      }

      if ((! opts.stream) && opts.capture) {
        media.capture();
      }
    });
  }
  // if we are autostarting, capture media on the next tick
  else if (opts.capture) {
    setTimeout(this.capture.bind(this), 0);
  }
}

inherits(Media, EventEmitter);
module.exports = Media;

/**
  ### capture

  ```
  capture(constraints, callback)
  ```

  Capture media.  If constraints are provided, then they will
  override the default constraints that were used when the media object was
  created.
**/
Media.prototype.capture = function(constraints, callback) {
  var media = this;
  var handleEnd = this.emit.bind(this, 'end');

  // if we already have a stream, then abort
  if (this.stream) { return; }

  // if no constraints have been provided, but we have
  // a callback, deal with it
  if (typeof constraints == 'function') {
    callback = constraints;
    constraints = this.constraints;
  }

  // if we have a callback, bind to the start event
  if (typeof callback == 'function') {
    this.once('capture', callback.bind(this));
  }

  // if we don't have get the ability to capture user media, then abort
  if (typeof navigator.getUserMedia != 'function') {
    return callback && callback(new Error('Unable to capture user media'));
  }

  // get user media, using either the provided constraints or the
  // default constraints
  debug('getUserMedia, constraints: ', constraints || this.constraints);
  navigator.getUserMedia(
    constraints || this.constraints,
    function(stream) {
      debug('sucessfully captured media stream: ', stream);
      if (typeof stream.addEventListener == 'function') {
        stream.addEventListener('ended', handleEnd);
      }
      else {
        stream.onended = handleEnd;
      }

      // save the stream and emit the start method
      media.stream = stream;

      // emit capture on next tick which works around a bug when using plugins
      setTimeout(function() {
        media.emit('capture', stream);
      }, 0);
    },

    function(err) {
      debug('getUserMedia attempt failed: ', err);
      media.emit('error', err);
    }
  );
};

/**
  ### render

  ```js
  render(target, opts?, callback?)
  ```

  Render the captured media to the specified target element.  While previous
  versions of rtc-media accepted a selector string or an array of elements
  this has been dropped in favour of __one single target element__.

  If the target element is a valid MediaElement then it will become the
  target of the captured media stream.  If, however, it is a generic DOM
  element it will a new Media element will be created that using the target
  as it's parent.

  A simple example of requesting default media capture and rendering to the
  document body is shown below:

  <<< examples/render-to-body.js

  You may optionally provide a callback to this function, which is
  will be triggered once each of the media elements has started playing
  the stream:

  <<< examples/render-capture-callback.js

**/
Media.prototype.render = function(target, opts, callback) {
  // if the target is an array, extract the first element
  if (Array.isArray(target)) {
    // log a warning
    console.log('WARNING: rtc-media render (as of 1.x) expects a single target');
    target = target[0];
  }

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  // ensure we have opts
  opts = opts || {};

  // create the video / audio elements
  target = this._prepareElement(opts, target);
  console.log('attempting render, stream: ', this.stream);

  // if no stream was specified, wait for the stream to initialize
  if (! this.stream) {
    this.once('capture', this._bindStream.bind(this));
  }
  // otherwise, bind the stream now
  else {
    this._bindStream(this.stream);
  }

  // if we have a callback then trigger on the render event
  if (typeof callback == 'function') {
    this.once('render', callback);
  }

  return target;
};

/**
  ### stop()

  Stop the media stream
**/
Media.prototype.stop = function(opts) {
  var media = this;

  if (! this.stream) { return; }

  // remove bindings
  this._unbind(opts);

  // stop the stream, and tell the world
  this.stream.stop();

  // on capture rebind
  this.once('capture', media._bindStream.bind(media));

  // remove the reference to the stream
  this.stream = null;
};

/**
  ## Debugging Tips

  Chrome and Chromium can both be started with the following flag:

  ```
  --use-fake-device-for-media-stream
  ```

  This uses a fake stream for the getUserMedia() call rather than attempting
  to capture the actual camera.  This is useful when doing automated testing
  and also if you want to test connectivity between two browser instances and
  want to distinguish between the two local videos.

  ## Internal Methods

  There are a number of internal methods that are used in the `rtc-media`
  implementation. These are outlined below, but not expected to be of
  general use.

**/

Media.prototype._createBinding = function(opts, element) {
  this._bindings.push({
    el: element,
    opts: opts
  });

  return element;
};

/**
  ### _prepareElement(opts, element)

  The prepareElement function is used to prepare DOM elements that will
  receive the media streams once the stream have been successfully captured.
**/
Media.prototype._prepareElement = function(opts, element) {
  var parent;
  var validElement = (element instanceof HTMLVideoElement) ||
        (element instanceof HTMLAudioElement);
  var preserveAspectRatio =
        typeof opts.preserveAspectRatio == 'undefined' ||
        opts.preserveAspectRatio;

  if (! element) {
    throw new Error('Cannot render media to a null element');
  }

  // if the plugin wants to prepare elemnets, then let it
  if (this.plugin && typeof this.plugin.prepareElement == 'function') {
    return this._createBinding(
      opts,
      this.plugin.prepareElement.call(this._pinst, opts, element)
    );
  }

  // perform some additional checks for things that "look" like a
  // media element
  validElement = validElement || (typeof element.play == 'function') && (
    typeof element.srcObject != 'undefined' ||
    typeof element.mozSrcObject != 'undefined' ||
    typeof element.src != 'undefined');

  // if the element is not a video element, then create one
  if (! validElement) {
    parent = element;

    // create a new video element
    // TODO: create an appropriate element based on the types of tracks
    // available
    element = document.createElement('video');

    // if we are preserving aspect ratio do that now
    if (preserveAspectRatio) {
      element.setAttribute('preserveAspectRatio', '');
    }

    // add to the parent
    parent.appendChild(element);
    element.setAttribute('data-playing', false);
  }

  // if muted, inject the muted attribute
  if (element && this.muted) {
    element.muted = true;
    element.setAttribute('muted', '');
  }

  return this._createBinding(opts, element);
};

/**
  ### _bindStream(stream)

  Bind a stream to previously prepared DOM elements.

**/
Media.prototype._bindStream = function(stream) {
  var media = this;
  var elements = [];
  var waiting = [];

  function checkWaiting() {
    // if we have no waiting elements, but some elements
    // trigger the start event
    if (waiting.length === 0 && elements.length > 0) {
      media.emit('render', elements[0]);

      elements.map(function(el) {
        el.setAttribute('data-playing', true);
      });
    }
  }

  function canPlay(evt) {
    var el = evt.target || evt.srcElement;
    var videoIndex = elements.indexOf(el);

    if (videoIndex >= 0) {
      waiting.splice(videoIndex, 1);
    }

    el.play();
    el.removeEventListener('canplay', canPlay);
    el.removeEventListener('loadedmetadata', canPlay);
    checkWaiting();
  }

  // if we have a plugin that knows how to attach a stream, then let it do it
  if (this.plugin && typeof this.plugin.attachStream == 'function') {
    return this.plugin.attachStream.call(this._pinst, stream, this._bindings);
  }

  // iterate through the bindings and bind the stream
  elements = this._bindings.map(function(binding) {
    // check for srcObject
    if (typeof binding.el.srcObject != 'undefined') {
      binding.el.srcObject = stream;
    }
    // check for mozSrcObject
    else if (typeof binding.el.mozSrcObject != 'undefined') {
      binding.el.mozSrcObject = stream;
    }
    else {
      binding.el.src = media._createObjectURL(stream) || stream;
    }

    // attempt playback (may not work if the stream isn't quite ready)
    binding.el.play();
    return binding.el;
  });

  // find the elements we are waiting on
  waiting = elements.filter(function(el) {
    return el.readyState < 3; // readystate < HAVE_FUTURE_DATA
  });

  // wait for all the video elements
  waiting.forEach(function(el) {
    el.addEventListener('canplay', canPlay, false);
    el.addEventListener('loadedmetadata', canPlay, false);
  });

  checkWaiting();
};

/**
  ### _unbind()

  Gracefully detach elements that are using the stream from the
  current stream.
**/
Media.prototype._unbind = function(opts) {
  // ensure we have opts
  opts = opts || {};

  // iterate through the bindings and detach streams
  this._bindings.forEach(function(binding) {
    var element = binding.el;

    // remove the source
    element.src = null;

    // check for moz
    if (element.mozSrcObject) {
      element.mozSrcObject = null;
    }

    // check for currentSrc
    if (element.currentSrc) {
      element.currentSrc = null;
    }
  });
};

/**
  ### _createObjectUrl(stream)

  This method is used to create an object url that can be attached to a video
  or audio element.  Object urls are cached to ensure only one is created
  per stream.
**/
Media.prototype._createObjectURL = function(stream) {
  try {
    return window.URL.createObjectURL(stream);
  }
  catch (e) {
  }
};

/**
  ### _handleSuccess(stream)

  Handle the success condition of a `getUserMedia` call.

**/
Media.prototype._handleSuccess = function(stream) {
  // update the active stream that we are connected to
  this.stream = stream;

  // emit the stream event
  this.emit('stream', stream);
};

},{"cog/extend":4,"cog/logger":7,"eventemitter3":13,"inherits":14,"rtc-core/detect":15,"rtc-core/plugin":17}],13:[function(require,module,exports){
module.exports=require(10)
},{}],14:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],15:[function(require,module,exports){
/* jshint node: true */
/* global window: false */
/* global navigator: false */

'use strict';

var browser = require('detect-browser');

/**
  ## rtc-core/detect

  A browser detection helper for accessing prefix-free versions of the various
  WebRTC types.

  ### Example Usage

  If you wanted to get the native `RTCPeerConnection` prototype in any browser
  you could do the following:

  ```js
  var detect = require('rtc-core/detect'); // also available in rtc/detect
  var RTCPeerConnection = detect('RTCPeerConnection');
  ```

  This would provide whatever the browser prefixed version of the
  RTCPeerConnection is available (`webkitRTCPeerConnection`,
  `mozRTCPeerConnection`, etc).
**/
var detect = module.exports = function(target, prefixes) {
  var prefixIdx;
  var prefix;
  var testName;
  var hostObject = this || (typeof window != 'undefined' ? window : undefined);

  // if we have no host object, then abort
  if (! hostObject) {
    return;
  }

  // initialise to default prefixes
  // (reverse order as we use a decrementing for loop)
  prefixes = (prefixes || ['ms', 'o', 'moz', 'webkit']).concat('');

  // iterate through the prefixes and return the class if found in global
  for (prefixIdx = prefixes.length; prefixIdx--; ) {
    prefix = prefixes[prefixIdx];

    // construct the test class name
    // if we have a prefix ensure the target has an uppercase first character
    // such that a test for getUserMedia would result in a
    // search for webkitGetUserMedia
    testName = prefix + (prefix ?
                            target.charAt(0).toUpperCase() + target.slice(1) :
                            target);

    if (typeof hostObject[testName] != 'undefined') {
      // update the last used prefix
      detect.browser = detect.browser || prefix.toLowerCase();

      // return the host object member
      return hostObject[target] = hostObject[testName];
    }
  }
};

// detect mozilla (yes, this feels dirty)
detect.moz = typeof navigator != 'undefined' && !!navigator.mozGetUserMedia;

// set the browser and browser version
detect.browser = browser.name;
detect.browserVersion = detect.version = browser.version;

},{"detect-browser":16}],16:[function(require,module,exports){
var browsers = [
  [ 'chrome', /Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/ ],
  [ 'firefox', /Firefox\/([0-9\.]+)(?:\s|$)/ ],
  [ 'opera', /Opera\/([0-9\.]+)(?:\s|$)/ ],
  [ 'ie', /Trident\/7\.0.*rv\:([0-9\.]+)\).*Gecko$/ ]
];

var match = browsers.map(match).filter(isMatch)[0];
var parts = match && match[3].split('.').slice(0,3);

while (parts.length < 3) {
  parts.push('0');
}

// set the name and version
exports.name = match && match[0];
exports.version = parts.join('.');

function match(pair) {
  return pair.concat(pair[1].exec(navigator.userAgent));
}

function isMatch(pair) {
  return !!pair[2];
}

},{}],17:[function(require,module,exports){
var detect = require('./detect');
var requiredFunctions = [
  'init'
];

function isSupported(plugin) {
  return plugin && typeof plugin.supported == 'function' && plugin.supported(detect);
}

function isValid(plugin) {
  var supportedFunctions = requiredFunctions.filter(function(fn) {
    return typeof plugin[fn] == 'function';
  });

  return supportedFunctions.length === requiredFunctions.length;
}

module.exports = function(plugins) {
  return [].concat(plugins || []).filter(isSupported).filter(isValid)[0];
}

},{"./detect":15}],18:[function(require,module,exports){
(function (process){
/* jshint node: true */
'use strict';

var rtc = require('rtc-tools');
var cleanup = require('rtc-tools/cleanup');
var debug = rtc.logger('rtc-quickconnect');
var signaller = require('rtc-signaller');
var defaults = require('cog/defaults');
var extend = require('cog/extend');
var getable = require('cog/getable');
var reTrailingSlash = /\/$/;

/**
  # rtc-quickconnect

  This is a high level helper module designed to help you get up
  an running with WebRTC really, really quickly.  By using this module you
  are trading off some flexibility, so if you need a more flexible
  configuration you should drill down into lower level components of the
  [rtc.io](http://www.rtc.io) suite.  In particular you should check out
  [rtc](https://github.com/rtc-io/rtc).

  ## Upgrading to 1.0

  The [upgrading to 1.0 documentation](https://github.com/rtc-io/rtc-quickconnect/blob/master/docs/upgrading-to-1.0.md)
  provides some information on what you need to change to upgrade to
  `rtc-quickconnect@1.0`.  Additionally, the
  [quickconnect demo app](https://github.com/rtc-io/rtcio-demo-quickconnect)
  has been updated which should provide some additional information.

  ## Example Usage

  In the simplest case you simply call quickconnect with a single string
  argument which tells quickconnect which server to use for signaling:

  <<< examples/simple.js

  <<< docs/events.md

  <<< docs/examples.md

  ## Regarding Signalling and a Signalling Server

  Signaling is an important part of setting up a WebRTC connection and for
  our examples we use our own test instance of the
  [rtc-switchboard](https://github.com/rtc-io/rtc-switchboard). For your
  testing and development you are more than welcome to use this also, but
  just be aware that we use this for our testing so it may go up and down
  a little.  If you need something more stable, why not consider deploying
  an instance of the switchboard yourself - it's pretty easy :)

  ## Reference

  ```
  quickconnect(signalhost, opts?) => rtc-sigaller instance (+ helpers)
  ```

  ### Valid Quick Connect Options

  The options provided to the `rtc-quickconnect` module function influence the
  behaviour of some of the underlying components used from the rtc.io suite.

  Listed below are some of the commonly used options:

  - `ns` (default: '')

    An optional namespace for your signalling room.  While quickconnect
    will generate a unique hash for the room, this can be made to be more
    unique by providing a namespace.  Using a namespace means two demos
    that have generated the same hash but use a different namespace will be
    in different rooms.

  - `room` (default: null) _added 0.6_

    Rather than use the internal hash generation
    (plus optional namespace) for room name generation, simply use this room
    name instead.  __NOTE:__ Use of the `room` option takes precendence over
    `ns`.

  - `debug` (default: false)

  Write rtc.io suite debug output to the browser console.

  #### Options for Peer Connection Creation

  Options that are passed onto the
  [rtc.createConnection](https://github.com/rtc-io/rtc#createconnectionopts-constraints)
  function:

  - `iceServers`

  This provides a list of ice servers that can be used to help negotiate a
  connection between peers.

  #### Options for P2P negotiation

  Under the hood, quickconnect uses the
  [rtc/couple](https://github.com/rtc-io/rtc#rtccouple) logic, and the options
  passed to quickconnect are also passed onto this function.

**/
module.exports = function(signalhost, opts) {
  var hash = typeof location != 'undefined' && location.hash.slice(1);
  var signaller = require('rtc-signaller')(signalhost, opts);

  // init configurable vars
  var ns = (opts || {}).ns || '';
  var room = (opts || {}).room;
  var debugging = (opts || {}).debug;
  var profile = {};
  var announced = false;

  // collect the local streams
  var localStreams = [];

  // create the calls map
  var calls = signaller.calls = getable({});

  // create the known data channels registry
  var channels = {};

  function callCreate(id, pc, data) {
    calls.set(id, {
      active: false,
      pc: pc,
      channels: getable({}),
      data: data,
      streams: []
    });
  }

  function callEnd(id) {
    var call = calls.get(id);

    // if we have no data, then do nothing
    if (! call) {
      return;
    }

    debug('ending call to: ' + id);

    // if we have no data, then return
    call.channels.keys().forEach(function(label) {
      var args = [id, call.channels.get(label), label];

      // emit the plain channel:closed event
      signaller.emit.apply(signaller, ['channel:closed'].concat(args));

      // emit the labelled version of the event
      signaller.emit.apply(signaller, ['channel:closed:' + label].concat(args));
    });

    // trigger stream:removed events for each of the remotestreams in the pc
    call.streams.forEach(function(stream) {
      signaller.emit('stream:removed', id, stream);
    });

    // trigger the call:ended event
    signaller.emit('call:ended', id, call.pc);

    // ensure the peer connection is properly cleaned up
    cleanup(call.pc);

    // delete the call data
    calls.delete(id);
  }

  function callStart(id, pc, data) {
    var call = calls.get(id);
    var streams = [].concat(pc.getRemoteStreams());

    // flag the call as active
    call.active = true;
    call.streams = [].concat(pc.getRemoteStreams());

    pc.onaddstream = createStreamAddHandler(id);
    pc.onremovestream = createStreamRemoveHandler(id);

    debug(signaller.id + ' - ' + id + ' call start: ' + streams.length + ' streams');
    signaller.emit('call:started', id, pc, data);

    // examine the existing remote streams after a short delay
    process.nextTick(function() {
      // iterate through any remote streams
      streams.forEach(receiveRemoteStream(id));
    });
  }

  function createStreamAddHandler(id) {
    return function(evt) {
      debug('peer ' + id + ' added stream');
      updateRemoteStreams(id);
      receiveRemoteStream(id)(evt.stream);
    }
  }

  function createStreamRemoveHandler(id) {
    return function(evt) {
      debug('peer ' + id + ' removed stream');
      updateRemoteStreams(id);
      signaller.emit('stream:removed', id, evt.stream);
    };
  }

  function getActiveCall(peerId) {
    var call = calls.get(peerId);

    if (! call) {
      throw new Error('No active call for peer: ' + peerId);
    }

    return call;
  }

  function gotPeerChannel(channel, pc, data) {
    var channelMonitor;

    function channelReady() {
      var call = calls.get(data.id);
      var args = [ data.id, channel, data, pc ];

      // decouple the channel.onopen listener
      debug('reporting channel "' + channel.label + '" ready, have call: ' + (!!call));
      clearInterval(channelMonitor);
      channel.onopen = null;

      // save the channel
      if (call) {
        call.channels.set(channel.label, channel);
      }

      // trigger the %channel.label%:open event
      debug('triggering channel:opened events for channel: ' + channel.label);

      // emit the plain channel:opened event
      signaller.emit.apply(signaller, ['channel:opened'].concat(args));

      // emit the channel:opened:%label% eve
      signaller.emit.apply(
        signaller,
        ['channel:opened:' + channel.label].concat(args)
      );
    }

    debug('channel ' + channel.label + ' discovered for peer: ' + data.id);
    if (channel.readyState === 'open') {
      return channelReady();
    }

    debug('channel not ready, current state = ' + channel.readyState);
    channel.onopen = channelReady;

    // monitor the channel open (don't trust the channel open event just yet)
    channelMonitor = setInterval(function() {
      debug('checking channel state, current state = ' + channel.readyState);
      if (channel.readyState === 'open') {
        channelReady();
      }
    }, 500);
  }

  function handlePeerAnnounce(data) {
    var pc;
    var monitor;

    // if the room is not a match, abort
    if (data.room !== room) {
      return;
    }

    // create a peer connection
    pc = rtc.createConnection(opts, (opts || {}).constraints);

    // add this connection to the calls list
    callCreate(data.id, pc, data);

    // add the local streams
    localStreams.forEach(function(stream, idx) {
      pc.addStream(stream);
    });

    // add the data channels
    // do this differently based on whether the connection is a
    // master or a slave connection
    if (signaller.isMaster(data.id)) {
      debug('is master, creating data channels: ', Object.keys(channels));

      // create the channels
      Object.keys(channels).forEach(function(label) {
       gotPeerChannel(pc.createDataChannel(label, channels[label]), pc, data);
      });
    }
    else {
      pc.ondatachannel = function(evt) {
        var channel = evt && evt.channel;

        // if we have no channel, abort
        if (! channel) {
          return;
        }

        if (channels[channel.label] !== undefined) {
          gotPeerChannel(channel, pc, data);
        }
      };
    }

    // couple the connections
    debug('coupling ' + signaller.id + ' to ' + data.id);
    monitor = rtc.couple(pc, data.id, signaller, opts);

    // once active, trigger the peer connect event
    monitor.once('connected', callStart.bind(null, data.id, pc, data))
    monitor.once('closed', callEnd.bind(null, data.id));

    // if we are the master connnection, create the offer
    // NOTE: this only really for the sake of politeness, as rtc couple
    // implementation handles the slave attempting to create an offer
    if (signaller.isMaster(data.id)) {
      monitor.createOffer();
    }
  }

  function receiveRemoteStream(id) {
    var call = calls.get(id);

    return function(stream) {
      signaller.emit('stream:added', id, stream, call && call.data);
    };
  }

  function updateRemoteStreams(id) {
    var call = calls.get(id);

    if (call && call.pc) {
      call.streams = [].concat(call.pc.getRemoteStreams());
    }
  }

  // if the room is not defined, then generate the room name
  if (! room) {
    // if the hash is not assigned, then create a random hash value
    if (! hash) {
      hash = location.hash = '' + (Math.pow(2, 53) * Math.random());
    }

    room = ns + '#' + hash;
  }

  if (debugging) {
    rtc.logger.enable.apply(rtc.logger, Array.isArray(debug) ? debugging : ['*']);
  }

  signaller.on('peer:announce', handlePeerAnnounce);
  signaller.on('peer:leave', callEnd);

  // announce ourselves to our new friend
  setTimeout(function() {
    var data = extend({}, profile, { room: room });

    // announce and emit the local announce event
    signaller.announce(data);
    signaller.emit('local:announce', data);
    announced = true;
  }, 0);

  /**
    ### Quickconnect Broadcast and Data Channel Helper Functions

    The following are functions that are patched into the `rtc-signaller`
    instance that make working with and creating functional WebRTC applications
    a lot simpler.

  **/

  /**
    #### addStream

    ```
    addStream(stream:MediaStream) => qc
    ```

    Add the stream to active calls and also save the stream so that it
    can be added to future calls.

  **/
  signaller.broadcast = signaller.addStream = function(stream) {
    localStreams.push(stream);

    // if we have any active calls, then add the stream
    calls.values().forEach(function(data) {
      data.pc.addStream(stream);
    });

    return signaller;
  };

  /**
    #### close()

    The `close` function provides a convenient way of closing all associated
    peer connections.
  **/
  signaller.close = function() {
    // end each of the active calls
    calls.keys().forEach(callEnd);

    // call the underlying signaller.leave (for which close is an alias)
    signaller.leave();
  };

  /**
    #### createDataChannel(label, config)

    Request that a data channel with the specified `label` is created on
    the peer connection.  When the data channel is open and available, an
    event will be triggered using the label of the data channel.

    For example, if a new data channel was requested using the following
    call:

    ```js
    var qc = quickconnect('http://rtc.io/switchboard').createDataChannel('test');
    ```

    Then when the data channel is ready for use, a `test:open` event would
    be emitted by `qc`.

  **/
  signaller.createDataChannel = function(label, opts) {
    // create a channel on all existing calls
    calls.keys().forEach(function(peerId) {
      var call = calls.get(peerId);
      var dc;

      // if we are the master connection, create the data channel
      if (call && call.pc && signaller.isMaster(peerId)) {
        dc = call.pc.createDataChannel(label, opts);
        gotPeerChannel(dc, call.pc, call.data);
      }
    });

    // save the data channel opts in the local channels dictionary
    channels[label] = opts || null;

    return signaller;
  };

  /**
    #### reactive()

    Flag that this session will be a reactive connection.

  **/
  signaller.reactive = function() {
    // add the reactive flag
    opts = opts || {};
    opts.reactive = true;

    // chain
    return signaller;
  };

  /**
    #### removeStream

    ```
    removeStream(stream:MediaStream)
    ```

    Remove the specified stream from both the local streams that are to
    be connected to new peers, and also from any active calls.

  **/
  signaller.removeStream = function(stream) {
    var localIndex = localStreams.indexOf(stream);

    // remove the stream from any active calls
    calls.values().forEach(function(call) {
      call.pc.removeStream(stream);
    });

    // remove the stream from the localStreams array
    if (localIndex >= 0) {
      localStreams.splice(localIndex, 1);
    }

    return signaller;
  };

  /**
    #### requestChannel

    ```
    requestChannel(targetId, label, callback)
    ```

    This is a function that can be used to respond to remote peers supplying
    a data channel as part of their configuration.  As per the `receiveStream`
    function this function will either fire the callback immediately if the
    channel is already available, or once the channel has been discovered on
    the call.

  **/
  signaller.requestChannel = function(targetId, label, callback) {
    var call = getActiveCall(targetId);
    var channel = call && call.channels.get(label);

    // if we have then channel trigger the callback immediately
    if (channel) {
      callback(null, channel);
      return signaller;
    }

    // if not, wait for it
    signaller.once('channel:opened:' + label, function(id, dc) {
      callback(null, dc);
    });

    return signaller;
  };

  /**
    #### requestStream

    ```
    requestStream(targetId, idx, callback)
    ```

    Used to request a remote stream from a quickconnect instance. If the
    stream is already available in the calls remote streams, then the callback
    will be triggered immediately, otherwise this function will monitor
    `stream:added` events and wait for a match.

    In the case that an unknown target is requested, then an exception will
    be thrown.
  **/
  signaller.requestStream = function(targetId, idx, callback) {
    var call = getActiveCall(targetId);
    var stream;

    function waitForStream(peerId) {
      if (peerId !== targetId) {
        return;
      }

      // get the stream
      stream = call.pc.getRemoteStreams()[idx];

      // if we have the stream, then remove the listener and trigger the cb
      if (stream) {
        signaller.removeListener('stream:added', waitForStream);
        callback(null, stream);
      }
    }

    // look for the stream in the remote streams of the call
    stream = call.pc.getRemoteStreams()[idx];

    // if we found the stream then trigger the callback
    if (stream) {
      callback(null, stream);
      return signaller;
    }

    // otherwise wait for the stream
    signaller.on('stream:added', waitForStream);
    return signaller;
  };

  /**
    #### profile(data)

    Update the profile data with the attached information, so when
    the signaller announces it includes this data in addition to any
    room and id information.

  **/
  signaller.profile = function(data) {
    extend(profile, data);

    // if we have already announced, then reannounce our profile to provide
    // others a `peer:update` event
    if (announced) {
      signaller.announce(profile);
    }

    return signaller;
  };

  /**
    #### waitForCall

    ```
    waitForCall(targetId, callback)
    ```

    Wait for a call from the specified targetId.  If the call is already
    active the callback will be fired immediately, otherwise we will wait
    for a `call:started` event that matches the requested `targetId`

  **/
  signaller.waitForCall = function(targetId, callback) {
    var call = calls.get(targetId);

    if (call && call.active) {
      callback(null, call.pc);
      return signaller;
    }

    signaller.on('call:started', function handleNewCall(id) {
      if (id === targetId) {
        signaller.removeListener('call:started', handleNewCall);
        callback(null, calls.get(id).pc);
      }
    });
  };

  // pass the signaller on
  return signaller;
};

}).call(this,require("FWaASH"))
},{"FWaASH":2,"cog/defaults":3,"cog/extend":4,"cog/getable":5,"rtc-signaller":22,"rtc-tools":36,"rtc-tools/cleanup":32}],19:[function(require,module,exports){
module.exports=require(15)
},{"detect-browser":20}],20:[function(require,module,exports){
module.exports=require(16)
},{}],21:[function(require,module,exports){
module.exports=require(17)
},{"./detect":19}],22:[function(require,module,exports){
var extend = require('cog/extend');

module.exports = function(messenger, opts) {
  return require('./index.js')(messenger, extend({
    connect: require('./primus-loader')
  }, opts));
};

},{"./index.js":27,"./primus-loader":29,"cog/extend":4}],23:[function(require,module,exports){
module.exports = {
  // messenger events
  dataEvent: 'data',
  openEvent: 'open',
  closeEvent: 'close',

  // messenger functions
  writeMethod: 'write',
  closeMethod: 'close',

  // leave timeout (ms)
  leaveTimeout: 3000
};
},{}],24:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc-signaller');
var extend = require('cog/extend');
var roles = ['a', 'b'];

/**
  #### announce

  ```
  /announce|%metadata%|{"id": "...", ... }
  ```

  When an announce message is received by the signaller, the attached
  object data is decoded and the signaller emits an `announce` message.

**/
module.exports = function(signaller) {

  function copyData(target, source) {
    if (target && source) {
      for (var key in source) {
        target[key] = source[key];
      }
    }

    return target;
  }

  function dataAllowed(data) {
    var evt = {
      data: data,
      allow: true
    };

    signaller.emit('peer:filter', evt);

    return evt.allow;
  }

  return function(args, messageType, srcData, srcState, isDM) {
    var data = args[0];
    var peer;

    debug('announce handler invoked, received data: ', data);

    // if we have valid data then process
    if (data && data.id && data.id !== signaller.id) {
      if (! dataAllowed(data)) {
        return;
      }
      // check to see if this is a known peer
      peer = signaller.peers.get(data.id);

      // trigger the peer connected event to flag that we know about a
      // peer connection. The peer has passed the "filter" check but may
      // be announced / updated depending on previous connection status
      signaller.emit('peer:connected', data.id, data);

      // if the peer is existing, then update the data
      if (peer && (! peer.inactive)) {
        debug('signaller: ' + signaller.id + ' received update, data: ', data);

        // update the data
        copyData(peer.data, data);

        // trigger the peer update event
        return signaller.emit('peer:update', data, srcData);
      }

      // create a new peer
      peer = {
        id: data.id,

        // initialise the local role index
        roleIdx: [data.id, signaller.id].sort().indexOf(data.id),

        // initialise the peer data
        data: {}
      };

      // initialise the peer data
      copyData(peer.data, data);

      // reset inactivity state
      clearTimeout(peer.leaveTimer);
      peer.inactive = false;

      // set the peer data
      signaller.peers.set(data.id, peer);

      // if this is an initial announce message (no vector clock attached)
      // then send a announce reply
      if (signaller.autoreply && (! isDM)) {
        signaller
          .to(data.id)
          .send('/announce', signaller.attributes);
      }

      // emit a new peer announce event
      return signaller.emit('peer:announce', data, peer);
    }
  };
};
},{"cog/extend":4,"cog/logger":7}],25:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ### signaller message handlers

**/

module.exports = function(signaller, opts) {
  return {
    announce: require('./announce')(signaller, opts),
    leave: require('./leave')(signaller, opts)
  };
};
},{"./announce":24,"./leave":26}],26:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  #### leave

  ```
  /leave|{"id":"..."}
  ```

  When a leave message is received from a peer, we check to see if that is
  a peer that we are managing state information for and if we are then the
  peer state is removed.

**/
module.exports = function(signaller, opts) {
  return function(args) {
    var data = args[0];
    var peer = signaller.peers.get(data && data.id);

    if (peer) {
      // start the inactivity timer
      peer.leaveTimer = setTimeout(function() {
        peer.inactive = true;
        signaller.emit('peer:leave', data.id, peer);
      }, opts.leaveTimeout);
    }

    // emit the event
    signaller.emit('peer:disconnected', data.id, peer);
  };
};
},{}],27:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc-signaller');
var detect = require('rtc-core/detect');
var EventEmitter = require('eventemitter3');
var defaults = require('cog/defaults');
var extend = require('cog/extend');
var throttle = require('cog/throttle');
var getable = require('cog/getable');
var uuid = require('./uuid');

// initialise the list of valid "write" methods
var WRITE_METHODS = ['write', 'send'];
var CLOSE_METHODS = ['close', 'end'];

// initialise signaller metadata so we don't have to include the package.json
// TODO: make this checkable with some kind of prepublish script
var metadata = {
  version: '2.3.0'
};

/**
  # rtc-signaller

  The `rtc-signaller` module provides a transportless signalling
  mechanism for WebRTC.

  ## Purpose

  <<< docs/purpose.md

  ## Getting Started

  While the signaller is capable of communicating by a number of different
  messengers (i.e. anything that can send and receive messages over a wire)
  it comes with support for understanding how to connect to an
  [rtc-switchboard](https://github.com/rtc-io/rtc-switchboard) out of the box.

  The following code sample demonstrates how:

  <<< examples/getting-started.js

  <<< docs/events.md

  <<< docs/signalflow-diagrams.md

  ## Reference

  The `rtc-signaller` module is designed to be used primarily in a functional
  way and when called it creates a new signaller that will enable
  you to communicate with other peers via your messaging network.

  ```js
  // create a signaller from something that knows how to send messages
  var signaller = require('rtc-signaller')(messenger);
  ```

  As demonstrated in the getting started guide, you can also pass through
  a string value instead of a messenger instance if you simply want to
  connect to an existing `rtc-switchboard` instance.

**/
module.exports = function(messenger, opts) {
  // get the autoreply setting
  var autoreply = (opts || {}).autoreply;
  var connect = (opts || {}).connect;

  // initialise the metadata
  var localMeta = {};

  // create the signaller
  var signaller = new EventEmitter();

  // initialise the id
  var id = signaller.id = (opts || {}).id || uuid();

  // initialise the attributes
  var attributes = signaller.attributes = {
    browser: detect.browser,
    browserVersion: detect.browserVersion,
    id: id,
    agent: 'signaller@' + metadata.version
  };

  // create the peers map
  var peers = signaller.peers = getable({});

  // initialise the data event name

  var connected = false;
  var write;
  var close;
  var processor;
  var announceTimer = 0;

  function announceOnReconnect() {
    signaller.announce();
  }

  function bindBrowserEvents() {
    messenger.addEventListener('message', function(evt) {
      processor(evt.data);
    });

    messenger.addEventListener('open', function(evt) {
      connected = true;
      signaller.emit('open');
      signaller.emit('connected');
    });

    messenger.addEventListener('close', function(evt) {
      connected = false;
      signaller.emit('disconnected');
    });
  }

  function bindEvents() {
    // if we don't have an on function for the messenger, then do nothing
    if (typeof messenger.on != 'function') {
      return;
    }

    // handle message data events
    messenger.on(opts.dataEvent, processor);

    // when the connection is open, then emit an open event and a connected event
    messenger.on(opts.openEvent, function() {
      connected = true;
      signaller.emit('open');
      signaller.emit('connected');
    });

    messenger.on(opts.closeEvent, function() {
      connected = false;
      signaller.emit('disconnected');
    });
  }

  function connectToHost(url) {
    if (typeof connect != 'function') {
      return signaller.emit('error', new Error('no connect function'));
    }

    // load primus
    connect(url, function(err, socket) {
      if (err) {
        return signaller.emit('error', err);
      }

      // create the actual messenger from a primus connection
      signaller._messenger = messenger = socket.connect(url);

      // now init
      init();
    });
  }

  function createDataLine(args) {
    return args.map(prepareArg).join('|');
  }

  function createMetadata() {
    return extend({}, localMeta, { id: signaller.id });
  }

  function extractProp(name) {
    return messenger[name];
  }

  // attempt to detect whether the underlying messenger is closing
  // this can be tough as we deal with both native (or simulated native)
  // sockets or an abstraction layer such as primus
  function isClosing() {
    var isAbstraction = messenger &&
        // a primus socket has a socket attribute
        typeof messenger.socket != 'undefined';

    return isAbstraction ? false : (
      messenger &&
      typeof messenger.readyState != 'undefined' &&
      messenger.readyState >= 2
    );
  }

  function isF(target) {
    return typeof target == 'function';
  }

  function init() {
    // extract the write and close function references
    write = [opts.writeMethod].concat(WRITE_METHODS).map(extractProp).filter(isF)[0];
    close = [opts.closeMethod].concat(CLOSE_METHODS).map(extractProp).filter(isF)[0];

    // create the processor
    signaller.process = processor = require('./processor')(signaller, opts);

    // if the messenger doesn't provide a valid write method, then complain
    if (typeof write != 'function') {
      throw new Error('provided messenger does not implement a "' +
        writeMethod + '" write method');
    }

    // handle core browser messenging apis
    if (typeof messenger.addEventListener == 'function') {
      bindBrowserEvents();
    }
    else {
      bindEvents();
    }

    // determine if we are connected or not
    connected = messenger.connected || false;
    if (! connected) {
      signaller.once('connected', function() {
        // always announce on reconnect
        signaller.on('connected', announceOnReconnect);
      });
    }

    // emit the initialized event
    setTimeout(signaller.emit.bind(signaller, 'init'), 0);
  }

  function prepareArg(arg) {
    if (typeof arg == 'object' && (! (arg instanceof String))) {
      return JSON.stringify(arg);
    }
    else if (typeof arg == 'function') {
      return null;
    }

    return arg;
  }

  /**
    ### signaller#send(message, data*)

    Use the send function to send a message to other peers in the current
    signalling scope (if announced in a room this will be a room, otherwise
    broadcast to all peers connected to the signalling server).

  **/
  var send = signaller.send = function() {
    // iterate over the arguments and stringify as required
    // var metadata = { id: signaller.id };
    var args = [].slice.call(arguments);
    var dataline;

    // inject the metadata
    args.splice(1, 0, createMetadata());
    dataline = createDataLine(args);

    // perform an isclosing check
    if (isClosing()) {
      return;
    }

    // if we are not initialized, then wait until we are
    if (! connected) {
      return signaller.once('connected', function() {
        write.call(messenger, dataline);
      });
    }

    // send the data over the messenger
    return write.call(messenger, dataline);
  };

  /**
    ### announce(data?)

    The `announce` function of the signaller will pass an `/announce` message
    through the messenger network.  When no additional data is supplied to
    this function then only the id of the signaller is sent to all active
    members of the messenging network.

    #### Joining Rooms

    To join a room using an announce call you simply provide the name of the
    room you wish to join as part of the data block that you annouce, for
    example:

    ```js
    signaller.announce({ room: 'testroom' });
    ```

    Signalling servers (such as
    [rtc-switchboard](https://github.com/rtc-io/rtc-switchboard)) will then
    place your peer connection into a room with other peers that have also
    announced in this room.

    Once you have joined a room, the server will only deliver messages that
    you `send` to other peers within that room.

    #### Providing Additional Announce Data

    There may be instances where you wish to send additional data as part of
    your announce message in your application.  For instance, maybe you want
    to send an alias or nick as part of your announce message rather than just
    use the signaller's generated id.

    If for instance you were writing a simple chat application you could join
    the `webrtc` room and tell everyone your name with the following announce
    call:

    ```js
    signaller.announce({
      room: 'webrtc',
      nick: 'Damon'
    });
    ```

    #### Announcing Updates

    The signaller is written to distinguish between initial peer announcements
    and peer data updates (see the docs on the announce handler below). As
    such it is ok to provide any data updates using the announce method also.

    For instance, I could send a status update as an announce message to flag
    that I am going offline:

    ```js
    signaller.announce({ status: 'offline' });
    ```

  **/
  signaller.announce = function(data, sender) {
    clearTimeout(announceTimer);

    // update internal attributes
    extend(attributes, data, { id: signaller.id });

    // if we are already connected, then ensure we announce on
    // reconnect
    if (connected) {
      // always announce on reconnect
      signaller.removeListener('connected', announceOnReconnect);
      signaller.on('connected', announceOnReconnect);
    }

    // send the attributes over the network
    return announceTimer = setTimeout(function() {
      if (! connected) {
        return signaller.once('connected', function() {
          (sender || send)('/announce', attributes);
        });
      }

      (sender || send)('/announce', attributes);
    }, (opts || {}).announceDelay || 10);
  };

  /**
    ### isMaster(targetId)

    A simple function that indicates whether the local signaller is the master
    for it's relationship with peer signaller indicated by `targetId`.  Roles
    are determined at the point at which signalling peers discover each other,
    and are simply worked out by whichever peer has the lowest signaller id
    when lexigraphically sorted.

    For example, if we have two signaller peers that have discovered each
    others with the following ids:

    - `b11f4fd0-feb5-447c-80c8-c51d8c3cced2`
    - `8a07f82e-49a5-4b9b-a02e-43d911382be6`

    They would be assigned roles:

    - `b11f4fd0-feb5-447c-80c8-c51d8c3cced2`
    - `8a07f82e-49a5-4b9b-a02e-43d911382be6` (master)

  **/
  signaller.isMaster = function(targetId) {
    var peer = peers.get(targetId);

    return peer && peer.roleIdx !== 0;
  };

  /**
    ### leave()

    Tell the signalling server we are leaving.  Calling this function is
    usually not required though as the signalling server should issue correct
    `/leave` messages when it detects a disconnect event.

  **/
  signaller.leave = signaller.close = function() {
    // send the leave signal
    send('/leave', { id: id });

    // stop announcing on reconnect
    signaller.removeListener('connected', announceOnReconnect);

    // call the close method
    if (typeof close == 'function') {
      close.call(messenger);
    }
  };

  /**
    ### metadata(data?)

    Get (pass no data) or set the metadata that is passed through with each
    request sent by the signaller.

    __NOTE:__ Regardless of what is passed to this function, metadata
    generated by the signaller will **always** include the id of the signaller
    and this cannot be modified.
  **/
  signaller.metadata = function(data) {
    if (arguments.length === 0) {
      return extend({}, localMeta);
    }

    localMeta = extend({}, data);
  };

  /**
    ### to(targetId)

    Use the `to` function to send a message to the specified target peer.
    A large parge of negotiating a WebRTC peer connection involves direct
    communication between two parties which must be done by the signalling
    server.  The `to` function provides a simple way to provide a logical
    communication channel between the two parties:

    ```js
    var send = signaller.to('e95fa05b-9062-45c6-bfa2-5055bf6625f4').send;

    // create an offer on a local peer connection
    pc.createOffer(
      function(desc) {
        // set the local description using the offer sdp
        // if this occurs successfully send this to our peer
        pc.setLocalDescription(
          desc,
          function() {
            send('/sdp', desc);
          },
          handleFail
        );
      },
      handleFail
    );
    ```

  **/
  signaller.to = function(targetId) {
    // create a sender that will prepend messages with /to|targetId|
    var sender = function() {
      // get the peer (yes when send is called to make sure it hasn't left)
      var peer = signaller.peers.get(targetId);
      var args;

      if (! peer) {
        throw new Error('Unknown peer: ' + targetId);
      }

      // if the peer is inactive, then abort
      if (peer.inactive) {
        return;
      }

      args = [
        '/to',
        targetId
      ].concat([].slice.call(arguments));

      // inject metadata
      args.splice(3, 0, createMetadata());

      setTimeout(function() {
        var msg = createDataLine(args);
        debug('TX (' + targetId + '): ' + msg);

        write.call(messenger, msg);
      }, 0);
    };

    return {
      announce: function(data) {
        return signaller.announce(data, sender);
      },

      send: sender,
    }
  };

  // remove max listeners from the emitter
  signaller.setMaxListeners(0);

  // initialise opts defaults
  opts = defaults({}, opts, require('./defaults'));

  // set the autoreply flag
  signaller.autoreply = autoreply === undefined || autoreply;

  // if the messenger is a string, then we are going to attach to a
  // ws endpoint and automatically set up primus
  if (typeof messenger == 'string' || (messenger instanceof String)) {
    connectToHost(messenger);
  }
  // otherwise, initialise the connection
  else {
    init();
  }

  // connect an instance of the messenger to the signaller
  signaller._messenger = messenger;

  // expose the process as a process function
  signaller.process = processor;

  return signaller;
};

},{"./defaults":23,"./processor":30,"./uuid":31,"cog/defaults":3,"cog/extend":4,"cog/getable":5,"cog/logger":7,"cog/throttle":8,"eventemitter3":28,"rtc-core/detect":19}],28:[function(require,module,exports){
module.exports=require(10)
},{}],29:[function(require,module,exports){
/* jshint node: true */
/* global document, location, Primus: false */
'use strict';

var reTrailingSlash = /\/$/;

/**
  ### loadPrimus(signalhost, callback)

  This is a convenience function that is patched into the signaller to assist
  with loading the `primus.js` client library from an `rtc-switchboard`
  signaling server.

**/
module.exports = function(signalhost, callback) {
  var anchor = document.createElement('a');
  var script;
  var baseUrl;
  var scriptSrc;

  // if the signalhost is a function, we are in single arg calling mode
  if (typeof signalhost == 'function') {
    callback = signalhost;
    signalhost = location.origin;
  }

  // initialise the anchor with the signalhost
  anchor.href = signalhost;

  // read the base path
  baseUrl = signalhost.replace(reTrailingSlash, '');
  scriptSrc = baseUrl + '/rtc.io/primus.js';

  // look for the script first
  script = document.querySelector('script[src="' + scriptSrc + '"]');

  // if we found, the script trigger the callback immediately
  if (script && typeof Primus != 'undefined') {
    return callback(null, Primus);
  }
  // otherwise, if the script exists but Primus is not loaded,
  // then wait for the load
  else if (script) {
    script.addEventListener('load', function() {
      callback(null, Primus);
    });

    return;
  }

  // otherwise create the script and load primus
  script = document.createElement('script');
  script.src = scriptSrc;

  script.onerror = callback;
  script.addEventListener('load', function() {
    // if we have a signalhost that is not basepathed at /
    // then tweak the primus prototype
    if (anchor.pathname !== '/') {
      Primus.prototype.pathname = anchor.pathname.replace(reTrailingSlash, '') +
        Primus.prototype.pathname;
    }

    callback(null, Primus);
  });

  document.body.appendChild(script);
};

},{}],30:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc-signaller');
var jsonparse = require('cog/jsonparse');

/**
  ### signaller process handling

  When a signaller's underling messenger emits a `data` event this is
  delegated to a simple message parser, which applies the following simple
  logic:

  - Is the message a `/to` message. If so, see if the message is for this
    signaller (checking the target id - 2nd arg).  If so pass the
    remainder of the message onto the standard processing chain.  If not,
    discard the message.

  - Is the message a command message (prefixed with a forward slash). If so,
    look for an appropriate message handler and pass the message payload on
    to it.

  - Finally, does the message match any patterns that we are listening for?
    If so, then pass the entire message contents onto the registered handler.
**/
module.exports = function(signaller, opts) {
  var handlers = require('./handlers')(signaller, opts);

  function sendEvent(parts, srcState, data) {
    // initialise the event name
    var evtName = parts[0].slice(1);

    // convert any valid json objects to json
    var args = parts.slice(2).map(jsonparse);

    signaller.emit.apply(
      signaller,
      [evtName].concat(args).concat([srcState, data])
    );
  }

  return function(originalData) {
    var data = originalData;
    var isMatch = true;
    var parts;
    var handler;
    var srcData;
    var srcState;
    var isDirectMessage = false;

    // force the id into string format so we can run length and comparison tests on it
    var id = signaller.id + '';
    debug('signaller ' + id + ' received data: ' + originalData);

    // process /to messages
    if (data.slice(0, 3) === '/to') {
      isMatch = data.slice(4, id.length + 4) === id;
      if (isMatch) {
        parts = data.slice(5 + id.length).split('|').map(jsonparse);

        // get the source data
        isDirectMessage = true;

        // extract the vector clock and update the parts
        parts = parts.map(jsonparse);
      }
    }

    // if this is not a match, then bail
    if (! isMatch) {
      return;
    }

    // chop the data into parts
    parts = parts || data.split('|').map(jsonparse);

    // if we have a specific handler for the action, then invoke
    if (typeof parts[0] == 'string') {
      // extract the metadata from the input data
      srcData = parts[1];

      // if we got data from ourself, then this is pretty dumb
      // but if we have then throw it away
      if (srcData && srcData.id === signaller.id) {
        return console.warn('got data from ourself, discarding');
      }

      // get the source state
      srcState = signaller.peers.get(srcData && srcData.id) || srcData;

      // handle commands
      if (parts[0].charAt(0) === '/') {
        // look for a handler for the message type
        handler = handlers[parts[0].slice(1)];

        if (typeof handler == 'function') {
          handler(
            parts.slice(2),
            parts[0].slice(1),
            srcData,
            srcState,
            isDirectMessage
          );
        }
        else {
          sendEvent(parts, srcState, originalData);
        }
      }
      // otherwise, emit data
      else {
        signaller.emit(
          'data',
          parts.slice(0, 1).concat(parts.slice(2)),
          srcData,
          srcState,
          isDirectMessage
        );
      }
    }
  };
};

},{"./handlers":25,"cog/jsonparse":6,"cog/logger":7}],31:[function(require,module,exports){
// LeverOne's awesome uuid generator
module.exports = function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b};

},{}],32:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc/cleanup');

var CANNOT_CLOSE_STATES = [
  'closed'
];

var EVENTNAMES = [
  'addstream',
  'datachannel',
  'icecandidate',
  'iceconnectionstatechange',
  'negotiationneeded',
  'removestream',
  'signalingstatechange'
];

/**
  ### rtc-tools/cleanup

  ```
  cleanup(pc)
  ```

  The `cleanup` function is used to ensure that a peer connection is properly
  closed and ready to be cleaned up by the browser.

**/
module.exports = function(pc) {
  // see if we can close the connection
  var currentState = pc.iceConnectionState;
  var canClose = CANNOT_CLOSE_STATES.indexOf(currentState) < 0;

  if (canClose) {
    debug('attempting connection close, current state: '+ pc.iceConnectionState);
    pc.close();
  }

  // remove the event listeners
  // after a short delay giving the connection time to trigger
  // close and iceconnectionstatechange events
  setTimeout(function() {
    EVENTNAMES.forEach(function(evtName) {
      if (pc['on' + evtName]) {
        pc['on' + evtName] = null;
      }
    });
  }, 100);
};

},{"cog/logger":7}],33:[function(require,module,exports){
/* jshint node: true */
'use strict';

var async = require('async');
var cleanup = require('./cleanup');
var monitor = require('./monitor');
var detect = require('./detect');
var findPlugin = require('rtc-core/plugin');
var CLOSED_STATES = [ 'closed', 'failed' ];

// track the various supported CreateOffer / CreateAnswer contraints
// that we recognize and allow
var OFFER_ANSWER_CONSTRAINTS = [
  'offerToReceiveVideo',
  'offerToReceiveAudio',
  'voiceActivityDetection',
  'iceRestart'
];

/**
  ### rtc-tools/couple

  #### couple(pc, targetId, signaller, opts?)

  Couple a WebRTC connection with another webrtc connection identified by
  `targetId` via the signaller.

  The following options can be provided in the `opts` argument:

  - `sdpfilter` (default: null)

    A simple function for filtering SDP as part of the peer
    connection handshake (see the Using Filters details below).

  ##### Example Usage

  ```js
  var couple = require('rtc/couple');

  couple(pc, '54879965-ce43-426e-a8ef-09ac1e39a16d', signaller);
  ```

  ##### Using Filters

  In certain instances you may wish to modify the raw SDP that is provided
  by the `createOffer` and `createAnswer` calls.  This can be done by passing
  a `sdpfilter` function (or array) in the options.  For example:

  ```js
  // run the sdp from through a local tweakSdp function.
  couple(pc, '54879965-ce43-426e-a8ef-09ac1e39a16d', signaller, {
    sdpfilter: tweakSdp
  });
  ```

**/
function couple(pc, targetId, signaller, opts) {
  var debugLabel = (opts || {}).debugLabel || 'rtc';
  var debug = require('cog/logger')(debugLabel + '/couple');

  // create a monitor for the connection
  var mon = monitor(pc, targetId, signaller, opts);
  var queuedCandidates = [];
  var sdpFilter = (opts || {}).sdpfilter;
  var reactive = (opts || {}).reactive;
  var offerTimeout;
  var endOfCandidates = true;
  var plugin = findPlugin((opts || {}).plugins);

  // configure the time to wait between receiving a 'disconnect'
  // iceConnectionState and determining that we are closed
  var disconnectTimeout = (opts || {}).disconnectTimeout || 10000;
  var disconnectTimer;

  // if the signaller does not support this isMaster function throw an
  // exception
  if (typeof signaller.isMaster != 'function') {
    throw new Error('rtc-signaller instance >= 0.14.0 required');
  }

  // initilaise the negotiation helpers
  var isMaster = signaller.isMaster(targetId);

  var createOffer = prepNegotiate(
    'createOffer',
    isMaster,
    [ checkStable ]
  );

  var createAnswer = prepNegotiate(
    'createAnswer',
    true,
    []
  );

  // initialise the processing queue (one at a time please)
  var q = async.queue(function(task, cb) {
    // if the task has no operation, then trigger the callback immediately
    if (typeof task.op != 'function') {
      return cb();
    }

    // process the task operation
    task.op(task, cb);
  }, 1);

  // initialise session description and icecandidate objects
  var RTCSessionDescription = (opts || {}).RTCSessionDescription ||
    detect('RTCSessionDescription');

  var RTCIceCandidate = (opts || {}).RTCIceCandidate ||
    detect('RTCIceCandidate');

  function abort(stage, sdp, cb) {
    return function(err) {
      // log the error
      console.error('rtc/couple error (' + stage + '): ', err);

      if (typeof cb == 'function') {
        cb(err);
      }
    };
  }

  function applyCandidatesWhenStable() {
    if (pc.signalingState == 'stable' && pc.remoteDescription) {
      debug('signaling state = stable, applying queued candidates');
      mon.removeListener('change', applyCandidatesWhenStable);

      // apply any queued candidates
      queuedCandidates.splice(0).forEach(function(data) {
        debug('applying queued candidate', data);

        try {
          pc.addIceCandidate(createIceCandidate(data));
        }
        catch (e) {
          debug('invalidate candidate specified: ', data);
        }
      });
    }
  }

  function checkNotConnecting(negotiate) {
    if (pc.iceConnectionState != 'checking') {
      return true;
    }

    debug('connection state is checking, will wait to create a new offer');
    mon.once('connected', function() {
      q.push({ op: negotiate });
    });

    return false;
  }

  function checkStable(negotiate) {
    if (pc.signalingState === 'stable') {
      return true;
    }

    debug('cannot create offer, signaling state != stable, will retry');
    mon.on('change', function waitForStable() {
      if (pc.signalingState === 'stable') {
        q.push({ op: negotiate });
      }

      mon.removeListener('change', waitForStable);
    });

    return false;
  }

  function createIceCandidate(data) {
    if (plugin && typeof plugin.createIceCandidate == 'function') {
      return plugin.createIceCandidate(data);
    }

    return new RTCIceCandidate(data);
  }

  function createSessionDescription(data) {
    if (plugin && typeof plugin.createSessionDescription == 'function') {
      return plugin.createSessionDescription(data);
    }

    return new RTCSessionDescription(data);
  }

  function decouple() {
    debug('decoupling ' + signaller.id + ' from ' + targetId);

    // stop the monitor
    mon.removeAllListeners();
    mon.stop();

    // cleanup the peerconnection
    cleanup(pc);

    // remove listeners
    signaller.removeListener('sdp', handleSdp);
    signaller.removeListener('candidate', handleRemoteCandidate);
    signaller.removeListener('negotiate', handleNegotiateRequest);
  }

  function generateConstraints(methodName) {
    var constraints = {};

    function reformatConstraints() {
      var tweaked = {};

      Object.keys(constraints).forEach(function(param) {
        var sentencedCased = param.charAt(0).toUpperCase() + param.substr(1);
        tweaked[sentencedCased] = constraints[param];
      });

      // update the constraints to match the expected format
      constraints = {
        mandatory: tweaked
      };
    }

    // TODO: customize behaviour based on offer vs answer

    // pull out any valid
    OFFER_ANSWER_CONSTRAINTS.forEach(function(param) {
      var sentencedCased = param.charAt(0).toUpperCase() + param.substr(1);

      // if we have no opts, do nothing
      if (! opts) {
        return;
      }
      // if the parameter has been defined, then add it to the constraints
      else if (opts[param] !== undefined) {
        constraints[param] = opts[param];
      }
      // if the sentenced cased version has been added, then use that
      else if (opts[sentencedCased] !== undefined) {
        constraints[param] = opts[sentencedCased];
      }
    });

    // TODO: only do this for the older browsers that require it
    reformatConstraints();

    return constraints;
  }

  function prepNegotiate(methodName, allowed, preflightChecks) {
    var constraints = generateConstraints(methodName);

    // ensure we have a valid preflightChecks array
    preflightChecks = [].concat(preflightChecks || []);

    return function negotiate(task, cb) {
      var checksOK = true;

      // if the task is not allowed, then send a negotiate request to our
      // peer
      if (! allowed) {
        signaller.to(targetId).send('/negotiate');
        return cb();
      }

      // if the connection is closed, then abort
      if (isClosed()) {
        return cb(new Error('connection closed, cannot negotiate'));
      }

      // run the preflight checks
      preflightChecks.forEach(function(check) {
        checksOK = checksOK && check(negotiate);
      });

      // if the checks have not passed, then abort for the moment
      if (! checksOK) {
        debug('preflight checks did not pass, aborting ' + methodName);
        return cb();
      }

      // create the offer
      debug('calling ' + methodName);
      // debug('gathering state = ' + pc.iceGatheringState);
      // debug('connection state = ' + pc.iceConnectionState);
      // debug('signaling state = ' + pc.signalingState);

      pc[methodName](
        function(desc) {

          // if a filter has been specified, then apply the filter
          if (typeof sdpFilter == 'function') {
            desc.sdp = sdpFilter(desc.sdp, pc, methodName);
          }

          q.push({ op: queueLocalDesc(desc) });
          cb();
        },

        // on error, abort
        abort(methodName, '', cb),

        // include the appropriate constraints
        constraints
      );
    };
  }

  function handleConnectionClose() {
    debug('captured pc close, iceConnectionState = ' + pc.iceConnectionState);
    decouple();
  }

  function handleDisconnect() {
    debug('captured pc disconnect, monitoring connection status');

    // start the disconnect timer
    disconnectTimer = setTimeout(function() {
      debug('manually closing connection after disconnect timeout');
      pc.close();
    }, disconnectTimeout);

    mon.on('change', handleDisconnectAbort);
  }

  function handleDisconnectAbort() {
    debug('connection state changed to: ' + pc.iceConnectionState);
    resetDisconnectTimer();

    // if we have a closed or failed status, then close the connection
    if (CLOSED_STATES.indexOf(pc.iceConnectionState) >= 0) {
      return mon.emit('closed');
    }

    mon.once('disconnect', handleDisconnect);
  };

  function handleLocalCandidate(evt) {
    if (evt.candidate) {
      resetDisconnectTimer();

      signaller.to(targetId).send('/candidate', evt.candidate);
      endOfCandidates = false;
    }
    else if (! endOfCandidates) {
      endOfCandidates = true;
      debug('ice gathering state complete');
      signaller.to(targetId).send('/endofcandidates', {});
    }
  }

  function handleNegotiateRequest(src) {
    if (src.id === targetId) {
      debug('got negotiate request from ' + targetId + ', creating offer');
      q.push({ op: createOffer });
    }
  }

  function handleRemoteCandidate(data, src) {
    if ((! src) || (src.id !== targetId)) {
      return;
    }

    // queue candidates while the signaling state is not stable
    if (pc.signalingState != 'stable' || (! pc.remoteDescription)) {
      debug('queuing candidate');
      queuedCandidates.push(data);

      mon.removeListener('change', applyCandidatesWhenStable);
      mon.on('change', applyCandidatesWhenStable);
      return;
    }

    try {
      pc.addIceCandidate(createIceCandidate(data));
    }
    catch (e) {
      debug('invalidate candidate specified: ', data);
    }
  }

  function handleSdp(data, src) {
    var abortType = data.type === 'offer' ? 'createAnswer' : 'createOffer';

    // if the source is unknown or not a match, then abort
    if ((! src) || (src.id !== targetId)) {
      return debug('received sdp but dropping due to unmatched src');
    }

    // prioritize setting the remote description operation
    q.push({ op: function(task, cb) {
      if (isClosed()) {
        return cb(new Error('pc closed: cannot set remote description'));
      }

      // update the remote description
      // once successful, send the answer
      debug('setting remote description');
      pc.setRemoteDescription(
        createSessionDescription(data),
        function() {
          // create the answer
          if (data.type === 'offer') {
            queue(createAnswer)();
          }

          // trigger the callback
          cb();
        },

        abort(abortType, data.sdp, cb)
      );
    }});
  }

  function isClosed() {
    return CLOSED_STATES.indexOf(pc.iceConnectionState) >= 0;
  }

  function queue(negotiateTask) {
    return function() {
      q.push([
        { op: negotiateTask }
      ]);
    };
  }

  function queueLocalDesc(desc) {
    return function setLocalDesc(task, cb) {
      if (isClosed()) {
        return cb(new Error('connection closed, aborting'));
      }

      // initialise the local description
      debug('setting local description');
      pc.setLocalDescription(
        desc,

        // if successful, then send the sdp over the wire
        function() {
          // send the sdp
          signaller.to(targetId).send('/sdp', desc);

          // callback
          cb();
        },

        // abort('setLocalDesc', desc.sdp, cb)
        // on error, abort
        function(err) {
          debug('error setting local description', err);
          debug(desc.sdp);
          // setTimeout(function() {
          //   setLocalDesc(task, cb, (retryCount || 0) + 1);
          // }, 500);

          cb(err);
        }
      );
    };
  }

  function resetDisconnectTimer() {
    mon.removeListener('change', handleDisconnectAbort);

    // clear the disconnect timer
    debug('reset disconnect timer, state: ' + pc.iceConnectionState);
    clearTimeout(disconnectTimer);
  }

  // when regotiation is needed look for the peer
  if (reactive) {
    pc.onnegotiationneeded = function() {
      debug('renegotiation required, will create offer in 50ms');
      clearTimeout(offerTimeout);
      offerTimeout = setTimeout(queue(createOffer), 50);
    };
  }

  pc.onicecandidate = handleLocalCandidate;

  // when we receive sdp, then
  signaller.on('sdp', handleSdp);
  signaller.on('candidate', handleRemoteCandidate);

  // if this is a master connection, listen for negotiate events
  if (isMaster) {
    signaller.on('negotiate', handleNegotiateRequest);
  }

  // when the connection closes, remove event handlers
  mon.once('closed', handleConnectionClose);
  mon.once('disconnected', handleDisconnect);

  // patch in the create offer functions
  mon.createOffer = queue(createOffer);

  return mon;
}

module.exports = couple;

},{"./cleanup":32,"./detect":34,"./monitor":37,"async":38,"cog/logger":7,"rtc-core/plugin":21}],34:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ### rtc-tools/detect

  Provide the [rtc-core/detect](https://github.com/rtc-io/rtc-core#detect)
  functionality.
**/
module.exports = require('rtc-core/detect');

},{"rtc-core/detect":19}],35:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('generators');
var detect = require('./detect');
var defaults = require('cog/defaults');

var mappings = {
  create: {
    dtls: function(c) {
      if (! detect.moz) {
        c.optional = (c.optional || []).concat({ DtlsSrtpKeyAgreement: true });
      }
    }
  }
};

/**
  ### rtc-tools/generators

  The generators package provides some utility methods for generating
  constraint objects and similar constructs.

  ```js
  var generators = require('rtc/generators');
  ```

**/

/**
  #### generators.config(config)

  Generate a configuration object suitable for passing into an W3C
  RTCPeerConnection constructor first argument, based on our custom config.
**/
exports.config = function(config) {
  return defaults(config, {
    iceServers: []
  });
};

/**
  #### generators.connectionConstraints(flags, constraints)

  This is a helper function that will generate appropriate connection
  constraints for a new `RTCPeerConnection` object which is constructed
  in the following way:

  ```js
  var conn = new RTCPeerConnection(flags, constraints);
  ```

  In most cases the constraints object can be left empty, but when creating
  data channels some additional options are required.  This function
  can generate those additional options and intelligently combine any
  user defined constraints (in `constraints`) with shorthand flags that
  might be passed while using the `rtc.createConnection` helper.
**/
exports.connectionConstraints = function(flags, constraints) {
  var generated = {};
  var m = mappings.create;
  var out;

  // iterate through the flags and apply the create mappings
  Object.keys(flags || {}).forEach(function(key) {
    if (m[key]) {
      m[key](generated);
    }
  });

  // generate the connection constraints
  out = defaults({}, constraints, generated);
  debug('generated connection constraints: ', out);

  return out;
};

},{"./detect":34,"cog/defaults":3,"cog/logger":7}],36:[function(require,module,exports){
/* jshint node: true */

'use strict';

/**
  # rtc-tools

  The `rtc-tools` module does most of the heavy lifting within the
  [rtc.io](http://rtc.io) suite.  Primarily it handles the logic of coupling
  a local `RTCPeerConnection` with it's remote counterpart via an
  [rtc-signaller](https://github.com/rtc-io/rtc-signaller) signalling
  channel.

  ## Getting Started

  If you decide that the `rtc-tools` module is a better fit for you than either
  [rtc-quickconnect](https://github.com/rtc-io/rtc-quickconnect) or
  [rtc-glue](https://github.com/rtc-io/rtc-glue) then the code snippet below
  will provide you a guide on how to get started using it in conjunction with
  the [rtc-signaller](https://github.com/rtc-io/rtc-signaller) and
  [rtc-media](https://github.com/rtc-io/rtc-media) modules:

  <<< examples/getting-started.js

  This code definitely doesn't cover all the cases that you need to consider
  (i.e. peers leaving, etc) but it should demonstrate how to:

  1. Capture video and add it to a peer connection
  2. Couple a local peer connection with a remote peer connection
  3. Deal with the remote steam being discovered and how to render
     that to the local interface.

  ## Reference

**/

var gen = require('./generators');

// export detect
var detect = exports.detect = require('./detect');
var findPlugin = require('rtc-core/plugin');

// export cog logger for convenience
exports.logger = require('cog/logger');

// export peer connection
var RTCPeerConnection =
exports.RTCPeerConnection = detect('RTCPeerConnection');

// add the couple utility
exports.couple = require('./couple');

/**
  ### createConnection

  ```
  createConnection(opts?, constraints?) => RTCPeerConnection
  ```

  Create a new `RTCPeerConnection` auto generating default opts as required.

  ```js
  var conn;

  // this is ok
  conn = rtc.createConnection();

  // and so is this
  conn = rtc.createConnection({
    iceServers: []
  });
  ```
**/
exports.createConnection = function(opts, constraints) {
  var plugin = findPlugin((opts || {}).plugins);
  var normalize = (plugin ? plugin.normalizeIce : null) || require('normalice');

  // generate the config based on options provided
  var config = gen.config(opts);

  // generate appropriate connection constraints
  var constraints = gen.connectionConstraints(opts, constraints);

  // ensure we have valid iceServers
  config.iceServers = (config.iceServers || []).map(normalize);

  if (plugin && typeof plugin.createConnection == 'function') {
    return plugin.createConnection(config, constraints);
  }
  else {
    return new ((opts || {}).RTCPeerConnection || RTCPeerConnection)(
      config, constraints
    );
  }
};

},{"./couple":33,"./detect":34,"./generators":35,"cog/logger":7,"normalice":40,"rtc-core/plugin":21}],37:[function(require,module,exports){
/* jshint node: true */
'use strict';

var EventEmitter = require('eventemitter3');

// define some state mappings to simplify the events we generate
var stateMappings = {
  completed: 'connected'
};

// define the events that we need to watch for peer connection
// state changes
var peerStateEvents = [
  'signalingstatechange',
  'iceconnectionstatechange',
];

/**
  ### rtc-tools/monitor

  ```
  monitor(pc, targetId, signaller, opts?) => EventEmitter
  ```

  The monitor is a useful tool for determining the state of `pc` (an
  `RTCPeerConnection`) instance in the context of your application. The
  monitor uses both the `iceConnectionState` information of the peer
  connection and also the various
  [signaller events](https://github.com/rtc-io/rtc-signaller#signaller-events)
  to determine when the connection has been `connected` and when it has
  been `disconnected`.

  A monitor created `EventEmitter` is returned as the result of a
  [couple](https://github.com/rtc-io/rtc#rtccouple) between a local peer
  connection and it's remote counterpart.

**/
module.exports = function(pc, targetId, signaller, opts) {
  var debugLabel = (opts || {}).debugLabel || 'rtc';
  var debug = require('cog/logger')(debugLabel + '/monitor');
  var monitor = new EventEmitter();
  var state;

  function checkState() {
    var newState = getMappedState(pc.iceConnectionState);
    debug('state changed: ' + pc.iceConnectionState + ', mapped: ' + newState);

    // flag the we had a state change
    monitor.emit('change', pc);

    // if the active state has changed, then send the appopriate message
    if (state !== newState) {
      monitor.emit(newState);
      state = newState;
    }
  }

  function handlePeerLeave(peerId) {
    debug('captured peer leave for peer: ' + peerId);

    // if the peer leaving is not the peer we are connected to
    // then we aren't interested
    if (peerId !== targetId) {
      return;
    }

    // trigger a closed event
    monitor.emit('closed');
  }

  pc.onclose = monitor.emit.bind(monitor, 'closed');
  peerStateEvents.forEach(function(evtName) {
    pc['on' + evtName] = checkState;
  });

  monitor.stop = function() {
    pc.onclose = null;
    peerStateEvents.forEach(function(evtName) {
      pc['on' + evtName] = null;
    });

    // remove the peer:leave listener
    if (signaller && typeof signaller.removeListener == 'function') {
      signaller.removeListener('peer:leave', handlePeerLeave);
    }
  };

  monitor.checkState = checkState;

  // if we haven't been provided a valid peer connection, abort
  if (! pc) {
    return monitor;
  }

  // determine the initial is active state
  state = getMappedState(pc.iceConnectionState);

  // if we've been provided a signaller, then watch for peer:leave events
  if (signaller && typeof signaller.on == 'function') {
    signaller.on('peer:leave', handlePeerLeave);
  }

  // if we are active, trigger the connected state
  // setTimeout(monitor.emit.bind(monitor, state), 0);

  return monitor;
};

/* internal helpers */

function getMappedState(state) {
  return stateMappings[state] || state;
}

},{"cog/logger":7,"eventemitter3":39}],38:[function(require,module,exports){
(function (process){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };
    
    async.priorityQueue = function (worker, concurrency) {
        
        function _compareTasks(a, b){
          return a.priority - b.priority;
        };
        
        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }
        
        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };
              
              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }
        
        // Start with a normal queue
        var q = async.queue(worker, concurrency);
        
        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };
        
        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require("FWaASH"))
},{"FWaASH":2}],39:[function(require,module,exports){
module.exports=require(10)
},{}],40:[function(require,module,exports){
/**
  # normalice

  Normalize an ice server configuration object (or plain old string) into a format
  that is usable in all browsers supporting WebRTC.  Primarily this module is designed
  to help with the transition of the `url` attribute of the configuration object to
  the `urls` attribute.

  ## Example Usage

  <<< examples/simple.js

**/

var protocols = [
  'stun:',
  'turn:'
];

module.exports = function(input) {
  var url = (input || {}).url || input;
  var protocol;
  var parts;
  var output = {};

  // if we don't have a string url, then allow the input to passthrough
  if (typeof url != 'string' && (! (url instanceof String))) {
    return input;
  }

  // trim the url string, and convert to an array
  url = url.trim();

  // if the protocol is not known, then passthrough
  protocol = protocols[protocols.indexOf(url.slice(0, 5))];
  if (! protocol) {
    return input;
  }

  // now let's attack the remaining url parts
  url = url.slice(5);
  parts = url.split('@');

  // if we have an authentication part, then set the credentials
  if (parts.length > 1) {
    url = parts[1];
    parts = parts[0].split(':');

    // add the output credential and username
    output.username = parts[0];
    output.credential = (input || {}).credential || parts[1] || '';
  }

  output.url = protocol + url;
  output.urls = [ output.url ];

  return output;
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9jb2cvZGVmYXVsdHMuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL2NvZy9leHRlbmQuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL2NvZy9nZXRhYmxlLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9jb2cvanNvbnBhcnNlLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9jb2cvbG9nZ2VyLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9jb2cvdGhyb3R0bGUuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL2NyZWwvY3JlbC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMy9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLWNhcHR1cmVjb25maWcvaW5kZXguanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLW1lZGlhL25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtbWVkaWEvbm9kZV9tb2R1bGVzL3J0Yy1jb3JlL2RldGVjdC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLW1lZGlhL25vZGVfbW9kdWxlcy9ydGMtY29yZS9ub2RlX21vZHVsZXMvZGV0ZWN0LWJyb3dzZXIvYnJvd3Nlci5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLW1lZGlhL25vZGVfbW9kdWxlcy9ydGMtY29yZS9wbHVnaW4uanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3QvaW5kZXguanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvYnJvd3Nlci5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9kZWZhdWx0cy5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9oYW5kbGVycy9hbm5vdW5jZS5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9oYW5kbGVycy9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9oYW5kbGVycy9sZWF2ZS5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9wcmltdXMtbG9hZGVyLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL3Byb2Nlc3Nvci5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci91dWlkLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtdG9vbHMvY2xlYW51cC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXRvb2xzL2NvdXBsZS5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXRvb2xzL2RldGVjdC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXRvb2xzL2dlbmVyYXRvcnMuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy10b29scy9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXRvb2xzL21vbml0b3IuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvYXN5bmMvbGliL2FzeW5jLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtdG9vbHMvbm9kZV9tb2R1bGVzL25vcm1hbGljZS9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcmxCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDL21CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcmdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JtQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjMnKTtcbnZhciBjcmVsID0gcmVxdWlyZSgnY3JlbCcpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnY29nL2RlZmF1bHRzJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xudmFyIHF1aWNrY29ubmVjdCA9IHJlcXVpcmUoJ3J0Yy1xdWlja2Nvbm5lY3QnKTtcbnZhciBjYXB0dXJlY29uZmlnID0gcmVxdWlyZSgncnRjLWNhcHR1cmVjb25maWcnKTtcbnZhciBtZWRpYSA9IHJlcXVpcmUoJ3J0Yy1tZWRpYScpO1xudmFyIERFRkFVTFRfQ09OU1RSQUlOVFMgPSB7IHZpZGVvOiB0cnVlLCBhdWRpbzogdHJ1ZSB9O1xuXG4vKipcbiAgIyBydGNcblxuICBUaGlzIGlzIGEgcGFja2FnZSB0aGF0IHdpbGwgcHJvdmlkZSB5b3UgYSBcIm9uZS1zdG9wIHNob3BcIiBmb3IgYnVpbGRpbmdcbiAgV2ViUlRDIGFwcGxpY2F0aW9ucy4gIEl0IGFnZ3JlZ2F0ZXMgdG9nZXRoZXIgYSB2YXJpZXR5IG9mIHBhY2thZ2VzIChwcmltYXJpbHlcbiAgZnJvbSB0aGUgW3J0Yy5pb10oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pbykgc3VpdGUpIHRvIGRlbGl2ZXIgYSBzaW5nbGVcbiAgcGFja2FnZSBmb3IgYnVpbGRpbmcgYSBXZWJSVEMgYXBwbGljYXRpb24uXG5cbiAgIyMgR2V0dGluZyBTdGFydGVkXG5cbiAgPDw8IGRvY3MvZ2V0dGluZy1zdGFydGVkLm1kXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBkb2NzL2V4YW1wbGVzLm1kXG5cbioqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgdmFyIHJ0YyA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgdmFyIGNvbnN0cmFpbnRzID0gW10uY29uY2F0KChvcHRzIHx8IHt9KS5jYXB0dXJlIHx8IFsgREVGQVVMVF9DT05TVFJBSU5UUyBdKTtcbiAgdmFyIHBsdWdpbnMgPSAob3B0cyB8fCB7fSkucGx1Z2lucyB8fCBbXTtcbiAgdmFyIHNpZ25hbGhvc3QgPSAob3B0cyB8fCB7fSkuc2lnbmFsbGVyIHx8ICcvL3N3aXRjaGJvYXJkLnJ0Yy5pbyc7XG4gIHZhciBsb2NhbFN0cmVhbXMgPSBbXTtcbiAgdmFyIGxvY2FsVmlkZW87XG4gIHZhciByZW1vdGVWaWRlbztcblxuICAvLyBjYXB0dXJlIG1lZGlhXG4gIHZhciBjYXB0dXJlVGFyZ2V0cyA9IGNvbnN0cmFpbnRzLm1hcChwYXJzZUNvbnN0cmFpbnRzKS5tYXAoZnVuY3Rpb24oY29uc3RyYWludHMpIHtcbiAgICByZXR1cm4gbWVkaWEoeyBjb25zdHJhaW50czogY29uc3RyYWludHMsIHBsdWdpbnM6IHBsdWdpbnMgfSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGFubm91bmNlKCkge1xuICAgIC8vIGNyZWF0ZSB0aGUgc2lnbmFsbGVyXG4gICAgdmFyIHNpZ25hbGxlciA9IHJ0Yy5zaWduYWxsZXIgPSBxdWlja2Nvbm5lY3Qoc2lnbmFsaG9zdCwgb3B0cyk7XG5cbiAgICBzaWduYWxsZXJcbiAgICAgIC5vbignY2FsbDpzdGFydGVkJywgaGFuZGxlQ2FsbFN0YXJ0KVxuICAgICAgLm9uKCdjYWxsOmVuZGVkJywgaGFuZGxlQ2FsbEVuZCk7XG5cbiAgICAvLyBhZGQgdGhlIGxvY2FsIHN0cmVhbXNcbiAgICBsb2NhbFN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHNpZ25hbGxlci5hZGRTdHJlYW0oc3RyZWFtKTtcbiAgICB9KTtcblxuICAgIC8vIGVtaXQgYSByZWFkeSBldmVudCBmb3IgdGhlIHJ0Y1xuICAgIHJ0Yy5lbWl0KCdyZWFkeScsIHNpZ25hbGxlcik7XG4gIH1cblxuICBmdW5jdGlvbiBnb3RMb2NhbFN0cmVhbShzdHJlYW0pIHtcbiAgICBtZWRpYSh7IHN0cmVhbTogc3RyZWFtLCBwbHVnaW5zOiBwbHVnaW5zLCBtdXRlZDogdHJ1ZSB9KS5yZW5kZXIobG9jYWxWaWRlbyk7XG5cbiAgICBsb2NhbFN0cmVhbXMucHVzaChzdHJlYW0pO1xuICAgIGlmIChsb2NhbFN0cmVhbXMubGVuZ3RoID49IGNhcHR1cmVUYXJnZXRzLmxlbmd0aCkge1xuICAgICAgYW5ub3VuY2UoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVDYWxsU3RhcnQoaWQsIHBjLCBkYXRhKSB7XG4gICAgLy8gY3JlYXRlIHRoZSBjb250YWluZXIgZm9yIHRoaXMgcGVlcnMgc3RyZWFtc1xuICAgIHZhciBjb250YWluZXIgPSBjcmVsKCdkaXYnLCB7XG4gICAgICBjbGFzczogJ3J0Yy1wZWVyJyxcbiAgICAgICdkYXRhLXBlZXJpZCc6IGlkXG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnY2FsbCBzdGFydGVkIHdpdGggcGVlcjogJyArIGlkKTtcbiAgICBwYy5nZXRSZW1vdGVTdHJlYW1zKCkuZm9yRWFjaChmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIG1lZGlhKHsgc3RyZWFtOiBzdHJlYW0sIHBsdWdpbnM6IHBsdWdpbnMgfSkucmVuZGVyKGNvbnRhaW5lcik7XG4gICAgfSk7XG5cbiAgICByZW1vdGVWaWRlby5hcHBlbmRDaGlsZChjb250YWluZXIpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlQ2FsbEVuZChpZCwgcGMsIGRhdGEpIHtcbiAgICB2YXIgZWwgPSByZW1vdGVWaWRlby5xdWVyeVNlbGVjdG9yKCdkaXZbZGF0YS1wZWVyaWQ9XCInICsgaWQgKyAnXCJdJyk7XG5cbiAgICBpZiAoZWwpIHtcbiAgICAgIGVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWwpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlQ29uc3RyYWludHMoaW5wdXQpIHtcbiAgICBpZiAodHlwZW9mIGlucHV0ID09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gY2FwdHVyZWNvbmZpZyhpbnB1dCkudG9Db25zdHJhaW50cygpO1xuICAgIH1cblxuICAgIHJldHVybiBpbnB1dDtcbiAgfVxuXG4gIC8vIG9uY2Ugd2UndmUgY2FwdHVyZWQgYWxsIHRoZSBzdHJlYW1zIHN0YXJ0IHRoZSBjYWxsXG4gIGNhcHR1cmVUYXJnZXRzLmZvckVhY2goZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgdGFyZ2V0Lm9uY2UoJ2NhcHR1cmUnLCBnb3RMb2NhbFN0cmVhbSk7XG4gIH0pO1xuXG4gIC8vIGNyZWF0ZSB0aGUgbG9jYWwgY29udGFpbmVyXG4gIGxvY2FsVmlkZW8gPSBydGMubG9jYWwgPSBjcmVsKCdkaXYnLCB7XG4gICAgY2xhc3M6ICdydGMtbWVkaWEgcnRjLWxvY2FsdmlkZW8nXG4gIH0pO1xuXG4gIC8vIGNyZWF0ZSB0aGUgcmVtb3RlIGNvbnRhaW5lclxuICByZW1vdGVWaWRlbyA9IHJ0Yy5yZW1vdGUgPSBjcmVsKCdkaXYnLCB7XG4gICAgY2xhc3M6ICdydGMtbWVkaWEgcnRjLXJlbW90ZXZpZGVvJ1xuICB9KTtcblxuICByZXR1cm4gcnRjO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiMjIGNvZy9kZWZhdWx0c1xuXG5gYGBqc1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnY29nL2RlZmF1bHRzJyk7XG5gYGBcblxuIyMjIGRlZmF1bHRzKHRhcmdldCwgKilcblxuU2hhbGxvdyBjb3B5IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGhlIHN1cHBsaWVkIHNvdXJjZSBvYmplY3RzICgqKSBpbnRvXG50aGUgdGFyZ2V0IG9iamVjdCwgcmV0dXJuaW5nIHRoZSB0YXJnZXQgb2JqZWN0IG9uY2UgY29tcGxldGVkLiAgRG8gbm90LFxuaG93ZXZlciwgb3ZlcndyaXRlIGV4aXN0aW5nIGtleXMgd2l0aCBuZXcgdmFsdWVzOlxuXG5gYGBqc1xuZGVmYXVsdHMoeyBhOiAxLCBiOiAyIH0sIHsgYzogMyB9LCB7IGQ6IDQgfSwgeyBiOiA1IH0pKTtcbmBgYFxuXG5TZWUgYW4gZXhhbXBsZSBvbiBbcmVxdWlyZWJpbl0oaHR0cDovL3JlcXVpcmViaW4uY29tLz9naXN0PTYwNzk0NzUpLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICAvLyBlbnN1cmUgd2UgaGF2ZSBhIHRhcmdldFxuICB0YXJnZXQgPSB0YXJnZXQgfHwge307XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBzb3VyY2VzIGFuZCBjb3B5IHRvIHRoZSB0YXJnZXRcbiAgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLmZvckVhY2goZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKCEgc291cmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgIGlmICh0YXJnZXRbcHJvcF0gPT09IHZvaWQgMCkge1xuICAgICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gdGFyZ2V0O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiMjIGNvZy9leHRlbmRcblxuYGBganNcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5gYGBcblxuIyMjIGV4dGVuZCh0YXJnZXQsICopXG5cblNoYWxsb3cgY29weSBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRoZSBzdXBwbGllZCBzb3VyY2Ugb2JqZWN0cyAoKikgaW50b1xudGhlIHRhcmdldCBvYmplY3QsIHJldHVybmluZyB0aGUgdGFyZ2V0IG9iamVjdCBvbmNlIGNvbXBsZXRlZDpcblxuYGBganNcbmV4dGVuZCh7IGE6IDEsIGI6IDIgfSwgeyBjOiAzIH0sIHsgZDogNCB9LCB7IGI6IDUgfSkpO1xuYGBgXG5cblNlZSBhbiBleGFtcGxlIG9uIFtyZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA3OTQ3NSkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKS5mb3JFYWNoKGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIGlmICghIHNvdXJjZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gdGFyZ2V0O1xufTsiLCIvKipcbiAgIyMgY29nL2dldGFibGVcblxuICBUYWtlIGFuIG9iamVjdCBhbmQgcHJvdmlkZSBhIHdyYXBwZXIgdGhhdCBhbGxvd3MgeW91IHRvIGBnZXRgIGFuZFxuICBgc2V0YCB2YWx1ZXMgb24gdGhhdCBvYmplY3QuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgZnVuY3Rpb24gZ2V0KGtleSkge1xuICAgIHJldHVybiB0YXJnZXRba2V5XTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldChrZXksIHZhbHVlKSB7XG4gICAgdGFyZ2V0W2tleV0gPSB2YWx1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShrZXkpIHtcbiAgICByZXR1cm4gZGVsZXRlIHRhcmdldFtrZXldO1xuICB9XG5cbiAgZnVuY3Rpb24ga2V5cygpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGFyZ2V0KTtcbiAgfTtcblxuICBmdW5jdGlvbiB2YWx1ZXMoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRhcmdldCkubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIHRhcmdldFtrZXldO1xuICAgIH0pO1xuICB9O1xuXG4gIGlmICh0eXBlb2YgdGFyZ2V0ICE9ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZ2V0OiBnZXQsXG4gICAgc2V0OiBzZXQsXG4gICAgcmVtb3ZlOiByZW1vdmUsXG4gICAgZGVsZXRlOiByZW1vdmUsXG4gICAga2V5czoga2V5cyxcbiAgICB2YWx1ZXM6IHZhbHVlc1xuICB9O1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyBjb2cvanNvbnBhcnNlXG5cbiAgYGBganNcbiAgdmFyIGpzb25wYXJzZSA9IHJlcXVpcmUoJ2NvZy9qc29ucGFyc2UnKTtcbiAgYGBgXG5cbiAgIyMjIGpzb25wYXJzZShpbnB1dClcblxuICBUaGlzIGZ1bmN0aW9uIHdpbGwgYXR0ZW1wdCB0byBhdXRvbWF0aWNhbGx5IGRldGVjdCBzdHJpbmdpZmllZCBKU09OLCBhbmRcbiAgd2hlbiBkZXRlY3RlZCB3aWxsIHBhcnNlIGludG8gSlNPTiBvYmplY3RzLiAgVGhlIGZ1bmN0aW9uIGxvb2tzIGZvciBzdHJpbmdzXG4gIHRoYXQgbG9vayBhbmQgc21lbGwgbGlrZSBzdHJpbmdpZmllZCBKU09OLCBhbmQgaWYgZm91bmQgYXR0ZW1wdHMgdG9cbiAgYEpTT04ucGFyc2VgIHRoZSBpbnB1dCBpbnRvIGEgdmFsaWQgb2JqZWN0LlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIGlzU3RyaW5nID0gdHlwZW9mIGlucHV0ID09ICdzdHJpbmcnIHx8IChpbnB1dCBpbnN0YW5jZW9mIFN0cmluZyk7XG4gIHZhciByZU51bWVyaWMgPSAvXlxcLT9cXGQrXFwuP1xcZCokLztcbiAgdmFyIHNob3VsZFBhcnNlIDtcbiAgdmFyIGZpcnN0Q2hhcjtcbiAgdmFyIGxhc3RDaGFyO1xuXG4gIGlmICgoISBpc1N0cmluZykgfHwgaW5wdXQubGVuZ3RoIDwgMikge1xuICAgIGlmIChpc1N0cmluZyAmJiByZU51bWVyaWMudGVzdChpbnB1dCkpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KGlucHV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gaW5wdXQ7XG4gIH1cblxuICAvLyBjaGVjayBmb3IgdHJ1ZSBvciBmYWxzZVxuICBpZiAoaW5wdXQgPT09ICd0cnVlJyB8fCBpbnB1dCA9PT0gJ2ZhbHNlJykge1xuICAgIHJldHVybiBpbnB1dCA9PT0gJ3RydWUnO1xuICB9XG5cbiAgLy8gY2hlY2sgZm9yIG51bGxcbiAgaWYgKGlucHV0ID09PSAnbnVsbCcpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIGdldCB0aGUgZmlyc3QgYW5kIGxhc3QgY2hhcmFjdGVyc1xuICBmaXJzdENoYXIgPSBpbnB1dC5jaGFyQXQoMCk7XG4gIGxhc3RDaGFyID0gaW5wdXQuY2hhckF0KGlucHV0Lmxlbmd0aCAtIDEpO1xuXG4gIC8vIGRldGVybWluZSB3aGV0aGVyIHdlIHNob3VsZCBKU09OLnBhcnNlIHRoZSBpbnB1dFxuICBzaG91bGRQYXJzZSA9XG4gICAgKGZpcnN0Q2hhciA9PSAneycgJiYgbGFzdENoYXIgPT0gJ30nKSB8fFxuICAgIChmaXJzdENoYXIgPT0gJ1snICYmIGxhc3RDaGFyID09ICddJykgfHxcbiAgICAoZmlyc3RDaGFyID09ICdcIicgJiYgbGFzdENoYXIgPT0gJ1wiJyk7XG5cbiAgaWYgKHNob3VsZFBhcnNlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGlucHV0KTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIC8vIGFwcGFyZW50bHkgaXQgd2Fzbid0IHZhbGlkIGpzb24sIGNhcnJ5IG9uIHdpdGggcmVndWxhciBwcm9jZXNzaW5nXG4gICAgfVxuICB9XG5cblxuICByZXR1cm4gcmVOdW1lcmljLnRlc3QoaW5wdXQpID8gcGFyc2VGbG9hdChpbnB1dCkgOiBpbnB1dDtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIGNvZy9sb2dnZXJcblxuICBgYGBqc1xuICB2YXIgbG9nZ2VyID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpO1xuICBgYGBcblxuICBTaW1wbGUgYnJvd3NlciBsb2dnaW5nIG9mZmVyaW5nIHNpbWlsYXIgZnVuY3Rpb25hbGl0eSB0byB0aGVcbiAgW2RlYnVnXShodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvZGVidWcpIG1vZHVsZS5cblxuICAjIyMgVXNhZ2VcblxuICBDcmVhdGUgeW91ciBzZWxmIGEgbmV3IGxvZ2dpbmcgaW5zdGFuY2UgYW5kIGdpdmUgaXQgYSBuYW1lOlxuXG4gIGBgYGpzXG4gIHZhciBkZWJ1ZyA9IGxvZ2dlcigncGhpbCcpO1xuICBgYGBcblxuICBOb3cgZG8gc29tZSBkZWJ1Z2dpbmc6XG5cbiAgYGBganNcbiAgZGVidWcoJ2hlbGxvJyk7XG4gIGBgYFxuXG4gIEF0IHRoaXMgc3RhZ2UsIG5vIGxvZyBvdXRwdXQgd2lsbCBiZSBnZW5lcmF0ZWQgYmVjYXVzZSB5b3VyIGxvZ2dlciBpc1xuICBjdXJyZW50bHkgZGlzYWJsZWQuICBFbmFibGUgaXQ6XG5cbiAgYGBganNcbiAgbG9nZ2VyLmVuYWJsZSgncGhpbCcpO1xuICBgYGBcblxuICBOb3cgZG8gc29tZSBtb3JlIGxvZ2dlcjpcblxuICBgYGBqc1xuICBkZWJ1ZygnT2ggdGhpcyBpcyBzbyBtdWNoIG5pY2VyIDopJyk7XG4gIC8vIC0tPiBwaGlsOiBPaCB0aGlzIGlzIHNvbWUgbXVjaCBuaWNlciA6KVxuICBgYGBcblxuICAjIyMgUmVmZXJlbmNlXG4qKi9cblxudmFyIGFjdGl2ZSA9IFtdO1xudmFyIHVubGVhc2hMaXN0ZW5lcnMgPSBbXTtcbnZhciB0YXJnZXRzID0gWyBjb25zb2xlIF07XG5cbi8qKlxuICAjIyMjIGxvZ2dlcihuYW1lKVxuXG4gIENyZWF0ZSBhIG5ldyBsb2dnaW5nIGluc3RhbmNlLlxuKiovXG52YXIgbG9nZ2VyID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuYW1lKSB7XG4gIC8vIGluaXRpYWwgZW5hYmxlZCBjaGVja1xuICB2YXIgZW5hYmxlZCA9IGNoZWNrQWN0aXZlKCk7XG5cbiAgZnVuY3Rpb24gY2hlY2tBY3RpdmUoKSB7XG4gICAgcmV0dXJuIGVuYWJsZWQgPSBhY3RpdmUuaW5kZXhPZignKicpID49IDAgfHwgYWN0aXZlLmluZGV4T2YobmFtZSkgPj0gMDtcbiAgfVxuXG4gIC8vIHJlZ2lzdGVyIHRoZSBjaGVjayBhY3RpdmUgd2l0aCB0aGUgbGlzdGVuZXJzIGFycmF5XG4gIHVubGVhc2hMaXN0ZW5lcnNbdW5sZWFzaExpc3RlbmVycy5sZW5ndGhdID0gY2hlY2tBY3RpdmU7XG5cbiAgLy8gcmV0dXJuIHRoZSBhY3R1YWwgbG9nZ2luZyBmdW5jdGlvblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgc3RyaW5nIG1lc3NhZ2VcbiAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT0gJ3N0cmluZycgfHwgKGFyZ3NbMF0gaW5zdGFuY2VvZiBTdHJpbmcpKSB7XG4gICAgICBhcmdzWzBdID0gbmFtZSArICc6ICcgKyBhcmdzWzBdO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdCBlbmFibGVkLCBiYWlsXG4gICAgaWYgKCEgZW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGxvZ1xuICAgIHRhcmdldHMuZm9yRWFjaChmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgIHRhcmdldC5sb2cuYXBwbHkodGFyZ2V0LCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbi8qKlxuICAjIyMjIGxvZ2dlci5yZXNldCgpXG5cbiAgUmVzZXQgbG9nZ2luZyAocmVtb3ZlIHRoZSBkZWZhdWx0IGNvbnNvbGUgbG9nZ2VyLCBmbGFnIGFsbCBsb2dnZXJzIGFzXG4gIGluYWN0aXZlLCBldGMsIGV0Yy5cbioqL1xubG9nZ2VyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIHJlc2V0IHRhcmdldHMgYW5kIGFjdGl2ZSBzdGF0ZXNcbiAgdGFyZ2V0cyA9IFtdO1xuICBhY3RpdmUgPSBbXTtcblxuICByZXR1cm4gbG9nZ2VyLmVuYWJsZSgpO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnRvKHRhcmdldClcblxuICBBZGQgYSBsb2dnaW5nIHRhcmdldC4gIFRoZSBsb2dnZXIgbXVzdCBoYXZlIGEgYGxvZ2AgbWV0aG9kIGF0dGFjaGVkLlxuXG4qKi9cbmxvZ2dlci50byA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICB0YXJnZXRzID0gdGFyZ2V0cy5jb25jYXQodGFyZ2V0IHx8IFtdKTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLmVuYWJsZShuYW1lcyopXG5cbiAgRW5hYmxlIGxvZ2dpbmcgdmlhIHRoZSBuYW1lZCBsb2dnaW5nIGluc3RhbmNlcy4gIFRvIGVuYWJsZSBsb2dnaW5nIHZpYSBhbGxcbiAgaW5zdGFuY2VzLCB5b3UgY2FuIHBhc3MgYSB3aWxkY2FyZDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCcqJyk7XG4gIGBgYFxuXG4gIF9fVE9ETzpfXyB3aWxkY2FyZCBlbmFibGVyc1xuKiovXG5sb2dnZXIuZW5hYmxlID0gZnVuY3Rpb24oKSB7XG4gIC8vIHVwZGF0ZSB0aGUgYWN0aXZlXG4gIGFjdGl2ZSA9IGFjdGl2ZS5jb25jYXQoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblxuICAvLyB0cmlnZ2VyIHRoZSB1bmxlYXNoIGxpc3RlbmVyc1xuICB1bmxlYXNoTGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICBsaXN0ZW5lcigpO1xuICB9KTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgY29nL3Rocm90dGxlXG5cbiAgYGBganNcbiAgdmFyIHRocm90dGxlID0gcmVxdWlyZSgnY29nL3Rocm90dGxlJyk7XG4gIGBgYFxuXG4gICMjIyB0aHJvdHRsZShmbiwgZGVsYXksIG9wdHMpXG5cbiAgQSBjaGVycnktcGlja2FibGUgdGhyb3R0bGUgZnVuY3Rpb24uICBVc2VkIHRvIHRocm90dGxlIGBmbmAgdG8gZW5zdXJlXG4gIHRoYXQgaXQgY2FuIGJlIGNhbGxlZCBhdCBtb3N0IG9uY2UgZXZlcnkgYGRlbGF5YCBtaWxsaXNlY29uZHMuICBXaWxsXG4gIGZpcmUgZmlyc3QgZXZlbnQgaW1tZWRpYXRlbHksIGVuc3VyaW5nIHRoZSBuZXh0IGV2ZW50IGZpcmVkIHdpbGwgb2NjdXJcbiAgYXQgbGVhc3QgYGRlbGF5YCBtaWxsaXNlY29uZHMgYWZ0ZXIgdGhlIGZpcnN0LCBhbmQgc28gb24uXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihmbiwgZGVsYXksIG9wdHMpIHtcbiAgdmFyIGxhc3RFeGVjID0gKG9wdHMgfHwge30pLmxlYWRpbmcgIT09IGZhbHNlID8gMCA6IERhdGUubm93KCk7XG4gIHZhciB0cmFpbGluZyA9IChvcHRzIHx8IHt9KS50cmFpbGluZztcbiAgdmFyIHRpbWVyO1xuICB2YXIgcXVldWVkQXJncztcbiAgdmFyIHF1ZXVlZFNjb3BlO1xuXG4gIC8vIHRyYWlsaW5nIGRlZmF1bHRzIHRvIHRydWVcbiAgdHJhaWxpbmcgPSB0cmFpbGluZyB8fCB0cmFpbGluZyA9PT0gdW5kZWZpbmVkO1xuICBcbiAgZnVuY3Rpb24gaW52b2tlRGVmZXJlZCgpIHtcbiAgICBmbi5hcHBseShxdWV1ZWRTY29wZSwgcXVldWVkQXJncyB8fCBbXSk7XG4gICAgbGFzdEV4ZWMgPSBEYXRlLm5vdygpO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aWNrID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgZWxhcHNlZCA9IHRpY2sgLSBsYXN0RXhlYztcblxuICAgIC8vIGFsd2F5cyBjbGVhciB0aGUgZGVmZXJlZCB0aW1lclxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG5cbiAgICBpZiAoZWxhcHNlZCA8IGRlbGF5KSB7XG4gICAgICBxdWV1ZWRBcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgcXVldWVkU2NvcGUgPSB0aGlzO1xuXG4gICAgICByZXR1cm4gdHJhaWxpbmcgJiYgKHRpbWVyID0gc2V0VGltZW91dChpbnZva2VEZWZlcmVkLCBkZWxheSAtIGVsYXBzZWQpKTtcbiAgICB9XG5cbiAgICAvLyBjYWxsIHRoZSBmdW5jdGlvblxuICAgIGxhc3RFeGVjID0gdGljaztcbiAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xufTsiLCIvL0NvcHlyaWdodCAoQykgMjAxMiBLb3J5IE51bm5cclxuXHJcbi8vUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcclxuXHJcbi8vVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXHJcblxyXG4vL1RIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxyXG5cclxuLypcclxuXHJcbiAgICBUaGlzIGNvZGUgaXMgbm90IGZvcm1hdHRlZCBmb3IgcmVhZGFiaWxpdHksIGJ1dCByYXRoZXIgcnVuLXNwZWVkIGFuZCB0byBhc3Npc3QgY29tcGlsZXJzLlxyXG5cclxuICAgIEhvd2V2ZXIsIHRoZSBjb2RlJ3MgaW50ZW50aW9uIHNob3VsZCBiZSB0cmFuc3BhcmVudC5cclxuXHJcbiAgICAqKiogSUUgU1VQUE9SVCAqKipcclxuXHJcbiAgICBJZiB5b3UgcmVxdWlyZSB0aGlzIGxpYnJhcnkgdG8gd29yayBpbiBJRTcsIGFkZCB0aGUgZm9sbG93aW5nIGFmdGVyIGRlY2xhcmluZyBjcmVsLlxyXG5cclxuICAgIHZhciB0ZXN0RGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXHJcbiAgICAgICAgdGVzdExhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcclxuXHJcbiAgICB0ZXN0RGl2LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnYScpO1xyXG4gICAgdGVzdERpdlsnY2xhc3NOYW1lJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnY2xhc3MnXSA9ICdjbGFzc05hbWUnOnVuZGVmaW5lZDtcclxuICAgIHRlc3REaXYuc2V0QXR0cmlidXRlKCduYW1lJywnYScpO1xyXG4gICAgdGVzdERpdlsnbmFtZSddICE9PSAnYScgPyBjcmVsLmF0dHJNYXBbJ25hbWUnXSA9IGZ1bmN0aW9uKGVsZW1lbnQsIHZhbHVlKXtcclxuICAgICAgICBlbGVtZW50LmlkID0gdmFsdWU7XHJcbiAgICB9OnVuZGVmaW5lZDtcclxuXHJcblxyXG4gICAgdGVzdExhYmVsLnNldEF0dHJpYnV0ZSgnZm9yJywgJ2EnKTtcclxuICAgIHRlc3RMYWJlbFsnaHRtbEZvciddICE9PSAnYScgPyBjcmVsLmF0dHJNYXBbJ2ZvciddID0gJ2h0bWxGb3InOnVuZGVmaW5lZDtcclxuXHJcblxyXG5cclxuKi9cclxuXHJcbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xyXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoZmFjdG9yeSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJvb3QuY3JlbCA9IGZhY3RvcnkoKTtcclxuICAgIH1cclxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyBiYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM4NDI4Ni9qYXZhc2NyaXB0LWlzZG9tLWhvdy1kby15b3UtY2hlY2staWYtYS1qYXZhc2NyaXB0LW9iamVjdC1pcy1hLWRvbS1vYmplY3RcclxuICAgIHZhciBpc05vZGUgPSB0eXBlb2YgTm9kZSA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgICAgID8gZnVuY3Rpb24gKG9iamVjdCkgeyByZXR1cm4gb2JqZWN0IGluc3RhbmNlb2YgTm9kZTsgfVxyXG4gICAgICAgIDogZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0XHJcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0J1xyXG4gICAgICAgICAgICAgICAgJiYgdHlwZW9mIG9iamVjdC5ub2RlVHlwZSA9PT0gJ251bWJlcidcclxuICAgICAgICAgICAgICAgICYmIHR5cGVvZiBvYmplY3Qubm9kZU5hbWUgPT09ICdzdHJpbmcnO1xyXG4gICAgICAgIH07XHJcbiAgICB2YXIgaXNBcnJheSA9IGZ1bmN0aW9uKGEpeyByZXR1cm4gYSBpbnN0YW5jZW9mIEFycmF5OyB9O1xyXG4gICAgdmFyIGFwcGVuZENoaWxkID0gZnVuY3Rpb24oZWxlbWVudCwgY2hpbGQpIHtcclxuICAgICAgaWYoIWlzTm9kZShjaGlsZCkpe1xyXG4gICAgICAgICAgY2hpbGQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjaGlsZCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZCk7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBjcmVsKCl7XHJcbiAgICAgICAgdmFyIGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50LFxyXG4gICAgICAgICAgICBhcmdzID0gYXJndW1lbnRzLCAvL05vdGU6IGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgdG8gYXNzaXN0IGNvbXBpbGVycy4gU2F2ZXMgYWJvdXQgNDAgYnl0ZXMgaW4gY2xvc3VyZSBjb21waWxlci4gSGFzIG5lZ2xpZ2FibGUgZWZmZWN0IG9uIHBlcmZvcm1hbmNlLlxyXG4gICAgICAgICAgICBlbGVtZW50ID0gYXJnc1swXSxcclxuICAgICAgICAgICAgY2hpbGQsXHJcbiAgICAgICAgICAgIHNldHRpbmdzID0gYXJnc1sxXSxcclxuICAgICAgICAgICAgY2hpbGRJbmRleCA9IDIsXHJcbiAgICAgICAgICAgIGFyZ3VtZW50c0xlbmd0aCA9IGFyZ3MubGVuZ3RoLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVNYXAgPSBjcmVsLmF0dHJNYXA7XHJcblxyXG4gICAgICAgIGVsZW1lbnQgPSBpc05vZGUoZWxlbWVudCkgPyBlbGVtZW50IDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbGVtZW50KTtcclxuICAgICAgICAvLyBzaG9ydGN1dFxyXG4gICAgICAgIGlmKGFyZ3VtZW50c0xlbmd0aCA9PT0gMSl7XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYodHlwZW9mIHNldHRpbmdzICE9PSAnb2JqZWN0JyB8fCBpc05vZGUoc2V0dGluZ3MpIHx8IGlzQXJyYXkoc2V0dGluZ3MpKSB7XHJcbiAgICAgICAgICAgIC0tY2hpbGRJbmRleDtcclxuICAgICAgICAgICAgc2V0dGluZ3MgPSBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc2hvcnRjdXQgaWYgdGhlcmUgaXMgb25seSBvbmUgY2hpbGQgdGhhdCBpcyBhIHN0cmluZ1xyXG4gICAgICAgIGlmKChhcmd1bWVudHNMZW5ndGggLSBjaGlsZEluZGV4KSA9PT0gMSAmJiB0eXBlb2YgYXJnc1tjaGlsZEluZGV4XSA9PT0gJ3N0cmluZycgJiYgZWxlbWVudC50ZXh0Q29udGVudCAhPT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgZWxlbWVudC50ZXh0Q29udGVudCA9IGFyZ3NbY2hpbGRJbmRleF07XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGZvcig7IGNoaWxkSW5kZXggPCBhcmd1bWVudHNMZW5ndGg7ICsrY2hpbGRJbmRleCl7XHJcbiAgICAgICAgICAgICAgICBjaGlsZCA9IGFyZ3NbY2hpbGRJbmRleF07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoY2hpbGQgPT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoY2hpbGQpKSB7XHJcbiAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGNoaWxkLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXBwZW5kQ2hpbGQoZWxlbWVudCwgY2hpbGRbaV0pO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICBhcHBlbmRDaGlsZChlbGVtZW50LCBjaGlsZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvcih2YXIga2V5IGluIHNldHRpbmdzKXtcclxuICAgICAgICAgICAgaWYoIWF0dHJpYnV0ZU1hcFtrZXldKXtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKGtleSwgc2V0dGluZ3Nba2V5XSk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIGF0dHIgPSBjcmVsLmF0dHJNYXBba2V5XTtcclxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBhdHRyID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyKGVsZW1lbnQsIHNldHRpbmdzW2tleV0pO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0ciwgc2V0dGluZ3Nba2V5XSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFVzZWQgZm9yIG1hcHBpbmcgb25lIGtpbmQgb2YgYXR0cmlidXRlIHRvIHRoZSBzdXBwb3J0ZWQgdmVyc2lvbiBvZiB0aGF0IGluIGJhZCBicm93c2Vycy5cclxuICAgIC8vIFN0cmluZyByZWZlcmVuY2VkIHNvIHRoYXQgY29tcGlsZXJzIG1haW50YWluIHRoZSBwcm9wZXJ0eSBuYW1lLlxyXG4gICAgY3JlbFsnYXR0ck1hcCddID0ge307XHJcblxyXG4gICAgLy8gU3RyaW5nIHJlZmVyZW5jZWQgc28gdGhhdCBjb21waWxlcnMgbWFpbnRhaW4gdGhlIHByb3BlcnR5IG5hbWUuXHJcbiAgICBjcmVsW1wiaXNOb2RlXCJdID0gaXNOb2RlO1xyXG5cclxuICAgIHJldHVybiBjcmVsO1xyXG59KSk7XHJcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBNaW5pbWFsIEV2ZW50RW1pdHRlciBpbnRlcmZhY2UgdGhhdCBpcyBtb2xkZWQgYWdhaW5zdCB0aGUgTm9kZS5qc1xuICogRXZlbnRFbWl0dGVyIGludGVyZmFjZS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0ge307XG59XG5cbi8qKlxuICogUmV0dXJuIGEgbGlzdCBvZiBhc3NpZ25lZCBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudHMgdGhhdCBzaG91bGQgYmUgbGlzdGVkLlxuICogQHJldHVybnMge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiBsaXN0ZW5lcnMoZXZlbnQpIHtcbiAgcmV0dXJuIEFycmF5LmFwcGx5KHRoaXMsIHRoaXMuX2V2ZW50c1tldmVudF0gfHwgW10pO1xufTtcblxuLyoqXG4gKiBFbWl0IGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIG5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHJldHVybnMge0Jvb2xlYW59IEluZGljYXRpb24gaWYgd2UndmUgZW1pdHRlZCBhbiBldmVudC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQoZXZlbnQsIGExLCBhMiwgYTMsIGE0LCBhNSkge1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW2V2ZW50XSkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbZXZlbnRdXG4gICAgLCBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoXG4gICAgLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgLCBmbiA9IGxpc3RlbmVyc1swXVxuICAgICwgYXJnc1xuICAgICwgaTtcblxuICBpZiAoMSA9PT0gbGVuZ3RoKSB7XG4gICAgaWYgKGZuLl9fRUUzX29uY2UpIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGZuKTtcblxuICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIGZuLmNhbGwoZm4uX19FRTNfY29udGV4dCB8fCB0aGlzKTtcbiAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBmbi5jYWxsKGZuLl9fRUUzX2NvbnRleHQgfHwgdGhpcywgYTEpO1xuICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGZuLmNhbGwoZm4uX19FRTNfY29udGV4dCB8fCB0aGlzLCBhMSwgYTIpO1xuICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDQ6XG4gICAgICAgIGZuLmNhbGwoZm4uX19FRTNfY29udGV4dCB8fCB0aGlzLCBhMSwgYTIsIGEzKTtcbiAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA1OlxuICAgICAgICBmbi5jYWxsKGZuLl9fRUUzX2NvbnRleHQgfHwgdGhpcywgYTEsIGEyLCBhMywgYTQpO1xuICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDY6XG4gICAgICAgIGZuLmNhbGwoZm4uX19FRTNfY29udGV4dCB8fCB0aGlzLCBhMSwgYTIsIGEzLCBhNCwgYTUpO1xuICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGZvciAoaSA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cblxuICAgICAgICBmbi5hcHBseShmbi5fX0VFM19jb250ZXh0IHx8IHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKGkgPSAxLCBhcmdzID0gbmV3IEFycmF5KGxlbiAtMSk7IGkgPCBsZW47IGkrKykge1xuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgZm4gPSBsaXN0ZW5lcnNbKytpXSkge1xuICAgICAgaWYgKGZuLl9fRUUzX29uY2UpIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGZuKTtcbiAgICAgIGZuLmFwcGx5KGZuLl9fRUUzX2NvbnRleHQgfHwgdGhpcywgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgbmV3IEV2ZW50TGlzdGVuZXIgZm9yIHRoZSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgTmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcGFyYW0ge0Z1bmN0b259IGZuIENhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBUaGUgY29udGV4dCBvZiB0aGUgZnVuY3Rpb24uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oZXZlbnQsIGZuLCBjb250ZXh0KSB7XG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSB7fTtcbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZlbnRdKSB0aGlzLl9ldmVudHNbZXZlbnRdID0gW107XG5cbiAgZm4uX19FRTNfY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuX2V2ZW50c1tldmVudF0ucHVzaChmbik7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZCBhbiBFdmVudExpc3RlbmVyIHRoYXQncyBvbmx5IGNhbGxlZCBvbmNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBOYW1lIG9mIHRoZSBldmVudC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBUaGUgY29udGV4dCBvZiB0aGUgZnVuY3Rpb24uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiBvbmNlKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICBmbi5fX0VFM19vbmNlID0gdHJ1ZTtcbiAgcmV0dXJuIHRoaXMub24oZXZlbnQsIGZuLCBjb250ZXh0KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50IHdlIHdhbnQgdG8gcmVtb3ZlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGxpc3RlbmVyIHRoYXQgd2UgbmVlZCB0byBmaW5kLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKGV2ZW50LCBmbikge1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW2V2ZW50XSkgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldmVudF1cbiAgICAsIGV2ZW50cyA9IFtdO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZm4gJiYgbGlzdGVuZXJzW2ldICE9PSBmbikge1xuICAgICAgZXZlbnRzLnB1c2gobGlzdGVuZXJzW2ldKTtcbiAgICB9XG4gIH1cblxuICAvL1xuICAvLyBSZXNldCB0aGUgYXJyYXksIG9yIHJlbW92ZSBpdCBjb21wbGV0ZWx5IGlmIHdlIGhhdmUgbm8gbW9yZSBsaXN0ZW5lcnMuXG4gIC8vXG4gIGlmIChldmVudHMubGVuZ3RoKSB0aGlzLl9ldmVudHNbZXZlbnRdID0gZXZlbnRzO1xuICBlbHNlIHRoaXMuX2V2ZW50c1tldmVudF0gPSBudWxsO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYWxsIGxpc3RlbmVycyBvciBvbmx5IHRoZSBsaXN0ZW5lcnMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudCB3YW50IHRvIHJlbW92ZSBhbGwgbGlzdGVuZXJzIGZvci5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKGV2ZW50KSB7XG4gIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gdGhpcztcblxuICBpZiAoZXZlbnQpIHRoaXMuX2V2ZW50c1tldmVudF0gPSBudWxsO1xuICBlbHNlIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIEFsaWFzIG1ldGhvZHMgbmFtZXMgYmVjYXVzZSBwZW9wbGUgcm9sbCBsaWtlIHRoYXQuXG4vL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbi8vXG4vLyBUaGlzIGZ1bmN0aW9uIGRvZXNuJ3QgYXBwbHkgYW55bW9yZS5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIHNldE1heExpc3RlbmVycygpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBtb2R1bGUuXG4vL1xuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyO1xuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlcjMgPSBFdmVudEVtaXR0ZXI7XG5cbnRyeSB7IG1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyOyB9XG5jYXRjaCAoZSkge31cbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciByZVNlcGFyYXRvciA9IC9bXFwsXFxzXVxccyovO1xudmFyIG9mZkZsYWdzID0gWydmYWxzZScsICdub25lJywgJ29mZiddO1xuXG5cbi8qKlxuICAjIHJ0Yy1jYXB0dXJlY29uZmlnXG5cbiAgVGhpcyBpcyBhIHNpbXBsZSBwYXJzZXIgdGhhdCB0YWtlcyBhIHN0cmluZyBvZiB0ZXh0IGFuZCBkZXRlcm1pbmVzIHdoYXRcbiAgdGhhdCBtZWFucyBpbiB0aGUgY29udGV4dCBvZiBXZWJSVEMuXG5cbiAgIyMgV2h5P1xuXG4gIEl0IHByb3ZpZGVzIGEgc2ltcGxlLCB0ZXh0dWFsIHdheSBvZiBkZXNjcmliaW5nIHlvdXIgcmVxdWlyZW1lbnRzIGZvclxuICBtZWRpYSBjYXB0dXJlLiAgVHJ5aW5nIHRvIHJlbWVtYmVyIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIGNvbnN0cmFpbnRzIG9iamVjdFxuICBpcyBwYWluZnVsLlxuXG4gICMjIEhvd1xuXG4gIEEgc2ltcGxlIHRleHQgc3RyaW5nIGlzIGNvbnZlcnRlZCB0byBhbiBpbnRlcm1lZGlhdGUgSlMgb2JqZWN0XG4gIHJlcHJlc2VudGF0aW9uLCB3aGljaCBjYW4gdGhlbiBiZSBjb252ZXJ0ZWQgdG8gYSBnZXRVc2VyTWVkaWEgY29uc3RyYWludHNcbiAgZGF0YSBzdHJ1Y3R1cmUgdXNpbmcgYSBgdG9Db25zdHJhaW50cygpYCBjYWxsLlxuXG4gIEZvciBleGFtcGxlLCB0aGUgZm9sbG93aW5nIHRleHQgaW5wdXQ6XG5cbiAgYGBgXG4gIGNhbWVyYSBtaW46MTI4MHg3MjAgbWF4OjEyODB4NzIwIG1pbjoxNWZwcyBtYXg6MjVmcHNcbiAgYGBgXG5cbiAgSXMgY29udmVydGVkIGludG8gYW4gaW50ZXJtZWRpYSByZXByZXNlbnRhdGlvbiAodmlhIHRoZSBgQ2FwdHVyZUNvbmZpZ2BcbiAgdXRpbGl0eSBjbGFzcykgdGhhdCBsb29rcyBsaWtlIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBganNcbiAge1xuICAgIGNhbWVyYTogMCxcbiAgICBtaWNyb3Bob25lOiAwLFxuICAgIHJlczoge1xuICAgICAgbWluOiB7IHc6IDEyODAsIGg6IDcyMCB9LFxuICAgICAgbWF4OiB7IHc6IDEyODAsIGg6IDcyMCB9XG4gICAgfSxcblxuICAgIGZwczoge1xuICAgICAgbWluOiAxNSxcbiAgICAgIG1heDogMjVcbiAgICB9XG4gIH1cbiAgYGBgXG5cbiAgV2hpY2ggaW4gdHVybiBpcyBjb252ZXJ0ZWQgaW50byB0aGUgZm9sbG93aW5nIG1lZGlhIGNvbnN0cmFpbnRzIGZvclxuICBhIGdldFVzZXJNZWRpYSBjYWxsOlxuXG4gIGBgYGpzXG4gIHtcbiAgICBhdWRpbzogdHJ1ZSxcbiAgICB2aWRlbzoge1xuICAgICAgbWFuZGF0b3J5OiB7XG4gICAgICAgIG1pbkZyYW1lUmF0ZTogMTUsXG4gICAgICAgIG1heEZyYW1lUmF0ZTogMjUsXG5cbiAgICAgICAgbWluV2lkdGg6IDEyODAsXG4gICAgICAgIG1pbkhlaWdodDogNzIwLFxuICAgICAgICBtYXhXaWR0aDogMTI4MCxcbiAgICAgICAgbWF4SGVpZ2h0OiA3MjBcbiAgICAgIH0sXG5cbiAgICAgIG9wdGlvbmFsOiBbXVxuICAgIH1cbiAgfVxuICBgYGBcblxuICAjIyMgRXhwZXJpbWVudGFsOiBUYXJnZXRlZCBEZXZpY2UgQ2FwdHVyZVxuXG4gIFdoaWxlIHRoZSBgcnRjLWNhcHR1cmVjb25maWdgIG1vZHVsZSBpdHNlbGYgZG9lc24ndCBjb250YWluIGFueSBtZWRpYVxuICBpZGVudGlmaWNhdGlvbiBsb2dpYywgaXQgaXMgYWJsZSB0byB0aGUgc291cmNlcyBpbmZvcm1hdGlvbiBmcm9tIGFcbiAgYE1lZGlhU3RyZWFtVHJhY2suZ2V0U291cmNlc2AgY2FsbCB0byBnZW5lcmF0ZSBkZXZpY2UgdGFyZ2V0ZWQgY29uc3RyYWludHMuXG5cbiAgRm9yIGluc3RhbmNlLCB0aGUgZm9sbG93aW5nIGV4YW1wbGUgZGVtb25zdHJhdGVzIGhvdyB3ZSBjYW4gcmVxdWVzdFxuICBgY2FtZXJhOjFgICh0aGUgMm5kIHZpZGVvIGRldmljZSBvbiBvdXIgbG9jYWwgbWFjaGluZSkgd2hlbiB3ZSBhcmUgbWFraW5nXG4gIGEgZ2V0VXNlck1lZGlhIGNhbGw6XG5cbiAgPDw8IGV4YW1wbGVzL2NhbWVyYS10d28uanNcblxuICBJdCdzIHdvcnRoIG5vdGluZyB0aGF0IGlmIHRoZSByZXF1ZXN0ZWQgZGV2aWNlIGRvZXMgbm90IGV4aXN0IG9uIHRoZVxuICBtYWNoaW5lIChpbiB0aGUgY2FzZSBhYm92ZSwgaWYgeW91ciBtYWNoaW5lIG9ubHkgaGFzIGEgc2luZ2xlIHdlYmNhbSAtIGFzXG4gIGlzIGNvbW1vbikgdGhlbiBubyBkZXZpY2Ugc2VsZWN0aW9uIGNvbnN0cmFpbnRzIHdpbGwgYmUgZ2VuZXJhdGVkIChpLmUuXG4gIHRoZSBzdGFuZGFyZCBgeyB2aWRlbzogdHJ1ZSwgYXVkaW86IHRydWUgfWAgY29uc3RyYWludHMgd2lsbCBiZSByZXR1cm5lZFxuICBmcm9tIHRoZSBgdG9Db25zdHJhaW50c2AgY2FsbCkuXG5cbiAgIyMjIEV4cGVyaW1lbnRhbDogU2NyZWVuIENhcHR1cmVcblxuICBJZiB5b3UgYXJlIHdvcmtpbmcgd2l0aCBjaHJvbWUgYW5kIHNlcnZpbmcgY29udGVudCBvZiBhIEhUVFBTIGNvbm5lY3Rpb24sXG4gIHRoZW4geW91IHdpbGwgYmUgYWJsZSB0byBleHBlcmltZW50IHdpdGggZXhwZXJpbWVudGFsIGdldFVzZXJNZWRpYSBzY3JlZW5cbiAgY2FwdHVyZS5cblxuICBJbiB0aGUgc2ltcGxlc3QgY2FzZSwgc2NyZWVuIGNhcHR1cmUgY2FuIGJlIGludm9rZWQgYnkgdXNpbmcgdGhlIGNhcHR1cmVcbiAgc3RyaW5nIG9mOlxuXG4gIGBgYFxuICBzY3JlZW5cbiAgYGBgXG5cbiAgV2hpY2ggZ2VuZXJhdGVzIHRoZSBmb2xsb3dpbmcgY29udHJhaW50czpcblxuICBgYGBqc1xuICB7XG4gICAgYXVkaW86IGZhbHNlLFxuICAgIHZpZGVvOiB7XG4gICAgICBtYW5kYXRvcnk6IHtcbiAgICAgICAgY2hyb21lTWVkaWFTb3VyY2U6ICdzY3JlZW4nXG4gICAgICB9LFxuXG4gICAgICBvcHRpb25hbDogW11cbiAgICB9XG4gIH1cbiAgYGBgXG5cbiAgIyMgUmVmZXJlbmNlXG5cbioqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gIC8vIGNyZWF0ZSBhIG5ldyBjb25maWd1cmF0aW9uIG9iamVjdCB1c2luZyBkZWZhdWx0c1xuICB2YXIgY29uZmlnID0gbmV3IENhcHR1cmVDb25maWcoKTtcblxuICAvLyBwcm9jZXNzIGVhY2ggb2YgdGhlIGRpcmVjdGl2ZXNcbiAgKGlucHV0IHx8ICcnKS5zcGxpdChyZVNlcGFyYXRvcikuZm9yRWFjaChmdW5jdGlvbihkaXJlY3RpdmUpIHtcbiAgICAvLyBub3cgZnVydGhlciBzcGxpdCB0aGUgZGlyZWN0aXZlIG9uIHRoZSA6IGNoYXJhY3RlclxuICAgIHZhciBwYXJ0cyA9IGRpcmVjdGl2ZS5zcGxpdCgnOicpO1xuICAgIHZhciBtZXRob2QgPSBjb25maWdbKHBhcnRzWzBdIHx8ICcnKS50b0xvd2VyQ2FzZSgpXTtcblxuICAgIC8vIGlmIHdlIGhhdmUgdGhlIG1ldGhvZCBhcHBseVxuICAgIGlmICh0eXBlb2YgbWV0aG9kID09ICdmdW5jdGlvbicpIHtcbiAgICAgIG1ldGhvZC5hcHBseShjb25maWcsIHBhcnRzLnNsaWNlKDEpKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBjb25maWc7XG59O1xuXG4vKipcbiAgIyMjIENhcHR1cmVDb25maWdcblxuICBUaGlzIGlzIGEgdXRpbGl0eSBjbGFzcyB0aGF0IGlzIHVzZWQgdG8gdXBkYXRlIGNhcHR1cmUgY29uZmlndXJhdGlvblxuICBkZXRhaWxzIGFuZCBpcyBhYmxlIHRvIGdlbmVyYXRlIHN1aXRhYmxlIGdldFVzZXJNZWRpYSBjb25zdHJhaW50cyBiYXNlZFxuICBvbiB0aGUgY29uZmlndXJhdGlvbi5cblxuKiovXG5mdW5jdGlvbiBDYXB0dXJlQ29uZmlnKCkge1xuICBpZiAoISAodGhpcyBpbnN0YW5jZW9mIENhcHR1cmVDb25maWcpKSB7XG4gICAgcmV0dXJuIG5ldyBDYXB0dXJlQ29uZmlnKCk7XG4gIH1cblxuICAvLyBpbml0aWFsaXNlIHRoZSBiYXNlIGNvbmZpZ1xuICB0aGlzLmNmZyA9IHtcbiAgICBtaWNyb3Bob25lOiB0cnVlXG4gIH07XG59XG5cbnZhciBwcm90ID0gQ2FwdHVyZUNvbmZpZy5wcm90b3R5cGU7XG5cbi8qKlxuICAjIyMjIGNhbWVyYShpbmRleClcblxuICBVcGRhdGUgdGhlIGNhbWVyYSBjb25maWd1cmF0aW9uIHRvIHRoZSBzcGVjaWZpZWQgaW5kZXhcbioqL1xucHJvdC5jYW1lcmEgPSBmdW5jdGlvbihpbmRleCkge1xuICB0aGlzLmNmZy5jYW1lcmEgPSB0cnVlT3JWYWx1ZShpbmRleCk7XG59O1xuXG4vKipcbiAgIyMjIyBtaWNyb3Bob25lKGluZGV4KVxuXG4gIFVwZGF0ZSB0aGUgbWljcm9waG9uZSBjb25maWd1cmF0aW9uIHRvIHRoZSBzcGVjaWZpZWQgaW5kZXhcbioqL1xucHJvdC5taWNyb3Bob25lID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgdGhpcy5jZmcubWljcm9waG9uZSA9IHRydWVPclZhbHVlKGluZGV4KTtcbn07XG5cbi8qKlxuICAjIyMjIHNjcmVlbih0YXJnZXQpXG5cbiAgU3BlY2lmeSB0aGF0IHdlIHdvdWxkIGxpa2UgdG8gY2FwdHVyZSB0aGUgc2NyZWVuXG4qKi9cbnByb3Quc2NyZWVuID0gZnVuY3Rpb24oKSB7XG4gIC8vIHVuc2V0IHRoZSBtaWNyb3Bob25lIGNvbmZpZ1xuICBkZWxldGUgdGhpcy5jZmcubWljcm9waG9uZTtcblxuICAvLyBzZXQgdGhlIHNjcmVlbiBjb25maWd1cmF0aW9uXG4gIHRoaXMuY2ZnLnNjcmVlbiA9IHRydWU7XG59O1xuXG4vKipcbiAgIyMjIyBtYXgoZGF0YSlcblxuICBVcGRhdGUgYSBtYXhpbXVtIGNvbnN0cmFpbnQuICBJZiBhbiBmcHMgY29uc3RyYWludCB0aGlzIHdpbGwgYmUgZGlyZWN0ZWRcbiAgdG8gdGhlIGBtYXhmcHNgIG1vZGlmaWVyLlxuXG4qKi9cbnByb3QubWF4ID0gZnVuY3Rpb24oZGF0YSkge1xuICB2YXIgcmVzO1xuXG4gIC8vIGlmIHRoaXMgaXMgYW4gZnBzIHNwZWNpZmljYXRpb24gcGFyc2VcbiAgaWYgKGRhdGEuc2xpY2UoLTMpLnRvTG93ZXJDYXNlKCkgPT0gJ2ZwcycpIHtcbiAgICByZXR1cm4gdGhpcy5tYXhmcHMoZGF0YSk7XG4gIH1cblxuICAvLyBwYXJzZSB0aGUgcmVzb2x1dGlvblxuICByZXMgPSB0aGlzLl9wYXJzZVJlcyhkYXRhKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBmcHMgY29uZmlnIHN0dWZmXG4gIHRoaXMuY2ZnLnJlcyA9IHRoaXMuY2ZnLnJlcyB8fCB7fTtcbiAgdGhpcy5jZmcucmVzLm1heCA9IHJlcztcbn07XG5cbi8qKlxuICAjIyMjIG1heGZwcyhkYXRhKVxuXG4gIFVwZGF0ZSB0aGUgbWF4aW11bSBmcHNcbioqL1xucHJvdC5tYXhmcHMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGFuIGZwcyBjb21wb25lbnRcbiAgdGhpcy5jZmcuZnBzID0gdGhpcy5jZmcuZnBzIHx8IHt9O1xuXG4gIC8vIHNldCB0aGUgbWF4IGZwc1xuICB0aGlzLmNmZy5mcHMubWF4ID0gcGFyc2VGbG9hdChkYXRhLnNsaWNlKDAsIC0zKSk7XG59O1xuXG4vKipcbiAgIyMjIyBtaW4oZGF0YSlcblxuICBVcGRhdGUgYSBtaW5pbXVtIGNvbnN0cmFpbnQuICBUaGlzIGNhbiBiZSBlaXRoZXIgcmVsYXRlZCB0byByZXNvbHV0aW9uXG4gIG9yIEZQUy5cbioqL1xucHJvdC5taW4gPSBmdW5jdGlvbihkYXRhKSB7XG4gIHZhciByZXM7XG5cbiAgLy8gaWYgdGhpcyBpcyBhbiBmcHMgc3BlY2lmaWNhdGlvbiBwYXJzZVxuICBpZiAoZGF0YS5zbGljZSgtMykudG9Mb3dlckNhc2UoKSA9PSAnZnBzJykge1xuICAgIHJldHVybiB0aGlzLm1pbmZwcyhkYXRhKTtcbiAgfVxuXG4gIC8vIHBhcnNlIHRoZSByZXNvbHV0aW9uXG4gIHJlcyA9IHRoaXMuX3BhcnNlUmVzKGRhdGEpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGZwcyBjb25maWcgc3R1ZmZcbiAgdGhpcy5jZmcucmVzID0gdGhpcy5jZmcucmVzIHx8IHt9O1xuXG4gIC8vIGFkZCB0aGUgbWluXG4gIHRoaXMuY2ZnLnJlcy5taW4gPSByZXM7XG59O1xuXG4vKipcbiAgIyMjIyBtaW5mcHMoZGF0YSlcblxuICBVcGRhdGUgdGhlIG1pbmltdW0gZnBzXG4qKi9cbnByb3QubWluZnBzID0gZnVuY3Rpb24oZGF0YSkge1xuICAvLyBlbnN1cmUgd2UgaGF2ZSBhbiBmcHMgY29tcG9uZW50XG4gIHRoaXMuY2ZnLmZwcyA9IHRoaXMuY2ZnLmZwcyB8fCB7fTtcblxuICAvLyBzZXQgdGhlIG1heCBmcHNcbiAgdGhpcy5jZmcuZnBzLm1pbiA9IHBhcnNlRmxvYXQoZGF0YS5zbGljZSgwLCAtMykpO1xufTtcblxucHJvdC5oZCA9IHByb3RbJzcyMHAnXSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNmZy5jYW1lcmEgPSB0cnVlO1xuICB0aGlzLm1pbignMTI4MHg3MjAnKTtcbn07XG5cbnByb3QuZnVsbGhkID0gcHJvdFsnMTA4MHAnXSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNmZy5jYW1lcmEgPSB0cnVlO1xuICB0aGlzLm1pbignMTkyMHgxMDgwJyk7XG59O1xuXG4vKipcbiAgIyMjIyB0b0NvbnN0cmFpbnRzKG9wdHM/KVxuXG4gIENvbnZlcnQgdGhlIGludGVybmFsIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHRvIGEgdmFsaWQgbWVkaWEgY29uc3RyYWludHNcbiAgcmVwcmVzZW50YXRpb24uICBJbiBjb21wYXRpYmxlIGJyb3dzZXJzIGEgbGlzdCBvZiBtZWRpYSBzb3VyY2VzIGNhblxuICBiZSBwYXNzZWQgdGhyb3VnaCBpbiB0aGUgYG9wdHMuc291cmNlc2AgdG8gY3JlYXRlIGNvbnRyYWludHMgdGhhdCB3aWxsXG4gIHRhcmdldCBhIHNwZWNpZmljIGRldmljZSB3aGVuIGNhcHR1cmVkLlxuXG4gIDw8PCBleGFtcGxlcy9jYXB0dXJlLXRhcmdldHMuanNcblxuKiovXG5wcm90LnRvQ29uc3RyYWludHMgPSBmdW5jdGlvbihvcHRzKSB7XG4gIHZhciBjZmcgPSB0aGlzLmNmZztcbiAgdmFyIGNvbnN0cmFpbnRzID0ge1xuICAgIGF1ZGlvOiBjZmcubWljcm9waG9uZSA9PT0gdHJ1ZSB8fFxuICAgICAgKHR5cGVvZiBjZmcubWljcm9waG9uZSA9PSAnbnVtYmVyJyAmJiBjZmcubWljcm9waG9uZSA+PSAwKSxcblxuICAgIHZpZGVvOiBjZmcuY2FtZXJhID09PSB0cnVlIHx8IGNmZy5zY3JlZW4gfHxcbiAgICAgICh0eXBlb2YgY2ZnLmNhbWVyYSA9PSAnbnVtYmVyJyAmJiBjZmcuY2FtZXJhID49IDApXG4gIH07XG5cbiAgLy8gbWFuZGF0b3J5IGNvbnN0cmFpbnRzXG4gIHZhciBtID0ge1xuICAgIHZpZGVvOiB7fSxcbiAgICBhdWRpbzoge31cbiAgfTtcblxuICAvLyBvcHRpb25hbCBjb25zdHJhaW50c1xuICB2YXIgbyA9IHtcbiAgICB2aWRlbzogW10sXG4gICAgYXVkaW86IFtdXG4gIH07XG5cbiAgdmFyIHNvdXJjZXMgPSAob3B0cyB8fCB7fSkuc291cmNlcyB8fCBbXTtcbiAgdmFyIGNhbWVyYXMgPSBzb3VyY2VzLmZpbHRlcihmdW5jdGlvbihpbmZvKSB7XG4gICAgcmV0dXJuIGluZm8gJiYgaW5mby5raW5kID09PSAndmlkZW8nO1xuICB9KTtcbiAgdmFyIG1pY3JvcGhvbmVzID0gc291cmNlcy5maWx0ZXIoZnVuY3Rpb24oaW5mbykge1xuICAgIHJldHVybiBpbmZvICYmIGluZm8ua2luZCA9PT0gJ2F1ZGlvJztcbiAgfSk7XG4gIHZhciBzZWxlY3RlZFNvdXJjZTtcblxuICBmdW5jdGlvbiBjb21wbGV4Q29uc3RyYWludHModGFyZ2V0KSB7XG4gICAgaWYgKGNvbnN0cmFpbnRzW3RhcmdldF0gJiYgdHlwZW9mIGNvbnN0cmFpbnRzW3RhcmdldF0gIT0gJ29iamVjdCcpIHtcbiAgICAgIGNvbnN0cmFpbnRzW3RhcmdldF0gPSB7XG4gICAgICAgIG1hbmRhdG9yeTogbVt0YXJnZXRdLFxuICAgICAgICBvcHRpb25hbDogb1t0YXJnZXRdXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8vIGZwc1xuICBpZiAoY2ZnLmZwcykge1xuICAgIGNvbXBsZXhDb25zdHJhaW50cygndmlkZW8nKTtcbiAgICBjZmcuZnBzLm1pbiAmJiAobS52aWRlby5taW5GcmFtZVJhdGUgPSBjZmcuZnBzLm1pbik7XG4gICAgY2ZnLmZwcy5tYXggJiYgKG0udmlkZW8ubWF4RnJhbWVSYXRlID0gY2ZnLmZwcy5tYXgpO1xuICB9XG5cbiAgLy8gbWluIHJlcyBzcGVjaWZpZWRcbiAgaWYgKGNmZy5yZXMgJiYgY2ZnLnJlcy5taW4pIHtcbiAgICBjb21wbGV4Q29uc3RyYWludHMoJ3ZpZGVvJyk7XG4gICAgbS52aWRlby5taW5XaWR0aCA9IGNmZy5yZXMubWluLnc7XG4gICAgbS52aWRlby5taW5IZWlnaHQgPSBjZmcucmVzLm1pbi5oO1xuICB9XG5cbiAgLy8gbWF4IHJlcyBzcGVjaWZpZWRcbiAgaWYgKGNmZy5yZXMgJiYgY2ZnLnJlcy5tYXgpIHtcbiAgICBjb21wbGV4Q29uc3RyYWludHMoJ3ZpZGVvJyk7XG4gICAgbS52aWRlby5tYXhXaWR0aCA9IGNmZy5yZXMubWF4Lnc7XG4gICAgbS52aWRlby5tYXhIZWlnaHQgPSBjZmcucmVzLm1heC5oO1xuICB9XG5cbiAgLy8gaW5wdXQgY2FtZXJhIHNlbGVjdGlvblxuICBpZiAodHlwZW9mIGNmZy5jYW1lcmEgPT0gJ251bWJlcicgJiYgY2FtZXJhcy5sZW5ndGgpIHtcbiAgICBzZWxlY3RlZFNvdXJjZSA9IGNhbWVyYXNbY2ZnLmNhbWVyYV07XG5cbiAgICBpZiAoc2VsZWN0ZWRTb3VyY2UpIHtcbiAgICAgIGNvbXBsZXhDb25zdHJhaW50cygndmlkZW8nKTtcbiAgICAgIG8udmlkZW8ucHVzaCh7IHNvdXJjZUlkOiBzZWxlY3RlZFNvdXJjZS5pZCB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBpbnB1dCBtaWNyb3Bob25lIHNlbGVjdGlvblxuICBpZiAodHlwZW9mIGNmZy5taWNyb3Bob25lID09ICdudW1iZXInICYmIG1pY3JvcGhvbmVzLmxlbmd0aCkge1xuICAgIHNlbGVjdGVkU291cmNlID0gbWljcm9waG9uZXNbY2ZnLm1pY3JvcGhvbmVdO1xuXG4gICAgaWYgKHNlbGVjdGVkU291cmNlKSB7XG4gICAgICBjb21wbGV4Q29uc3RyYWludHMoJ2F1ZGlvJyk7XG4gICAgICBvLmF1ZGlvLnB1c2goeyBzb3VyY2VJZDogc2VsZWN0ZWRTb3VyY2UuaWQgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgd2UgaGF2ZSBzY3JlZW4gY29uc3RyYWludHMsIG1ha2UgbWFnaWMgaGFwcGVuXG4gIGlmICh0eXBlb2YgY2ZnLnNjcmVlbiAhPSAndW5kZWZpbmVkJykge1xuICAgIGNvbXBsZXhDb25zdHJhaW50cygndmlkZW8nKTtcbiAgICBtLnZpZGVvLmNocm9tZU1lZGlhU291cmNlID0gJ3NjcmVlbic7XG4gIH1cblxuICByZXR1cm4gY29uc3RyYWludHM7XG59O1xuXG4vKipcbiAgIyMjIFwiSW50ZXJuYWxcIiBtZXRob2RzXG4qKi9cblxuLyoqXG4gICMjIyMgX3BhcnNlUmVzKGRhdGEpXG5cbiAgUGFyc2UgYSByZXNvbHV0aW9uIHNwZWNpZmllciAoZS5nLiAxMjgweDcyMCkgaW50byBhIHNpbXBsZSBKUyBvYmplY3RcbiAgKGUuZy4geyB3OiAxMjgwLCBoOiA3MjAgfSlcbioqL1xucHJvdC5fcGFyc2VSZXMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIHNwbGl0IHRoZSBkYXRhIG9uIHRoZSAneCcgY2hhcmFjdGVyXG4gIHZhciBwYXJ0cyA9IGRhdGEuc3BsaXQoJ3gnKTtcblxuICAvLyBpZiB3ZSBkb24ndCBoYXZlIHR3byBwYXJ0cywgdGhlbiBjb21wbGFpblxuICBpZiAocGFydHMubGVuZ3RoIDwgMikge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByZXNvbHV0aW9uIHNwZWNpZmljYXRpb246ICcgKyBkYXRhKTtcbiAgfVxuXG4gIC8vIHJldHVybiB0aGUgd2lkdGggYW5kIGhlaWdodCBvYmplY3RcbiAgcmV0dXJuIHtcbiAgICB3OiBwYXJzZUludChwYXJ0c1swXSwgMTApLFxuICAgIGg6IHBhcnNlSW50KHBhcnRzWzFdLCAxMClcbiAgfTtcbn07XG5cbi8qIGludGVybmFsIGhlbHBlciAqL1xuXG5mdW5jdGlvbiB0cnVlT3JWYWx1ZSh2YWwpIHtcbiAgaWYgKHR5cGVvZiB2YWwgPT0gJ3N0cmluZycgJiYgb2ZmRmxhZ3MuaW5kZXhPZih2YWwudG9Mb3dlckNhc2UoKSkgPj0gMCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09ICcnIHx8IHBhcnNlSW50KHZhbCB8fCAwLCAxMCk7XG59XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIG5hdmlnYXRvcjogZmFsc2UgKi9cbi8qIGdsb2JhbCB3aW5kb3c6IGZhbHNlICovXG4vKiBnbG9iYWwgZG9jdW1lbnQ6IGZhbHNlICovXG4vKiBnbG9iYWwgTWVkaWFTdHJlYW06IGZhbHNlICovXG4vKiBnbG9iYWwgSFRNTFZpZGVvRWxlbWVudDogZmFsc2UgKi9cbi8qIGdsb2JhbCBIVE1MQXVkaW9FbGVtZW50OiBmYWxzZSAqL1xuXG4vKipcbiAgIyBydGMtbWVkaWFcblxuICBTaW1wbGUgW2dldFVzZXJNZWRpYV0oaHR0cDovL2Rldi53My5vcmcvMjAxMS93ZWJydGMvZWRpdG9yL2dldHVzZXJtZWRpYS5odG1sKVxuICBjcm9zcy1icm93c2VyIHdyYXBwZXJzLiAgUGFydCBvZiB0aGUgW3J0Yy5pb10oaHR0cDovL3J0Yy5pby8pIHN1aXRlLCB3aGljaCBpc1xuICBzcG9uc29yZWQgYnkgW05JQ1RBXShodHRwOi8vb3Blbm5pY3RhLmNvbSkgYW5kIHJlbGVhc2VkIHVuZGVyIGFuXG4gIFtBcGFjaGUgMi4wIGxpY2Vuc2VdKC9MSUNFTlNFKS5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgQ2FwdHVyaW5nIG1lZGlhIG9uIHlvdXIgbWFjaGluZSBpcyBhcyBzaW1wbGUgYXM6XG5cbiAgYGBganNcbiAgcmVxdWlyZSgncnRjLW1lZGlhJykoKTtcbiAgYGBgXG5cbiAgV2hpbGUgdGhpcyB3aWxsIGluIGZhY3Qgc3RhcnQgdGhlIHVzZXIgbWVkaWEgY2FwdHVyZSBwcm9jZXNzLCBpdCB3b24ndFxuICBkbyBhbnl0aGluZyB3aXRoIGl0LiAgTGV0cyB0YWtlIGEgbG9vayBhdCBhIG1vcmUgcmVhbGlzdGljIGV4YW1wbGU6XG5cbiAgPDw8IGV4YW1wbGVzL3JlbmRlci10by1ib2R5LmpzXG5cbiAgW3J1biBvbiByZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA4NTQ1MClcblxuICBJbiB0aGUgY29kZSBhYm92ZSwgd2UgYXJlIGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlIG9mIG91ciB1c2VyTWVkaWEgd3JhcHBlclxuICB1c2luZyB0aGUgYG1lZGlhKClgIGNhbGwgYW5kIHRoZW4gdGVsbGluZyBpdCB0byByZW5kZXIgdG8gdGhlXG4gIGBkb2N1bWVudC5ib2R5YCBvbmNlIHZpZGVvIHN0YXJ0cyBzdHJlYW1pbmcuICBXZSBjYW4gZnVydGhlciBleHBhbmQgdGhlXG4gIGNvZGUgb3V0IHRvIHRoZSBmb2xsb3dpbmcgdG8gYWlkIG91ciB1bmRlcnN0YW5kaW5nIG9mIHdoYXQgaXMgZ29pbmcgb246XG5cbiAgPDw8IGV4YW1wbGVzL2NhcHR1cmUtZXhwbGljaXQuanNcblxuICBUaGUgY29kZSBhYm92ZSBpcyB3cml0dGVuIGluIGEgbW9yZSB0cmFkaXRpb25hbCBKUyBzdHlsZSwgYnV0IGZlZWwgZnJlZVxuICB0byB1c2UgdGhlIGZpcnN0IHN0eWxlIGFzIGl0J3MgcXVpdGUgc2FmZSAodGhhbmtzIHRvIHNvbWUgY2hlY2tzIGluIHRoZVxuICBjb2RlKS5cblxuICAjIyMgRXZlbnRzXG5cbiAgT25jZSBhIG1lZGlhIG9iamVjdCBoYXMgYmVlbiBjcmVhdGVkLCBpdCB3aWxsIHByb3ZpZGUgYSBudW1iZXIgb2YgZXZlbnRzXG4gIHRocm91Z2ggdGhlIHN0YW5kYXJkIG5vZGUgRXZlbnRFbWl0dGVyIEFQSS5cblxuICAjIyMjIGBjYXB0dXJlYFxuXG4gIFRoZSBgY2FwdHVyZWAgZXZlbnQgaXMgdHJpZ2dlcmVkIG9uY2UgdGhlIHJlcXVlc3RlZCBtZWRpYSBzdHJlYW0gaGFzXG4gIGJlZW4gY2FwdHVyZWQgYnkgdGhlIGJyb3dzZXIuXG5cbiAgPDw8IGV4YW1wbGVzL2NhcHR1cmUtZXZlbnQuanNcblxuICAjIyMjIGByZW5kZXJgXG5cbiAgVGhlIGByZW5kZXJgIGV2ZW50IGlzIHRyaWdnZXJlZCBvbmNlIHRoZSBzdHJlYW0gaGFzIGJlZW4gcmVuZGVyZWRcbiAgdG8gdGhlIGFueSBzdXBwbGllZCAob3IgY3JlYXRlZCkgdmlkZW8gZWxlbWVudHMuXG5cbiAgV2hpbGUgaXQgbWlnaHQgc2VlbSBhIGxpdHRsZSBjb25mdXNpbmcgdGhhdCB3aGVuIHRoZSBgcmVuZGVyYCBldmVudFxuICBmaXJlcyB0aGF0IGl0IHJldHVybnMgYW4gYXJyYXkgb2YgZWxlbWVudHMgcmF0aGVyIHRoYW4gYSBzaW5nbGUgZWxlbWVudFxuICAod2hpY2ggaXMgd2hhdCBpcyBwcm92aWRlZCB3aGVuIGNhbGxpbmcgdGhlIGByZW5kZXJgIG1ldGhvZCkuXG5cbiAgVGhpcyBvY2N1cnMgYmVjYXVzZSBpdCBpcyBjb21wbGV0ZWx5IHZhbGlkIHRvIHJlbmRlciBhIHNpbmdsZSBjYXB0dXJlZFxuICBtZWRpYSBzdHJlYW0gdG8gbXVsdGlwbGUgbWVkaWEgZWxlbWVudHMgb24gYSBwYWdlLiAgVGhlIGByZW5kZXJgIGV2ZW50XG4gIGlzIHJlcG9ydGluZyBvbmNlIHRoZSByZW5kZXIgb3BlcmF0aW9uIGhhcyBjb21wbGV0ZWQgZm9yIGFsbCB0YXJnZXRzIHRoYXRcbiAgaGF2ZSBiZWVuIHJlZ2lzdGVyZWQgd2l0aCB0aGUgY2FwdHVyZSBzdHJlYW0uXG5cbiAgIyMgUmVmZXJlbmNlXG5cbioqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgncnRjLW1lZGlhJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpO1xudmFyIHBsdWdpbiA9IHJlcXVpcmUoJ3J0Yy1jb3JlL3BsdWdpbicpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjMnKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbi8vIG1vbmtleSBwYXRjaCBnZXRVc2VyTWVkaWEgZnJvbSB0aGUgcHJlZml4ZWQgdmVyc2lvblxubmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcbiAgZGV0ZWN0LmNhbGwobmF2aWdhdG9yLCAnZ2V0VXNlck1lZGlhJyk7XG5cbi8vIHBhdGNoIHdpbmRvdyB1cmxcbndpbmRvdy5VUkwgPSB3aW5kb3cuVVJMIHx8IGRldGVjdCgnVVJMJyk7XG5cbi8vIHBhdGNoIG1lZGlhIHN0cmVhbVxud2luZG93Lk1lZGlhU3RyZWFtID0gZGV0ZWN0KCdNZWRpYVN0cmVhbScpO1xuXG4vKipcbiAgIyMjIG1lZGlhXG5cbiAgYGBgXG4gIG1lZGlhKG9wdHM/KVxuICBgYGBcblxuICBDYXB0dXJlIG1lZGlhIHVzaW5nIHRoZSB1bmRlcmx5aW5nXG4gIFtnZXRVc2VyTWVkaWFdKGh0dHA6Ly93d3cudzMub3JnL1RSL21lZGlhY2FwdHVyZS1zdHJlYW1zLykgQVBJLlxuXG4gIFRoZSBmdW5jdGlvbiBhY2NlcHRzIGEgc2luZ2xlIGFyZ3VtZW50IHdoaWNoIGNhbiBiZSBlaXRoZXIgYmU6XG5cbiAgLSBhLiBBbiBvcHRpb25zIG9iamVjdCAoc2VlIGJlbG93KSwgb3I7XG4gIC0gYi4gQW4gZXhpc3RpbmdcbiAgICBbTWVkaWFTdHJlYW1dKGh0dHA6Ly93d3cudzMub3JnL1RSL21lZGlhY2FwdHVyZS1zdHJlYW1zLyNtZWRpYXN0cmVhbSkgdGhhdFxuICAgIHRoZSBtZWRpYSBvYmplY3Qgd2lsbCBiaW5kIHRvIGFuZCBwcm92aWRlIHlvdSBzb21lIERPTSBoZWxwZXJzIGZvci5cblxuICBUaGUgZnVuY3Rpb24gc3VwcG9ydHMgdGhlIGZvbGxvd2luZyBvcHRpb25zOlxuXG4gIC0gYGNhcHR1cmVgIC0gV2hldGhlciBjYXB0dXJlIHNob3VsZCBiZSBpbml0aWF0ZWQgYXV0b21hdGljYWxseS4gRGVmYXVsdHNcbiAgICB0byB0cnVlLCBidXQgdG9nZ2xlZCB0byBmYWxzZSBhdXRvbWF0aWNhbGx5IGlmIGFuIGV4aXN0aW5nIHN0cmVhbSBpc1xuICAgIHByb3ZpZGVkLlxuXG4gIC0gYG11dGVkYCAtIFdoZXRoZXIgdGhlIHZpZGVvIGVsZW1lbnQgY3JlYXRlZCBmb3IgdGhpcyBzdHJlYW0gc2hvdWxkIGJlXG4gICAgbXV0ZWQuICBEZWZhdWx0IGlzIHRydWUgYnV0IGlzIHNldCB0byBmYWxzZSB3aGVuIGFuIGV4aXN0aW5nIHN0cmVhbSBpc1xuICAgIHBhc3NlZC5cblxuICAtIGBjb25zdHJhaW50c2AgLSBUaGUgY29uc3RyYWludCBvcHRpb24gYWxsb3dzIHlvdSB0byBzcGVjaWZ5IHBhcnRpY3VsYXJcbiAgICBtZWRpYSBjYXB0dXJlIGNvbnN0cmFpbnRzIHdoaWNoIGNhbiBhbGxvdyB5b3UgZG8gZG8gc29tZSBwcmV0dHkgY29vbFxuICAgIHRyaWNrcy4gIEJ5IGRlZmF1bHQsIHRoZSBjb250cmFpbnRzIHVzZWQgdG8gcmVxdWVzdCB0aGUgbWVkaWEgYXJlXG4gICAgZmFpcmx5IHN0YW5kYXJkIGRlZmF1bHRzOlxuXG4gICAgYGBganNcbiAgICAgIHtcbiAgICAgICAgdmlkZW86IHtcbiAgICAgICAgICBtYW5kYXRvcnk6IHt9LFxuICAgICAgICAgIG9wdGlvbmFsOiBbXVxuICAgICAgICB9LFxuICAgICAgICBhdWRpbzogdHJ1ZVxuICAgICAgfVxuICAgIGBgYFxuXG4qKi9cbmZ1bmN0aW9uIE1lZGlhKG9wdHMpIHtcbiAgdmFyIG1lZGlhID0gdGhpcztcblxuICAvLyBjaGVjayB0aGUgY29uc3RydWN0b3IgaGFzIGJlZW4gY2FsbGVkXG4gIGlmICghICh0aGlzIGluc3RhbmNlb2YgTWVkaWEpKSB7XG4gICAgcmV0dXJuIG5ldyBNZWRpYShvcHRzKTtcbiAgfVxuXG4gIC8vIGluaGVyaXRlZFxuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICAvLyBpZiB0aGUgb3B0cyBpcyBhIG1lZGlhIHN0cmVhbSBpbnN0YW5jZSwgdGhlbiBoYW5kbGUgdGhhdCBhcHByb3ByaWF0ZWx5XG4gIGlmIChvcHRzICYmIE1lZGlhU3RyZWFtICYmIG9wdHMgaW5zdGFuY2VvZiBNZWRpYVN0cmVhbSkge1xuICAgIG9wdHMgPSB7XG4gICAgICBzdHJlYW06IG9wdHNcbiAgICB9O1xuICB9XG5cbiAgLy8gaWYgd2UndmUgYmVlbiBwYXNzZWQgb3B0cyBhbmQgdGhleSBsb29rIGxpa2UgY29uc3RyYWludHMsIG1vdmUgdGhpbmdzXG4gIC8vIGFyb3VuZCBhIGxpdHRsZVxuICBpZiAob3B0cyAmJiAob3B0cy5hdWRpbyB8fCBvcHRzLnZpZGVvKSkge1xuICAgIG9wdHMgPSB7XG4gICAgICBjb25zdHJhaW50czogb3B0c1xuICAgIH07XG4gIH1cblxuICAvLyBlbnN1cmUgd2UgaGF2ZSBvcHRzXG4gIG9wdHMgPSBleHRlbmQoe30sIHtcbiAgICBjYXB0dXJlOiAoISBvcHRzKSB8fCAoISBvcHRzLnN0cmVhbSksXG4gICAgbXV0ZWQ6ICghIG9wdHMpIHx8ICghIG9wdHMuc3RyZWFtKSxcbiAgICBjb25zdHJhaW50czoge1xuICAgICAgdmlkZW86IHtcbiAgICAgICAgbWFuZGF0b3J5OiB7fSxcbiAgICAgICAgb3B0aW9uYWw6IFtdXG4gICAgICB9LFxuICAgICAgYXVkaW86IHRydWUsXG5cbiAgICAgIC8vIHNwZWNpZnkgdGhlIGZha2UgZmxhZyBpZiB3ZSBkZXRlY3Qgd2UgYXJlIHJ1bm5pbmcgaW4gdGhlIHRlc3RcbiAgICAgIC8vIGVudmlyb25tZW50LCBvbiBjaHJvbWUgdGhpcyB3aWxsIGRvIG5vdGhpbmcgYnV0IGluIGZpcmVmb3ggaXQgd2lsbFxuICAgICAgLy8gdXNlIGEgZmFrZSB2aWRlbyBkZXZpY2VcbiAgICAgIGZha2U6IHR5cGVvZiBfX3Rlc3RsaW5nQ29uc29sZSAhPSAndW5kZWZpbmVkJ1xuICAgIH1cbiAgfSwgb3B0cyk7XG5cbiAgLy8gc2F2ZSB0aGUgY29uc3RyYWludHNcbiAgdGhpcy5jb25zdHJhaW50cyA9IG9wdHMuY29uc3RyYWludHM7XG5cbiAgLy8gaWYgYSBuYW1lIGhhcyBiZWVuIHNwZWNpZmllZCBpbiB0aGUgb3B0cywgc2F2ZSBpdCB0byB0aGUgbWVkaWFcbiAgdGhpcy5uYW1lID0gb3B0cy5uYW1lO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIHN0cmVhbSB0byBudWxsXG4gIHRoaXMuc3RyZWFtID0gb3B0cy5zdHJlYW0gfHwgbnVsbDtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBtdXRlZCBzdGF0ZVxuICB0aGlzLm11dGVkID0gdHlwZW9mIG9wdHMubXV0ZWQgPT0gJ3VuZGVmaW5lZCcgfHwgb3B0cy5tdXRlZDtcblxuICAvLyBjcmVhdGUgYSBiaW5kaW5ncyBhcnJheSBzbyB3ZSBoYXZlIGEgcm91Z2ggaWRlYSBvZiB3aGVyZVxuICAvLyB3ZSBoYXZlIGJlZW4gYXR0YWNoZWQgdG9cbiAgLy8gVE9ETzogcmV2aXNpdCB3aGV0aGVyIHRoaXMgaXMgdGhlIGJlc3Qgd2F5IHRvIG1hbmFnZSB0aGlzXG4gIHRoaXMuX2JpbmRpbmdzID0gW107XG5cbiAgLy8gc2VlIGlmIHdlIGFyZSB1c2luZyBhIHBsdWdpblxuICB0aGlzLnBsdWdpbiA9IHBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG4gIGlmICh0aGlzLnBsdWdpbikge1xuICAgIC8vIGlmIHdlIGFyZSB1c2luZyBhIHBsdWdpbiwgZ2l2ZSBpdCBhbiBvcHBvcnR1bml0eSB0byBwYXRjaCB0aGVcbiAgICAvLyBtZWRpYSBjYXB0dXJlIGludGVyZmFjZVxuICAgIG1lZGlhLl9waW5zdCA9IHRoaXMucGx1Z2luLmluaXQob3B0cywgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBjb25zb2xlLmxvZygnaW5pdGlhbGl6YXRpb24gY29tcGxldGUnKTtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIG1lZGlhLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCghIG9wdHMuc3RyZWFtKSAmJiBvcHRzLmNhcHR1cmUpIHtcbiAgICAgICAgbWVkaWEuY2FwdHVyZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIC8vIGlmIHdlIGFyZSBhdXRvc3RhcnRpbmcsIGNhcHR1cmUgbWVkaWEgb24gdGhlIG5leHQgdGlja1xuICBlbHNlIGlmIChvcHRzLmNhcHR1cmUpIHtcbiAgICBzZXRUaW1lb3V0KHRoaXMuY2FwdHVyZS5iaW5kKHRoaXMpLCAwKTtcbiAgfVxufVxuXG5pbmhlcml0cyhNZWRpYSwgRXZlbnRFbWl0dGVyKTtcbm1vZHVsZS5leHBvcnRzID0gTWVkaWE7XG5cbi8qKlxuICAjIyMgY2FwdHVyZVxuXG4gIGBgYFxuICBjYXB0dXJlKGNvbnN0cmFpbnRzLCBjYWxsYmFjaylcbiAgYGBgXG5cbiAgQ2FwdHVyZSBtZWRpYS4gIElmIGNvbnN0cmFpbnRzIGFyZSBwcm92aWRlZCwgdGhlbiB0aGV5IHdpbGxcbiAgb3ZlcnJpZGUgdGhlIGRlZmF1bHQgY29uc3RyYWludHMgdGhhdCB3ZXJlIHVzZWQgd2hlbiB0aGUgbWVkaWEgb2JqZWN0IHdhc1xuICBjcmVhdGVkLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuY2FwdHVyZSA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzLCBjYWxsYmFjaykge1xuICB2YXIgbWVkaWEgPSB0aGlzO1xuICB2YXIgaGFuZGxlRW5kID0gdGhpcy5lbWl0LmJpbmQodGhpcywgJ2VuZCcpO1xuXG4gIC8vIGlmIHdlIGFscmVhZHkgaGF2ZSBhIHN0cmVhbSwgdGhlbiBhYm9ydFxuICBpZiAodGhpcy5zdHJlYW0pIHsgcmV0dXJuOyB9XG5cbiAgLy8gaWYgbm8gY29uc3RyYWludHMgaGF2ZSBiZWVuIHByb3ZpZGVkLCBidXQgd2UgaGF2ZVxuICAvLyBhIGNhbGxiYWNrLCBkZWFsIHdpdGggaXRcbiAgaWYgKHR5cGVvZiBjb25zdHJhaW50cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBjb25zdHJhaW50cztcbiAgICBjb25zdHJhaW50cyA9IHRoaXMuY29uc3RyYWludHM7XG4gIH1cblxuICAvLyBpZiB3ZSBoYXZlIGEgY2FsbGJhY2ssIGJpbmQgdG8gdGhlIHN0YXJ0IGV2ZW50XG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRoaXMub25jZSgnY2FwdHVyZScsIGNhbGxiYWNrLmJpbmQodGhpcykpO1xuICB9XG5cbiAgLy8gaWYgd2UgZG9uJ3QgaGF2ZSBnZXQgdGhlIGFiaWxpdHkgdG8gY2FwdHVyZSB1c2VyIG1lZGlhLCB0aGVuIGFib3J0XG4gIGlmICh0eXBlb2YgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrICYmIGNhbGxiYWNrKG5ldyBFcnJvcignVW5hYmxlIHRvIGNhcHR1cmUgdXNlciBtZWRpYScpKTtcbiAgfVxuXG4gIC8vIGdldCB1c2VyIG1lZGlhLCB1c2luZyBlaXRoZXIgdGhlIHByb3ZpZGVkIGNvbnN0cmFpbnRzIG9yIHRoZVxuICAvLyBkZWZhdWx0IGNvbnN0cmFpbnRzXG4gIGRlYnVnKCdnZXRVc2VyTWVkaWEsIGNvbnN0cmFpbnRzOiAnLCBjb25zdHJhaW50cyB8fCB0aGlzLmNvbnN0cmFpbnRzKTtcbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShcbiAgICBjb25zdHJhaW50cyB8fCB0aGlzLmNvbnN0cmFpbnRzLFxuICAgIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgZGVidWcoJ3N1Y2Vzc2Z1bGx5IGNhcHR1cmVkIG1lZGlhIHN0cmVhbTogJywgc3RyZWFtKTtcbiAgICAgIGlmICh0eXBlb2Ygc3RyZWFtLmFkZEV2ZW50TGlzdGVuZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBzdHJlYW0uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBoYW5kbGVFbmQpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHN0cmVhbS5vbmVuZGVkID0gaGFuZGxlRW5kO1xuICAgICAgfVxuXG4gICAgICAvLyBzYXZlIHRoZSBzdHJlYW0gYW5kIGVtaXQgdGhlIHN0YXJ0IG1ldGhvZFxuICAgICAgbWVkaWEuc3RyZWFtID0gc3RyZWFtO1xuXG4gICAgICAvLyBlbWl0IGNhcHR1cmUgb24gbmV4dCB0aWNrIHdoaWNoIHdvcmtzIGFyb3VuZCBhIGJ1ZyB3aGVuIHVzaW5nIHBsdWdpbnNcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIG1lZGlhLmVtaXQoJ2NhcHR1cmUnLCBzdHJlYW0pO1xuICAgICAgfSwgMCk7XG4gICAgfSxcblxuICAgIGZ1bmN0aW9uKGVycikge1xuICAgICAgZGVidWcoJ2dldFVzZXJNZWRpYSBhdHRlbXB0IGZhaWxlZDogJywgZXJyKTtcbiAgICAgIG1lZGlhLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9XG4gICk7XG59O1xuXG4vKipcbiAgIyMjIHJlbmRlclxuXG4gIGBgYGpzXG4gIHJlbmRlcih0YXJnZXQsIG9wdHM/LCBjYWxsYmFjaz8pXG4gIGBgYFxuXG4gIFJlbmRlciB0aGUgY2FwdHVyZWQgbWVkaWEgdG8gdGhlIHNwZWNpZmllZCB0YXJnZXQgZWxlbWVudC4gIFdoaWxlIHByZXZpb3VzXG4gIHZlcnNpb25zIG9mIHJ0Yy1tZWRpYSBhY2NlcHRlZCBhIHNlbGVjdG9yIHN0cmluZyBvciBhbiBhcnJheSBvZiBlbGVtZW50c1xuICB0aGlzIGhhcyBiZWVuIGRyb3BwZWQgaW4gZmF2b3VyIG9mIF9fb25lIHNpbmdsZSB0YXJnZXQgZWxlbWVudF9fLlxuXG4gIElmIHRoZSB0YXJnZXQgZWxlbWVudCBpcyBhIHZhbGlkIE1lZGlhRWxlbWVudCB0aGVuIGl0IHdpbGwgYmVjb21lIHRoZVxuICB0YXJnZXQgb2YgdGhlIGNhcHR1cmVkIG1lZGlhIHN0cmVhbS4gIElmLCBob3dldmVyLCBpdCBpcyBhIGdlbmVyaWMgRE9NXG4gIGVsZW1lbnQgaXQgd2lsbCBhIG5ldyBNZWRpYSBlbGVtZW50IHdpbGwgYmUgY3JlYXRlZCB0aGF0IHVzaW5nIHRoZSB0YXJnZXRcbiAgYXMgaXQncyBwYXJlbnQuXG5cbiAgQSBzaW1wbGUgZXhhbXBsZSBvZiByZXF1ZXN0aW5nIGRlZmF1bHQgbWVkaWEgY2FwdHVyZSBhbmQgcmVuZGVyaW5nIHRvIHRoZVxuICBkb2N1bWVudCBib2R5IGlzIHNob3duIGJlbG93OlxuXG4gIDw8PCBleGFtcGxlcy9yZW5kZXItdG8tYm9keS5qc1xuXG4gIFlvdSBtYXkgb3B0aW9uYWxseSBwcm92aWRlIGEgY2FsbGJhY2sgdG8gdGhpcyBmdW5jdGlvbiwgd2hpY2ggaXNcbiAgd2lsbCBiZSB0cmlnZ2VyZWQgb25jZSBlYWNoIG9mIHRoZSBtZWRpYSBlbGVtZW50cyBoYXMgc3RhcnRlZCBwbGF5aW5nXG4gIHRoZSBzdHJlYW06XG5cbiAgPDw8IGV4YW1wbGVzL3JlbmRlci1jYXB0dXJlLWNhbGxiYWNrLmpzXG5cbioqL1xuTWVkaWEucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHRhcmdldCwgb3B0cywgY2FsbGJhY2spIHtcbiAgLy8gaWYgdGhlIHRhcmdldCBpcyBhbiBhcnJheSwgZXh0cmFjdCB0aGUgZmlyc3QgZWxlbWVudFxuICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgLy8gbG9nIGEgd2FybmluZ1xuICAgIGNvbnNvbGUubG9nKCdXQVJOSU5HOiBydGMtbWVkaWEgcmVuZGVyIChhcyBvZiAxLngpIGV4cGVjdHMgYSBzaW5nbGUgdGFyZ2V0Jyk7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0WzBdO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvcHRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgLy8gZW5zdXJlIHdlIGhhdmUgb3B0c1xuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAvLyBjcmVhdGUgdGhlIHZpZGVvIC8gYXVkaW8gZWxlbWVudHNcbiAgdGFyZ2V0ID0gdGhpcy5fcHJlcGFyZUVsZW1lbnQob3B0cywgdGFyZ2V0KTtcbiAgY29uc29sZS5sb2coJ2F0dGVtcHRpbmcgcmVuZGVyLCBzdHJlYW06ICcsIHRoaXMuc3RyZWFtKTtcblxuICAvLyBpZiBubyBzdHJlYW0gd2FzIHNwZWNpZmllZCwgd2FpdCBmb3IgdGhlIHN0cmVhbSB0byBpbml0aWFsaXplXG4gIGlmICghIHRoaXMuc3RyZWFtKSB7XG4gICAgdGhpcy5vbmNlKCdjYXB0dXJlJywgdGhpcy5fYmluZFN0cmVhbS5iaW5kKHRoaXMpKTtcbiAgfVxuICAvLyBvdGhlcndpc2UsIGJpbmQgdGhlIHN0cmVhbSBub3dcbiAgZWxzZSB7XG4gICAgdGhpcy5fYmluZFN0cmVhbSh0aGlzLnN0cmVhbSk7XG4gIH1cblxuICAvLyBpZiB3ZSBoYXZlIGEgY2FsbGJhY2sgdGhlbiB0cmlnZ2VyIG9uIHRoZSByZW5kZXIgZXZlbnRcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5vbmNlKCdyZW5kZXInLCBjYWxsYmFjayk7XG4gIH1cblxuICByZXR1cm4gdGFyZ2V0O1xufTtcblxuLyoqXG4gICMjIyBzdG9wKClcblxuICBTdG9wIHRoZSBtZWRpYSBzdHJlYW1cbioqL1xuTWVkaWEucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbihvcHRzKSB7XG4gIHZhciBtZWRpYSA9IHRoaXM7XG5cbiAgaWYgKCEgdGhpcy5zdHJlYW0pIHsgcmV0dXJuOyB9XG5cbiAgLy8gcmVtb3ZlIGJpbmRpbmdzXG4gIHRoaXMuX3VuYmluZChvcHRzKTtcblxuICAvLyBzdG9wIHRoZSBzdHJlYW0sIGFuZCB0ZWxsIHRoZSB3b3JsZFxuICB0aGlzLnN0cmVhbS5zdG9wKCk7XG5cbiAgLy8gb24gY2FwdHVyZSByZWJpbmRcbiAgdGhpcy5vbmNlKCdjYXB0dXJlJywgbWVkaWEuX2JpbmRTdHJlYW0uYmluZChtZWRpYSkpO1xuXG4gIC8vIHJlbW92ZSB0aGUgcmVmZXJlbmNlIHRvIHRoZSBzdHJlYW1cbiAgdGhpcy5zdHJlYW0gPSBudWxsO1xufTtcblxuLyoqXG4gICMjIERlYnVnZ2luZyBUaXBzXG5cbiAgQ2hyb21lIGFuZCBDaHJvbWl1bSBjYW4gYm90aCBiZSBzdGFydGVkIHdpdGggdGhlIGZvbGxvd2luZyBmbGFnOlxuXG4gIGBgYFxuICAtLXVzZS1mYWtlLWRldmljZS1mb3ItbWVkaWEtc3RyZWFtXG4gIGBgYFxuXG4gIFRoaXMgdXNlcyBhIGZha2Ugc3RyZWFtIGZvciB0aGUgZ2V0VXNlck1lZGlhKCkgY2FsbCByYXRoZXIgdGhhbiBhdHRlbXB0aW5nXG4gIHRvIGNhcHR1cmUgdGhlIGFjdHVhbCBjYW1lcmEuICBUaGlzIGlzIHVzZWZ1bCB3aGVuIGRvaW5nIGF1dG9tYXRlZCB0ZXN0aW5nXG4gIGFuZCBhbHNvIGlmIHlvdSB3YW50IHRvIHRlc3QgY29ubmVjdGl2aXR5IGJldHdlZW4gdHdvIGJyb3dzZXIgaW5zdGFuY2VzIGFuZFxuICB3YW50IHRvIGRpc3Rpbmd1aXNoIGJldHdlZW4gdGhlIHR3byBsb2NhbCB2aWRlb3MuXG5cbiAgIyMgSW50ZXJuYWwgTWV0aG9kc1xuXG4gIFRoZXJlIGFyZSBhIG51bWJlciBvZiBpbnRlcm5hbCBtZXRob2RzIHRoYXQgYXJlIHVzZWQgaW4gdGhlIGBydGMtbWVkaWFgXG4gIGltcGxlbWVudGF0aW9uLiBUaGVzZSBhcmUgb3V0bGluZWQgYmVsb3csIGJ1dCBub3QgZXhwZWN0ZWQgdG8gYmUgb2ZcbiAgZ2VuZXJhbCB1c2UuXG5cbioqL1xuXG5NZWRpYS5wcm90b3R5cGUuX2NyZWF0ZUJpbmRpbmcgPSBmdW5jdGlvbihvcHRzLCBlbGVtZW50KSB7XG4gIHRoaXMuX2JpbmRpbmdzLnB1c2goe1xuICAgIGVsOiBlbGVtZW50LFxuICAgIG9wdHM6IG9wdHNcbiAgfSk7XG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59O1xuXG4vKipcbiAgIyMjIF9wcmVwYXJlRWxlbWVudChvcHRzLCBlbGVtZW50KVxuXG4gIFRoZSBwcmVwYXJlRWxlbWVudCBmdW5jdGlvbiBpcyB1c2VkIHRvIHByZXBhcmUgRE9NIGVsZW1lbnRzIHRoYXQgd2lsbFxuICByZWNlaXZlIHRoZSBtZWRpYSBzdHJlYW1zIG9uY2UgdGhlIHN0cmVhbSBoYXZlIGJlZW4gc3VjY2Vzc2Z1bGx5IGNhcHR1cmVkLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuX3ByZXBhcmVFbGVtZW50ID0gZnVuY3Rpb24ob3B0cywgZWxlbWVudCkge1xuICB2YXIgcGFyZW50O1xuICB2YXIgdmFsaWRFbGVtZW50ID0gKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MVmlkZW9FbGVtZW50KSB8fFxuICAgICAgICAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxBdWRpb0VsZW1lbnQpO1xuICB2YXIgcHJlc2VydmVBc3BlY3RSYXRpbyA9XG4gICAgICAgIHR5cGVvZiBvcHRzLnByZXNlcnZlQXNwZWN0UmF0aW8gPT0gJ3VuZGVmaW5lZCcgfHxcbiAgICAgICAgb3B0cy5wcmVzZXJ2ZUFzcGVjdFJhdGlvO1xuXG4gIGlmICghIGVsZW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCByZW5kZXIgbWVkaWEgdG8gYSBudWxsIGVsZW1lbnQnKTtcbiAgfVxuXG4gIC8vIGlmIHRoZSBwbHVnaW4gd2FudHMgdG8gcHJlcGFyZSBlbGVtbmV0cywgdGhlbiBsZXQgaXRcbiAgaWYgKHRoaXMucGx1Z2luICYmIHR5cGVvZiB0aGlzLnBsdWdpbi5wcmVwYXJlRWxlbWVudCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NyZWF0ZUJpbmRpbmcoXG4gICAgICBvcHRzLFxuICAgICAgdGhpcy5wbHVnaW4ucHJlcGFyZUVsZW1lbnQuY2FsbCh0aGlzLl9waW5zdCwgb3B0cywgZWxlbWVudClcbiAgICApO1xuICB9XG5cbiAgLy8gcGVyZm9ybSBzb21lIGFkZGl0aW9uYWwgY2hlY2tzIGZvciB0aGluZ3MgdGhhdCBcImxvb2tcIiBsaWtlIGFcbiAgLy8gbWVkaWEgZWxlbWVudFxuICB2YWxpZEVsZW1lbnQgPSB2YWxpZEVsZW1lbnQgfHwgKHR5cGVvZiBlbGVtZW50LnBsYXkgPT0gJ2Z1bmN0aW9uJykgJiYgKFxuICAgIHR5cGVvZiBlbGVtZW50LnNyY09iamVjdCAhPSAndW5kZWZpbmVkJyB8fFxuICAgIHR5cGVvZiBlbGVtZW50Lm1velNyY09iamVjdCAhPSAndW5kZWZpbmVkJyB8fFxuICAgIHR5cGVvZiBlbGVtZW50LnNyYyAhPSAndW5kZWZpbmVkJyk7XG5cbiAgLy8gaWYgdGhlIGVsZW1lbnQgaXMgbm90IGEgdmlkZW8gZWxlbWVudCwgdGhlbiBjcmVhdGUgb25lXG4gIGlmICghIHZhbGlkRWxlbWVudCkge1xuICAgIHBhcmVudCA9IGVsZW1lbnQ7XG5cbiAgICAvLyBjcmVhdGUgYSBuZXcgdmlkZW8gZWxlbWVudFxuICAgIC8vIFRPRE86IGNyZWF0ZSBhbiBhcHByb3ByaWF0ZSBlbGVtZW50IGJhc2VkIG9uIHRoZSB0eXBlcyBvZiB0cmFja3NcbiAgICAvLyBhdmFpbGFibGVcbiAgICBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKTtcblxuICAgIC8vIGlmIHdlIGFyZSBwcmVzZXJ2aW5nIGFzcGVjdCByYXRpbyBkbyB0aGF0IG5vd1xuICAgIGlmIChwcmVzZXJ2ZUFzcGVjdFJhdGlvKSB7XG4gICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgncHJlc2VydmVBc3BlY3RSYXRpbycsICcnKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgdG8gdGhlIHBhcmVudFxuICAgIHBhcmVudC5hcHBlbmRDaGlsZChlbGVtZW50KTtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS1wbGF5aW5nJywgZmFsc2UpO1xuICB9XG5cbiAgLy8gaWYgbXV0ZWQsIGluamVjdCB0aGUgbXV0ZWQgYXR0cmlidXRlXG4gIGlmIChlbGVtZW50ICYmIHRoaXMubXV0ZWQpIHtcbiAgICBlbGVtZW50Lm11dGVkID0gdHJ1ZTtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnbXV0ZWQnLCAnJyk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fY3JlYXRlQmluZGluZyhvcHRzLCBlbGVtZW50KTtcbn07XG5cbi8qKlxuICAjIyMgX2JpbmRTdHJlYW0oc3RyZWFtKVxuXG4gIEJpbmQgYSBzdHJlYW0gdG8gcHJldmlvdXNseSBwcmVwYXJlZCBET00gZWxlbWVudHMuXG5cbioqL1xuTWVkaWEucHJvdG90eXBlLl9iaW5kU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIHZhciBtZWRpYSA9IHRoaXM7XG4gIHZhciBlbGVtZW50cyA9IFtdO1xuICB2YXIgd2FpdGluZyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGNoZWNrV2FpdGluZygpIHtcbiAgICAvLyBpZiB3ZSBoYXZlIG5vIHdhaXRpbmcgZWxlbWVudHMsIGJ1dCBzb21lIGVsZW1lbnRzXG4gICAgLy8gdHJpZ2dlciB0aGUgc3RhcnQgZXZlbnRcbiAgICBpZiAod2FpdGluZy5sZW5ndGggPT09IDAgJiYgZWxlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgbWVkaWEuZW1pdCgncmVuZGVyJywgZWxlbWVudHNbMF0pO1xuXG4gICAgICBlbGVtZW50cy5tYXAoZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlpbmcnLCB0cnVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNhblBsYXkoZXZ0KSB7XG4gICAgdmFyIGVsID0gZXZ0LnRhcmdldCB8fCBldnQuc3JjRWxlbWVudDtcbiAgICB2YXIgdmlkZW9JbmRleCA9IGVsZW1lbnRzLmluZGV4T2YoZWwpO1xuXG4gICAgaWYgKHZpZGVvSW5kZXggPj0gMCkge1xuICAgICAgd2FpdGluZy5zcGxpY2UodmlkZW9JbmRleCwgMSk7XG4gICAgfVxuXG4gICAgZWwucGxheSgpO1xuICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXknLCBjYW5QbGF5KTtcbiAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIGNhblBsYXkpO1xuICAgIGNoZWNrV2FpdGluZygpO1xuICB9XG5cbiAgLy8gaWYgd2UgaGF2ZSBhIHBsdWdpbiB0aGF0IGtub3dzIGhvdyB0byBhdHRhY2ggYSBzdHJlYW0sIHRoZW4gbGV0IGl0IGRvIGl0XG4gIGlmICh0aGlzLnBsdWdpbiAmJiB0eXBlb2YgdGhpcy5wbHVnaW4uYXR0YWNoU3RyZWFtID09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdGhpcy5wbHVnaW4uYXR0YWNoU3RyZWFtLmNhbGwodGhpcy5fcGluc3QsIHN0cmVhbSwgdGhpcy5fYmluZGluZ3MpO1xuICB9XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBiaW5kaW5ncyBhbmQgYmluZCB0aGUgc3RyZWFtXG4gIGVsZW1lbnRzID0gdGhpcy5fYmluZGluZ3MubWFwKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAvLyBjaGVjayBmb3Igc3JjT2JqZWN0XG4gICAgaWYgKHR5cGVvZiBiaW5kaW5nLmVsLnNyY09iamVjdCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgYmluZGluZy5lbC5zcmNPYmplY3QgPSBzdHJlYW07XG4gICAgfVxuICAgIC8vIGNoZWNrIGZvciBtb3pTcmNPYmplY3RcbiAgICBlbHNlIGlmICh0eXBlb2YgYmluZGluZy5lbC5tb3pTcmNPYmplY3QgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGJpbmRpbmcuZWwubW96U3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGJpbmRpbmcuZWwuc3JjID0gbWVkaWEuX2NyZWF0ZU9iamVjdFVSTChzdHJlYW0pIHx8IHN0cmVhbTtcbiAgICB9XG5cbiAgICAvLyBhdHRlbXB0IHBsYXliYWNrIChtYXkgbm90IHdvcmsgaWYgdGhlIHN0cmVhbSBpc24ndCBxdWl0ZSByZWFkeSlcbiAgICBiaW5kaW5nLmVsLnBsYXkoKTtcbiAgICByZXR1cm4gYmluZGluZy5lbDtcbiAgfSk7XG5cbiAgLy8gZmluZCB0aGUgZWxlbWVudHMgd2UgYXJlIHdhaXRpbmcgb25cbiAgd2FpdGluZyA9IGVsZW1lbnRzLmZpbHRlcihmdW5jdGlvbihlbCkge1xuICAgIHJldHVybiBlbC5yZWFkeVN0YXRlIDwgMzsgLy8gcmVhZHlzdGF0ZSA8IEhBVkVfRlVUVVJFX0RBVEFcbiAgfSk7XG5cbiAgLy8gd2FpdCBmb3IgYWxsIHRoZSB2aWRlbyBlbGVtZW50c1xuICB3YWl0aW5nLmZvckVhY2goZnVuY3Rpb24oZWwpIHtcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5JywgY2FuUGxheSwgZmFsc2UpO1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgY2FuUGxheSwgZmFsc2UpO1xuICB9KTtcblxuICBjaGVja1dhaXRpbmcoKTtcbn07XG5cbi8qKlxuICAjIyMgX3VuYmluZCgpXG5cbiAgR3JhY2VmdWxseSBkZXRhY2ggZWxlbWVudHMgdGhhdCBhcmUgdXNpbmcgdGhlIHN0cmVhbSBmcm9tIHRoZVxuICBjdXJyZW50IHN0cmVhbS5cbioqL1xuTWVkaWEucHJvdG90eXBlLl91bmJpbmQgPSBmdW5jdGlvbihvcHRzKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIG9wdHNcbiAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBiaW5kaW5ncyBhbmQgZGV0YWNoIHN0cmVhbXNcbiAgdGhpcy5fYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgdmFyIGVsZW1lbnQgPSBiaW5kaW5nLmVsO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBzb3VyY2VcbiAgICBlbGVtZW50LnNyYyA9IG51bGw7XG5cbiAgICAvLyBjaGVjayBmb3IgbW96XG4gICAgaWYgKGVsZW1lbnQubW96U3JjT2JqZWN0KSB7XG4gICAgICBlbGVtZW50Lm1velNyY09iamVjdCA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgZm9yIGN1cnJlbnRTcmNcbiAgICBpZiAoZWxlbWVudC5jdXJyZW50U3JjKSB7XG4gICAgICBlbGVtZW50LmN1cnJlbnRTcmMgPSBudWxsO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vKipcbiAgIyMjIF9jcmVhdGVPYmplY3RVcmwoc3RyZWFtKVxuXG4gIFRoaXMgbWV0aG9kIGlzIHVzZWQgdG8gY3JlYXRlIGFuIG9iamVjdCB1cmwgdGhhdCBjYW4gYmUgYXR0YWNoZWQgdG8gYSB2aWRlb1xuICBvciBhdWRpbyBlbGVtZW50LiAgT2JqZWN0IHVybHMgYXJlIGNhY2hlZCB0byBlbnN1cmUgb25seSBvbmUgaXMgY3JlYXRlZFxuICBwZXIgc3RyZWFtLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuX2NyZWF0ZU9iamVjdFVSTCA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICB0cnkge1xuICAgIHJldHVybiB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pO1xuICB9XG4gIGNhdGNoIChlKSB7XG4gIH1cbn07XG5cbi8qKlxuICAjIyMgX2hhbmRsZVN1Y2Nlc3Moc3RyZWFtKVxuXG4gIEhhbmRsZSB0aGUgc3VjY2VzcyBjb25kaXRpb24gb2YgYSBgZ2V0VXNlck1lZGlhYCBjYWxsLlxuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5faGFuZGxlU3VjY2VzcyA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAvLyB1cGRhdGUgdGhlIGFjdGl2ZSBzdHJlYW0gdGhhdCB3ZSBhcmUgY29ubmVjdGVkIHRvXG4gIHRoaXMuc3RyZWFtID0gc3RyZWFtO1xuXG4gIC8vIGVtaXQgdGhlIHN0cmVhbSBldmVudFxuICB0aGlzLmVtaXQoJ3N0cmVhbScsIHN0cmVhbSk7XG59O1xuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbi8qIGdsb2JhbCBuYXZpZ2F0b3I6IGZhbHNlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGJyb3dzZXIgPSByZXF1aXJlKCdkZXRlY3QtYnJvd3NlcicpO1xuXG4vKipcbiAgIyMgcnRjLWNvcmUvZGV0ZWN0XG5cbiAgQSBicm93c2VyIGRldGVjdGlvbiBoZWxwZXIgZm9yIGFjY2Vzc2luZyBwcmVmaXgtZnJlZSB2ZXJzaW9ucyBvZiB0aGUgdmFyaW91c1xuICBXZWJSVEMgdHlwZXMuXG5cbiAgIyMjIEV4YW1wbGUgVXNhZ2VcblxuICBJZiB5b3Ugd2FudGVkIHRvIGdldCB0aGUgbmF0aXZlIGBSVENQZWVyQ29ubmVjdGlvbmAgcHJvdG90eXBlIGluIGFueSBicm93c2VyXG4gIHlvdSBjb3VsZCBkbyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGpzXG4gIHZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTsgLy8gYWxzbyBhdmFpbGFibGUgaW4gcnRjL2RldGVjdFxuICB2YXIgUlRDUGVlckNvbm5lY3Rpb24gPSBkZXRlY3QoJ1JUQ1BlZXJDb25uZWN0aW9uJyk7XG4gIGBgYFxuXG4gIFRoaXMgd291bGQgcHJvdmlkZSB3aGF0ZXZlciB0aGUgYnJvd3NlciBwcmVmaXhlZCB2ZXJzaW9uIG9mIHRoZVxuICBSVENQZWVyQ29ubmVjdGlvbiBpcyBhdmFpbGFibGUgKGB3ZWJraXRSVENQZWVyQ29ubmVjdGlvbmAsXG4gIGBtb3pSVENQZWVyQ29ubmVjdGlvbmAsIGV0YykuXG4qKi9cbnZhciBkZXRlY3QgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCwgcHJlZml4ZXMpIHtcbiAgdmFyIHByZWZpeElkeDtcbiAgdmFyIHByZWZpeDtcbiAgdmFyIHRlc3ROYW1lO1xuICB2YXIgaG9zdE9iamVjdCA9IHRoaXMgfHwgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB1bmRlZmluZWQpO1xuXG4gIC8vIGlmIHdlIGhhdmUgbm8gaG9zdCBvYmplY3QsIHRoZW4gYWJvcnRcbiAgaWYgKCEgaG9zdE9iamVjdCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGluaXRpYWxpc2UgdG8gZGVmYXVsdCBwcmVmaXhlc1xuICAvLyAocmV2ZXJzZSBvcmRlciBhcyB3ZSB1c2UgYSBkZWNyZW1lbnRpbmcgZm9yIGxvb3ApXG4gIHByZWZpeGVzID0gKHByZWZpeGVzIHx8IFsnbXMnLCAnbycsICdtb3onLCAnd2Via2l0J10pLmNvbmNhdCgnJyk7XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBwcmVmaXhlcyBhbmQgcmV0dXJuIHRoZSBjbGFzcyBpZiBmb3VuZCBpbiBnbG9iYWxcbiAgZm9yIChwcmVmaXhJZHggPSBwcmVmaXhlcy5sZW5ndGg7IHByZWZpeElkeC0tOyApIHtcbiAgICBwcmVmaXggPSBwcmVmaXhlc1twcmVmaXhJZHhdO1xuXG4gICAgLy8gY29uc3RydWN0IHRoZSB0ZXN0IGNsYXNzIG5hbWVcbiAgICAvLyBpZiB3ZSBoYXZlIGEgcHJlZml4IGVuc3VyZSB0aGUgdGFyZ2V0IGhhcyBhbiB1cHBlcmNhc2UgZmlyc3QgY2hhcmFjdGVyXG4gICAgLy8gc3VjaCB0aGF0IGEgdGVzdCBmb3IgZ2V0VXNlck1lZGlhIHdvdWxkIHJlc3VsdCBpbiBhXG4gICAgLy8gc2VhcmNoIGZvciB3ZWJraXRHZXRVc2VyTWVkaWFcbiAgICB0ZXN0TmFtZSA9IHByZWZpeCArIChwcmVmaXggP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHRhcmdldC5zbGljZSgxKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0KTtcblxuICAgIGlmICh0eXBlb2YgaG9zdE9iamVjdFt0ZXN0TmFtZV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIC8vIHVwZGF0ZSB0aGUgbGFzdCB1c2VkIHByZWZpeFxuICAgICAgZGV0ZWN0LmJyb3dzZXIgPSBkZXRlY3QuYnJvd3NlciB8fCBwcmVmaXgudG9Mb3dlckNhc2UoKTtcblxuICAgICAgLy8gcmV0dXJuIHRoZSBob3N0IG9iamVjdCBtZW1iZXJcbiAgICAgIHJldHVybiBob3N0T2JqZWN0W3RhcmdldF0gPSBob3N0T2JqZWN0W3Rlc3ROYW1lXTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGRldGVjdCBtb3ppbGxhICh5ZXMsIHRoaXMgZmVlbHMgZGlydHkpXG5kZXRlY3QubW96ID0gdHlwZW9mIG5hdmlnYXRvciAhPSAndW5kZWZpbmVkJyAmJiAhIW5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWE7XG5cbi8vIHNldCB0aGUgYnJvd3NlciBhbmQgYnJvd3NlciB2ZXJzaW9uXG5kZXRlY3QuYnJvd3NlciA9IGJyb3dzZXIubmFtZTtcbmRldGVjdC5icm93c2VyVmVyc2lvbiA9IGRldGVjdC52ZXJzaW9uID0gYnJvd3Nlci52ZXJzaW9uO1xuIiwidmFyIGJyb3dzZXJzID0gW1xuICBbICdjaHJvbWUnLCAvQ2hyb20oPzplfGl1bSlcXC8oWzAtOVxcLl0rKSg6P1xcc3wkKS8gXSxcbiAgWyAnZmlyZWZveCcsIC9GaXJlZm94XFwvKFswLTlcXC5dKykoPzpcXHN8JCkvIF0sXG4gIFsgJ29wZXJhJywgL09wZXJhXFwvKFswLTlcXC5dKykoPzpcXHN8JCkvIF0sXG4gIFsgJ2llJywgL1RyaWRlbnRcXC83XFwuMC4qcnZcXDooWzAtOVxcLl0rKVxcKS4qR2Vja28kLyBdXG5dO1xuXG52YXIgbWF0Y2ggPSBicm93c2Vycy5tYXAobWF0Y2gpLmZpbHRlcihpc01hdGNoKVswXTtcbnZhciBwYXJ0cyA9IG1hdGNoICYmIG1hdGNoWzNdLnNwbGl0KCcuJykuc2xpY2UoMCwzKTtcblxud2hpbGUgKHBhcnRzLmxlbmd0aCA8IDMpIHtcbiAgcGFydHMucHVzaCgnMCcpO1xufVxuXG4vLyBzZXQgdGhlIG5hbWUgYW5kIHZlcnNpb25cbmV4cG9ydHMubmFtZSA9IG1hdGNoICYmIG1hdGNoWzBdO1xuZXhwb3J0cy52ZXJzaW9uID0gcGFydHMuam9pbignLicpO1xuXG5mdW5jdGlvbiBtYXRjaChwYWlyKSB7XG4gIHJldHVybiBwYWlyLmNvbmNhdChwYWlyWzFdLmV4ZWMobmF2aWdhdG9yLnVzZXJBZ2VudCkpO1xufVxuXG5mdW5jdGlvbiBpc01hdGNoKHBhaXIpIHtcbiAgcmV0dXJuICEhcGFpclsyXTtcbn1cbiIsInZhciBkZXRlY3QgPSByZXF1aXJlKCcuL2RldGVjdCcpO1xudmFyIHJlcXVpcmVkRnVuY3Rpb25zID0gW1xuICAnaW5pdCdcbl07XG5cbmZ1bmN0aW9uIGlzU3VwcG9ydGVkKHBsdWdpbikge1xuICByZXR1cm4gcGx1Z2luICYmIHR5cGVvZiBwbHVnaW4uc3VwcG9ydGVkID09ICdmdW5jdGlvbicgJiYgcGx1Z2luLnN1cHBvcnRlZChkZXRlY3QpO1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkKHBsdWdpbikge1xuICB2YXIgc3VwcG9ydGVkRnVuY3Rpb25zID0gcmVxdWlyZWRGdW5jdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBwbHVnaW5bZm5dID09ICdmdW5jdGlvbic7XG4gIH0pO1xuXG4gIHJldHVybiBzdXBwb3J0ZWRGdW5jdGlvbnMubGVuZ3RoID09PSByZXF1aXJlZEZ1bmN0aW9ucy5sZW5ndGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGx1Z2lucykge1xuICByZXR1cm4gW10uY29uY2F0KHBsdWdpbnMgfHwgW10pLmZpbHRlcihpc1N1cHBvcnRlZCkuZmlsdGVyKGlzVmFsaWQpWzBdO1xufVxuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBydGMgPSByZXF1aXJlKCdydGMtdG9vbHMnKTtcbnZhciBjbGVhbnVwID0gcmVxdWlyZSgncnRjLXRvb2xzL2NsZWFudXAnKTtcbnZhciBkZWJ1ZyA9IHJ0Yy5sb2dnZXIoJ3J0Yy1xdWlja2Nvbm5lY3QnKTtcbnZhciBzaWduYWxsZXIgPSByZXF1aXJlKCdydGMtc2lnbmFsbGVyJyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG52YXIgZ2V0YWJsZSA9IHJlcXVpcmUoJ2NvZy9nZXRhYmxlJyk7XG52YXIgcmVUcmFpbGluZ1NsYXNoID0gL1xcLyQvO1xuXG4vKipcbiAgIyBydGMtcXVpY2tjb25uZWN0XG5cbiAgVGhpcyBpcyBhIGhpZ2ggbGV2ZWwgaGVscGVyIG1vZHVsZSBkZXNpZ25lZCB0byBoZWxwIHlvdSBnZXQgdXBcbiAgYW4gcnVubmluZyB3aXRoIFdlYlJUQyByZWFsbHksIHJlYWxseSBxdWlja2x5LiAgQnkgdXNpbmcgdGhpcyBtb2R1bGUgeW91XG4gIGFyZSB0cmFkaW5nIG9mZiBzb21lIGZsZXhpYmlsaXR5LCBzbyBpZiB5b3UgbmVlZCBhIG1vcmUgZmxleGlibGVcbiAgY29uZmlndXJhdGlvbiB5b3Ugc2hvdWxkIGRyaWxsIGRvd24gaW50byBsb3dlciBsZXZlbCBjb21wb25lbnRzIG9mIHRoZVxuICBbcnRjLmlvXShodHRwOi8vd3d3LnJ0Yy5pbykgc3VpdGUuICBJbiBwYXJ0aWN1bGFyIHlvdSBzaG91bGQgY2hlY2sgb3V0XG4gIFtydGNdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjKS5cblxuICAjIyBVcGdyYWRpbmcgdG8gMS4wXG5cbiAgVGhlIFt1cGdyYWRpbmcgdG8gMS4wIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXF1aWNrY29ubmVjdC9ibG9iL21hc3Rlci9kb2NzL3VwZ3JhZGluZy10by0xLjAubWQpXG4gIHByb3ZpZGVzIHNvbWUgaW5mb3JtYXRpb24gb24gd2hhdCB5b3UgbmVlZCB0byBjaGFuZ2UgdG8gdXBncmFkZSB0b1xuICBgcnRjLXF1aWNrY29ubmVjdEAxLjBgLiAgQWRkaXRpb25hbGx5LCB0aGVcbiAgW3F1aWNrY29ubmVjdCBkZW1vIGFwcF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGNpby1kZW1vLXF1aWNrY29ubmVjdClcbiAgaGFzIGJlZW4gdXBkYXRlZCB3aGljaCBzaG91bGQgcHJvdmlkZSBzb21lIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24uXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIEluIHRoZSBzaW1wbGVzdCBjYXNlIHlvdSBzaW1wbHkgY2FsbCBxdWlja2Nvbm5lY3Qgd2l0aCBhIHNpbmdsZSBzdHJpbmdcbiAgYXJndW1lbnQgd2hpY2ggdGVsbHMgcXVpY2tjb25uZWN0IHdoaWNoIHNlcnZlciB0byB1c2UgZm9yIHNpZ25hbGluZzpcblxuICA8PDwgZXhhbXBsZXMvc2ltcGxlLmpzXG5cbiAgPDw8IGRvY3MvZXZlbnRzLm1kXG5cbiAgPDw8IGRvY3MvZXhhbXBsZXMubWRcblxuICAjIyBSZWdhcmRpbmcgU2lnbmFsbGluZyBhbmQgYSBTaWduYWxsaW5nIFNlcnZlclxuXG4gIFNpZ25hbGluZyBpcyBhbiBpbXBvcnRhbnQgcGFydCBvZiBzZXR0aW5nIHVwIGEgV2ViUlRDIGNvbm5lY3Rpb24gYW5kIGZvclxuICBvdXIgZXhhbXBsZXMgd2UgdXNlIG91ciBvd24gdGVzdCBpbnN0YW5jZSBvZiB0aGVcbiAgW3J0Yy1zd2l0Y2hib2FyZF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc3dpdGNoYm9hcmQpLiBGb3IgeW91clxuICB0ZXN0aW5nIGFuZCBkZXZlbG9wbWVudCB5b3UgYXJlIG1vcmUgdGhhbiB3ZWxjb21lIHRvIHVzZSB0aGlzIGFsc28sIGJ1dFxuICBqdXN0IGJlIGF3YXJlIHRoYXQgd2UgdXNlIHRoaXMgZm9yIG91ciB0ZXN0aW5nIHNvIGl0IG1heSBnbyB1cCBhbmQgZG93blxuICBhIGxpdHRsZS4gIElmIHlvdSBuZWVkIHNvbWV0aGluZyBtb3JlIHN0YWJsZSwgd2h5IG5vdCBjb25zaWRlciBkZXBsb3lpbmdcbiAgYW4gaW5zdGFuY2Ugb2YgdGhlIHN3aXRjaGJvYXJkIHlvdXJzZWxmIC0gaXQncyBwcmV0dHkgZWFzeSA6KVxuXG4gICMjIFJlZmVyZW5jZVxuXG4gIGBgYFxuICBxdWlja2Nvbm5lY3Qoc2lnbmFsaG9zdCwgb3B0cz8pID0+IHJ0Yy1zaWdhbGxlciBpbnN0YW5jZSAoKyBoZWxwZXJzKVxuICBgYGBcblxuICAjIyMgVmFsaWQgUXVpY2sgQ29ubmVjdCBPcHRpb25zXG5cbiAgVGhlIG9wdGlvbnMgcHJvdmlkZWQgdG8gdGhlIGBydGMtcXVpY2tjb25uZWN0YCBtb2R1bGUgZnVuY3Rpb24gaW5mbHVlbmNlIHRoZVxuICBiZWhhdmlvdXIgb2Ygc29tZSBvZiB0aGUgdW5kZXJseWluZyBjb21wb25lbnRzIHVzZWQgZnJvbSB0aGUgcnRjLmlvIHN1aXRlLlxuXG4gIExpc3RlZCBiZWxvdyBhcmUgc29tZSBvZiB0aGUgY29tbW9ubHkgdXNlZCBvcHRpb25zOlxuXG4gIC0gYG5zYCAoZGVmYXVsdDogJycpXG5cbiAgICBBbiBvcHRpb25hbCBuYW1lc3BhY2UgZm9yIHlvdXIgc2lnbmFsbGluZyByb29tLiAgV2hpbGUgcXVpY2tjb25uZWN0XG4gICAgd2lsbCBnZW5lcmF0ZSBhIHVuaXF1ZSBoYXNoIGZvciB0aGUgcm9vbSwgdGhpcyBjYW4gYmUgbWFkZSB0byBiZSBtb3JlXG4gICAgdW5pcXVlIGJ5IHByb3ZpZGluZyBhIG5hbWVzcGFjZS4gIFVzaW5nIGEgbmFtZXNwYWNlIG1lYW5zIHR3byBkZW1vc1xuICAgIHRoYXQgaGF2ZSBnZW5lcmF0ZWQgdGhlIHNhbWUgaGFzaCBidXQgdXNlIGEgZGlmZmVyZW50IG5hbWVzcGFjZSB3aWxsIGJlXG4gICAgaW4gZGlmZmVyZW50IHJvb21zLlxuXG4gIC0gYHJvb21gIChkZWZhdWx0OiBudWxsKSBfYWRkZWQgMC42X1xuXG4gICAgUmF0aGVyIHRoYW4gdXNlIHRoZSBpbnRlcm5hbCBoYXNoIGdlbmVyYXRpb25cbiAgICAocGx1cyBvcHRpb25hbCBuYW1lc3BhY2UpIGZvciByb29tIG5hbWUgZ2VuZXJhdGlvbiwgc2ltcGx5IHVzZSB0aGlzIHJvb21cbiAgICBuYW1lIGluc3RlYWQuICBfX05PVEU6X18gVXNlIG9mIHRoZSBgcm9vbWAgb3B0aW9uIHRha2VzIHByZWNlbmRlbmNlIG92ZXJcbiAgICBgbnNgLlxuXG4gIC0gYGRlYnVnYCAoZGVmYXVsdDogZmFsc2UpXG5cbiAgV3JpdGUgcnRjLmlvIHN1aXRlIGRlYnVnIG91dHB1dCB0byB0aGUgYnJvd3NlciBjb25zb2xlLlxuXG4gICMjIyMgT3B0aW9ucyBmb3IgUGVlciBDb25uZWN0aW9uIENyZWF0aW9uXG5cbiAgT3B0aW9ucyB0aGF0IGFyZSBwYXNzZWQgb250byB0aGVcbiAgW3J0Yy5jcmVhdGVDb25uZWN0aW9uXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0YyNjcmVhdGVjb25uZWN0aW9ub3B0cy1jb25zdHJhaW50cylcbiAgZnVuY3Rpb246XG5cbiAgLSBgaWNlU2VydmVyc2BcblxuICBUaGlzIHByb3ZpZGVzIGEgbGlzdCBvZiBpY2Ugc2VydmVycyB0aGF0IGNhbiBiZSB1c2VkIHRvIGhlbHAgbmVnb3RpYXRlIGFcbiAgY29ubmVjdGlvbiBiZXR3ZWVuIHBlZXJzLlxuXG4gICMjIyMgT3B0aW9ucyBmb3IgUDJQIG5lZ290aWF0aW9uXG5cbiAgVW5kZXIgdGhlIGhvb2QsIHF1aWNrY29ubmVjdCB1c2VzIHRoZVxuICBbcnRjL2NvdXBsZV0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMjcnRjY291cGxlKSBsb2dpYywgYW5kIHRoZSBvcHRpb25zXG4gIHBhc3NlZCB0byBxdWlja2Nvbm5lY3QgYXJlIGFsc28gcGFzc2VkIG9udG8gdGhpcyBmdW5jdGlvbi5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNpZ25hbGhvc3QsIG9wdHMpIHtcbiAgdmFyIGhhc2ggPSB0eXBlb2YgbG9jYXRpb24gIT0gJ3VuZGVmaW5lZCcgJiYgbG9jYXRpb24uaGFzaC5zbGljZSgxKTtcbiAgdmFyIHNpZ25hbGxlciA9IHJlcXVpcmUoJ3J0Yy1zaWduYWxsZXInKShzaWduYWxob3N0LCBvcHRzKTtcblxuICAvLyBpbml0IGNvbmZpZ3VyYWJsZSB2YXJzXG4gIHZhciBucyA9IChvcHRzIHx8IHt9KS5ucyB8fCAnJztcbiAgdmFyIHJvb20gPSAob3B0cyB8fCB7fSkucm9vbTtcbiAgdmFyIGRlYnVnZ2luZyA9IChvcHRzIHx8IHt9KS5kZWJ1ZztcbiAgdmFyIHByb2ZpbGUgPSB7fTtcbiAgdmFyIGFubm91bmNlZCA9IGZhbHNlO1xuXG4gIC8vIGNvbGxlY3QgdGhlIGxvY2FsIHN0cmVhbXNcbiAgdmFyIGxvY2FsU3RyZWFtcyA9IFtdO1xuXG4gIC8vIGNyZWF0ZSB0aGUgY2FsbHMgbWFwXG4gIHZhciBjYWxscyA9IHNpZ25hbGxlci5jYWxscyA9IGdldGFibGUoe30pO1xuXG4gIC8vIGNyZWF0ZSB0aGUga25vd24gZGF0YSBjaGFubmVscyByZWdpc3RyeVxuICB2YXIgY2hhbm5lbHMgPSB7fTtcblxuICBmdW5jdGlvbiBjYWxsQ3JlYXRlKGlkLCBwYywgZGF0YSkge1xuICAgIGNhbGxzLnNldChpZCwge1xuICAgICAgYWN0aXZlOiBmYWxzZSxcbiAgICAgIHBjOiBwYyxcbiAgICAgIGNoYW5uZWxzOiBnZXRhYmxlKHt9KSxcbiAgICAgIGRhdGE6IGRhdGEsXG4gICAgICBzdHJlYW1zOiBbXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2FsbEVuZChpZCkge1xuICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KGlkKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgbm8gZGF0YSwgdGhlbiBkbyBub3RoaW5nXG4gICAgaWYgKCEgY2FsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGRlYnVnKCdlbmRpbmcgY2FsbCB0bzogJyArIGlkKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgbm8gZGF0YSwgdGhlbiByZXR1cm5cbiAgICBjYWxsLmNoYW5uZWxzLmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGxhYmVsKSB7XG4gICAgICB2YXIgYXJncyA9IFtpZCwgY2FsbC5jaGFubmVscy5nZXQobGFiZWwpLCBsYWJlbF07XG5cbiAgICAgIC8vIGVtaXQgdGhlIHBsYWluIGNoYW5uZWw6Y2xvc2VkIGV2ZW50XG4gICAgICBzaWduYWxsZXIuZW1pdC5hcHBseShzaWduYWxsZXIsIFsnY2hhbm5lbDpjbG9zZWQnXS5jb25jYXQoYXJncykpO1xuXG4gICAgICAvLyBlbWl0IHRoZSBsYWJlbGxlZCB2ZXJzaW9uIG9mIHRoZSBldmVudFxuICAgICAgc2lnbmFsbGVyLmVtaXQuYXBwbHkoc2lnbmFsbGVyLCBbJ2NoYW5uZWw6Y2xvc2VkOicgKyBsYWJlbF0uY29uY2F0KGFyZ3MpKTtcbiAgICB9KTtcblxuICAgIC8vIHRyaWdnZXIgc3RyZWFtOnJlbW92ZWQgZXZlbnRzIGZvciBlYWNoIG9mIHRoZSByZW1vdGVzdHJlYW1zIGluIHRoZSBwY1xuICAgIGNhbGwuc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgc2lnbmFsbGVyLmVtaXQoJ3N0cmVhbTpyZW1vdmVkJywgaWQsIHN0cmVhbSk7XG4gICAgfSk7XG5cbiAgICAvLyB0cmlnZ2VyIHRoZSBjYWxsOmVuZGVkIGV2ZW50XG4gICAgc2lnbmFsbGVyLmVtaXQoJ2NhbGw6ZW5kZWQnLCBpZCwgY2FsbC5wYyk7XG5cbiAgICAvLyBlbnN1cmUgdGhlIHBlZXIgY29ubmVjdGlvbiBpcyBwcm9wZXJseSBjbGVhbmVkIHVwXG4gICAgY2xlYW51cChjYWxsLnBjKTtcblxuICAgIC8vIGRlbGV0ZSB0aGUgY2FsbCBkYXRhXG4gICAgY2FsbHMuZGVsZXRlKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbGxTdGFydChpZCwgcGMsIGRhdGEpIHtcbiAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChpZCk7XG4gICAgdmFyIHN0cmVhbXMgPSBbXS5jb25jYXQocGMuZ2V0UmVtb3RlU3RyZWFtcygpKTtcblxuICAgIC8vIGZsYWcgdGhlIGNhbGwgYXMgYWN0aXZlXG4gICAgY2FsbC5hY3RpdmUgPSB0cnVlO1xuICAgIGNhbGwuc3RyZWFtcyA9IFtdLmNvbmNhdChwYy5nZXRSZW1vdGVTdHJlYW1zKCkpO1xuXG4gICAgcGMub25hZGRzdHJlYW0gPSBjcmVhdGVTdHJlYW1BZGRIYW5kbGVyKGlkKTtcbiAgICBwYy5vbnJlbW92ZXN0cmVhbSA9IGNyZWF0ZVN0cmVhbVJlbW92ZUhhbmRsZXIoaWQpO1xuXG4gICAgZGVidWcoc2lnbmFsbGVyLmlkICsgJyAtICcgKyBpZCArICcgY2FsbCBzdGFydDogJyArIHN0cmVhbXMubGVuZ3RoICsgJyBzdHJlYW1zJyk7XG4gICAgc2lnbmFsbGVyLmVtaXQoJ2NhbGw6c3RhcnRlZCcsIGlkLCBwYywgZGF0YSk7XG5cbiAgICAvLyBleGFtaW5lIHRoZSBleGlzdGluZyByZW1vdGUgc3RyZWFtcyBhZnRlciBhIHNob3J0IGRlbGF5XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCBhbnkgcmVtb3RlIHN0cmVhbXNcbiAgICAgIHN0cmVhbXMuZm9yRWFjaChyZWNlaXZlUmVtb3RlU3RyZWFtKGlkKSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVTdHJlYW1BZGRIYW5kbGVyKGlkKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgZGVidWcoJ3BlZXIgJyArIGlkICsgJyBhZGRlZCBzdHJlYW0nKTtcbiAgICAgIHVwZGF0ZVJlbW90ZVN0cmVhbXMoaWQpO1xuICAgICAgcmVjZWl2ZVJlbW90ZVN0cmVhbShpZCkoZXZ0LnN0cmVhbSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlU3RyZWFtUmVtb3ZlSGFuZGxlcihpZCkge1xuICAgIHJldHVybiBmdW5jdGlvbihldnQpIHtcbiAgICAgIGRlYnVnKCdwZWVyICcgKyBpZCArICcgcmVtb3ZlZCBzdHJlYW0nKTtcbiAgICAgIHVwZGF0ZVJlbW90ZVN0cmVhbXMoaWQpO1xuICAgICAgc2lnbmFsbGVyLmVtaXQoJ3N0cmVhbTpyZW1vdmVkJywgaWQsIGV2dC5zdHJlYW0pO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRBY3RpdmVDYWxsKHBlZXJJZCkge1xuICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KHBlZXJJZCk7XG5cbiAgICBpZiAoISBjYWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGFjdGl2ZSBjYWxsIGZvciBwZWVyOiAnICsgcGVlcklkKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2FsbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdvdFBlZXJDaGFubmVsKGNoYW5uZWwsIHBjLCBkYXRhKSB7XG4gICAgdmFyIGNoYW5uZWxNb25pdG9yO1xuXG4gICAgZnVuY3Rpb24gY2hhbm5lbFJlYWR5KCkge1xuICAgICAgdmFyIGNhbGwgPSBjYWxscy5nZXQoZGF0YS5pZCk7XG4gICAgICB2YXIgYXJncyA9IFsgZGF0YS5pZCwgY2hhbm5lbCwgZGF0YSwgcGMgXTtcblxuICAgICAgLy8gZGVjb3VwbGUgdGhlIGNoYW5uZWwub25vcGVuIGxpc3RlbmVyXG4gICAgICBkZWJ1ZygncmVwb3J0aW5nIGNoYW5uZWwgXCInICsgY2hhbm5lbC5sYWJlbCArICdcIiByZWFkeSwgaGF2ZSBjYWxsOiAnICsgKCEhY2FsbCkpO1xuICAgICAgY2xlYXJJbnRlcnZhbChjaGFubmVsTW9uaXRvcik7XG4gICAgICBjaGFubmVsLm9ub3BlbiA9IG51bGw7XG5cbiAgICAgIC8vIHNhdmUgdGhlIGNoYW5uZWxcbiAgICAgIGlmIChjYWxsKSB7XG4gICAgICAgIGNhbGwuY2hhbm5lbHMuc2V0KGNoYW5uZWwubGFiZWwsIGNoYW5uZWwpO1xuICAgICAgfVxuXG4gICAgICAvLyB0cmlnZ2VyIHRoZSAlY2hhbm5lbC5sYWJlbCU6b3BlbiBldmVudFxuICAgICAgZGVidWcoJ3RyaWdnZXJpbmcgY2hhbm5lbDpvcGVuZWQgZXZlbnRzIGZvciBjaGFubmVsOiAnICsgY2hhbm5lbC5sYWJlbCk7XG5cbiAgICAgIC8vIGVtaXQgdGhlIHBsYWluIGNoYW5uZWw6b3BlbmVkIGV2ZW50XG4gICAgICBzaWduYWxsZXIuZW1pdC5hcHBseShzaWduYWxsZXIsIFsnY2hhbm5lbDpvcGVuZWQnXS5jb25jYXQoYXJncykpO1xuXG4gICAgICAvLyBlbWl0IHRoZSBjaGFubmVsOm9wZW5lZDolbGFiZWwlIGV2ZVxuICAgICAgc2lnbmFsbGVyLmVtaXQuYXBwbHkoXG4gICAgICAgIHNpZ25hbGxlcixcbiAgICAgICAgWydjaGFubmVsOm9wZW5lZDonICsgY2hhbm5lbC5sYWJlbF0uY29uY2F0KGFyZ3MpXG4gICAgICApO1xuICAgIH1cblxuICAgIGRlYnVnKCdjaGFubmVsICcgKyBjaGFubmVsLmxhYmVsICsgJyBkaXNjb3ZlcmVkIGZvciBwZWVyOiAnICsgZGF0YS5pZCk7XG4gICAgaWYgKGNoYW5uZWwucmVhZHlTdGF0ZSA9PT0gJ29wZW4nKSB7XG4gICAgICByZXR1cm4gY2hhbm5lbFJlYWR5KCk7XG4gICAgfVxuXG4gICAgZGVidWcoJ2NoYW5uZWwgbm90IHJlYWR5LCBjdXJyZW50IHN0YXRlID0gJyArIGNoYW5uZWwucmVhZHlTdGF0ZSk7XG4gICAgY2hhbm5lbC5vbm9wZW4gPSBjaGFubmVsUmVhZHk7XG5cbiAgICAvLyBtb25pdG9yIHRoZSBjaGFubmVsIG9wZW4gKGRvbid0IHRydXN0IHRoZSBjaGFubmVsIG9wZW4gZXZlbnQganVzdCB5ZXQpXG4gICAgY2hhbm5lbE1vbml0b3IgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgIGRlYnVnKCdjaGVja2luZyBjaGFubmVsIHN0YXRlLCBjdXJyZW50IHN0YXRlID0gJyArIGNoYW5uZWwucmVhZHlTdGF0ZSk7XG4gICAgICBpZiAoY2hhbm5lbC5yZWFkeVN0YXRlID09PSAnb3BlbicpIHtcbiAgICAgICAgY2hhbm5lbFJlYWR5KCk7XG4gICAgICB9XG4gICAgfSwgNTAwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVBlZXJBbm5vdW5jZShkYXRhKSB7XG4gICAgdmFyIHBjO1xuICAgIHZhciBtb25pdG9yO1xuXG4gICAgLy8gaWYgdGhlIHJvb20gaXMgbm90IGEgbWF0Y2gsIGFib3J0XG4gICAgaWYgKGRhdGEucm9vbSAhPT0gcm9vbSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZSBhIHBlZXIgY29ubmVjdGlvblxuICAgIHBjID0gcnRjLmNyZWF0ZUNvbm5lY3Rpb24ob3B0cywgKG9wdHMgfHwge30pLmNvbnN0cmFpbnRzKTtcblxuICAgIC8vIGFkZCB0aGlzIGNvbm5lY3Rpb24gdG8gdGhlIGNhbGxzIGxpc3RcbiAgICBjYWxsQ3JlYXRlKGRhdGEuaWQsIHBjLCBkYXRhKTtcblxuICAgIC8vIGFkZCB0aGUgbG9jYWwgc3RyZWFtc1xuICAgIGxvY2FsU3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSwgaWR4KSB7XG4gICAgICBwYy5hZGRTdHJlYW0oc3RyZWFtKTtcbiAgICB9KTtcblxuICAgIC8vIGFkZCB0aGUgZGF0YSBjaGFubmVsc1xuICAgIC8vIGRvIHRoaXMgZGlmZmVyZW50bHkgYmFzZWQgb24gd2hldGhlciB0aGUgY29ubmVjdGlvbiBpcyBhXG4gICAgLy8gbWFzdGVyIG9yIGEgc2xhdmUgY29ubmVjdGlvblxuICAgIGlmIChzaWduYWxsZXIuaXNNYXN0ZXIoZGF0YS5pZCkpIHtcbiAgICAgIGRlYnVnKCdpcyBtYXN0ZXIsIGNyZWF0aW5nIGRhdGEgY2hhbm5lbHM6ICcsIE9iamVjdC5rZXlzKGNoYW5uZWxzKSk7XG5cbiAgICAgIC8vIGNyZWF0ZSB0aGUgY2hhbm5lbHNcbiAgICAgIE9iamVjdC5rZXlzKGNoYW5uZWxzKS5mb3JFYWNoKGZ1bmN0aW9uKGxhYmVsKSB7XG4gICAgICAgZ290UGVlckNoYW5uZWwocGMuY3JlYXRlRGF0YUNoYW5uZWwobGFiZWwsIGNoYW5uZWxzW2xhYmVsXSksIHBjLCBkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHBjLm9uZGF0YWNoYW5uZWwgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBldnQgJiYgZXZ0LmNoYW5uZWw7XG5cbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBubyBjaGFubmVsLCBhYm9ydFxuICAgICAgICBpZiAoISBjaGFubmVsKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYW5uZWxzW2NoYW5uZWwubGFiZWxdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBnb3RQZWVyQ2hhbm5lbChjaGFubmVsLCBwYywgZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gY291cGxlIHRoZSBjb25uZWN0aW9uc1xuICAgIGRlYnVnKCdjb3VwbGluZyAnICsgc2lnbmFsbGVyLmlkICsgJyB0byAnICsgZGF0YS5pZCk7XG4gICAgbW9uaXRvciA9IHJ0Yy5jb3VwbGUocGMsIGRhdGEuaWQsIHNpZ25hbGxlciwgb3B0cyk7XG5cbiAgICAvLyBvbmNlIGFjdGl2ZSwgdHJpZ2dlciB0aGUgcGVlciBjb25uZWN0IGV2ZW50XG4gICAgbW9uaXRvci5vbmNlKCdjb25uZWN0ZWQnLCBjYWxsU3RhcnQuYmluZChudWxsLCBkYXRhLmlkLCBwYywgZGF0YSkpXG4gICAgbW9uaXRvci5vbmNlKCdjbG9zZWQnLCBjYWxsRW5kLmJpbmQobnVsbCwgZGF0YS5pZCkpO1xuXG4gICAgLy8gaWYgd2UgYXJlIHRoZSBtYXN0ZXIgY29ubm5lY3Rpb24sIGNyZWF0ZSB0aGUgb2ZmZXJcbiAgICAvLyBOT1RFOiB0aGlzIG9ubHkgcmVhbGx5IGZvciB0aGUgc2FrZSBvZiBwb2xpdGVuZXNzLCBhcyBydGMgY291cGxlXG4gICAgLy8gaW1wbGVtZW50YXRpb24gaGFuZGxlcyB0aGUgc2xhdmUgYXR0ZW1wdGluZyB0byBjcmVhdGUgYW4gb2ZmZXJcbiAgICBpZiAoc2lnbmFsbGVyLmlzTWFzdGVyKGRhdGEuaWQpKSB7XG4gICAgICBtb25pdG9yLmNyZWF0ZU9mZmVyKCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVjZWl2ZVJlbW90ZVN0cmVhbShpZCkge1xuICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KGlkKTtcblxuICAgIHJldHVybiBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHNpZ25hbGxlci5lbWl0KCdzdHJlYW06YWRkZWQnLCBpZCwgc3RyZWFtLCBjYWxsICYmIGNhbGwuZGF0YSk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZVJlbW90ZVN0cmVhbXMoaWQpIHtcbiAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChpZCk7XG5cbiAgICBpZiAoY2FsbCAmJiBjYWxsLnBjKSB7XG4gICAgICBjYWxsLnN0cmVhbXMgPSBbXS5jb25jYXQoY2FsbC5wYy5nZXRSZW1vdGVTdHJlYW1zKCkpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSByb29tIGlzIG5vdCBkZWZpbmVkLCB0aGVuIGdlbmVyYXRlIHRoZSByb29tIG5hbWVcbiAgaWYgKCEgcm9vbSkge1xuICAgIC8vIGlmIHRoZSBoYXNoIGlzIG5vdCBhc3NpZ25lZCwgdGhlbiBjcmVhdGUgYSByYW5kb20gaGFzaCB2YWx1ZVxuICAgIGlmICghIGhhc2gpIHtcbiAgICAgIGhhc2ggPSBsb2NhdGlvbi5oYXNoID0gJycgKyAoTWF0aC5wb3coMiwgNTMpICogTWF0aC5yYW5kb20oKSk7XG4gICAgfVxuXG4gICAgcm9vbSA9IG5zICsgJyMnICsgaGFzaDtcbiAgfVxuXG4gIGlmIChkZWJ1Z2dpbmcpIHtcbiAgICBydGMubG9nZ2VyLmVuYWJsZS5hcHBseShydGMubG9nZ2VyLCBBcnJheS5pc0FycmF5KGRlYnVnKSA/IGRlYnVnZ2luZyA6IFsnKiddKTtcbiAgfVxuXG4gIHNpZ25hbGxlci5vbigncGVlcjphbm5vdW5jZScsIGhhbmRsZVBlZXJBbm5vdW5jZSk7XG4gIHNpZ25hbGxlci5vbigncGVlcjpsZWF2ZScsIGNhbGxFbmQpO1xuXG4gIC8vIGFubm91bmNlIG91cnNlbHZlcyB0byBvdXIgbmV3IGZyaWVuZFxuICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgIHZhciBkYXRhID0gZXh0ZW5kKHt9LCBwcm9maWxlLCB7IHJvb206IHJvb20gfSk7XG5cbiAgICAvLyBhbm5vdW5jZSBhbmQgZW1pdCB0aGUgbG9jYWwgYW5ub3VuY2UgZXZlbnRcbiAgICBzaWduYWxsZXIuYW5ub3VuY2UoZGF0YSk7XG4gICAgc2lnbmFsbGVyLmVtaXQoJ2xvY2FsOmFubm91bmNlJywgZGF0YSk7XG4gICAgYW5ub3VuY2VkID0gdHJ1ZTtcbiAgfSwgMCk7XG5cbiAgLyoqXG4gICAgIyMjIFF1aWNrY29ubmVjdCBCcm9hZGNhc3QgYW5kIERhdGEgQ2hhbm5lbCBIZWxwZXIgRnVuY3Rpb25zXG5cbiAgICBUaGUgZm9sbG93aW5nIGFyZSBmdW5jdGlvbnMgdGhhdCBhcmUgcGF0Y2hlZCBpbnRvIHRoZSBgcnRjLXNpZ25hbGxlcmBcbiAgICBpbnN0YW5jZSB0aGF0IG1ha2Ugd29ya2luZyB3aXRoIGFuZCBjcmVhdGluZyBmdW5jdGlvbmFsIFdlYlJUQyBhcHBsaWNhdGlvbnNcbiAgICBhIGxvdCBzaW1wbGVyLlxuXG4gICoqL1xuXG4gIC8qKlxuICAgICMjIyMgYWRkU3RyZWFtXG5cbiAgICBgYGBcbiAgICBhZGRTdHJlYW0oc3RyZWFtOk1lZGlhU3RyZWFtKSA9PiBxY1xuICAgIGBgYFxuXG4gICAgQWRkIHRoZSBzdHJlYW0gdG8gYWN0aXZlIGNhbGxzIGFuZCBhbHNvIHNhdmUgdGhlIHN0cmVhbSBzbyB0aGF0IGl0XG4gICAgY2FuIGJlIGFkZGVkIHRvIGZ1dHVyZSBjYWxscy5cblxuICAqKi9cbiAgc2lnbmFsbGVyLmJyb2FkY2FzdCA9IHNpZ25hbGxlci5hZGRTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICBsb2NhbFN0cmVhbXMucHVzaChzdHJlYW0pO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBhbnkgYWN0aXZlIGNhbGxzLCB0aGVuIGFkZCB0aGUgc3RyZWFtXG4gICAgY2FsbHMudmFsdWVzKCkuZm9yRWFjaChmdW5jdGlvbihkYXRhKSB7XG4gICAgICBkYXRhLnBjLmFkZFN0cmVhbShzdHJlYW0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIGNsb3NlKClcblxuICAgIFRoZSBgY2xvc2VgIGZ1bmN0aW9uIHByb3ZpZGVzIGEgY29udmVuaWVudCB3YXkgb2YgY2xvc2luZyBhbGwgYXNzb2NpYXRlZFxuICAgIHBlZXIgY29ubmVjdGlvbnMuXG4gICoqL1xuICBzaWduYWxsZXIuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBlbmQgZWFjaCBvZiB0aGUgYWN0aXZlIGNhbGxzXG4gICAgY2FsbHMua2V5cygpLmZvckVhY2goY2FsbEVuZCk7XG5cbiAgICAvLyBjYWxsIHRoZSB1bmRlcmx5aW5nIHNpZ25hbGxlci5sZWF2ZSAoZm9yIHdoaWNoIGNsb3NlIGlzIGFuIGFsaWFzKVxuICAgIHNpZ25hbGxlci5sZWF2ZSgpO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgY3JlYXRlRGF0YUNoYW5uZWwobGFiZWwsIGNvbmZpZylcblxuICAgIFJlcXVlc3QgdGhhdCBhIGRhdGEgY2hhbm5lbCB3aXRoIHRoZSBzcGVjaWZpZWQgYGxhYmVsYCBpcyBjcmVhdGVkIG9uXG4gICAgdGhlIHBlZXIgY29ubmVjdGlvbi4gIFdoZW4gdGhlIGRhdGEgY2hhbm5lbCBpcyBvcGVuIGFuZCBhdmFpbGFibGUsIGFuXG4gICAgZXZlbnQgd2lsbCBiZSB0cmlnZ2VyZWQgdXNpbmcgdGhlIGxhYmVsIG9mIHRoZSBkYXRhIGNoYW5uZWwuXG5cbiAgICBGb3IgZXhhbXBsZSwgaWYgYSBuZXcgZGF0YSBjaGFubmVsIHdhcyByZXF1ZXN0ZWQgdXNpbmcgdGhlIGZvbGxvd2luZ1xuICAgIGNhbGw6XG5cbiAgICBgYGBqc1xuICAgIHZhciBxYyA9IHF1aWNrY29ubmVjdCgnaHR0cDovL3J0Yy5pby9zd2l0Y2hib2FyZCcpLmNyZWF0ZURhdGFDaGFubmVsKCd0ZXN0Jyk7XG4gICAgYGBgXG5cbiAgICBUaGVuIHdoZW4gdGhlIGRhdGEgY2hhbm5lbCBpcyByZWFkeSBmb3IgdXNlLCBhIGB0ZXN0Om9wZW5gIGV2ZW50IHdvdWxkXG4gICAgYmUgZW1pdHRlZCBieSBgcWNgLlxuXG4gICoqL1xuICBzaWduYWxsZXIuY3JlYXRlRGF0YUNoYW5uZWwgPSBmdW5jdGlvbihsYWJlbCwgb3B0cykge1xuICAgIC8vIGNyZWF0ZSBhIGNoYW5uZWwgb24gYWxsIGV4aXN0aW5nIGNhbGxzXG4gICAgY2FsbHMua2V5cygpLmZvckVhY2goZnVuY3Rpb24ocGVlcklkKSB7XG4gICAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChwZWVySWQpO1xuICAgICAgdmFyIGRjO1xuXG4gICAgICAvLyBpZiB3ZSBhcmUgdGhlIG1hc3RlciBjb25uZWN0aW9uLCBjcmVhdGUgdGhlIGRhdGEgY2hhbm5lbFxuICAgICAgaWYgKGNhbGwgJiYgY2FsbC5wYyAmJiBzaWduYWxsZXIuaXNNYXN0ZXIocGVlcklkKSkge1xuICAgICAgICBkYyA9IGNhbGwucGMuY3JlYXRlRGF0YUNoYW5uZWwobGFiZWwsIG9wdHMpO1xuICAgICAgICBnb3RQZWVyQ2hhbm5lbChkYywgY2FsbC5wYywgY2FsbC5kYXRhKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIHNhdmUgdGhlIGRhdGEgY2hhbm5lbCBvcHRzIGluIHRoZSBsb2NhbCBjaGFubmVscyBkaWN0aW9uYXJ5XG4gICAgY2hhbm5lbHNbbGFiZWxdID0gb3B0cyB8fCBudWxsO1xuXG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIHJlYWN0aXZlKClcblxuICAgIEZsYWcgdGhhdCB0aGlzIHNlc3Npb24gd2lsbCBiZSBhIHJlYWN0aXZlIGNvbm5lY3Rpb24uXG5cbiAgKiovXG4gIHNpZ25hbGxlci5yZWFjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGFkZCB0aGUgcmVhY3RpdmUgZmxhZ1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIG9wdHMucmVhY3RpdmUgPSB0cnVlO1xuXG4gICAgLy8gY2hhaW5cbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgcmVtb3ZlU3RyZWFtXG5cbiAgICBgYGBcbiAgICByZW1vdmVTdHJlYW0oc3RyZWFtOk1lZGlhU3RyZWFtKVxuICAgIGBgYFxuXG4gICAgUmVtb3ZlIHRoZSBzcGVjaWZpZWQgc3RyZWFtIGZyb20gYm90aCB0aGUgbG9jYWwgc3RyZWFtcyB0aGF0IGFyZSB0b1xuICAgIGJlIGNvbm5lY3RlZCB0byBuZXcgcGVlcnMsIGFuZCBhbHNvIGZyb20gYW55IGFjdGl2ZSBjYWxscy5cblxuICAqKi9cbiAgc2lnbmFsbGVyLnJlbW92ZVN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIHZhciBsb2NhbEluZGV4ID0gbG9jYWxTdHJlYW1zLmluZGV4T2Yoc3RyZWFtKTtcblxuICAgIC8vIHJlbW92ZSB0aGUgc3RyZWFtIGZyb20gYW55IGFjdGl2ZSBjYWxsc1xuICAgIGNhbGxzLnZhbHVlcygpLmZvckVhY2goZnVuY3Rpb24oY2FsbCkge1xuICAgICAgY2FsbC5wYy5yZW1vdmVTdHJlYW0oc3RyZWFtKTtcbiAgICB9KTtcblxuICAgIC8vIHJlbW92ZSB0aGUgc3RyZWFtIGZyb20gdGhlIGxvY2FsU3RyZWFtcyBhcnJheVxuICAgIGlmIChsb2NhbEluZGV4ID49IDApIHtcbiAgICAgIGxvY2FsU3RyZWFtcy5zcGxpY2UobG9jYWxJbmRleCwgMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIHJlcXVlc3RDaGFubmVsXG5cbiAgICBgYGBcbiAgICByZXF1ZXN0Q2hhbm5lbCh0YXJnZXRJZCwgbGFiZWwsIGNhbGxiYWNrKVxuICAgIGBgYFxuXG4gICAgVGhpcyBpcyBhIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIHVzZWQgdG8gcmVzcG9uZCB0byByZW1vdGUgcGVlcnMgc3VwcGx5aW5nXG4gICAgYSBkYXRhIGNoYW5uZWwgYXMgcGFydCBvZiB0aGVpciBjb25maWd1cmF0aW9uLiAgQXMgcGVyIHRoZSBgcmVjZWl2ZVN0cmVhbWBcbiAgICBmdW5jdGlvbiB0aGlzIGZ1bmN0aW9uIHdpbGwgZWl0aGVyIGZpcmUgdGhlIGNhbGxiYWNrIGltbWVkaWF0ZWx5IGlmIHRoZVxuICAgIGNoYW5uZWwgaXMgYWxyZWFkeSBhdmFpbGFibGUsIG9yIG9uY2UgdGhlIGNoYW5uZWwgaGFzIGJlZW4gZGlzY292ZXJlZCBvblxuICAgIHRoZSBjYWxsLlxuXG4gICoqL1xuICBzaWduYWxsZXIucmVxdWVzdENoYW5uZWwgPSBmdW5jdGlvbih0YXJnZXRJZCwgbGFiZWwsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGNhbGwgPSBnZXRBY3RpdmVDYWxsKHRhcmdldElkKTtcbiAgICB2YXIgY2hhbm5lbCA9IGNhbGwgJiYgY2FsbC5jaGFubmVscy5nZXQobGFiZWwpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSB0aGVuIGNoYW5uZWwgdHJpZ2dlciB0aGUgY2FsbGJhY2sgaW1tZWRpYXRlbHlcbiAgICBpZiAoY2hhbm5lbCkge1xuICAgICAgY2FsbGJhY2sobnVsbCwgY2hhbm5lbCk7XG4gICAgICByZXR1cm4gc2lnbmFsbGVyO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdCwgd2FpdCBmb3IgaXRcbiAgICBzaWduYWxsZXIub25jZSgnY2hhbm5lbDpvcGVuZWQ6JyArIGxhYmVsLCBmdW5jdGlvbihpZCwgZGMpIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIGRjKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBzaWduYWxsZXI7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyByZXF1ZXN0U3RyZWFtXG5cbiAgICBgYGBcbiAgICByZXF1ZXN0U3RyZWFtKHRhcmdldElkLCBpZHgsIGNhbGxiYWNrKVxuICAgIGBgYFxuXG4gICAgVXNlZCB0byByZXF1ZXN0IGEgcmVtb3RlIHN0cmVhbSBmcm9tIGEgcXVpY2tjb25uZWN0IGluc3RhbmNlLiBJZiB0aGVcbiAgICBzdHJlYW0gaXMgYWxyZWFkeSBhdmFpbGFibGUgaW4gdGhlIGNhbGxzIHJlbW90ZSBzdHJlYW1zLCB0aGVuIHRoZSBjYWxsYmFja1xuICAgIHdpbGwgYmUgdHJpZ2dlcmVkIGltbWVkaWF0ZWx5LCBvdGhlcndpc2UgdGhpcyBmdW5jdGlvbiB3aWxsIG1vbml0b3JcbiAgICBgc3RyZWFtOmFkZGVkYCBldmVudHMgYW5kIHdhaXQgZm9yIGEgbWF0Y2guXG5cbiAgICBJbiB0aGUgY2FzZSB0aGF0IGFuIHVua25vd24gdGFyZ2V0IGlzIHJlcXVlc3RlZCwgdGhlbiBhbiBleGNlcHRpb24gd2lsbFxuICAgIGJlIHRocm93bi5cbiAgKiovXG4gIHNpZ25hbGxlci5yZXF1ZXN0U3RyZWFtID0gZnVuY3Rpb24odGFyZ2V0SWQsIGlkeCwgY2FsbGJhY2spIHtcbiAgICB2YXIgY2FsbCA9IGdldEFjdGl2ZUNhbGwodGFyZ2V0SWQpO1xuICAgIHZhciBzdHJlYW07XG5cbiAgICBmdW5jdGlvbiB3YWl0Rm9yU3RyZWFtKHBlZXJJZCkge1xuICAgICAgaWYgKHBlZXJJZCAhPT0gdGFyZ2V0SWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBnZXQgdGhlIHN0cmVhbVxuICAgICAgc3RyZWFtID0gY2FsbC5wYy5nZXRSZW1vdGVTdHJlYW1zKClbaWR4XTtcblxuICAgICAgLy8gaWYgd2UgaGF2ZSB0aGUgc3RyZWFtLCB0aGVuIHJlbW92ZSB0aGUgbGlzdGVuZXIgYW5kIHRyaWdnZXIgdGhlIGNiXG4gICAgICBpZiAoc3RyZWFtKSB7XG4gICAgICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignc3RyZWFtOmFkZGVkJywgd2FpdEZvclN0cmVhbSk7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHN0cmVhbSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gbG9vayBmb3IgdGhlIHN0cmVhbSBpbiB0aGUgcmVtb3RlIHN0cmVhbXMgb2YgdGhlIGNhbGxcbiAgICBzdHJlYW0gPSBjYWxsLnBjLmdldFJlbW90ZVN0cmVhbXMoKVtpZHhdO1xuXG4gICAgLy8gaWYgd2UgZm91bmQgdGhlIHN0cmVhbSB0aGVuIHRyaWdnZXIgdGhlIGNhbGxiYWNrXG4gICAgaWYgKHN0cmVhbSkge1xuICAgICAgY2FsbGJhY2sobnVsbCwgc3RyZWFtKTtcbiAgICAgIHJldHVybiBzaWduYWxsZXI7XG4gICAgfVxuXG4gICAgLy8gb3RoZXJ3aXNlIHdhaXQgZm9yIHRoZSBzdHJlYW1cbiAgICBzaWduYWxsZXIub24oJ3N0cmVhbTphZGRlZCcsIHdhaXRGb3JTdHJlYW0pO1xuICAgIHJldHVybiBzaWduYWxsZXI7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyBwcm9maWxlKGRhdGEpXG5cbiAgICBVcGRhdGUgdGhlIHByb2ZpbGUgZGF0YSB3aXRoIHRoZSBhdHRhY2hlZCBpbmZvcm1hdGlvbiwgc28gd2hlblxuICAgIHRoZSBzaWduYWxsZXIgYW5ub3VuY2VzIGl0IGluY2x1ZGVzIHRoaXMgZGF0YSBpbiBhZGRpdGlvbiB0byBhbnlcbiAgICByb29tIGFuZCBpZCBpbmZvcm1hdGlvbi5cblxuICAqKi9cbiAgc2lnbmFsbGVyLnByb2ZpbGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgZXh0ZW5kKHByb2ZpbGUsIGRhdGEpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBhbHJlYWR5IGFubm91bmNlZCwgdGhlbiByZWFubm91bmNlIG91ciBwcm9maWxlIHRvIHByb3ZpZGVcbiAgICAvLyBvdGhlcnMgYSBgcGVlcjp1cGRhdGVgIGV2ZW50XG4gICAgaWYgKGFubm91bmNlZCkge1xuICAgICAgc2lnbmFsbGVyLmFubm91bmNlKHByb2ZpbGUpO1xuICAgIH1cblxuICAgIHJldHVybiBzaWduYWxsZXI7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyB3YWl0Rm9yQ2FsbFxuXG4gICAgYGBgXG4gICAgd2FpdEZvckNhbGwodGFyZ2V0SWQsIGNhbGxiYWNrKVxuICAgIGBgYFxuXG4gICAgV2FpdCBmb3IgYSBjYWxsIGZyb20gdGhlIHNwZWNpZmllZCB0YXJnZXRJZC4gIElmIHRoZSBjYWxsIGlzIGFscmVhZHlcbiAgICBhY3RpdmUgdGhlIGNhbGxiYWNrIHdpbGwgYmUgZmlyZWQgaW1tZWRpYXRlbHksIG90aGVyd2lzZSB3ZSB3aWxsIHdhaXRcbiAgICBmb3IgYSBgY2FsbDpzdGFydGVkYCBldmVudCB0aGF0IG1hdGNoZXMgdGhlIHJlcXVlc3RlZCBgdGFyZ2V0SWRgXG5cbiAgKiovXG4gIHNpZ25hbGxlci53YWl0Rm9yQ2FsbCA9IGZ1bmN0aW9uKHRhcmdldElkLCBjYWxsYmFjaykge1xuICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KHRhcmdldElkKTtcblxuICAgIGlmIChjYWxsICYmIGNhbGwuYWN0aXZlKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBjYWxsLnBjKTtcbiAgICAgIHJldHVybiBzaWduYWxsZXI7XG4gICAgfVxuXG4gICAgc2lnbmFsbGVyLm9uKCdjYWxsOnN0YXJ0ZWQnLCBmdW5jdGlvbiBoYW5kbGVOZXdDYWxsKGlkKSB7XG4gICAgICBpZiAoaWQgPT09IHRhcmdldElkKSB7XG4gICAgICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignY2FsbDpzdGFydGVkJywgaGFuZGxlTmV3Q2FsbCk7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIGNhbGxzLmdldChpZCkucGMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIC8vIHBhc3MgdGhlIHNpZ25hbGxlciBvblxuICByZXR1cm4gc2lnbmFsbGVyO1xufTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJGV2FBU0hcIikpIiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihtZXNzZW5nZXIsIG9wdHMpIHtcbiAgcmV0dXJuIHJlcXVpcmUoJy4vaW5kZXguanMnKShtZXNzZW5nZXIsIGV4dGVuZCh7XG4gICAgY29ubmVjdDogcmVxdWlyZSgnLi9wcmltdXMtbG9hZGVyJylcbiAgfSwgb3B0cykpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAvLyBtZXNzZW5nZXIgZXZlbnRzXG4gIGRhdGFFdmVudDogJ2RhdGEnLFxuICBvcGVuRXZlbnQ6ICdvcGVuJyxcbiAgY2xvc2VFdmVudDogJ2Nsb3NlJyxcblxuICAvLyBtZXNzZW5nZXIgZnVuY3Rpb25zXG4gIHdyaXRlTWV0aG9kOiAnd3JpdGUnLFxuICBjbG9zZU1ldGhvZDogJ2Nsb3NlJyxcblxuICAvLyBsZWF2ZSB0aW1lb3V0IChtcylcbiAgbGVhdmVUaW1lb3V0OiAzMDAwXG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgncnRjLXNpZ25hbGxlcicpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbnZhciByb2xlcyA9IFsnYScsICdiJ107XG5cbi8qKlxuICAjIyMjIGFubm91bmNlXG5cbiAgYGBgXG4gIC9hbm5vdW5jZXwlbWV0YWRhdGElfHtcImlkXCI6IFwiLi4uXCIsIC4uLiB9XG4gIGBgYFxuXG4gIFdoZW4gYW4gYW5ub3VuY2UgbWVzc2FnZSBpcyByZWNlaXZlZCBieSB0aGUgc2lnbmFsbGVyLCB0aGUgYXR0YWNoZWRcbiAgb2JqZWN0IGRhdGEgaXMgZGVjb2RlZCBhbmQgdGhlIHNpZ25hbGxlciBlbWl0cyBhbiBgYW5ub3VuY2VgIG1lc3NhZ2UuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxsZXIpIHtcblxuICBmdW5jdGlvbiBjb3B5RGF0YSh0YXJnZXQsIHNvdXJjZSkge1xuICAgIGlmICh0YXJnZXQgJiYgc291cmNlKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRhdGFBbGxvd2VkKGRhdGEpIHtcbiAgICB2YXIgZXZ0ID0ge1xuICAgICAgZGF0YTogZGF0YSxcbiAgICAgIGFsbG93OiB0cnVlXG4gICAgfTtcblxuICAgIHNpZ25hbGxlci5lbWl0KCdwZWVyOmZpbHRlcicsIGV2dCk7XG5cbiAgICByZXR1cm4gZXZ0LmFsbG93O1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGFyZ3MsIG1lc3NhZ2VUeXBlLCBzcmNEYXRhLCBzcmNTdGF0ZSwgaXNETSkge1xuICAgIHZhciBkYXRhID0gYXJnc1swXTtcbiAgICB2YXIgcGVlcjtcblxuICAgIGRlYnVnKCdhbm5vdW5jZSBoYW5kbGVyIGludm9rZWQsIHJlY2VpdmVkIGRhdGE6ICcsIGRhdGEpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSB2YWxpZCBkYXRhIHRoZW4gcHJvY2Vzc1xuICAgIGlmIChkYXRhICYmIGRhdGEuaWQgJiYgZGF0YS5pZCAhPT0gc2lnbmFsbGVyLmlkKSB7XG4gICAgICBpZiAoISBkYXRhQWxsb3dlZChkYXRhKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBjaGVjayB0byBzZWUgaWYgdGhpcyBpcyBhIGtub3duIHBlZXJcbiAgICAgIHBlZXIgPSBzaWduYWxsZXIucGVlcnMuZ2V0KGRhdGEuaWQpO1xuXG4gICAgICAvLyB0cmlnZ2VyIHRoZSBwZWVyIGNvbm5lY3RlZCBldmVudCB0byBmbGFnIHRoYXQgd2Uga25vdyBhYm91dCBhXG4gICAgICAvLyBwZWVyIGNvbm5lY3Rpb24uIFRoZSBwZWVyIGhhcyBwYXNzZWQgdGhlIFwiZmlsdGVyXCIgY2hlY2sgYnV0IG1heVxuICAgICAgLy8gYmUgYW5ub3VuY2VkIC8gdXBkYXRlZCBkZXBlbmRpbmcgb24gcHJldmlvdXMgY29ubmVjdGlvbiBzdGF0dXNcbiAgICAgIHNpZ25hbGxlci5lbWl0KCdwZWVyOmNvbm5lY3RlZCcsIGRhdGEuaWQsIGRhdGEpO1xuXG4gICAgICAvLyBpZiB0aGUgcGVlciBpcyBleGlzdGluZywgdGhlbiB1cGRhdGUgdGhlIGRhdGFcbiAgICAgIGlmIChwZWVyICYmICghIHBlZXIuaW5hY3RpdmUpKSB7XG4gICAgICAgIGRlYnVnKCdzaWduYWxsZXI6ICcgKyBzaWduYWxsZXIuaWQgKyAnIHJlY2VpdmVkIHVwZGF0ZSwgZGF0YTogJywgZGF0YSk7XG5cbiAgICAgICAgLy8gdXBkYXRlIHRoZSBkYXRhXG4gICAgICAgIGNvcHlEYXRhKHBlZXIuZGF0YSwgZGF0YSk7XG5cbiAgICAgICAgLy8gdHJpZ2dlciB0aGUgcGVlciB1cGRhdGUgZXZlbnRcbiAgICAgICAgcmV0dXJuIHNpZ25hbGxlci5lbWl0KCdwZWVyOnVwZGF0ZScsIGRhdGEsIHNyY0RhdGEpO1xuICAgICAgfVxuXG4gICAgICAvLyBjcmVhdGUgYSBuZXcgcGVlclxuICAgICAgcGVlciA9IHtcbiAgICAgICAgaWQ6IGRhdGEuaWQsXG5cbiAgICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgbG9jYWwgcm9sZSBpbmRleFxuICAgICAgICByb2xlSWR4OiBbZGF0YS5pZCwgc2lnbmFsbGVyLmlkXS5zb3J0KCkuaW5kZXhPZihkYXRhLmlkKSxcblxuICAgICAgICAvLyBpbml0aWFsaXNlIHRoZSBwZWVyIGRhdGFcbiAgICAgICAgZGF0YToge31cbiAgICAgIH07XG5cbiAgICAgIC8vIGluaXRpYWxpc2UgdGhlIHBlZXIgZGF0YVxuICAgICAgY29weURhdGEocGVlci5kYXRhLCBkYXRhKTtcblxuICAgICAgLy8gcmVzZXQgaW5hY3Rpdml0eSBzdGF0ZVxuICAgICAgY2xlYXJUaW1lb3V0KHBlZXIubGVhdmVUaW1lcik7XG4gICAgICBwZWVyLmluYWN0aXZlID0gZmFsc2U7XG5cbiAgICAgIC8vIHNldCB0aGUgcGVlciBkYXRhXG4gICAgICBzaWduYWxsZXIucGVlcnMuc2V0KGRhdGEuaWQsIHBlZXIpO1xuXG4gICAgICAvLyBpZiB0aGlzIGlzIGFuIGluaXRpYWwgYW5ub3VuY2UgbWVzc2FnZSAobm8gdmVjdG9yIGNsb2NrIGF0dGFjaGVkKVxuICAgICAgLy8gdGhlbiBzZW5kIGEgYW5ub3VuY2UgcmVwbHlcbiAgICAgIGlmIChzaWduYWxsZXIuYXV0b3JlcGx5ICYmICghIGlzRE0pKSB7XG4gICAgICAgIHNpZ25hbGxlclxuICAgICAgICAgIC50byhkYXRhLmlkKVxuICAgICAgICAgIC5zZW5kKCcvYW5ub3VuY2UnLCBzaWduYWxsZXIuYXR0cmlidXRlcyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGVtaXQgYSBuZXcgcGVlciBhbm5vdW5jZSBldmVudFxuICAgICAgcmV0dXJuIHNpZ25hbGxlci5lbWl0KCdwZWVyOmFubm91bmNlJywgZGF0YSwgcGVlcik7XG4gICAgfVxuICB9O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMjIHNpZ25hbGxlciBtZXNzYWdlIGhhbmRsZXJzXG5cbioqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNpZ25hbGxlciwgb3B0cykge1xuICByZXR1cm4ge1xuICAgIGFubm91bmNlOiByZXF1aXJlKCcuL2Fubm91bmNlJykoc2lnbmFsbGVyLCBvcHRzKSxcbiAgICBsZWF2ZTogcmVxdWlyZSgnLi9sZWF2ZScpKHNpZ25hbGxlciwgb3B0cylcbiAgfTtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIyMgbGVhdmVcblxuICBgYGBcbiAgL2xlYXZlfHtcImlkXCI6XCIuLi5cIn1cbiAgYGBgXG5cbiAgV2hlbiBhIGxlYXZlIG1lc3NhZ2UgaXMgcmVjZWl2ZWQgZnJvbSBhIHBlZXIsIHdlIGNoZWNrIHRvIHNlZSBpZiB0aGF0IGlzXG4gIGEgcGVlciB0aGF0IHdlIGFyZSBtYW5hZ2luZyBzdGF0ZSBpbmZvcm1hdGlvbiBmb3IgYW5kIGlmIHdlIGFyZSB0aGVuIHRoZVxuICBwZWVyIHN0YXRlIGlzIHJlbW92ZWQuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxsZXIsIG9wdHMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICB2YXIgZGF0YSA9IGFyZ3NbMF07XG4gICAgdmFyIHBlZXIgPSBzaWduYWxsZXIucGVlcnMuZ2V0KGRhdGEgJiYgZGF0YS5pZCk7XG5cbiAgICBpZiAocGVlcikge1xuICAgICAgLy8gc3RhcnQgdGhlIGluYWN0aXZpdHkgdGltZXJcbiAgICAgIHBlZXIubGVhdmVUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHBlZXIuaW5hY3RpdmUgPSB0cnVlO1xuICAgICAgICBzaWduYWxsZXIuZW1pdCgncGVlcjpsZWF2ZScsIGRhdGEuaWQsIHBlZXIpO1xuICAgICAgfSwgb3B0cy5sZWF2ZVRpbWVvdXQpO1xuICAgIH1cblxuICAgIC8vIGVtaXQgdGhlIGV2ZW50XG4gICAgc2lnbmFsbGVyLmVtaXQoJ3BlZXI6ZGlzY29ubmVjdGVkJywgZGF0YS5pZCwgcGVlcik7XG4gIH07XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgncnRjLXNpZ25hbGxlcicpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjMnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJ2NvZy9kZWZhdWx0cycpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbnZhciB0aHJvdHRsZSA9IHJlcXVpcmUoJ2NvZy90aHJvdHRsZScpO1xudmFyIGdldGFibGUgPSByZXF1aXJlKCdjb2cvZ2V0YWJsZScpO1xudmFyIHV1aWQgPSByZXF1aXJlKCcuL3V1aWQnKTtcblxuLy8gaW5pdGlhbGlzZSB0aGUgbGlzdCBvZiB2YWxpZCBcIndyaXRlXCIgbWV0aG9kc1xudmFyIFdSSVRFX01FVEhPRFMgPSBbJ3dyaXRlJywgJ3NlbmQnXTtcbnZhciBDTE9TRV9NRVRIT0RTID0gWydjbG9zZScsICdlbmQnXTtcblxuLy8gaW5pdGlhbGlzZSBzaWduYWxsZXIgbWV0YWRhdGEgc28gd2UgZG9uJ3QgaGF2ZSB0byBpbmNsdWRlIHRoZSBwYWNrYWdlLmpzb25cbi8vIFRPRE86IG1ha2UgdGhpcyBjaGVja2FibGUgd2l0aCBzb21lIGtpbmQgb2YgcHJlcHVibGlzaCBzY3JpcHRcbnZhciBtZXRhZGF0YSA9IHtcbiAgdmVyc2lvbjogJzIuMy4wJ1xufTtcblxuLyoqXG4gICMgcnRjLXNpZ25hbGxlclxuXG4gIFRoZSBgcnRjLXNpZ25hbGxlcmAgbW9kdWxlIHByb3ZpZGVzIGEgdHJhbnNwb3J0bGVzcyBzaWduYWxsaW5nXG4gIG1lY2hhbmlzbSBmb3IgV2ViUlRDLlxuXG4gICMjIFB1cnBvc2VcblxuICA8PDwgZG9jcy9wdXJwb3NlLm1kXG5cbiAgIyMgR2V0dGluZyBTdGFydGVkXG5cbiAgV2hpbGUgdGhlIHNpZ25hbGxlciBpcyBjYXBhYmxlIG9mIGNvbW11bmljYXRpbmcgYnkgYSBudW1iZXIgb2YgZGlmZmVyZW50XG4gIG1lc3NlbmdlcnMgKGkuZS4gYW55dGhpbmcgdGhhdCBjYW4gc2VuZCBhbmQgcmVjZWl2ZSBtZXNzYWdlcyBvdmVyIGEgd2lyZSlcbiAgaXQgY29tZXMgd2l0aCBzdXBwb3J0IGZvciB1bmRlcnN0YW5kaW5nIGhvdyB0byBjb25uZWN0IHRvIGFuXG4gIFtydGMtc3dpdGNoYm9hcmRdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXN3aXRjaGJvYXJkKSBvdXQgb2YgdGhlIGJveC5cblxuICBUaGUgZm9sbG93aW5nIGNvZGUgc2FtcGxlIGRlbW9uc3RyYXRlcyBob3c6XG5cbiAgPDw8IGV4YW1wbGVzL2dldHRpbmctc3RhcnRlZC5qc1xuXG4gIDw8PCBkb2NzL2V2ZW50cy5tZFxuXG4gIDw8PCBkb2NzL3NpZ25hbGZsb3ctZGlhZ3JhbXMubWRcblxuICAjIyBSZWZlcmVuY2VcblxuICBUaGUgYHJ0Yy1zaWduYWxsZXJgIG1vZHVsZSBpcyBkZXNpZ25lZCB0byBiZSB1c2VkIHByaW1hcmlseSBpbiBhIGZ1bmN0aW9uYWxcbiAgd2F5IGFuZCB3aGVuIGNhbGxlZCBpdCBjcmVhdGVzIGEgbmV3IHNpZ25hbGxlciB0aGF0IHdpbGwgZW5hYmxlXG4gIHlvdSB0byBjb21tdW5pY2F0ZSB3aXRoIG90aGVyIHBlZXJzIHZpYSB5b3VyIG1lc3NhZ2luZyBuZXR3b3JrLlxuXG4gIGBgYGpzXG4gIC8vIGNyZWF0ZSBhIHNpZ25hbGxlciBmcm9tIHNvbWV0aGluZyB0aGF0IGtub3dzIGhvdyB0byBzZW5kIG1lc3NhZ2VzXG4gIHZhciBzaWduYWxsZXIgPSByZXF1aXJlKCdydGMtc2lnbmFsbGVyJykobWVzc2VuZ2VyKTtcbiAgYGBgXG5cbiAgQXMgZGVtb25zdHJhdGVkIGluIHRoZSBnZXR0aW5nIHN0YXJ0ZWQgZ3VpZGUsIHlvdSBjYW4gYWxzbyBwYXNzIHRocm91Z2hcbiAgYSBzdHJpbmcgdmFsdWUgaW5zdGVhZCBvZiBhIG1lc3NlbmdlciBpbnN0YW5jZSBpZiB5b3Ugc2ltcGx5IHdhbnQgdG9cbiAgY29ubmVjdCB0byBhbiBleGlzdGluZyBgcnRjLXN3aXRjaGJvYXJkYCBpbnN0YW5jZS5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG1lc3Nlbmdlciwgb3B0cykge1xuICAvLyBnZXQgdGhlIGF1dG9yZXBseSBzZXR0aW5nXG4gIHZhciBhdXRvcmVwbHkgPSAob3B0cyB8fCB7fSkuYXV0b3JlcGx5O1xuICB2YXIgY29ubmVjdCA9IChvcHRzIHx8IHt9KS5jb25uZWN0O1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIG1ldGFkYXRhXG4gIHZhciBsb2NhbE1ldGEgPSB7fTtcblxuICAvLyBjcmVhdGUgdGhlIHNpZ25hbGxlclxuICB2YXIgc2lnbmFsbGVyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGlkXG4gIHZhciBpZCA9IHNpZ25hbGxlci5pZCA9IChvcHRzIHx8IHt9KS5pZCB8fCB1dWlkKCk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgYXR0cmlidXRlc1xuICB2YXIgYXR0cmlidXRlcyA9IHNpZ25hbGxlci5hdHRyaWJ1dGVzID0ge1xuICAgIGJyb3dzZXI6IGRldGVjdC5icm93c2VyLFxuICAgIGJyb3dzZXJWZXJzaW9uOiBkZXRlY3QuYnJvd3NlclZlcnNpb24sXG4gICAgaWQ6IGlkLFxuICAgIGFnZW50OiAnc2lnbmFsbGVyQCcgKyBtZXRhZGF0YS52ZXJzaW9uXG4gIH07XG5cbiAgLy8gY3JlYXRlIHRoZSBwZWVycyBtYXBcbiAgdmFyIHBlZXJzID0gc2lnbmFsbGVyLnBlZXJzID0gZ2V0YWJsZSh7fSk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgZGF0YSBldmVudCBuYW1lXG5cbiAgdmFyIGNvbm5lY3RlZCA9IGZhbHNlO1xuICB2YXIgd3JpdGU7XG4gIHZhciBjbG9zZTtcbiAgdmFyIHByb2Nlc3NvcjtcbiAgdmFyIGFubm91bmNlVGltZXIgPSAwO1xuXG4gIGZ1bmN0aW9uIGFubm91bmNlT25SZWNvbm5lY3QoKSB7XG4gICAgc2lnbmFsbGVyLmFubm91bmNlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBiaW5kQnJvd3NlckV2ZW50cygpIHtcbiAgICBtZXNzZW5nZXIuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgcHJvY2Vzc29yKGV2dC5kYXRhKTtcbiAgICB9KTtcblxuICAgIG1lc3Nlbmdlci5hZGRFdmVudExpc3RlbmVyKCdvcGVuJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICBjb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgc2lnbmFsbGVyLmVtaXQoJ29wZW4nKTtcbiAgICAgIHNpZ25hbGxlci5lbWl0KCdjb25uZWN0ZWQnKTtcbiAgICB9KTtcblxuICAgIG1lc3Nlbmdlci5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICBzaWduYWxsZXIuZW1pdCgnZGlzY29ubmVjdGVkJyk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBiaW5kRXZlbnRzKCkge1xuICAgIC8vIGlmIHdlIGRvbid0IGhhdmUgYW4gb24gZnVuY3Rpb24gZm9yIHRoZSBtZXNzZW5nZXIsIHRoZW4gZG8gbm90aGluZ1xuICAgIGlmICh0eXBlb2YgbWVzc2VuZ2VyLm9uICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgbWVzc2FnZSBkYXRhIGV2ZW50c1xuICAgIG1lc3Nlbmdlci5vbihvcHRzLmRhdGFFdmVudCwgcHJvY2Vzc29yKTtcblxuICAgIC8vIHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgb3BlbiwgdGhlbiBlbWl0IGFuIG9wZW4gZXZlbnQgYW5kIGEgY29ubmVjdGVkIGV2ZW50XG4gICAgbWVzc2VuZ2VyLm9uKG9wdHMub3BlbkV2ZW50LCBmdW5jdGlvbigpIHtcbiAgICAgIGNvbm5lY3RlZCA9IHRydWU7XG4gICAgICBzaWduYWxsZXIuZW1pdCgnb3BlbicpO1xuICAgICAgc2lnbmFsbGVyLmVtaXQoJ2Nvbm5lY3RlZCcpO1xuICAgIH0pO1xuXG4gICAgbWVzc2VuZ2VyLm9uKG9wdHMuY2xvc2VFdmVudCwgZnVuY3Rpb24oKSB7XG4gICAgICBjb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgIHNpZ25hbGxlci5lbWl0KCdkaXNjb25uZWN0ZWQnKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbm5lY3RUb0hvc3QodXJsKSB7XG4gICAgaWYgKHR5cGVvZiBjb25uZWN0ICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBzaWduYWxsZXIuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoJ25vIGNvbm5lY3QgZnVuY3Rpb24nKSk7XG4gICAgfVxuXG4gICAgLy8gbG9hZCBwcmltdXNcbiAgICBjb25uZWN0KHVybCwgZnVuY3Rpb24oZXJyLCBzb2NrZXQpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHNpZ25hbGxlci5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgICB9XG5cbiAgICAgIC8vIGNyZWF0ZSB0aGUgYWN0dWFsIG1lc3NlbmdlciBmcm9tIGEgcHJpbXVzIGNvbm5lY3Rpb25cbiAgICAgIHNpZ25hbGxlci5fbWVzc2VuZ2VyID0gbWVzc2VuZ2VyID0gc29ja2V0LmNvbm5lY3QodXJsKTtcblxuICAgICAgLy8gbm93IGluaXRcbiAgICAgIGluaXQoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZURhdGFMaW5lKGFyZ3MpIHtcbiAgICByZXR1cm4gYXJncy5tYXAocHJlcGFyZUFyZykuam9pbignfCcpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTWV0YWRhdGEoKSB7XG4gICAgcmV0dXJuIGV4dGVuZCh7fSwgbG9jYWxNZXRhLCB7IGlkOiBzaWduYWxsZXIuaWQgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBleHRyYWN0UHJvcChuYW1lKSB7XG4gICAgcmV0dXJuIG1lc3NlbmdlcltuYW1lXTtcbiAgfVxuXG4gIC8vIGF0dGVtcHQgdG8gZGV0ZWN0IHdoZXRoZXIgdGhlIHVuZGVybHlpbmcgbWVzc2VuZ2VyIGlzIGNsb3NpbmdcbiAgLy8gdGhpcyBjYW4gYmUgdG91Z2ggYXMgd2UgZGVhbCB3aXRoIGJvdGggbmF0aXZlIChvciBzaW11bGF0ZWQgbmF0aXZlKVxuICAvLyBzb2NrZXRzIG9yIGFuIGFic3RyYWN0aW9uIGxheWVyIHN1Y2ggYXMgcHJpbXVzXG4gIGZ1bmN0aW9uIGlzQ2xvc2luZygpIHtcbiAgICB2YXIgaXNBYnN0cmFjdGlvbiA9IG1lc3NlbmdlciAmJlxuICAgICAgICAvLyBhIHByaW11cyBzb2NrZXQgaGFzIGEgc29ja2V0IGF0dHJpYnV0ZVxuICAgICAgICB0eXBlb2YgbWVzc2VuZ2VyLnNvY2tldCAhPSAndW5kZWZpbmVkJztcblxuICAgIHJldHVybiBpc0Fic3RyYWN0aW9uID8gZmFsc2UgOiAoXG4gICAgICBtZXNzZW5nZXIgJiZcbiAgICAgIHR5cGVvZiBtZXNzZW5nZXIucmVhZHlTdGF0ZSAhPSAndW5kZWZpbmVkJyAmJlxuICAgICAgbWVzc2VuZ2VyLnJlYWR5U3RhdGUgPj0gMlxuICAgICk7XG4gIH1cblxuICBmdW5jdGlvbiBpc0YodGFyZ2V0KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0YXJnZXQgPT0gJ2Z1bmN0aW9uJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgLy8gZXh0cmFjdCB0aGUgd3JpdGUgYW5kIGNsb3NlIGZ1bmN0aW9uIHJlZmVyZW5jZXNcbiAgICB3cml0ZSA9IFtvcHRzLndyaXRlTWV0aG9kXS5jb25jYXQoV1JJVEVfTUVUSE9EUykubWFwKGV4dHJhY3RQcm9wKS5maWx0ZXIoaXNGKVswXTtcbiAgICBjbG9zZSA9IFtvcHRzLmNsb3NlTWV0aG9kXS5jb25jYXQoQ0xPU0VfTUVUSE9EUykubWFwKGV4dHJhY3RQcm9wKS5maWx0ZXIoaXNGKVswXTtcblxuICAgIC8vIGNyZWF0ZSB0aGUgcHJvY2Vzc29yXG4gICAgc2lnbmFsbGVyLnByb2Nlc3MgPSBwcm9jZXNzb3IgPSByZXF1aXJlKCcuL3Byb2Nlc3NvcicpKHNpZ25hbGxlciwgb3B0cyk7XG5cbiAgICAvLyBpZiB0aGUgbWVzc2VuZ2VyIGRvZXNuJ3QgcHJvdmlkZSBhIHZhbGlkIHdyaXRlIG1ldGhvZCwgdGhlbiBjb21wbGFpblxuICAgIGlmICh0eXBlb2Ygd3JpdGUgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdwcm92aWRlZCBtZXNzZW5nZXIgZG9lcyBub3QgaW1wbGVtZW50IGEgXCInICtcbiAgICAgICAgd3JpdGVNZXRob2QgKyAnXCIgd3JpdGUgbWV0aG9kJyk7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIGNvcmUgYnJvd3NlciBtZXNzZW5naW5nIGFwaXNcbiAgICBpZiAodHlwZW9mIG1lc3Nlbmdlci5hZGRFdmVudExpc3RlbmVyID09ICdmdW5jdGlvbicpIHtcbiAgICAgIGJpbmRCcm93c2VyRXZlbnRzKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgYmluZEV2ZW50cygpO1xuICAgIH1cblxuICAgIC8vIGRldGVybWluZSBpZiB3ZSBhcmUgY29ubmVjdGVkIG9yIG5vdFxuICAgIGNvbm5lY3RlZCA9IG1lc3Nlbmdlci5jb25uZWN0ZWQgfHwgZmFsc2U7XG4gICAgaWYgKCEgY29ubmVjdGVkKSB7XG4gICAgICBzaWduYWxsZXIub25jZSgnY29ubmVjdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGFsd2F5cyBhbm5vdW5jZSBvbiByZWNvbm5lY3RcbiAgICAgICAgc2lnbmFsbGVyLm9uKCdjb25uZWN0ZWQnLCBhbm5vdW5jZU9uUmVjb25uZWN0KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGVtaXQgdGhlIGluaXRpYWxpemVkIGV2ZW50XG4gICAgc2V0VGltZW91dChzaWduYWxsZXIuZW1pdC5iaW5kKHNpZ25hbGxlciwgJ2luaXQnKSwgMCk7XG4gIH1cblxuICBmdW5jdGlvbiBwcmVwYXJlQXJnKGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnID09ICdvYmplY3QnICYmICghIChhcmcgaW5zdGFuY2VvZiBTdHJpbmcpKSkge1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBhcmcgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFyZztcbiAgfVxuXG4gIC8qKlxuICAgICMjIyBzaWduYWxsZXIjc2VuZChtZXNzYWdlLCBkYXRhKilcblxuICAgIFVzZSB0aGUgc2VuZCBmdW5jdGlvbiB0byBzZW5kIGEgbWVzc2FnZSB0byBvdGhlciBwZWVycyBpbiB0aGUgY3VycmVudFxuICAgIHNpZ25hbGxpbmcgc2NvcGUgKGlmIGFubm91bmNlZCBpbiBhIHJvb20gdGhpcyB3aWxsIGJlIGEgcm9vbSwgb3RoZXJ3aXNlXG4gICAgYnJvYWRjYXN0IHRvIGFsbCBwZWVycyBjb25uZWN0ZWQgdG8gdGhlIHNpZ25hbGxpbmcgc2VydmVyKS5cblxuICAqKi9cbiAgdmFyIHNlbmQgPSBzaWduYWxsZXIuc2VuZCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGl0ZXJhdGUgb3ZlciB0aGUgYXJndW1lbnRzIGFuZCBzdHJpbmdpZnkgYXMgcmVxdWlyZWRcbiAgICAvLyB2YXIgbWV0YWRhdGEgPSB7IGlkOiBzaWduYWxsZXIuaWQgfTtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICB2YXIgZGF0YWxpbmU7XG5cbiAgICAvLyBpbmplY3QgdGhlIG1ldGFkYXRhXG4gICAgYXJncy5zcGxpY2UoMSwgMCwgY3JlYXRlTWV0YWRhdGEoKSk7XG4gICAgZGF0YWxpbmUgPSBjcmVhdGVEYXRhTGluZShhcmdzKTtcblxuICAgIC8vIHBlcmZvcm0gYW4gaXNjbG9zaW5nIGNoZWNrXG4gICAgaWYgKGlzQ2xvc2luZygpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gaWYgd2UgYXJlIG5vdCBpbml0aWFsaXplZCwgdGhlbiB3YWl0IHVudGlsIHdlIGFyZVxuICAgIGlmICghIGNvbm5lY3RlZCkge1xuICAgICAgcmV0dXJuIHNpZ25hbGxlci5vbmNlKCdjb25uZWN0ZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgd3JpdGUuY2FsbChtZXNzZW5nZXIsIGRhdGFsaW5lKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHNlbmQgdGhlIGRhdGEgb3ZlciB0aGUgbWVzc2VuZ2VyXG4gICAgcmV0dXJuIHdyaXRlLmNhbGwobWVzc2VuZ2VyLCBkYXRhbGluZSk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIGFubm91bmNlKGRhdGE/KVxuXG4gICAgVGhlIGBhbm5vdW5jZWAgZnVuY3Rpb24gb2YgdGhlIHNpZ25hbGxlciB3aWxsIHBhc3MgYW4gYC9hbm5vdW5jZWAgbWVzc2FnZVxuICAgIHRocm91Z2ggdGhlIG1lc3NlbmdlciBuZXR3b3JrLiAgV2hlbiBubyBhZGRpdGlvbmFsIGRhdGEgaXMgc3VwcGxpZWQgdG9cbiAgICB0aGlzIGZ1bmN0aW9uIHRoZW4gb25seSB0aGUgaWQgb2YgdGhlIHNpZ25hbGxlciBpcyBzZW50IHRvIGFsbCBhY3RpdmVcbiAgICBtZW1iZXJzIG9mIHRoZSBtZXNzZW5naW5nIG5ldHdvcmsuXG5cbiAgICAjIyMjIEpvaW5pbmcgUm9vbXNcblxuICAgIFRvIGpvaW4gYSByb29tIHVzaW5nIGFuIGFubm91bmNlIGNhbGwgeW91IHNpbXBseSBwcm92aWRlIHRoZSBuYW1lIG9mIHRoZVxuICAgIHJvb20geW91IHdpc2ggdG8gam9pbiBhcyBwYXJ0IG9mIHRoZSBkYXRhIGJsb2NrIHRoYXQgeW91IGFubm91Y2UsIGZvclxuICAgIGV4YW1wbGU6XG5cbiAgICBgYGBqc1xuICAgIHNpZ25hbGxlci5hbm5vdW5jZSh7IHJvb206ICd0ZXN0cm9vbScgfSk7XG4gICAgYGBgXG5cbiAgICBTaWduYWxsaW5nIHNlcnZlcnMgKHN1Y2ggYXNcbiAgICBbcnRjLXN3aXRjaGJvYXJkXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zd2l0Y2hib2FyZCkpIHdpbGwgdGhlblxuICAgIHBsYWNlIHlvdXIgcGVlciBjb25uZWN0aW9uIGludG8gYSByb29tIHdpdGggb3RoZXIgcGVlcnMgdGhhdCBoYXZlIGFsc29cbiAgICBhbm5vdW5jZWQgaW4gdGhpcyByb29tLlxuXG4gICAgT25jZSB5b3UgaGF2ZSBqb2luZWQgYSByb29tLCB0aGUgc2VydmVyIHdpbGwgb25seSBkZWxpdmVyIG1lc3NhZ2VzIHRoYXRcbiAgICB5b3UgYHNlbmRgIHRvIG90aGVyIHBlZXJzIHdpdGhpbiB0aGF0IHJvb20uXG5cbiAgICAjIyMjIFByb3ZpZGluZyBBZGRpdGlvbmFsIEFubm91bmNlIERhdGFcblxuICAgIFRoZXJlIG1heSBiZSBpbnN0YW5jZXMgd2hlcmUgeW91IHdpc2ggdG8gc2VuZCBhZGRpdGlvbmFsIGRhdGEgYXMgcGFydCBvZlxuICAgIHlvdXIgYW5ub3VuY2UgbWVzc2FnZSBpbiB5b3VyIGFwcGxpY2F0aW9uLiAgRm9yIGluc3RhbmNlLCBtYXliZSB5b3Ugd2FudFxuICAgIHRvIHNlbmQgYW4gYWxpYXMgb3IgbmljayBhcyBwYXJ0IG9mIHlvdXIgYW5ub3VuY2UgbWVzc2FnZSByYXRoZXIgdGhhbiBqdXN0XG4gICAgdXNlIHRoZSBzaWduYWxsZXIncyBnZW5lcmF0ZWQgaWQuXG5cbiAgICBJZiBmb3IgaW5zdGFuY2UgeW91IHdlcmUgd3JpdGluZyBhIHNpbXBsZSBjaGF0IGFwcGxpY2F0aW9uIHlvdSBjb3VsZCBqb2luXG4gICAgdGhlIGB3ZWJydGNgIHJvb20gYW5kIHRlbGwgZXZlcnlvbmUgeW91ciBuYW1lIHdpdGggdGhlIGZvbGxvd2luZyBhbm5vdW5jZVxuICAgIGNhbGw6XG5cbiAgICBgYGBqc1xuICAgIHNpZ25hbGxlci5hbm5vdW5jZSh7XG4gICAgICByb29tOiAnd2VicnRjJyxcbiAgICAgIG5pY2s6ICdEYW1vbidcbiAgICB9KTtcbiAgICBgYGBcblxuICAgICMjIyMgQW5ub3VuY2luZyBVcGRhdGVzXG5cbiAgICBUaGUgc2lnbmFsbGVyIGlzIHdyaXR0ZW4gdG8gZGlzdGluZ3Vpc2ggYmV0d2VlbiBpbml0aWFsIHBlZXIgYW5ub3VuY2VtZW50c1xuICAgIGFuZCBwZWVyIGRhdGEgdXBkYXRlcyAoc2VlIHRoZSBkb2NzIG9uIHRoZSBhbm5vdW5jZSBoYW5kbGVyIGJlbG93KS4gQXNcbiAgICBzdWNoIGl0IGlzIG9rIHRvIHByb3ZpZGUgYW55IGRhdGEgdXBkYXRlcyB1c2luZyB0aGUgYW5ub3VuY2UgbWV0aG9kIGFsc28uXG5cbiAgICBGb3IgaW5zdGFuY2UsIEkgY291bGQgc2VuZCBhIHN0YXR1cyB1cGRhdGUgYXMgYW4gYW5ub3VuY2UgbWVzc2FnZSB0byBmbGFnXG4gICAgdGhhdCBJIGFtIGdvaW5nIG9mZmxpbmU6XG5cbiAgICBgYGBqc1xuICAgIHNpZ25hbGxlci5hbm5vdW5jZSh7IHN0YXR1czogJ29mZmxpbmUnIH0pO1xuICAgIGBgYFxuXG4gICoqL1xuICBzaWduYWxsZXIuYW5ub3VuY2UgPSBmdW5jdGlvbihkYXRhLCBzZW5kZXIpIHtcbiAgICBjbGVhclRpbWVvdXQoYW5ub3VuY2VUaW1lcik7XG5cbiAgICAvLyB1cGRhdGUgaW50ZXJuYWwgYXR0cmlidXRlc1xuICAgIGV4dGVuZChhdHRyaWJ1dGVzLCBkYXRhLCB7IGlkOiBzaWduYWxsZXIuaWQgfSk7XG5cbiAgICAvLyBpZiB3ZSBhcmUgYWxyZWFkeSBjb25uZWN0ZWQsIHRoZW4gZW5zdXJlIHdlIGFubm91bmNlIG9uXG4gICAgLy8gcmVjb25uZWN0XG4gICAgaWYgKGNvbm5lY3RlZCkge1xuICAgICAgLy8gYWx3YXlzIGFubm91bmNlIG9uIHJlY29ubmVjdFxuICAgICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdjb25uZWN0ZWQnLCBhbm5vdW5jZU9uUmVjb25uZWN0KTtcbiAgICAgIHNpZ25hbGxlci5vbignY29ubmVjdGVkJywgYW5ub3VuY2VPblJlY29ubmVjdCk7XG4gICAgfVxuXG4gICAgLy8gc2VuZCB0aGUgYXR0cmlidXRlcyBvdmVyIHRoZSBuZXR3b3JrXG4gICAgcmV0dXJuIGFubm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEgY29ubmVjdGVkKSB7XG4gICAgICAgIHJldHVybiBzaWduYWxsZXIub25jZSgnY29ubmVjdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgKHNlbmRlciB8fCBzZW5kKSgnL2Fubm91bmNlJywgYXR0cmlidXRlcyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAoc2VuZGVyIHx8IHNlbmQpKCcvYW5ub3VuY2UnLCBhdHRyaWJ1dGVzKTtcbiAgICB9LCAob3B0cyB8fCB7fSkuYW5ub3VuY2VEZWxheSB8fCAxMCk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIGlzTWFzdGVyKHRhcmdldElkKVxuXG4gICAgQSBzaW1wbGUgZnVuY3Rpb24gdGhhdCBpbmRpY2F0ZXMgd2hldGhlciB0aGUgbG9jYWwgc2lnbmFsbGVyIGlzIHRoZSBtYXN0ZXJcbiAgICBmb3IgaXQncyByZWxhdGlvbnNoaXAgd2l0aCBwZWVyIHNpZ25hbGxlciBpbmRpY2F0ZWQgYnkgYHRhcmdldElkYC4gIFJvbGVzXG4gICAgYXJlIGRldGVybWluZWQgYXQgdGhlIHBvaW50IGF0IHdoaWNoIHNpZ25hbGxpbmcgcGVlcnMgZGlzY292ZXIgZWFjaCBvdGhlcixcbiAgICBhbmQgYXJlIHNpbXBseSB3b3JrZWQgb3V0IGJ5IHdoaWNoZXZlciBwZWVyIGhhcyB0aGUgbG93ZXN0IHNpZ25hbGxlciBpZFxuICAgIHdoZW4gbGV4aWdyYXBoaWNhbGx5IHNvcnRlZC5cblxuICAgIEZvciBleGFtcGxlLCBpZiB3ZSBoYXZlIHR3byBzaWduYWxsZXIgcGVlcnMgdGhhdCBoYXZlIGRpc2NvdmVyZWQgZWFjaFxuICAgIG90aGVycyB3aXRoIHRoZSBmb2xsb3dpbmcgaWRzOlxuXG4gICAgLSBgYjExZjRmZDAtZmViNS00NDdjLTgwYzgtYzUxZDhjM2NjZWQyYFxuICAgIC0gYDhhMDdmODJlLTQ5YTUtNGI5Yi1hMDJlLTQzZDkxMTM4MmJlNmBcblxuICAgIFRoZXkgd291bGQgYmUgYXNzaWduZWQgcm9sZXM6XG5cbiAgICAtIGBiMTFmNGZkMC1mZWI1LTQ0N2MtODBjOC1jNTFkOGMzY2NlZDJgXG4gICAgLSBgOGEwN2Y4MmUtNDlhNS00YjliLWEwMmUtNDNkOTExMzgyYmU2YCAobWFzdGVyKVxuXG4gICoqL1xuICBzaWduYWxsZXIuaXNNYXN0ZXIgPSBmdW5jdGlvbih0YXJnZXRJZCkge1xuICAgIHZhciBwZWVyID0gcGVlcnMuZ2V0KHRhcmdldElkKTtcblxuICAgIHJldHVybiBwZWVyICYmIHBlZXIucm9sZUlkeCAhPT0gMDtcbiAgfTtcblxuICAvKipcbiAgICAjIyMgbGVhdmUoKVxuXG4gICAgVGVsbCB0aGUgc2lnbmFsbGluZyBzZXJ2ZXIgd2UgYXJlIGxlYXZpbmcuICBDYWxsaW5nIHRoaXMgZnVuY3Rpb24gaXNcbiAgICB1c3VhbGx5IG5vdCByZXF1aXJlZCB0aG91Z2ggYXMgdGhlIHNpZ25hbGxpbmcgc2VydmVyIHNob3VsZCBpc3N1ZSBjb3JyZWN0XG4gICAgYC9sZWF2ZWAgbWVzc2FnZXMgd2hlbiBpdCBkZXRlY3RzIGEgZGlzY29ubmVjdCBldmVudC5cblxuICAqKi9cbiAgc2lnbmFsbGVyLmxlYXZlID0gc2lnbmFsbGVyLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gc2VuZCB0aGUgbGVhdmUgc2lnbmFsXG4gICAgc2VuZCgnL2xlYXZlJywgeyBpZDogaWQgfSk7XG5cbiAgICAvLyBzdG9wIGFubm91bmNpbmcgb24gcmVjb25uZWN0XG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdjb25uZWN0ZWQnLCBhbm5vdW5jZU9uUmVjb25uZWN0KTtcblxuICAgIC8vIGNhbGwgdGhlIGNsb3NlIG1ldGhvZFxuICAgIGlmICh0eXBlb2YgY2xvc2UgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2xvc2UuY2FsbChtZXNzZW5nZXIpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICAjIyMgbWV0YWRhdGEoZGF0YT8pXG5cbiAgICBHZXQgKHBhc3Mgbm8gZGF0YSkgb3Igc2V0IHRoZSBtZXRhZGF0YSB0aGF0IGlzIHBhc3NlZCB0aHJvdWdoIHdpdGggZWFjaFxuICAgIHJlcXVlc3Qgc2VudCBieSB0aGUgc2lnbmFsbGVyLlxuXG4gICAgX19OT1RFOl9fIFJlZ2FyZGxlc3Mgb2Ygd2hhdCBpcyBwYXNzZWQgdG8gdGhpcyBmdW5jdGlvbiwgbWV0YWRhdGFcbiAgICBnZW5lcmF0ZWQgYnkgdGhlIHNpZ25hbGxlciB3aWxsICoqYWx3YXlzKiogaW5jbHVkZSB0aGUgaWQgb2YgdGhlIHNpZ25hbGxlclxuICAgIGFuZCB0aGlzIGNhbm5vdCBiZSBtb2RpZmllZC5cbiAgKiovXG4gIHNpZ25hbGxlci5tZXRhZGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGV4dGVuZCh7fSwgbG9jYWxNZXRhKTtcbiAgICB9XG5cbiAgICBsb2NhbE1ldGEgPSBleHRlbmQoe30sIGRhdGEpO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyB0byh0YXJnZXRJZClcblxuICAgIFVzZSB0aGUgYHRvYCBmdW5jdGlvbiB0byBzZW5kIGEgbWVzc2FnZSB0byB0aGUgc3BlY2lmaWVkIHRhcmdldCBwZWVyLlxuICAgIEEgbGFyZ2UgcGFyZ2Ugb2YgbmVnb3RpYXRpbmcgYSBXZWJSVEMgcGVlciBjb25uZWN0aW9uIGludm9sdmVzIGRpcmVjdFxuICAgIGNvbW11bmljYXRpb24gYmV0d2VlbiB0d28gcGFydGllcyB3aGljaCBtdXN0IGJlIGRvbmUgYnkgdGhlIHNpZ25hbGxpbmdcbiAgICBzZXJ2ZXIuICBUaGUgYHRvYCBmdW5jdGlvbiBwcm92aWRlcyBhIHNpbXBsZSB3YXkgdG8gcHJvdmlkZSBhIGxvZ2ljYWxcbiAgICBjb21tdW5pY2F0aW9uIGNoYW5uZWwgYmV0d2VlbiB0aGUgdHdvIHBhcnRpZXM6XG5cbiAgICBgYGBqc1xuICAgIHZhciBzZW5kID0gc2lnbmFsbGVyLnRvKCdlOTVmYTA1Yi05MDYyLTQ1YzYtYmZhMi01MDU1YmY2NjI1ZjQnKS5zZW5kO1xuXG4gICAgLy8gY3JlYXRlIGFuIG9mZmVyIG9uIGEgbG9jYWwgcGVlciBjb25uZWN0aW9uXG4gICAgcGMuY3JlYXRlT2ZmZXIoXG4gICAgICBmdW5jdGlvbihkZXNjKSB7XG4gICAgICAgIC8vIHNldCB0aGUgbG9jYWwgZGVzY3JpcHRpb24gdXNpbmcgdGhlIG9mZmVyIHNkcFxuICAgICAgICAvLyBpZiB0aGlzIG9jY3VycyBzdWNjZXNzZnVsbHkgc2VuZCB0aGlzIHRvIG91ciBwZWVyXG4gICAgICAgIHBjLnNldExvY2FsRGVzY3JpcHRpb24oXG4gICAgICAgICAgZGVzYyxcbiAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNlbmQoJy9zZHAnLCBkZXNjKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGhhbmRsZUZhaWxcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgICBoYW5kbGVGYWlsXG4gICAgKTtcbiAgICBgYGBcblxuICAqKi9cbiAgc2lnbmFsbGVyLnRvID0gZnVuY3Rpb24odGFyZ2V0SWQpIHtcbiAgICAvLyBjcmVhdGUgYSBzZW5kZXIgdGhhdCB3aWxsIHByZXBlbmQgbWVzc2FnZXMgd2l0aCAvdG98dGFyZ2V0SWR8XG4gICAgdmFyIHNlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gZ2V0IHRoZSBwZWVyICh5ZXMgd2hlbiBzZW5kIGlzIGNhbGxlZCB0byBtYWtlIHN1cmUgaXQgaGFzbid0IGxlZnQpXG4gICAgICB2YXIgcGVlciA9IHNpZ25hbGxlci5wZWVycy5nZXQodGFyZ2V0SWQpO1xuICAgICAgdmFyIGFyZ3M7XG5cbiAgICAgIGlmICghIHBlZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHBlZXI6ICcgKyB0YXJnZXRJZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGlmIHRoZSBwZWVyIGlzIGluYWN0aXZlLCB0aGVuIGFib3J0XG4gICAgICBpZiAocGVlci5pbmFjdGl2ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGFyZ3MgPSBbXG4gICAgICAgICcvdG8nLFxuICAgICAgICB0YXJnZXRJZFxuICAgICAgXS5jb25jYXQoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblxuICAgICAgLy8gaW5qZWN0IG1ldGFkYXRhXG4gICAgICBhcmdzLnNwbGljZSgzLCAwLCBjcmVhdGVNZXRhZGF0YSgpKTtcblxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGNyZWF0ZURhdGFMaW5lKGFyZ3MpO1xuICAgICAgICBkZWJ1ZygnVFggKCcgKyB0YXJnZXRJZCArICcpOiAnICsgbXNnKTtcblxuICAgICAgICB3cml0ZS5jYWxsKG1lc3NlbmdlciwgbXNnKTtcbiAgICAgIH0sIDApO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5ub3VuY2U6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHNpZ25hbGxlci5hbm5vdW5jZShkYXRhLCBzZW5kZXIpO1xuICAgICAgfSxcblxuICAgICAgc2VuZDogc2VuZGVyLFxuICAgIH1cbiAgfTtcblxuICAvLyByZW1vdmUgbWF4IGxpc3RlbmVycyBmcm9tIHRoZSBlbWl0dGVyXG4gIHNpZ25hbGxlci5zZXRNYXhMaXN0ZW5lcnMoMCk7XG5cbiAgLy8gaW5pdGlhbGlzZSBvcHRzIGRlZmF1bHRzXG4gIG9wdHMgPSBkZWZhdWx0cyh7fSwgb3B0cywgcmVxdWlyZSgnLi9kZWZhdWx0cycpKTtcblxuICAvLyBzZXQgdGhlIGF1dG9yZXBseSBmbGFnXG4gIHNpZ25hbGxlci5hdXRvcmVwbHkgPSBhdXRvcmVwbHkgPT09IHVuZGVmaW5lZCB8fCBhdXRvcmVwbHk7XG5cbiAgLy8gaWYgdGhlIG1lc3NlbmdlciBpcyBhIHN0cmluZywgdGhlbiB3ZSBhcmUgZ29pbmcgdG8gYXR0YWNoIHRvIGFcbiAgLy8gd3MgZW5kcG9pbnQgYW5kIGF1dG9tYXRpY2FsbHkgc2V0IHVwIHByaW11c1xuICBpZiAodHlwZW9mIG1lc3NlbmdlciA9PSAnc3RyaW5nJyB8fCAobWVzc2VuZ2VyIGluc3RhbmNlb2YgU3RyaW5nKSkge1xuICAgIGNvbm5lY3RUb0hvc3QobWVzc2VuZ2VyKTtcbiAgfVxuICAvLyBvdGhlcndpc2UsIGluaXRpYWxpc2UgdGhlIGNvbm5lY3Rpb25cbiAgZWxzZSB7XG4gICAgaW5pdCgpO1xuICB9XG5cbiAgLy8gY29ubmVjdCBhbiBpbnN0YW5jZSBvZiB0aGUgbWVzc2VuZ2VyIHRvIHRoZSBzaWduYWxsZXJcbiAgc2lnbmFsbGVyLl9tZXNzZW5nZXIgPSBtZXNzZW5nZXI7XG5cbiAgLy8gZXhwb3NlIHRoZSBwcm9jZXNzIGFzIGEgcHJvY2VzcyBmdW5jdGlvblxuICBzaWduYWxsZXIucHJvY2VzcyA9IHByb2Nlc3NvcjtcblxuICByZXR1cm4gc2lnbmFsbGVyO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgZG9jdW1lbnQsIGxvY2F0aW9uLCBQcmltdXM6IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciByZVRyYWlsaW5nU2xhc2ggPSAvXFwvJC87XG5cbi8qKlxuICAjIyMgbG9hZFByaW11cyhzaWduYWxob3N0LCBjYWxsYmFjaylcblxuICBUaGlzIGlzIGEgY29udmVuaWVuY2UgZnVuY3Rpb24gdGhhdCBpcyBwYXRjaGVkIGludG8gdGhlIHNpZ25hbGxlciB0byBhc3Npc3RcbiAgd2l0aCBsb2FkaW5nIHRoZSBgcHJpbXVzLmpzYCBjbGllbnQgbGlicmFyeSBmcm9tIGFuIGBydGMtc3dpdGNoYm9hcmRgXG4gIHNpZ25hbGluZyBzZXJ2ZXIuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxob3N0LCBjYWxsYmFjaykge1xuICB2YXIgYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICB2YXIgc2NyaXB0O1xuICB2YXIgYmFzZVVybDtcbiAgdmFyIHNjcmlwdFNyYztcblxuICAvLyBpZiB0aGUgc2lnbmFsaG9zdCBpcyBhIGZ1bmN0aW9uLCB3ZSBhcmUgaW4gc2luZ2xlIGFyZyBjYWxsaW5nIG1vZGVcbiAgaWYgKHR5cGVvZiBzaWduYWxob3N0ID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IHNpZ25hbGhvc3Q7XG4gICAgc2lnbmFsaG9zdCA9IGxvY2F0aW9uLm9yaWdpbjtcbiAgfVxuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGFuY2hvciB3aXRoIHRoZSBzaWduYWxob3N0XG4gIGFuY2hvci5ocmVmID0gc2lnbmFsaG9zdDtcblxuICAvLyByZWFkIHRoZSBiYXNlIHBhdGhcbiAgYmFzZVVybCA9IHNpZ25hbGhvc3QucmVwbGFjZShyZVRyYWlsaW5nU2xhc2gsICcnKTtcbiAgc2NyaXB0U3JjID0gYmFzZVVybCArICcvcnRjLmlvL3ByaW11cy5qcyc7XG5cbiAgLy8gbG9vayBmb3IgdGhlIHNjcmlwdCBmaXJzdFxuICBzY3JpcHQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdzY3JpcHRbc3JjPVwiJyArIHNjcmlwdFNyYyArICdcIl0nKTtcblxuICAvLyBpZiB3ZSBmb3VuZCwgdGhlIHNjcmlwdCB0cmlnZ2VyIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseVxuICBpZiAoc2NyaXB0ICYmIHR5cGVvZiBQcmltdXMgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgUHJpbXVzKTtcbiAgfVxuICAvLyBvdGhlcndpc2UsIGlmIHRoZSBzY3JpcHQgZXhpc3RzIGJ1dCBQcmltdXMgaXMgbm90IGxvYWRlZCxcbiAgLy8gdGhlbiB3YWl0IGZvciB0aGUgbG9hZFxuICBlbHNlIGlmIChzY3JpcHQpIHtcbiAgICBzY3JpcHQuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbGJhY2sobnVsbCwgUHJpbXVzKTtcbiAgICB9KTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIG90aGVyd2lzZSBjcmVhdGUgdGhlIHNjcmlwdCBhbmQgbG9hZCBwcmltdXNcbiAgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gIHNjcmlwdC5zcmMgPSBzY3JpcHRTcmM7XG5cbiAgc2NyaXB0Lm9uZXJyb3IgPSBjYWxsYmFjaztcbiAgc2NyaXB0LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAvLyBpZiB3ZSBoYXZlIGEgc2lnbmFsaG9zdCB0aGF0IGlzIG5vdCBiYXNlcGF0aGVkIGF0IC9cbiAgICAvLyB0aGVuIHR3ZWFrIHRoZSBwcmltdXMgcHJvdG90eXBlXG4gICAgaWYgKGFuY2hvci5wYXRobmFtZSAhPT0gJy8nKSB7XG4gICAgICBQcmltdXMucHJvdG90eXBlLnBhdGhuYW1lID0gYW5jaG9yLnBhdGhuYW1lLnJlcGxhY2UocmVUcmFpbGluZ1NsYXNoLCAnJykgK1xuICAgICAgICBQcmltdXMucHJvdG90eXBlLnBhdGhuYW1lO1xuICAgIH1cblxuICAgIGNhbGxiYWNrKG51bGwsIFByaW11cyk7XG4gIH0pO1xuXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ3J0Yy1zaWduYWxsZXInKTtcbnZhciBqc29ucGFyc2UgPSByZXF1aXJlKCdjb2cvanNvbnBhcnNlJyk7XG5cbi8qKlxuICAjIyMgc2lnbmFsbGVyIHByb2Nlc3MgaGFuZGxpbmdcblxuICBXaGVuIGEgc2lnbmFsbGVyJ3MgdW5kZXJsaW5nIG1lc3NlbmdlciBlbWl0cyBhIGBkYXRhYCBldmVudCB0aGlzIGlzXG4gIGRlbGVnYXRlZCB0byBhIHNpbXBsZSBtZXNzYWdlIHBhcnNlciwgd2hpY2ggYXBwbGllcyB0aGUgZm9sbG93aW5nIHNpbXBsZVxuICBsb2dpYzpcblxuICAtIElzIHRoZSBtZXNzYWdlIGEgYC90b2AgbWVzc2FnZS4gSWYgc28sIHNlZSBpZiB0aGUgbWVzc2FnZSBpcyBmb3IgdGhpc1xuICAgIHNpZ25hbGxlciAoY2hlY2tpbmcgdGhlIHRhcmdldCBpZCAtIDJuZCBhcmcpLiAgSWYgc28gcGFzcyB0aGVcbiAgICByZW1haW5kZXIgb2YgdGhlIG1lc3NhZ2Ugb250byB0aGUgc3RhbmRhcmQgcHJvY2Vzc2luZyBjaGFpbi4gIElmIG5vdCxcbiAgICBkaXNjYXJkIHRoZSBtZXNzYWdlLlxuXG4gIC0gSXMgdGhlIG1lc3NhZ2UgYSBjb21tYW5kIG1lc3NhZ2UgKHByZWZpeGVkIHdpdGggYSBmb3J3YXJkIHNsYXNoKS4gSWYgc28sXG4gICAgbG9vayBmb3IgYW4gYXBwcm9wcmlhdGUgbWVzc2FnZSBoYW5kbGVyIGFuZCBwYXNzIHRoZSBtZXNzYWdlIHBheWxvYWQgb25cbiAgICB0byBpdC5cblxuICAtIEZpbmFsbHksIGRvZXMgdGhlIG1lc3NhZ2UgbWF0Y2ggYW55IHBhdHRlcm5zIHRoYXQgd2UgYXJlIGxpc3RlbmluZyBmb3I/XG4gICAgSWYgc28sIHRoZW4gcGFzcyB0aGUgZW50aXJlIG1lc3NhZ2UgY29udGVudHMgb250byB0aGUgcmVnaXN0ZXJlZCBoYW5kbGVyLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNpZ25hbGxlciwgb3B0cykge1xuICB2YXIgaGFuZGxlcnMgPSByZXF1aXJlKCcuL2hhbmRsZXJzJykoc2lnbmFsbGVyLCBvcHRzKTtcblxuICBmdW5jdGlvbiBzZW5kRXZlbnQocGFydHMsIHNyY1N0YXRlLCBkYXRhKSB7XG4gICAgLy8gaW5pdGlhbGlzZSB0aGUgZXZlbnQgbmFtZVxuICAgIHZhciBldnROYW1lID0gcGFydHNbMF0uc2xpY2UoMSk7XG5cbiAgICAvLyBjb252ZXJ0IGFueSB2YWxpZCBqc29uIG9iamVjdHMgdG8ganNvblxuICAgIHZhciBhcmdzID0gcGFydHMuc2xpY2UoMikubWFwKGpzb25wYXJzZSk7XG5cbiAgICBzaWduYWxsZXIuZW1pdC5hcHBseShcbiAgICAgIHNpZ25hbGxlcixcbiAgICAgIFtldnROYW1lXS5jb25jYXQoYXJncykuY29uY2F0KFtzcmNTdGF0ZSwgZGF0YV0pXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihvcmlnaW5hbERhdGEpIHtcbiAgICB2YXIgZGF0YSA9IG9yaWdpbmFsRGF0YTtcbiAgICB2YXIgaXNNYXRjaCA9IHRydWU7XG4gICAgdmFyIHBhcnRzO1xuICAgIHZhciBoYW5kbGVyO1xuICAgIHZhciBzcmNEYXRhO1xuICAgIHZhciBzcmNTdGF0ZTtcbiAgICB2YXIgaXNEaXJlY3RNZXNzYWdlID0gZmFsc2U7XG5cbiAgICAvLyBmb3JjZSB0aGUgaWQgaW50byBzdHJpbmcgZm9ybWF0IHNvIHdlIGNhbiBydW4gbGVuZ3RoIGFuZCBjb21wYXJpc29uIHRlc3RzIG9uIGl0XG4gICAgdmFyIGlkID0gc2lnbmFsbGVyLmlkICsgJyc7XG4gICAgZGVidWcoJ3NpZ25hbGxlciAnICsgaWQgKyAnIHJlY2VpdmVkIGRhdGE6ICcgKyBvcmlnaW5hbERhdGEpO1xuXG4gICAgLy8gcHJvY2VzcyAvdG8gbWVzc2FnZXNcbiAgICBpZiAoZGF0YS5zbGljZSgwLCAzKSA9PT0gJy90bycpIHtcbiAgICAgIGlzTWF0Y2ggPSBkYXRhLnNsaWNlKDQsIGlkLmxlbmd0aCArIDQpID09PSBpZDtcbiAgICAgIGlmIChpc01hdGNoKSB7XG4gICAgICAgIHBhcnRzID0gZGF0YS5zbGljZSg1ICsgaWQubGVuZ3RoKS5zcGxpdCgnfCcpLm1hcChqc29ucGFyc2UpO1xuXG4gICAgICAgIC8vIGdldCB0aGUgc291cmNlIGRhdGFcbiAgICAgICAgaXNEaXJlY3RNZXNzYWdlID0gdHJ1ZTtcblxuICAgICAgICAvLyBleHRyYWN0IHRoZSB2ZWN0b3IgY2xvY2sgYW5kIHVwZGF0ZSB0aGUgcGFydHNcbiAgICAgICAgcGFydHMgPSBwYXJ0cy5tYXAoanNvbnBhcnNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpZiB0aGlzIGlzIG5vdCBhIG1hdGNoLCB0aGVuIGJhaWxcbiAgICBpZiAoISBpc01hdGNoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gY2hvcCB0aGUgZGF0YSBpbnRvIHBhcnRzXG4gICAgcGFydHMgPSBwYXJ0cyB8fCBkYXRhLnNwbGl0KCd8JykubWFwKGpzb25wYXJzZSk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgc3BlY2lmaWMgaGFuZGxlciBmb3IgdGhlIGFjdGlvbiwgdGhlbiBpbnZva2VcbiAgICBpZiAodHlwZW9mIHBhcnRzWzBdID09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBleHRyYWN0IHRoZSBtZXRhZGF0YSBmcm9tIHRoZSBpbnB1dCBkYXRhXG4gICAgICBzcmNEYXRhID0gcGFydHNbMV07XG5cbiAgICAgIC8vIGlmIHdlIGdvdCBkYXRhIGZyb20gb3Vyc2VsZiwgdGhlbiB0aGlzIGlzIHByZXR0eSBkdW1iXG4gICAgICAvLyBidXQgaWYgd2UgaGF2ZSB0aGVuIHRocm93IGl0IGF3YXlcbiAgICAgIGlmIChzcmNEYXRhICYmIHNyY0RhdGEuaWQgPT09IHNpZ25hbGxlci5pZCkge1xuICAgICAgICByZXR1cm4gY29uc29sZS53YXJuKCdnb3QgZGF0YSBmcm9tIG91cnNlbGYsIGRpc2NhcmRpbmcnKTtcbiAgICAgIH1cblxuICAgICAgLy8gZ2V0IHRoZSBzb3VyY2Ugc3RhdGVcbiAgICAgIHNyY1N0YXRlID0gc2lnbmFsbGVyLnBlZXJzLmdldChzcmNEYXRhICYmIHNyY0RhdGEuaWQpIHx8IHNyY0RhdGE7XG5cbiAgICAgIC8vIGhhbmRsZSBjb21tYW5kc1xuICAgICAgaWYgKHBhcnRzWzBdLmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgICAgIC8vIGxvb2sgZm9yIGEgaGFuZGxlciBmb3IgdGhlIG1lc3NhZ2UgdHlwZVxuICAgICAgICBoYW5kbGVyID0gaGFuZGxlcnNbcGFydHNbMF0uc2xpY2UoMSldO1xuXG4gICAgICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgaGFuZGxlcihcbiAgICAgICAgICAgIHBhcnRzLnNsaWNlKDIpLFxuICAgICAgICAgICAgcGFydHNbMF0uc2xpY2UoMSksXG4gICAgICAgICAgICBzcmNEYXRhLFxuICAgICAgICAgICAgc3JjU3RhdGUsXG4gICAgICAgICAgICBpc0RpcmVjdE1lc3NhZ2VcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHNlbmRFdmVudChwYXJ0cywgc3JjU3RhdGUsIG9yaWdpbmFsRGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIG90aGVyd2lzZSwgZW1pdCBkYXRhXG4gICAgICBlbHNlIHtcbiAgICAgICAgc2lnbmFsbGVyLmVtaXQoXG4gICAgICAgICAgJ2RhdGEnLFxuICAgICAgICAgIHBhcnRzLnNsaWNlKDAsIDEpLmNvbmNhdChwYXJ0cy5zbGljZSgyKSksXG4gICAgICAgICAgc3JjRGF0YSxcbiAgICAgICAgICBzcmNTdGF0ZSxcbiAgICAgICAgICBpc0RpcmVjdE1lc3NhZ2VcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59O1xuIiwiLy8gTGV2ZXJPbmUncyBhd2Vzb21lIHV1aWQgZ2VuZXJhdG9yXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGEsYil7Zm9yKGI9YT0nJzthKys8MzY7Yis9YSo1MSY1Mj8oYV4xNT84Xk1hdGgucmFuZG9tKCkqKGFeMjA/MTY6NCk6NCkudG9TdHJpbmcoMTYpOictJyk7cmV0dXJuIGJ9O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdydGMvY2xlYW51cCcpO1xuXG52YXIgQ0FOTk9UX0NMT1NFX1NUQVRFUyA9IFtcbiAgJ2Nsb3NlZCdcbl07XG5cbnZhciBFVkVOVE5BTUVTID0gW1xuICAnYWRkc3RyZWFtJyxcbiAgJ2RhdGFjaGFubmVsJyxcbiAgJ2ljZWNhbmRpZGF0ZScsXG4gICdpY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UnLFxuICAnbmVnb3RpYXRpb25uZWVkZWQnLFxuICAncmVtb3Zlc3RyZWFtJyxcbiAgJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJ1xuXTtcblxuLyoqXG4gICMjIyBydGMtdG9vbHMvY2xlYW51cFxuXG4gIGBgYFxuICBjbGVhbnVwKHBjKVxuICBgYGBcblxuICBUaGUgYGNsZWFudXBgIGZ1bmN0aW9uIGlzIHVzZWQgdG8gZW5zdXJlIHRoYXQgYSBwZWVyIGNvbm5lY3Rpb24gaXMgcHJvcGVybHlcbiAgY2xvc2VkIGFuZCByZWFkeSB0byBiZSBjbGVhbmVkIHVwIGJ5IHRoZSBicm93c2VyLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGMpIHtcbiAgLy8gc2VlIGlmIHdlIGNhbiBjbG9zZSB0aGUgY29ubmVjdGlvblxuICB2YXIgY3VycmVudFN0YXRlID0gcGMuaWNlQ29ubmVjdGlvblN0YXRlO1xuICB2YXIgY2FuQ2xvc2UgPSBDQU5OT1RfQ0xPU0VfU1RBVEVTLmluZGV4T2YoY3VycmVudFN0YXRlKSA8IDA7XG5cbiAgaWYgKGNhbkNsb3NlKSB7XG4gICAgZGVidWcoJ2F0dGVtcHRpbmcgY29ubmVjdGlvbiBjbG9zZSwgY3VycmVudCBzdGF0ZTogJysgcGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICBwYy5jbG9zZSgpO1xuICB9XG5cbiAgLy8gcmVtb3ZlIHRoZSBldmVudCBsaXN0ZW5lcnNcbiAgLy8gYWZ0ZXIgYSBzaG9ydCBkZWxheSBnaXZpbmcgdGhlIGNvbm5lY3Rpb24gdGltZSB0byB0cmlnZ2VyXG4gIC8vIGNsb3NlIGFuZCBpY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UgZXZlbnRzXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgRVZFTlROQU1FUy5mb3JFYWNoKGZ1bmN0aW9uKGV2dE5hbWUpIHtcbiAgICAgIGlmIChwY1snb24nICsgZXZ0TmFtZV0pIHtcbiAgICAgICAgcGNbJ29uJyArIGV2dE5hbWVdID0gbnVsbDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSwgMTAwKTtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXN5bmMgPSByZXF1aXJlKCdhc3luYycpO1xudmFyIGNsZWFudXAgPSByZXF1aXJlKCcuL2NsZWFudXAnKTtcbnZhciBtb25pdG9yID0gcmVxdWlyZSgnLi9tb25pdG9yJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcbnZhciBmaW5kUGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG52YXIgQ0xPU0VEX1NUQVRFUyA9IFsgJ2Nsb3NlZCcsICdmYWlsZWQnIF07XG5cbi8vIHRyYWNrIHRoZSB2YXJpb3VzIHN1cHBvcnRlZCBDcmVhdGVPZmZlciAvIENyZWF0ZUFuc3dlciBjb250cmFpbnRzXG4vLyB0aGF0IHdlIHJlY29nbml6ZSBhbmQgYWxsb3dcbnZhciBPRkZFUl9BTlNXRVJfQ09OU1RSQUlOVFMgPSBbXG4gICdvZmZlclRvUmVjZWl2ZVZpZGVvJyxcbiAgJ29mZmVyVG9SZWNlaXZlQXVkaW8nLFxuICAndm9pY2VBY3Rpdml0eURldGVjdGlvbicsXG4gICdpY2VSZXN0YXJ0J1xuXTtcblxuLyoqXG4gICMjIyBydGMtdG9vbHMvY291cGxlXG5cbiAgIyMjIyBjb3VwbGUocGMsIHRhcmdldElkLCBzaWduYWxsZXIsIG9wdHM/KVxuXG4gIENvdXBsZSBhIFdlYlJUQyBjb25uZWN0aW9uIHdpdGggYW5vdGhlciB3ZWJydGMgY29ubmVjdGlvbiBpZGVudGlmaWVkIGJ5XG4gIGB0YXJnZXRJZGAgdmlhIHRoZSBzaWduYWxsZXIuXG5cbiAgVGhlIGZvbGxvd2luZyBvcHRpb25zIGNhbiBiZSBwcm92aWRlZCBpbiB0aGUgYG9wdHNgIGFyZ3VtZW50OlxuXG4gIC0gYHNkcGZpbHRlcmAgKGRlZmF1bHQ6IG51bGwpXG5cbiAgICBBIHNpbXBsZSBmdW5jdGlvbiBmb3IgZmlsdGVyaW5nIFNEUCBhcyBwYXJ0IG9mIHRoZSBwZWVyXG4gICAgY29ubmVjdGlvbiBoYW5kc2hha2UgKHNlZSB0aGUgVXNpbmcgRmlsdGVycyBkZXRhaWxzIGJlbG93KS5cblxuICAjIyMjIyBFeGFtcGxlIFVzYWdlXG5cbiAgYGBganNcbiAgdmFyIGNvdXBsZSA9IHJlcXVpcmUoJ3J0Yy9jb3VwbGUnKTtcblxuICBjb3VwbGUocGMsICc1NDg3OTk2NS1jZTQzLTQyNmUtYThlZi0wOWFjMWUzOWExNmQnLCBzaWduYWxsZXIpO1xuICBgYGBcblxuICAjIyMjIyBVc2luZyBGaWx0ZXJzXG5cbiAgSW4gY2VydGFpbiBpbnN0YW5jZXMgeW91IG1heSB3aXNoIHRvIG1vZGlmeSB0aGUgcmF3IFNEUCB0aGF0IGlzIHByb3ZpZGVkXG4gIGJ5IHRoZSBgY3JlYXRlT2ZmZXJgIGFuZCBgY3JlYXRlQW5zd2VyYCBjYWxscy4gIFRoaXMgY2FuIGJlIGRvbmUgYnkgcGFzc2luZ1xuICBhIGBzZHBmaWx0ZXJgIGZ1bmN0aW9uIChvciBhcnJheSkgaW4gdGhlIG9wdGlvbnMuICBGb3IgZXhhbXBsZTpcblxuICBgYGBqc1xuICAvLyBydW4gdGhlIHNkcCBmcm9tIHRocm91Z2ggYSBsb2NhbCB0d2Vha1NkcCBmdW5jdGlvbi5cbiAgY291cGxlKHBjLCAnNTQ4Nzk5NjUtY2U0My00MjZlLWE4ZWYtMDlhYzFlMzlhMTZkJywgc2lnbmFsbGVyLCB7XG4gICAgc2RwZmlsdGVyOiB0d2Vha1NkcFxuICB9KTtcbiAgYGBgXG5cbioqL1xuZnVuY3Rpb24gY291cGxlKHBjLCB0YXJnZXRJZCwgc2lnbmFsbGVyLCBvcHRzKSB7XG4gIHZhciBkZWJ1Z0xhYmVsID0gKG9wdHMgfHwge30pLmRlYnVnTGFiZWwgfHwgJ3J0Yyc7XG4gIHZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKShkZWJ1Z0xhYmVsICsgJy9jb3VwbGUnKTtcblxuICAvLyBjcmVhdGUgYSBtb25pdG9yIGZvciB0aGUgY29ubmVjdGlvblxuICB2YXIgbW9uID0gbW9uaXRvcihwYywgdGFyZ2V0SWQsIHNpZ25hbGxlciwgb3B0cyk7XG4gIHZhciBxdWV1ZWRDYW5kaWRhdGVzID0gW107XG4gIHZhciBzZHBGaWx0ZXIgPSAob3B0cyB8fCB7fSkuc2RwZmlsdGVyO1xuICB2YXIgcmVhY3RpdmUgPSAob3B0cyB8fCB7fSkucmVhY3RpdmU7XG4gIHZhciBvZmZlclRpbWVvdXQ7XG4gIHZhciBlbmRPZkNhbmRpZGF0ZXMgPSB0cnVlO1xuICB2YXIgcGx1Z2luID0gZmluZFBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG5cbiAgLy8gY29uZmlndXJlIHRoZSB0aW1lIHRvIHdhaXQgYmV0d2VlbiByZWNlaXZpbmcgYSAnZGlzY29ubmVjdCdcbiAgLy8gaWNlQ29ubmVjdGlvblN0YXRlIGFuZCBkZXRlcm1pbmluZyB0aGF0IHdlIGFyZSBjbG9zZWRcbiAgdmFyIGRpc2Nvbm5lY3RUaW1lb3V0ID0gKG9wdHMgfHwge30pLmRpc2Nvbm5lY3RUaW1lb3V0IHx8IDEwMDAwO1xuICB2YXIgZGlzY29ubmVjdFRpbWVyO1xuXG4gIC8vIGlmIHRoZSBzaWduYWxsZXIgZG9lcyBub3Qgc3VwcG9ydCB0aGlzIGlzTWFzdGVyIGZ1bmN0aW9uIHRocm93IGFuXG4gIC8vIGV4Y2VwdGlvblxuICBpZiAodHlwZW9mIHNpZ25hbGxlci5pc01hc3RlciAhPSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdydGMtc2lnbmFsbGVyIGluc3RhbmNlID49IDAuMTQuMCByZXF1aXJlZCcpO1xuICB9XG5cbiAgLy8gaW5pdGlsYWlzZSB0aGUgbmVnb3RpYXRpb24gaGVscGVyc1xuICB2YXIgaXNNYXN0ZXIgPSBzaWduYWxsZXIuaXNNYXN0ZXIodGFyZ2V0SWQpO1xuXG4gIHZhciBjcmVhdGVPZmZlciA9IHByZXBOZWdvdGlhdGUoXG4gICAgJ2NyZWF0ZU9mZmVyJyxcbiAgICBpc01hc3RlcixcbiAgICBbIGNoZWNrU3RhYmxlIF1cbiAgKTtcblxuICB2YXIgY3JlYXRlQW5zd2VyID0gcHJlcE5lZ290aWF0ZShcbiAgICAnY3JlYXRlQW5zd2VyJyxcbiAgICB0cnVlLFxuICAgIFtdXG4gICk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgcHJvY2Vzc2luZyBxdWV1ZSAob25lIGF0IGEgdGltZSBwbGVhc2UpXG4gIHZhciBxID0gYXN5bmMucXVldWUoZnVuY3Rpb24odGFzaywgY2IpIHtcbiAgICAvLyBpZiB0aGUgdGFzayBoYXMgbm8gb3BlcmF0aW9uLCB0aGVuIHRyaWdnZXIgdGhlIGNhbGxiYWNrIGltbWVkaWF0ZWx5XG4gICAgaWYgKHR5cGVvZiB0YXNrLm9wICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBjYigpO1xuICAgIH1cblxuICAgIC8vIHByb2Nlc3MgdGhlIHRhc2sgb3BlcmF0aW9uXG4gICAgdGFzay5vcCh0YXNrLCBjYik7XG4gIH0sIDEpO1xuXG4gIC8vIGluaXRpYWxpc2Ugc2Vzc2lvbiBkZXNjcmlwdGlvbiBhbmQgaWNlY2FuZGlkYXRlIG9iamVjdHNcbiAgdmFyIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IChvcHRzIHx8IHt9KS5SVENTZXNzaW9uRGVzY3JpcHRpb24gfHxcbiAgICBkZXRlY3QoJ1JUQ1Nlc3Npb25EZXNjcmlwdGlvbicpO1xuXG4gIHZhciBSVENJY2VDYW5kaWRhdGUgPSAob3B0cyB8fCB7fSkuUlRDSWNlQ2FuZGlkYXRlIHx8XG4gICAgZGV0ZWN0KCdSVENJY2VDYW5kaWRhdGUnKTtcblxuICBmdW5jdGlvbiBhYm9ydChzdGFnZSwgc2RwLCBjYikge1xuICAgIHJldHVybiBmdW5jdGlvbihlcnIpIHtcbiAgICAgIC8vIGxvZyB0aGUgZXJyb3JcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3J0Yy9jb3VwbGUgZXJyb3IgKCcgKyBzdGFnZSArICcpOiAnLCBlcnIpO1xuXG4gICAgICBpZiAodHlwZW9mIGNiID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2IoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gYXBwbHlDYW5kaWRhdGVzV2hlblN0YWJsZSgpIHtcbiAgICBpZiAocGMuc2lnbmFsaW5nU3RhdGUgPT0gJ3N0YWJsZScgJiYgcGMucmVtb3RlRGVzY3JpcHRpb24pIHtcbiAgICAgIGRlYnVnKCdzaWduYWxpbmcgc3RhdGUgPSBzdGFibGUsIGFwcGx5aW5nIHF1ZXVlZCBjYW5kaWRhdGVzJyk7XG4gICAgICBtb24ucmVtb3ZlTGlzdGVuZXIoJ2NoYW5nZScsIGFwcGx5Q2FuZGlkYXRlc1doZW5TdGFibGUpO1xuXG4gICAgICAvLyBhcHBseSBhbnkgcXVldWVkIGNhbmRpZGF0ZXNcbiAgICAgIHF1ZXVlZENhbmRpZGF0ZXMuc3BsaWNlKDApLmZvckVhY2goZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBkZWJ1ZygnYXBwbHlpbmcgcXVldWVkIGNhbmRpZGF0ZScsIGRhdGEpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcGMuYWRkSWNlQ2FuZGlkYXRlKGNyZWF0ZUljZUNhbmRpZGF0ZShkYXRhKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICBkZWJ1ZygnaW52YWxpZGF0ZSBjYW5kaWRhdGUgc3BlY2lmaWVkOiAnLCBkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tOb3RDb25uZWN0aW5nKG5lZ290aWF0ZSkge1xuICAgIGlmIChwYy5pY2VDb25uZWN0aW9uU3RhdGUgIT0gJ2NoZWNraW5nJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZGVidWcoJ2Nvbm5lY3Rpb24gc3RhdGUgaXMgY2hlY2tpbmcsIHdpbGwgd2FpdCB0byBjcmVhdGUgYSBuZXcgb2ZmZXInKTtcbiAgICBtb24ub25jZSgnY29ubmVjdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICBxLnB1c2goeyBvcDogbmVnb3RpYXRlIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tTdGFibGUobmVnb3RpYXRlKSB7XG4gICAgaWYgKHBjLnNpZ25hbGluZ1N0YXRlID09PSAnc3RhYmxlJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZGVidWcoJ2Nhbm5vdCBjcmVhdGUgb2ZmZXIsIHNpZ25hbGluZyBzdGF0ZSAhPSBzdGFibGUsIHdpbGwgcmV0cnknKTtcbiAgICBtb24ub24oJ2NoYW5nZScsIGZ1bmN0aW9uIHdhaXRGb3JTdGFibGUoKSB7XG4gICAgICBpZiAocGMuc2lnbmFsaW5nU3RhdGUgPT09ICdzdGFibGUnKSB7XG4gICAgICAgIHEucHVzaCh7IG9wOiBuZWdvdGlhdGUgfSk7XG4gICAgICB9XG5cbiAgICAgIG1vbi5yZW1vdmVMaXN0ZW5lcignY2hhbmdlJywgd2FpdEZvclN0YWJsZSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVJY2VDYW5kaWRhdGUoZGF0YSkge1xuICAgIGlmIChwbHVnaW4gJiYgdHlwZW9mIHBsdWdpbi5jcmVhdGVJY2VDYW5kaWRhdGUgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHBsdWdpbi5jcmVhdGVJY2VDYW5kaWRhdGUoZGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSVENJY2VDYW5kaWRhdGUoZGF0YSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVTZXNzaW9uRGVzY3JpcHRpb24oZGF0YSkge1xuICAgIGlmIChwbHVnaW4gJiYgdHlwZW9mIHBsdWdpbi5jcmVhdGVTZXNzaW9uRGVzY3JpcHRpb24gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHBsdWdpbi5jcmVhdGVTZXNzaW9uRGVzY3JpcHRpb24oZGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oZGF0YSk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWNvdXBsZSgpIHtcbiAgICBkZWJ1ZygnZGVjb3VwbGluZyAnICsgc2lnbmFsbGVyLmlkICsgJyBmcm9tICcgKyB0YXJnZXRJZCk7XG5cbiAgICAvLyBzdG9wIHRoZSBtb25pdG9yXG4gICAgbW9uLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgIG1vbi5zdG9wKCk7XG5cbiAgICAvLyBjbGVhbnVwIHRoZSBwZWVyY29ubmVjdGlvblxuICAgIGNsZWFudXAocGMpO1xuXG4gICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xuICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignc2RwJywgaGFuZGxlU2RwKTtcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ2NhbmRpZGF0ZScsIGhhbmRsZVJlbW90ZUNhbmRpZGF0ZSk7XG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCduZWdvdGlhdGUnLCBoYW5kbGVOZWdvdGlhdGVSZXF1ZXN0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdlbmVyYXRlQ29uc3RyYWludHMobWV0aG9kTmFtZSkge1xuICAgIHZhciBjb25zdHJhaW50cyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gcmVmb3JtYXRDb25zdHJhaW50cygpIHtcbiAgICAgIHZhciB0d2Vha2VkID0ge307XG5cbiAgICAgIE9iamVjdC5rZXlzKGNvbnN0cmFpbnRzKS5mb3JFYWNoKGZ1bmN0aW9uKHBhcmFtKSB7XG4gICAgICAgIHZhciBzZW50ZW5jZWRDYXNlZCA9IHBhcmFtLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcGFyYW0uc3Vic3RyKDEpO1xuICAgICAgICB0d2Vha2VkW3NlbnRlbmNlZENhc2VkXSA9IGNvbnN0cmFpbnRzW3BhcmFtXTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyB1cGRhdGUgdGhlIGNvbnN0cmFpbnRzIHRvIG1hdGNoIHRoZSBleHBlY3RlZCBmb3JtYXRcbiAgICAgIGNvbnN0cmFpbnRzID0ge1xuICAgICAgICBtYW5kYXRvcnk6IHR3ZWFrZWRcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVE9ETzogY3VzdG9taXplIGJlaGF2aW91ciBiYXNlZCBvbiBvZmZlciB2cyBhbnN3ZXJcblxuICAgIC8vIHB1bGwgb3V0IGFueSB2YWxpZFxuICAgIE9GRkVSX0FOU1dFUl9DT05TVFJBSU5UUy5mb3JFYWNoKGZ1bmN0aW9uKHBhcmFtKSB7XG4gICAgICB2YXIgc2VudGVuY2VkQ2FzZWQgPSBwYXJhbS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHBhcmFtLnN1YnN0cigxKTtcblxuICAgICAgLy8gaWYgd2UgaGF2ZSBubyBvcHRzLCBkbyBub3RoaW5nXG4gICAgICBpZiAoISBvcHRzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIGlmIHRoZSBwYXJhbWV0ZXIgaGFzIGJlZW4gZGVmaW5lZCwgdGhlbiBhZGQgaXQgdG8gdGhlIGNvbnN0cmFpbnRzXG4gICAgICBlbHNlIGlmIChvcHRzW3BhcmFtXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzW3BhcmFtXSA9IG9wdHNbcGFyYW1dO1xuICAgICAgfVxuICAgICAgLy8gaWYgdGhlIHNlbnRlbmNlZCBjYXNlZCB2ZXJzaW9uIGhhcyBiZWVuIGFkZGVkLCB0aGVuIHVzZSB0aGF0XG4gICAgICBlbHNlIGlmIChvcHRzW3NlbnRlbmNlZENhc2VkXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzW3BhcmFtXSA9IG9wdHNbc2VudGVuY2VkQ2FzZWRdO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVE9ETzogb25seSBkbyB0aGlzIGZvciB0aGUgb2xkZXIgYnJvd3NlcnMgdGhhdCByZXF1aXJlIGl0XG4gICAgcmVmb3JtYXRDb25zdHJhaW50cygpO1xuXG4gICAgcmV0dXJuIGNvbnN0cmFpbnRzO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJlcE5lZ290aWF0ZShtZXRob2ROYW1lLCBhbGxvd2VkLCBwcmVmbGlnaHRDaGVja3MpIHtcbiAgICB2YXIgY29uc3RyYWludHMgPSBnZW5lcmF0ZUNvbnN0cmFpbnRzKG1ldGhvZE5hbWUpO1xuXG4gICAgLy8gZW5zdXJlIHdlIGhhdmUgYSB2YWxpZCBwcmVmbGlnaHRDaGVja3MgYXJyYXlcbiAgICBwcmVmbGlnaHRDaGVja3MgPSBbXS5jb25jYXQocHJlZmxpZ2h0Q2hlY2tzIHx8IFtdKTtcblxuICAgIHJldHVybiBmdW5jdGlvbiBuZWdvdGlhdGUodGFzaywgY2IpIHtcbiAgICAgIHZhciBjaGVja3NPSyA9IHRydWU7XG5cbiAgICAgIC8vIGlmIHRoZSB0YXNrIGlzIG5vdCBhbGxvd2VkLCB0aGVuIHNlbmQgYSBuZWdvdGlhdGUgcmVxdWVzdCB0byBvdXJcbiAgICAgIC8vIHBlZXJcbiAgICAgIGlmICghIGFsbG93ZWQpIHtcbiAgICAgICAgc2lnbmFsbGVyLnRvKHRhcmdldElkKS5zZW5kKCcvbmVnb3RpYXRlJyk7XG4gICAgICAgIHJldHVybiBjYigpO1xuICAgICAgfVxuXG4gICAgICAvLyBpZiB0aGUgY29ubmVjdGlvbiBpcyBjbG9zZWQsIHRoZW4gYWJvcnRcbiAgICAgIGlmIChpc0Nsb3NlZCgpKSB7XG4gICAgICAgIHJldHVybiBjYihuZXcgRXJyb3IoJ2Nvbm5lY3Rpb24gY2xvc2VkLCBjYW5ub3QgbmVnb3RpYXRlJykpO1xuICAgICAgfVxuXG4gICAgICAvLyBydW4gdGhlIHByZWZsaWdodCBjaGVja3NcbiAgICAgIHByZWZsaWdodENoZWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGNoZWNrKSB7XG4gICAgICAgIGNoZWNrc09LID0gY2hlY2tzT0sgJiYgY2hlY2sobmVnb3RpYXRlKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBpZiB0aGUgY2hlY2tzIGhhdmUgbm90IHBhc3NlZCwgdGhlbiBhYm9ydCBmb3IgdGhlIG1vbWVudFxuICAgICAgaWYgKCEgY2hlY2tzT0spIHtcbiAgICAgICAgZGVidWcoJ3ByZWZsaWdodCBjaGVja3MgZGlkIG5vdCBwYXNzLCBhYm9ydGluZyAnICsgbWV0aG9kTmFtZSk7XG4gICAgICAgIHJldHVybiBjYigpO1xuICAgICAgfVxuXG4gICAgICAvLyBjcmVhdGUgdGhlIG9mZmVyXG4gICAgICBkZWJ1ZygnY2FsbGluZyAnICsgbWV0aG9kTmFtZSk7XG4gICAgICAvLyBkZWJ1ZygnZ2F0aGVyaW5nIHN0YXRlID0gJyArIHBjLmljZUdhdGhlcmluZ1N0YXRlKTtcbiAgICAgIC8vIGRlYnVnKCdjb25uZWN0aW9uIHN0YXRlID0gJyArIHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgICAvLyBkZWJ1Zygnc2lnbmFsaW5nIHN0YXRlID0gJyArIHBjLnNpZ25hbGluZ1N0YXRlKTtcblxuICAgICAgcGNbbWV0aG9kTmFtZV0oXG4gICAgICAgIGZ1bmN0aW9uKGRlc2MpIHtcblxuICAgICAgICAgIC8vIGlmIGEgZmlsdGVyIGhhcyBiZWVuIHNwZWNpZmllZCwgdGhlbiBhcHBseSB0aGUgZmlsdGVyXG4gICAgICAgICAgaWYgKHR5cGVvZiBzZHBGaWx0ZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgZGVzYy5zZHAgPSBzZHBGaWx0ZXIoZGVzYy5zZHAsIHBjLCBtZXRob2ROYW1lKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBxLnB1c2goeyBvcDogcXVldWVMb2NhbERlc2MoZGVzYykgfSk7XG4gICAgICAgICAgY2IoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBvbiBlcnJvciwgYWJvcnRcbiAgICAgICAgYWJvcnQobWV0aG9kTmFtZSwgJycsIGNiKSxcblxuICAgICAgICAvLyBpbmNsdWRlIHRoZSBhcHByb3ByaWF0ZSBjb25zdHJhaW50c1xuICAgICAgICBjb25zdHJhaW50c1xuICAgICAgKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlQ29ubmVjdGlvbkNsb3NlKCkge1xuICAgIGRlYnVnKCdjYXB0dXJlZCBwYyBjbG9zZSwgaWNlQ29ubmVjdGlvblN0YXRlID0gJyArIHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgZGVjb3VwbGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZURpc2Nvbm5lY3QoKSB7XG4gICAgZGVidWcoJ2NhcHR1cmVkIHBjIGRpc2Nvbm5lY3QsIG1vbml0b3JpbmcgY29ubmVjdGlvbiBzdGF0dXMnKTtcblxuICAgIC8vIHN0YXJ0IHRoZSBkaXNjb25uZWN0IHRpbWVyXG4gICAgZGlzY29ubmVjdFRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGRlYnVnKCdtYW51YWxseSBjbG9zaW5nIGNvbm5lY3Rpb24gYWZ0ZXIgZGlzY29ubmVjdCB0aW1lb3V0Jyk7XG4gICAgICBwYy5jbG9zZSgpO1xuICAgIH0sIGRpc2Nvbm5lY3RUaW1lb3V0KTtcblxuICAgIG1vbi5vbignY2hhbmdlJywgaGFuZGxlRGlzY29ubmVjdEFib3J0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZURpc2Nvbm5lY3RBYm9ydCgpIHtcbiAgICBkZWJ1ZygnY29ubmVjdGlvbiBzdGF0ZSBjaGFuZ2VkIHRvOiAnICsgcGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICByZXNldERpc2Nvbm5lY3RUaW1lcigpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBhIGNsb3NlZCBvciBmYWlsZWQgc3RhdHVzLCB0aGVuIGNsb3NlIHRoZSBjb25uZWN0aW9uXG4gICAgaWYgKENMT1NFRF9TVEFURVMuaW5kZXhPZihwYy5pY2VDb25uZWN0aW9uU3RhdGUpID49IDApIHtcbiAgICAgIHJldHVybiBtb24uZW1pdCgnY2xvc2VkJyk7XG4gICAgfVxuXG4gICAgbW9uLm9uY2UoJ2Rpc2Nvbm5lY3QnLCBoYW5kbGVEaXNjb25uZWN0KTtcbiAgfTtcblxuICBmdW5jdGlvbiBoYW5kbGVMb2NhbENhbmRpZGF0ZShldnQpIHtcbiAgICBpZiAoZXZ0LmNhbmRpZGF0ZSkge1xuICAgICAgcmVzZXREaXNjb25uZWN0VGltZXIoKTtcblxuICAgICAgc2lnbmFsbGVyLnRvKHRhcmdldElkKS5zZW5kKCcvY2FuZGlkYXRlJywgZXZ0LmNhbmRpZGF0ZSk7XG4gICAgICBlbmRPZkNhbmRpZGF0ZXMgPSBmYWxzZTtcbiAgICB9XG4gICAgZWxzZSBpZiAoISBlbmRPZkNhbmRpZGF0ZXMpIHtcbiAgICAgIGVuZE9mQ2FuZGlkYXRlcyA9IHRydWU7XG4gICAgICBkZWJ1ZygnaWNlIGdhdGhlcmluZyBzdGF0ZSBjb21wbGV0ZScpO1xuICAgICAgc2lnbmFsbGVyLnRvKHRhcmdldElkKS5zZW5kKCcvZW5kb2ZjYW5kaWRhdGVzJywge30pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZU5lZ290aWF0ZVJlcXVlc3Qoc3JjKSB7XG4gICAgaWYgKHNyYy5pZCA9PT0gdGFyZ2V0SWQpIHtcbiAgICAgIGRlYnVnKCdnb3QgbmVnb3RpYXRlIHJlcXVlc3QgZnJvbSAnICsgdGFyZ2V0SWQgKyAnLCBjcmVhdGluZyBvZmZlcicpO1xuICAgICAgcS5wdXNoKHsgb3A6IGNyZWF0ZU9mZmVyIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVJlbW90ZUNhbmRpZGF0ZShkYXRhLCBzcmMpIHtcbiAgICBpZiAoKCEgc3JjKSB8fCAoc3JjLmlkICE9PSB0YXJnZXRJZCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBxdWV1ZSBjYW5kaWRhdGVzIHdoaWxlIHRoZSBzaWduYWxpbmcgc3RhdGUgaXMgbm90IHN0YWJsZVxuICAgIGlmIChwYy5zaWduYWxpbmdTdGF0ZSAhPSAnc3RhYmxlJyB8fCAoISBwYy5yZW1vdGVEZXNjcmlwdGlvbikpIHtcbiAgICAgIGRlYnVnKCdxdWV1aW5nIGNhbmRpZGF0ZScpO1xuICAgICAgcXVldWVkQ2FuZGlkYXRlcy5wdXNoKGRhdGEpO1xuXG4gICAgICBtb24ucmVtb3ZlTGlzdGVuZXIoJ2NoYW5nZScsIGFwcGx5Q2FuZGlkYXRlc1doZW5TdGFibGUpO1xuICAgICAgbW9uLm9uKCdjaGFuZ2UnLCBhcHBseUNhbmRpZGF0ZXNXaGVuU3RhYmxlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgcGMuYWRkSWNlQ2FuZGlkYXRlKGNyZWF0ZUljZUNhbmRpZGF0ZShkYXRhKSk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBkZWJ1ZygnaW52YWxpZGF0ZSBjYW5kaWRhdGUgc3BlY2lmaWVkOiAnLCBkYXRhKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVTZHAoZGF0YSwgc3JjKSB7XG4gICAgdmFyIGFib3J0VHlwZSA9IGRhdGEudHlwZSA9PT0gJ29mZmVyJyA/ICdjcmVhdGVBbnN3ZXInIDogJ2NyZWF0ZU9mZmVyJztcblxuICAgIC8vIGlmIHRoZSBzb3VyY2UgaXMgdW5rbm93biBvciBub3QgYSBtYXRjaCwgdGhlbiBhYm9ydFxuICAgIGlmICgoISBzcmMpIHx8IChzcmMuaWQgIT09IHRhcmdldElkKSkge1xuICAgICAgcmV0dXJuIGRlYnVnKCdyZWNlaXZlZCBzZHAgYnV0IGRyb3BwaW5nIGR1ZSB0byB1bm1hdGNoZWQgc3JjJyk7XG4gICAgfVxuXG4gICAgLy8gcHJpb3JpdGl6ZSBzZXR0aW5nIHRoZSByZW1vdGUgZGVzY3JpcHRpb24gb3BlcmF0aW9uXG4gICAgcS5wdXNoKHsgb3A6IGZ1bmN0aW9uKHRhc2ssIGNiKSB7XG4gICAgICBpZiAoaXNDbG9zZWQoKSkge1xuICAgICAgICByZXR1cm4gY2IobmV3IEVycm9yKCdwYyBjbG9zZWQ6IGNhbm5vdCBzZXQgcmVtb3RlIGRlc2NyaXB0aW9uJykpO1xuICAgICAgfVxuXG4gICAgICAvLyB1cGRhdGUgdGhlIHJlbW90ZSBkZXNjcmlwdGlvblxuICAgICAgLy8gb25jZSBzdWNjZXNzZnVsLCBzZW5kIHRoZSBhbnN3ZXJcbiAgICAgIGRlYnVnKCdzZXR0aW5nIHJlbW90ZSBkZXNjcmlwdGlvbicpO1xuICAgICAgcGMuc2V0UmVtb3RlRGVzY3JpcHRpb24oXG4gICAgICAgIGNyZWF0ZVNlc3Npb25EZXNjcmlwdGlvbihkYXRhKSxcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gY3JlYXRlIHRoZSBhbnN3ZXJcbiAgICAgICAgICBpZiAoZGF0YS50eXBlID09PSAnb2ZmZXInKSB7XG4gICAgICAgICAgICBxdWV1ZShjcmVhdGVBbnN3ZXIpKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gdHJpZ2dlciB0aGUgY2FsbGJhY2tcbiAgICAgICAgICBjYigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFib3J0KGFib3J0VHlwZSwgZGF0YS5zZHAsIGNiKVxuICAgICAgKTtcbiAgICB9fSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc0Nsb3NlZCgpIHtcbiAgICByZXR1cm4gQ0xPU0VEX1NUQVRFUy5pbmRleE9mKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSkgPj0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHF1ZXVlKG5lZ290aWF0ZVRhc2spIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBxLnB1c2goW1xuICAgICAgICB7IG9wOiBuZWdvdGlhdGVUYXNrIH1cbiAgICAgIF0pO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBxdWV1ZUxvY2FsRGVzYyhkZXNjKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHNldExvY2FsRGVzYyh0YXNrLCBjYikge1xuICAgICAgaWYgKGlzQ2xvc2VkKCkpIHtcbiAgICAgICAgcmV0dXJuIGNiKG5ldyBFcnJvcignY29ubmVjdGlvbiBjbG9zZWQsIGFib3J0aW5nJykpO1xuICAgICAgfVxuXG4gICAgICAvLyBpbml0aWFsaXNlIHRoZSBsb2NhbCBkZXNjcmlwdGlvblxuICAgICAgZGVidWcoJ3NldHRpbmcgbG9jYWwgZGVzY3JpcHRpb24nKTtcbiAgICAgIHBjLnNldExvY2FsRGVzY3JpcHRpb24oXG4gICAgICAgIGRlc2MsXG5cbiAgICAgICAgLy8gaWYgc3VjY2Vzc2Z1bCwgdGhlbiBzZW5kIHRoZSBzZHAgb3ZlciB0aGUgd2lyZVxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBzZW5kIHRoZSBzZHBcbiAgICAgICAgICBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9zZHAnLCBkZXNjKTtcblxuICAgICAgICAgIC8vIGNhbGxiYWNrXG4gICAgICAgICAgY2IoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBhYm9ydCgnc2V0TG9jYWxEZXNjJywgZGVzYy5zZHAsIGNiKVxuICAgICAgICAvLyBvbiBlcnJvciwgYWJvcnRcbiAgICAgICAgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgZGVidWcoJ2Vycm9yIHNldHRpbmcgbG9jYWwgZGVzY3JpcHRpb24nLCBlcnIpO1xuICAgICAgICAgIGRlYnVnKGRlc2Muc2RwKTtcbiAgICAgICAgICAvLyBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vICAgc2V0TG9jYWxEZXNjKHRhc2ssIGNiLCAocmV0cnlDb3VudCB8fCAwKSArIDEpO1xuICAgICAgICAgIC8vIH0sIDUwMCk7XG5cbiAgICAgICAgICBjYihlcnIpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiByZXNldERpc2Nvbm5lY3RUaW1lcigpIHtcbiAgICBtb24ucmVtb3ZlTGlzdGVuZXIoJ2NoYW5nZScsIGhhbmRsZURpc2Nvbm5lY3RBYm9ydCk7XG5cbiAgICAvLyBjbGVhciB0aGUgZGlzY29ubmVjdCB0aW1lclxuICAgIGRlYnVnKCdyZXNldCBkaXNjb25uZWN0IHRpbWVyLCBzdGF0ZTogJyArIHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgY2xlYXJUaW1lb3V0KGRpc2Nvbm5lY3RUaW1lcik7XG4gIH1cblxuICAvLyB3aGVuIHJlZ290aWF0aW9uIGlzIG5lZWRlZCBsb29rIGZvciB0aGUgcGVlclxuICBpZiAocmVhY3RpdmUpIHtcbiAgICBwYy5vbm5lZ290aWF0aW9ubmVlZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICBkZWJ1ZygncmVuZWdvdGlhdGlvbiByZXF1aXJlZCwgd2lsbCBjcmVhdGUgb2ZmZXIgaW4gNTBtcycpO1xuICAgICAgY2xlYXJUaW1lb3V0KG9mZmVyVGltZW91dCk7XG4gICAgICBvZmZlclRpbWVvdXQgPSBzZXRUaW1lb3V0KHF1ZXVlKGNyZWF0ZU9mZmVyKSwgNTApO1xuICAgIH07XG4gIH1cblxuICBwYy5vbmljZWNhbmRpZGF0ZSA9IGhhbmRsZUxvY2FsQ2FuZGlkYXRlO1xuXG4gIC8vIHdoZW4gd2UgcmVjZWl2ZSBzZHAsIHRoZW5cbiAgc2lnbmFsbGVyLm9uKCdzZHAnLCBoYW5kbGVTZHApO1xuICBzaWduYWxsZXIub24oJ2NhbmRpZGF0ZScsIGhhbmRsZVJlbW90ZUNhbmRpZGF0ZSk7XG5cbiAgLy8gaWYgdGhpcyBpcyBhIG1hc3RlciBjb25uZWN0aW9uLCBsaXN0ZW4gZm9yIG5lZ290aWF0ZSBldmVudHNcbiAgaWYgKGlzTWFzdGVyKSB7XG4gICAgc2lnbmFsbGVyLm9uKCduZWdvdGlhdGUnLCBoYW5kbGVOZWdvdGlhdGVSZXF1ZXN0KTtcbiAgfVxuXG4gIC8vIHdoZW4gdGhlIGNvbm5lY3Rpb24gY2xvc2VzLCByZW1vdmUgZXZlbnQgaGFuZGxlcnNcbiAgbW9uLm9uY2UoJ2Nsb3NlZCcsIGhhbmRsZUNvbm5lY3Rpb25DbG9zZSk7XG4gIG1vbi5vbmNlKCdkaXNjb25uZWN0ZWQnLCBoYW5kbGVEaXNjb25uZWN0KTtcblxuICAvLyBwYXRjaCBpbiB0aGUgY3JlYXRlIG9mZmVyIGZ1bmN0aW9uc1xuICBtb24uY3JlYXRlT2ZmZXIgPSBxdWV1ZShjcmVhdGVPZmZlcik7XG5cbiAgcmV0dXJuIG1vbjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb3VwbGU7XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMjIHJ0Yy10b29scy9kZXRlY3RcblxuICBQcm92aWRlIHRoZSBbcnRjLWNvcmUvZGV0ZWN0XShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1jb3JlI2RldGVjdClcbiAgZnVuY3Rpb25hbGl0eS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgnZ2VuZXJhdG9ycycpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcblxudmFyIG1hcHBpbmdzID0ge1xuICBjcmVhdGU6IHtcbiAgICBkdGxzOiBmdW5jdGlvbihjKSB7XG4gICAgICBpZiAoISBkZXRlY3QubW96KSB7XG4gICAgICAgIGMub3B0aW9uYWwgPSAoYy5vcHRpb25hbCB8fCBbXSkuY29uY2F0KHsgRHRsc1NydHBLZXlBZ3JlZW1lbnQ6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAgIyMjIHJ0Yy10b29scy9nZW5lcmF0b3JzXG5cbiAgVGhlIGdlbmVyYXRvcnMgcGFja2FnZSBwcm92aWRlcyBzb21lIHV0aWxpdHkgbWV0aG9kcyBmb3IgZ2VuZXJhdGluZ1xuICBjb25zdHJhaW50IG9iamVjdHMgYW5kIHNpbWlsYXIgY29uc3RydWN0cy5cblxuICBgYGBqc1xuICB2YXIgZ2VuZXJhdG9ycyA9IHJlcXVpcmUoJ3J0Yy9nZW5lcmF0b3JzJyk7XG4gIGBgYFxuXG4qKi9cblxuLyoqXG4gICMjIyMgZ2VuZXJhdG9ycy5jb25maWcoY29uZmlnKVxuXG4gIEdlbmVyYXRlIGEgY29uZmlndXJhdGlvbiBvYmplY3Qgc3VpdGFibGUgZm9yIHBhc3NpbmcgaW50byBhbiBXM0NcbiAgUlRDUGVlckNvbm5lY3Rpb24gY29uc3RydWN0b3IgZmlyc3QgYXJndW1lbnQsIGJhc2VkIG9uIG91ciBjdXN0b20gY29uZmlnLlxuKiovXG5leHBvcnRzLmNvbmZpZyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICByZXR1cm4gZGVmYXVsdHMoY29uZmlnLCB7XG4gICAgaWNlU2VydmVyczogW11cbiAgfSk7XG59O1xuXG4vKipcbiAgIyMjIyBnZW5lcmF0b3JzLmNvbm5lY3Rpb25Db25zdHJhaW50cyhmbGFncywgY29uc3RyYWludHMpXG5cbiAgVGhpcyBpcyBhIGhlbHBlciBmdW5jdGlvbiB0aGF0IHdpbGwgZ2VuZXJhdGUgYXBwcm9wcmlhdGUgY29ubmVjdGlvblxuICBjb25zdHJhaW50cyBmb3IgYSBuZXcgYFJUQ1BlZXJDb25uZWN0aW9uYCBvYmplY3Qgd2hpY2ggaXMgY29uc3RydWN0ZWRcbiAgaW4gdGhlIGZvbGxvd2luZyB3YXk6XG5cbiAgYGBganNcbiAgdmFyIGNvbm4gPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24oZmxhZ3MsIGNvbnN0cmFpbnRzKTtcbiAgYGBgXG5cbiAgSW4gbW9zdCBjYXNlcyB0aGUgY29uc3RyYWludHMgb2JqZWN0IGNhbiBiZSBsZWZ0IGVtcHR5LCBidXQgd2hlbiBjcmVhdGluZ1xuICBkYXRhIGNoYW5uZWxzIHNvbWUgYWRkaXRpb25hbCBvcHRpb25zIGFyZSByZXF1aXJlZC4gIFRoaXMgZnVuY3Rpb25cbiAgY2FuIGdlbmVyYXRlIHRob3NlIGFkZGl0aW9uYWwgb3B0aW9ucyBhbmQgaW50ZWxsaWdlbnRseSBjb21iaW5lIGFueVxuICB1c2VyIGRlZmluZWQgY29uc3RyYWludHMgKGluIGBjb25zdHJhaW50c2ApIHdpdGggc2hvcnRoYW5kIGZsYWdzIHRoYXRcbiAgbWlnaHQgYmUgcGFzc2VkIHdoaWxlIHVzaW5nIHRoZSBgcnRjLmNyZWF0ZUNvbm5lY3Rpb25gIGhlbHBlci5cbioqL1xuZXhwb3J0cy5jb25uZWN0aW9uQ29uc3RyYWludHMgPSBmdW5jdGlvbihmbGFncywgY29uc3RyYWludHMpIHtcbiAgdmFyIGdlbmVyYXRlZCA9IHt9O1xuICB2YXIgbSA9IG1hcHBpbmdzLmNyZWF0ZTtcbiAgdmFyIG91dDtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGZsYWdzIGFuZCBhcHBseSB0aGUgY3JlYXRlIG1hcHBpbmdzXG4gIE9iamVjdC5rZXlzKGZsYWdzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChtW2tleV0pIHtcbiAgICAgIG1ba2V5XShnZW5lcmF0ZWQpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gZ2VuZXJhdGUgdGhlIGNvbm5lY3Rpb24gY29uc3RyYWludHNcbiAgb3V0ID0gZGVmYXVsdHMoe30sIGNvbnN0cmFpbnRzLCBnZW5lcmF0ZWQpO1xuICBkZWJ1ZygnZ2VuZXJhdGVkIGNvbm5lY3Rpb24gY29uc3RyYWludHM6ICcsIG91dCk7XG5cbiAgcmV0dXJuIG91dDtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIHJ0Yy10b29sc1xuXG4gIFRoZSBgcnRjLXRvb2xzYCBtb2R1bGUgZG9lcyBtb3N0IG9mIHRoZSBoZWF2eSBsaWZ0aW5nIHdpdGhpbiB0aGVcbiAgW3J0Yy5pb10oaHR0cDovL3J0Yy5pbykgc3VpdGUuICBQcmltYXJpbHkgaXQgaGFuZGxlcyB0aGUgbG9naWMgb2YgY291cGxpbmdcbiAgYSBsb2NhbCBgUlRDUGVlckNvbm5lY3Rpb25gIHdpdGggaXQncyByZW1vdGUgY291bnRlcnBhcnQgdmlhIGFuXG4gIFtydGMtc2lnbmFsbGVyXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zaWduYWxsZXIpIHNpZ25hbGxpbmdcbiAgY2hhbm5lbC5cblxuICAjIyBHZXR0aW5nIFN0YXJ0ZWRcblxuICBJZiB5b3UgZGVjaWRlIHRoYXQgdGhlIGBydGMtdG9vbHNgIG1vZHVsZSBpcyBhIGJldHRlciBmaXQgZm9yIHlvdSB0aGFuIGVpdGhlclxuICBbcnRjLXF1aWNrY29ubmVjdF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtcXVpY2tjb25uZWN0KSBvclxuICBbcnRjLWdsdWVdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLWdsdWUpIHRoZW4gdGhlIGNvZGUgc25pcHBldCBiZWxvd1xuICB3aWxsIHByb3ZpZGUgeW91IGEgZ3VpZGUgb24gaG93IHRvIGdldCBzdGFydGVkIHVzaW5nIGl0IGluIGNvbmp1bmN0aW9uIHdpdGhcbiAgdGhlIFtydGMtc2lnbmFsbGVyXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zaWduYWxsZXIpIGFuZFxuICBbcnRjLW1lZGlhXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1tZWRpYSkgbW9kdWxlczpcblxuICA8PDwgZXhhbXBsZXMvZ2V0dGluZy1zdGFydGVkLmpzXG5cbiAgVGhpcyBjb2RlIGRlZmluaXRlbHkgZG9lc24ndCBjb3ZlciBhbGwgdGhlIGNhc2VzIHRoYXQgeW91IG5lZWQgdG8gY29uc2lkZXJcbiAgKGkuZS4gcGVlcnMgbGVhdmluZywgZXRjKSBidXQgaXQgc2hvdWxkIGRlbW9uc3RyYXRlIGhvdyB0bzpcblxuICAxLiBDYXB0dXJlIHZpZGVvIGFuZCBhZGQgaXQgdG8gYSBwZWVyIGNvbm5lY3Rpb25cbiAgMi4gQ291cGxlIGEgbG9jYWwgcGVlciBjb25uZWN0aW9uIHdpdGggYSByZW1vdGUgcGVlciBjb25uZWN0aW9uXG4gIDMuIERlYWwgd2l0aCB0aGUgcmVtb3RlIHN0ZWFtIGJlaW5nIGRpc2NvdmVyZWQgYW5kIGhvdyB0byByZW5kZXJcbiAgICAgdGhhdCB0byB0aGUgbG9jYWwgaW50ZXJmYWNlLlxuXG4gICMjIFJlZmVyZW5jZVxuXG4qKi9cblxudmFyIGdlbiA9IHJlcXVpcmUoJy4vZ2VuZXJhdG9ycycpO1xuXG4vLyBleHBvcnQgZGV0ZWN0XG52YXIgZGV0ZWN0ID0gZXhwb3J0cy5kZXRlY3QgPSByZXF1aXJlKCcuL2RldGVjdCcpO1xudmFyIGZpbmRQbHVnaW4gPSByZXF1aXJlKCdydGMtY29yZS9wbHVnaW4nKTtcblxuLy8gZXhwb3J0IGNvZyBsb2dnZXIgZm9yIGNvbnZlbmllbmNlXG5leHBvcnRzLmxvZ2dlciA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKTtcblxuLy8gZXhwb3J0IHBlZXIgY29ubmVjdGlvblxudmFyIFJUQ1BlZXJDb25uZWN0aW9uID1cbmV4cG9ydHMuUlRDUGVlckNvbm5lY3Rpb24gPSBkZXRlY3QoJ1JUQ1BlZXJDb25uZWN0aW9uJyk7XG5cbi8vIGFkZCB0aGUgY291cGxlIHV0aWxpdHlcbmV4cG9ydHMuY291cGxlID0gcmVxdWlyZSgnLi9jb3VwbGUnKTtcblxuLyoqXG4gICMjIyBjcmVhdGVDb25uZWN0aW9uXG5cbiAgYGBgXG4gIGNyZWF0ZUNvbm5lY3Rpb24ob3B0cz8sIGNvbnN0cmFpbnRzPykgPT4gUlRDUGVlckNvbm5lY3Rpb25cbiAgYGBgXG5cbiAgQ3JlYXRlIGEgbmV3IGBSVENQZWVyQ29ubmVjdGlvbmAgYXV0byBnZW5lcmF0aW5nIGRlZmF1bHQgb3B0cyBhcyByZXF1aXJlZC5cblxuICBgYGBqc1xuICB2YXIgY29ubjtcblxuICAvLyB0aGlzIGlzIG9rXG4gIGNvbm4gPSBydGMuY3JlYXRlQ29ubmVjdGlvbigpO1xuXG4gIC8vIGFuZCBzbyBpcyB0aGlzXG4gIGNvbm4gPSBydGMuY3JlYXRlQ29ubmVjdGlvbih7XG4gICAgaWNlU2VydmVyczogW11cbiAgfSk7XG4gIGBgYFxuKiovXG5leHBvcnRzLmNyZWF0ZUNvbm5lY3Rpb24gPSBmdW5jdGlvbihvcHRzLCBjb25zdHJhaW50cykge1xuICB2YXIgcGx1Z2luID0gZmluZFBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG4gIHZhciBub3JtYWxpemUgPSAocGx1Z2luID8gcGx1Z2luLm5vcm1hbGl6ZUljZSA6IG51bGwpIHx8IHJlcXVpcmUoJ25vcm1hbGljZScpO1xuXG4gIC8vIGdlbmVyYXRlIHRoZSBjb25maWcgYmFzZWQgb24gb3B0aW9ucyBwcm92aWRlZFxuICB2YXIgY29uZmlnID0gZ2VuLmNvbmZpZyhvcHRzKTtcblxuICAvLyBnZW5lcmF0ZSBhcHByb3ByaWF0ZSBjb25uZWN0aW9uIGNvbnN0cmFpbnRzXG4gIHZhciBjb25zdHJhaW50cyA9IGdlbi5jb25uZWN0aW9uQ29uc3RyYWludHMob3B0cywgY29uc3RyYWludHMpO1xuXG4gIC8vIGVuc3VyZSB3ZSBoYXZlIHZhbGlkIGljZVNlcnZlcnNcbiAgY29uZmlnLmljZVNlcnZlcnMgPSAoY29uZmlnLmljZVNlcnZlcnMgfHwgW10pLm1hcChub3JtYWxpemUpO1xuXG4gIGlmIChwbHVnaW4gJiYgdHlwZW9mIHBsdWdpbi5jcmVhdGVDb25uZWN0aW9uID09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gcGx1Z2luLmNyZWF0ZUNvbm5lY3Rpb24oY29uZmlnLCBjb25zdHJhaW50cyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIG5ldyAoKG9wdHMgfHwge30pLlJUQ1BlZXJDb25uZWN0aW9uIHx8IFJUQ1BlZXJDb25uZWN0aW9uKShcbiAgICAgIGNvbmZpZywgY29uc3RyYWludHNcbiAgICApO1xuICB9XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjMnKTtcblxuLy8gZGVmaW5lIHNvbWUgc3RhdGUgbWFwcGluZ3MgdG8gc2ltcGxpZnkgdGhlIGV2ZW50cyB3ZSBnZW5lcmF0ZVxudmFyIHN0YXRlTWFwcGluZ3MgPSB7XG4gIGNvbXBsZXRlZDogJ2Nvbm5lY3RlZCdcbn07XG5cbi8vIGRlZmluZSB0aGUgZXZlbnRzIHRoYXQgd2UgbmVlZCB0byB3YXRjaCBmb3IgcGVlciBjb25uZWN0aW9uXG4vLyBzdGF0ZSBjaGFuZ2VzXG52YXIgcGVlclN0YXRlRXZlbnRzID0gW1xuICAnc2lnbmFsaW5nc3RhdGVjaGFuZ2UnLFxuICAnaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJyxcbl07XG5cbi8qKlxuICAjIyMgcnRjLXRvb2xzL21vbml0b3JcblxuICBgYGBcbiAgbW9uaXRvcihwYywgdGFyZ2V0SWQsIHNpZ25hbGxlciwgb3B0cz8pID0+IEV2ZW50RW1pdHRlclxuICBgYGBcblxuICBUaGUgbW9uaXRvciBpcyBhIHVzZWZ1bCB0b29sIGZvciBkZXRlcm1pbmluZyB0aGUgc3RhdGUgb2YgYHBjYCAoYW5cbiAgYFJUQ1BlZXJDb25uZWN0aW9uYCkgaW5zdGFuY2UgaW4gdGhlIGNvbnRleHQgb2YgeW91ciBhcHBsaWNhdGlvbi4gVGhlXG4gIG1vbml0b3IgdXNlcyBib3RoIHRoZSBgaWNlQ29ubmVjdGlvblN0YXRlYCBpbmZvcm1hdGlvbiBvZiB0aGUgcGVlclxuICBjb25uZWN0aW9uIGFuZCBhbHNvIHRoZSB2YXJpb3VzXG4gIFtzaWduYWxsZXIgZXZlbnRzXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zaWduYWxsZXIjc2lnbmFsbGVyLWV2ZW50cylcbiAgdG8gZGV0ZXJtaW5lIHdoZW4gdGhlIGNvbm5lY3Rpb24gaGFzIGJlZW4gYGNvbm5lY3RlZGAgYW5kIHdoZW4gaXQgaGFzXG4gIGJlZW4gYGRpc2Nvbm5lY3RlZGAuXG5cbiAgQSBtb25pdG9yIGNyZWF0ZWQgYEV2ZW50RW1pdHRlcmAgaXMgcmV0dXJuZWQgYXMgdGhlIHJlc3VsdCBvZiBhXG4gIFtjb3VwbGVdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjI3J0Y2NvdXBsZSkgYmV0d2VlbiBhIGxvY2FsIHBlZXJcbiAgY29ubmVjdGlvbiBhbmQgaXQncyByZW1vdGUgY291bnRlcnBhcnQuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwYywgdGFyZ2V0SWQsIHNpZ25hbGxlciwgb3B0cykge1xuICB2YXIgZGVidWdMYWJlbCA9IChvcHRzIHx8IHt9KS5kZWJ1Z0xhYmVsIHx8ICdydGMnO1xuICB2YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoZGVidWdMYWJlbCArICcvbW9uaXRvcicpO1xuICB2YXIgbW9uaXRvciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgdmFyIHN0YXRlO1xuXG4gIGZ1bmN0aW9uIGNoZWNrU3RhdGUoKSB7XG4gICAgdmFyIG5ld1N0YXRlID0gZ2V0TWFwcGVkU3RhdGUocGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICBkZWJ1Zygnc3RhdGUgY2hhbmdlZDogJyArIHBjLmljZUNvbm5lY3Rpb25TdGF0ZSArICcsIG1hcHBlZDogJyArIG5ld1N0YXRlKTtcblxuICAgIC8vIGZsYWcgdGhlIHdlIGhhZCBhIHN0YXRlIGNoYW5nZVxuICAgIG1vbml0b3IuZW1pdCgnY2hhbmdlJywgcGMpO1xuXG4gICAgLy8gaWYgdGhlIGFjdGl2ZSBzdGF0ZSBoYXMgY2hhbmdlZCwgdGhlbiBzZW5kIHRoZSBhcHBvcHJpYXRlIG1lc3NhZ2VcbiAgICBpZiAoc3RhdGUgIT09IG5ld1N0YXRlKSB7XG4gICAgICBtb25pdG9yLmVtaXQobmV3U3RhdGUpO1xuICAgICAgc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVQZWVyTGVhdmUocGVlcklkKSB7XG4gICAgZGVidWcoJ2NhcHR1cmVkIHBlZXIgbGVhdmUgZm9yIHBlZXI6ICcgKyBwZWVySWQpO1xuXG4gICAgLy8gaWYgdGhlIHBlZXIgbGVhdmluZyBpcyBub3QgdGhlIHBlZXIgd2UgYXJlIGNvbm5lY3RlZCB0b1xuICAgIC8vIHRoZW4gd2UgYXJlbid0IGludGVyZXN0ZWRcbiAgICBpZiAocGVlcklkICE9PSB0YXJnZXRJZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHRyaWdnZXIgYSBjbG9zZWQgZXZlbnRcbiAgICBtb25pdG9yLmVtaXQoJ2Nsb3NlZCcpO1xuICB9XG5cbiAgcGMub25jbG9zZSA9IG1vbml0b3IuZW1pdC5iaW5kKG1vbml0b3IsICdjbG9zZWQnKTtcbiAgcGVlclN0YXRlRXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZ0TmFtZSkge1xuICAgIHBjWydvbicgKyBldnROYW1lXSA9IGNoZWNrU3RhdGU7XG4gIH0pO1xuXG4gIG1vbml0b3Iuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIHBjLm9uY2xvc2UgPSBudWxsO1xuICAgIHBlZXJTdGF0ZUV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2dE5hbWUpIHtcbiAgICAgIHBjWydvbicgKyBldnROYW1lXSA9IG51bGw7XG4gICAgfSk7XG5cbiAgICAvLyByZW1vdmUgdGhlIHBlZXI6bGVhdmUgbGlzdGVuZXJcbiAgICBpZiAoc2lnbmFsbGVyICYmIHR5cGVvZiBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdwZWVyOmxlYXZlJywgaGFuZGxlUGVlckxlYXZlKTtcbiAgICB9XG4gIH07XG5cbiAgbW9uaXRvci5jaGVja1N0YXRlID0gY2hlY2tTdGF0ZTtcblxuICAvLyBpZiB3ZSBoYXZlbid0IGJlZW4gcHJvdmlkZWQgYSB2YWxpZCBwZWVyIGNvbm5lY3Rpb24sIGFib3J0XG4gIGlmICghIHBjKSB7XG4gICAgcmV0dXJuIG1vbml0b3I7XG4gIH1cblxuICAvLyBkZXRlcm1pbmUgdGhlIGluaXRpYWwgaXMgYWN0aXZlIHN0YXRlXG4gIHN0YXRlID0gZ2V0TWFwcGVkU3RhdGUocGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcblxuICAvLyBpZiB3ZSd2ZSBiZWVuIHByb3ZpZGVkIGEgc2lnbmFsbGVyLCB0aGVuIHdhdGNoIGZvciBwZWVyOmxlYXZlIGV2ZW50c1xuICBpZiAoc2lnbmFsbGVyICYmIHR5cGVvZiBzaWduYWxsZXIub24gPT0gJ2Z1bmN0aW9uJykge1xuICAgIHNpZ25hbGxlci5vbigncGVlcjpsZWF2ZScsIGhhbmRsZVBlZXJMZWF2ZSk7XG4gIH1cblxuICAvLyBpZiB3ZSBhcmUgYWN0aXZlLCB0cmlnZ2VyIHRoZSBjb25uZWN0ZWQgc3RhdGVcbiAgLy8gc2V0VGltZW91dChtb25pdG9yLmVtaXQuYmluZChtb25pdG9yLCBzdGF0ZSksIDApO1xuXG4gIHJldHVybiBtb25pdG9yO1xufTtcblxuLyogaW50ZXJuYWwgaGVscGVycyAqL1xuXG5mdW5jdGlvbiBnZXRNYXBwZWRTdGF0ZShzdGF0ZSkge1xuICByZXR1cm4gc3RhdGVNYXBwaW5nc1tzdGF0ZV0gfHwgc3RhdGU7XG59XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLyohXG4gKiBhc3luY1xuICogaHR0cHM6Ly9naXRodWIuY29tL2Nhb2xhbi9hc3luY1xuICpcbiAqIENvcHlyaWdodCAyMDEwLTIwMTQgQ2FvbGFuIE1jTWFob25cbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICovXG4vKmpzaGludCBvbmV2YXI6IGZhbHNlLCBpbmRlbnQ6NCAqL1xuLypnbG9iYWwgc2V0SW1tZWRpYXRlOiBmYWxzZSwgc2V0VGltZW91dDogZmFsc2UsIGNvbnNvbGU6IGZhbHNlICovXG4oZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGFzeW5jID0ge307XG5cbiAgICAvLyBnbG9iYWwgb24gdGhlIHNlcnZlciwgd2luZG93IGluIHRoZSBicm93c2VyXG4gICAgdmFyIHJvb3QsIHByZXZpb3VzX2FzeW5jO1xuXG4gICAgcm9vdCA9IHRoaXM7XG4gICAgaWYgKHJvb3QgIT0gbnVsbCkge1xuICAgICAgcHJldmlvdXNfYXN5bmMgPSByb290LmFzeW5jO1xuICAgIH1cblxuICAgIGFzeW5jLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJvb3QuYXN5bmMgPSBwcmV2aW91c19hc3luYztcbiAgICAgICAgcmV0dXJuIGFzeW5jO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBvbmx5X29uY2UoZm4pIHtcbiAgICAgICAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGVkKSB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsYmFjayB3YXMgYWxyZWFkeSBjYWxsZWQuXCIpO1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGZuLmFwcGx5KHJvb3QsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLy8vIGNyb3NzLWJyb3dzZXIgY29tcGF0aWJsaXR5IGZ1bmN0aW9ucyAvLy8vXG5cbiAgICB2YXIgX3RvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuICAgIHZhciBfaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gX3RvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICB9O1xuXG4gICAgdmFyIF9lYWNoID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IpIHtcbiAgICAgICAgaWYgKGFyci5mb3JFYWNoKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLmZvckVhY2goaXRlcmF0b3IpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihhcnJbaV0sIGksIGFycik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIF9tYXAgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvcikge1xuICAgICAgICBpZiAoYXJyLm1hcCkge1xuICAgICAgICAgICAgcmV0dXJuIGFyci5tYXAoaXRlcmF0b3IpO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGksIGEpIHtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaChpdGVyYXRvcih4LCBpLCBhKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9O1xuXG4gICAgdmFyIF9yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgbWVtbykge1xuICAgICAgICBpZiAoYXJyLnJlZHVjZSkge1xuICAgICAgICAgICAgcmV0dXJuIGFyci5yZWR1Y2UoaXRlcmF0b3IsIG1lbW8pO1xuICAgICAgICB9XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGksIGEpIHtcbiAgICAgICAgICAgIG1lbW8gPSBpdGVyYXRvcihtZW1vLCB4LCBpLCBhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG5cbiAgICB2YXIgX2tleXMgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cykge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICBrZXlzLnB1c2goayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgfTtcblxuICAgIC8vLy8gZXhwb3J0ZWQgYXN5bmMgbW9kdWxlIGZ1bmN0aW9ucyAvLy8vXG5cbiAgICAvLy8vIG5leHRUaWNrIGltcGxlbWVudGF0aW9uIHdpdGggYnJvd3Nlci1jb21wYXRpYmxlIGZhbGxiYWNrIC8vLy9cbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8ICEocHJvY2Vzcy5uZXh0VGljaykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFzeW5jLm5leHRUaWNrID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgLy8gbm90IGEgZGlyZWN0IGFsaWFzIGZvciBJRTEwIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZm4pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUgPSBhc3luYy5uZXh0VGljaztcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBwcm9jZXNzLm5leHRUaWNrO1xuICAgICAgICBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAvLyBub3QgYSBkaXJlY3QgYWxpYXMgZm9yIElFMTAgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZm4pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMuZWFjaCA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAoIWFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjb21wbGV0ZWQgPSAwO1xuICAgICAgICBfZWFjaChhcnIsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBvbmx5X29uY2UoZG9uZSkgKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZ1bmN0aW9uIGRvbmUoZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgYXN5bmMuZm9yRWFjaCA9IGFzeW5jLmVhY2g7XG5cbiAgICBhc3luYy5lYWNoU2VyaWVzID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICghYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gICAgICAgIHZhciBpdGVyYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaXRlcmF0b3IoYXJyW2NvbXBsZXRlZF0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlcmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGl0ZXJhdGUoKTtcbiAgICB9O1xuICAgIGFzeW5jLmZvckVhY2hTZXJpZXMgPSBhc3luYy5lYWNoU2VyaWVzO1xuXG4gICAgYXN5bmMuZWFjaExpbWl0ID0gZnVuY3Rpb24gKGFyciwgbGltaXQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgZm4gPSBfZWFjaExpbWl0KGxpbWl0KTtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgW2FyciwgaXRlcmF0b3IsIGNhbGxiYWNrXSk7XG4gICAgfTtcbiAgICBhc3luYy5mb3JFYWNoTGltaXQgPSBhc3luYy5lYWNoTGltaXQ7XG5cbiAgICB2YXIgX2VhY2hMaW1pdCA9IGZ1bmN0aW9uIChsaW1pdCkge1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICBpZiAoIWFyci5sZW5ndGggfHwgbGltaXQgPD0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gICAgICAgICAgICB2YXIgc3RhcnRlZCA9IDA7XG4gICAgICAgICAgICB2YXIgcnVubmluZyA9IDA7XG5cbiAgICAgICAgICAgIChmdW5jdGlvbiByZXBsZW5pc2ggKCkge1xuICAgICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAocnVubmluZyA8IGxpbWl0ICYmIHN0YXJ0ZWQgPCBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgcnVubmluZyArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpdGVyYXRvcihhcnJbc3RhcnRlZCAtIDFdLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcnVubmluZyAtPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGVuaXNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICB9O1xuICAgIH07XG5cblxuICAgIHZhciBkb1BhcmFsbGVsID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgW2FzeW5jLmVhY2hdLmNvbmNhdChhcmdzKSk7XG4gICAgICAgIH07XG4gICAgfTtcbiAgICB2YXIgZG9QYXJhbGxlbExpbWl0ID0gZnVuY3Rpb24obGltaXQsIGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgW19lYWNoTGltaXQobGltaXQpXS5jb25jYXQoYXJncykpO1xuICAgICAgICB9O1xuICAgIH07XG4gICAgdmFyIGRvU2VyaWVzID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgW2FzeW5jLmVhY2hTZXJpZXNdLmNvbmNhdChhcmdzKSk7XG4gICAgICAgIH07XG4gICAgfTtcblxuXG4gICAgdmFyIF9hc3luY01hcCA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGFyciA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCwgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHtpbmRleDogaSwgdmFsdWU6IHh9O1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW3guaW5kZXhdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGFzeW5jLm1hcCA9IGRvUGFyYWxsZWwoX2FzeW5jTWFwKTtcbiAgICBhc3luYy5tYXBTZXJpZXMgPSBkb1NlcmllcyhfYXN5bmNNYXApO1xuICAgIGFzeW5jLm1hcExpbWl0ID0gZnVuY3Rpb24gKGFyciwgbGltaXQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gX21hcExpbWl0KGxpbWl0KShhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIHZhciBfbWFwTGltaXQgPSBmdW5jdGlvbihsaW1pdCkge1xuICAgICAgICByZXR1cm4gZG9QYXJhbGxlbExpbWl0KGxpbWl0LCBfYXN5bmNNYXApO1xuICAgIH07XG5cbiAgICAvLyByZWR1Y2Ugb25seSBoYXMgYSBzZXJpZXMgdmVyc2lvbiwgYXMgZG9pbmcgcmVkdWNlIGluIHBhcmFsbGVsIHdvbid0XG4gICAgLy8gd29yayBpbiBtYW55IHNpdHVhdGlvbnMuXG4gICAgYXN5bmMucmVkdWNlID0gZnVuY3Rpb24gKGFyciwgbWVtbywgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLmVhY2hTZXJpZXMoYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKG1lbW8sIHgsIGZ1bmN0aW9uIChlcnIsIHYpIHtcbiAgICAgICAgICAgICAgICBtZW1vID0gdjtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbWVtbyk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgLy8gaW5qZWN0IGFsaWFzXG4gICAgYXN5bmMuaW5qZWN0ID0gYXN5bmMucmVkdWNlO1xuICAgIC8vIGZvbGRsIGFsaWFzXG4gICAgYXN5bmMuZm9sZGwgPSBhc3luYy5yZWR1Y2U7XG5cbiAgICBhc3luYy5yZWR1Y2VSaWdodCA9IGZ1bmN0aW9uIChhcnIsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmV2ZXJzZWQgPSBfbWFwKGFyciwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9KS5yZXZlcnNlKCk7XG4gICAgICAgIGFzeW5jLnJlZHVjZShyZXZlcnNlZCwgbWVtbywgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIC8vIGZvbGRyIGFsaWFzXG4gICAgYXN5bmMuZm9sZHIgPSBhc3luYy5yZWR1Y2VSaWdodDtcblxuICAgIHZhciBfZmlsdGVyID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgYXJyID0gX21hcChhcnIsIGZ1bmN0aW9uICh4LCBpKSB7XG4gICAgICAgICAgICByZXR1cm4ge2luZGV4OiBpLCB2YWx1ZTogeH07XG4gICAgICAgIH0pO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgudmFsdWUsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKF9tYXAocmVzdWx0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEuaW5kZXggLSBiLmluZGV4O1xuICAgICAgICAgICAgfSksIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMuZmlsdGVyID0gZG9QYXJhbGxlbChfZmlsdGVyKTtcbiAgICBhc3luYy5maWx0ZXJTZXJpZXMgPSBkb1NlcmllcyhfZmlsdGVyKTtcbiAgICAvLyBzZWxlY3QgYWxpYXNcbiAgICBhc3luYy5zZWxlY3QgPSBhc3luYy5maWx0ZXI7XG4gICAgYXN5bmMuc2VsZWN0U2VyaWVzID0gYXN5bmMuZmlsdGVyU2VyaWVzO1xuXG4gICAgdmFyIF9yZWplY3QgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICBhcnIgPSBfbWFwKGFyciwgZnVuY3Rpb24gKHgsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiB7aW5kZXg6IGksIHZhbHVlOiB4fTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKF9tYXAocmVzdWx0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEuaW5kZXggLSBiLmluZGV4O1xuICAgICAgICAgICAgfSksIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMucmVqZWN0ID0gZG9QYXJhbGxlbChfcmVqZWN0KTtcbiAgICBhc3luYy5yZWplY3RTZXJpZXMgPSBkb1NlcmllcyhfcmVqZWN0KTtcblxuICAgIHZhciBfZGV0ZWN0ID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgbWFpbl9jYWxsYmFjaykge1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2soeCk7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIG1haW5fY2FsbGJhY2soKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5kZXRlY3QgPSBkb1BhcmFsbGVsKF9kZXRlY3QpO1xuICAgIGFzeW5jLmRldGVjdFNlcmllcyA9IGRvU2VyaWVzKF9kZXRlY3QpO1xuXG4gICAgYXN5bmMuc29tZSA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBtYWluX2NhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLmVhY2goYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIG1haW5fY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8vIGFueSBhbGlhc1xuICAgIGFzeW5jLmFueSA9IGFzeW5jLnNvbWU7XG5cbiAgICBhc3luYy5ldmVyeSA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBtYWluX2NhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLmVhY2goYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2KSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgbWFpbl9jYWxsYmFjayh0cnVlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvLyBhbGwgYWxpYXNcbiAgICBhc3luYy5hbGwgPSBhc3luYy5ldmVyeTtcblxuICAgIGFzeW5jLnNvcnRCeSA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBhc3luYy5tYXAoYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIGZ1bmN0aW9uIChlcnIsIGNyaXRlcmlhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge3ZhbHVlOiB4LCBjcml0ZXJpYTogY3JpdGVyaWF9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVyciwgcmVzdWx0cykge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24gKGxlZnQsIHJpZ2h0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYSwgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDA7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBfbWFwKHJlc3VsdHMuc29ydChmbiksIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4LnZhbHVlO1xuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLmF1dG8gPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIHZhciBrZXlzID0gX2tleXModGFza3MpO1xuICAgICAgICB2YXIgcmVtYWluaW5nVGFza3MgPSBrZXlzLmxlbmd0aFxuICAgICAgICBpZiAoIXJlbWFpbmluZ1Rhc2tzKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXN1bHRzID0ge307XG5cbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IFtdO1xuICAgICAgICB2YXIgYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy51bnNoaWZ0KGZuKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnNbaV0gPT09IGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHZhciB0YXNrQ29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZW1haW5pbmdUYXNrcy0tXG4gICAgICAgICAgICBfZWFjaChsaXN0ZW5lcnMuc2xpY2UoMCksIGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBhZGRMaXN0ZW5lcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXJlbWFpbmluZ1Rhc2tzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRoZUNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgICAgICAgICAgLy8gcHJldmVudCBmaW5hbCBjYWxsYmFjayBmcm9tIGNhbGxpbmcgaXRzZWxmIGlmIGl0IGVycm9yc1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG5cbiAgICAgICAgICAgICAgICB0aGVDYWxsYmFjayhudWxsLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgX2VhY2goa2V5cywgZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gX2lzQXJyYXkodGFza3Nba10pID8gdGFza3Nba106IFt0YXNrc1trXV07XG4gICAgICAgICAgICB2YXIgdGFza0NhbGxiYWNrID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2FmZVJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgX2VhY2goX2tleXMocmVzdWx0cyksIGZ1bmN0aW9uKHJrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW3JrZXldID0gcmVzdWx0c1tya2V5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBzYWZlUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN0b3Agc3Vic2VxdWVudCBlcnJvcnMgaGl0dGluZyBjYWxsYmFjayBtdWx0aXBsZSB0aW1lc1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSh0YXNrQ29tcGxldGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgcmVxdWlyZXMgPSB0YXNrLnNsaWNlKDAsIE1hdGguYWJzKHRhc2subGVuZ3RoIC0gMSkpIHx8IFtdO1xuICAgICAgICAgICAgdmFyIHJlYWR5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfcmVkdWNlKHJlcXVpcmVzLCBmdW5jdGlvbiAoYSwgeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGEgJiYgcmVzdWx0cy5oYXNPd25Qcm9wZXJ0eSh4KSk7XG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSkgJiYgIXJlc3VsdHMuaGFzT3duUHJvcGVydHkoayk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICB0YXNrW3Rhc2subGVuZ3RoIC0gMV0odGFza0NhbGxiYWNrLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tbdGFzay5sZW5ndGggLSAxXSh0YXNrQ2FsbGJhY2ssIHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5yZXRyeSA9IGZ1bmN0aW9uKHRpbWVzLCB0YXNrLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgREVGQVVMVF9USU1FUyA9IDU7XG4gICAgICAgIHZhciBhdHRlbXB0cyA9IFtdO1xuICAgICAgICAvLyBVc2UgZGVmYXVsdHMgaWYgdGltZXMgbm90IHBhc3NlZFxuICAgICAgICBpZiAodHlwZW9mIHRpbWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHRhc2s7XG4gICAgICAgICAgICB0YXNrID0gdGltZXM7XG4gICAgICAgICAgICB0aW1lcyA9IERFRkFVTFRfVElNRVM7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTWFrZSBzdXJlIHRpbWVzIGlzIGEgbnVtYmVyXG4gICAgICAgIHRpbWVzID0gcGFyc2VJbnQodGltZXMsIDEwKSB8fCBERUZBVUxUX1RJTUVTO1xuICAgICAgICB2YXIgd3JhcHBlZFRhc2sgPSBmdW5jdGlvbih3cmFwcGVkQ2FsbGJhY2ssIHdyYXBwZWRSZXN1bHRzKSB7XG4gICAgICAgICAgICB2YXIgcmV0cnlBdHRlbXB0ID0gZnVuY3Rpb24odGFzaywgZmluYWxBdHRlbXB0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNlcmllc0NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2soZnVuY3Rpb24oZXJyLCByZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VyaWVzQ2FsbGJhY2soIWVyciB8fCBmaW5hbEF0dGVtcHQsIHtlcnI6IGVyciwgcmVzdWx0OiByZXN1bHR9KTtcbiAgICAgICAgICAgICAgICAgICAgfSwgd3JhcHBlZFJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgd2hpbGUgKHRpbWVzKSB7XG4gICAgICAgICAgICAgICAgYXR0ZW1wdHMucHVzaChyZXRyeUF0dGVtcHQodGFzaywgISh0aW1lcy09MSkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFzeW5jLnNlcmllcyhhdHRlbXB0cywgZnVuY3Rpb24oZG9uZSwgZGF0YSl7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGRhdGFbZGF0YS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAod3JhcHBlZENhbGxiYWNrIHx8IGNhbGxiYWNrKShkYXRhLmVyciwgZGF0YS5yZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgYSBjYWxsYmFjayBpcyBwYXNzZWQsIHJ1biB0aGlzIGFzIGEgY29udHJvbGwgZmxvd1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sgPyB3cmFwcGVkVGFzaygpIDogd3JhcHBlZFRhc2tcbiAgICB9O1xuXG4gICAgYXN5bmMud2F0ZXJmYWxsID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAoIV9pc0FycmF5KHRhc2tzKSkge1xuICAgICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IHRvIHdhdGVyZmFsbCBtdXN0IGJlIGFuIGFycmF5IG9mIGZ1bmN0aW9ucycpO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgd3JhcEl0ZXJhdG9yID0gZnVuY3Rpb24gKGl0ZXJhdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5leHQgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2god3JhcEl0ZXJhdG9yKG5leHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZXJhdG9yLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgICB3cmFwSXRlcmF0b3IoYXN5bmMuaXRlcmF0b3IodGFza3MpKSgpO1xuICAgIH07XG5cbiAgICB2YXIgX3BhcmFsbGVsID0gZnVuY3Rpb24oZWFjaGZuLCB0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgaWYgKF9pc0FycmF5KHRhc2tzKSkge1xuICAgICAgICAgICAgZWFjaGZuLm1hcCh0YXNrcywgZnVuY3Rpb24gKGZuLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmIChmbikge1xuICAgICAgICAgICAgICAgICAgICBmbihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBlcnIsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cyA9IHt9O1xuICAgICAgICAgICAgZWFjaGZuLmVhY2goX2tleXModGFza3MpLCBmdW5jdGlvbiAoaywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICB0YXNrc1trXShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5wYXJhbGxlbCA9IGZ1bmN0aW9uICh0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgX3BhcmFsbGVsKHsgbWFwOiBhc3luYy5tYXAsIGVhY2g6IGFzeW5jLmVhY2ggfSwgdGFza3MsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMucGFyYWxsZWxMaW1pdCA9IGZ1bmN0aW9uKHRhc2tzLCBsaW1pdCwgY2FsbGJhY2spIHtcbiAgICAgICAgX3BhcmFsbGVsKHsgbWFwOiBfbWFwTGltaXQobGltaXQpLCBlYWNoOiBfZWFjaExpbWl0KGxpbWl0KSB9LCB0YXNrcywgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5zZXJpZXMgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmIChfaXNBcnJheSh0YXNrcykpIHtcbiAgICAgICAgICAgIGFzeW5jLm1hcFNlcmllcyh0YXNrcywgZnVuY3Rpb24gKGZuLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmIChmbikge1xuICAgICAgICAgICAgICAgICAgICBmbihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBlcnIsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cyA9IHt9O1xuICAgICAgICAgICAgYXN5bmMuZWFjaFNlcmllcyhfa2V5cyh0YXNrcyksIGZ1bmN0aW9uIChrLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHRhc2tzW2tdKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLml0ZXJhdG9yID0gZnVuY3Rpb24gKHRhc2tzKSB7XG4gICAgICAgIHZhciBtYWtlQ2FsbGJhY2sgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2tzW2luZGV4XS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZm4ubmV4dCgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGZuLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChpbmRleCA8IHRhc2tzLmxlbmd0aCAtIDEpID8gbWFrZUNhbGxiYWNrKGluZGV4ICsgMSk6IG51bGw7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGZuO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gbWFrZUNhbGxiYWNrKDApO1xuICAgIH07XG5cbiAgICBhc3luYy5hcHBseSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkoXG4gICAgICAgICAgICAgICAgbnVsbCwgYXJncy5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHZhciBfY29uY2F0ID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBmbiwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHIgPSBbXTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNiKSB7XG4gICAgICAgICAgICBmbih4LCBmdW5jdGlvbiAoZXJyLCB5KSB7XG4gICAgICAgICAgICAgICAgciA9IHIuY29uY2F0KHkgfHwgW10pO1xuICAgICAgICAgICAgICAgIGNiKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5jb25jYXQgPSBkb1BhcmFsbGVsKF9jb25jYXQpO1xuICAgIGFzeW5jLmNvbmNhdFNlcmllcyA9IGRvU2VyaWVzKF9jb25jYXQpO1xuXG4gICAgYXN5bmMud2hpbHN0ID0gZnVuY3Rpb24gKHRlc3QsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAodGVzdCgpKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXN5bmMud2hpbHN0KHRlc3QsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMuZG9XaGlsc3QgPSBmdW5jdGlvbiAoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGlmICh0ZXN0LmFwcGx5KG51bGwsIGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuZG9XaGlsc3QoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy51bnRpbCA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0ZXN0KCkpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhc3luYy51bnRpbCh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLmRvVW50aWwgPSBmdW5jdGlvbiAoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGlmICghdGVzdC5hcHBseShudWxsLCBhcmdzKSkge1xuICAgICAgICAgICAgICAgIGFzeW5jLmRvVW50aWwoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5xdWV1ZSA9IGZ1bmN0aW9uICh3b3JrZXIsIGNvbmN1cnJlbmN5KSB7XG4gICAgICAgIGlmIChjb25jdXJyZW5jeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25jdXJyZW5jeSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gX2luc2VydChxLCBkYXRhLCBwb3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgaWYgKCFxLnN0YXJ0ZWQpe1xuICAgICAgICAgICAgcS5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFfaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgLy8gY2FsbCBkcmFpbiBpbW1lZGlhdGVseSBpZiB0aGVyZSBhcmUgbm8gdGFza3NcbiAgICAgICAgICAgICByZXR1cm4gYXN5bmMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICBpZiAocS5kcmFpbikge1xuICAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9lYWNoKGRhdGEsIGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgICAgICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyA/IGNhbGxiYWNrIDogbnVsbFxuICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgIGlmIChwb3MpIHtcbiAgICAgICAgICAgICAgICBxLnRhc2tzLnVuc2hpZnQoaXRlbSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcS50YXNrcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKHEuc2F0dXJhdGVkICYmIHEudGFza3MubGVuZ3RoID09PSBxLmNvbmN1cnJlbmN5KSB7XG4gICAgICAgICAgICAgICAgICBxLnNhdHVyYXRlZCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHdvcmtlcnMgPSAwO1xuICAgICAgICB2YXIgcSA9IHtcbiAgICAgICAgICAgIHRhc2tzOiBbXSxcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5OiBjb25jdXJyZW5jeSxcbiAgICAgICAgICAgIHNhdHVyYXRlZDogbnVsbCxcbiAgICAgICAgICAgIGVtcHR5OiBudWxsLFxuICAgICAgICAgICAgZHJhaW46IG51bGwsXG4gICAgICAgICAgICBzdGFydGVkOiBmYWxzZSxcbiAgICAgICAgICAgIHBhdXNlZDogZmFsc2UsXG4gICAgICAgICAgICBwdXNoOiBmdW5jdGlvbiAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgX2luc2VydChxLCBkYXRhLCBmYWxzZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGtpbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcS5kcmFpbiA9IG51bGw7XG4gICAgICAgICAgICAgIHEudGFza3MgPSBbXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bnNoaWZ0OiBmdW5jdGlvbiAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgX2luc2VydChxLCBkYXRhLCB0cnVlLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJvY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICghcS5wYXVzZWQgJiYgd29ya2VycyA8IHEuY29uY3VycmVuY3kgJiYgcS50YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhc2sgPSBxLnRhc2tzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxLmVtcHR5ICYmIHEudGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgd29ya2VycyArPSAxO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtlcnMgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5jYWxsYmFjay5hcHBseSh0YXNrLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHEuZHJhaW4gJiYgcS50YXNrcy5sZW5ndGggKyB3b3JrZXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcS5wcm9jZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYiA9IG9ubHlfb25jZShuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgd29ya2VyKHRhc2suZGF0YSwgY2IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZW5ndGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcS50YXNrcy5sZW5ndGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVubmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JrZXJzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlkbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBxLnRhc2tzLmxlbmd0aCArIHdvcmtlcnMgPT09IDA7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGF1c2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAocS5wYXVzZWQgPT09IHRydWUpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgcS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHEucHJvY2VzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlc3VtZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChxLnBhdXNlZCA9PT0gZmFsc2UpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgcS5wYXVzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBxLnByb2Nlc3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHE7XG4gICAgfTtcbiAgICBcbiAgICBhc3luYy5wcmlvcml0eVF1ZXVlID0gZnVuY3Rpb24gKHdvcmtlciwgY29uY3VycmVuY3kpIHtcbiAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIF9jb21wYXJlVGFza3MoYSwgYil7XG4gICAgICAgICAgcmV0dXJuIGEucHJpb3JpdHkgLSBiLnByaW9yaXR5O1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gX2JpbmFyeVNlYXJjaChzZXF1ZW5jZSwgaXRlbSwgY29tcGFyZSkge1xuICAgICAgICAgIHZhciBiZWcgPSAtMSxcbiAgICAgICAgICAgICAgZW5kID0gc2VxdWVuY2UubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoYmVnIDwgZW5kKSB7XG4gICAgICAgICAgICB2YXIgbWlkID0gYmVnICsgKChlbmQgLSBiZWcgKyAxKSA+Pj4gMSk7XG4gICAgICAgICAgICBpZiAoY29tcGFyZShpdGVtLCBzZXF1ZW5jZVttaWRdKSA+PSAwKSB7XG4gICAgICAgICAgICAgIGJlZyA9IG1pZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGVuZCA9IG1pZCAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBiZWc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIF9pbnNlcnQocSwgZGF0YSwgcHJpb3JpdHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgaWYgKCFxLnN0YXJ0ZWQpe1xuICAgICAgICAgICAgcS5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFfaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgLy8gY2FsbCBkcmFpbiBpbW1lZGlhdGVseSBpZiB0aGVyZSBhcmUgbm8gdGFza3NcbiAgICAgICAgICAgICByZXR1cm4gYXN5bmMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICBpZiAocS5kcmFpbikge1xuICAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIF9lYWNoKGRhdGEsIGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgICAgICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IHByaW9yaXR5LFxuICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyA/IGNhbGxiYWNrIDogbnVsbFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgcS50YXNrcy5zcGxpY2UoX2JpbmFyeVNlYXJjaChxLnRhc2tzLCBpdGVtLCBfY29tcGFyZVRhc2tzKSArIDEsIDAsIGl0ZW0pO1xuXG4gICAgICAgICAgICAgIGlmIChxLnNhdHVyYXRlZCAmJiBxLnRhc2tzLmxlbmd0aCA9PT0gcS5jb25jdXJyZW5jeSkge1xuICAgICAgICAgICAgICAgICAgcS5zYXR1cmF0ZWQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUocS5wcm9jZXNzKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RhcnQgd2l0aCBhIG5vcm1hbCBxdWV1ZVxuICAgICAgICB2YXIgcSA9IGFzeW5jLnF1ZXVlKHdvcmtlciwgY29uY3VycmVuY3kpO1xuICAgICAgICBcbiAgICAgICAgLy8gT3ZlcnJpZGUgcHVzaCB0byBhY2NlcHQgc2Vjb25kIHBhcmFtZXRlciByZXByZXNlbnRpbmcgcHJpb3JpdHlcbiAgICAgICAgcS5wdXNoID0gZnVuY3Rpb24gKGRhdGEsIHByaW9yaXR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgcHJpb3JpdHksIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSB1bnNoaWZ0IGZ1bmN0aW9uXG4gICAgICAgIGRlbGV0ZSBxLnVuc2hpZnQ7XG5cbiAgICAgICAgcmV0dXJuIHE7XG4gICAgfTtcblxuICAgIGFzeW5jLmNhcmdvID0gZnVuY3Rpb24gKHdvcmtlciwgcGF5bG9hZCkge1xuICAgICAgICB2YXIgd29ya2luZyAgICAgPSBmYWxzZSxcbiAgICAgICAgICAgIHRhc2tzICAgICAgID0gW107XG5cbiAgICAgICAgdmFyIGNhcmdvID0ge1xuICAgICAgICAgICAgdGFza3M6IHRhc2tzLFxuICAgICAgICAgICAgcGF5bG9hZDogcGF5bG9hZCxcbiAgICAgICAgICAgIHNhdHVyYXRlZDogbnVsbCxcbiAgICAgICAgICAgIGVtcHR5OiBudWxsLFxuICAgICAgICAgICAgZHJhaW46IG51bGwsXG4gICAgICAgICAgICBkcmFpbmVkOiB0cnVlLFxuICAgICAgICAgICAgcHVzaDogZnVuY3Rpb24gKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFfaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfZWFjaChkYXRhLCBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2tzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogdGFzayxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgPyBjYWxsYmFjayA6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNhcmdvLmRyYWluZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhcmdvLnNhdHVyYXRlZCAmJiB0YXNrcy5sZW5ndGggPT09IHBheWxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmdvLnNhdHVyYXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGNhcmdvLnByb2Nlc3MpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uIHByb2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdvcmtpbmcpIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAodGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNhcmdvLmRyYWluICYmICFjYXJnby5kcmFpbmVkKSBjYXJnby5kcmFpbigpO1xuICAgICAgICAgICAgICAgICAgICBjYXJnby5kcmFpbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciB0cyA9IHR5cGVvZiBwYXlsb2FkID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gdGFza3Muc3BsaWNlKDAsIHBheWxvYWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB0YXNrcy5zcGxpY2UoMCwgdGFza3MubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIHZhciBkcyA9IF9tYXAodHMsIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXNrLmRhdGE7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZihjYXJnby5lbXB0eSkgY2FyZ28uZW1wdHkoKTtcbiAgICAgICAgICAgICAgICB3b3JraW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB3b3JrZXIoZHMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2luZyA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgICAgICBfZWFjaCh0cywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jYWxsYmFjay5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcHJvY2VzcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXNrcy5sZW5ndGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVubmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JraW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gY2FyZ287XG4gICAgfTtcblxuICAgIHZhciBfY29uc29sZV9mbiA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KFtmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY29uc29sZVtuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2VhY2goYXJncywgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlW25hbWVdKHgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XSkpO1xuICAgICAgICB9O1xuICAgIH07XG4gICAgYXN5bmMubG9nID0gX2NvbnNvbGVfZm4oJ2xvZycpO1xuICAgIGFzeW5jLmRpciA9IF9jb25zb2xlX2ZuKCdkaXInKTtcbiAgICAvKmFzeW5jLmluZm8gPSBfY29uc29sZV9mbignaW5mbycpO1xuICAgIGFzeW5jLndhcm4gPSBfY29uc29sZV9mbignd2FybicpO1xuICAgIGFzeW5jLmVycm9yID0gX2NvbnNvbGVfZm4oJ2Vycm9yJyk7Ki9cblxuICAgIGFzeW5jLm1lbW9pemUgPSBmdW5jdGlvbiAoZm4sIGhhc2hlcikge1xuICAgICAgICB2YXIgbWVtbyA9IHt9O1xuICAgICAgICB2YXIgcXVldWVzID0ge307XG4gICAgICAgIGhhc2hlciA9IGhhc2hlciB8fCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBtZW1vaXplZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgICAgICAgICB2YXIga2V5ID0gaGFzaGVyLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgaWYgKGtleSBpbiBtZW1vKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBtZW1vW2tleV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoa2V5IGluIHF1ZXVlcykge1xuICAgICAgICAgICAgICAgIHF1ZXVlc1trZXldLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcXVldWVzW2tleV0gPSBbY2FsbGJhY2tdO1xuICAgICAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KFtmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lbW9ba2V5XSA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICAgICAgdmFyIHEgPSBxdWV1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHF1ZXVlc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcVtpXS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgbWVtb2l6ZWQubWVtbyA9IG1lbW87XG4gICAgICAgIG1lbW9pemVkLnVubWVtb2l6ZWQgPSBmbjtcbiAgICAgICAgcmV0dXJuIG1lbW9pemVkO1xuICAgIH07XG5cbiAgICBhc3luYy51bm1lbW9pemUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAoZm4udW5tZW1vaXplZCB8fCBmbikuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGFzeW5jLnRpbWVzID0gZnVuY3Rpb24gKGNvdW50LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGNvdW50ZXIgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBjb3VudGVyLnB1c2goaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFzeW5jLm1hcChjb3VudGVyLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy50aW1lc1NlcmllcyA9IGZ1bmN0aW9uIChjb3VudCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBjb3VudGVyID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICAgICAgY291bnRlci5wdXNoKGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhc3luYy5tYXBTZXJpZXMoY291bnRlciwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuc2VxID0gZnVuY3Rpb24gKC8qIGZ1bmN0aW9ucy4uLiAqLykge1xuICAgICAgICB2YXIgZm5zID0gYXJndW1lbnRzO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIGFzeW5jLnJlZHVjZShmbnMsIGFyZ3MsIGZ1bmN0aW9uIChuZXdhcmdzLCBmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBuZXdhcmdzLmNvbmNhdChbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyID0gYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICBjYihlcnIsIG5leHRhcmdzKTtcbiAgICAgICAgICAgICAgICB9XSkpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGVyciwgcmVzdWx0cykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoYXQsIFtlcnJdLmNvbmNhdChyZXN1bHRzKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgYXN5bmMuY29tcG9zZSA9IGZ1bmN0aW9uICgvKiBmdW5jdGlvbnMuLi4gKi8pIHtcbiAgICAgIHJldHVybiBhc3luYy5zZXEuYXBwbHkobnVsbCwgQXJyYXkucHJvdG90eXBlLnJldmVyc2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICB9O1xuXG4gICAgdmFyIF9hcHBseUVhY2ggPSBmdW5jdGlvbiAoZWFjaGZuLCBmbnMgLyphcmdzLi4uKi8pIHtcbiAgICAgICAgdmFyIGdvID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiBlYWNoZm4oZm5zLCBmdW5jdGlvbiAoZm4sIGNiKSB7XG4gICAgICAgICAgICAgICAgZm4uYXBwbHkodGhhdCwgYXJncy5jb25jYXQoW2NiXSkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgICAgICAgICByZXR1cm4gZ28uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZ287XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGFzeW5jLmFwcGx5RWFjaCA9IGRvUGFyYWxsZWwoX2FwcGx5RWFjaCk7XG4gICAgYXN5bmMuYXBwbHlFYWNoU2VyaWVzID0gZG9TZXJpZXMoX2FwcGx5RWFjaCk7XG5cbiAgICBhc3luYy5mb3JldmVyID0gZnVuY3Rpb24gKGZuLCBjYWxsYmFjaykge1xuICAgICAgICBmdW5jdGlvbiBuZXh0KGVycikge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm4obmV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICAvLyBOb2RlLmpzXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gYXN5bmM7XG4gICAgfVxuICAgIC8vIEFNRCAvIFJlcXVpcmVKU1xuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFtdLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gYXN5bmM7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBpbmNsdWRlZCBkaXJlY3RseSB2aWEgPHNjcmlwdD4gdGFnXG4gICAgZWxzZSB7XG4gICAgICAgIHJvb3QuYXN5bmMgPSBhc3luYztcbiAgICB9XG5cbn0oKSk7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiRldhQVNIXCIpKSIsIi8qKlxuICAjIG5vcm1hbGljZVxuXG4gIE5vcm1hbGl6ZSBhbiBpY2Ugc2VydmVyIGNvbmZpZ3VyYXRpb24gb2JqZWN0IChvciBwbGFpbiBvbGQgc3RyaW5nKSBpbnRvIGEgZm9ybWF0XG4gIHRoYXQgaXMgdXNhYmxlIGluIGFsbCBicm93c2VycyBzdXBwb3J0aW5nIFdlYlJUQy4gIFByaW1hcmlseSB0aGlzIG1vZHVsZSBpcyBkZXNpZ25lZFxuICB0byBoZWxwIHdpdGggdGhlIHRyYW5zaXRpb24gb2YgdGhlIGB1cmxgIGF0dHJpYnV0ZSBvZiB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgdG9cbiAgdGhlIGB1cmxzYCBhdHRyaWJ1dGUuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlcy9zaW1wbGUuanNcblxuKiovXG5cbnZhciBwcm90b2NvbHMgPSBbXG4gICdzdHVuOicsXG4gICd0dXJuOidcbl07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIHVybCA9IChpbnB1dCB8fCB7fSkudXJsIHx8IGlucHV0O1xuICB2YXIgcHJvdG9jb2w7XG4gIHZhciBwYXJ0cztcbiAgdmFyIG91dHB1dCA9IHt9O1xuXG4gIC8vIGlmIHdlIGRvbid0IGhhdmUgYSBzdHJpbmcgdXJsLCB0aGVuIGFsbG93IHRoZSBpbnB1dCB0byBwYXNzdGhyb3VnaFxuICBpZiAodHlwZW9mIHVybCAhPSAnc3RyaW5nJyAmJiAoISAodXJsIGluc3RhbmNlb2YgU3RyaW5nKSkpIHtcbiAgICByZXR1cm4gaW5wdXQ7XG4gIH1cblxuICAvLyB0cmltIHRoZSB1cmwgc3RyaW5nLCBhbmQgY29udmVydCB0byBhbiBhcnJheVxuICB1cmwgPSB1cmwudHJpbSgpO1xuXG4gIC8vIGlmIHRoZSBwcm90b2NvbCBpcyBub3Qga25vd24sIHRoZW4gcGFzc3Rocm91Z2hcbiAgcHJvdG9jb2wgPSBwcm90b2NvbHNbcHJvdG9jb2xzLmluZGV4T2YodXJsLnNsaWNlKDAsIDUpKV07XG4gIGlmICghIHByb3RvY29sKSB7XG4gICAgcmV0dXJuIGlucHV0O1xuICB9XG5cbiAgLy8gbm93IGxldCdzIGF0dGFjayB0aGUgcmVtYWluaW5nIHVybCBwYXJ0c1xuICB1cmwgPSB1cmwuc2xpY2UoNSk7XG4gIHBhcnRzID0gdXJsLnNwbGl0KCdAJyk7XG5cbiAgLy8gaWYgd2UgaGF2ZSBhbiBhdXRoZW50aWNhdGlvbiBwYXJ0LCB0aGVuIHNldCB0aGUgY3JlZGVudGlhbHNcbiAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICB1cmwgPSBwYXJ0c1sxXTtcbiAgICBwYXJ0cyA9IHBhcnRzWzBdLnNwbGl0KCc6Jyk7XG5cbiAgICAvLyBhZGQgdGhlIG91dHB1dCBjcmVkZW50aWFsIGFuZCB1c2VybmFtZVxuICAgIG91dHB1dC51c2VybmFtZSA9IHBhcnRzWzBdO1xuICAgIG91dHB1dC5jcmVkZW50aWFsID0gKGlucHV0IHx8IHt9KS5jcmVkZW50aWFsIHx8IHBhcnRzWzFdIHx8ICcnO1xuICB9XG5cbiAgb3V0cHV0LnVybCA9IHByb3RvY29sICsgdXJsO1xuICBvdXRwdXQudXJscyA9IFsgb3V0cHV0LnVybCBdO1xuXG4gIHJldHVybiBvdXRwdXQ7XG59O1xuIl19
