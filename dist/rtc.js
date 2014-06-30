(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;
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
    rtc.emit('ready');
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

},{"cog/defaults":4,"cog/extend":5,"crel":10,"events":2,"rtc-captureconfig":11,"rtc-media":12,"rtc-quickconnect":18}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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

},{"cog/extend":5,"cog/logger":8,"eventemitter3":13,"inherits":14,"rtc-core/detect":15,"rtc-core/plugin":17}],13:[function(require,module,exports){
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
},{"FWaASH":3,"cog/defaults":4,"cog/extend":5,"cog/getable":6,"rtc-signaller":22,"rtc-tools":36,"rtc-tools/cleanup":32}],19:[function(require,module,exports){
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

},{"./index.js":27,"./primus-loader":29,"cog/extend":5}],23:[function(require,module,exports){
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
},{"cog/extend":5,"cog/logger":8}],25:[function(require,module,exports){
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

},{"./defaults":23,"./processor":30,"./uuid":31,"cog/defaults":4,"cog/extend":5,"cog/getable":6,"cog/logger":8,"cog/throttle":9,"eventemitter3":28,"rtc-core/detect":19}],28:[function(require,module,exports){
module.exports=require(13)
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

},{"./handlers":25,"cog/jsonparse":7,"cog/logger":8}],31:[function(require,module,exports){
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

},{"cog/logger":8}],33:[function(require,module,exports){
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

},{"./cleanup":32,"./detect":34,"./monitor":37,"async":38,"cog/logger":8,"rtc-core/plugin":21}],34:[function(require,module,exports){
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

},{"./detect":34,"cog/defaults":4,"cog/logger":8}],36:[function(require,module,exports){
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

},{"./couple":33,"./detect":34,"./generators":35,"cog/logger":8,"normalice":40,"rtc-core/plugin":21}],37:[function(require,module,exports){
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

},{"cog/logger":8,"eventemitter3":39}],38:[function(require,module,exports){
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
},{"FWaASH":3}],39:[function(require,module,exports){
module.exports=require(13)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9jb2cvZGVmYXVsdHMuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL2NvZy9leHRlbmQuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL2NvZy9nZXRhYmxlLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9jb2cvanNvbnBhcnNlLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9jb2cvbG9nZ2VyLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9jb2cvdGhyb3R0bGUuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL2NyZWwvY3JlbC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLWNhcHR1cmVjb25maWcvaW5kZXguanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLW1lZGlhL25vZGVfbW9kdWxlcy9ldmVudGVtaXR0ZXIzL2luZGV4LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtbWVkaWEvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9ub2RlX21vZHVsZXMvcnRjLWNvcmUvZGV0ZWN0LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtbWVkaWEvbm9kZV9tb2R1bGVzL3J0Yy1jb3JlL25vZGVfbW9kdWxlcy9kZXRlY3QtYnJvd3Nlci9icm93c2VyLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtbWVkaWEvbm9kZV9tb2R1bGVzL3J0Yy1jb3JlL3BsdWdpbi5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9icm93c2VyLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2RlZmF1bHRzLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2hhbmRsZXJzL2Fubm91bmNlLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2hhbmRsZXJzL2luZGV4LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2hhbmRsZXJzL2xlYXZlLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2luZGV4LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL3ByaW11cy1sb2FkZXIuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvcHJvY2Vzc29yLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL3V1aWQuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy10b29scy9jbGVhbnVwLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtdG9vbHMvY291cGxlLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtdG9vbHMvZGV0ZWN0LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtdG9vbHMvZ2VuZXJhdG9ycy5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXRvb2xzL2luZGV4LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjL25vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtdG9vbHMvbW9uaXRvci5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy9ub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXRvb2xzL25vZGVfbW9kdWxlcy9hc3luYy9saWIvYXN5bmMuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMvbm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvbm9ybWFsaWNlL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7OztBQy9tQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNybUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgY3JlbCA9IHJlcXVpcmUoJ2NyZWwnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJ2NvZy9kZWZhdWx0cycpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbnZhciBxdWlja2Nvbm5lY3QgPSByZXF1aXJlKCdydGMtcXVpY2tjb25uZWN0Jyk7XG52YXIgY2FwdHVyZWNvbmZpZyA9IHJlcXVpcmUoJ3J0Yy1jYXB0dXJlY29uZmlnJyk7XG52YXIgbWVkaWEgPSByZXF1aXJlKCdydGMtbWVkaWEnKTtcbnZhciBERUZBVUxUX0NPTlNUUkFJTlRTID0geyB2aWRlbzogdHJ1ZSwgYXVkaW86IHRydWUgfTtcblxuLyoqXG4gICMgcnRjXG5cbiAgVGhpcyBpcyBhIHBhY2thZ2UgdGhhdCB3aWxsIHByb3ZpZGUgeW91IGEgXCJvbmUtc3RvcCBzaG9wXCIgZm9yIGJ1aWxkaW5nXG4gIFdlYlJUQyBhcHBsaWNhdGlvbnMuICBJdCBhZ2dyZWdhdGVzIHRvZ2V0aGVyIGEgdmFyaWV0eSBvZiBwYWNrYWdlcyAocHJpbWFyaWx5XG4gIGZyb20gdGhlIFtydGMuaW9dKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8pIHN1aXRlKSB0byBkZWxpdmVyIGEgc2luZ2xlXG4gIHBhY2thZ2UgZm9yIGJ1aWxkaW5nIGEgV2ViUlRDIGFwcGxpY2F0aW9uLlxuXG4gICMjIEdldHRpbmcgU3RhcnRlZFxuXG4gIDw8PCBkb2NzL2dldHRpbmctc3RhcnRlZC5tZFxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZG9jcy9leGFtcGxlcy5tZFxuXG4qKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRzKSB7XG4gIHZhciBydGMgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIHZhciBjb25zdHJhaW50cyA9IFtdLmNvbmNhdCgob3B0cyB8fCB7fSkuY2FwdHVyZSB8fCBbIERFRkFVTFRfQ09OU1RSQUlOVFMgXSk7XG4gIHZhciBwbHVnaW5zID0gKG9wdHMgfHwge30pLnBsdWdpbnMgfHwgW107XG4gIHZhciBzaWduYWxob3N0ID0gKG9wdHMgfHwge30pLnNpZ25hbGxlciB8fCAnLy9zd2l0Y2hib2FyZC5ydGMuaW8nO1xuICB2YXIgbG9jYWxTdHJlYW1zID0gW107XG4gIHZhciBsb2NhbFZpZGVvO1xuICB2YXIgcmVtb3RlVmlkZW87XG5cbiAgLy8gY2FwdHVyZSBtZWRpYVxuICB2YXIgY2FwdHVyZVRhcmdldHMgPSBjb25zdHJhaW50cy5tYXAocGFyc2VDb25zdHJhaW50cykubWFwKGZ1bmN0aW9uKGNvbnN0cmFpbnRzKSB7XG4gICAgcmV0dXJuIG1lZGlhKHsgY29uc3RyYWludHM6IGNvbnN0cmFpbnRzLCBwbHVnaW5zOiBwbHVnaW5zIH0pO1xuICB9KTtcblxuICBmdW5jdGlvbiBhbm5vdW5jZSgpIHtcbiAgICAvLyBjcmVhdGUgdGhlIHNpZ25hbGxlclxuICAgIHZhciBzaWduYWxsZXIgPSBydGMuc2lnbmFsbGVyID0gcXVpY2tjb25uZWN0KHNpZ25hbGhvc3QsIG9wdHMpO1xuXG4gICAgc2lnbmFsbGVyXG4gICAgICAub24oJ2NhbGw6c3RhcnRlZCcsIGhhbmRsZUNhbGxTdGFydClcbiAgICAgIC5vbignY2FsbDplbmRlZCcsIGhhbmRsZUNhbGxFbmQpO1xuXG4gICAgLy8gYWRkIHRoZSBsb2NhbCBzdHJlYW1zXG4gICAgbG9jYWxTdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICBzaWduYWxsZXIuYWRkU3RyZWFtKHN0cmVhbSk7XG4gICAgfSk7XG5cbiAgICAvLyBlbWl0IGEgcmVhZHkgZXZlbnQgZm9yIHRoZSBydGNcbiAgICBydGMuZW1pdCgncmVhZHknKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdvdExvY2FsU3RyZWFtKHN0cmVhbSkge1xuICAgIG1lZGlhKHsgc3RyZWFtOiBzdHJlYW0sIHBsdWdpbnM6IHBsdWdpbnMsIG11dGVkOiB0cnVlIH0pLnJlbmRlcihsb2NhbFZpZGVvKTtcblxuICAgIGxvY2FsU3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgaWYgKGxvY2FsU3RyZWFtcy5sZW5ndGggPj0gY2FwdHVyZVRhcmdldHMubGVuZ3RoKSB7XG4gICAgICBhbm5vdW5jZSgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZUNhbGxTdGFydChpZCwgcGMsIGRhdGEpIHtcbiAgICAvLyBjcmVhdGUgdGhlIGNvbnRhaW5lciBmb3IgdGhpcyBwZWVycyBzdHJlYW1zXG4gICAgdmFyIGNvbnRhaW5lciA9IGNyZWwoJ2RpdicsIHtcbiAgICAgIGNsYXNzOiAncnRjLXBlZXInLFxuICAgICAgJ2RhdGEtcGVlcmlkJzogaWRcbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCdjYWxsIHN0YXJ0ZWQgd2l0aCBwZWVyOiAnICsgaWQpO1xuICAgIHBjLmdldFJlbW90ZVN0cmVhbXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgbWVkaWEoeyBzdHJlYW06IHN0cmVhbSwgcGx1Z2luczogcGx1Z2lucyB9KS5yZW5kZXIoY29udGFpbmVyKTtcbiAgICB9KTtcblxuICAgIHJlbW90ZVZpZGVvLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVDYWxsRW5kKGlkLCBwYywgZGF0YSkge1xuICAgIHZhciBlbCA9IHJlbW90ZVZpZGVvLnF1ZXJ5U2VsZWN0b3IoJ2RpdltkYXRhLXBlZXJpZD1cIicgKyBpZCArICdcIl0nKTtcblxuICAgIGlmIChlbCkge1xuICAgICAgZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VDb25zdHJhaW50cyhpbnB1dCkge1xuICAgIGlmICh0eXBlb2YgaW5wdXQgPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBjYXB0dXJlY29uZmlnKGlucHV0KS50b0NvbnN0cmFpbnRzKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlucHV0O1xuICB9XG5cbiAgLy8gb25jZSB3ZSd2ZSBjYXB0dXJlZCBhbGwgdGhlIHN0cmVhbXMgc3RhcnQgdGhlIGNhbGxcbiAgY2FwdHVyZVRhcmdldHMuZm9yRWFjaChmdW5jdGlvbih0YXJnZXQpIHtcbiAgICB0YXJnZXQub25jZSgnY2FwdHVyZScsIGdvdExvY2FsU3RyZWFtKTtcbiAgfSk7XG5cbiAgLy8gY3JlYXRlIHRoZSBsb2NhbCBjb250YWluZXJcbiAgbG9jYWxWaWRlbyA9IHJ0Yy5sb2NhbCA9IGNyZWwoJ2RpdicsIHtcbiAgICBjbGFzczogJ3J0Yy1tZWRpYSBydGMtbG9jYWx2aWRlbydcbiAgfSk7XG5cbiAgLy8gY3JlYXRlIHRoZSByZW1vdGUgY29udGFpbmVyXG4gIHJlbW90ZVZpZGVvID0gcnRjLnJlbW90ZSA9IGNyZWwoJ2RpdicsIHtcbiAgICBjbGFzczogJ3J0Yy1tZWRpYSBydGMtcmVtb3RldmlkZW8nXG4gIH0pO1xuXG4gIHJldHVybiBydGM7XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2RlZmF1bHRzXG5cbmBgYGpzXG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcbmBgYFxuXG4jIyMgZGVmYXVsdHModGFyZ2V0LCAqKVxuXG5TaGFsbG93IGNvcHkgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0aGUgc3VwcGxpZWQgc291cmNlIG9iamVjdHMgKCopIGludG9cbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQuICBEbyBub3QsXG5ob3dldmVyLCBvdmVyd3JpdGUgZXhpc3Rpbmcga2V5cyB3aXRoIG5ldyB2YWx1ZXM6XG5cbmBgYGpzXG5kZWZhdWx0cyh7IGE6IDEsIGI6IDIgfSwgeyBjOiAzIH0sIHsgZDogNCB9LCB7IGI6IDUgfSkpO1xuYGBgXG5cblNlZSBhbiBleGFtcGxlIG9uIFtyZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA3OTQ3NSkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGEgdGFyZ2V0XG4gIHRhcmdldCA9IHRhcmdldCB8fCB7fTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHNvdXJjZXMgYW5kIGNvcHkgdG8gdGhlIHRhcmdldFxuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgaWYgKHRhcmdldFtwcm9wXSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2V4dGVuZFxuXG5gYGBqc1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbmBgYFxuXG4jIyMgZXh0ZW5kKHRhcmdldCwgKilcblxuU2hhbGxvdyBjb3B5IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGhlIHN1cHBsaWVkIHNvdXJjZSBvYmplY3RzICgqKSBpbnRvXG50aGUgdGFyZ2V0IG9iamVjdCwgcmV0dXJuaW5nIHRoZSB0YXJnZXQgb2JqZWN0IG9uY2UgY29tcGxldGVkOlxuXG5gYGBqc1xuZXh0ZW5kKHsgYTogMSwgYjogMiB9LCB7IGM6IDMgfSwgeyBkOiA0IH0sIHsgYjogNSB9KSk7XG5gYGBcblxuU2VlIGFuIGV4YW1wbGUgb24gW3JlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDc5NDc1KS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLmZvckVhY2goZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKCEgc291cmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qKlxuICAjIyBjb2cvZ2V0YWJsZVxuXG4gIFRha2UgYW4gb2JqZWN0IGFuZCBwcm92aWRlIGEgd3JhcHBlciB0aGF0IGFsbG93cyB5b3UgdG8gYGdldGAgYW5kXG4gIGBzZXRgIHZhbHVlcyBvbiB0aGF0IG9iamVjdC5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICBmdW5jdGlvbiBnZXQoa2V5KSB7XG4gICAgcmV0dXJuIHRhcmdldFtrZXldO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0KGtleSwgdmFsdWUpIHtcbiAgICB0YXJnZXRba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGtleSkge1xuICAgIHJldHVybiBkZWxldGUgdGFyZ2V0W2tleV07XG4gIH1cblxuICBmdW5jdGlvbiBrZXlzKCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0YXJnZXQpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHZhbHVlcygpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGFyZ2V0KS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGFyZ2V0W2tleV07XG4gICAgfSk7XG4gIH07XG5cbiAgaWYgKHR5cGVvZiB0YXJnZXQgIT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBnZXQ6IGdldCxcbiAgICBzZXQ6IHNldCxcbiAgICByZW1vdmU6IHJlbW92ZSxcbiAgICBkZWxldGU6IHJlbW92ZSxcbiAgICBrZXlzOiBrZXlzLFxuICAgIHZhbHVlczogdmFsdWVzXG4gIH07XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIGNvZy9qc29ucGFyc2VcblxuICBgYGBqc1xuICB2YXIganNvbnBhcnNlID0gcmVxdWlyZSgnY29nL2pzb25wYXJzZScpO1xuICBgYGBcblxuICAjIyMganNvbnBhcnNlKGlucHV0KVxuXG4gIFRoaXMgZnVuY3Rpb24gd2lsbCBhdHRlbXB0IHRvIGF1dG9tYXRpY2FsbHkgZGV0ZWN0IHN0cmluZ2lmaWVkIEpTT04sIGFuZFxuICB3aGVuIGRldGVjdGVkIHdpbGwgcGFyc2UgaW50byBKU09OIG9iamVjdHMuICBUaGUgZnVuY3Rpb24gbG9va3MgZm9yIHN0cmluZ3NcbiAgdGhhdCBsb29rIGFuZCBzbWVsbCBsaWtlIHN0cmluZ2lmaWVkIEpTT04sIGFuZCBpZiBmb3VuZCBhdHRlbXB0cyB0b1xuICBgSlNPTi5wYXJzZWAgdGhlIGlucHV0IGludG8gYSB2YWxpZCBvYmplY3QuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgaXNTdHJpbmcgPSB0eXBlb2YgaW5wdXQgPT0gJ3N0cmluZycgfHwgKGlucHV0IGluc3RhbmNlb2YgU3RyaW5nKTtcbiAgdmFyIHJlTnVtZXJpYyA9IC9eXFwtP1xcZCtcXC4/XFxkKiQvO1xuICB2YXIgc2hvdWxkUGFyc2UgO1xuICB2YXIgZmlyc3RDaGFyO1xuICB2YXIgbGFzdENoYXI7XG5cbiAgaWYgKCghIGlzU3RyaW5nKSB8fCBpbnB1dC5sZW5ndGggPCAyKSB7XG4gICAgaWYgKGlzU3RyaW5nICYmIHJlTnVtZXJpYy50ZXN0KGlucHV0KSkge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoaW5wdXQpO1xuICAgIH1cblxuICAgIHJldHVybiBpbnB1dDtcbiAgfVxuXG4gIC8vIGNoZWNrIGZvciB0cnVlIG9yIGZhbHNlXG4gIGlmIChpbnB1dCA9PT0gJ3RydWUnIHx8IGlucHV0ID09PSAnZmFsc2UnKSB7XG4gICAgcmV0dXJuIGlucHV0ID09PSAndHJ1ZSc7XG4gIH1cblxuICAvLyBjaGVjayBmb3IgbnVsbFxuICBpZiAoaW5wdXQgPT09ICdudWxsJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gZ2V0IHRoZSBmaXJzdCBhbmQgbGFzdCBjaGFyYWN0ZXJzXG4gIGZpcnN0Q2hhciA9IGlucHV0LmNoYXJBdCgwKTtcbiAgbGFzdENoYXIgPSBpbnB1dC5jaGFyQXQoaW5wdXQubGVuZ3RoIC0gMSk7XG5cbiAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgd2Ugc2hvdWxkIEpTT04ucGFyc2UgdGhlIGlucHV0XG4gIHNob3VsZFBhcnNlID1cbiAgICAoZmlyc3RDaGFyID09ICd7JyAmJiBsYXN0Q2hhciA9PSAnfScpIHx8XG4gICAgKGZpcnN0Q2hhciA9PSAnWycgJiYgbGFzdENoYXIgPT0gJ10nKSB8fFxuICAgIChmaXJzdENoYXIgPT0gJ1wiJyAmJiBsYXN0Q2hhciA9PSAnXCInKTtcblxuICBpZiAoc2hvdWxkUGFyc2UpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIEpTT04ucGFyc2UoaW5wdXQpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgLy8gYXBwYXJlbnRseSBpdCB3YXNuJ3QgdmFsaWQganNvbiwgY2Fycnkgb24gd2l0aCByZWd1bGFyIHByb2Nlc3NpbmdcbiAgICB9XG4gIH1cblxuXG4gIHJldHVybiByZU51bWVyaWMudGVzdChpbnB1dCkgPyBwYXJzZUZsb2F0KGlucHV0KSA6IGlucHV0O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgY29nL2xvZ2dlclxuXG4gIGBgYGpzXG4gIHZhciBsb2dnZXIgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJyk7XG4gIGBgYFxuXG4gIFNpbXBsZSBicm93c2VyIGxvZ2dpbmcgb2ZmZXJpbmcgc2ltaWxhciBmdW5jdGlvbmFsaXR5IHRvIHRoZVxuICBbZGVidWddKGh0dHBzOi8vZ2l0aHViLmNvbS92aXNpb25tZWRpYS9kZWJ1ZykgbW9kdWxlLlxuXG4gICMjIyBVc2FnZVxuXG4gIENyZWF0ZSB5b3VyIHNlbGYgYSBuZXcgbG9nZ2luZyBpbnN0YW5jZSBhbmQgZ2l2ZSBpdCBhIG5hbWU6XG5cbiAgYGBganNcbiAgdmFyIGRlYnVnID0gbG9nZ2VyKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIGRlYnVnZ2luZzpcblxuICBgYGBqc1xuICBkZWJ1ZygnaGVsbG8nKTtcbiAgYGBgXG5cbiAgQXQgdGhpcyBzdGFnZSwgbm8gbG9nIG91dHB1dCB3aWxsIGJlIGdlbmVyYXRlZCBiZWNhdXNlIHlvdXIgbG9nZ2VyIGlzXG4gIGN1cnJlbnRseSBkaXNhYmxlZC4gIEVuYWJsZSBpdDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIG1vcmUgbG9nZ2VyOlxuXG4gIGBgYGpzXG4gIGRlYnVnKCdPaCB0aGlzIGlzIHNvIG11Y2ggbmljZXIgOiknKTtcbiAgLy8gLS0+IHBoaWw6IE9oIHRoaXMgaXMgc29tZSBtdWNoIG5pY2VyIDopXG4gIGBgYFxuXG4gICMjIyBSZWZlcmVuY2VcbioqL1xuXG52YXIgYWN0aXZlID0gW107XG52YXIgdW5sZWFzaExpc3RlbmVycyA9IFtdO1xudmFyIHRhcmdldHMgPSBbIGNvbnNvbGUgXTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyKG5hbWUpXG5cbiAgQ3JlYXRlIGEgbmV3IGxvZ2dpbmcgaW5zdGFuY2UuXG4qKi9cbnZhciBsb2dnZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgLy8gaW5pdGlhbCBlbmFibGVkIGNoZWNrXG4gIHZhciBlbmFibGVkID0gY2hlY2tBY3RpdmUoKTtcblxuICBmdW5jdGlvbiBjaGVja0FjdGl2ZSgpIHtcbiAgICByZXR1cm4gZW5hYmxlZCA9IGFjdGl2ZS5pbmRleE9mKCcqJykgPj0gMCB8fCBhY3RpdmUuaW5kZXhPZihuYW1lKSA+PSAwO1xuICB9XG5cbiAgLy8gcmVnaXN0ZXIgdGhlIGNoZWNrIGFjdGl2ZSB3aXRoIHRoZSBsaXN0ZW5lcnMgYXJyYXlcbiAgdW5sZWFzaExpc3RlbmVyc1t1bmxlYXNoTGlzdGVuZXJzLmxlbmd0aF0gPSBjaGVja0FjdGl2ZTtcblxuICAvLyByZXR1cm4gdGhlIGFjdHVhbCBsb2dnaW5nIGZ1bmN0aW9uXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzdHJpbmcgbWVzc2FnZVxuICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PSAnc3RyaW5nJyB8fCAoYXJnc1swXSBpbnN0YW5jZW9mIFN0cmluZykpIHtcbiAgICAgIGFyZ3NbMF0gPSBuYW1lICsgJzogJyArIGFyZ3NbMF07XG4gICAgfVxuXG4gICAgLy8gaWYgbm90IGVuYWJsZWQsIGJhaWxcbiAgICBpZiAoISBlbmFibGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gbG9nXG4gICAgdGFyZ2V0cy5mb3JFYWNoKGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgdGFyZ2V0LmxvZy5hcHBseSh0YXJnZXQsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnJlc2V0KClcblxuICBSZXNldCBsb2dnaW5nIChyZW1vdmUgdGhlIGRlZmF1bHQgY29uc29sZSBsb2dnZXIsIGZsYWcgYWxsIGxvZ2dlcnMgYXNcbiAgaW5hY3RpdmUsIGV0YywgZXRjLlxuKiovXG5sb2dnZXIucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgLy8gcmVzZXQgdGFyZ2V0cyBhbmQgYWN0aXZlIHN0YXRlc1xuICB0YXJnZXRzID0gW107XG4gIGFjdGl2ZSA9IFtdO1xuXG4gIHJldHVybiBsb2dnZXIuZW5hYmxlKCk7XG59O1xuXG4vKipcbiAgIyMjIyBsb2dnZXIudG8odGFyZ2V0KVxuXG4gIEFkZCBhIGxvZ2dpbmcgdGFyZ2V0LiAgVGhlIGxvZ2dlciBtdXN0IGhhdmUgYSBgbG9nYCBtZXRob2QgYXR0YWNoZWQuXG5cbioqL1xubG9nZ2VyLnRvID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIHRhcmdldHMgPSB0YXJnZXRzLmNvbmNhdCh0YXJnZXQgfHwgW10pO1xuXG4gIHJldHVybiBsb2dnZXI7XG59O1xuXG4vKipcbiAgIyMjIyBsb2dnZXIuZW5hYmxlKG5hbWVzKilcblxuICBFbmFibGUgbG9nZ2luZyB2aWEgdGhlIG5hbWVkIGxvZ2dpbmcgaW5zdGFuY2VzLiAgVG8gZW5hYmxlIGxvZ2dpbmcgdmlhIGFsbFxuICBpbnN0YW5jZXMsIHlvdSBjYW4gcGFzcyBhIHdpbGRjYXJkOlxuXG4gIGBgYGpzXG4gIGxvZ2dlci5lbmFibGUoJyonKTtcbiAgYGBgXG5cbiAgX19UT0RPOl9fIHdpbGRjYXJkIGVuYWJsZXJzXG4qKi9cbmxvZ2dlci5lbmFibGUgPSBmdW5jdGlvbigpIHtcbiAgLy8gdXBkYXRlIHRoZSBhY3RpdmVcbiAgYWN0aXZlID0gYWN0aXZlLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXG4gIC8vIHRyaWdnZXIgdGhlIHVubGVhc2ggbGlzdGVuZXJzXG4gIHVubGVhc2hMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgIGxpc3RlbmVyKCk7XG4gIH0pO1xuXG4gIHJldHVybiBsb2dnZXI7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyBjb2cvdGhyb3R0bGVcblxuICBgYGBqc1xuICB2YXIgdGhyb3R0bGUgPSByZXF1aXJlKCdjb2cvdGhyb3R0bGUnKTtcbiAgYGBgXG5cbiAgIyMjIHRocm90dGxlKGZuLCBkZWxheSwgb3B0cylcblxuICBBIGNoZXJyeS1waWNrYWJsZSB0aHJvdHRsZSBmdW5jdGlvbi4gIFVzZWQgdG8gdGhyb3R0bGUgYGZuYCB0byBlbnN1cmVcbiAgdGhhdCBpdCBjYW4gYmUgY2FsbGVkIGF0IG1vc3Qgb25jZSBldmVyeSBgZGVsYXlgIG1pbGxpc2Vjb25kcy4gIFdpbGxcbiAgZmlyZSBmaXJzdCBldmVudCBpbW1lZGlhdGVseSwgZW5zdXJpbmcgdGhlIG5leHQgZXZlbnQgZmlyZWQgd2lsbCBvY2N1clxuICBhdCBsZWFzdCBgZGVsYXlgIG1pbGxpc2Vjb25kcyBhZnRlciB0aGUgZmlyc3QsIGFuZCBzbyBvbi5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuLCBkZWxheSwgb3B0cykge1xuICB2YXIgbGFzdEV4ZWMgPSAob3B0cyB8fCB7fSkubGVhZGluZyAhPT0gZmFsc2UgPyAwIDogRGF0ZS5ub3coKTtcbiAgdmFyIHRyYWlsaW5nID0gKG9wdHMgfHwge30pLnRyYWlsaW5nO1xuICB2YXIgdGltZXI7XG4gIHZhciBxdWV1ZWRBcmdzO1xuICB2YXIgcXVldWVkU2NvcGU7XG5cbiAgLy8gdHJhaWxpbmcgZGVmYXVsdHMgdG8gdHJ1ZVxuICB0cmFpbGluZyA9IHRyYWlsaW5nIHx8IHRyYWlsaW5nID09PSB1bmRlZmluZWQ7XG4gIFxuICBmdW5jdGlvbiBpbnZva2VEZWZlcmVkKCkge1xuICAgIGZuLmFwcGx5KHF1ZXVlZFNjb3BlLCBxdWV1ZWRBcmdzIHx8IFtdKTtcbiAgICBsYXN0RXhlYyA9IERhdGUubm93KCk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRpY2sgPSBEYXRlLm5vdygpO1xuICAgIHZhciBlbGFwc2VkID0gdGljayAtIGxhc3RFeGVjO1xuXG4gICAgLy8gYWx3YXlzIGNsZWFyIHRoZSBkZWZlcmVkIHRpbWVyXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcblxuICAgIGlmIChlbGFwc2VkIDwgZGVsYXkpIHtcbiAgICAgIHF1ZXVlZEFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICBxdWV1ZWRTY29wZSA9IHRoaXM7XG5cbiAgICAgIHJldHVybiB0cmFpbGluZyAmJiAodGltZXIgPSBzZXRUaW1lb3V0KGludm9rZURlZmVyZWQsIGRlbGF5IC0gZWxhcHNlZCkpO1xuICAgIH1cblxuICAgIC8vIGNhbGwgdGhlIGZ1bmN0aW9uXG4gICAgbGFzdEV4ZWMgPSB0aWNrO1xuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59OyIsIi8vQ29weXJpZ2h0IChDKSAyMDEyIEtvcnkgTnVublxyXG5cclxuLy9QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxyXG5cclxuLy9UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cclxuXHJcbi8vVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXHJcblxyXG4vKlxyXG5cclxuICAgIFRoaXMgY29kZSBpcyBub3QgZm9ybWF0dGVkIGZvciByZWFkYWJpbGl0eSwgYnV0IHJhdGhlciBydW4tc3BlZWQgYW5kIHRvIGFzc2lzdCBjb21waWxlcnMuXHJcblxyXG4gICAgSG93ZXZlciwgdGhlIGNvZGUncyBpbnRlbnRpb24gc2hvdWxkIGJlIHRyYW5zcGFyZW50LlxyXG5cclxuICAgICoqKiBJRSBTVVBQT1JUICoqKlxyXG5cclxuICAgIElmIHlvdSByZXF1aXJlIHRoaXMgbGlicmFyeSB0byB3b3JrIGluIElFNywgYWRkIHRoZSBmb2xsb3dpbmcgYWZ0ZXIgZGVjbGFyaW5nIGNyZWwuXHJcblxyXG4gICAgdmFyIHRlc3REaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcclxuICAgICAgICB0ZXN0TGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xyXG5cclxuICAgIHRlc3REaXYuc2V0QXR0cmlidXRlKCdjbGFzcycsICdhJyk7XHJcbiAgICB0ZXN0RGl2WydjbGFzc05hbWUnXSAhPT0gJ2EnID8gY3JlbC5hdHRyTWFwWydjbGFzcyddID0gJ2NsYXNzTmFtZSc6dW5kZWZpbmVkO1xyXG4gICAgdGVzdERpdi5zZXRBdHRyaWJ1dGUoJ25hbWUnLCdhJyk7XHJcbiAgICB0ZXN0RGl2WyduYW1lJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnbmFtZSddID0gZnVuY3Rpb24oZWxlbWVudCwgdmFsdWUpe1xyXG4gICAgICAgIGVsZW1lbnQuaWQgPSB2YWx1ZTtcclxuICAgIH06dW5kZWZpbmVkO1xyXG5cclxuXHJcbiAgICB0ZXN0TGFiZWwuc2V0QXR0cmlidXRlKCdmb3InLCAnYScpO1xyXG4gICAgdGVzdExhYmVsWydodG1sRm9yJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnZm9yJ10gPSAnaHRtbEZvcic6dW5kZWZpbmVkO1xyXG5cclxuXHJcblxyXG4qL1xyXG5cclxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShmYWN0b3J5KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcm9vdC5jcmVsID0gZmFjdG9yeSgpO1xyXG4gICAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIGJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzg0Mjg2L2phdmFzY3JpcHQtaXNkb20taG93LWRvLXlvdS1jaGVjay1pZi1hLWphdmFzY3JpcHQtb2JqZWN0LWlzLWEtZG9tLW9iamVjdFxyXG4gICAgdmFyIGlzTm9kZSA9IHR5cGVvZiBOb2RlID09PSAnZnVuY3Rpb24nXHJcbiAgICAgICAgPyBmdW5jdGlvbiAob2JqZWN0KSB7IHJldHVybiBvYmplY3QgaW5zdGFuY2VvZiBOb2RlOyB9XHJcbiAgICAgICAgOiBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmplY3RcclxuICAgICAgICAgICAgICAgICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnXHJcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2Ygb2JqZWN0Lm5vZGVUeXBlID09PSAnbnVtYmVyJ1xyXG4gICAgICAgICAgICAgICAgJiYgdHlwZW9mIG9iamVjdC5ub2RlTmFtZSA9PT0gJ3N0cmluZyc7XHJcbiAgICAgICAgfTtcclxuICAgIHZhciBpc0FycmF5ID0gZnVuY3Rpb24oYSl7IHJldHVybiBhIGluc3RhbmNlb2YgQXJyYXk7IH07XHJcbiAgICB2YXIgYXBwZW5kQ2hpbGQgPSBmdW5jdGlvbihlbGVtZW50LCBjaGlsZCkge1xyXG4gICAgICBpZighaXNOb2RlKGNoaWxkKSl7XHJcbiAgICAgICAgICBjaGlsZCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNoaWxkKTtcclxuICAgICAgfVxyXG4gICAgICBlbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcclxuICAgIH07XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGNyZWwoKXtcclxuICAgICAgICB2YXIgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQsXHJcbiAgICAgICAgICAgIGFyZ3MgPSBhcmd1bWVudHMsIC8vTm90ZTogYXNzaWduZWQgdG8gYSB2YXJpYWJsZSB0byBhc3Npc3QgY29tcGlsZXJzLiBTYXZlcyBhYm91dCA0MCBieXRlcyBpbiBjbG9zdXJlIGNvbXBpbGVyLiBIYXMgbmVnbGlnYWJsZSBlZmZlY3Qgb24gcGVyZm9ybWFuY2UuXHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBhcmdzWzBdLFxyXG4gICAgICAgICAgICBjaGlsZCxcclxuICAgICAgICAgICAgc2V0dGluZ3MgPSBhcmdzWzFdLFxyXG4gICAgICAgICAgICBjaGlsZEluZGV4ID0gMixcclxuICAgICAgICAgICAgYXJndW1lbnRzTGVuZ3RoID0gYXJncy5sZW5ndGgsXHJcbiAgICAgICAgICAgIGF0dHJpYnV0ZU1hcCA9IGNyZWwuYXR0ck1hcDtcclxuXHJcbiAgICAgICAgZWxlbWVudCA9IGlzTm9kZShlbGVtZW50KSA/IGVsZW1lbnQgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsZW1lbnQpO1xyXG4gICAgICAgIC8vIHNob3J0Y3V0XHJcbiAgICAgICAgaWYoYXJndW1lbnRzTGVuZ3RoID09PSAxKXtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0eXBlb2Ygc2V0dGluZ3MgIT09ICdvYmplY3QnIHx8IGlzTm9kZShzZXR0aW5ncykgfHwgaXNBcnJheShzZXR0aW5ncykpIHtcclxuICAgICAgICAgICAgLS1jaGlsZEluZGV4O1xyXG4gICAgICAgICAgICBzZXR0aW5ncyA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzaG9ydGN1dCBpZiB0aGVyZSBpcyBvbmx5IG9uZSBjaGlsZCB0aGF0IGlzIGEgc3RyaW5nXHJcbiAgICAgICAgaWYoKGFyZ3VtZW50c0xlbmd0aCAtIGNoaWxkSW5kZXgpID09PSAxICYmIHR5cGVvZiBhcmdzW2NoaWxkSW5kZXhdID09PSAnc3RyaW5nJyAmJiBlbGVtZW50LnRleHRDb250ZW50ICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICBlbGVtZW50LnRleHRDb250ZW50ID0gYXJnc1tjaGlsZEluZGV4XTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgZm9yKDsgY2hpbGRJbmRleCA8IGFyZ3VtZW50c0xlbmd0aDsgKytjaGlsZEluZGV4KXtcclxuICAgICAgICAgICAgICAgIGNoaWxkID0gYXJnc1tjaGlsZEluZGV4XTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihjaGlsZCA9PSBudWxsKXtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaXNBcnJheShjaGlsZCkpIHtcclxuICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgY2hpbGQubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICBhcHBlbmRDaGlsZChlbGVtZW50LCBjaGlsZFtpXSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIGFwcGVuZENoaWxkKGVsZW1lbnQsIGNoaWxkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gc2V0dGluZ3Mpe1xyXG4gICAgICAgICAgICBpZighYXR0cmlidXRlTWFwW2tleV0pe1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoa2V5LCBzZXR0aW5nc1trZXldKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IGNyZWwuYXR0ck1hcFtrZXldO1xyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGF0dHIgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dHIoZWxlbWVudCwgc2V0dGluZ3Nba2V5XSk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyLCBzZXR0aW5nc1trZXldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVXNlZCBmb3IgbWFwcGluZyBvbmUga2luZCBvZiBhdHRyaWJ1dGUgdG8gdGhlIHN1cHBvcnRlZCB2ZXJzaW9uIG9mIHRoYXQgaW4gYmFkIGJyb3dzZXJzLlxyXG4gICAgLy8gU3RyaW5nIHJlZmVyZW5jZWQgc28gdGhhdCBjb21waWxlcnMgbWFpbnRhaW4gdGhlIHByb3BlcnR5IG5hbWUuXHJcbiAgICBjcmVsWydhdHRyTWFwJ10gPSB7fTtcclxuXHJcbiAgICAvLyBTdHJpbmcgcmVmZXJlbmNlZCBzbyB0aGF0IGNvbXBpbGVycyBtYWludGFpbiB0aGUgcHJvcGVydHkgbmFtZS5cclxuICAgIGNyZWxbXCJpc05vZGVcIl0gPSBpc05vZGU7XHJcblxyXG4gICAgcmV0dXJuIGNyZWw7XHJcbn0pKTtcclxuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIHJlU2VwYXJhdG9yID0gL1tcXCxcXHNdXFxzKi87XG52YXIgb2ZmRmxhZ3MgPSBbJ2ZhbHNlJywgJ25vbmUnLCAnb2ZmJ107XG5cblxuLyoqXG4gICMgcnRjLWNhcHR1cmVjb25maWdcblxuICBUaGlzIGlzIGEgc2ltcGxlIHBhcnNlciB0aGF0IHRha2VzIGEgc3RyaW5nIG9mIHRleHQgYW5kIGRldGVybWluZXMgd2hhdFxuICB0aGF0IG1lYW5zIGluIHRoZSBjb250ZXh0IG9mIFdlYlJUQy5cblxuICAjIyBXaHk/XG5cbiAgSXQgcHJvdmlkZXMgYSBzaW1wbGUsIHRleHR1YWwgd2F5IG9mIGRlc2NyaWJpbmcgeW91ciByZXF1aXJlbWVudHMgZm9yXG4gIG1lZGlhIGNhcHR1cmUuICBUcnlpbmcgdG8gcmVtZW1iZXIgdGhlIHN0cnVjdHVyZSBvZiB0aGUgY29uc3RyYWludHMgb2JqZWN0XG4gIGlzIHBhaW5mdWwuXG5cbiAgIyMgSG93XG5cbiAgQSBzaW1wbGUgdGV4dCBzdHJpbmcgaXMgY29udmVydGVkIHRvIGFuIGludGVybWVkaWF0ZSBKUyBvYmplY3RcbiAgcmVwcmVzZW50YXRpb24sIHdoaWNoIGNhbiB0aGVuIGJlIGNvbnZlcnRlZCB0byBhIGdldFVzZXJNZWRpYSBjb25zdHJhaW50c1xuICBkYXRhIHN0cnVjdHVyZSB1c2luZyBhIGB0b0NvbnN0cmFpbnRzKClgIGNhbGwuXG5cbiAgRm9yIGV4YW1wbGUsIHRoZSBmb2xsb3dpbmcgdGV4dCBpbnB1dDpcblxuICBgYGBcbiAgY2FtZXJhIG1pbjoxMjgweDcyMCBtYXg6MTI4MHg3MjAgbWluOjE1ZnBzIG1heDoyNWZwc1xuICBgYGBcblxuICBJcyBjb252ZXJ0ZWQgaW50byBhbiBpbnRlcm1lZGlhIHJlcHJlc2VudGF0aW9uICh2aWEgdGhlIGBDYXB0dXJlQ29uZmlnYFxuICB1dGlsaXR5IGNsYXNzKSB0aGF0IGxvb2tzIGxpa2UgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqc1xuICB7XG4gICAgY2FtZXJhOiAwLFxuICAgIG1pY3JvcGhvbmU6IDAsXG4gICAgcmVzOiB7XG4gICAgICBtaW46IHsgdzogMTI4MCwgaDogNzIwIH0sXG4gICAgICBtYXg6IHsgdzogMTI4MCwgaDogNzIwIH1cbiAgICB9LFxuXG4gICAgZnBzOiB7XG4gICAgICBtaW46IDE1LFxuICAgICAgbWF4OiAyNVxuICAgIH1cbiAgfVxuICBgYGBcblxuICBXaGljaCBpbiB0dXJuIGlzIGNvbnZlcnRlZCBpbnRvIHRoZSBmb2xsb3dpbmcgbWVkaWEgY29uc3RyYWludHMgZm9yXG4gIGEgZ2V0VXNlck1lZGlhIGNhbGw6XG5cbiAgYGBganNcbiAge1xuICAgIGF1ZGlvOiB0cnVlLFxuICAgIHZpZGVvOiB7XG4gICAgICBtYW5kYXRvcnk6IHtcbiAgICAgICAgbWluRnJhbWVSYXRlOiAxNSxcbiAgICAgICAgbWF4RnJhbWVSYXRlOiAyNSxcblxuICAgICAgICBtaW5XaWR0aDogMTI4MCxcbiAgICAgICAgbWluSGVpZ2h0OiA3MjAsXG4gICAgICAgIG1heFdpZHRoOiAxMjgwLFxuICAgICAgICBtYXhIZWlnaHQ6IDcyMFxuICAgICAgfSxcblxuICAgICAgb3B0aW9uYWw6IFtdXG4gICAgfVxuICB9XG4gIGBgYFxuXG4gICMjIyBFeHBlcmltZW50YWw6IFRhcmdldGVkIERldmljZSBDYXB0dXJlXG5cbiAgV2hpbGUgdGhlIGBydGMtY2FwdHVyZWNvbmZpZ2AgbW9kdWxlIGl0c2VsZiBkb2Vzbid0IGNvbnRhaW4gYW55IG1lZGlhXG4gIGlkZW50aWZpY2F0aW9uIGxvZ2ljLCBpdCBpcyBhYmxlIHRvIHRoZSBzb3VyY2VzIGluZm9ybWF0aW9uIGZyb20gYVxuICBgTWVkaWFTdHJlYW1UcmFjay5nZXRTb3VyY2VzYCBjYWxsIHRvIGdlbmVyYXRlIGRldmljZSB0YXJnZXRlZCBjb25zdHJhaW50cy5cblxuICBGb3IgaW5zdGFuY2UsIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSBkZW1vbnN0cmF0ZXMgaG93IHdlIGNhbiByZXF1ZXN0XG4gIGBjYW1lcmE6MWAgKHRoZSAybmQgdmlkZW8gZGV2aWNlIG9uIG91ciBsb2NhbCBtYWNoaW5lKSB3aGVuIHdlIGFyZSBtYWtpbmdcbiAgYSBnZXRVc2VyTWVkaWEgY2FsbDpcblxuICA8PDwgZXhhbXBsZXMvY2FtZXJhLXR3by5qc1xuXG4gIEl0J3Mgd29ydGggbm90aW5nIHRoYXQgaWYgdGhlIHJlcXVlc3RlZCBkZXZpY2UgZG9lcyBub3QgZXhpc3Qgb24gdGhlXG4gIG1hY2hpbmUgKGluIHRoZSBjYXNlIGFib3ZlLCBpZiB5b3VyIG1hY2hpbmUgb25seSBoYXMgYSBzaW5nbGUgd2ViY2FtIC0gYXNcbiAgaXMgY29tbW9uKSB0aGVuIG5vIGRldmljZSBzZWxlY3Rpb24gY29uc3RyYWludHMgd2lsbCBiZSBnZW5lcmF0ZWQgKGkuZS5cbiAgdGhlIHN0YW5kYXJkIGB7IHZpZGVvOiB0cnVlLCBhdWRpbzogdHJ1ZSB9YCBjb25zdHJhaW50cyB3aWxsIGJlIHJldHVybmVkXG4gIGZyb20gdGhlIGB0b0NvbnN0cmFpbnRzYCBjYWxsKS5cblxuICAjIyMgRXhwZXJpbWVudGFsOiBTY3JlZW4gQ2FwdHVyZVxuXG4gIElmIHlvdSBhcmUgd29ya2luZyB3aXRoIGNocm9tZSBhbmQgc2VydmluZyBjb250ZW50IG9mIGEgSFRUUFMgY29ubmVjdGlvbixcbiAgdGhlbiB5b3Ugd2lsbCBiZSBhYmxlIHRvIGV4cGVyaW1lbnQgd2l0aCBleHBlcmltZW50YWwgZ2V0VXNlck1lZGlhIHNjcmVlblxuICBjYXB0dXJlLlxuXG4gIEluIHRoZSBzaW1wbGVzdCBjYXNlLCBzY3JlZW4gY2FwdHVyZSBjYW4gYmUgaW52b2tlZCBieSB1c2luZyB0aGUgY2FwdHVyZVxuICBzdHJpbmcgb2Y6XG5cbiAgYGBgXG4gIHNjcmVlblxuICBgYGBcblxuICBXaGljaCBnZW5lcmF0ZXMgdGhlIGZvbGxvd2luZyBjb250cmFpbnRzOlxuXG4gIGBgYGpzXG4gIHtcbiAgICBhdWRpbzogZmFsc2UsXG4gICAgdmlkZW86IHtcbiAgICAgIG1hbmRhdG9yeToge1xuICAgICAgICBjaHJvbWVNZWRpYVNvdXJjZTogJ3NjcmVlbidcbiAgICAgIH0sXG5cbiAgICAgIG9wdGlvbmFsOiBbXVxuICAgIH1cbiAgfVxuICBgYGBcblxuICAjIyBSZWZlcmVuY2VcblxuKiovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgLy8gY3JlYXRlIGEgbmV3IGNvbmZpZ3VyYXRpb24gb2JqZWN0IHVzaW5nIGRlZmF1bHRzXG4gIHZhciBjb25maWcgPSBuZXcgQ2FwdHVyZUNvbmZpZygpO1xuXG4gIC8vIHByb2Nlc3MgZWFjaCBvZiB0aGUgZGlyZWN0aXZlc1xuICAoaW5wdXQgfHwgJycpLnNwbGl0KHJlU2VwYXJhdG9yKS5mb3JFYWNoKGZ1bmN0aW9uKGRpcmVjdGl2ZSkge1xuICAgIC8vIG5vdyBmdXJ0aGVyIHNwbGl0IHRoZSBkaXJlY3RpdmUgb24gdGhlIDogY2hhcmFjdGVyXG4gICAgdmFyIHBhcnRzID0gZGlyZWN0aXZlLnNwbGl0KCc6Jyk7XG4gICAgdmFyIG1ldGhvZCA9IGNvbmZpZ1socGFydHNbMF0gfHwgJycpLnRvTG93ZXJDYXNlKCldO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSB0aGUgbWV0aG9kIGFwcGx5XG4gICAgaWYgKHR5cGVvZiBtZXRob2QgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgbWV0aG9kLmFwcGx5KGNvbmZpZywgcGFydHMuc2xpY2UoMSkpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGNvbmZpZztcbn07XG5cbi8qKlxuICAjIyMgQ2FwdHVyZUNvbmZpZ1xuXG4gIFRoaXMgaXMgYSB1dGlsaXR5IGNsYXNzIHRoYXQgaXMgdXNlZCB0byB1cGRhdGUgY2FwdHVyZSBjb25maWd1cmF0aW9uXG4gIGRldGFpbHMgYW5kIGlzIGFibGUgdG8gZ2VuZXJhdGUgc3VpdGFibGUgZ2V0VXNlck1lZGlhIGNvbnN0cmFpbnRzIGJhc2VkXG4gIG9uIHRoZSBjb25maWd1cmF0aW9uLlxuXG4qKi9cbmZ1bmN0aW9uIENhcHR1cmVDb25maWcoKSB7XG4gIGlmICghICh0aGlzIGluc3RhbmNlb2YgQ2FwdHVyZUNvbmZpZykpIHtcbiAgICByZXR1cm4gbmV3IENhcHR1cmVDb25maWcoKTtcbiAgfVxuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGJhc2UgY29uZmlnXG4gIHRoaXMuY2ZnID0ge1xuICAgIG1pY3JvcGhvbmU6IHRydWVcbiAgfTtcbn1cblxudmFyIHByb3QgPSBDYXB0dXJlQ29uZmlnLnByb3RvdHlwZTtcblxuLyoqXG4gICMjIyMgY2FtZXJhKGluZGV4KVxuXG4gIFVwZGF0ZSB0aGUgY2FtZXJhIGNvbmZpZ3VyYXRpb24gdG8gdGhlIHNwZWNpZmllZCBpbmRleFxuKiovXG5wcm90LmNhbWVyYSA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gIHRoaXMuY2ZnLmNhbWVyYSA9IHRydWVPclZhbHVlKGluZGV4KTtcbn07XG5cbi8qKlxuICAjIyMjIG1pY3JvcGhvbmUoaW5kZXgpXG5cbiAgVXBkYXRlIHRoZSBtaWNyb3Bob25lIGNvbmZpZ3VyYXRpb24gdG8gdGhlIHNwZWNpZmllZCBpbmRleFxuKiovXG5wcm90Lm1pY3JvcGhvbmUgPSBmdW5jdGlvbihpbmRleCkge1xuICB0aGlzLmNmZy5taWNyb3Bob25lID0gdHJ1ZU9yVmFsdWUoaW5kZXgpO1xufTtcblxuLyoqXG4gICMjIyMgc2NyZWVuKHRhcmdldClcblxuICBTcGVjaWZ5IHRoYXQgd2Ugd291bGQgbGlrZSB0byBjYXB0dXJlIHRoZSBzY3JlZW5cbioqL1xucHJvdC5zY3JlZW4gPSBmdW5jdGlvbigpIHtcbiAgLy8gdW5zZXQgdGhlIG1pY3JvcGhvbmUgY29uZmlnXG4gIGRlbGV0ZSB0aGlzLmNmZy5taWNyb3Bob25lO1xuXG4gIC8vIHNldCB0aGUgc2NyZWVuIGNvbmZpZ3VyYXRpb25cbiAgdGhpcy5jZmcuc2NyZWVuID0gdHJ1ZTtcbn07XG5cbi8qKlxuICAjIyMjIG1heChkYXRhKVxuXG4gIFVwZGF0ZSBhIG1heGltdW0gY29uc3RyYWludC4gIElmIGFuIGZwcyBjb25zdHJhaW50IHRoaXMgd2lsbCBiZSBkaXJlY3RlZFxuICB0byB0aGUgYG1heGZwc2AgbW9kaWZpZXIuXG5cbioqL1xucHJvdC5tYXggPSBmdW5jdGlvbihkYXRhKSB7XG4gIHZhciByZXM7XG5cbiAgLy8gaWYgdGhpcyBpcyBhbiBmcHMgc3BlY2lmaWNhdGlvbiBwYXJzZVxuICBpZiAoZGF0YS5zbGljZSgtMykudG9Mb3dlckNhc2UoKSA9PSAnZnBzJykge1xuICAgIHJldHVybiB0aGlzLm1heGZwcyhkYXRhKTtcbiAgfVxuXG4gIC8vIHBhcnNlIHRoZSByZXNvbHV0aW9uXG4gIHJlcyA9IHRoaXMuX3BhcnNlUmVzKGRhdGEpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGZwcyBjb25maWcgc3R1ZmZcbiAgdGhpcy5jZmcucmVzID0gdGhpcy5jZmcucmVzIHx8IHt9O1xuICB0aGlzLmNmZy5yZXMubWF4ID0gcmVzO1xufTtcblxuLyoqXG4gICMjIyMgbWF4ZnBzKGRhdGEpXG5cbiAgVXBkYXRlIHRoZSBtYXhpbXVtIGZwc1xuKiovXG5wcm90Lm1heGZwcyA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gZW5zdXJlIHdlIGhhdmUgYW4gZnBzIGNvbXBvbmVudFxuICB0aGlzLmNmZy5mcHMgPSB0aGlzLmNmZy5mcHMgfHwge307XG5cbiAgLy8gc2V0IHRoZSBtYXggZnBzXG4gIHRoaXMuY2ZnLmZwcy5tYXggPSBwYXJzZUZsb2F0KGRhdGEuc2xpY2UoMCwgLTMpKTtcbn07XG5cbi8qKlxuICAjIyMjIG1pbihkYXRhKVxuXG4gIFVwZGF0ZSBhIG1pbmltdW0gY29uc3RyYWludC4gIFRoaXMgY2FuIGJlIGVpdGhlciByZWxhdGVkIHRvIHJlc29sdXRpb25cbiAgb3IgRlBTLlxuKiovXG5wcm90Lm1pbiA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgdmFyIHJlcztcblxuICAvLyBpZiB0aGlzIGlzIGFuIGZwcyBzcGVjaWZpY2F0aW9uIHBhcnNlXG4gIGlmIChkYXRhLnNsaWNlKC0zKS50b0xvd2VyQ2FzZSgpID09ICdmcHMnKSB7XG4gICAgcmV0dXJuIHRoaXMubWluZnBzKGRhdGEpO1xuICB9XG5cbiAgLy8gcGFyc2UgdGhlIHJlc29sdXRpb25cbiAgcmVzID0gdGhpcy5fcGFyc2VSZXMoZGF0YSk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgZnBzIGNvbmZpZyBzdHVmZlxuICB0aGlzLmNmZy5yZXMgPSB0aGlzLmNmZy5yZXMgfHwge307XG5cbiAgLy8gYWRkIHRoZSBtaW5cbiAgdGhpcy5jZmcucmVzLm1pbiA9IHJlcztcbn07XG5cbi8qKlxuICAjIyMjIG1pbmZwcyhkYXRhKVxuXG4gIFVwZGF0ZSB0aGUgbWluaW11bSBmcHNcbioqL1xucHJvdC5taW5mcHMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGFuIGZwcyBjb21wb25lbnRcbiAgdGhpcy5jZmcuZnBzID0gdGhpcy5jZmcuZnBzIHx8IHt9O1xuXG4gIC8vIHNldCB0aGUgbWF4IGZwc1xuICB0aGlzLmNmZy5mcHMubWluID0gcGFyc2VGbG9hdChkYXRhLnNsaWNlKDAsIC0zKSk7XG59O1xuXG5wcm90LmhkID0gcHJvdFsnNzIwcCddID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuY2ZnLmNhbWVyYSA9IHRydWU7XG4gIHRoaXMubWluKCcxMjgweDcyMCcpO1xufTtcblxucHJvdC5mdWxsaGQgPSBwcm90WycxMDgwcCddID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuY2ZnLmNhbWVyYSA9IHRydWU7XG4gIHRoaXMubWluKCcxOTIweDEwODAnKTtcbn07XG5cbi8qKlxuICAjIyMjIHRvQ29uc3RyYWludHMob3B0cz8pXG5cbiAgQ29udmVydCB0aGUgaW50ZXJuYWwgY29uZmlndXJhdGlvbiBvYmplY3QgdG8gYSB2YWxpZCBtZWRpYSBjb25zdHJhaW50c1xuICByZXByZXNlbnRhdGlvbi4gIEluIGNvbXBhdGlibGUgYnJvd3NlcnMgYSBsaXN0IG9mIG1lZGlhIHNvdXJjZXMgY2FuXG4gIGJlIHBhc3NlZCB0aHJvdWdoIGluIHRoZSBgb3B0cy5zb3VyY2VzYCB0byBjcmVhdGUgY29udHJhaW50cyB0aGF0IHdpbGxcbiAgdGFyZ2V0IGEgc3BlY2lmaWMgZGV2aWNlIHdoZW4gY2FwdHVyZWQuXG5cbiAgPDw8IGV4YW1wbGVzL2NhcHR1cmUtdGFyZ2V0cy5qc1xuXG4qKi9cbnByb3QudG9Db25zdHJhaW50cyA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgdmFyIGNmZyA9IHRoaXMuY2ZnO1xuICB2YXIgY29uc3RyYWludHMgPSB7XG4gICAgYXVkaW86IGNmZy5taWNyb3Bob25lID09PSB0cnVlIHx8XG4gICAgICAodHlwZW9mIGNmZy5taWNyb3Bob25lID09ICdudW1iZXInICYmIGNmZy5taWNyb3Bob25lID49IDApLFxuXG4gICAgdmlkZW86IGNmZy5jYW1lcmEgPT09IHRydWUgfHwgY2ZnLnNjcmVlbiB8fFxuICAgICAgKHR5cGVvZiBjZmcuY2FtZXJhID09ICdudW1iZXInICYmIGNmZy5jYW1lcmEgPj0gMClcbiAgfTtcblxuICAvLyBtYW5kYXRvcnkgY29uc3RyYWludHNcbiAgdmFyIG0gPSB7XG4gICAgdmlkZW86IHt9LFxuICAgIGF1ZGlvOiB7fVxuICB9O1xuXG4gIC8vIG9wdGlvbmFsIGNvbnN0cmFpbnRzXG4gIHZhciBvID0ge1xuICAgIHZpZGVvOiBbXSxcbiAgICBhdWRpbzogW11cbiAgfTtcblxuICB2YXIgc291cmNlcyA9IChvcHRzIHx8IHt9KS5zb3VyY2VzIHx8IFtdO1xuICB2YXIgY2FtZXJhcyA9IHNvdXJjZXMuZmlsdGVyKGZ1bmN0aW9uKGluZm8pIHtcbiAgICByZXR1cm4gaW5mbyAmJiBpbmZvLmtpbmQgPT09ICd2aWRlbyc7XG4gIH0pO1xuICB2YXIgbWljcm9waG9uZXMgPSBzb3VyY2VzLmZpbHRlcihmdW5jdGlvbihpbmZvKSB7XG4gICAgcmV0dXJuIGluZm8gJiYgaW5mby5raW5kID09PSAnYXVkaW8nO1xuICB9KTtcbiAgdmFyIHNlbGVjdGVkU291cmNlO1xuXG4gIGZ1bmN0aW9uIGNvbXBsZXhDb25zdHJhaW50cyh0YXJnZXQpIHtcbiAgICBpZiAoY29uc3RyYWludHNbdGFyZ2V0XSAmJiB0eXBlb2YgY29uc3RyYWludHNbdGFyZ2V0XSAhPSAnb2JqZWN0Jykge1xuICAgICAgY29uc3RyYWludHNbdGFyZ2V0XSA9IHtcbiAgICAgICAgbWFuZGF0b3J5OiBtW3RhcmdldF0sXG4gICAgICAgIG9wdGlvbmFsOiBvW3RhcmdldF1cbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLy8gZnBzXG4gIGlmIChjZmcuZnBzKSB7XG4gICAgY29tcGxleENvbnN0cmFpbnRzKCd2aWRlbycpO1xuICAgIGNmZy5mcHMubWluICYmIChtLnZpZGVvLm1pbkZyYW1lUmF0ZSA9IGNmZy5mcHMubWluKTtcbiAgICBjZmcuZnBzLm1heCAmJiAobS52aWRlby5tYXhGcmFtZVJhdGUgPSBjZmcuZnBzLm1heCk7XG4gIH1cblxuICAvLyBtaW4gcmVzIHNwZWNpZmllZFxuICBpZiAoY2ZnLnJlcyAmJiBjZmcucmVzLm1pbikge1xuICAgIGNvbXBsZXhDb25zdHJhaW50cygndmlkZW8nKTtcbiAgICBtLnZpZGVvLm1pbldpZHRoID0gY2ZnLnJlcy5taW4udztcbiAgICBtLnZpZGVvLm1pbkhlaWdodCA9IGNmZy5yZXMubWluLmg7XG4gIH1cblxuICAvLyBtYXggcmVzIHNwZWNpZmllZFxuICBpZiAoY2ZnLnJlcyAmJiBjZmcucmVzLm1heCkge1xuICAgIGNvbXBsZXhDb25zdHJhaW50cygndmlkZW8nKTtcbiAgICBtLnZpZGVvLm1heFdpZHRoID0gY2ZnLnJlcy5tYXgudztcbiAgICBtLnZpZGVvLm1heEhlaWdodCA9IGNmZy5yZXMubWF4Lmg7XG4gIH1cblxuICAvLyBpbnB1dCBjYW1lcmEgc2VsZWN0aW9uXG4gIGlmICh0eXBlb2YgY2ZnLmNhbWVyYSA9PSAnbnVtYmVyJyAmJiBjYW1lcmFzLmxlbmd0aCkge1xuICAgIHNlbGVjdGVkU291cmNlID0gY2FtZXJhc1tjZmcuY2FtZXJhXTtcblxuICAgIGlmIChzZWxlY3RlZFNvdXJjZSkge1xuICAgICAgY29tcGxleENvbnN0cmFpbnRzKCd2aWRlbycpO1xuICAgICAgby52aWRlby5wdXNoKHsgc291cmNlSWQ6IHNlbGVjdGVkU291cmNlLmlkIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlucHV0IG1pY3JvcGhvbmUgc2VsZWN0aW9uXG4gIGlmICh0eXBlb2YgY2ZnLm1pY3JvcGhvbmUgPT0gJ251bWJlcicgJiYgbWljcm9waG9uZXMubGVuZ3RoKSB7XG4gICAgc2VsZWN0ZWRTb3VyY2UgPSBtaWNyb3Bob25lc1tjZmcubWljcm9waG9uZV07XG5cbiAgICBpZiAoc2VsZWN0ZWRTb3VyY2UpIHtcbiAgICAgIGNvbXBsZXhDb25zdHJhaW50cygnYXVkaW8nKTtcbiAgICAgIG8uYXVkaW8ucHVzaCh7IHNvdXJjZUlkOiBzZWxlY3RlZFNvdXJjZS5pZCB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB3ZSBoYXZlIHNjcmVlbiBjb25zdHJhaW50cywgbWFrZSBtYWdpYyBoYXBwZW5cbiAgaWYgKHR5cGVvZiBjZmcuc2NyZWVuICE9ICd1bmRlZmluZWQnKSB7XG4gICAgY29tcGxleENvbnN0cmFpbnRzKCd2aWRlbycpO1xuICAgIG0udmlkZW8uY2hyb21lTWVkaWFTb3VyY2UgPSAnc2NyZWVuJztcbiAgfVxuXG4gIHJldHVybiBjb25zdHJhaW50cztcbn07XG5cbi8qKlxuICAjIyMgXCJJbnRlcm5hbFwiIG1ldGhvZHNcbioqL1xuXG4vKipcbiAgIyMjIyBfcGFyc2VSZXMoZGF0YSlcblxuICBQYXJzZSBhIHJlc29sdXRpb24gc3BlY2lmaWVyIChlLmcuIDEyODB4NzIwKSBpbnRvIGEgc2ltcGxlIEpTIG9iamVjdFxuICAoZS5nLiB7IHc6IDEyODAsIGg6IDcyMCB9KVxuKiovXG5wcm90Ll9wYXJzZVJlcyA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gc3BsaXQgdGhlIGRhdGEgb24gdGhlICd4JyBjaGFyYWN0ZXJcbiAgdmFyIHBhcnRzID0gZGF0YS5zcGxpdCgneCcpO1xuXG4gIC8vIGlmIHdlIGRvbid0IGhhdmUgdHdvIHBhcnRzLCB0aGVuIGNvbXBsYWluXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJlc29sdXRpb24gc3BlY2lmaWNhdGlvbjogJyArIGRhdGEpO1xuICB9XG5cbiAgLy8gcmV0dXJuIHRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9iamVjdFxuICByZXR1cm4ge1xuICAgIHc6IHBhcnNlSW50KHBhcnRzWzBdLCAxMCksXG4gICAgaDogcGFyc2VJbnQocGFydHNbMV0sIDEwKVxuICB9O1xufTtcblxuLyogaW50ZXJuYWwgaGVscGVyICovXG5cbmZ1bmN0aW9uIHRydWVPclZhbHVlKHZhbCkge1xuICBpZiAodHlwZW9mIHZhbCA9PSAnc3RyaW5nJyAmJiBvZmZGbGFncy5pbmRleE9mKHZhbC50b0xvd2VyQ2FzZSgpKSA+PSAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHZhbCA9PT0gdW5kZWZpbmVkIHx8IHZhbCA9PT0gJycgfHwgcGFyc2VJbnQodmFsIHx8IDAsIDEwKTtcbn1cbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgbmF2aWdhdG9yOiBmYWxzZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbi8qIGdsb2JhbCBkb2N1bWVudDogZmFsc2UgKi9cbi8qIGdsb2JhbCBNZWRpYVN0cmVhbTogZmFsc2UgKi9cbi8qIGdsb2JhbCBIVE1MVmlkZW9FbGVtZW50OiBmYWxzZSAqL1xuLyogZ2xvYmFsIEhUTUxBdWRpb0VsZW1lbnQ6IGZhbHNlICovXG5cbi8qKlxuICAjIHJ0Yy1tZWRpYVxuXG4gIFNpbXBsZSBbZ2V0VXNlck1lZGlhXShodHRwOi8vZGV2LnczLm9yZy8yMDExL3dlYnJ0Yy9lZGl0b3IvZ2V0dXNlcm1lZGlhLmh0bWwpXG4gIGNyb3NzLWJyb3dzZXIgd3JhcHBlcnMuICBQYXJ0IG9mIHRoZSBbcnRjLmlvXShodHRwOi8vcnRjLmlvLykgc3VpdGUsIHdoaWNoIGlzXG4gIHNwb25zb3JlZCBieSBbTklDVEFdKGh0dHA6Ly9vcGVubmljdGEuY29tKSBhbmQgcmVsZWFzZWQgdW5kZXIgYW5cbiAgW0FwYWNoZSAyLjAgbGljZW5zZV0oL0xJQ0VOU0UpLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBDYXB0dXJpbmcgbWVkaWEgb24geW91ciBtYWNoaW5lIGlzIGFzIHNpbXBsZSBhczpcblxuICBgYGBqc1xuICByZXF1aXJlKCdydGMtbWVkaWEnKSgpO1xuICBgYGBcblxuICBXaGlsZSB0aGlzIHdpbGwgaW4gZmFjdCBzdGFydCB0aGUgdXNlciBtZWRpYSBjYXB0dXJlIHByb2Nlc3MsIGl0IHdvbid0XG4gIGRvIGFueXRoaW5nIHdpdGggaXQuICBMZXRzIHRha2UgYSBsb29rIGF0IGEgbW9yZSByZWFsaXN0aWMgZXhhbXBsZTpcblxuICA8PDwgZXhhbXBsZXMvcmVuZGVyLXRvLWJvZHkuanNcblxuICBbcnVuIG9uIHJlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDg1NDUwKVxuXG4gIEluIHRoZSBjb2RlIGFib3ZlLCB3ZSBhcmUgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2Ugb2Ygb3VyIHVzZXJNZWRpYSB3cmFwcGVyXG4gIHVzaW5nIHRoZSBgbWVkaWEoKWAgY2FsbCBhbmQgdGhlbiB0ZWxsaW5nIGl0IHRvIHJlbmRlciB0byB0aGVcbiAgYGRvY3VtZW50LmJvZHlgIG9uY2UgdmlkZW8gc3RhcnRzIHN0cmVhbWluZy4gIFdlIGNhbiBmdXJ0aGVyIGV4cGFuZCB0aGVcbiAgY29kZSBvdXQgdG8gdGhlIGZvbGxvd2luZyB0byBhaWQgb3VyIHVuZGVyc3RhbmRpbmcgb2Ygd2hhdCBpcyBnb2luZyBvbjpcblxuICA8PDwgZXhhbXBsZXMvY2FwdHVyZS1leHBsaWNpdC5qc1xuXG4gIFRoZSBjb2RlIGFib3ZlIGlzIHdyaXR0ZW4gaW4gYSBtb3JlIHRyYWRpdGlvbmFsIEpTIHN0eWxlLCBidXQgZmVlbCBmcmVlXG4gIHRvIHVzZSB0aGUgZmlyc3Qgc3R5bGUgYXMgaXQncyBxdWl0ZSBzYWZlICh0aGFua3MgdG8gc29tZSBjaGVja3MgaW4gdGhlXG4gIGNvZGUpLlxuXG4gICMjIyBFdmVudHNcblxuICBPbmNlIGEgbWVkaWEgb2JqZWN0IGhhcyBiZWVuIGNyZWF0ZWQsIGl0IHdpbGwgcHJvdmlkZSBhIG51bWJlciBvZiBldmVudHNcbiAgdGhyb3VnaCB0aGUgc3RhbmRhcmQgbm9kZSBFdmVudEVtaXR0ZXIgQVBJLlxuXG4gICMjIyMgYGNhcHR1cmVgXG5cbiAgVGhlIGBjYXB0dXJlYCBldmVudCBpcyB0cmlnZ2VyZWQgb25jZSB0aGUgcmVxdWVzdGVkIG1lZGlhIHN0cmVhbSBoYXNcbiAgYmVlbiBjYXB0dXJlZCBieSB0aGUgYnJvd3Nlci5cblxuICA8PDwgZXhhbXBsZXMvY2FwdHVyZS1ldmVudC5qc1xuXG4gICMjIyMgYHJlbmRlcmBcblxuICBUaGUgYHJlbmRlcmAgZXZlbnQgaXMgdHJpZ2dlcmVkIG9uY2UgdGhlIHN0cmVhbSBoYXMgYmVlbiByZW5kZXJlZFxuICB0byB0aGUgYW55IHN1cHBsaWVkIChvciBjcmVhdGVkKSB2aWRlbyBlbGVtZW50cy5cblxuICBXaGlsZSBpdCBtaWdodCBzZWVtIGEgbGl0dGxlIGNvbmZ1c2luZyB0aGF0IHdoZW4gdGhlIGByZW5kZXJgIGV2ZW50XG4gIGZpcmVzIHRoYXQgaXQgcmV0dXJucyBhbiBhcnJheSBvZiBlbGVtZW50cyByYXRoZXIgdGhhbiBhIHNpbmdsZSBlbGVtZW50XG4gICh3aGljaCBpcyB3aGF0IGlzIHByb3ZpZGVkIHdoZW4gY2FsbGluZyB0aGUgYHJlbmRlcmAgbWV0aG9kKS5cblxuICBUaGlzIG9jY3VycyBiZWNhdXNlIGl0IGlzIGNvbXBsZXRlbHkgdmFsaWQgdG8gcmVuZGVyIGEgc2luZ2xlIGNhcHR1cmVkXG4gIG1lZGlhIHN0cmVhbSB0byBtdWx0aXBsZSBtZWRpYSBlbGVtZW50cyBvbiBhIHBhZ2UuICBUaGUgYHJlbmRlcmAgZXZlbnRcbiAgaXMgcmVwb3J0aW5nIG9uY2UgdGhlIHJlbmRlciBvcGVyYXRpb24gaGFzIGNvbXBsZXRlZCBmb3IgYWxsIHRhcmdldHMgdGhhdFxuICBoYXZlIGJlZW4gcmVnaXN0ZXJlZCB3aXRoIHRoZSBjYXB0dXJlIHN0cmVhbS5cblxuICAjIyBSZWZlcmVuY2VcblxuKiovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdydGMtbWVkaWEnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7XG52YXIgcGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMycpO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuLy8gbW9ua2V5IHBhdGNoIGdldFVzZXJNZWRpYSBmcm9tIHRoZSBwcmVmaXhlZCB2ZXJzaW9uXG5uYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxuICBkZXRlY3QuY2FsbChuYXZpZ2F0b3IsICdnZXRVc2VyTWVkaWEnKTtcblxuLy8gcGF0Y2ggd2luZG93IHVybFxud2luZG93LlVSTCA9IHdpbmRvdy5VUkwgfHwgZGV0ZWN0KCdVUkwnKTtcblxuLy8gcGF0Y2ggbWVkaWEgc3RyZWFtXG53aW5kb3cuTWVkaWFTdHJlYW0gPSBkZXRlY3QoJ01lZGlhU3RyZWFtJyk7XG5cbi8qKlxuICAjIyMgbWVkaWFcblxuICBgYGBcbiAgbWVkaWEob3B0cz8pXG4gIGBgYFxuXG4gIENhcHR1cmUgbWVkaWEgdXNpbmcgdGhlIHVuZGVybHlpbmdcbiAgW2dldFVzZXJNZWRpYV0oaHR0cDovL3d3dy53My5vcmcvVFIvbWVkaWFjYXB0dXJlLXN0cmVhbXMvKSBBUEkuXG5cbiAgVGhlIGZ1bmN0aW9uIGFjY2VwdHMgYSBzaW5nbGUgYXJndW1lbnQgd2hpY2ggY2FuIGJlIGVpdGhlciBiZTpcblxuICAtIGEuIEFuIG9wdGlvbnMgb2JqZWN0IChzZWUgYmVsb3cpLCBvcjtcbiAgLSBiLiBBbiBleGlzdGluZ1xuICAgIFtNZWRpYVN0cmVhbV0oaHR0cDovL3d3dy53My5vcmcvVFIvbWVkaWFjYXB0dXJlLXN0cmVhbXMvI21lZGlhc3RyZWFtKSB0aGF0XG4gICAgdGhlIG1lZGlhIG9iamVjdCB3aWxsIGJpbmQgdG8gYW5kIHByb3ZpZGUgeW91IHNvbWUgRE9NIGhlbHBlcnMgZm9yLlxuXG4gIFRoZSBmdW5jdGlvbiBzdXBwb3J0cyB0aGUgZm9sbG93aW5nIG9wdGlvbnM6XG5cbiAgLSBgY2FwdHVyZWAgLSBXaGV0aGVyIGNhcHR1cmUgc2hvdWxkIGJlIGluaXRpYXRlZCBhdXRvbWF0aWNhbGx5LiBEZWZhdWx0c1xuICAgIHRvIHRydWUsIGJ1dCB0b2dnbGVkIHRvIGZhbHNlIGF1dG9tYXRpY2FsbHkgaWYgYW4gZXhpc3Rpbmcgc3RyZWFtIGlzXG4gICAgcHJvdmlkZWQuXG5cbiAgLSBgbXV0ZWRgIC0gV2hldGhlciB0aGUgdmlkZW8gZWxlbWVudCBjcmVhdGVkIGZvciB0aGlzIHN0cmVhbSBzaG91bGQgYmVcbiAgICBtdXRlZC4gIERlZmF1bHQgaXMgdHJ1ZSBidXQgaXMgc2V0IHRvIGZhbHNlIHdoZW4gYW4gZXhpc3Rpbmcgc3RyZWFtIGlzXG4gICAgcGFzc2VkLlxuXG4gIC0gYGNvbnN0cmFpbnRzYCAtIFRoZSBjb25zdHJhaW50IG9wdGlvbiBhbGxvd3MgeW91IHRvIHNwZWNpZnkgcGFydGljdWxhclxuICAgIG1lZGlhIGNhcHR1cmUgY29uc3RyYWludHMgd2hpY2ggY2FuIGFsbG93IHlvdSBkbyBkbyBzb21lIHByZXR0eSBjb29sXG4gICAgdHJpY2tzLiAgQnkgZGVmYXVsdCwgdGhlIGNvbnRyYWludHMgdXNlZCB0byByZXF1ZXN0IHRoZSBtZWRpYSBhcmVcbiAgICBmYWlybHkgc3RhbmRhcmQgZGVmYXVsdHM6XG5cbiAgICBgYGBqc1xuICAgICAge1xuICAgICAgICB2aWRlbzoge1xuICAgICAgICAgIG1hbmRhdG9yeToge30sXG4gICAgICAgICAgb3B0aW9uYWw6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIGF1ZGlvOiB0cnVlXG4gICAgICB9XG4gICAgYGBgXG5cbioqL1xuZnVuY3Rpb24gTWVkaWEob3B0cykge1xuICB2YXIgbWVkaWEgPSB0aGlzO1xuXG4gIC8vIGNoZWNrIHRoZSBjb25zdHJ1Y3RvciBoYXMgYmVlbiBjYWxsZWRcbiAgaWYgKCEgKHRoaXMgaW5zdGFuY2VvZiBNZWRpYSkpIHtcbiAgICByZXR1cm4gbmV3IE1lZGlhKG9wdHMpO1xuICB9XG5cbiAgLy8gaW5oZXJpdGVkXG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXG4gIC8vIGlmIHRoZSBvcHRzIGlzIGEgbWVkaWEgc3RyZWFtIGluc3RhbmNlLCB0aGVuIGhhbmRsZSB0aGF0IGFwcHJvcHJpYXRlbHlcbiAgaWYgKG9wdHMgJiYgTWVkaWFTdHJlYW0gJiYgb3B0cyBpbnN0YW5jZW9mIE1lZGlhU3RyZWFtKSB7XG4gICAgb3B0cyA9IHtcbiAgICAgIHN0cmVhbTogb3B0c1xuICAgIH07XG4gIH1cblxuICAvLyBpZiB3ZSd2ZSBiZWVuIHBhc3NlZCBvcHRzIGFuZCB0aGV5IGxvb2sgbGlrZSBjb25zdHJhaW50cywgbW92ZSB0aGluZ3NcbiAgLy8gYXJvdW5kIGEgbGl0dGxlXG4gIGlmIChvcHRzICYmIChvcHRzLmF1ZGlvIHx8IG9wdHMudmlkZW8pKSB7XG4gICAgb3B0cyA9IHtcbiAgICAgIGNvbnN0cmFpbnRzOiBvcHRzXG4gICAgfTtcbiAgfVxuXG4gIC8vIGVuc3VyZSB3ZSBoYXZlIG9wdHNcbiAgb3B0cyA9IGV4dGVuZCh7fSwge1xuICAgIGNhcHR1cmU6ICghIG9wdHMpIHx8ICghIG9wdHMuc3RyZWFtKSxcbiAgICBtdXRlZDogKCEgb3B0cykgfHwgKCEgb3B0cy5zdHJlYW0pLFxuICAgIGNvbnN0cmFpbnRzOiB7XG4gICAgICB2aWRlbzoge1xuICAgICAgICBtYW5kYXRvcnk6IHt9LFxuICAgICAgICBvcHRpb25hbDogW11cbiAgICAgIH0sXG4gICAgICBhdWRpbzogdHJ1ZSxcblxuICAgICAgLy8gc3BlY2lmeSB0aGUgZmFrZSBmbGFnIGlmIHdlIGRldGVjdCB3ZSBhcmUgcnVubmluZyBpbiB0aGUgdGVzdFxuICAgICAgLy8gZW52aXJvbm1lbnQsIG9uIGNocm9tZSB0aGlzIHdpbGwgZG8gbm90aGluZyBidXQgaW4gZmlyZWZveCBpdCB3aWxsXG4gICAgICAvLyB1c2UgYSBmYWtlIHZpZGVvIGRldmljZVxuICAgICAgZmFrZTogdHlwZW9mIF9fdGVzdGxpbmdDb25zb2xlICE9ICd1bmRlZmluZWQnXG4gICAgfVxuICB9LCBvcHRzKTtcblxuICAvLyBzYXZlIHRoZSBjb25zdHJhaW50c1xuICB0aGlzLmNvbnN0cmFpbnRzID0gb3B0cy5jb25zdHJhaW50cztcblxuICAvLyBpZiBhIG5hbWUgaGFzIGJlZW4gc3BlY2lmaWVkIGluIHRoZSBvcHRzLCBzYXZlIGl0IHRvIHRoZSBtZWRpYVxuICB0aGlzLm5hbWUgPSBvcHRzLm5hbWU7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgc3RyZWFtIHRvIG51bGxcbiAgdGhpcy5zdHJlYW0gPSBvcHRzLnN0cmVhbSB8fCBudWxsO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIG11dGVkIHN0YXRlXG4gIHRoaXMubXV0ZWQgPSB0eXBlb2Ygb3B0cy5tdXRlZCA9PSAndW5kZWZpbmVkJyB8fCBvcHRzLm11dGVkO1xuXG4gIC8vIGNyZWF0ZSBhIGJpbmRpbmdzIGFycmF5IHNvIHdlIGhhdmUgYSByb3VnaCBpZGVhIG9mIHdoZXJlXG4gIC8vIHdlIGhhdmUgYmVlbiBhdHRhY2hlZCB0b1xuICAvLyBUT0RPOiByZXZpc2l0IHdoZXRoZXIgdGhpcyBpcyB0aGUgYmVzdCB3YXkgdG8gbWFuYWdlIHRoaXNcbiAgdGhpcy5fYmluZGluZ3MgPSBbXTtcblxuICAvLyBzZWUgaWYgd2UgYXJlIHVzaW5nIGEgcGx1Z2luXG4gIHRoaXMucGx1Z2luID0gcGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcbiAgaWYgKHRoaXMucGx1Z2luKSB7XG4gICAgLy8gaWYgd2UgYXJlIHVzaW5nIGEgcGx1Z2luLCBnaXZlIGl0IGFuIG9wcG9ydHVuaXR5IHRvIHBhdGNoIHRoZVxuICAgIC8vIG1lZGlhIGNhcHR1cmUgaW50ZXJmYWNlXG4gICAgbWVkaWEuX3BpbnN0ID0gdGhpcy5wbHVnaW4uaW5pdChvcHRzLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdpbml0aWFsaXphdGlvbiBjb21wbGV0ZScpO1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gbWVkaWEuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgfVxuXG4gICAgICBpZiAoKCEgb3B0cy5zdHJlYW0pICYmIG9wdHMuY2FwdHVyZSkge1xuICAgICAgICBtZWRpYS5jYXB0dXJlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgLy8gaWYgd2UgYXJlIGF1dG9zdGFydGluZywgY2FwdHVyZSBtZWRpYSBvbiB0aGUgbmV4dCB0aWNrXG4gIGVsc2UgaWYgKG9wdHMuY2FwdHVyZSkge1xuICAgIHNldFRpbWVvdXQodGhpcy5jYXB0dXJlLmJpbmQodGhpcyksIDApO1xuICB9XG59XG5cbmluaGVyaXRzKE1lZGlhLCBFdmVudEVtaXR0ZXIpO1xubW9kdWxlLmV4cG9ydHMgPSBNZWRpYTtcblxuLyoqXG4gICMjIyBjYXB0dXJlXG5cbiAgYGBgXG4gIGNhcHR1cmUoY29uc3RyYWludHMsIGNhbGxiYWNrKVxuICBgYGBcblxuICBDYXB0dXJlIG1lZGlhLiAgSWYgY29uc3RyYWludHMgYXJlIHByb3ZpZGVkLCB0aGVuIHRoZXkgd2lsbFxuICBvdmVycmlkZSB0aGUgZGVmYXVsdCBjb25zdHJhaW50cyB0aGF0IHdlcmUgdXNlZCB3aGVuIHRoZSBtZWRpYSBvYmplY3Qgd2FzXG4gIGNyZWF0ZWQuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5jYXB0dXJlID0gZnVuY3Rpb24oY29uc3RyYWludHMsIGNhbGxiYWNrKSB7XG4gIHZhciBtZWRpYSA9IHRoaXM7XG4gIHZhciBoYW5kbGVFbmQgPSB0aGlzLmVtaXQuYmluZCh0aGlzLCAnZW5kJyk7XG5cbiAgLy8gaWYgd2UgYWxyZWFkeSBoYXZlIGEgc3RyZWFtLCB0aGVuIGFib3J0XG4gIGlmICh0aGlzLnN0cmVhbSkgeyByZXR1cm47IH1cblxuICAvLyBpZiBubyBjb25zdHJhaW50cyBoYXZlIGJlZW4gcHJvdmlkZWQsIGJ1dCB3ZSBoYXZlXG4gIC8vIGEgY2FsbGJhY2ssIGRlYWwgd2l0aCBpdFxuICBpZiAodHlwZW9mIGNvbnN0cmFpbnRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IGNvbnN0cmFpbnRzO1xuICAgIGNvbnN0cmFpbnRzID0gdGhpcy5jb25zdHJhaW50cztcbiAgfVxuXG4gIC8vIGlmIHdlIGhhdmUgYSBjYWxsYmFjaywgYmluZCB0byB0aGUgc3RhcnQgZXZlbnRcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5vbmNlKCdjYXB0dXJlJywgY2FsbGJhY2suYmluZCh0aGlzKSk7XG4gIH1cblxuICAvLyBpZiB3ZSBkb24ndCBoYXZlIGdldCB0aGUgYWJpbGl0eSB0byBjYXB0dXJlIHVzZXIgbWVkaWEsIHRoZW4gYWJvcnRcbiAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhICE9ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sgJiYgY2FsbGJhY2sobmV3IEVycm9yKCdVbmFibGUgdG8gY2FwdHVyZSB1c2VyIG1lZGlhJykpO1xuICB9XG5cbiAgLy8gZ2V0IHVzZXIgbWVkaWEsIHVzaW5nIGVpdGhlciB0aGUgcHJvdmlkZWQgY29uc3RyYWludHMgb3IgdGhlXG4gIC8vIGRlZmF1bHQgY29uc3RyYWludHNcbiAgZGVidWcoJ2dldFVzZXJNZWRpYSwgY29uc3RyYWludHM6ICcsIGNvbnN0cmFpbnRzIHx8IHRoaXMuY29uc3RyYWludHMpO1xuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKFxuICAgIGNvbnN0cmFpbnRzIHx8IHRoaXMuY29uc3RyYWludHMsXG4gICAgZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICBkZWJ1Zygnc3VjZXNzZnVsbHkgY2FwdHVyZWQgbWVkaWEgc3RyZWFtOiAnLCBzdHJlYW0pO1xuICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uYWRkRXZlbnRMaXN0ZW5lciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHN0cmVhbS5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIGhhbmRsZUVuZCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgc3RyZWFtLm9uZW5kZWQgPSBoYW5kbGVFbmQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHNhdmUgdGhlIHN0cmVhbSBhbmQgZW1pdCB0aGUgc3RhcnQgbWV0aG9kXG4gICAgICBtZWRpYS5zdHJlYW0gPSBzdHJlYW07XG5cbiAgICAgIC8vIGVtaXQgY2FwdHVyZSBvbiBuZXh0IHRpY2sgd2hpY2ggd29ya3MgYXJvdW5kIGEgYnVnIHdoZW4gdXNpbmcgcGx1Z2luc1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgbWVkaWEuZW1pdCgnY2FwdHVyZScsIHN0cmVhbSk7XG4gICAgICB9LCAwKTtcbiAgICB9LFxuXG4gICAgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBkZWJ1ZygnZ2V0VXNlck1lZGlhIGF0dGVtcHQgZmFpbGVkOiAnLCBlcnIpO1xuICAgICAgbWVkaWEuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH1cbiAgKTtcbn07XG5cbi8qKlxuICAjIyMgcmVuZGVyXG5cbiAgYGBganNcbiAgcmVuZGVyKHRhcmdldCwgb3B0cz8sIGNhbGxiYWNrPylcbiAgYGBgXG5cbiAgUmVuZGVyIHRoZSBjYXB0dXJlZCBtZWRpYSB0byB0aGUgc3BlY2lmaWVkIHRhcmdldCBlbGVtZW50LiAgV2hpbGUgcHJldmlvdXNcbiAgdmVyc2lvbnMgb2YgcnRjLW1lZGlhIGFjY2VwdGVkIGEgc2VsZWN0b3Igc3RyaW5nIG9yIGFuIGFycmF5IG9mIGVsZW1lbnRzXG4gIHRoaXMgaGFzIGJlZW4gZHJvcHBlZCBpbiBmYXZvdXIgb2YgX19vbmUgc2luZ2xlIHRhcmdldCBlbGVtZW50X18uXG5cbiAgSWYgdGhlIHRhcmdldCBlbGVtZW50IGlzIGEgdmFsaWQgTWVkaWFFbGVtZW50IHRoZW4gaXQgd2lsbCBiZWNvbWUgdGhlXG4gIHRhcmdldCBvZiB0aGUgY2FwdHVyZWQgbWVkaWEgc3RyZWFtLiAgSWYsIGhvd2V2ZXIsIGl0IGlzIGEgZ2VuZXJpYyBET01cbiAgZWxlbWVudCBpdCB3aWxsIGEgbmV3IE1lZGlhIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkIHRoYXQgdXNpbmcgdGhlIHRhcmdldFxuICBhcyBpdCdzIHBhcmVudC5cblxuICBBIHNpbXBsZSBleGFtcGxlIG9mIHJlcXVlc3RpbmcgZGVmYXVsdCBtZWRpYSBjYXB0dXJlIGFuZCByZW5kZXJpbmcgdG8gdGhlXG4gIGRvY3VtZW50IGJvZHkgaXMgc2hvd24gYmVsb3c6XG5cbiAgPDw8IGV4YW1wbGVzL3JlbmRlci10by1ib2R5LmpzXG5cbiAgWW91IG1heSBvcHRpb25hbGx5IHByb3ZpZGUgYSBjYWxsYmFjayB0byB0aGlzIGZ1bmN0aW9uLCB3aGljaCBpc1xuICB3aWxsIGJlIHRyaWdnZXJlZCBvbmNlIGVhY2ggb2YgdGhlIG1lZGlhIGVsZW1lbnRzIGhhcyBzdGFydGVkIHBsYXlpbmdcbiAgdGhlIHN0cmVhbTpcblxuICA8PDwgZXhhbXBsZXMvcmVuZGVyLWNhcHR1cmUtY2FsbGJhY2suanNcblxuKiovXG5NZWRpYS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24odGFyZ2V0LCBvcHRzLCBjYWxsYmFjaykge1xuICAvLyBpZiB0aGUgdGFyZ2V0IGlzIGFuIGFycmF5LCBleHRyYWN0IHRoZSBmaXJzdCBlbGVtZW50XG4gIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAvLyBsb2cgYSB3YXJuaW5nXG4gICAgY29uc29sZS5sb2coJ1dBUk5JTkc6IHJ0Yy1tZWRpYSByZW5kZXIgKGFzIG9mIDEueCkgZXhwZWN0cyBhIHNpbmdsZSB0YXJnZXQnKTtcbiAgICB0YXJnZXQgPSB0YXJnZXRbMF07XG4gIH1cblxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICAvLyBlbnN1cmUgd2UgaGF2ZSBvcHRzXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gIC8vIGNyZWF0ZSB0aGUgdmlkZW8gLyBhdWRpbyBlbGVtZW50c1xuICB0YXJnZXQgPSB0aGlzLl9wcmVwYXJlRWxlbWVudChvcHRzLCB0YXJnZXQpO1xuICBjb25zb2xlLmxvZygnYXR0ZW1wdGluZyByZW5kZXIsIHN0cmVhbTogJywgdGhpcy5zdHJlYW0pO1xuXG4gIC8vIGlmIG5vIHN0cmVhbSB3YXMgc3BlY2lmaWVkLCB3YWl0IGZvciB0aGUgc3RyZWFtIHRvIGluaXRpYWxpemVcbiAgaWYgKCEgdGhpcy5zdHJlYW0pIHtcbiAgICB0aGlzLm9uY2UoJ2NhcHR1cmUnLCB0aGlzLl9iaW5kU3RyZWFtLmJpbmQodGhpcykpO1xuICB9XG4gIC8vIG90aGVyd2lzZSwgYmluZCB0aGUgc3RyZWFtIG5vd1xuICBlbHNlIHtcbiAgICB0aGlzLl9iaW5kU3RyZWFtKHRoaXMuc3RyZWFtKTtcbiAgfVxuXG4gIC8vIGlmIHdlIGhhdmUgYSBjYWxsYmFjayB0aGVuIHRyaWdnZXIgb24gdGhlIHJlbmRlciBldmVudFxuICBpZiAodHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLm9uY2UoJ3JlbmRlcicsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG4vKipcbiAgIyMjIHN0b3AoKVxuXG4gIFN0b3AgdGhlIG1lZGlhIHN0cmVhbVxuKiovXG5NZWRpYS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgdmFyIG1lZGlhID0gdGhpcztcblxuICBpZiAoISB0aGlzLnN0cmVhbSkgeyByZXR1cm47IH1cblxuICAvLyByZW1vdmUgYmluZGluZ3NcbiAgdGhpcy5fdW5iaW5kKG9wdHMpO1xuXG4gIC8vIHN0b3AgdGhlIHN0cmVhbSwgYW5kIHRlbGwgdGhlIHdvcmxkXG4gIHRoaXMuc3RyZWFtLnN0b3AoKTtcblxuICAvLyBvbiBjYXB0dXJlIHJlYmluZFxuICB0aGlzLm9uY2UoJ2NhcHR1cmUnLCBtZWRpYS5fYmluZFN0cmVhbS5iaW5kKG1lZGlhKSk7XG5cbiAgLy8gcmVtb3ZlIHRoZSByZWZlcmVuY2UgdG8gdGhlIHN0cmVhbVxuICB0aGlzLnN0cmVhbSA9IG51bGw7XG59O1xuXG4vKipcbiAgIyMgRGVidWdnaW5nIFRpcHNcblxuICBDaHJvbWUgYW5kIENocm9taXVtIGNhbiBib3RoIGJlIHN0YXJ0ZWQgd2l0aCB0aGUgZm9sbG93aW5nIGZsYWc6XG5cbiAgYGBgXG4gIC0tdXNlLWZha2UtZGV2aWNlLWZvci1tZWRpYS1zdHJlYW1cbiAgYGBgXG5cbiAgVGhpcyB1c2VzIGEgZmFrZSBzdHJlYW0gZm9yIHRoZSBnZXRVc2VyTWVkaWEoKSBjYWxsIHJhdGhlciB0aGFuIGF0dGVtcHRpbmdcbiAgdG8gY2FwdHVyZSB0aGUgYWN0dWFsIGNhbWVyYS4gIFRoaXMgaXMgdXNlZnVsIHdoZW4gZG9pbmcgYXV0b21hdGVkIHRlc3RpbmdcbiAgYW5kIGFsc28gaWYgeW91IHdhbnQgdG8gdGVzdCBjb25uZWN0aXZpdHkgYmV0d2VlbiB0d28gYnJvd3NlciBpbnN0YW5jZXMgYW5kXG4gIHdhbnQgdG8gZGlzdGluZ3Vpc2ggYmV0d2VlbiB0aGUgdHdvIGxvY2FsIHZpZGVvcy5cblxuICAjIyBJbnRlcm5hbCBNZXRob2RzXG5cbiAgVGhlcmUgYXJlIGEgbnVtYmVyIG9mIGludGVybmFsIG1ldGhvZHMgdGhhdCBhcmUgdXNlZCBpbiB0aGUgYHJ0Yy1tZWRpYWBcbiAgaW1wbGVtZW50YXRpb24uIFRoZXNlIGFyZSBvdXRsaW5lZCBiZWxvdywgYnV0IG5vdCBleHBlY3RlZCB0byBiZSBvZlxuICBnZW5lcmFsIHVzZS5cblxuKiovXG5cbk1lZGlhLnByb3RvdHlwZS5fY3JlYXRlQmluZGluZyA9IGZ1bmN0aW9uKG9wdHMsIGVsZW1lbnQpIHtcbiAgdGhpcy5fYmluZGluZ3MucHVzaCh7XG4gICAgZWw6IGVsZW1lbnQsXG4gICAgb3B0czogb3B0c1xuICB9KTtcblxuICByZXR1cm4gZWxlbWVudDtcbn07XG5cbi8qKlxuICAjIyMgX3ByZXBhcmVFbGVtZW50KG9wdHMsIGVsZW1lbnQpXG5cbiAgVGhlIHByZXBhcmVFbGVtZW50IGZ1bmN0aW9uIGlzIHVzZWQgdG8gcHJlcGFyZSBET00gZWxlbWVudHMgdGhhdCB3aWxsXG4gIHJlY2VpdmUgdGhlIG1lZGlhIHN0cmVhbXMgb25jZSB0aGUgc3RyZWFtIGhhdmUgYmVlbiBzdWNjZXNzZnVsbHkgY2FwdHVyZWQuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5fcHJlcGFyZUVsZW1lbnQgPSBmdW5jdGlvbihvcHRzLCBlbGVtZW50KSB7XG4gIHZhciBwYXJlbnQ7XG4gIHZhciB2YWxpZEVsZW1lbnQgPSAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxWaWRlb0VsZW1lbnQpIHx8XG4gICAgICAgIChlbGVtZW50IGluc3RhbmNlb2YgSFRNTEF1ZGlvRWxlbWVudCk7XG4gIHZhciBwcmVzZXJ2ZUFzcGVjdFJhdGlvID1cbiAgICAgICAgdHlwZW9mIG9wdHMucHJlc2VydmVBc3BlY3RSYXRpbyA9PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICBvcHRzLnByZXNlcnZlQXNwZWN0UmF0aW87XG5cbiAgaWYgKCEgZWxlbWVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHJlbmRlciBtZWRpYSB0byBhIG51bGwgZWxlbWVudCcpO1xuICB9XG5cbiAgLy8gaWYgdGhlIHBsdWdpbiB3YW50cyB0byBwcmVwYXJlIGVsZW1uZXRzLCB0aGVuIGxldCBpdFxuICBpZiAodGhpcy5wbHVnaW4gJiYgdHlwZW9mIHRoaXMucGx1Z2luLnByZXBhcmVFbGVtZW50ID09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdGhpcy5fY3JlYXRlQmluZGluZyhcbiAgICAgIG9wdHMsXG4gICAgICB0aGlzLnBsdWdpbi5wcmVwYXJlRWxlbWVudC5jYWxsKHRoaXMuX3BpbnN0LCBvcHRzLCBlbGVtZW50KVxuICAgICk7XG4gIH1cblxuICAvLyBwZXJmb3JtIHNvbWUgYWRkaXRpb25hbCBjaGVja3MgZm9yIHRoaW5ncyB0aGF0IFwibG9va1wiIGxpa2UgYVxuICAvLyBtZWRpYSBlbGVtZW50XG4gIHZhbGlkRWxlbWVudCA9IHZhbGlkRWxlbWVudCB8fCAodHlwZW9mIGVsZW1lbnQucGxheSA9PSAnZnVuY3Rpb24nKSAmJiAoXG4gICAgdHlwZW9mIGVsZW1lbnQuc3JjT2JqZWN0ICE9ICd1bmRlZmluZWQnIHx8XG4gICAgdHlwZW9mIGVsZW1lbnQubW96U3JjT2JqZWN0ICE9ICd1bmRlZmluZWQnIHx8XG4gICAgdHlwZW9mIGVsZW1lbnQuc3JjICE9ICd1bmRlZmluZWQnKTtcblxuICAvLyBpZiB0aGUgZWxlbWVudCBpcyBub3QgYSB2aWRlbyBlbGVtZW50LCB0aGVuIGNyZWF0ZSBvbmVcbiAgaWYgKCEgdmFsaWRFbGVtZW50KSB7XG4gICAgcGFyZW50ID0gZWxlbWVudDtcblxuICAgIC8vIGNyZWF0ZSBhIG5ldyB2aWRlbyBlbGVtZW50XG4gICAgLy8gVE9ETzogY3JlYXRlIGFuIGFwcHJvcHJpYXRlIGVsZW1lbnQgYmFzZWQgb24gdGhlIHR5cGVzIG9mIHRyYWNrc1xuICAgIC8vIGF2YWlsYWJsZVxuICAgIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xuXG4gICAgLy8gaWYgd2UgYXJlIHByZXNlcnZpbmcgYXNwZWN0IHJhdGlvIGRvIHRoYXQgbm93XG4gICAgaWYgKHByZXNlcnZlQXNwZWN0UmF0aW8pIHtcbiAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJycpO1xuICAgIH1cblxuICAgIC8vIGFkZCB0byB0aGUgcGFyZW50XG4gICAgcGFyZW50LmFwcGVuZENoaWxkKGVsZW1lbnQpO1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlpbmcnLCBmYWxzZSk7XG4gIH1cblxuICAvLyBpZiBtdXRlZCwgaW5qZWN0IHRoZSBtdXRlZCBhdHRyaWJ1dGVcbiAgaWYgKGVsZW1lbnQgJiYgdGhpcy5tdXRlZCkge1xuICAgIGVsZW1lbnQubXV0ZWQgPSB0cnVlO1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdtdXRlZCcsICcnKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9jcmVhdGVCaW5kaW5nKG9wdHMsIGVsZW1lbnQpO1xufTtcblxuLyoqXG4gICMjIyBfYmluZFN0cmVhbShzdHJlYW0pXG5cbiAgQmluZCBhIHN0cmVhbSB0byBwcmV2aW91c2x5IHByZXBhcmVkIERPTSBlbGVtZW50cy5cblxuKiovXG5NZWRpYS5wcm90b3R5cGUuX2JpbmRTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgdmFyIG1lZGlhID0gdGhpcztcbiAgdmFyIGVsZW1lbnRzID0gW107XG4gIHZhciB3YWl0aW5nID0gW107XG5cbiAgZnVuY3Rpb24gY2hlY2tXYWl0aW5nKCkge1xuICAgIC8vIGlmIHdlIGhhdmUgbm8gd2FpdGluZyBlbGVtZW50cywgYnV0IHNvbWUgZWxlbWVudHNcbiAgICAvLyB0cmlnZ2VyIHRoZSBzdGFydCBldmVudFxuICAgIGlmICh3YWl0aW5nLmxlbmd0aCA9PT0gMCAmJiBlbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICBtZWRpYS5lbWl0KCdyZW5kZXInLCBlbGVtZW50c1swXSk7XG5cbiAgICAgIGVsZW1lbnRzLm1hcChmdW5jdGlvbihlbCkge1xuICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheWluZycsIHRydWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2FuUGxheShldnQpIHtcbiAgICB2YXIgZWwgPSBldnQudGFyZ2V0IHx8IGV2dC5zcmNFbGVtZW50O1xuICAgIHZhciB2aWRlb0luZGV4ID0gZWxlbWVudHMuaW5kZXhPZihlbCk7XG5cbiAgICBpZiAodmlkZW9JbmRleCA+PSAwKSB7XG4gICAgICB3YWl0aW5nLnNwbGljZSh2aWRlb0luZGV4LCAxKTtcbiAgICB9XG5cbiAgICBlbC5wbGF5KCk7XG4gICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FucGxheScsIGNhblBsYXkpO1xuICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgY2FuUGxheSk7XG4gICAgY2hlY2tXYWl0aW5nKCk7XG4gIH1cblxuICAvLyBpZiB3ZSBoYXZlIGEgcGx1Z2luIHRoYXQga25vd3MgaG93IHRvIGF0dGFjaCBhIHN0cmVhbSwgdGhlbiBsZXQgaXQgZG8gaXRcbiAgaWYgKHRoaXMucGx1Z2luICYmIHR5cGVvZiB0aGlzLnBsdWdpbi5hdHRhY2hTdHJlYW0gPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB0aGlzLnBsdWdpbi5hdHRhY2hTdHJlYW0uY2FsbCh0aGlzLl9waW5zdCwgc3RyZWFtLCB0aGlzLl9iaW5kaW5ncyk7XG4gIH1cblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGJpbmRpbmdzIGFuZCBiaW5kIHRoZSBzdHJlYW1cbiAgZWxlbWVudHMgPSB0aGlzLl9iaW5kaW5ncy5tYXAoZnVuY3Rpb24oYmluZGluZykge1xuICAgIC8vIGNoZWNrIGZvciBzcmNPYmplY3RcbiAgICBpZiAodHlwZW9mIGJpbmRpbmcuZWwuc3JjT2JqZWN0ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICBiaW5kaW5nLmVsLnNyY09iamVjdCA9IHN0cmVhbTtcbiAgICB9XG4gICAgLy8gY2hlY2sgZm9yIG1velNyY09iamVjdFxuICAgIGVsc2UgaWYgKHR5cGVvZiBiaW5kaW5nLmVsLm1velNyY09iamVjdCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgYmluZGluZy5lbC5tb3pTcmNPYmplY3QgPSBzdHJlYW07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgYmluZGluZy5lbC5zcmMgPSBtZWRpYS5fY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSkgfHwgc3RyZWFtO1xuICAgIH1cblxuICAgIC8vIGF0dGVtcHQgcGxheWJhY2sgKG1heSBub3Qgd29yayBpZiB0aGUgc3RyZWFtIGlzbid0IHF1aXRlIHJlYWR5KVxuICAgIGJpbmRpbmcuZWwucGxheSgpO1xuICAgIHJldHVybiBiaW5kaW5nLmVsO1xuICB9KTtcblxuICAvLyBmaW5kIHRoZSBlbGVtZW50cyB3ZSBhcmUgd2FpdGluZyBvblxuICB3YWl0aW5nID0gZWxlbWVudHMuZmlsdGVyKGZ1bmN0aW9uKGVsKSB7XG4gICAgcmV0dXJuIGVsLnJlYWR5U3RhdGUgPCAzOyAvLyByZWFkeXN0YXRlIDwgSEFWRV9GVVRVUkVfREFUQVxuICB9KTtcblxuICAvLyB3YWl0IGZvciBhbGwgdGhlIHZpZGVvIGVsZW1lbnRzXG4gIHdhaXRpbmcuZm9yRWFjaChmdW5jdGlvbihlbCkge1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXknLCBjYW5QbGF5LCBmYWxzZSk7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCBjYW5QbGF5LCBmYWxzZSk7XG4gIH0pO1xuXG4gIGNoZWNrV2FpdGluZygpO1xufTtcblxuLyoqXG4gICMjIyBfdW5iaW5kKClcblxuICBHcmFjZWZ1bGx5IGRldGFjaCBlbGVtZW50cyB0aGF0IGFyZSB1c2luZyB0aGUgc3RyZWFtIGZyb20gdGhlXG4gIGN1cnJlbnQgc3RyZWFtLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuX3VuYmluZCA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgLy8gZW5zdXJlIHdlIGhhdmUgb3B0c1xuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGJpbmRpbmdzIGFuZCBkZXRhY2ggc3RyZWFtc1xuICB0aGlzLl9iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICB2YXIgZWxlbWVudCA9IGJpbmRpbmcuZWw7XG5cbiAgICAvLyByZW1vdmUgdGhlIHNvdXJjZVxuICAgIGVsZW1lbnQuc3JjID0gbnVsbDtcblxuICAgIC8vIGNoZWNrIGZvciBtb3pcbiAgICBpZiAoZWxlbWVudC5tb3pTcmNPYmplY3QpIHtcbiAgICAgIGVsZW1lbnQubW96U3JjT2JqZWN0ID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBjaGVjayBmb3IgY3VycmVudFNyY1xuICAgIGlmIChlbGVtZW50LmN1cnJlbnRTcmMpIHtcbiAgICAgIGVsZW1lbnQuY3VycmVudFNyYyA9IG51bGw7XG4gICAgfVxuICB9KTtcbn07XG5cbi8qKlxuICAjIyMgX2NyZWF0ZU9iamVjdFVybChzdHJlYW0pXG5cbiAgVGhpcyBtZXRob2QgaXMgdXNlZCB0byBjcmVhdGUgYW4gb2JqZWN0IHVybCB0aGF0IGNhbiBiZSBhdHRhY2hlZCB0byBhIHZpZGVvXG4gIG9yIGF1ZGlvIGVsZW1lbnQuICBPYmplY3QgdXJscyBhcmUgY2FjaGVkIHRvIGVuc3VyZSBvbmx5IG9uZSBpcyBjcmVhdGVkXG4gIHBlciBzdHJlYW0uXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5fY3JlYXRlT2JqZWN0VVJMID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSk7XG4gIH1cbiAgY2F0Y2ggKGUpIHtcbiAgfVxufTtcblxuLyoqXG4gICMjIyBfaGFuZGxlU3VjY2VzcyhzdHJlYW0pXG5cbiAgSGFuZGxlIHRoZSBzdWNjZXNzIGNvbmRpdGlvbiBvZiBhIGBnZXRVc2VyTWVkaWFgIGNhbGwuXG5cbioqL1xuTWVkaWEucHJvdG90eXBlLl9oYW5kbGVTdWNjZXNzID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIC8vIHVwZGF0ZSB0aGUgYWN0aXZlIHN0cmVhbSB0aGF0IHdlIGFyZSBjb25uZWN0ZWQgdG9cbiAgdGhpcy5zdHJlYW0gPSBzdHJlYW07XG5cbiAgLy8gZW1pdCB0aGUgc3RyZWFtIGV2ZW50XG4gIHRoaXMuZW1pdCgnc3RyZWFtJywgc3RyZWFtKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogTWluaW1hbCBFdmVudEVtaXR0ZXIgaW50ZXJmYWNlIHRoYXQgaXMgbW9sZGVkIGFnYWluc3QgdGhlIE5vZGUuanNcbiAqIEV2ZW50RW1pdHRlciBpbnRlcmZhY2UuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHt9O1xufVxuXG4vKipcbiAqIFJldHVybiBhIGxpc3Qgb2YgYXNzaWduZWQgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnRzIHRoYXQgc2hvdWxkIGJlIGxpc3RlZC5cbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24gbGlzdGVuZXJzKGV2ZW50KSB7XG4gIHJldHVybiBBcnJheS5hcHBseSh0aGlzLCB0aGlzLl9ldmVudHNbZXZlbnRdIHx8IFtdKTtcbn07XG5cbi8qKlxuICogRW1pdCBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBuYW1lIG9mIHRoZSBldmVudC5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBJbmRpY2F0aW9uIGlmIHdlJ3ZlIGVtaXR0ZWQgYW4gZXZlbnQuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KGV2ZW50LCBhMSwgYTIsIGEzLCBhNCwgYTUpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tldmVudF0pIHJldHVybiBmYWxzZTtcblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW2V2ZW50XVxuICAgICwgbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aFxuICAgICwgbGVuID0gYXJndW1lbnRzLmxlbmd0aFxuICAgICwgZm4gPSBsaXN0ZW5lcnNbMF1cbiAgICAsIGFyZ3NcbiAgICAsIGk7XG5cbiAgaWYgKDEgPT09IGxlbmd0aCkge1xuICAgIGlmIChmbi5fX0VFM19vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBmbik7XG5cbiAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgY2FzZSAxOlxuICAgICAgICBmbi5jYWxsKGZuLl9fRUUzX2NvbnRleHQgfHwgdGhpcyk7XG4gICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgZm4uY2FsbChmbi5fX0VFM19jb250ZXh0IHx8IHRoaXMsIGExKTtcbiAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBmbi5jYWxsKGZuLl9fRUUzX2NvbnRleHQgfHwgdGhpcywgYTEsIGEyKTtcbiAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA0OlxuICAgICAgICBmbi5jYWxsKGZuLl9fRUUzX2NvbnRleHQgfHwgdGhpcywgYTEsIGEyLCBhMyk7XG4gICAgICBicmVhaztcbiAgICAgIGNhc2UgNTpcbiAgICAgICAgZm4uY2FsbChmbi5fX0VFM19jb250ZXh0IHx8IHRoaXMsIGExLCBhMiwgYTMsIGE0KTtcbiAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA2OlxuICAgICAgICBmbi5jYWxsKGZuLl9fRUUzX2NvbnRleHQgfHwgdGhpcywgYTEsIGEyLCBhMywgYTQsIGE1KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBmb3IgKGkgPSAxLCBhcmdzID0gbmV3IEFycmF5KGxlbiAtMSk7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG5cbiAgICAgICAgZm4uYXBwbHkoZm4uX19FRTNfY29udGV4dCB8fCB0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yIChpID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGZuID0gbGlzdGVuZXJzWysraV0pIHtcbiAgICAgIGlmIChmbi5fX0VFM19vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBmbik7XG4gICAgICBmbi5hcHBseShmbi5fX0VFM19jb250ZXh0IHx8IHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhIG5ldyBFdmVudExpc3RlbmVyIGZvciB0aGUgZ2l2ZW4gZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IE5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHBhcmFtIHtGdW5jdG9ufSBmbiBDYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgVGhlIGNvbnRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XG4gIGlmICghdGhpcy5fZXZlbnRzW2V2ZW50XSkgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IFtdO1xuXG4gIGZuLl9fRUUzX2NvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goZm4pO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgYW4gRXZlbnRMaXN0ZW5lciB0aGF0J3Mgb25seSBjYWxsZWQgb25jZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgTmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgVGhlIGNvbnRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZShldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgZm4uX19FRTNfb25jZSA9IHRydWU7XG4gIHJldHVybiB0aGlzLm9uKGV2ZW50LCBmbiwgY29udGV4dCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudCB3ZSB3YW50IHRvIHJlbW92ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBsaXN0ZW5lciB0aGF0IHdlIG5lZWQgdG8gZmluZC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcihldmVudCwgZm4pIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tldmVudF0pIHJldHVybiB0aGlzO1xuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbZXZlbnRdXG4gICAgLCBldmVudHMgPSBbXTtcblxuICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZuICYmIGxpc3RlbmVyc1tpXSAhPT0gZm4pIHtcbiAgICAgIGV2ZW50cy5wdXNoKGxpc3RlbmVyc1tpXSk7XG4gICAgfVxuICB9XG5cbiAgLy9cbiAgLy8gUmVzZXQgdGhlIGFycmF5LCBvciByZW1vdmUgaXQgY29tcGxldGVseSBpZiB3ZSBoYXZlIG5vIG1vcmUgbGlzdGVuZXJzLlxuICAvL1xuICBpZiAoZXZlbnRzLmxlbmd0aCkgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IGV2ZW50cztcbiAgZWxzZSB0aGlzLl9ldmVudHNbZXZlbnRdID0gbnVsbDtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgb3Igb25seSB0aGUgbGlzdGVuZXJzIGZvciB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnQgd2FudCB0byByZW1vdmUgYWxsIGxpc3RlbmVycyBmb3IuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycyhldmVudCkge1xuICBpZiAoIXRoaXMuX2V2ZW50cykgcmV0dXJuIHRoaXM7XG5cbiAgaWYgKGV2ZW50KSB0aGlzLl9ldmVudHNbZXZlbnRdID0gbnVsbDtcbiAgZWxzZSB0aGlzLl9ldmVudHMgPSB7fTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vXG4vLyBBbGlhcyBtZXRob2RzIG5hbWVzIGJlY2F1c2UgcGVvcGxlIHJvbGwgbGlrZSB0aGF0LlxuLy9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lcjtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4vL1xuLy8gVGhpcyBmdW5jdGlvbiBkb2Vzbid0IGFwcGx5IGFueW1vcmUuXG4vL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbiBzZXRNYXhMaXN0ZW5lcnMoKSB7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIEV4cG9zZSB0aGUgbW9kdWxlLlxuLy9cbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyMiA9IEV2ZW50RW1pdHRlcjtcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIzID0gRXZlbnRFbWl0dGVyO1xuXG50cnkgeyBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjsgfVxuY2F0Y2ggKGUpIHt9XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgd2luZG93OiBmYWxzZSAqL1xuLyogZ2xvYmFsIG5hdmlnYXRvcjogZmFsc2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYnJvd3NlciA9IHJlcXVpcmUoJ2RldGVjdC1icm93c2VyJyk7XG5cbi8qKlxuICAjIyBydGMtY29yZS9kZXRlY3RcblxuICBBIGJyb3dzZXIgZGV0ZWN0aW9uIGhlbHBlciBmb3IgYWNjZXNzaW5nIHByZWZpeC1mcmVlIHZlcnNpb25zIG9mIHRoZSB2YXJpb3VzXG4gIFdlYlJUQyB0eXBlcy5cblxuICAjIyMgRXhhbXBsZSBVc2FnZVxuXG4gIElmIHlvdSB3YW50ZWQgdG8gZ2V0IHRoZSBuYXRpdmUgYFJUQ1BlZXJDb25uZWN0aW9uYCBwcm90b3R5cGUgaW4gYW55IGJyb3dzZXJcbiAgeW91IGNvdWxkIGRvIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBganNcbiAgdmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpOyAvLyBhbHNvIGF2YWlsYWJsZSBpbiBydGMvZGV0ZWN0XG4gIHZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcbiAgYGBgXG5cbiAgVGhpcyB3b3VsZCBwcm92aWRlIHdoYXRldmVyIHRoZSBicm93c2VyIHByZWZpeGVkIHZlcnNpb24gb2YgdGhlXG4gIFJUQ1BlZXJDb25uZWN0aW9uIGlzIGF2YWlsYWJsZSAoYHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uYCxcbiAgYG1velJUQ1BlZXJDb25uZWN0aW9uYCwgZXRjKS5cbioqL1xudmFyIGRldGVjdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0LCBwcmVmaXhlcykge1xuICB2YXIgcHJlZml4SWR4O1xuICB2YXIgcHJlZml4O1xuICB2YXIgdGVzdE5hbWU7XG4gIHZhciBob3N0T2JqZWN0ID0gdGhpcyB8fCAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZCk7XG5cbiAgLy8gaWYgd2UgaGF2ZSBubyBob3N0IG9iamVjdCwgdGhlbiBhYm9ydFxuICBpZiAoISBob3N0T2JqZWN0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gaW5pdGlhbGlzZSB0byBkZWZhdWx0IHByZWZpeGVzXG4gIC8vIChyZXZlcnNlIG9yZGVyIGFzIHdlIHVzZSBhIGRlY3JlbWVudGluZyBmb3IgbG9vcClcbiAgcHJlZml4ZXMgPSAocHJlZml4ZXMgfHwgWydtcycsICdvJywgJ21veicsICd3ZWJraXQnXSkuY29uY2F0KCcnKTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHByZWZpeGVzIGFuZCByZXR1cm4gdGhlIGNsYXNzIGlmIGZvdW5kIGluIGdsb2JhbFxuICBmb3IgKHByZWZpeElkeCA9IHByZWZpeGVzLmxlbmd0aDsgcHJlZml4SWR4LS07ICkge1xuICAgIHByZWZpeCA9IHByZWZpeGVzW3ByZWZpeElkeF07XG5cbiAgICAvLyBjb25zdHJ1Y3QgdGhlIHRlc3QgY2xhc3MgbmFtZVxuICAgIC8vIGlmIHdlIGhhdmUgYSBwcmVmaXggZW5zdXJlIHRoZSB0YXJnZXQgaGFzIGFuIHVwcGVyY2FzZSBmaXJzdCBjaGFyYWN0ZXJcbiAgICAvLyBzdWNoIHRoYXQgYSB0ZXN0IGZvciBnZXRVc2VyTWVkaWEgd291bGQgcmVzdWx0IGluIGFcbiAgICAvLyBzZWFyY2ggZm9yIHdlYmtpdEdldFVzZXJNZWRpYVxuICAgIHRlc3ROYW1lID0gcHJlZml4ICsgKHByZWZpeCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdGFyZ2V0LnNsaWNlKDEpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQpO1xuXG4gICAgaWYgKHR5cGVvZiBob3N0T2JqZWN0W3Rlc3ROYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgLy8gdXBkYXRlIHRoZSBsYXN0IHVzZWQgcHJlZml4XG4gICAgICBkZXRlY3QuYnJvd3NlciA9IGRldGVjdC5icm93c2VyIHx8IHByZWZpeC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAvLyByZXR1cm4gdGhlIGhvc3Qgb2JqZWN0IG1lbWJlclxuICAgICAgcmV0dXJuIGhvc3RPYmplY3RbdGFyZ2V0XSA9IGhvc3RPYmplY3RbdGVzdE5hbWVdO1xuICAgIH1cbiAgfVxufTtcblxuLy8gZGV0ZWN0IG1vemlsbGEgKHllcywgdGhpcyBmZWVscyBkaXJ0eSlcbmRldGVjdC5tb3ogPSB0eXBlb2YgbmF2aWdhdG9yICE9ICd1bmRlZmluZWQnICYmICEhbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYTtcblxuLy8gc2V0IHRoZSBicm93c2VyIGFuZCBicm93c2VyIHZlcnNpb25cbmRldGVjdC5icm93c2VyID0gYnJvd3Nlci5uYW1lO1xuZGV0ZWN0LmJyb3dzZXJWZXJzaW9uID0gZGV0ZWN0LnZlcnNpb24gPSBicm93c2VyLnZlcnNpb247XG4iLCJ2YXIgYnJvd3NlcnMgPSBbXG4gIFsgJ2Nocm9tZScsIC9DaHJvbSg/OmV8aXVtKVxcLyhbMC05XFwuXSspKDo/XFxzfCQpLyBdLFxuICBbICdmaXJlZm94JywgL0ZpcmVmb3hcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnb3BlcmEnLCAvT3BlcmFcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnaWUnLCAvVHJpZGVudFxcLzdcXC4wLipydlxcOihbMC05XFwuXSspXFwpLipHZWNrbyQvIF1cbl07XG5cbnZhciBtYXRjaCA9IGJyb3dzZXJzLm1hcChtYXRjaCkuZmlsdGVyKGlzTWF0Y2gpWzBdO1xudmFyIHBhcnRzID0gbWF0Y2ggJiYgbWF0Y2hbM10uc3BsaXQoJy4nKS5zbGljZSgwLDMpO1xuXG53aGlsZSAocGFydHMubGVuZ3RoIDwgMykge1xuICBwYXJ0cy5wdXNoKCcwJyk7XG59XG5cbi8vIHNldCB0aGUgbmFtZSBhbmQgdmVyc2lvblxuZXhwb3J0cy5uYW1lID0gbWF0Y2ggJiYgbWF0Y2hbMF07XG5leHBvcnRzLnZlcnNpb24gPSBwYXJ0cy5qb2luKCcuJyk7XG5cbmZ1bmN0aW9uIG1hdGNoKHBhaXIpIHtcbiAgcmV0dXJuIHBhaXIuY29uY2F0KHBhaXJbMV0uZXhlYyhuYXZpZ2F0b3IudXNlckFnZW50KSk7XG59XG5cbmZ1bmN0aW9uIGlzTWF0Y2gocGFpcikge1xuICByZXR1cm4gISFwYWlyWzJdO1xufVxuIiwidmFyIGRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG52YXIgcmVxdWlyZWRGdW5jdGlvbnMgPSBbXG4gICdpbml0J1xuXTtcblxuZnVuY3Rpb24gaXNTdXBwb3J0ZWQocGx1Z2luKSB7XG4gIHJldHVybiBwbHVnaW4gJiYgdHlwZW9mIHBsdWdpbi5zdXBwb3J0ZWQgPT0gJ2Z1bmN0aW9uJyAmJiBwbHVnaW4uc3VwcG9ydGVkKGRldGVjdCk7XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWQocGx1Z2luKSB7XG4gIHZhciBzdXBwb3J0ZWRGdW5jdGlvbnMgPSByZXF1aXJlZEZ1bmN0aW9ucy5maWx0ZXIoZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gdHlwZW9mIHBsdWdpbltmbl0gPT0gJ2Z1bmN0aW9uJztcbiAgfSk7XG5cbiAgcmV0dXJuIHN1cHBvcnRlZEZ1bmN0aW9ucy5sZW5ndGggPT09IHJlcXVpcmVkRnVuY3Rpb25zLmxlbmd0aDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwbHVnaW5zKSB7XG4gIHJldHVybiBbXS5jb25jYXQocGx1Z2lucyB8fCBbXSkuZmlsdGVyKGlzU3VwcG9ydGVkKS5maWx0ZXIoaXNWYWxpZClbMF07XG59XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIHJ0YyA9IHJlcXVpcmUoJ3J0Yy10b29scycpO1xudmFyIGNsZWFudXAgPSByZXF1aXJlKCdydGMtdG9vbHMvY2xlYW51cCcpO1xudmFyIGRlYnVnID0gcnRjLmxvZ2dlcigncnRjLXF1aWNrY29ubmVjdCcpO1xudmFyIHNpZ25hbGxlciA9IHJlcXVpcmUoJ3J0Yy1zaWduYWxsZXInKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJ2NvZy9kZWZhdWx0cycpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbnZhciBnZXRhYmxlID0gcmVxdWlyZSgnY29nL2dldGFibGUnKTtcbnZhciByZVRyYWlsaW5nU2xhc2ggPSAvXFwvJC87XG5cbi8qKlxuICAjIHJ0Yy1xdWlja2Nvbm5lY3RcblxuICBUaGlzIGlzIGEgaGlnaCBsZXZlbCBoZWxwZXIgbW9kdWxlIGRlc2lnbmVkIHRvIGhlbHAgeW91IGdldCB1cFxuICBhbiBydW5uaW5nIHdpdGggV2ViUlRDIHJlYWxseSwgcmVhbGx5IHF1aWNrbHkuICBCeSB1c2luZyB0aGlzIG1vZHVsZSB5b3VcbiAgYXJlIHRyYWRpbmcgb2ZmIHNvbWUgZmxleGliaWxpdHksIHNvIGlmIHlvdSBuZWVkIGEgbW9yZSBmbGV4aWJsZVxuICBjb25maWd1cmF0aW9uIHlvdSBzaG91bGQgZHJpbGwgZG93biBpbnRvIGxvd2VyIGxldmVsIGNvbXBvbmVudHMgb2YgdGhlXG4gIFtydGMuaW9dKGh0dHA6Ly93d3cucnRjLmlvKSBzdWl0ZS4gIEluIHBhcnRpY3VsYXIgeW91IHNob3VsZCBjaGVjayBvdXRcbiAgW3J0Y10oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMpLlxuXG4gICMjIFVwZ3JhZGluZyB0byAxLjBcblxuICBUaGUgW3VwZ3JhZGluZyB0byAxLjAgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtcXVpY2tjb25uZWN0L2Jsb2IvbWFzdGVyL2RvY3MvdXBncmFkaW5nLXRvLTEuMC5tZClcbiAgcHJvdmlkZXMgc29tZSBpbmZvcm1hdGlvbiBvbiB3aGF0IHlvdSBuZWVkIHRvIGNoYW5nZSB0byB1cGdyYWRlIHRvXG4gIGBydGMtcXVpY2tjb25uZWN0QDEuMGAuICBBZGRpdGlvbmFsbHksIHRoZVxuICBbcXVpY2tjb25uZWN0IGRlbW8gYXBwXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Y2lvLWRlbW8tcXVpY2tjb25uZWN0KVxuICBoYXMgYmVlbiB1cGRhdGVkIHdoaWNoIHNob3VsZCBwcm92aWRlIHNvbWUgYWRkaXRpb25hbCBpbmZvcm1hdGlvbi5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgSW4gdGhlIHNpbXBsZXN0IGNhc2UgeW91IHNpbXBseSBjYWxsIHF1aWNrY29ubmVjdCB3aXRoIGEgc2luZ2xlIHN0cmluZ1xuICBhcmd1bWVudCB3aGljaCB0ZWxscyBxdWlja2Nvbm5lY3Qgd2hpY2ggc2VydmVyIHRvIHVzZSBmb3Igc2lnbmFsaW5nOlxuXG4gIDw8PCBleGFtcGxlcy9zaW1wbGUuanNcblxuICA8PDwgZG9jcy9ldmVudHMubWRcblxuICA8PDwgZG9jcy9leGFtcGxlcy5tZFxuXG4gICMjIFJlZ2FyZGluZyBTaWduYWxsaW5nIGFuZCBhIFNpZ25hbGxpbmcgU2VydmVyXG5cbiAgU2lnbmFsaW5nIGlzIGFuIGltcG9ydGFudCBwYXJ0IG9mIHNldHRpbmcgdXAgYSBXZWJSVEMgY29ubmVjdGlvbiBhbmQgZm9yXG4gIG91ciBleGFtcGxlcyB3ZSB1c2Ugb3VyIG93biB0ZXN0IGluc3RhbmNlIG9mIHRoZVxuICBbcnRjLXN3aXRjaGJvYXJkXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zd2l0Y2hib2FyZCkuIEZvciB5b3VyXG4gIHRlc3RpbmcgYW5kIGRldmVsb3BtZW50IHlvdSBhcmUgbW9yZSB0aGFuIHdlbGNvbWUgdG8gdXNlIHRoaXMgYWxzbywgYnV0XG4gIGp1c3QgYmUgYXdhcmUgdGhhdCB3ZSB1c2UgdGhpcyBmb3Igb3VyIHRlc3Rpbmcgc28gaXQgbWF5IGdvIHVwIGFuZCBkb3duXG4gIGEgbGl0dGxlLiAgSWYgeW91IG5lZWQgc29tZXRoaW5nIG1vcmUgc3RhYmxlLCB3aHkgbm90IGNvbnNpZGVyIGRlcGxveWluZ1xuICBhbiBpbnN0YW5jZSBvZiB0aGUgc3dpdGNoYm9hcmQgeW91cnNlbGYgLSBpdCdzIHByZXR0eSBlYXN5IDopXG5cbiAgIyMgUmVmZXJlbmNlXG5cbiAgYGBgXG4gIHF1aWNrY29ubmVjdChzaWduYWxob3N0LCBvcHRzPykgPT4gcnRjLXNpZ2FsbGVyIGluc3RhbmNlICgrIGhlbHBlcnMpXG4gIGBgYFxuXG4gICMjIyBWYWxpZCBRdWljayBDb25uZWN0IE9wdGlvbnNcblxuICBUaGUgb3B0aW9ucyBwcm92aWRlZCB0byB0aGUgYHJ0Yy1xdWlja2Nvbm5lY3RgIG1vZHVsZSBmdW5jdGlvbiBpbmZsdWVuY2UgdGhlXG4gIGJlaGF2aW91ciBvZiBzb21lIG9mIHRoZSB1bmRlcmx5aW5nIGNvbXBvbmVudHMgdXNlZCBmcm9tIHRoZSBydGMuaW8gc3VpdGUuXG5cbiAgTGlzdGVkIGJlbG93IGFyZSBzb21lIG9mIHRoZSBjb21tb25seSB1c2VkIG9wdGlvbnM6XG5cbiAgLSBgbnNgIChkZWZhdWx0OiAnJylcblxuICAgIEFuIG9wdGlvbmFsIG5hbWVzcGFjZSBmb3IgeW91ciBzaWduYWxsaW5nIHJvb20uICBXaGlsZSBxdWlja2Nvbm5lY3RcbiAgICB3aWxsIGdlbmVyYXRlIGEgdW5pcXVlIGhhc2ggZm9yIHRoZSByb29tLCB0aGlzIGNhbiBiZSBtYWRlIHRvIGJlIG1vcmVcbiAgICB1bmlxdWUgYnkgcHJvdmlkaW5nIGEgbmFtZXNwYWNlLiAgVXNpbmcgYSBuYW1lc3BhY2UgbWVhbnMgdHdvIGRlbW9zXG4gICAgdGhhdCBoYXZlIGdlbmVyYXRlZCB0aGUgc2FtZSBoYXNoIGJ1dCB1c2UgYSBkaWZmZXJlbnQgbmFtZXNwYWNlIHdpbGwgYmVcbiAgICBpbiBkaWZmZXJlbnQgcm9vbXMuXG5cbiAgLSBgcm9vbWAgKGRlZmF1bHQ6IG51bGwpIF9hZGRlZCAwLjZfXG5cbiAgICBSYXRoZXIgdGhhbiB1c2UgdGhlIGludGVybmFsIGhhc2ggZ2VuZXJhdGlvblxuICAgIChwbHVzIG9wdGlvbmFsIG5hbWVzcGFjZSkgZm9yIHJvb20gbmFtZSBnZW5lcmF0aW9uLCBzaW1wbHkgdXNlIHRoaXMgcm9vbVxuICAgIG5hbWUgaW5zdGVhZC4gIF9fTk9URTpfXyBVc2Ugb2YgdGhlIGByb29tYCBvcHRpb24gdGFrZXMgcHJlY2VuZGVuY2Ugb3ZlclxuICAgIGBuc2AuXG5cbiAgLSBgZGVidWdgIChkZWZhdWx0OiBmYWxzZSlcblxuICBXcml0ZSBydGMuaW8gc3VpdGUgZGVidWcgb3V0cHV0IHRvIHRoZSBicm93c2VyIGNvbnNvbGUuXG5cbiAgIyMjIyBPcHRpb25zIGZvciBQZWVyIENvbm5lY3Rpb24gQ3JlYXRpb25cblxuICBPcHRpb25zIHRoYXQgYXJlIHBhc3NlZCBvbnRvIHRoZVxuICBbcnRjLmNyZWF0ZUNvbm5lY3Rpb25dKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjI2NyZWF0ZWNvbm5lY3Rpb25vcHRzLWNvbnN0cmFpbnRzKVxuICBmdW5jdGlvbjpcblxuICAtIGBpY2VTZXJ2ZXJzYFxuXG4gIFRoaXMgcHJvdmlkZXMgYSBsaXN0IG9mIGljZSBzZXJ2ZXJzIHRoYXQgY2FuIGJlIHVzZWQgdG8gaGVscCBuZWdvdGlhdGUgYVxuICBjb25uZWN0aW9uIGJldHdlZW4gcGVlcnMuXG5cbiAgIyMjIyBPcHRpb25zIGZvciBQMlAgbmVnb3RpYXRpb25cblxuICBVbmRlciB0aGUgaG9vZCwgcXVpY2tjb25uZWN0IHVzZXMgdGhlXG4gIFtydGMvY291cGxlXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0YyNydGNjb3VwbGUpIGxvZ2ljLCBhbmQgdGhlIG9wdGlvbnNcbiAgcGFzc2VkIHRvIHF1aWNrY29ubmVjdCBhcmUgYWxzbyBwYXNzZWQgb250byB0aGlzIGZ1bmN0aW9uLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsaG9zdCwgb3B0cykge1xuICB2YXIgaGFzaCA9IHR5cGVvZiBsb2NhdGlvbiAhPSAndW5kZWZpbmVkJyAmJiBsb2NhdGlvbi5oYXNoLnNsaWNlKDEpO1xuICB2YXIgc2lnbmFsbGVyID0gcmVxdWlyZSgncnRjLXNpZ25hbGxlcicpKHNpZ25hbGhvc3QsIG9wdHMpO1xuXG4gIC8vIGluaXQgY29uZmlndXJhYmxlIHZhcnNcbiAgdmFyIG5zID0gKG9wdHMgfHwge30pLm5zIHx8ICcnO1xuICB2YXIgcm9vbSA9IChvcHRzIHx8IHt9KS5yb29tO1xuICB2YXIgZGVidWdnaW5nID0gKG9wdHMgfHwge30pLmRlYnVnO1xuICB2YXIgcHJvZmlsZSA9IHt9O1xuICB2YXIgYW5ub3VuY2VkID0gZmFsc2U7XG5cbiAgLy8gY29sbGVjdCB0aGUgbG9jYWwgc3RyZWFtc1xuICB2YXIgbG9jYWxTdHJlYW1zID0gW107XG5cbiAgLy8gY3JlYXRlIHRoZSBjYWxscyBtYXBcbiAgdmFyIGNhbGxzID0gc2lnbmFsbGVyLmNhbGxzID0gZ2V0YWJsZSh7fSk7XG5cbiAgLy8gY3JlYXRlIHRoZSBrbm93biBkYXRhIGNoYW5uZWxzIHJlZ2lzdHJ5XG4gIHZhciBjaGFubmVscyA9IHt9O1xuXG4gIGZ1bmN0aW9uIGNhbGxDcmVhdGUoaWQsIHBjLCBkYXRhKSB7XG4gICAgY2FsbHMuc2V0KGlkLCB7XG4gICAgICBhY3RpdmU6IGZhbHNlLFxuICAgICAgcGM6IHBjLFxuICAgICAgY2hhbm5lbHM6IGdldGFibGUoe30pLFxuICAgICAgZGF0YTogZGF0YSxcbiAgICAgIHN0cmVhbXM6IFtdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjYWxsRW5kKGlkKSB7XG4gICAgdmFyIGNhbGwgPSBjYWxscy5nZXQoaWQpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBubyBkYXRhLCB0aGVuIGRvIG5vdGhpbmdcbiAgICBpZiAoISBjYWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZGVidWcoJ2VuZGluZyBjYWxsIHRvOiAnICsgaWQpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBubyBkYXRhLCB0aGVuIHJldHVyblxuICAgIGNhbGwuY2hhbm5lbHMua2V5cygpLmZvckVhY2goZnVuY3Rpb24obGFiZWwpIHtcbiAgICAgIHZhciBhcmdzID0gW2lkLCBjYWxsLmNoYW5uZWxzLmdldChsYWJlbCksIGxhYmVsXTtcblxuICAgICAgLy8gZW1pdCB0aGUgcGxhaW4gY2hhbm5lbDpjbG9zZWQgZXZlbnRcbiAgICAgIHNpZ25hbGxlci5lbWl0LmFwcGx5KHNpZ25hbGxlciwgWydjaGFubmVsOmNsb3NlZCddLmNvbmNhdChhcmdzKSk7XG5cbiAgICAgIC8vIGVtaXQgdGhlIGxhYmVsbGVkIHZlcnNpb24gb2YgdGhlIGV2ZW50XG4gICAgICBzaWduYWxsZXIuZW1pdC5hcHBseShzaWduYWxsZXIsIFsnY2hhbm5lbDpjbG9zZWQ6JyArIGxhYmVsXS5jb25jYXQoYXJncykpO1xuICAgIH0pO1xuXG4gICAgLy8gdHJpZ2dlciBzdHJlYW06cmVtb3ZlZCBldmVudHMgZm9yIGVhY2ggb2YgdGhlIHJlbW90ZXN0cmVhbXMgaW4gdGhlIHBjXG4gICAgY2FsbC5zdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICBzaWduYWxsZXIuZW1pdCgnc3RyZWFtOnJlbW92ZWQnLCBpZCwgc3RyZWFtKTtcbiAgICB9KTtcblxuICAgIC8vIHRyaWdnZXIgdGhlIGNhbGw6ZW5kZWQgZXZlbnRcbiAgICBzaWduYWxsZXIuZW1pdCgnY2FsbDplbmRlZCcsIGlkLCBjYWxsLnBjKTtcblxuICAgIC8vIGVuc3VyZSB0aGUgcGVlciBjb25uZWN0aW9uIGlzIHByb3Blcmx5IGNsZWFuZWQgdXBcbiAgICBjbGVhbnVwKGNhbGwucGMpO1xuXG4gICAgLy8gZGVsZXRlIHRoZSBjYWxsIGRhdGFcbiAgICBjYWxscy5kZWxldGUoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gY2FsbFN0YXJ0KGlkLCBwYywgZGF0YSkge1xuICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KGlkKTtcbiAgICB2YXIgc3RyZWFtcyA9IFtdLmNvbmNhdChwYy5nZXRSZW1vdGVTdHJlYW1zKCkpO1xuXG4gICAgLy8gZmxhZyB0aGUgY2FsbCBhcyBhY3RpdmVcbiAgICBjYWxsLmFjdGl2ZSA9IHRydWU7XG4gICAgY2FsbC5zdHJlYW1zID0gW10uY29uY2F0KHBjLmdldFJlbW90ZVN0cmVhbXMoKSk7XG5cbiAgICBwYy5vbmFkZHN0cmVhbSA9IGNyZWF0ZVN0cmVhbUFkZEhhbmRsZXIoaWQpO1xuICAgIHBjLm9ucmVtb3Zlc3RyZWFtID0gY3JlYXRlU3RyZWFtUmVtb3ZlSGFuZGxlcihpZCk7XG5cbiAgICBkZWJ1ZyhzaWduYWxsZXIuaWQgKyAnIC0gJyArIGlkICsgJyBjYWxsIHN0YXJ0OiAnICsgc3RyZWFtcy5sZW5ndGggKyAnIHN0cmVhbXMnKTtcbiAgICBzaWduYWxsZXIuZW1pdCgnY2FsbDpzdGFydGVkJywgaWQsIHBjLCBkYXRhKTtcblxuICAgIC8vIGV4YW1pbmUgdGhlIGV4aXN0aW5nIHJlbW90ZSBzdHJlYW1zIGFmdGVyIGEgc2hvcnQgZGVsYXlcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgLy8gaXRlcmF0ZSB0aHJvdWdoIGFueSByZW1vdGUgc3RyZWFtc1xuICAgICAgc3RyZWFtcy5mb3JFYWNoKHJlY2VpdmVSZW1vdGVTdHJlYW0oaWQpKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVN0cmVhbUFkZEhhbmRsZXIoaWQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICBkZWJ1ZygncGVlciAnICsgaWQgKyAnIGFkZGVkIHN0cmVhbScpO1xuICAgICAgdXBkYXRlUmVtb3RlU3RyZWFtcyhpZCk7XG4gICAgICByZWNlaXZlUmVtb3RlU3RyZWFtKGlkKShldnQuc3RyZWFtKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVTdHJlYW1SZW1vdmVIYW5kbGVyKGlkKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgZGVidWcoJ3BlZXIgJyArIGlkICsgJyByZW1vdmVkIHN0cmVhbScpO1xuICAgICAgdXBkYXRlUmVtb3RlU3RyZWFtcyhpZCk7XG4gICAgICBzaWduYWxsZXIuZW1pdCgnc3RyZWFtOnJlbW92ZWQnLCBpZCwgZXZ0LnN0cmVhbSk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEFjdGl2ZUNhbGwocGVlcklkKSB7XG4gICAgdmFyIGNhbGwgPSBjYWxscy5nZXQocGVlcklkKTtcblxuICAgIGlmICghIGNhbGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gYWN0aXZlIGNhbGwgZm9yIHBlZXI6ICcgKyBwZWVySWQpO1xuICAgIH1cblxuICAgIHJldHVybiBjYWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gZ290UGVlckNoYW5uZWwoY2hhbm5lbCwgcGMsIGRhdGEpIHtcbiAgICB2YXIgY2hhbm5lbE1vbml0b3I7XG5cbiAgICBmdW5jdGlvbiBjaGFubmVsUmVhZHkoKSB7XG4gICAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChkYXRhLmlkKTtcbiAgICAgIHZhciBhcmdzID0gWyBkYXRhLmlkLCBjaGFubmVsLCBkYXRhLCBwYyBdO1xuXG4gICAgICAvLyBkZWNvdXBsZSB0aGUgY2hhbm5lbC5vbm9wZW4gbGlzdGVuZXJcbiAgICAgIGRlYnVnKCdyZXBvcnRpbmcgY2hhbm5lbCBcIicgKyBjaGFubmVsLmxhYmVsICsgJ1wiIHJlYWR5LCBoYXZlIGNhbGw6ICcgKyAoISFjYWxsKSk7XG4gICAgICBjbGVhckludGVydmFsKGNoYW5uZWxNb25pdG9yKTtcbiAgICAgIGNoYW5uZWwub25vcGVuID0gbnVsbDtcblxuICAgICAgLy8gc2F2ZSB0aGUgY2hhbm5lbFxuICAgICAgaWYgKGNhbGwpIHtcbiAgICAgICAgY2FsbC5jaGFubmVscy5zZXQoY2hhbm5lbC5sYWJlbCwgY2hhbm5lbCk7XG4gICAgICB9XG5cbiAgICAgIC8vIHRyaWdnZXIgdGhlICVjaGFubmVsLmxhYmVsJTpvcGVuIGV2ZW50XG4gICAgICBkZWJ1ZygndHJpZ2dlcmluZyBjaGFubmVsOm9wZW5lZCBldmVudHMgZm9yIGNoYW5uZWw6ICcgKyBjaGFubmVsLmxhYmVsKTtcblxuICAgICAgLy8gZW1pdCB0aGUgcGxhaW4gY2hhbm5lbDpvcGVuZWQgZXZlbnRcbiAgICAgIHNpZ25hbGxlci5lbWl0LmFwcGx5KHNpZ25hbGxlciwgWydjaGFubmVsOm9wZW5lZCddLmNvbmNhdChhcmdzKSk7XG5cbiAgICAgIC8vIGVtaXQgdGhlIGNoYW5uZWw6b3BlbmVkOiVsYWJlbCUgZXZlXG4gICAgICBzaWduYWxsZXIuZW1pdC5hcHBseShcbiAgICAgICAgc2lnbmFsbGVyLFxuICAgICAgICBbJ2NoYW5uZWw6b3BlbmVkOicgKyBjaGFubmVsLmxhYmVsXS5jb25jYXQoYXJncylcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZGVidWcoJ2NoYW5uZWwgJyArIGNoYW5uZWwubGFiZWwgKyAnIGRpc2NvdmVyZWQgZm9yIHBlZXI6ICcgKyBkYXRhLmlkKTtcbiAgICBpZiAoY2hhbm5lbC5yZWFkeVN0YXRlID09PSAnb3BlbicpIHtcbiAgICAgIHJldHVybiBjaGFubmVsUmVhZHkoKTtcbiAgICB9XG5cbiAgICBkZWJ1ZygnY2hhbm5lbCBub3QgcmVhZHksIGN1cnJlbnQgc3RhdGUgPSAnICsgY2hhbm5lbC5yZWFkeVN0YXRlKTtcbiAgICBjaGFubmVsLm9ub3BlbiA9IGNoYW5uZWxSZWFkeTtcblxuICAgIC8vIG1vbml0b3IgdGhlIGNoYW5uZWwgb3BlbiAoZG9uJ3QgdHJ1c3QgdGhlIGNoYW5uZWwgb3BlbiBldmVudCBqdXN0IHlldClcbiAgICBjaGFubmVsTW9uaXRvciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgZGVidWcoJ2NoZWNraW5nIGNoYW5uZWwgc3RhdGUsIGN1cnJlbnQgc3RhdGUgPSAnICsgY2hhbm5lbC5yZWFkeVN0YXRlKTtcbiAgICAgIGlmIChjaGFubmVsLnJlYWR5U3RhdGUgPT09ICdvcGVuJykge1xuICAgICAgICBjaGFubmVsUmVhZHkoKTtcbiAgICAgIH1cbiAgICB9LCA1MDApO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlUGVlckFubm91bmNlKGRhdGEpIHtcbiAgICB2YXIgcGM7XG4gICAgdmFyIG1vbml0b3I7XG5cbiAgICAvLyBpZiB0aGUgcm9vbSBpcyBub3QgYSBtYXRjaCwgYWJvcnRcbiAgICBpZiAoZGF0YS5yb29tICE9PSByb29tKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIGEgcGVlciBjb25uZWN0aW9uXG4gICAgcGMgPSBydGMuY3JlYXRlQ29ubmVjdGlvbihvcHRzLCAob3B0cyB8fCB7fSkuY29uc3RyYWludHMpO1xuXG4gICAgLy8gYWRkIHRoaXMgY29ubmVjdGlvbiB0byB0aGUgY2FsbHMgbGlzdFxuICAgIGNhbGxDcmVhdGUoZGF0YS5pZCwgcGMsIGRhdGEpO1xuXG4gICAgLy8gYWRkIHRoZSBsb2NhbCBzdHJlYW1zXG4gICAgbG9jYWxTdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtLCBpZHgpIHtcbiAgICAgIHBjLmFkZFN0cmVhbShzdHJlYW0pO1xuICAgIH0pO1xuXG4gICAgLy8gYWRkIHRoZSBkYXRhIGNoYW5uZWxzXG4gICAgLy8gZG8gdGhpcyBkaWZmZXJlbnRseSBiYXNlZCBvbiB3aGV0aGVyIHRoZSBjb25uZWN0aW9uIGlzIGFcbiAgICAvLyBtYXN0ZXIgb3IgYSBzbGF2ZSBjb25uZWN0aW9uXG4gICAgaWYgKHNpZ25hbGxlci5pc01hc3RlcihkYXRhLmlkKSkge1xuICAgICAgZGVidWcoJ2lzIG1hc3RlciwgY3JlYXRpbmcgZGF0YSBjaGFubmVsczogJywgT2JqZWN0LmtleXMoY2hhbm5lbHMpKTtcblxuICAgICAgLy8gY3JlYXRlIHRoZSBjaGFubmVsc1xuICAgICAgT2JqZWN0LmtleXMoY2hhbm5lbHMpLmZvckVhY2goZnVuY3Rpb24obGFiZWwpIHtcbiAgICAgICBnb3RQZWVyQ2hhbm5lbChwYy5jcmVhdGVEYXRhQ2hhbm5lbChsYWJlbCwgY2hhbm5lbHNbbGFiZWxdKSwgcGMsIGRhdGEpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcGMub25kYXRhY2hhbm5lbCA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICB2YXIgY2hhbm5lbCA9IGV2dCAmJiBldnQuY2hhbm5lbDtcblxuICAgICAgICAvLyBpZiB3ZSBoYXZlIG5vIGNoYW5uZWwsIGFib3J0XG4gICAgICAgIGlmICghIGNoYW5uZWwpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hhbm5lbHNbY2hhbm5lbC5sYWJlbF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGdvdFBlZXJDaGFubmVsKGNoYW5uZWwsIHBjLCBkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBjb3VwbGUgdGhlIGNvbm5lY3Rpb25zXG4gICAgZGVidWcoJ2NvdXBsaW5nICcgKyBzaWduYWxsZXIuaWQgKyAnIHRvICcgKyBkYXRhLmlkKTtcbiAgICBtb25pdG9yID0gcnRjLmNvdXBsZShwYywgZGF0YS5pZCwgc2lnbmFsbGVyLCBvcHRzKTtcblxuICAgIC8vIG9uY2UgYWN0aXZlLCB0cmlnZ2VyIHRoZSBwZWVyIGNvbm5lY3QgZXZlbnRcbiAgICBtb25pdG9yLm9uY2UoJ2Nvbm5lY3RlZCcsIGNhbGxTdGFydC5iaW5kKG51bGwsIGRhdGEuaWQsIHBjLCBkYXRhKSlcbiAgICBtb25pdG9yLm9uY2UoJ2Nsb3NlZCcsIGNhbGxFbmQuYmluZChudWxsLCBkYXRhLmlkKSk7XG5cbiAgICAvLyBpZiB3ZSBhcmUgdGhlIG1hc3RlciBjb25ubmVjdGlvbiwgY3JlYXRlIHRoZSBvZmZlclxuICAgIC8vIE5PVEU6IHRoaXMgb25seSByZWFsbHkgZm9yIHRoZSBzYWtlIG9mIHBvbGl0ZW5lc3MsIGFzIHJ0YyBjb3VwbGVcbiAgICAvLyBpbXBsZW1lbnRhdGlvbiBoYW5kbGVzIHRoZSBzbGF2ZSBhdHRlbXB0aW5nIHRvIGNyZWF0ZSBhbiBvZmZlclxuICAgIGlmIChzaWduYWxsZXIuaXNNYXN0ZXIoZGF0YS5pZCkpIHtcbiAgICAgIG1vbml0b3IuY3JlYXRlT2ZmZXIoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWNlaXZlUmVtb3RlU3RyZWFtKGlkKSB7XG4gICAgdmFyIGNhbGwgPSBjYWxscy5nZXQoaWQpO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgc2lnbmFsbGVyLmVtaXQoJ3N0cmVhbTphZGRlZCcsIGlkLCBzdHJlYW0sIGNhbGwgJiYgY2FsbC5kYXRhKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlUmVtb3RlU3RyZWFtcyhpZCkge1xuICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KGlkKTtcblxuICAgIGlmIChjYWxsICYmIGNhbGwucGMpIHtcbiAgICAgIGNhbGwuc3RyZWFtcyA9IFtdLmNvbmNhdChjYWxsLnBjLmdldFJlbW90ZVN0cmVhbXMoKSk7XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHJvb20gaXMgbm90IGRlZmluZWQsIHRoZW4gZ2VuZXJhdGUgdGhlIHJvb20gbmFtZVxuICBpZiAoISByb29tKSB7XG4gICAgLy8gaWYgdGhlIGhhc2ggaXMgbm90IGFzc2lnbmVkLCB0aGVuIGNyZWF0ZSBhIHJhbmRvbSBoYXNoIHZhbHVlXG4gICAgaWYgKCEgaGFzaCkge1xuICAgICAgaGFzaCA9IGxvY2F0aW9uLmhhc2ggPSAnJyArIChNYXRoLnBvdygyLCA1MykgKiBNYXRoLnJhbmRvbSgpKTtcbiAgICB9XG5cbiAgICByb29tID0gbnMgKyAnIycgKyBoYXNoO1xuICB9XG5cbiAgaWYgKGRlYnVnZ2luZykge1xuICAgIHJ0Yy5sb2dnZXIuZW5hYmxlLmFwcGx5KHJ0Yy5sb2dnZXIsIEFycmF5LmlzQXJyYXkoZGVidWcpID8gZGVidWdnaW5nIDogWycqJ10pO1xuICB9XG5cbiAgc2lnbmFsbGVyLm9uKCdwZWVyOmFubm91bmNlJywgaGFuZGxlUGVlckFubm91bmNlKTtcbiAgc2lnbmFsbGVyLm9uKCdwZWVyOmxlYXZlJywgY2FsbEVuZCk7XG5cbiAgLy8gYW5ub3VuY2Ugb3Vyc2VsdmVzIHRvIG91ciBuZXcgZnJpZW5kXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRhdGEgPSBleHRlbmQoe30sIHByb2ZpbGUsIHsgcm9vbTogcm9vbSB9KTtcblxuICAgIC8vIGFubm91bmNlIGFuZCBlbWl0IHRoZSBsb2NhbCBhbm5vdW5jZSBldmVudFxuICAgIHNpZ25hbGxlci5hbm5vdW5jZShkYXRhKTtcbiAgICBzaWduYWxsZXIuZW1pdCgnbG9jYWw6YW5ub3VuY2UnLCBkYXRhKTtcbiAgICBhbm5vdW5jZWQgPSB0cnVlO1xuICB9LCAwKTtcblxuICAvKipcbiAgICAjIyMgUXVpY2tjb25uZWN0IEJyb2FkY2FzdCBhbmQgRGF0YSBDaGFubmVsIEhlbHBlciBGdW5jdGlvbnNcblxuICAgIFRoZSBmb2xsb3dpbmcgYXJlIGZ1bmN0aW9ucyB0aGF0IGFyZSBwYXRjaGVkIGludG8gdGhlIGBydGMtc2lnbmFsbGVyYFxuICAgIGluc3RhbmNlIHRoYXQgbWFrZSB3b3JraW5nIHdpdGggYW5kIGNyZWF0aW5nIGZ1bmN0aW9uYWwgV2ViUlRDIGFwcGxpY2F0aW9uc1xuICAgIGEgbG90IHNpbXBsZXIuXG5cbiAgKiovXG5cbiAgLyoqXG4gICAgIyMjIyBhZGRTdHJlYW1cblxuICAgIGBgYFxuICAgIGFkZFN0cmVhbShzdHJlYW06TWVkaWFTdHJlYW0pID0+IHFjXG4gICAgYGBgXG5cbiAgICBBZGQgdGhlIHN0cmVhbSB0byBhY3RpdmUgY2FsbHMgYW5kIGFsc28gc2F2ZSB0aGUgc3RyZWFtIHNvIHRoYXQgaXRcbiAgICBjYW4gYmUgYWRkZWQgdG8gZnV0dXJlIGNhbGxzLlxuXG4gICoqL1xuICBzaWduYWxsZXIuYnJvYWRjYXN0ID0gc2lnbmFsbGVyLmFkZFN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIGxvY2FsU3RyZWFtcy5wdXNoKHN0cmVhbSk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGFueSBhY3RpdmUgY2FsbHMsIHRoZW4gYWRkIHRoZSBzdHJlYW1cbiAgICBjYWxscy52YWx1ZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGRhdGEucGMuYWRkU3RyZWFtKHN0cmVhbSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgY2xvc2UoKVxuXG4gICAgVGhlIGBjbG9zZWAgZnVuY3Rpb24gcHJvdmlkZXMgYSBjb252ZW5pZW50IHdheSBvZiBjbG9zaW5nIGFsbCBhc3NvY2lhdGVkXG4gICAgcGVlciBjb25uZWN0aW9ucy5cbiAgKiovXG4gIHNpZ25hbGxlci5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGVuZCBlYWNoIG9mIHRoZSBhY3RpdmUgY2FsbHNcbiAgICBjYWxscy5rZXlzKCkuZm9yRWFjaChjYWxsRW5kKTtcblxuICAgIC8vIGNhbGwgdGhlIHVuZGVybHlpbmcgc2lnbmFsbGVyLmxlYXZlIChmb3Igd2hpY2ggY2xvc2UgaXMgYW4gYWxpYXMpXG4gICAgc2lnbmFsbGVyLmxlYXZlKCk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyBjcmVhdGVEYXRhQ2hhbm5lbChsYWJlbCwgY29uZmlnKVxuXG4gICAgUmVxdWVzdCB0aGF0IGEgZGF0YSBjaGFubmVsIHdpdGggdGhlIHNwZWNpZmllZCBgbGFiZWxgIGlzIGNyZWF0ZWQgb25cbiAgICB0aGUgcGVlciBjb25uZWN0aW9uLiAgV2hlbiB0aGUgZGF0YSBjaGFubmVsIGlzIG9wZW4gYW5kIGF2YWlsYWJsZSwgYW5cbiAgICBldmVudCB3aWxsIGJlIHRyaWdnZXJlZCB1c2luZyB0aGUgbGFiZWwgb2YgdGhlIGRhdGEgY2hhbm5lbC5cblxuICAgIEZvciBleGFtcGxlLCBpZiBhIG5ldyBkYXRhIGNoYW5uZWwgd2FzIHJlcXVlc3RlZCB1c2luZyB0aGUgZm9sbG93aW5nXG4gICAgY2FsbDpcblxuICAgIGBgYGpzXG4gICAgdmFyIHFjID0gcXVpY2tjb25uZWN0KCdodHRwOi8vcnRjLmlvL3N3aXRjaGJvYXJkJykuY3JlYXRlRGF0YUNoYW5uZWwoJ3Rlc3QnKTtcbiAgICBgYGBcblxuICAgIFRoZW4gd2hlbiB0aGUgZGF0YSBjaGFubmVsIGlzIHJlYWR5IGZvciB1c2UsIGEgYHRlc3Q6b3BlbmAgZXZlbnQgd291bGRcbiAgICBiZSBlbWl0dGVkIGJ5IGBxY2AuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5jcmVhdGVEYXRhQ2hhbm5lbCA9IGZ1bmN0aW9uKGxhYmVsLCBvcHRzKSB7XG4gICAgLy8gY3JlYXRlIGEgY2hhbm5lbCBvbiBhbGwgZXhpc3RpbmcgY2FsbHNcbiAgICBjYWxscy5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbihwZWVySWQpIHtcbiAgICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KHBlZXJJZCk7XG4gICAgICB2YXIgZGM7XG5cbiAgICAgIC8vIGlmIHdlIGFyZSB0aGUgbWFzdGVyIGNvbm5lY3Rpb24sIGNyZWF0ZSB0aGUgZGF0YSBjaGFubmVsXG4gICAgICBpZiAoY2FsbCAmJiBjYWxsLnBjICYmIHNpZ25hbGxlci5pc01hc3RlcihwZWVySWQpKSB7XG4gICAgICAgIGRjID0gY2FsbC5wYy5jcmVhdGVEYXRhQ2hhbm5lbChsYWJlbCwgb3B0cyk7XG4gICAgICAgIGdvdFBlZXJDaGFubmVsKGRjLCBjYWxsLnBjLCBjYWxsLmRhdGEpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gc2F2ZSB0aGUgZGF0YSBjaGFubmVsIG9wdHMgaW4gdGhlIGxvY2FsIGNoYW5uZWxzIGRpY3Rpb25hcnlcbiAgICBjaGFubmVsc1tsYWJlbF0gPSBvcHRzIHx8IG51bGw7XG5cbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgcmVhY3RpdmUoKVxuXG4gICAgRmxhZyB0aGF0IHRoaXMgc2Vzc2lvbiB3aWxsIGJlIGEgcmVhY3RpdmUgY29ubmVjdGlvbi5cblxuICAqKi9cbiAgc2lnbmFsbGVyLnJlYWN0aXZlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gYWRkIHRoZSByZWFjdGl2ZSBmbGFnXG4gICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgb3B0cy5yZWFjdGl2ZSA9IHRydWU7XG5cbiAgICAvLyBjaGFpblxuICAgIHJldHVybiBzaWduYWxsZXI7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyByZW1vdmVTdHJlYW1cblxuICAgIGBgYFxuICAgIHJlbW92ZVN0cmVhbShzdHJlYW06TWVkaWFTdHJlYW0pXG4gICAgYGBgXG5cbiAgICBSZW1vdmUgdGhlIHNwZWNpZmllZCBzdHJlYW0gZnJvbSBib3RoIHRoZSBsb2NhbCBzdHJlYW1zIHRoYXQgYXJlIHRvXG4gICAgYmUgY29ubmVjdGVkIHRvIG5ldyBwZWVycywgYW5kIGFsc28gZnJvbSBhbnkgYWN0aXZlIGNhbGxzLlxuXG4gICoqL1xuICBzaWduYWxsZXIucmVtb3ZlU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgdmFyIGxvY2FsSW5kZXggPSBsb2NhbFN0cmVhbXMuaW5kZXhPZihzdHJlYW0pO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBzdHJlYW0gZnJvbSBhbnkgYWN0aXZlIGNhbGxzXG4gICAgY2FsbHMudmFsdWVzKCkuZm9yRWFjaChmdW5jdGlvbihjYWxsKSB7XG4gICAgICBjYWxsLnBjLnJlbW92ZVN0cmVhbShzdHJlYW0pO1xuICAgIH0pO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBzdHJlYW0gZnJvbSB0aGUgbG9jYWxTdHJlYW1zIGFycmF5XG4gICAgaWYgKGxvY2FsSW5kZXggPj0gMCkge1xuICAgICAgbG9jYWxTdHJlYW1zLnNwbGljZShsb2NhbEluZGV4LCAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgcmVxdWVzdENoYW5uZWxcblxuICAgIGBgYFxuICAgIHJlcXVlc3RDaGFubmVsKHRhcmdldElkLCBsYWJlbCwgY2FsbGJhY2spXG4gICAgYGBgXG5cbiAgICBUaGlzIGlzIGEgZnVuY3Rpb24gdGhhdCBjYW4gYmUgdXNlZCB0byByZXNwb25kIHRvIHJlbW90ZSBwZWVycyBzdXBwbHlpbmdcbiAgICBhIGRhdGEgY2hhbm5lbCBhcyBwYXJ0IG9mIHRoZWlyIGNvbmZpZ3VyYXRpb24uICBBcyBwZXIgdGhlIGByZWNlaXZlU3RyZWFtYFxuICAgIGZ1bmN0aW9uIHRoaXMgZnVuY3Rpb24gd2lsbCBlaXRoZXIgZmlyZSB0aGUgY2FsbGJhY2sgaW1tZWRpYXRlbHkgaWYgdGhlXG4gICAgY2hhbm5lbCBpcyBhbHJlYWR5IGF2YWlsYWJsZSwgb3Igb25jZSB0aGUgY2hhbm5lbCBoYXMgYmVlbiBkaXNjb3ZlcmVkIG9uXG4gICAgdGhlIGNhbGwuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5yZXF1ZXN0Q2hhbm5lbCA9IGZ1bmN0aW9uKHRhcmdldElkLCBsYWJlbCwgY2FsbGJhY2spIHtcbiAgICB2YXIgY2FsbCA9IGdldEFjdGl2ZUNhbGwodGFyZ2V0SWQpO1xuICAgIHZhciBjaGFubmVsID0gY2FsbCAmJiBjYWxsLmNoYW5uZWxzLmdldChsYWJlbCk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIHRoZW4gY2hhbm5lbCB0cmlnZ2VyIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseVxuICAgIGlmIChjaGFubmVsKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBjaGFubmVsKTtcbiAgICAgIHJldHVybiBzaWduYWxsZXI7XG4gICAgfVxuXG4gICAgLy8gaWYgbm90LCB3YWl0IGZvciBpdFxuICAgIHNpZ25hbGxlci5vbmNlKCdjaGFubmVsOm9wZW5lZDonICsgbGFiZWwsIGZ1bmN0aW9uKGlkLCBkYykge1xuICAgICAgY2FsbGJhY2sobnVsbCwgZGMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIHJlcXVlc3RTdHJlYW1cblxuICAgIGBgYFxuICAgIHJlcXVlc3RTdHJlYW0odGFyZ2V0SWQsIGlkeCwgY2FsbGJhY2spXG4gICAgYGBgXG5cbiAgICBVc2VkIHRvIHJlcXVlc3QgYSByZW1vdGUgc3RyZWFtIGZyb20gYSBxdWlja2Nvbm5lY3QgaW5zdGFuY2UuIElmIHRoZVxuICAgIHN0cmVhbSBpcyBhbHJlYWR5IGF2YWlsYWJsZSBpbiB0aGUgY2FsbHMgcmVtb3RlIHN0cmVhbXMsIHRoZW4gdGhlIGNhbGxiYWNrXG4gICAgd2lsbCBiZSB0cmlnZ2VyZWQgaW1tZWRpYXRlbHksIG90aGVyd2lzZSB0aGlzIGZ1bmN0aW9uIHdpbGwgbW9uaXRvclxuICAgIGBzdHJlYW06YWRkZWRgIGV2ZW50cyBhbmQgd2FpdCBmb3IgYSBtYXRjaC5cblxuICAgIEluIHRoZSBjYXNlIHRoYXQgYW4gdW5rbm93biB0YXJnZXQgaXMgcmVxdWVzdGVkLCB0aGVuIGFuIGV4Y2VwdGlvbiB3aWxsXG4gICAgYmUgdGhyb3duLlxuICAqKi9cbiAgc2lnbmFsbGVyLnJlcXVlc3RTdHJlYW0gPSBmdW5jdGlvbih0YXJnZXRJZCwgaWR4LCBjYWxsYmFjaykge1xuICAgIHZhciBjYWxsID0gZ2V0QWN0aXZlQ2FsbCh0YXJnZXRJZCk7XG4gICAgdmFyIHN0cmVhbTtcblxuICAgIGZ1bmN0aW9uIHdhaXRGb3JTdHJlYW0ocGVlcklkKSB7XG4gICAgICBpZiAocGVlcklkICE9PSB0YXJnZXRJZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGdldCB0aGUgc3RyZWFtXG4gICAgICBzdHJlYW0gPSBjYWxsLnBjLmdldFJlbW90ZVN0cmVhbXMoKVtpZHhdO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIHRoZSBzdHJlYW0sIHRoZW4gcmVtb3ZlIHRoZSBsaXN0ZW5lciBhbmQgdHJpZ2dlciB0aGUgY2JcbiAgICAgIGlmIChzdHJlYW0pIHtcbiAgICAgICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdzdHJlYW06YWRkZWQnLCB3YWl0Rm9yU3RyZWFtKTtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgc3RyZWFtKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBsb29rIGZvciB0aGUgc3RyZWFtIGluIHRoZSByZW1vdGUgc3RyZWFtcyBvZiB0aGUgY2FsbFxuICAgIHN0cmVhbSA9IGNhbGwucGMuZ2V0UmVtb3RlU3RyZWFtcygpW2lkeF07XG5cbiAgICAvLyBpZiB3ZSBmb3VuZCB0aGUgc3RyZWFtIHRoZW4gdHJpZ2dlciB0aGUgY2FsbGJhY2tcbiAgICBpZiAoc3RyZWFtKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBzdHJlYW0pO1xuICAgICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgICB9XG5cbiAgICAvLyBvdGhlcndpc2Ugd2FpdCBmb3IgdGhlIHN0cmVhbVxuICAgIHNpZ25hbGxlci5vbignc3RyZWFtOmFkZGVkJywgd2FpdEZvclN0cmVhbSk7XG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIHByb2ZpbGUoZGF0YSlcblxuICAgIFVwZGF0ZSB0aGUgcHJvZmlsZSBkYXRhIHdpdGggdGhlIGF0dGFjaGVkIGluZm9ybWF0aW9uLCBzbyB3aGVuXG4gICAgdGhlIHNpZ25hbGxlciBhbm5vdW5jZXMgaXQgaW5jbHVkZXMgdGhpcyBkYXRhIGluIGFkZGl0aW9uIHRvIGFueVxuICAgIHJvb20gYW5kIGlkIGluZm9ybWF0aW9uLlxuXG4gICoqL1xuICBzaWduYWxsZXIucHJvZmlsZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBleHRlbmQocHJvZmlsZSwgZGF0YSk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGFscmVhZHkgYW5ub3VuY2VkLCB0aGVuIHJlYW5ub3VuY2Ugb3VyIHByb2ZpbGUgdG8gcHJvdmlkZVxuICAgIC8vIG90aGVycyBhIGBwZWVyOnVwZGF0ZWAgZXZlbnRcbiAgICBpZiAoYW5ub3VuY2VkKSB7XG4gICAgICBzaWduYWxsZXIuYW5ub3VuY2UocHJvZmlsZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIHdhaXRGb3JDYWxsXG5cbiAgICBgYGBcbiAgICB3YWl0Rm9yQ2FsbCh0YXJnZXRJZCwgY2FsbGJhY2spXG4gICAgYGBgXG5cbiAgICBXYWl0IGZvciBhIGNhbGwgZnJvbSB0aGUgc3BlY2lmaWVkIHRhcmdldElkLiAgSWYgdGhlIGNhbGwgaXMgYWxyZWFkeVxuICAgIGFjdGl2ZSB0aGUgY2FsbGJhY2sgd2lsbCBiZSBmaXJlZCBpbW1lZGlhdGVseSwgb3RoZXJ3aXNlIHdlIHdpbGwgd2FpdFxuICAgIGZvciBhIGBjYWxsOnN0YXJ0ZWRgIGV2ZW50IHRoYXQgbWF0Y2hlcyB0aGUgcmVxdWVzdGVkIGB0YXJnZXRJZGBcblxuICAqKi9cbiAgc2lnbmFsbGVyLndhaXRGb3JDYWxsID0gZnVuY3Rpb24odGFyZ2V0SWQsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGNhbGwgPSBjYWxscy5nZXQodGFyZ2V0SWQpO1xuXG4gICAgaWYgKGNhbGwgJiYgY2FsbC5hY3RpdmUpIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIGNhbGwucGMpO1xuICAgICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgICB9XG5cbiAgICBzaWduYWxsZXIub24oJ2NhbGw6c3RhcnRlZCcsIGZ1bmN0aW9uIGhhbmRsZU5ld0NhbGwoaWQpIHtcbiAgICAgIGlmIChpZCA9PT0gdGFyZ2V0SWQpIHtcbiAgICAgICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdjYWxsOnN0YXJ0ZWQnLCBoYW5kbGVOZXdDYWxsKTtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgY2FsbHMuZ2V0KGlkKS5wYyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gcGFzcyB0aGUgc2lnbmFsbGVyIG9uXG4gIHJldHVybiBzaWduYWxsZXI7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIkZXYUFTSFwiKSkiLCJ2YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG1lc3Nlbmdlciwgb3B0cykge1xuICByZXR1cm4gcmVxdWlyZSgnLi9pbmRleC5qcycpKG1lc3NlbmdlciwgZXh0ZW5kKHtcbiAgICBjb25uZWN0OiByZXF1aXJlKCcuL3ByaW11cy1sb2FkZXInKVxuICB9LCBvcHRzKSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8vIG1lc3NlbmdlciBldmVudHNcbiAgZGF0YUV2ZW50OiAnZGF0YScsXG4gIG9wZW5FdmVudDogJ29wZW4nLFxuICBjbG9zZUV2ZW50OiAnY2xvc2UnLFxuXG4gIC8vIG1lc3NlbmdlciBmdW5jdGlvbnNcbiAgd3JpdGVNZXRob2Q6ICd3cml0ZScsXG4gIGNsb3NlTWV0aG9kOiAnY2xvc2UnLFxuXG4gIC8vIGxlYXZlIHRpbWVvdXQgKG1zKVxuICBsZWF2ZVRpbWVvdXQ6IDMwMDBcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdydGMtc2lnbmFsbGVyJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xudmFyIHJvbGVzID0gWydhJywgJ2InXTtcblxuLyoqXG4gICMjIyMgYW5ub3VuY2VcblxuICBgYGBcbiAgL2Fubm91bmNlfCVtZXRhZGF0YSV8e1wiaWRcIjogXCIuLi5cIiwgLi4uIH1cbiAgYGBgXG5cbiAgV2hlbiBhbiBhbm5vdW5jZSBtZXNzYWdlIGlzIHJlY2VpdmVkIGJ5IHRoZSBzaWduYWxsZXIsIHRoZSBhdHRhY2hlZFxuICBvYmplY3QgZGF0YSBpcyBkZWNvZGVkIGFuZCB0aGUgc2lnbmFsbGVyIGVtaXRzIGFuIGBhbm5vdW5jZWAgbWVzc2FnZS5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNpZ25hbGxlcikge1xuXG4gIGZ1bmN0aW9uIGNvcHlEYXRhKHRhcmdldCwgc291cmNlKSB7XG4gICAgaWYgKHRhcmdldCAmJiBzb3VyY2UpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgZnVuY3Rpb24gZGF0YUFsbG93ZWQoZGF0YSkge1xuICAgIHZhciBldnQgPSB7XG4gICAgICBkYXRhOiBkYXRhLFxuICAgICAgYWxsb3c6IHRydWVcbiAgICB9O1xuXG4gICAgc2lnbmFsbGVyLmVtaXQoJ3BlZXI6ZmlsdGVyJywgZXZ0KTtcblxuICAgIHJldHVybiBldnQuYWxsb3c7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oYXJncywgbWVzc2FnZVR5cGUsIHNyY0RhdGEsIHNyY1N0YXRlLCBpc0RNKSB7XG4gICAgdmFyIGRhdGEgPSBhcmdzWzBdO1xuICAgIHZhciBwZWVyO1xuXG4gICAgZGVidWcoJ2Fubm91bmNlIGhhbmRsZXIgaW52b2tlZCwgcmVjZWl2ZWQgZGF0YTogJywgZGF0YSk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIHZhbGlkIGRhdGEgdGhlbiBwcm9jZXNzXG4gICAgaWYgKGRhdGEgJiYgZGF0YS5pZCAmJiBkYXRhLmlkICE9PSBzaWduYWxsZXIuaWQpIHtcbiAgICAgIGlmICghIGRhdGFBbGxvd2VkKGRhdGEpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIGNoZWNrIHRvIHNlZSBpZiB0aGlzIGlzIGEga25vd24gcGVlclxuICAgICAgcGVlciA9IHNpZ25hbGxlci5wZWVycy5nZXQoZGF0YS5pZCk7XG5cbiAgICAgIC8vIHRyaWdnZXIgdGhlIHBlZXIgY29ubmVjdGVkIGV2ZW50IHRvIGZsYWcgdGhhdCB3ZSBrbm93IGFib3V0IGFcbiAgICAgIC8vIHBlZXIgY29ubmVjdGlvbi4gVGhlIHBlZXIgaGFzIHBhc3NlZCB0aGUgXCJmaWx0ZXJcIiBjaGVjayBidXQgbWF5XG4gICAgICAvLyBiZSBhbm5vdW5jZWQgLyB1cGRhdGVkIGRlcGVuZGluZyBvbiBwcmV2aW91cyBjb25uZWN0aW9uIHN0YXR1c1xuICAgICAgc2lnbmFsbGVyLmVtaXQoJ3BlZXI6Y29ubmVjdGVkJywgZGF0YS5pZCwgZGF0YSk7XG5cbiAgICAgIC8vIGlmIHRoZSBwZWVyIGlzIGV4aXN0aW5nLCB0aGVuIHVwZGF0ZSB0aGUgZGF0YVxuICAgICAgaWYgKHBlZXIgJiYgKCEgcGVlci5pbmFjdGl2ZSkpIHtcbiAgICAgICAgZGVidWcoJ3NpZ25hbGxlcjogJyArIHNpZ25hbGxlci5pZCArICcgcmVjZWl2ZWQgdXBkYXRlLCBkYXRhOiAnLCBkYXRhKTtcblxuICAgICAgICAvLyB1cGRhdGUgdGhlIGRhdGFcbiAgICAgICAgY29weURhdGEocGVlci5kYXRhLCBkYXRhKTtcblxuICAgICAgICAvLyB0cmlnZ2VyIHRoZSBwZWVyIHVwZGF0ZSBldmVudFxuICAgICAgICByZXR1cm4gc2lnbmFsbGVyLmVtaXQoJ3BlZXI6dXBkYXRlJywgZGF0YSwgc3JjRGF0YSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGNyZWF0ZSBhIG5ldyBwZWVyXG4gICAgICBwZWVyID0ge1xuICAgICAgICBpZDogZGF0YS5pZCxcblxuICAgICAgICAvLyBpbml0aWFsaXNlIHRoZSBsb2NhbCByb2xlIGluZGV4XG4gICAgICAgIHJvbGVJZHg6IFtkYXRhLmlkLCBzaWduYWxsZXIuaWRdLnNvcnQoKS5pbmRleE9mKGRhdGEuaWQpLFxuXG4gICAgICAgIC8vIGluaXRpYWxpc2UgdGhlIHBlZXIgZGF0YVxuICAgICAgICBkYXRhOiB7fVxuICAgICAgfTtcblxuICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgcGVlciBkYXRhXG4gICAgICBjb3B5RGF0YShwZWVyLmRhdGEsIGRhdGEpO1xuXG4gICAgICAvLyByZXNldCBpbmFjdGl2aXR5IHN0YXRlXG4gICAgICBjbGVhclRpbWVvdXQocGVlci5sZWF2ZVRpbWVyKTtcbiAgICAgIHBlZXIuaW5hY3RpdmUgPSBmYWxzZTtcblxuICAgICAgLy8gc2V0IHRoZSBwZWVyIGRhdGFcbiAgICAgIHNpZ25hbGxlci5wZWVycy5zZXQoZGF0YS5pZCwgcGVlcik7XG5cbiAgICAgIC8vIGlmIHRoaXMgaXMgYW4gaW5pdGlhbCBhbm5vdW5jZSBtZXNzYWdlIChubyB2ZWN0b3IgY2xvY2sgYXR0YWNoZWQpXG4gICAgICAvLyB0aGVuIHNlbmQgYSBhbm5vdW5jZSByZXBseVxuICAgICAgaWYgKHNpZ25hbGxlci5hdXRvcmVwbHkgJiYgKCEgaXNETSkpIHtcbiAgICAgICAgc2lnbmFsbGVyXG4gICAgICAgICAgLnRvKGRhdGEuaWQpXG4gICAgICAgICAgLnNlbmQoJy9hbm5vdW5jZScsIHNpZ25hbGxlci5hdHRyaWJ1dGVzKTtcbiAgICAgIH1cblxuICAgICAgLy8gZW1pdCBhIG5ldyBwZWVyIGFubm91bmNlIGV2ZW50XG4gICAgICByZXR1cm4gc2lnbmFsbGVyLmVtaXQoJ3BlZXI6YW5ub3VuY2UnLCBkYXRhLCBwZWVyKTtcbiAgICB9XG4gIH07XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyMgc2lnbmFsbGVyIG1lc3NhZ2UgaGFuZGxlcnNcblxuKiovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyLCBvcHRzKSB7XG4gIHJldHVybiB7XG4gICAgYW5ub3VuY2U6IHJlcXVpcmUoJy4vYW5ub3VuY2UnKShzaWduYWxsZXIsIG9wdHMpLFxuICAgIGxlYXZlOiByZXF1aXJlKCcuL2xlYXZlJykoc2lnbmFsbGVyLCBvcHRzKVxuICB9O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMjIyBsZWF2ZVxuXG4gIGBgYFxuICAvbGVhdmV8e1wiaWRcIjpcIi4uLlwifVxuICBgYGBcblxuICBXaGVuIGEgbGVhdmUgbWVzc2FnZSBpcyByZWNlaXZlZCBmcm9tIGEgcGVlciwgd2UgY2hlY2sgdG8gc2VlIGlmIHRoYXQgaXNcbiAgYSBwZWVyIHRoYXQgd2UgYXJlIG1hbmFnaW5nIHN0YXRlIGluZm9ybWF0aW9uIGZvciBhbmQgaWYgd2UgYXJlIHRoZW4gdGhlXG4gIHBlZXIgc3RhdGUgaXMgcmVtb3ZlZC5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNpZ25hbGxlciwgb3B0cykge1xuICByZXR1cm4gZnVuY3Rpb24oYXJncykge1xuICAgIHZhciBkYXRhID0gYXJnc1swXTtcbiAgICB2YXIgcGVlciA9IHNpZ25hbGxlci5wZWVycy5nZXQoZGF0YSAmJiBkYXRhLmlkKTtcblxuICAgIGlmIChwZWVyKSB7XG4gICAgICAvLyBzdGFydCB0aGUgaW5hY3Rpdml0eSB0aW1lclxuICAgICAgcGVlci5sZWF2ZVRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgcGVlci5pbmFjdGl2ZSA9IHRydWU7XG4gICAgICAgIHNpZ25hbGxlci5lbWl0KCdwZWVyOmxlYXZlJywgZGF0YS5pZCwgcGVlcik7XG4gICAgICB9LCBvcHRzLmxlYXZlVGltZW91dCk7XG4gICAgfVxuXG4gICAgLy8gZW1pdCB0aGUgZXZlbnRcbiAgICBzaWduYWxsZXIuZW1pdCgncGVlcjpkaXNjb25uZWN0ZWQnLCBkYXRhLmlkLCBwZWVyKTtcbiAgfTtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdydGMtc2lnbmFsbGVyJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMycpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnY29nL2RlZmF1bHRzJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xudmFyIHRocm90dGxlID0gcmVxdWlyZSgnY29nL3Rocm90dGxlJyk7XG52YXIgZ2V0YWJsZSA9IHJlcXVpcmUoJ2NvZy9nZXRhYmxlJyk7XG52YXIgdXVpZCA9IHJlcXVpcmUoJy4vdXVpZCcpO1xuXG4vLyBpbml0aWFsaXNlIHRoZSBsaXN0IG9mIHZhbGlkIFwid3JpdGVcIiBtZXRob2RzXG52YXIgV1JJVEVfTUVUSE9EUyA9IFsnd3JpdGUnLCAnc2VuZCddO1xudmFyIENMT1NFX01FVEhPRFMgPSBbJ2Nsb3NlJywgJ2VuZCddO1xuXG4vLyBpbml0aWFsaXNlIHNpZ25hbGxlciBtZXRhZGF0YSBzbyB3ZSBkb24ndCBoYXZlIHRvIGluY2x1ZGUgdGhlIHBhY2thZ2UuanNvblxuLy8gVE9ETzogbWFrZSB0aGlzIGNoZWNrYWJsZSB3aXRoIHNvbWUga2luZCBvZiBwcmVwdWJsaXNoIHNjcmlwdFxudmFyIG1ldGFkYXRhID0ge1xuICB2ZXJzaW9uOiAnMi4zLjAnXG59O1xuXG4vKipcbiAgIyBydGMtc2lnbmFsbGVyXG5cbiAgVGhlIGBydGMtc2lnbmFsbGVyYCBtb2R1bGUgcHJvdmlkZXMgYSB0cmFuc3BvcnRsZXNzIHNpZ25hbGxpbmdcbiAgbWVjaGFuaXNtIGZvciBXZWJSVEMuXG5cbiAgIyMgUHVycG9zZVxuXG4gIDw8PCBkb2NzL3B1cnBvc2UubWRcblxuICAjIyBHZXR0aW5nIFN0YXJ0ZWRcblxuICBXaGlsZSB0aGUgc2lnbmFsbGVyIGlzIGNhcGFibGUgb2YgY29tbXVuaWNhdGluZyBieSBhIG51bWJlciBvZiBkaWZmZXJlbnRcbiAgbWVzc2VuZ2VycyAoaS5lLiBhbnl0aGluZyB0aGF0IGNhbiBzZW5kIGFuZCByZWNlaXZlIG1lc3NhZ2VzIG92ZXIgYSB3aXJlKVxuICBpdCBjb21lcyB3aXRoIHN1cHBvcnQgZm9yIHVuZGVyc3RhbmRpbmcgaG93IHRvIGNvbm5lY3QgdG8gYW5cbiAgW3J0Yy1zd2l0Y2hib2FyZF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc3dpdGNoYm9hcmQpIG91dCBvZiB0aGUgYm94LlxuXG4gIFRoZSBmb2xsb3dpbmcgY29kZSBzYW1wbGUgZGVtb25zdHJhdGVzIGhvdzpcblxuICA8PDwgZXhhbXBsZXMvZ2V0dGluZy1zdGFydGVkLmpzXG5cbiAgPDw8IGRvY3MvZXZlbnRzLm1kXG5cbiAgPDw8IGRvY3Mvc2lnbmFsZmxvdy1kaWFncmFtcy5tZFxuXG4gICMjIFJlZmVyZW5jZVxuXG4gIFRoZSBgcnRjLXNpZ25hbGxlcmAgbW9kdWxlIGlzIGRlc2lnbmVkIHRvIGJlIHVzZWQgcHJpbWFyaWx5IGluIGEgZnVuY3Rpb25hbFxuICB3YXkgYW5kIHdoZW4gY2FsbGVkIGl0IGNyZWF0ZXMgYSBuZXcgc2lnbmFsbGVyIHRoYXQgd2lsbCBlbmFibGVcbiAgeW91IHRvIGNvbW11bmljYXRlIHdpdGggb3RoZXIgcGVlcnMgdmlhIHlvdXIgbWVzc2FnaW5nIG5ldHdvcmsuXG5cbiAgYGBganNcbiAgLy8gY3JlYXRlIGEgc2lnbmFsbGVyIGZyb20gc29tZXRoaW5nIHRoYXQga25vd3MgaG93IHRvIHNlbmQgbWVzc2FnZXNcbiAgdmFyIHNpZ25hbGxlciA9IHJlcXVpcmUoJ3J0Yy1zaWduYWxsZXInKShtZXNzZW5nZXIpO1xuICBgYGBcblxuICBBcyBkZW1vbnN0cmF0ZWQgaW4gdGhlIGdldHRpbmcgc3RhcnRlZCBndWlkZSwgeW91IGNhbiBhbHNvIHBhc3MgdGhyb3VnaFxuICBhIHN0cmluZyB2YWx1ZSBpbnN0ZWFkIG9mIGEgbWVzc2VuZ2VyIGluc3RhbmNlIGlmIHlvdSBzaW1wbHkgd2FudCB0b1xuICBjb25uZWN0IHRvIGFuIGV4aXN0aW5nIGBydGMtc3dpdGNoYm9hcmRgIGluc3RhbmNlLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obWVzc2VuZ2VyLCBvcHRzKSB7XG4gIC8vIGdldCB0aGUgYXV0b3JlcGx5IHNldHRpbmdcbiAgdmFyIGF1dG9yZXBseSA9IChvcHRzIHx8IHt9KS5hdXRvcmVwbHk7XG4gIHZhciBjb25uZWN0ID0gKG9wdHMgfHwge30pLmNvbm5lY3Q7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgbWV0YWRhdGFcbiAgdmFyIGxvY2FsTWV0YSA9IHt9O1xuXG4gIC8vIGNyZWF0ZSB0aGUgc2lnbmFsbGVyXG4gIHZhciBzaWduYWxsZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgaWRcbiAgdmFyIGlkID0gc2lnbmFsbGVyLmlkID0gKG9wdHMgfHwge30pLmlkIHx8IHV1aWQoKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBhdHRyaWJ1dGVzXG4gIHZhciBhdHRyaWJ1dGVzID0gc2lnbmFsbGVyLmF0dHJpYnV0ZXMgPSB7XG4gICAgYnJvd3NlcjogZGV0ZWN0LmJyb3dzZXIsXG4gICAgYnJvd3NlclZlcnNpb246IGRldGVjdC5icm93c2VyVmVyc2lvbixcbiAgICBpZDogaWQsXG4gICAgYWdlbnQ6ICdzaWduYWxsZXJAJyArIG1ldGFkYXRhLnZlcnNpb25cbiAgfTtcblxuICAvLyBjcmVhdGUgdGhlIHBlZXJzIG1hcFxuICB2YXIgcGVlcnMgPSBzaWduYWxsZXIucGVlcnMgPSBnZXRhYmxlKHt9KTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBkYXRhIGV2ZW50IG5hbWVcblxuICB2YXIgY29ubmVjdGVkID0gZmFsc2U7XG4gIHZhciB3cml0ZTtcbiAgdmFyIGNsb3NlO1xuICB2YXIgcHJvY2Vzc29yO1xuICB2YXIgYW5ub3VuY2VUaW1lciA9IDA7XG5cbiAgZnVuY3Rpb24gYW5ub3VuY2VPblJlY29ubmVjdCgpIHtcbiAgICBzaWduYWxsZXIuYW5ub3VuY2UoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJpbmRCcm93c2VyRXZlbnRzKCkge1xuICAgIG1lc3Nlbmdlci5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICBwcm9jZXNzb3IoZXZ0LmRhdGEpO1xuICAgIH0pO1xuXG4gICAgbWVzc2VuZ2VyLmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCBmdW5jdGlvbihldnQpIHtcbiAgICAgIGNvbm5lY3RlZCA9IHRydWU7XG4gICAgICBzaWduYWxsZXIuZW1pdCgnb3BlbicpO1xuICAgICAgc2lnbmFsbGVyLmVtaXQoJ2Nvbm5lY3RlZCcpO1xuICAgIH0pO1xuXG4gICAgbWVzc2VuZ2VyLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICBjb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgIHNpZ25hbGxlci5lbWl0KCdkaXNjb25uZWN0ZWQnKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJpbmRFdmVudHMoKSB7XG4gICAgLy8gaWYgd2UgZG9uJ3QgaGF2ZSBhbiBvbiBmdW5jdGlvbiBmb3IgdGhlIG1lc3NlbmdlciwgdGhlbiBkbyBub3RoaW5nXG4gICAgaWYgKHR5cGVvZiBtZXNzZW5nZXIub24gIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGhhbmRsZSBtZXNzYWdlIGRhdGEgZXZlbnRzXG4gICAgbWVzc2VuZ2VyLm9uKG9wdHMuZGF0YUV2ZW50LCBwcm9jZXNzb3IpO1xuXG4gICAgLy8gd2hlbiB0aGUgY29ubmVjdGlvbiBpcyBvcGVuLCB0aGVuIGVtaXQgYW4gb3BlbiBldmVudCBhbmQgYSBjb25uZWN0ZWQgZXZlbnRcbiAgICBtZXNzZW5nZXIub24ob3B0cy5vcGVuRXZlbnQsIGZ1bmN0aW9uKCkge1xuICAgICAgY29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgIHNpZ25hbGxlci5lbWl0KCdvcGVuJyk7XG4gICAgICBzaWduYWxsZXIuZW1pdCgnY29ubmVjdGVkJyk7XG4gICAgfSk7XG5cbiAgICBtZXNzZW5nZXIub24ob3B0cy5jbG9zZUV2ZW50LCBmdW5jdGlvbigpIHtcbiAgICAgIGNvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgc2lnbmFsbGVyLmVtaXQoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY29ubmVjdFRvSG9zdCh1cmwpIHtcbiAgICBpZiAodHlwZW9mIGNvbm5lY3QgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHNpZ25hbGxlci5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignbm8gY29ubmVjdCBmdW5jdGlvbicpKTtcbiAgICB9XG5cbiAgICAvLyBsb2FkIHByaW11c1xuICAgIGNvbm5lY3QodXJsLCBmdW5jdGlvbihlcnIsIHNvY2tldCkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gc2lnbmFsbGVyLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIH1cblxuICAgICAgLy8gY3JlYXRlIHRoZSBhY3R1YWwgbWVzc2VuZ2VyIGZyb20gYSBwcmltdXMgY29ubmVjdGlvblxuICAgICAgc2lnbmFsbGVyLl9tZXNzZW5nZXIgPSBtZXNzZW5nZXIgPSBzb2NrZXQuY29ubmVjdCh1cmwpO1xuXG4gICAgICAvLyBub3cgaW5pdFxuICAgICAgaW5pdCgpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRGF0YUxpbmUoYXJncykge1xuICAgIHJldHVybiBhcmdzLm1hcChwcmVwYXJlQXJnKS5qb2luKCd8Jyk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVNZXRhZGF0YSgpIHtcbiAgICByZXR1cm4gZXh0ZW5kKHt9LCBsb2NhbE1ldGEsIHsgaWQ6IHNpZ25hbGxlci5pZCB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV4dHJhY3RQcm9wKG5hbWUpIHtcbiAgICByZXR1cm4gbWVzc2VuZ2VyW25hbWVdO1xuICB9XG5cbiAgLy8gYXR0ZW1wdCB0byBkZXRlY3Qgd2hldGhlciB0aGUgdW5kZXJseWluZyBtZXNzZW5nZXIgaXMgY2xvc2luZ1xuICAvLyB0aGlzIGNhbiBiZSB0b3VnaCBhcyB3ZSBkZWFsIHdpdGggYm90aCBuYXRpdmUgKG9yIHNpbXVsYXRlZCBuYXRpdmUpXG4gIC8vIHNvY2tldHMgb3IgYW4gYWJzdHJhY3Rpb24gbGF5ZXIgc3VjaCBhcyBwcmltdXNcbiAgZnVuY3Rpb24gaXNDbG9zaW5nKCkge1xuICAgIHZhciBpc0Fic3RyYWN0aW9uID0gbWVzc2VuZ2VyICYmXG4gICAgICAgIC8vIGEgcHJpbXVzIHNvY2tldCBoYXMgYSBzb2NrZXQgYXR0cmlidXRlXG4gICAgICAgIHR5cGVvZiBtZXNzZW5nZXIuc29ja2V0ICE9ICd1bmRlZmluZWQnO1xuXG4gICAgcmV0dXJuIGlzQWJzdHJhY3Rpb24gPyBmYWxzZSA6IChcbiAgICAgIG1lc3NlbmdlciAmJlxuICAgICAgdHlwZW9mIG1lc3Nlbmdlci5yZWFkeVN0YXRlICE9ICd1bmRlZmluZWQnICYmXG4gICAgICBtZXNzZW5nZXIucmVhZHlTdGF0ZSA+PSAyXG4gICAgKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRih0YXJnZXQpIHtcbiAgICByZXR1cm4gdHlwZW9mIHRhcmdldCA9PSAnZnVuY3Rpb24nO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAvLyBleHRyYWN0IHRoZSB3cml0ZSBhbmQgY2xvc2UgZnVuY3Rpb24gcmVmZXJlbmNlc1xuICAgIHdyaXRlID0gW29wdHMud3JpdGVNZXRob2RdLmNvbmNhdChXUklURV9NRVRIT0RTKS5tYXAoZXh0cmFjdFByb3ApLmZpbHRlcihpc0YpWzBdO1xuICAgIGNsb3NlID0gW29wdHMuY2xvc2VNZXRob2RdLmNvbmNhdChDTE9TRV9NRVRIT0RTKS5tYXAoZXh0cmFjdFByb3ApLmZpbHRlcihpc0YpWzBdO1xuXG4gICAgLy8gY3JlYXRlIHRoZSBwcm9jZXNzb3JcbiAgICBzaWduYWxsZXIucHJvY2VzcyA9IHByb2Nlc3NvciA9IHJlcXVpcmUoJy4vcHJvY2Vzc29yJykoc2lnbmFsbGVyLCBvcHRzKTtcblxuICAgIC8vIGlmIHRoZSBtZXNzZW5nZXIgZG9lc24ndCBwcm92aWRlIGEgdmFsaWQgd3JpdGUgbWV0aG9kLCB0aGVuIGNvbXBsYWluXG4gICAgaWYgKHR5cGVvZiB3cml0ZSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb3ZpZGVkIG1lc3NlbmdlciBkb2VzIG5vdCBpbXBsZW1lbnQgYSBcIicgK1xuICAgICAgICB3cml0ZU1ldGhvZCArICdcIiB3cml0ZSBtZXRob2QnKTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgY29yZSBicm93c2VyIG1lc3NlbmdpbmcgYXBpc1xuICAgIGlmICh0eXBlb2YgbWVzc2VuZ2VyLmFkZEV2ZW50TGlzdGVuZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYmluZEJyb3dzZXJFdmVudHMoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBiaW5kRXZlbnRzKCk7XG4gICAgfVxuXG4gICAgLy8gZGV0ZXJtaW5lIGlmIHdlIGFyZSBjb25uZWN0ZWQgb3Igbm90XG4gICAgY29ubmVjdGVkID0gbWVzc2VuZ2VyLmNvbm5lY3RlZCB8fCBmYWxzZTtcbiAgICBpZiAoISBjb25uZWN0ZWQpIHtcbiAgICAgIHNpZ25hbGxlci5vbmNlKCdjb25uZWN0ZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gYWx3YXlzIGFubm91bmNlIG9uIHJlY29ubmVjdFxuICAgICAgICBzaWduYWxsZXIub24oJ2Nvbm5lY3RlZCcsIGFubm91bmNlT25SZWNvbm5lY3QpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gZW1pdCB0aGUgaW5pdGlhbGl6ZWQgZXZlbnRcbiAgICBzZXRUaW1lb3V0KHNpZ25hbGxlci5lbWl0LmJpbmQoc2lnbmFsbGVyLCAnaW5pdCcpLCAwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByZXBhcmVBcmcoYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgPT0gJ29iamVjdCcgJiYgKCEgKGFyZyBpbnN0YW5jZW9mIFN0cmluZykpKSB7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGFyZyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJnO1xuICB9XG5cbiAgLyoqXG4gICAgIyMjIHNpZ25hbGxlciNzZW5kKG1lc3NhZ2UsIGRhdGEqKVxuXG4gICAgVXNlIHRoZSBzZW5kIGZ1bmN0aW9uIHRvIHNlbmQgYSBtZXNzYWdlIHRvIG90aGVyIHBlZXJzIGluIHRoZSBjdXJyZW50XG4gICAgc2lnbmFsbGluZyBzY29wZSAoaWYgYW5ub3VuY2VkIGluIGEgcm9vbSB0aGlzIHdpbGwgYmUgYSByb29tLCBvdGhlcndpc2VcbiAgICBicm9hZGNhc3QgdG8gYWxsIHBlZXJzIGNvbm5lY3RlZCB0byB0aGUgc2lnbmFsbGluZyBzZXJ2ZXIpLlxuXG4gICoqL1xuICB2YXIgc2VuZCA9IHNpZ25hbGxlci5zZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaXRlcmF0ZSBvdmVyIHRoZSBhcmd1bWVudHMgYW5kIHN0cmluZ2lmeSBhcyByZXF1aXJlZFxuICAgIC8vIHZhciBtZXRhZGF0YSA9IHsgaWQ6IHNpZ25hbGxlci5pZCB9O1xuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHZhciBkYXRhbGluZTtcblxuICAgIC8vIGluamVjdCB0aGUgbWV0YWRhdGFcbiAgICBhcmdzLnNwbGljZSgxLCAwLCBjcmVhdGVNZXRhZGF0YSgpKTtcbiAgICBkYXRhbGluZSA9IGNyZWF0ZURhdGFMaW5lKGFyZ3MpO1xuXG4gICAgLy8gcGVyZm9ybSBhbiBpc2Nsb3NpbmcgY2hlY2tcbiAgICBpZiAoaXNDbG9zaW5nKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSBhcmUgbm90IGluaXRpYWxpemVkLCB0aGVuIHdhaXQgdW50aWwgd2UgYXJlXG4gICAgaWYgKCEgY29ubmVjdGVkKSB7XG4gICAgICByZXR1cm4gc2lnbmFsbGVyLm9uY2UoJ2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICB3cml0ZS5jYWxsKG1lc3NlbmdlciwgZGF0YWxpbmUpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gc2VuZCB0aGUgZGF0YSBvdmVyIHRoZSBtZXNzZW5nZXJcbiAgICByZXR1cm4gd3JpdGUuY2FsbChtZXNzZW5nZXIsIGRhdGFsaW5lKTtcbiAgfTtcblxuICAvKipcbiAgICAjIyMgYW5ub3VuY2UoZGF0YT8pXG5cbiAgICBUaGUgYGFubm91bmNlYCBmdW5jdGlvbiBvZiB0aGUgc2lnbmFsbGVyIHdpbGwgcGFzcyBhbiBgL2Fubm91bmNlYCBtZXNzYWdlXG4gICAgdGhyb3VnaCB0aGUgbWVzc2VuZ2VyIG5ldHdvcmsuICBXaGVuIG5vIGFkZGl0aW9uYWwgZGF0YSBpcyBzdXBwbGllZCB0b1xuICAgIHRoaXMgZnVuY3Rpb24gdGhlbiBvbmx5IHRoZSBpZCBvZiB0aGUgc2lnbmFsbGVyIGlzIHNlbnQgdG8gYWxsIGFjdGl2ZVxuICAgIG1lbWJlcnMgb2YgdGhlIG1lc3NlbmdpbmcgbmV0d29yay5cblxuICAgICMjIyMgSm9pbmluZyBSb29tc1xuXG4gICAgVG8gam9pbiBhIHJvb20gdXNpbmcgYW4gYW5ub3VuY2UgY2FsbCB5b3Ugc2ltcGx5IHByb3ZpZGUgdGhlIG5hbWUgb2YgdGhlXG4gICAgcm9vbSB5b3Ugd2lzaCB0byBqb2luIGFzIHBhcnQgb2YgdGhlIGRhdGEgYmxvY2sgdGhhdCB5b3UgYW5ub3VjZSwgZm9yXG4gICAgZXhhbXBsZTpcblxuICAgIGBgYGpzXG4gICAgc2lnbmFsbGVyLmFubm91bmNlKHsgcm9vbTogJ3Rlc3Ryb29tJyB9KTtcbiAgICBgYGBcblxuICAgIFNpZ25hbGxpbmcgc2VydmVycyAoc3VjaCBhc1xuICAgIFtydGMtc3dpdGNoYm9hcmRdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXN3aXRjaGJvYXJkKSkgd2lsbCB0aGVuXG4gICAgcGxhY2UgeW91ciBwZWVyIGNvbm5lY3Rpb24gaW50byBhIHJvb20gd2l0aCBvdGhlciBwZWVycyB0aGF0IGhhdmUgYWxzb1xuICAgIGFubm91bmNlZCBpbiB0aGlzIHJvb20uXG5cbiAgICBPbmNlIHlvdSBoYXZlIGpvaW5lZCBhIHJvb20sIHRoZSBzZXJ2ZXIgd2lsbCBvbmx5IGRlbGl2ZXIgbWVzc2FnZXMgdGhhdFxuICAgIHlvdSBgc2VuZGAgdG8gb3RoZXIgcGVlcnMgd2l0aGluIHRoYXQgcm9vbS5cblxuICAgICMjIyMgUHJvdmlkaW5nIEFkZGl0aW9uYWwgQW5ub3VuY2UgRGF0YVxuXG4gICAgVGhlcmUgbWF5IGJlIGluc3RhbmNlcyB3aGVyZSB5b3Ugd2lzaCB0byBzZW5kIGFkZGl0aW9uYWwgZGF0YSBhcyBwYXJ0IG9mXG4gICAgeW91ciBhbm5vdW5jZSBtZXNzYWdlIGluIHlvdXIgYXBwbGljYXRpb24uICBGb3IgaW5zdGFuY2UsIG1heWJlIHlvdSB3YW50XG4gICAgdG8gc2VuZCBhbiBhbGlhcyBvciBuaWNrIGFzIHBhcnQgb2YgeW91ciBhbm5vdW5jZSBtZXNzYWdlIHJhdGhlciB0aGFuIGp1c3RcbiAgICB1c2UgdGhlIHNpZ25hbGxlcidzIGdlbmVyYXRlZCBpZC5cblxuICAgIElmIGZvciBpbnN0YW5jZSB5b3Ugd2VyZSB3cml0aW5nIGEgc2ltcGxlIGNoYXQgYXBwbGljYXRpb24geW91IGNvdWxkIGpvaW5cbiAgICB0aGUgYHdlYnJ0Y2Agcm9vbSBhbmQgdGVsbCBldmVyeW9uZSB5b3VyIG5hbWUgd2l0aCB0aGUgZm9sbG93aW5nIGFubm91bmNlXG4gICAgY2FsbDpcblxuICAgIGBgYGpzXG4gICAgc2lnbmFsbGVyLmFubm91bmNlKHtcbiAgICAgIHJvb206ICd3ZWJydGMnLFxuICAgICAgbmljazogJ0RhbW9uJ1xuICAgIH0pO1xuICAgIGBgYFxuXG4gICAgIyMjIyBBbm5vdW5jaW5nIFVwZGF0ZXNcblxuICAgIFRoZSBzaWduYWxsZXIgaXMgd3JpdHRlbiB0byBkaXN0aW5ndWlzaCBiZXR3ZWVuIGluaXRpYWwgcGVlciBhbm5vdW5jZW1lbnRzXG4gICAgYW5kIHBlZXIgZGF0YSB1cGRhdGVzIChzZWUgdGhlIGRvY3Mgb24gdGhlIGFubm91bmNlIGhhbmRsZXIgYmVsb3cpLiBBc1xuICAgIHN1Y2ggaXQgaXMgb2sgdG8gcHJvdmlkZSBhbnkgZGF0YSB1cGRhdGVzIHVzaW5nIHRoZSBhbm5vdW5jZSBtZXRob2QgYWxzby5cblxuICAgIEZvciBpbnN0YW5jZSwgSSBjb3VsZCBzZW5kIGEgc3RhdHVzIHVwZGF0ZSBhcyBhbiBhbm5vdW5jZSBtZXNzYWdlIHRvIGZsYWdcbiAgICB0aGF0IEkgYW0gZ29pbmcgb2ZmbGluZTpcblxuICAgIGBgYGpzXG4gICAgc2lnbmFsbGVyLmFubm91bmNlKHsgc3RhdHVzOiAnb2ZmbGluZScgfSk7XG4gICAgYGBgXG5cbiAgKiovXG4gIHNpZ25hbGxlci5hbm5vdW5jZSA9IGZ1bmN0aW9uKGRhdGEsIHNlbmRlcikge1xuICAgIGNsZWFyVGltZW91dChhbm5vdW5jZVRpbWVyKTtcblxuICAgIC8vIHVwZGF0ZSBpbnRlcm5hbCBhdHRyaWJ1dGVzXG4gICAgZXh0ZW5kKGF0dHJpYnV0ZXMsIGRhdGEsIHsgaWQ6IHNpZ25hbGxlci5pZCB9KTtcblxuICAgIC8vIGlmIHdlIGFyZSBhbHJlYWR5IGNvbm5lY3RlZCwgdGhlbiBlbnN1cmUgd2UgYW5ub3VuY2Ugb25cbiAgICAvLyByZWNvbm5lY3RcbiAgICBpZiAoY29ubmVjdGVkKSB7XG4gICAgICAvLyBhbHdheXMgYW5ub3VuY2Ugb24gcmVjb25uZWN0XG4gICAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ2Nvbm5lY3RlZCcsIGFubm91bmNlT25SZWNvbm5lY3QpO1xuICAgICAgc2lnbmFsbGVyLm9uKCdjb25uZWN0ZWQnLCBhbm5vdW5jZU9uUmVjb25uZWN0KTtcbiAgICB9XG5cbiAgICAvLyBzZW5kIHRoZSBhdHRyaWJ1dGVzIG92ZXIgdGhlIG5ldHdvcmtcbiAgICByZXR1cm4gYW5ub3VuY2VUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoISBjb25uZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHNpZ25hbGxlci5vbmNlKCdjb25uZWN0ZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAoc2VuZGVyIHx8IHNlbmQpKCcvYW5ub3VuY2UnLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIChzZW5kZXIgfHwgc2VuZCkoJy9hbm5vdW5jZScsIGF0dHJpYnV0ZXMpO1xuICAgIH0sIChvcHRzIHx8IHt9KS5hbm5vdW5jZURlbGF5IHx8IDEwKTtcbiAgfTtcblxuICAvKipcbiAgICAjIyMgaXNNYXN0ZXIodGFyZ2V0SWQpXG5cbiAgICBBIHNpbXBsZSBmdW5jdGlvbiB0aGF0IGluZGljYXRlcyB3aGV0aGVyIHRoZSBsb2NhbCBzaWduYWxsZXIgaXMgdGhlIG1hc3RlclxuICAgIGZvciBpdCdzIHJlbGF0aW9uc2hpcCB3aXRoIHBlZXIgc2lnbmFsbGVyIGluZGljYXRlZCBieSBgdGFyZ2V0SWRgLiAgUm9sZXNcbiAgICBhcmUgZGV0ZXJtaW5lZCBhdCB0aGUgcG9pbnQgYXQgd2hpY2ggc2lnbmFsbGluZyBwZWVycyBkaXNjb3ZlciBlYWNoIG90aGVyLFxuICAgIGFuZCBhcmUgc2ltcGx5IHdvcmtlZCBvdXQgYnkgd2hpY2hldmVyIHBlZXIgaGFzIHRoZSBsb3dlc3Qgc2lnbmFsbGVyIGlkXG4gICAgd2hlbiBsZXhpZ3JhcGhpY2FsbHkgc29ydGVkLlxuXG4gICAgRm9yIGV4YW1wbGUsIGlmIHdlIGhhdmUgdHdvIHNpZ25hbGxlciBwZWVycyB0aGF0IGhhdmUgZGlzY292ZXJlZCBlYWNoXG4gICAgb3RoZXJzIHdpdGggdGhlIGZvbGxvd2luZyBpZHM6XG5cbiAgICAtIGBiMTFmNGZkMC1mZWI1LTQ0N2MtODBjOC1jNTFkOGMzY2NlZDJgXG4gICAgLSBgOGEwN2Y4MmUtNDlhNS00YjliLWEwMmUtNDNkOTExMzgyYmU2YFxuXG4gICAgVGhleSB3b3VsZCBiZSBhc3NpZ25lZCByb2xlczpcblxuICAgIC0gYGIxMWY0ZmQwLWZlYjUtNDQ3Yy04MGM4LWM1MWQ4YzNjY2VkMmBcbiAgICAtIGA4YTA3ZjgyZS00OWE1LTRiOWItYTAyZS00M2Q5MTEzODJiZTZgIChtYXN0ZXIpXG5cbiAgKiovXG4gIHNpZ25hbGxlci5pc01hc3RlciA9IGZ1bmN0aW9uKHRhcmdldElkKSB7XG4gICAgdmFyIHBlZXIgPSBwZWVycy5nZXQodGFyZ2V0SWQpO1xuXG4gICAgcmV0dXJuIHBlZXIgJiYgcGVlci5yb2xlSWR4ICE9PSAwO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyBsZWF2ZSgpXG5cbiAgICBUZWxsIHRoZSBzaWduYWxsaW5nIHNlcnZlciB3ZSBhcmUgbGVhdmluZy4gIENhbGxpbmcgdGhpcyBmdW5jdGlvbiBpc1xuICAgIHVzdWFsbHkgbm90IHJlcXVpcmVkIHRob3VnaCBhcyB0aGUgc2lnbmFsbGluZyBzZXJ2ZXIgc2hvdWxkIGlzc3VlIGNvcnJlY3RcbiAgICBgL2xlYXZlYCBtZXNzYWdlcyB3aGVuIGl0IGRldGVjdHMgYSBkaXNjb25uZWN0IGV2ZW50LlxuXG4gICoqL1xuICBzaWduYWxsZXIubGVhdmUgPSBzaWduYWxsZXIuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBzZW5kIHRoZSBsZWF2ZSBzaWduYWxcbiAgICBzZW5kKCcvbGVhdmUnLCB7IGlkOiBpZCB9KTtcblxuICAgIC8vIHN0b3AgYW5ub3VuY2luZyBvbiByZWNvbm5lY3RcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ2Nvbm5lY3RlZCcsIGFubm91bmNlT25SZWNvbm5lY3QpO1xuXG4gICAgLy8gY2FsbCB0aGUgY2xvc2UgbWV0aG9kXG4gICAgaWYgKHR5cGVvZiBjbG9zZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjbG9zZS5jYWxsKG1lc3Nlbmdlcik7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgICMjIyBtZXRhZGF0YShkYXRhPylcblxuICAgIEdldCAocGFzcyBubyBkYXRhKSBvciBzZXQgdGhlIG1ldGFkYXRhIHRoYXQgaXMgcGFzc2VkIHRocm91Z2ggd2l0aCBlYWNoXG4gICAgcmVxdWVzdCBzZW50IGJ5IHRoZSBzaWduYWxsZXIuXG5cbiAgICBfX05PVEU6X18gUmVnYXJkbGVzcyBvZiB3aGF0IGlzIHBhc3NlZCB0byB0aGlzIGZ1bmN0aW9uLCBtZXRhZGF0YVxuICAgIGdlbmVyYXRlZCBieSB0aGUgc2lnbmFsbGVyIHdpbGwgKiphbHdheXMqKiBpbmNsdWRlIHRoZSBpZCBvZiB0aGUgc2lnbmFsbGVyXG4gICAgYW5kIHRoaXMgY2Fubm90IGJlIG1vZGlmaWVkLlxuICAqKi9cbiAgc2lnbmFsbGVyLm1ldGFkYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZXh0ZW5kKHt9LCBsb2NhbE1ldGEpO1xuICAgIH1cblxuICAgIGxvY2FsTWV0YSA9IGV4dGVuZCh7fSwgZGF0YSk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIHRvKHRhcmdldElkKVxuXG4gICAgVXNlIHRoZSBgdG9gIGZ1bmN0aW9uIHRvIHNlbmQgYSBtZXNzYWdlIHRvIHRoZSBzcGVjaWZpZWQgdGFyZ2V0IHBlZXIuXG4gICAgQSBsYXJnZSBwYXJnZSBvZiBuZWdvdGlhdGluZyBhIFdlYlJUQyBwZWVyIGNvbm5lY3Rpb24gaW52b2x2ZXMgZGlyZWN0XG4gICAgY29tbXVuaWNhdGlvbiBiZXR3ZWVuIHR3byBwYXJ0aWVzIHdoaWNoIG11c3QgYmUgZG9uZSBieSB0aGUgc2lnbmFsbGluZ1xuICAgIHNlcnZlci4gIFRoZSBgdG9gIGZ1bmN0aW9uIHByb3ZpZGVzIGEgc2ltcGxlIHdheSB0byBwcm92aWRlIGEgbG9naWNhbFxuICAgIGNvbW11bmljYXRpb24gY2hhbm5lbCBiZXR3ZWVuIHRoZSB0d28gcGFydGllczpcblxuICAgIGBgYGpzXG4gICAgdmFyIHNlbmQgPSBzaWduYWxsZXIudG8oJ2U5NWZhMDViLTkwNjItNDVjNi1iZmEyLTUwNTViZjY2MjVmNCcpLnNlbmQ7XG5cbiAgICAvLyBjcmVhdGUgYW4gb2ZmZXIgb24gYSBsb2NhbCBwZWVyIGNvbm5lY3Rpb25cbiAgICBwYy5jcmVhdGVPZmZlcihcbiAgICAgIGZ1bmN0aW9uKGRlc2MpIHtcbiAgICAgICAgLy8gc2V0IHRoZSBsb2NhbCBkZXNjcmlwdGlvbiB1c2luZyB0aGUgb2ZmZXIgc2RwXG4gICAgICAgIC8vIGlmIHRoaXMgb2NjdXJzIHN1Y2Nlc3NmdWxseSBzZW5kIHRoaXMgdG8gb3VyIHBlZXJcbiAgICAgICAgcGMuc2V0TG9jYWxEZXNjcmlwdGlvbihcbiAgICAgICAgICBkZXNjLFxuICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc2VuZCgnL3NkcCcsIGRlc2MpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgaGFuZGxlRmFpbFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICAgIGhhbmRsZUZhaWxcbiAgICApO1xuICAgIGBgYFxuXG4gICoqL1xuICBzaWduYWxsZXIudG8gPSBmdW5jdGlvbih0YXJnZXRJZCkge1xuICAgIC8vIGNyZWF0ZSBhIHNlbmRlciB0aGF0IHdpbGwgcHJlcGVuZCBtZXNzYWdlcyB3aXRoIC90b3x0YXJnZXRJZHxcbiAgICB2YXIgc2VuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBnZXQgdGhlIHBlZXIgKHllcyB3aGVuIHNlbmQgaXMgY2FsbGVkIHRvIG1ha2Ugc3VyZSBpdCBoYXNuJ3QgbGVmdClcbiAgICAgIHZhciBwZWVyID0gc2lnbmFsbGVyLnBlZXJzLmdldCh0YXJnZXRJZCk7XG4gICAgICB2YXIgYXJncztcblxuICAgICAgaWYgKCEgcGVlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gcGVlcjogJyArIHRhcmdldElkKTtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgdGhlIHBlZXIgaXMgaW5hY3RpdmUsIHRoZW4gYWJvcnRcbiAgICAgIGlmIChwZWVyLmluYWN0aXZlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYXJncyA9IFtcbiAgICAgICAgJy90bycsXG4gICAgICAgIHRhcmdldElkXG4gICAgICBdLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXG4gICAgICAvLyBpbmplY3QgbWV0YWRhdGFcbiAgICAgIGFyZ3Muc3BsaWNlKDMsIDAsIGNyZWF0ZU1ldGFkYXRhKCkpO1xuXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gY3JlYXRlRGF0YUxpbmUoYXJncyk7XG4gICAgICAgIGRlYnVnKCdUWCAoJyArIHRhcmdldElkICsgJyk6ICcgKyBtc2cpO1xuXG4gICAgICAgIHdyaXRlLmNhbGwobWVzc2VuZ2VyLCBtc2cpO1xuICAgICAgfSwgMCk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbm5vdW5jZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICByZXR1cm4gc2lnbmFsbGVyLmFubm91bmNlKGRhdGEsIHNlbmRlcik7XG4gICAgICB9LFxuXG4gICAgICBzZW5kOiBzZW5kZXIsXG4gICAgfVxuICB9O1xuXG4gIC8vIHJlbW92ZSBtYXggbGlzdGVuZXJzIGZyb20gdGhlIGVtaXR0ZXJcbiAgc2lnbmFsbGVyLnNldE1heExpc3RlbmVycygwKTtcblxuICAvLyBpbml0aWFsaXNlIG9wdHMgZGVmYXVsdHNcbiAgb3B0cyA9IGRlZmF1bHRzKHt9LCBvcHRzLCByZXF1aXJlKCcuL2RlZmF1bHRzJykpO1xuXG4gIC8vIHNldCB0aGUgYXV0b3JlcGx5IGZsYWdcbiAgc2lnbmFsbGVyLmF1dG9yZXBseSA9IGF1dG9yZXBseSA9PT0gdW5kZWZpbmVkIHx8IGF1dG9yZXBseTtcblxuICAvLyBpZiB0aGUgbWVzc2VuZ2VyIGlzIGEgc3RyaW5nLCB0aGVuIHdlIGFyZSBnb2luZyB0byBhdHRhY2ggdG8gYVxuICAvLyB3cyBlbmRwb2ludCBhbmQgYXV0b21hdGljYWxseSBzZXQgdXAgcHJpbXVzXG4gIGlmICh0eXBlb2YgbWVzc2VuZ2VyID09ICdzdHJpbmcnIHx8IChtZXNzZW5nZXIgaW5zdGFuY2VvZiBTdHJpbmcpKSB7XG4gICAgY29ubmVjdFRvSG9zdChtZXNzZW5nZXIpO1xuICB9XG4gIC8vIG90aGVyd2lzZSwgaW5pdGlhbGlzZSB0aGUgY29ubmVjdGlvblxuICBlbHNlIHtcbiAgICBpbml0KCk7XG4gIH1cblxuICAvLyBjb25uZWN0IGFuIGluc3RhbmNlIG9mIHRoZSBtZXNzZW5nZXIgdG8gdGhlIHNpZ25hbGxlclxuICBzaWduYWxsZXIuX21lc3NlbmdlciA9IG1lc3NlbmdlcjtcblxuICAvLyBleHBvc2UgdGhlIHByb2Nlc3MgYXMgYSBwcm9jZXNzIGZ1bmN0aW9uXG4gIHNpZ25hbGxlci5wcm9jZXNzID0gcHJvY2Vzc29yO1xuXG4gIHJldHVybiBzaWduYWxsZXI7XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCBkb2N1bWVudCwgbG9jYXRpb24sIFByaW11czogZmFsc2UgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIHJlVHJhaWxpbmdTbGFzaCA9IC9cXC8kLztcblxuLyoqXG4gICMjIyBsb2FkUHJpbXVzKHNpZ25hbGhvc3QsIGNhbGxiYWNrKVxuXG4gIFRoaXMgaXMgYSBjb252ZW5pZW5jZSBmdW5jdGlvbiB0aGF0IGlzIHBhdGNoZWQgaW50byB0aGUgc2lnbmFsbGVyIHRvIGFzc2lzdFxuICB3aXRoIGxvYWRpbmcgdGhlIGBwcmltdXMuanNgIGNsaWVudCBsaWJyYXJ5IGZyb20gYW4gYHJ0Yy1zd2l0Y2hib2FyZGBcbiAgc2lnbmFsaW5nIHNlcnZlci5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNpZ25hbGhvc3QsIGNhbGxiYWNrKSB7XG4gIHZhciBhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gIHZhciBzY3JpcHQ7XG4gIHZhciBiYXNlVXJsO1xuICB2YXIgc2NyaXB0U3JjO1xuXG4gIC8vIGlmIHRoZSBzaWduYWxob3N0IGlzIGEgZnVuY3Rpb24sIHdlIGFyZSBpbiBzaW5nbGUgYXJnIGNhbGxpbmcgbW9kZVxuICBpZiAodHlwZW9mIHNpZ25hbGhvc3QgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gc2lnbmFsaG9zdDtcbiAgICBzaWduYWxob3N0ID0gbG9jYXRpb24ub3JpZ2luO1xuICB9XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgYW5jaG9yIHdpdGggdGhlIHNpZ25hbGhvc3RcbiAgYW5jaG9yLmhyZWYgPSBzaWduYWxob3N0O1xuXG4gIC8vIHJlYWQgdGhlIGJhc2UgcGF0aFxuICBiYXNlVXJsID0gc2lnbmFsaG9zdC5yZXBsYWNlKHJlVHJhaWxpbmdTbGFzaCwgJycpO1xuICBzY3JpcHRTcmMgPSBiYXNlVXJsICsgJy9ydGMuaW8vcHJpbXVzLmpzJztcblxuICAvLyBsb29rIGZvciB0aGUgc2NyaXB0IGZpcnN0XG4gIHNjcmlwdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3NjcmlwdFtzcmM9XCInICsgc2NyaXB0U3JjICsgJ1wiXScpO1xuXG4gIC8vIGlmIHdlIGZvdW5kLCB0aGUgc2NyaXB0IHRyaWdnZXIgdGhlIGNhbGxiYWNrIGltbWVkaWF0ZWx5XG4gIGlmIChzY3JpcHQgJiYgdHlwZW9mIFByaW11cyAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBQcmltdXMpO1xuICB9XG4gIC8vIG90aGVyd2lzZSwgaWYgdGhlIHNjcmlwdCBleGlzdHMgYnV0IFByaW11cyBpcyBub3QgbG9hZGVkLFxuICAvLyB0aGVuIHdhaXQgZm9yIHRoZSBsb2FkXG4gIGVsc2UgaWYgKHNjcmlwdCkge1xuICAgIHNjcmlwdC5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBQcmltdXMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gb3RoZXJ3aXNlIGNyZWF0ZSB0aGUgc2NyaXB0IGFuZCBsb2FkIHByaW11c1xuICBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgc2NyaXB0LnNyYyA9IHNjcmlwdFNyYztcblxuICBzY3JpcHQub25lcnJvciA9IGNhbGxiYWNrO1xuICBzY3JpcHQuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgIC8vIGlmIHdlIGhhdmUgYSBzaWduYWxob3N0IHRoYXQgaXMgbm90IGJhc2VwYXRoZWQgYXQgL1xuICAgIC8vIHRoZW4gdHdlYWsgdGhlIHByaW11cyBwcm90b3R5cGVcbiAgICBpZiAoYW5jaG9yLnBhdGhuYW1lICE9PSAnLycpIHtcbiAgICAgIFByaW11cy5wcm90b3R5cGUucGF0aG5hbWUgPSBhbmNob3IucGF0aG5hbWUucmVwbGFjZShyZVRyYWlsaW5nU2xhc2gsICcnKSArXG4gICAgICAgIFByaW11cy5wcm90b3R5cGUucGF0aG5hbWU7XG4gICAgfVxuXG4gICAgY2FsbGJhY2sobnVsbCwgUHJpbXVzKTtcbiAgfSk7XG5cbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgncnRjLXNpZ25hbGxlcicpO1xudmFyIGpzb25wYXJzZSA9IHJlcXVpcmUoJ2NvZy9qc29ucGFyc2UnKTtcblxuLyoqXG4gICMjIyBzaWduYWxsZXIgcHJvY2VzcyBoYW5kbGluZ1xuXG4gIFdoZW4gYSBzaWduYWxsZXIncyB1bmRlcmxpbmcgbWVzc2VuZ2VyIGVtaXRzIGEgYGRhdGFgIGV2ZW50IHRoaXMgaXNcbiAgZGVsZWdhdGVkIHRvIGEgc2ltcGxlIG1lc3NhZ2UgcGFyc2VyLCB3aGljaCBhcHBsaWVzIHRoZSBmb2xsb3dpbmcgc2ltcGxlXG4gIGxvZ2ljOlxuXG4gIC0gSXMgdGhlIG1lc3NhZ2UgYSBgL3RvYCBtZXNzYWdlLiBJZiBzbywgc2VlIGlmIHRoZSBtZXNzYWdlIGlzIGZvciB0aGlzXG4gICAgc2lnbmFsbGVyIChjaGVja2luZyB0aGUgdGFyZ2V0IGlkIC0gMm5kIGFyZykuICBJZiBzbyBwYXNzIHRoZVxuICAgIHJlbWFpbmRlciBvZiB0aGUgbWVzc2FnZSBvbnRvIHRoZSBzdGFuZGFyZCBwcm9jZXNzaW5nIGNoYWluLiAgSWYgbm90LFxuICAgIGRpc2NhcmQgdGhlIG1lc3NhZ2UuXG5cbiAgLSBJcyB0aGUgbWVzc2FnZSBhIGNvbW1hbmQgbWVzc2FnZSAocHJlZml4ZWQgd2l0aCBhIGZvcndhcmQgc2xhc2gpLiBJZiBzbyxcbiAgICBsb29rIGZvciBhbiBhcHByb3ByaWF0ZSBtZXNzYWdlIGhhbmRsZXIgYW5kIHBhc3MgdGhlIG1lc3NhZ2UgcGF5bG9hZCBvblxuICAgIHRvIGl0LlxuXG4gIC0gRmluYWxseSwgZG9lcyB0aGUgbWVzc2FnZSBtYXRjaCBhbnkgcGF0dGVybnMgdGhhdCB3ZSBhcmUgbGlzdGVuaW5nIGZvcj9cbiAgICBJZiBzbywgdGhlbiBwYXNzIHRoZSBlbnRpcmUgbWVzc2FnZSBjb250ZW50cyBvbnRvIHRoZSByZWdpc3RlcmVkIGhhbmRsZXIuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyLCBvcHRzKSB7XG4gIHZhciBoYW5kbGVycyA9IHJlcXVpcmUoJy4vaGFuZGxlcnMnKShzaWduYWxsZXIsIG9wdHMpO1xuXG4gIGZ1bmN0aW9uIHNlbmRFdmVudChwYXJ0cywgc3JjU3RhdGUsIGRhdGEpIHtcbiAgICAvLyBpbml0aWFsaXNlIHRoZSBldmVudCBuYW1lXG4gICAgdmFyIGV2dE5hbWUgPSBwYXJ0c1swXS5zbGljZSgxKTtcblxuICAgIC8vIGNvbnZlcnQgYW55IHZhbGlkIGpzb24gb2JqZWN0cyB0byBqc29uXG4gICAgdmFyIGFyZ3MgPSBwYXJ0cy5zbGljZSgyKS5tYXAoanNvbnBhcnNlKTtcblxuICAgIHNpZ25hbGxlci5lbWl0LmFwcGx5KFxuICAgICAgc2lnbmFsbGVyLFxuICAgICAgW2V2dE5hbWVdLmNvbmNhdChhcmdzKS5jb25jYXQoW3NyY1N0YXRlLCBkYXRhXSlcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG9yaWdpbmFsRGF0YSkge1xuICAgIHZhciBkYXRhID0gb3JpZ2luYWxEYXRhO1xuICAgIHZhciBpc01hdGNoID0gdHJ1ZTtcbiAgICB2YXIgcGFydHM7XG4gICAgdmFyIGhhbmRsZXI7XG4gICAgdmFyIHNyY0RhdGE7XG4gICAgdmFyIHNyY1N0YXRlO1xuICAgIHZhciBpc0RpcmVjdE1lc3NhZ2UgPSBmYWxzZTtcblxuICAgIC8vIGZvcmNlIHRoZSBpZCBpbnRvIHN0cmluZyBmb3JtYXQgc28gd2UgY2FuIHJ1biBsZW5ndGggYW5kIGNvbXBhcmlzb24gdGVzdHMgb24gaXRcbiAgICB2YXIgaWQgPSBzaWduYWxsZXIuaWQgKyAnJztcbiAgICBkZWJ1Zygnc2lnbmFsbGVyICcgKyBpZCArICcgcmVjZWl2ZWQgZGF0YTogJyArIG9yaWdpbmFsRGF0YSk7XG5cbiAgICAvLyBwcm9jZXNzIC90byBtZXNzYWdlc1xuICAgIGlmIChkYXRhLnNsaWNlKDAsIDMpID09PSAnL3RvJykge1xuICAgICAgaXNNYXRjaCA9IGRhdGEuc2xpY2UoNCwgaWQubGVuZ3RoICsgNCkgPT09IGlkO1xuICAgICAgaWYgKGlzTWF0Y2gpIHtcbiAgICAgICAgcGFydHMgPSBkYXRhLnNsaWNlKDUgKyBpZC5sZW5ndGgpLnNwbGl0KCd8JykubWFwKGpzb25wYXJzZSk7XG5cbiAgICAgICAgLy8gZ2V0IHRoZSBzb3VyY2UgZGF0YVxuICAgICAgICBpc0RpcmVjdE1lc3NhZ2UgPSB0cnVlO1xuXG4gICAgICAgIC8vIGV4dHJhY3QgdGhlIHZlY3RvciBjbG9jayBhbmQgdXBkYXRlIHRoZSBwYXJ0c1xuICAgICAgICBwYXJ0cyA9IHBhcnRzLm1hcChqc29ucGFyc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGlmIHRoaXMgaXMgbm90IGEgbWF0Y2gsIHRoZW4gYmFpbFxuICAgIGlmICghIGlzTWF0Y2gpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBjaG9wIHRoZSBkYXRhIGludG8gcGFydHNcbiAgICBwYXJ0cyA9IHBhcnRzIHx8IGRhdGEuc3BsaXQoJ3wnKS5tYXAoanNvbnBhcnNlKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzcGVjaWZpYyBoYW5kbGVyIGZvciB0aGUgYWN0aW9uLCB0aGVuIGludm9rZVxuICAgIGlmICh0eXBlb2YgcGFydHNbMF0gPT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIGV4dHJhY3QgdGhlIG1ldGFkYXRhIGZyb20gdGhlIGlucHV0IGRhdGFcbiAgICAgIHNyY0RhdGEgPSBwYXJ0c1sxXTtcblxuICAgICAgLy8gaWYgd2UgZ290IGRhdGEgZnJvbSBvdXJzZWxmLCB0aGVuIHRoaXMgaXMgcHJldHR5IGR1bWJcbiAgICAgIC8vIGJ1dCBpZiB3ZSBoYXZlIHRoZW4gdGhyb3cgaXQgYXdheVxuICAgICAgaWYgKHNyY0RhdGEgJiYgc3JjRGF0YS5pZCA9PT0gc2lnbmFsbGVyLmlkKSB7XG4gICAgICAgIHJldHVybiBjb25zb2xlLndhcm4oJ2dvdCBkYXRhIGZyb20gb3Vyc2VsZiwgZGlzY2FyZGluZycpO1xuICAgICAgfVxuXG4gICAgICAvLyBnZXQgdGhlIHNvdXJjZSBzdGF0ZVxuICAgICAgc3JjU3RhdGUgPSBzaWduYWxsZXIucGVlcnMuZ2V0KHNyY0RhdGEgJiYgc3JjRGF0YS5pZCkgfHwgc3JjRGF0YTtcblxuICAgICAgLy8gaGFuZGxlIGNvbW1hbmRzXG4gICAgICBpZiAocGFydHNbMF0uY2hhckF0KDApID09PSAnLycpIHtcbiAgICAgICAgLy8gbG9vayBmb3IgYSBoYW5kbGVyIGZvciB0aGUgbWVzc2FnZSB0eXBlXG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyc1twYXJ0c1swXS5zbGljZSgxKV07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBoYW5kbGVyKFxuICAgICAgICAgICAgcGFydHMuc2xpY2UoMiksXG4gICAgICAgICAgICBwYXJ0c1swXS5zbGljZSgxKSxcbiAgICAgICAgICAgIHNyY0RhdGEsXG4gICAgICAgICAgICBzcmNTdGF0ZSxcbiAgICAgICAgICAgIGlzRGlyZWN0TWVzc2FnZVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgc2VuZEV2ZW50KHBhcnRzLCBzcmNTdGF0ZSwgb3JpZ2luYWxEYXRhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gb3RoZXJ3aXNlLCBlbWl0IGRhdGFcbiAgICAgIGVsc2Uge1xuICAgICAgICBzaWduYWxsZXIuZW1pdChcbiAgICAgICAgICAnZGF0YScsXG4gICAgICAgICAgcGFydHMuc2xpY2UoMCwgMSkuY29uY2F0KHBhcnRzLnNsaWNlKDIpKSxcbiAgICAgICAgICBzcmNEYXRhLFxuICAgICAgICAgIHNyY1N0YXRlLFxuICAgICAgICAgIGlzRGlyZWN0TWVzc2FnZVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn07XG4iLCIvLyBMZXZlck9uZSdzIGF3ZXNvbWUgdXVpZCBnZW5lcmF0b3Jcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYSxiKXtmb3IoYj1hPScnO2ErKzwzNjtiKz1hKjUxJjUyPyhhXjE1PzheTWF0aC5yYW5kb20oKSooYV4yMD8xNjo0KTo0KS50b1N0cmluZygxNik6Jy0nKTtyZXR1cm4gYn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ3J0Yy9jbGVhbnVwJyk7XG5cbnZhciBDQU5OT1RfQ0xPU0VfU1RBVEVTID0gW1xuICAnY2xvc2VkJ1xuXTtcblxudmFyIEVWRU5UTkFNRVMgPSBbXG4gICdhZGRzdHJlYW0nLFxuICAnZGF0YWNoYW5uZWwnLFxuICAnaWNlY2FuZGlkYXRlJyxcbiAgJ2ljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZScsXG4gICduZWdvdGlhdGlvbm5lZWRlZCcsXG4gICdyZW1vdmVzdHJlYW0nLFxuICAnc2lnbmFsaW5nc3RhdGVjaGFuZ2UnXG5dO1xuXG4vKipcbiAgIyMjIHJ0Yy10b29scy9jbGVhbnVwXG5cbiAgYGBgXG4gIGNsZWFudXAocGMpXG4gIGBgYFxuXG4gIFRoZSBgY2xlYW51cGAgZnVuY3Rpb24gaXMgdXNlZCB0byBlbnN1cmUgdGhhdCBhIHBlZXIgY29ubmVjdGlvbiBpcyBwcm9wZXJseVxuICBjbG9zZWQgYW5kIHJlYWR5IHRvIGJlIGNsZWFuZWQgdXAgYnkgdGhlIGJyb3dzZXIuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwYykge1xuICAvLyBzZWUgaWYgd2UgY2FuIGNsb3NlIHRoZSBjb25uZWN0aW9uXG4gIHZhciBjdXJyZW50U3RhdGUgPSBwYy5pY2VDb25uZWN0aW9uU3RhdGU7XG4gIHZhciBjYW5DbG9zZSA9IENBTk5PVF9DTE9TRV9TVEFURVMuaW5kZXhPZihjdXJyZW50U3RhdGUpIDwgMDtcblxuICBpZiAoY2FuQ2xvc2UpIHtcbiAgICBkZWJ1ZygnYXR0ZW1wdGluZyBjb25uZWN0aW9uIGNsb3NlLCBjdXJyZW50IHN0YXRlOiAnKyBwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgIHBjLmNsb3NlKCk7XG4gIH1cblxuICAvLyByZW1vdmUgdGhlIGV2ZW50IGxpc3RlbmVyc1xuICAvLyBhZnRlciBhIHNob3J0IGRlbGF5IGdpdmluZyB0aGUgY29ubmVjdGlvbiB0aW1lIHRvIHRyaWdnZXJcbiAgLy8gY2xvc2UgYW5kIGljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZSBldmVudHNcbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICBFVkVOVE5BTUVTLmZvckVhY2goZnVuY3Rpb24oZXZ0TmFtZSkge1xuICAgICAgaWYgKHBjWydvbicgKyBldnROYW1lXSkge1xuICAgICAgICBwY1snb24nICsgZXZ0TmFtZV0gPSBudWxsO1xuICAgICAgfVxuICAgIH0pO1xuICB9LCAxMDApO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBhc3luYyA9IHJlcXVpcmUoJ2FzeW5jJyk7XG52YXIgY2xlYW51cCA9IHJlcXVpcmUoJy4vY2xlYW51cCcpO1xudmFyIG1vbml0b3IgPSByZXF1aXJlKCcuL21vbml0b3InKTtcbnZhciBkZXRlY3QgPSByZXF1aXJlKCcuL2RldGVjdCcpO1xudmFyIGZpbmRQbHVnaW4gPSByZXF1aXJlKCdydGMtY29yZS9wbHVnaW4nKTtcbnZhciBDTE9TRURfU1RBVEVTID0gWyAnY2xvc2VkJywgJ2ZhaWxlZCcgXTtcblxuLy8gdHJhY2sgdGhlIHZhcmlvdXMgc3VwcG9ydGVkIENyZWF0ZU9mZmVyIC8gQ3JlYXRlQW5zd2VyIGNvbnRyYWludHNcbi8vIHRoYXQgd2UgcmVjb2duaXplIGFuZCBhbGxvd1xudmFyIE9GRkVSX0FOU1dFUl9DT05TVFJBSU5UUyA9IFtcbiAgJ29mZmVyVG9SZWNlaXZlVmlkZW8nLFxuICAnb2ZmZXJUb1JlY2VpdmVBdWRpbycsXG4gICd2b2ljZUFjdGl2aXR5RGV0ZWN0aW9uJyxcbiAgJ2ljZVJlc3RhcnQnXG5dO1xuXG4vKipcbiAgIyMjIHJ0Yy10b29scy9jb3VwbGVcblxuICAjIyMjIGNvdXBsZShwYywgdGFyZ2V0SWQsIHNpZ25hbGxlciwgb3B0cz8pXG5cbiAgQ291cGxlIGEgV2ViUlRDIGNvbm5lY3Rpb24gd2l0aCBhbm90aGVyIHdlYnJ0YyBjb25uZWN0aW9uIGlkZW50aWZpZWQgYnlcbiAgYHRhcmdldElkYCB2aWEgdGhlIHNpZ25hbGxlci5cblxuICBUaGUgZm9sbG93aW5nIG9wdGlvbnMgY2FuIGJlIHByb3ZpZGVkIGluIHRoZSBgb3B0c2AgYXJndW1lbnQ6XG5cbiAgLSBgc2RwZmlsdGVyYCAoZGVmYXVsdDogbnVsbClcblxuICAgIEEgc2ltcGxlIGZ1bmN0aW9uIGZvciBmaWx0ZXJpbmcgU0RQIGFzIHBhcnQgb2YgdGhlIHBlZXJcbiAgICBjb25uZWN0aW9uIGhhbmRzaGFrZSAoc2VlIHRoZSBVc2luZyBGaWx0ZXJzIGRldGFpbHMgYmVsb3cpLlxuXG4gICMjIyMjIEV4YW1wbGUgVXNhZ2VcblxuICBgYGBqc1xuICB2YXIgY291cGxlID0gcmVxdWlyZSgncnRjL2NvdXBsZScpO1xuXG4gIGNvdXBsZShwYywgJzU0ODc5OTY1LWNlNDMtNDI2ZS1hOGVmLTA5YWMxZTM5YTE2ZCcsIHNpZ25hbGxlcik7XG4gIGBgYFxuXG4gICMjIyMjIFVzaW5nIEZpbHRlcnNcblxuICBJbiBjZXJ0YWluIGluc3RhbmNlcyB5b3UgbWF5IHdpc2ggdG8gbW9kaWZ5IHRoZSByYXcgU0RQIHRoYXQgaXMgcHJvdmlkZWRcbiAgYnkgdGhlIGBjcmVhdGVPZmZlcmAgYW5kIGBjcmVhdGVBbnN3ZXJgIGNhbGxzLiAgVGhpcyBjYW4gYmUgZG9uZSBieSBwYXNzaW5nXG4gIGEgYHNkcGZpbHRlcmAgZnVuY3Rpb24gKG9yIGFycmF5KSBpbiB0aGUgb3B0aW9ucy4gIEZvciBleGFtcGxlOlxuXG4gIGBgYGpzXG4gIC8vIHJ1biB0aGUgc2RwIGZyb20gdGhyb3VnaCBhIGxvY2FsIHR3ZWFrU2RwIGZ1bmN0aW9uLlxuICBjb3VwbGUocGMsICc1NDg3OTk2NS1jZTQzLTQyNmUtYThlZi0wOWFjMWUzOWExNmQnLCBzaWduYWxsZXIsIHtcbiAgICBzZHBmaWx0ZXI6IHR3ZWFrU2RwXG4gIH0pO1xuICBgYGBcblxuKiovXG5mdW5jdGlvbiBjb3VwbGUocGMsIHRhcmdldElkLCBzaWduYWxsZXIsIG9wdHMpIHtcbiAgdmFyIGRlYnVnTGFiZWwgPSAob3B0cyB8fCB7fSkuZGVidWdMYWJlbCB8fCAncnRjJztcbiAgdmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKGRlYnVnTGFiZWwgKyAnL2NvdXBsZScpO1xuXG4gIC8vIGNyZWF0ZSBhIG1vbml0b3IgZm9yIHRoZSBjb25uZWN0aW9uXG4gIHZhciBtb24gPSBtb25pdG9yKHBjLCB0YXJnZXRJZCwgc2lnbmFsbGVyLCBvcHRzKTtcbiAgdmFyIHF1ZXVlZENhbmRpZGF0ZXMgPSBbXTtcbiAgdmFyIHNkcEZpbHRlciA9IChvcHRzIHx8IHt9KS5zZHBmaWx0ZXI7XG4gIHZhciByZWFjdGl2ZSA9IChvcHRzIHx8IHt9KS5yZWFjdGl2ZTtcbiAgdmFyIG9mZmVyVGltZW91dDtcbiAgdmFyIGVuZE9mQ2FuZGlkYXRlcyA9IHRydWU7XG4gIHZhciBwbHVnaW4gPSBmaW5kUGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcblxuICAvLyBjb25maWd1cmUgdGhlIHRpbWUgdG8gd2FpdCBiZXR3ZWVuIHJlY2VpdmluZyBhICdkaXNjb25uZWN0J1xuICAvLyBpY2VDb25uZWN0aW9uU3RhdGUgYW5kIGRldGVybWluaW5nIHRoYXQgd2UgYXJlIGNsb3NlZFxuICB2YXIgZGlzY29ubmVjdFRpbWVvdXQgPSAob3B0cyB8fCB7fSkuZGlzY29ubmVjdFRpbWVvdXQgfHwgMTAwMDA7XG4gIHZhciBkaXNjb25uZWN0VGltZXI7XG5cbiAgLy8gaWYgdGhlIHNpZ25hbGxlciBkb2VzIG5vdCBzdXBwb3J0IHRoaXMgaXNNYXN0ZXIgZnVuY3Rpb24gdGhyb3cgYW5cbiAgLy8gZXhjZXB0aW9uXG4gIGlmICh0eXBlb2Ygc2lnbmFsbGVyLmlzTWFzdGVyICE9ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3J0Yy1zaWduYWxsZXIgaW5zdGFuY2UgPj0gMC4xNC4wIHJlcXVpcmVkJyk7XG4gIH1cblxuICAvLyBpbml0aWxhaXNlIHRoZSBuZWdvdGlhdGlvbiBoZWxwZXJzXG4gIHZhciBpc01hc3RlciA9IHNpZ25hbGxlci5pc01hc3Rlcih0YXJnZXRJZCk7XG5cbiAgdmFyIGNyZWF0ZU9mZmVyID0gcHJlcE5lZ290aWF0ZShcbiAgICAnY3JlYXRlT2ZmZXInLFxuICAgIGlzTWFzdGVyLFxuICAgIFsgY2hlY2tTdGFibGUgXVxuICApO1xuXG4gIHZhciBjcmVhdGVBbnN3ZXIgPSBwcmVwTmVnb3RpYXRlKFxuICAgICdjcmVhdGVBbnN3ZXInLFxuICAgIHRydWUsXG4gICAgW11cbiAgKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBwcm9jZXNzaW5nIHF1ZXVlIChvbmUgYXQgYSB0aW1lIHBsZWFzZSlcbiAgdmFyIHEgPSBhc3luYy5xdWV1ZShmdW5jdGlvbih0YXNrLCBjYikge1xuICAgIC8vIGlmIHRoZSB0YXNrIGhhcyBubyBvcGVyYXRpb24sIHRoZW4gdHJpZ2dlciB0aGUgY2FsbGJhY2sgaW1tZWRpYXRlbHlcbiAgICBpZiAodHlwZW9mIHRhc2sub3AgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIGNiKCk7XG4gICAgfVxuXG4gICAgLy8gcHJvY2VzcyB0aGUgdGFzayBvcGVyYXRpb25cbiAgICB0YXNrLm9wKHRhc2ssIGNiKTtcbiAgfSwgMSk7XG5cbiAgLy8gaW5pdGlhbGlzZSBzZXNzaW9uIGRlc2NyaXB0aW9uIGFuZCBpY2VjYW5kaWRhdGUgb2JqZWN0c1xuICB2YXIgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uID0gKG9wdHMgfHwge30pLlJUQ1Nlc3Npb25EZXNjcmlwdGlvbiB8fFxuICAgIGRldGVjdCgnUlRDU2Vzc2lvbkRlc2NyaXB0aW9uJyk7XG5cbiAgdmFyIFJUQ0ljZUNhbmRpZGF0ZSA9IChvcHRzIHx8IHt9KS5SVENJY2VDYW5kaWRhdGUgfHxcbiAgICBkZXRlY3QoJ1JUQ0ljZUNhbmRpZGF0ZScpO1xuXG4gIGZ1bmN0aW9uIGFib3J0KHN0YWdlLCBzZHAsIGNiKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGVycikge1xuICAgICAgLy8gbG9nIHRoZSBlcnJvclxuICAgICAgY29uc29sZS5lcnJvcigncnRjL2NvdXBsZSBlcnJvciAoJyArIHN0YWdlICsgJyk6ICcsIGVycik7XG5cbiAgICAgIGlmICh0eXBlb2YgY2IgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjYihlcnIpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBhcHBseUNhbmRpZGF0ZXNXaGVuU3RhYmxlKCkge1xuICAgIGlmIChwYy5zaWduYWxpbmdTdGF0ZSA9PSAnc3RhYmxlJyAmJiBwYy5yZW1vdGVEZXNjcmlwdGlvbikge1xuICAgICAgZGVidWcoJ3NpZ25hbGluZyBzdGF0ZSA9IHN0YWJsZSwgYXBwbHlpbmcgcXVldWVkIGNhbmRpZGF0ZXMnKTtcbiAgICAgIG1vbi5yZW1vdmVMaXN0ZW5lcignY2hhbmdlJywgYXBwbHlDYW5kaWRhdGVzV2hlblN0YWJsZSk7XG5cbiAgICAgIC8vIGFwcGx5IGFueSBxdWV1ZWQgY2FuZGlkYXRlc1xuICAgICAgcXVldWVkQ2FuZGlkYXRlcy5zcGxpY2UoMCkuZm9yRWFjaChmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIGRlYnVnKCdhcHBseWluZyBxdWV1ZWQgY2FuZGlkYXRlJywgZGF0YSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwYy5hZGRJY2VDYW5kaWRhdGUoY3JlYXRlSWNlQ2FuZGlkYXRlKGRhdGEpKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgIGRlYnVnKCdpbnZhbGlkYXRlIGNhbmRpZGF0ZSBzcGVjaWZpZWQ6ICcsIGRhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjaGVja05vdENvbm5lY3RpbmcobmVnb3RpYXRlKSB7XG4gICAgaWYgKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSAhPSAnY2hlY2tpbmcnKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBkZWJ1ZygnY29ubmVjdGlvbiBzdGF0ZSBpcyBjaGVja2luZywgd2lsbCB3YWl0IHRvIGNyZWF0ZSBhIG5ldyBvZmZlcicpO1xuICAgIG1vbi5vbmNlKCdjb25uZWN0ZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgIHEucHVzaCh7IG9wOiBuZWdvdGlhdGUgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBjaGVja1N0YWJsZShuZWdvdGlhdGUpIHtcbiAgICBpZiAocGMuc2lnbmFsaW5nU3RhdGUgPT09ICdzdGFibGUnKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBkZWJ1ZygnY2Fubm90IGNyZWF0ZSBvZmZlciwgc2lnbmFsaW5nIHN0YXRlICE9IHN0YWJsZSwgd2lsbCByZXRyeScpO1xuICAgIG1vbi5vbignY2hhbmdlJywgZnVuY3Rpb24gd2FpdEZvclN0YWJsZSgpIHtcbiAgICAgIGlmIChwYy5zaWduYWxpbmdTdGF0ZSA9PT0gJ3N0YWJsZScpIHtcbiAgICAgICAgcS5wdXNoKHsgb3A6IG5lZ290aWF0ZSB9KTtcbiAgICAgIH1cblxuICAgICAgbW9uLnJlbW92ZUxpc3RlbmVyKCdjaGFuZ2UnLCB3YWl0Rm9yU3RhYmxlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUljZUNhbmRpZGF0ZShkYXRhKSB7XG4gICAgaWYgKHBsdWdpbiAmJiB0eXBlb2YgcGx1Z2luLmNyZWF0ZUljZUNhbmRpZGF0ZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gcGx1Z2luLmNyZWF0ZUljZUNhbmRpZGF0ZShkYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJUQ0ljZUNhbmRpZGF0ZShkYXRhKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVNlc3Npb25EZXNjcmlwdGlvbihkYXRhKSB7XG4gICAgaWYgKHBsdWdpbiAmJiB0eXBlb2YgcGx1Z2luLmNyZWF0ZVNlc3Npb25EZXNjcmlwdGlvbiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gcGx1Z2luLmNyZWF0ZVNlc3Npb25EZXNjcmlwdGlvbihkYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihkYXRhKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY291cGxlKCkge1xuICAgIGRlYnVnKCdkZWNvdXBsaW5nICcgKyBzaWduYWxsZXIuaWQgKyAnIGZyb20gJyArIHRhcmdldElkKTtcblxuICAgIC8vIHN0b3AgdGhlIG1vbml0b3JcbiAgICBtb24ucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgbW9uLnN0b3AoKTtcblxuICAgIC8vIGNsZWFudXAgdGhlIHBlZXJjb25uZWN0aW9uXG4gICAgY2xlYW51cChwYyk7XG5cbiAgICAvLyByZW1vdmUgbGlzdGVuZXJzXG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdzZHAnLCBoYW5kbGVTZHApO1xuICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignY2FuZGlkYXRlJywgaGFuZGxlUmVtb3RlQ2FuZGlkYXRlKTtcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ25lZ290aWF0ZScsIGhhbmRsZU5lZ290aWF0ZVJlcXVlc3QpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2VuZXJhdGVDb25zdHJhaW50cyhtZXRob2ROYW1lKSB7XG4gICAgdmFyIGNvbnN0cmFpbnRzID0ge307XG5cbiAgICBmdW5jdGlvbiByZWZvcm1hdENvbnN0cmFpbnRzKCkge1xuICAgICAgdmFyIHR3ZWFrZWQgPSB7fTtcblxuICAgICAgT2JqZWN0LmtleXMoY29uc3RyYWludHMpLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAgICAgdmFyIHNlbnRlbmNlZENhc2VkID0gcGFyYW0uY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBwYXJhbS5zdWJzdHIoMSk7XG4gICAgICAgIHR3ZWFrZWRbc2VudGVuY2VkQ2FzZWRdID0gY29uc3RyYWludHNbcGFyYW1dO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIHVwZGF0ZSB0aGUgY29uc3RyYWludHMgdG8gbWF0Y2ggdGhlIGV4cGVjdGVkIGZvcm1hdFxuICAgICAgY29uc3RyYWludHMgPSB7XG4gICAgICAgIG1hbmRhdG9yeTogdHdlYWtlZFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBjdXN0b21pemUgYmVoYXZpb3VyIGJhc2VkIG9uIG9mZmVyIHZzIGFuc3dlclxuXG4gICAgLy8gcHVsbCBvdXQgYW55IHZhbGlkXG4gICAgT0ZGRVJfQU5TV0VSX0NPTlNUUkFJTlRTLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAgIHZhciBzZW50ZW5jZWRDYXNlZCA9IHBhcmFtLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcGFyYW0uc3Vic3RyKDEpO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIG5vIG9wdHMsIGRvIG5vdGhpbmdcbiAgICAgIGlmICghIG9wdHMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gaWYgdGhlIHBhcmFtZXRlciBoYXMgYmVlbiBkZWZpbmVkLCB0aGVuIGFkZCBpdCB0byB0aGUgY29uc3RyYWludHNcbiAgICAgIGVsc2UgaWYgKG9wdHNbcGFyYW1dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3RyYWludHNbcGFyYW1dID0gb3B0c1twYXJhbV07XG4gICAgICB9XG4gICAgICAvLyBpZiB0aGUgc2VudGVuY2VkIGNhc2VkIHZlcnNpb24gaGFzIGJlZW4gYWRkZWQsIHRoZW4gdXNlIHRoYXRcbiAgICAgIGVsc2UgaWYgKG9wdHNbc2VudGVuY2VkQ2FzZWRdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3RyYWludHNbcGFyYW1dID0gb3B0c1tzZW50ZW5jZWRDYXNlZF07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBUT0RPOiBvbmx5IGRvIHRoaXMgZm9yIHRoZSBvbGRlciBicm93c2VycyB0aGF0IHJlcXVpcmUgaXRcbiAgICByZWZvcm1hdENvbnN0cmFpbnRzKCk7XG5cbiAgICByZXR1cm4gY29uc3RyYWludHM7XG4gIH1cblxuICBmdW5jdGlvbiBwcmVwTmVnb3RpYXRlKG1ldGhvZE5hbWUsIGFsbG93ZWQsIHByZWZsaWdodENoZWNrcykge1xuICAgIHZhciBjb25zdHJhaW50cyA9IGdlbmVyYXRlQ29uc3RyYWludHMobWV0aG9kTmFtZSk7XG5cbiAgICAvLyBlbnN1cmUgd2UgaGF2ZSBhIHZhbGlkIHByZWZsaWdodENoZWNrcyBhcnJheVxuICAgIHByZWZsaWdodENoZWNrcyA9IFtdLmNvbmNhdChwcmVmbGlnaHRDaGVja3MgfHwgW10pO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5lZ290aWF0ZSh0YXNrLCBjYikge1xuICAgICAgdmFyIGNoZWNrc09LID0gdHJ1ZTtcblxuICAgICAgLy8gaWYgdGhlIHRhc2sgaXMgbm90IGFsbG93ZWQsIHRoZW4gc2VuZCBhIG5lZ290aWF0ZSByZXF1ZXN0IHRvIG91clxuICAgICAgLy8gcGVlclxuICAgICAgaWYgKCEgYWxsb3dlZCkge1xuICAgICAgICBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9uZWdvdGlhdGUnKTtcbiAgICAgICAgcmV0dXJuIGNiKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGlmIHRoZSBjb25uZWN0aW9uIGlzIGNsb3NlZCwgdGhlbiBhYm9ydFxuICAgICAgaWYgKGlzQ2xvc2VkKCkpIHtcbiAgICAgICAgcmV0dXJuIGNiKG5ldyBFcnJvcignY29ubmVjdGlvbiBjbG9zZWQsIGNhbm5vdCBuZWdvdGlhdGUnKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHJ1biB0aGUgcHJlZmxpZ2h0IGNoZWNrc1xuICAgICAgcHJlZmxpZ2h0Q2hlY2tzLmZvckVhY2goZnVuY3Rpb24oY2hlY2spIHtcbiAgICAgICAgY2hlY2tzT0sgPSBjaGVja3NPSyAmJiBjaGVjayhuZWdvdGlhdGUpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIGlmIHRoZSBjaGVja3MgaGF2ZSBub3QgcGFzc2VkLCB0aGVuIGFib3J0IGZvciB0aGUgbW9tZW50XG4gICAgICBpZiAoISBjaGVja3NPSykge1xuICAgICAgICBkZWJ1ZygncHJlZmxpZ2h0IGNoZWNrcyBkaWQgbm90IHBhc3MsIGFib3J0aW5nICcgKyBtZXRob2ROYW1lKTtcbiAgICAgICAgcmV0dXJuIGNiKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGNyZWF0ZSB0aGUgb2ZmZXJcbiAgICAgIGRlYnVnKCdjYWxsaW5nICcgKyBtZXRob2ROYW1lKTtcbiAgICAgIC8vIGRlYnVnKCdnYXRoZXJpbmcgc3RhdGUgPSAnICsgcGMuaWNlR2F0aGVyaW5nU3RhdGUpO1xuICAgICAgLy8gZGVidWcoJ2Nvbm5lY3Rpb24gc3RhdGUgPSAnICsgcGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICAgIC8vIGRlYnVnKCdzaWduYWxpbmcgc3RhdGUgPSAnICsgcGMuc2lnbmFsaW5nU3RhdGUpO1xuXG4gICAgICBwY1ttZXRob2ROYW1lXShcbiAgICAgICAgZnVuY3Rpb24oZGVzYykge1xuXG4gICAgICAgICAgLy8gaWYgYSBmaWx0ZXIgaGFzIGJlZW4gc3BlY2lmaWVkLCB0aGVuIGFwcGx5IHRoZSBmaWx0ZXJcbiAgICAgICAgICBpZiAodHlwZW9mIHNkcEZpbHRlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBkZXNjLnNkcCA9IHNkcEZpbHRlcihkZXNjLnNkcCwgcGMsIG1ldGhvZE5hbWUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHEucHVzaCh7IG9wOiBxdWV1ZUxvY2FsRGVzYyhkZXNjKSB9KTtcbiAgICAgICAgICBjYigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIG9uIGVycm9yLCBhYm9ydFxuICAgICAgICBhYm9ydChtZXRob2ROYW1lLCAnJywgY2IpLFxuXG4gICAgICAgIC8vIGluY2x1ZGUgdGhlIGFwcHJvcHJpYXRlIGNvbnN0cmFpbnRzXG4gICAgICAgIGNvbnN0cmFpbnRzXG4gICAgICApO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVDb25uZWN0aW9uQ2xvc2UoKSB7XG4gICAgZGVidWcoJ2NhcHR1cmVkIHBjIGNsb3NlLCBpY2VDb25uZWN0aW9uU3RhdGUgPSAnICsgcGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICBkZWNvdXBsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlRGlzY29ubmVjdCgpIHtcbiAgICBkZWJ1ZygnY2FwdHVyZWQgcGMgZGlzY29ubmVjdCwgbW9uaXRvcmluZyBjb25uZWN0aW9uIHN0YXR1cycpO1xuXG4gICAgLy8gc3RhcnQgdGhlIGRpc2Nvbm5lY3QgdGltZXJcbiAgICBkaXNjb25uZWN0VGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgZGVidWcoJ21hbnVhbGx5IGNsb3NpbmcgY29ubmVjdGlvbiBhZnRlciBkaXNjb25uZWN0IHRpbWVvdXQnKTtcbiAgICAgIHBjLmNsb3NlKCk7XG4gICAgfSwgZGlzY29ubmVjdFRpbWVvdXQpO1xuXG4gICAgbW9uLm9uKCdjaGFuZ2UnLCBoYW5kbGVEaXNjb25uZWN0QWJvcnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlRGlzY29ubmVjdEFib3J0KCkge1xuICAgIGRlYnVnKCdjb25uZWN0aW9uIHN0YXRlIGNoYW5nZWQgdG86ICcgKyBwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgIHJlc2V0RGlzY29ubmVjdFRpbWVyKCk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgY2xvc2VkIG9yIGZhaWxlZCBzdGF0dXMsIHRoZW4gY2xvc2UgdGhlIGNvbm5lY3Rpb25cbiAgICBpZiAoQ0xPU0VEX1NUQVRFUy5pbmRleE9mKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSkgPj0gMCkge1xuICAgICAgcmV0dXJuIG1vbi5lbWl0KCdjbG9zZWQnKTtcbiAgICB9XG5cbiAgICBtb24ub25jZSgnZGlzY29ubmVjdCcsIGhhbmRsZURpc2Nvbm5lY3QpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGhhbmRsZUxvY2FsQ2FuZGlkYXRlKGV2dCkge1xuICAgIGlmIChldnQuY2FuZGlkYXRlKSB7XG4gICAgICByZXNldERpc2Nvbm5lY3RUaW1lcigpO1xuXG4gICAgICBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9jYW5kaWRhdGUnLCBldnQuY2FuZGlkYXRlKTtcbiAgICAgIGVuZE9mQ2FuZGlkYXRlcyA9IGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIGlmICghIGVuZE9mQ2FuZGlkYXRlcykge1xuICAgICAgZW5kT2ZDYW5kaWRhdGVzID0gdHJ1ZTtcbiAgICAgIGRlYnVnKCdpY2UgZ2F0aGVyaW5nIHN0YXRlIGNvbXBsZXRlJyk7XG4gICAgICBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9lbmRvZmNhbmRpZGF0ZXMnLCB7fSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlTmVnb3RpYXRlUmVxdWVzdChzcmMpIHtcbiAgICBpZiAoc3JjLmlkID09PSB0YXJnZXRJZCkge1xuICAgICAgZGVidWcoJ2dvdCBuZWdvdGlhdGUgcmVxdWVzdCBmcm9tICcgKyB0YXJnZXRJZCArICcsIGNyZWF0aW5nIG9mZmVyJyk7XG4gICAgICBxLnB1c2goeyBvcDogY3JlYXRlT2ZmZXIgfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlUmVtb3RlQ2FuZGlkYXRlKGRhdGEsIHNyYykge1xuICAgIGlmICgoISBzcmMpIHx8IChzcmMuaWQgIT09IHRhcmdldElkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHF1ZXVlIGNhbmRpZGF0ZXMgd2hpbGUgdGhlIHNpZ25hbGluZyBzdGF0ZSBpcyBub3Qgc3RhYmxlXG4gICAgaWYgKHBjLnNpZ25hbGluZ1N0YXRlICE9ICdzdGFibGUnIHx8ICghIHBjLnJlbW90ZURlc2NyaXB0aW9uKSkge1xuICAgICAgZGVidWcoJ3F1ZXVpbmcgY2FuZGlkYXRlJyk7XG4gICAgICBxdWV1ZWRDYW5kaWRhdGVzLnB1c2goZGF0YSk7XG5cbiAgICAgIG1vbi5yZW1vdmVMaXN0ZW5lcignY2hhbmdlJywgYXBwbHlDYW5kaWRhdGVzV2hlblN0YWJsZSk7XG4gICAgICBtb24ub24oJ2NoYW5nZScsIGFwcGx5Q2FuZGlkYXRlc1doZW5TdGFibGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBwYy5hZGRJY2VDYW5kaWRhdGUoY3JlYXRlSWNlQ2FuZGlkYXRlKGRhdGEpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIGRlYnVnKCdpbnZhbGlkYXRlIGNhbmRpZGF0ZSBzcGVjaWZpZWQ6ICcsIGRhdGEpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVNkcChkYXRhLCBzcmMpIHtcbiAgICB2YXIgYWJvcnRUeXBlID0gZGF0YS50eXBlID09PSAnb2ZmZXInID8gJ2NyZWF0ZUFuc3dlcicgOiAnY3JlYXRlT2ZmZXInO1xuXG4gICAgLy8gaWYgdGhlIHNvdXJjZSBpcyB1bmtub3duIG9yIG5vdCBhIG1hdGNoLCB0aGVuIGFib3J0XG4gICAgaWYgKCghIHNyYykgfHwgKHNyYy5pZCAhPT0gdGFyZ2V0SWQpKSB7XG4gICAgICByZXR1cm4gZGVidWcoJ3JlY2VpdmVkIHNkcCBidXQgZHJvcHBpbmcgZHVlIHRvIHVubWF0Y2hlZCBzcmMnKTtcbiAgICB9XG5cbiAgICAvLyBwcmlvcml0aXplIHNldHRpbmcgdGhlIHJlbW90ZSBkZXNjcmlwdGlvbiBvcGVyYXRpb25cbiAgICBxLnB1c2goeyBvcDogZnVuY3Rpb24odGFzaywgY2IpIHtcbiAgICAgIGlmIChpc0Nsb3NlZCgpKSB7XG4gICAgICAgIHJldHVybiBjYihuZXcgRXJyb3IoJ3BjIGNsb3NlZDogY2Fubm90IHNldCByZW1vdGUgZGVzY3JpcHRpb24nKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSB0aGUgcmVtb3RlIGRlc2NyaXB0aW9uXG4gICAgICAvLyBvbmNlIHN1Y2Nlc3NmdWwsIHNlbmQgdGhlIGFuc3dlclxuICAgICAgZGVidWcoJ3NldHRpbmcgcmVtb3RlIGRlc2NyaXB0aW9uJyk7XG4gICAgICBwYy5zZXRSZW1vdGVEZXNjcmlwdGlvbihcbiAgICAgICAgY3JlYXRlU2Vzc2lvbkRlc2NyaXB0aW9uKGRhdGEpLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBjcmVhdGUgdGhlIGFuc3dlclxuICAgICAgICAgIGlmIChkYXRhLnR5cGUgPT09ICdvZmZlcicpIHtcbiAgICAgICAgICAgIHF1ZXVlKGNyZWF0ZUFuc3dlcikoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyB0cmlnZ2VyIHRoZSBjYWxsYmFja1xuICAgICAgICAgIGNiKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYWJvcnQoYWJvcnRUeXBlLCBkYXRhLnNkcCwgY2IpXG4gICAgICApO1xuICAgIH19KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzQ2xvc2VkKCkge1xuICAgIHJldHVybiBDTE9TRURfU1RBVEVTLmluZGV4T2YocGMuaWNlQ29ubmVjdGlvblN0YXRlKSA+PSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gcXVldWUobmVnb3RpYXRlVGFzaykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHEucHVzaChbXG4gICAgICAgIHsgb3A6IG5lZ290aWF0ZVRhc2sgfVxuICAgICAgXSk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHF1ZXVlTG9jYWxEZXNjKGRlc2MpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gc2V0TG9jYWxEZXNjKHRhc2ssIGNiKSB7XG4gICAgICBpZiAoaXNDbG9zZWQoKSkge1xuICAgICAgICByZXR1cm4gY2IobmV3IEVycm9yKCdjb25uZWN0aW9uIGNsb3NlZCwgYWJvcnRpbmcnKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGluaXRpYWxpc2UgdGhlIGxvY2FsIGRlc2NyaXB0aW9uXG4gICAgICBkZWJ1Zygnc2V0dGluZyBsb2NhbCBkZXNjcmlwdGlvbicpO1xuICAgICAgcGMuc2V0TG9jYWxEZXNjcmlwdGlvbihcbiAgICAgICAgZGVzYyxcblxuICAgICAgICAvLyBpZiBzdWNjZXNzZnVsLCB0aGVuIHNlbmQgdGhlIHNkcCBvdmVyIHRoZSB3aXJlXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIHNlbmQgdGhlIHNkcFxuICAgICAgICAgIHNpZ25hbGxlci50byh0YXJnZXRJZCkuc2VuZCgnL3NkcCcsIGRlc2MpO1xuXG4gICAgICAgICAgLy8gY2FsbGJhY2tcbiAgICAgICAgICBjYigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIGFib3J0KCdzZXRMb2NhbERlc2MnLCBkZXNjLnNkcCwgY2IpXG4gICAgICAgIC8vIG9uIGVycm9yLCBhYm9ydFxuICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICBkZWJ1ZygnZXJyb3Igc2V0dGluZyBsb2NhbCBkZXNjcmlwdGlvbicsIGVycik7XG4gICAgICAgICAgZGVidWcoZGVzYy5zZHApO1xuICAgICAgICAgIC8vIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gICBzZXRMb2NhbERlc2ModGFzaywgY2IsIChyZXRyeUNvdW50IHx8IDApICsgMSk7XG4gICAgICAgICAgLy8gfSwgNTAwKTtcblxuICAgICAgICAgIGNiKGVycik7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc2V0RGlzY29ubmVjdFRpbWVyKCkge1xuICAgIG1vbi5yZW1vdmVMaXN0ZW5lcignY2hhbmdlJywgaGFuZGxlRGlzY29ubmVjdEFib3J0KTtcblxuICAgIC8vIGNsZWFyIHRoZSBkaXNjb25uZWN0IHRpbWVyXG4gICAgZGVidWcoJ3Jlc2V0IGRpc2Nvbm5lY3QgdGltZXIsIHN0YXRlOiAnICsgcGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICBjbGVhclRpbWVvdXQoZGlzY29ubmVjdFRpbWVyKTtcbiAgfVxuXG4gIC8vIHdoZW4gcmVnb3RpYXRpb24gaXMgbmVlZGVkIGxvb2sgZm9yIHRoZSBwZWVyXG4gIGlmIChyZWFjdGl2ZSkge1xuICAgIHBjLm9ubmVnb3RpYXRpb25uZWVkZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGRlYnVnKCdyZW5lZ290aWF0aW9uIHJlcXVpcmVkLCB3aWxsIGNyZWF0ZSBvZmZlciBpbiA1MG1zJyk7XG4gICAgICBjbGVhclRpbWVvdXQob2ZmZXJUaW1lb3V0KTtcbiAgICAgIG9mZmVyVGltZW91dCA9IHNldFRpbWVvdXQocXVldWUoY3JlYXRlT2ZmZXIpLCA1MCk7XG4gICAgfTtcbiAgfVxuXG4gIHBjLm9uaWNlY2FuZGlkYXRlID0gaGFuZGxlTG9jYWxDYW5kaWRhdGU7XG5cbiAgLy8gd2hlbiB3ZSByZWNlaXZlIHNkcCwgdGhlblxuICBzaWduYWxsZXIub24oJ3NkcCcsIGhhbmRsZVNkcCk7XG4gIHNpZ25hbGxlci5vbignY2FuZGlkYXRlJywgaGFuZGxlUmVtb3RlQ2FuZGlkYXRlKTtcblxuICAvLyBpZiB0aGlzIGlzIGEgbWFzdGVyIGNvbm5lY3Rpb24sIGxpc3RlbiBmb3IgbmVnb3RpYXRlIGV2ZW50c1xuICBpZiAoaXNNYXN0ZXIpIHtcbiAgICBzaWduYWxsZXIub24oJ25lZ290aWF0ZScsIGhhbmRsZU5lZ290aWF0ZVJlcXVlc3QpO1xuICB9XG5cbiAgLy8gd2hlbiB0aGUgY29ubmVjdGlvbiBjbG9zZXMsIHJlbW92ZSBldmVudCBoYW5kbGVyc1xuICBtb24ub25jZSgnY2xvc2VkJywgaGFuZGxlQ29ubmVjdGlvbkNsb3NlKTtcbiAgbW9uLm9uY2UoJ2Rpc2Nvbm5lY3RlZCcsIGhhbmRsZURpc2Nvbm5lY3QpO1xuXG4gIC8vIHBhdGNoIGluIHRoZSBjcmVhdGUgb2ZmZXIgZnVuY3Rpb25zXG4gIG1vbi5jcmVhdGVPZmZlciA9IHF1ZXVlKGNyZWF0ZU9mZmVyKTtcblxuICByZXR1cm4gbW9uO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvdXBsZTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyMgcnRjLXRvb2xzL2RldGVjdFxuXG4gIFByb3ZpZGUgdGhlIFtydGMtY29yZS9kZXRlY3RdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLWNvcmUjZGV0ZWN0KVxuICBmdW5jdGlvbmFsaXR5LlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpO1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdnZW5lcmF0b3JzJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJ2NvZy9kZWZhdWx0cycpO1xuXG52YXIgbWFwcGluZ3MgPSB7XG4gIGNyZWF0ZToge1xuICAgIGR0bHM6IGZ1bmN0aW9uKGMpIHtcbiAgICAgIGlmICghIGRldGVjdC5tb3opIHtcbiAgICAgICAgYy5vcHRpb25hbCA9IChjLm9wdGlvbmFsIHx8IFtdKS5jb25jYXQoeyBEdGxzU3J0cEtleUFncmVlbWVudDogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICAjIyMgcnRjLXRvb2xzL2dlbmVyYXRvcnNcblxuICBUaGUgZ2VuZXJhdG9ycyBwYWNrYWdlIHByb3ZpZGVzIHNvbWUgdXRpbGl0eSBtZXRob2RzIGZvciBnZW5lcmF0aW5nXG4gIGNvbnN0cmFpbnQgb2JqZWN0cyBhbmQgc2ltaWxhciBjb25zdHJ1Y3RzLlxuXG4gIGBgYGpzXG4gIHZhciBnZW5lcmF0b3JzID0gcmVxdWlyZSgncnRjL2dlbmVyYXRvcnMnKTtcbiAgYGBgXG5cbioqL1xuXG4vKipcbiAgIyMjIyBnZW5lcmF0b3JzLmNvbmZpZyhjb25maWcpXG5cbiAgR2VuZXJhdGUgYSBjb25maWd1cmF0aW9uIG9iamVjdCBzdWl0YWJsZSBmb3IgcGFzc2luZyBpbnRvIGFuIFczQ1xuICBSVENQZWVyQ29ubmVjdGlvbiBjb25zdHJ1Y3RvciBmaXJzdCBhcmd1bWVudCwgYmFzZWQgb24gb3VyIGN1c3RvbSBjb25maWcuXG4qKi9cbmV4cG9ydHMuY29uZmlnID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gIHJldHVybiBkZWZhdWx0cyhjb25maWcsIHtcbiAgICBpY2VTZXJ2ZXJzOiBbXVxuICB9KTtcbn07XG5cbi8qKlxuICAjIyMjIGdlbmVyYXRvcnMuY29ubmVjdGlvbkNvbnN0cmFpbnRzKGZsYWdzLCBjb25zdHJhaW50cylcblxuICBUaGlzIGlzIGEgaGVscGVyIGZ1bmN0aW9uIHRoYXQgd2lsbCBnZW5lcmF0ZSBhcHByb3ByaWF0ZSBjb25uZWN0aW9uXG4gIGNvbnN0cmFpbnRzIGZvciBhIG5ldyBgUlRDUGVlckNvbm5lY3Rpb25gIG9iamVjdCB3aGljaCBpcyBjb25zdHJ1Y3RlZFxuICBpbiB0aGUgZm9sbG93aW5nIHdheTpcblxuICBgYGBqc1xuICB2YXIgY29ubiA9IG5ldyBSVENQZWVyQ29ubmVjdGlvbihmbGFncywgY29uc3RyYWludHMpO1xuICBgYGBcblxuICBJbiBtb3N0IGNhc2VzIHRoZSBjb25zdHJhaW50cyBvYmplY3QgY2FuIGJlIGxlZnQgZW1wdHksIGJ1dCB3aGVuIGNyZWF0aW5nXG4gIGRhdGEgY2hhbm5lbHMgc29tZSBhZGRpdGlvbmFsIG9wdGlvbnMgYXJlIHJlcXVpcmVkLiAgVGhpcyBmdW5jdGlvblxuICBjYW4gZ2VuZXJhdGUgdGhvc2UgYWRkaXRpb25hbCBvcHRpb25zIGFuZCBpbnRlbGxpZ2VudGx5IGNvbWJpbmUgYW55XG4gIHVzZXIgZGVmaW5lZCBjb25zdHJhaW50cyAoaW4gYGNvbnN0cmFpbnRzYCkgd2l0aCBzaG9ydGhhbmQgZmxhZ3MgdGhhdFxuICBtaWdodCBiZSBwYXNzZWQgd2hpbGUgdXNpbmcgdGhlIGBydGMuY3JlYXRlQ29ubmVjdGlvbmAgaGVscGVyLlxuKiovXG5leHBvcnRzLmNvbm5lY3Rpb25Db25zdHJhaW50cyA9IGZ1bmN0aW9uKGZsYWdzLCBjb25zdHJhaW50cykge1xuICB2YXIgZ2VuZXJhdGVkID0ge307XG4gIHZhciBtID0gbWFwcGluZ3MuY3JlYXRlO1xuICB2YXIgb3V0O1xuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgZmxhZ3MgYW5kIGFwcGx5IHRoZSBjcmVhdGUgbWFwcGluZ3NcbiAgT2JqZWN0LmtleXMoZmxhZ3MgfHwge30pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKG1ba2V5XSkge1xuICAgICAgbVtrZXldKGdlbmVyYXRlZCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBnZW5lcmF0ZSB0aGUgY29ubmVjdGlvbiBjb25zdHJhaW50c1xuICBvdXQgPSBkZWZhdWx0cyh7fSwgY29uc3RyYWludHMsIGdlbmVyYXRlZCk7XG4gIGRlYnVnKCdnZW5lcmF0ZWQgY29ubmVjdGlvbiBjb25zdHJhaW50czogJywgb3V0KTtcblxuICByZXR1cm4gb3V0O1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMgcnRjLXRvb2xzXG5cbiAgVGhlIGBydGMtdG9vbHNgIG1vZHVsZSBkb2VzIG1vc3Qgb2YgdGhlIGhlYXZ5IGxpZnRpbmcgd2l0aGluIHRoZVxuICBbcnRjLmlvXShodHRwOi8vcnRjLmlvKSBzdWl0ZS4gIFByaW1hcmlseSBpdCBoYW5kbGVzIHRoZSBsb2dpYyBvZiBjb3VwbGluZ1xuICBhIGxvY2FsIGBSVENQZWVyQ29ubmVjdGlvbmAgd2l0aCBpdCdzIHJlbW90ZSBjb3VudGVycGFydCB2aWEgYW5cbiAgW3J0Yy1zaWduYWxsZXJdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXNpZ25hbGxlcikgc2lnbmFsbGluZ1xuICBjaGFubmVsLlxuXG4gICMjIEdldHRpbmcgU3RhcnRlZFxuXG4gIElmIHlvdSBkZWNpZGUgdGhhdCB0aGUgYHJ0Yy10b29sc2AgbW9kdWxlIGlzIGEgYmV0dGVyIGZpdCBmb3IgeW91IHRoYW4gZWl0aGVyXG4gIFtydGMtcXVpY2tjb25uZWN0XShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1xdWlja2Nvbm5lY3QpIG9yXG4gIFtydGMtZ2x1ZV0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtZ2x1ZSkgdGhlbiB0aGUgY29kZSBzbmlwcGV0IGJlbG93XG4gIHdpbGwgcHJvdmlkZSB5b3UgYSBndWlkZSBvbiBob3cgdG8gZ2V0IHN0YXJ0ZWQgdXNpbmcgaXQgaW4gY29uanVuY3Rpb24gd2l0aFxuICB0aGUgW3J0Yy1zaWduYWxsZXJdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXNpZ25hbGxlcikgYW5kXG4gIFtydGMtbWVkaWFdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLW1lZGlhKSBtb2R1bGVzOlxuXG4gIDw8PCBleGFtcGxlcy9nZXR0aW5nLXN0YXJ0ZWQuanNcblxuICBUaGlzIGNvZGUgZGVmaW5pdGVseSBkb2Vzbid0IGNvdmVyIGFsbCB0aGUgY2FzZXMgdGhhdCB5b3UgbmVlZCB0byBjb25zaWRlclxuICAoaS5lLiBwZWVycyBsZWF2aW5nLCBldGMpIGJ1dCBpdCBzaG91bGQgZGVtb25zdHJhdGUgaG93IHRvOlxuXG4gIDEuIENhcHR1cmUgdmlkZW8gYW5kIGFkZCBpdCB0byBhIHBlZXIgY29ubmVjdGlvblxuICAyLiBDb3VwbGUgYSBsb2NhbCBwZWVyIGNvbm5lY3Rpb24gd2l0aCBhIHJlbW90ZSBwZWVyIGNvbm5lY3Rpb25cbiAgMy4gRGVhbCB3aXRoIHRoZSByZW1vdGUgc3RlYW0gYmVpbmcgZGlzY292ZXJlZCBhbmQgaG93IHRvIHJlbmRlclxuICAgICB0aGF0IHRvIHRoZSBsb2NhbCBpbnRlcmZhY2UuXG5cbiAgIyMgUmVmZXJlbmNlXG5cbioqL1xuXG52YXIgZ2VuID0gcmVxdWlyZSgnLi9nZW5lcmF0b3JzJyk7XG5cbi8vIGV4cG9ydCBkZXRlY3RcbnZhciBkZXRlY3QgPSBleHBvcnRzLmRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG52YXIgZmluZFBsdWdpbiA9IHJlcXVpcmUoJ3J0Yy1jb3JlL3BsdWdpbicpO1xuXG4vLyBleHBvcnQgY29nIGxvZ2dlciBmb3IgY29udmVuaWVuY2VcbmV4cG9ydHMubG9nZ2VyID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpO1xuXG4vLyBleHBvcnQgcGVlciBjb25uZWN0aW9uXG52YXIgUlRDUGVlckNvbm5lY3Rpb24gPVxuZXhwb3J0cy5SVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcblxuLy8gYWRkIHRoZSBjb3VwbGUgdXRpbGl0eVxuZXhwb3J0cy5jb3VwbGUgPSByZXF1aXJlKCcuL2NvdXBsZScpO1xuXG4vKipcbiAgIyMjIGNyZWF0ZUNvbm5lY3Rpb25cblxuICBgYGBcbiAgY3JlYXRlQ29ubmVjdGlvbihvcHRzPywgY29uc3RyYWludHM/KSA9PiBSVENQZWVyQ29ubmVjdGlvblxuICBgYGBcblxuICBDcmVhdGUgYSBuZXcgYFJUQ1BlZXJDb25uZWN0aW9uYCBhdXRvIGdlbmVyYXRpbmcgZGVmYXVsdCBvcHRzIGFzIHJlcXVpcmVkLlxuXG4gIGBgYGpzXG4gIHZhciBjb25uO1xuXG4gIC8vIHRoaXMgaXMgb2tcbiAgY29ubiA9IHJ0Yy5jcmVhdGVDb25uZWN0aW9uKCk7XG5cbiAgLy8gYW5kIHNvIGlzIHRoaXNcbiAgY29ubiA9IHJ0Yy5jcmVhdGVDb25uZWN0aW9uKHtcbiAgICBpY2VTZXJ2ZXJzOiBbXVxuICB9KTtcbiAgYGBgXG4qKi9cbmV4cG9ydHMuY3JlYXRlQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKG9wdHMsIGNvbnN0cmFpbnRzKSB7XG4gIHZhciBwbHVnaW4gPSBmaW5kUGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcbiAgdmFyIG5vcm1hbGl6ZSA9IChwbHVnaW4gPyBwbHVnaW4ubm9ybWFsaXplSWNlIDogbnVsbCkgfHwgcmVxdWlyZSgnbm9ybWFsaWNlJyk7XG5cbiAgLy8gZ2VuZXJhdGUgdGhlIGNvbmZpZyBiYXNlZCBvbiBvcHRpb25zIHByb3ZpZGVkXG4gIHZhciBjb25maWcgPSBnZW4uY29uZmlnKG9wdHMpO1xuXG4gIC8vIGdlbmVyYXRlIGFwcHJvcHJpYXRlIGNvbm5lY3Rpb24gY29uc3RyYWludHNcbiAgdmFyIGNvbnN0cmFpbnRzID0gZ2VuLmNvbm5lY3Rpb25Db25zdHJhaW50cyhvcHRzLCBjb25zdHJhaW50cyk7XG5cbiAgLy8gZW5zdXJlIHdlIGhhdmUgdmFsaWQgaWNlU2VydmVyc1xuICBjb25maWcuaWNlU2VydmVycyA9IChjb25maWcuaWNlU2VydmVycyB8fCBbXSkubWFwKG5vcm1hbGl6ZSk7XG5cbiAgaWYgKHBsdWdpbiAmJiB0eXBlb2YgcGx1Z2luLmNyZWF0ZUNvbm5lY3Rpb24gPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBwbHVnaW4uY3JlYXRlQ29ubmVjdGlvbihjb25maWcsIGNvbnN0cmFpbnRzKTtcbiAgfVxuICBlbHNlIHtcbiAgICByZXR1cm4gbmV3ICgob3B0cyB8fCB7fSkuUlRDUGVlckNvbm5lY3Rpb24gfHwgUlRDUGVlckNvbm5lY3Rpb24pKFxuICAgICAgY29uZmlnLCBjb25zdHJhaW50c1xuICAgICk7XG4gIH1cbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMycpO1xuXG4vLyBkZWZpbmUgc29tZSBzdGF0ZSBtYXBwaW5ncyB0byBzaW1wbGlmeSB0aGUgZXZlbnRzIHdlIGdlbmVyYXRlXG52YXIgc3RhdGVNYXBwaW5ncyA9IHtcbiAgY29tcGxldGVkOiAnY29ubmVjdGVkJ1xufTtcblxuLy8gZGVmaW5lIHRoZSBldmVudHMgdGhhdCB3ZSBuZWVkIHRvIHdhdGNoIGZvciBwZWVyIGNvbm5lY3Rpb25cbi8vIHN0YXRlIGNoYW5nZXNcbnZhciBwZWVyU3RhdGVFdmVudHMgPSBbXG4gICdzaWduYWxpbmdzdGF0ZWNoYW5nZScsXG4gICdpY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UnLFxuXTtcblxuLyoqXG4gICMjIyBydGMtdG9vbHMvbW9uaXRvclxuXG4gIGBgYFxuICBtb25pdG9yKHBjLCB0YXJnZXRJZCwgc2lnbmFsbGVyLCBvcHRzPykgPT4gRXZlbnRFbWl0dGVyXG4gIGBgYFxuXG4gIFRoZSBtb25pdG9yIGlzIGEgdXNlZnVsIHRvb2wgZm9yIGRldGVybWluaW5nIHRoZSBzdGF0ZSBvZiBgcGNgIChhblxuICBgUlRDUGVlckNvbm5lY3Rpb25gKSBpbnN0YW5jZSBpbiB0aGUgY29udGV4dCBvZiB5b3VyIGFwcGxpY2F0aW9uLiBUaGVcbiAgbW9uaXRvciB1c2VzIGJvdGggdGhlIGBpY2VDb25uZWN0aW9uU3RhdGVgIGluZm9ybWF0aW9uIG9mIHRoZSBwZWVyXG4gIGNvbm5lY3Rpb24gYW5kIGFsc28gdGhlIHZhcmlvdXNcbiAgW3NpZ25hbGxlciBldmVudHNdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXNpZ25hbGxlciNzaWduYWxsZXItZXZlbnRzKVxuICB0byBkZXRlcm1pbmUgd2hlbiB0aGUgY29ubmVjdGlvbiBoYXMgYmVlbiBgY29ubmVjdGVkYCBhbmQgd2hlbiBpdCBoYXNcbiAgYmVlbiBgZGlzY29ubmVjdGVkYC5cblxuICBBIG1vbml0b3IgY3JlYXRlZCBgRXZlbnRFbWl0dGVyYCBpcyByZXR1cm5lZCBhcyB0aGUgcmVzdWx0IG9mIGFcbiAgW2NvdXBsZV0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMjcnRjY291cGxlKSBiZXR3ZWVuIGEgbG9jYWwgcGVlclxuICBjb25uZWN0aW9uIGFuZCBpdCdzIHJlbW90ZSBjb3VudGVycGFydC5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBjLCB0YXJnZXRJZCwgc2lnbmFsbGVyLCBvcHRzKSB7XG4gIHZhciBkZWJ1Z0xhYmVsID0gKG9wdHMgfHwge30pLmRlYnVnTGFiZWwgfHwgJ3J0Yyc7XG4gIHZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKShkZWJ1Z0xhYmVsICsgJy9tb25pdG9yJyk7XG4gIHZhciBtb25pdG9yID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICB2YXIgc3RhdGU7XG5cbiAgZnVuY3Rpb24gY2hlY2tTdGF0ZSgpIHtcbiAgICB2YXIgbmV3U3RhdGUgPSBnZXRNYXBwZWRTdGF0ZShwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgIGRlYnVnKCdzdGF0ZSBjaGFuZ2VkOiAnICsgcGMuaWNlQ29ubmVjdGlvblN0YXRlICsgJywgbWFwcGVkOiAnICsgbmV3U3RhdGUpO1xuXG4gICAgLy8gZmxhZyB0aGUgd2UgaGFkIGEgc3RhdGUgY2hhbmdlXG4gICAgbW9uaXRvci5lbWl0KCdjaGFuZ2UnLCBwYyk7XG5cbiAgICAvLyBpZiB0aGUgYWN0aXZlIHN0YXRlIGhhcyBjaGFuZ2VkLCB0aGVuIHNlbmQgdGhlIGFwcG9wcmlhdGUgbWVzc2FnZVxuICAgIGlmIChzdGF0ZSAhPT0gbmV3U3RhdGUpIHtcbiAgICAgIG1vbml0b3IuZW1pdChuZXdTdGF0ZSk7XG4gICAgICBzdGF0ZSA9IG5ld1N0YXRlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVBlZXJMZWF2ZShwZWVySWQpIHtcbiAgICBkZWJ1ZygnY2FwdHVyZWQgcGVlciBsZWF2ZSBmb3IgcGVlcjogJyArIHBlZXJJZCk7XG5cbiAgICAvLyBpZiB0aGUgcGVlciBsZWF2aW5nIGlzIG5vdCB0aGUgcGVlciB3ZSBhcmUgY29ubmVjdGVkIHRvXG4gICAgLy8gdGhlbiB3ZSBhcmVuJ3QgaW50ZXJlc3RlZFxuICAgIGlmIChwZWVySWQgIT09IHRhcmdldElkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gdHJpZ2dlciBhIGNsb3NlZCBldmVudFxuICAgIG1vbml0b3IuZW1pdCgnY2xvc2VkJyk7XG4gIH1cblxuICBwYy5vbmNsb3NlID0gbW9uaXRvci5lbWl0LmJpbmQobW9uaXRvciwgJ2Nsb3NlZCcpO1xuICBwZWVyU3RhdGVFdmVudHMuZm9yRWFjaChmdW5jdGlvbihldnROYW1lKSB7XG4gICAgcGNbJ29uJyArIGV2dE5hbWVdID0gY2hlY2tTdGF0ZTtcbiAgfSk7XG5cbiAgbW9uaXRvci5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgcGMub25jbG9zZSA9IG51bGw7XG4gICAgcGVlclN0YXRlRXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZ0TmFtZSkge1xuICAgICAgcGNbJ29uJyArIGV2dE5hbWVdID0gbnVsbDtcbiAgICB9KTtcblxuICAgIC8vIHJlbW92ZSB0aGUgcGVlcjpsZWF2ZSBsaXN0ZW5lclxuICAgIGlmIChzaWduYWxsZXIgJiYgdHlwZW9mIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ3BlZXI6bGVhdmUnLCBoYW5kbGVQZWVyTGVhdmUpO1xuICAgIH1cbiAgfTtcblxuICBtb25pdG9yLmNoZWNrU3RhdGUgPSBjaGVja1N0YXRlO1xuXG4gIC8vIGlmIHdlIGhhdmVuJ3QgYmVlbiBwcm92aWRlZCBhIHZhbGlkIHBlZXIgY29ubmVjdGlvbiwgYWJvcnRcbiAgaWYgKCEgcGMpIHtcbiAgICByZXR1cm4gbW9uaXRvcjtcbiAgfVxuXG4gIC8vIGRldGVybWluZSB0aGUgaW5pdGlhbCBpcyBhY3RpdmUgc3RhdGVcbiAgc3RhdGUgPSBnZXRNYXBwZWRTdGF0ZShwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuXG4gIC8vIGlmIHdlJ3ZlIGJlZW4gcHJvdmlkZWQgYSBzaWduYWxsZXIsIHRoZW4gd2F0Y2ggZm9yIHBlZXI6bGVhdmUgZXZlbnRzXG4gIGlmIChzaWduYWxsZXIgJiYgdHlwZW9mIHNpZ25hbGxlci5vbiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgc2lnbmFsbGVyLm9uKCdwZWVyOmxlYXZlJywgaGFuZGxlUGVlckxlYXZlKTtcbiAgfVxuXG4gIC8vIGlmIHdlIGFyZSBhY3RpdmUsIHRyaWdnZXIgdGhlIGNvbm5lY3RlZCBzdGF0ZVxuICAvLyBzZXRUaW1lb3V0KG1vbml0b3IuZW1pdC5iaW5kKG1vbml0b3IsIHN0YXRlKSwgMCk7XG5cbiAgcmV0dXJuIG1vbml0b3I7XG59O1xuXG4vKiBpbnRlcm5hbCBoZWxwZXJzICovXG5cbmZ1bmN0aW9uIGdldE1hcHBlZFN0YXRlKHN0YXRlKSB7XG4gIHJldHVybiBzdGF0ZU1hcHBpbmdzW3N0YXRlXSB8fCBzdGF0ZTtcbn1cbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vKiFcbiAqIGFzeW5jXG4gKiBodHRwczovL2dpdGh1Yi5jb20vY2FvbGFuL2FzeW5jXG4gKlxuICogQ29weXJpZ2h0IDIwMTAtMjAxNCBDYW9sYW4gTWNNYWhvblxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKi9cbi8qanNoaW50IG9uZXZhcjogZmFsc2UsIGluZGVudDo0ICovXG4vKmdsb2JhbCBzZXRJbW1lZGlhdGU6IGZhbHNlLCBzZXRUaW1lb3V0OiBmYWxzZSwgY29uc29sZTogZmFsc2UgKi9cbihmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgYXN5bmMgPSB7fTtcblxuICAgIC8vIGdsb2JhbCBvbiB0aGUgc2VydmVyLCB3aW5kb3cgaW4gdGhlIGJyb3dzZXJcbiAgICB2YXIgcm9vdCwgcHJldmlvdXNfYXN5bmM7XG5cbiAgICByb290ID0gdGhpcztcbiAgICBpZiAocm9vdCAhPSBudWxsKSB7XG4gICAgICBwcmV2aW91c19hc3luYyA9IHJvb3QuYXN5bmM7XG4gICAgfVxuXG4gICAgYXN5bmMubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcm9vdC5hc3luYyA9IHByZXZpb3VzX2FzeW5jO1xuICAgICAgICByZXR1cm4gYXN5bmM7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIG9ubHlfb25jZShmbikge1xuICAgICAgICB2YXIgY2FsbGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChjYWxsZWQpIHRocm93IG5ldyBFcnJvcihcIkNhbGxiYWNrIHdhcyBhbHJlYWR5IGNhbGxlZC5cIik7XG4gICAgICAgICAgICBjYWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgZm4uYXBwbHkocm9vdCwgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vLy8gY3Jvc3MtYnJvd3NlciBjb21wYXRpYmxpdHkgZnVuY3Rpb25zIC8vLy9cblxuICAgIHZhciBfdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4gICAgdmFyIF9pc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBfdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgIH07XG5cbiAgICB2YXIgX2VhY2ggPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvcikge1xuICAgICAgICBpZiAoYXJyLmZvckVhY2gpIHtcbiAgICAgICAgICAgIHJldHVybiBhcnIuZm9yRWFjaChpdGVyYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGFycltpXSwgaSwgYXJyKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgX21hcCA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yKSB7XG4gICAgICAgIGlmIChhcnIubWFwKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLm1hcChpdGVyYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgX2VhY2goYXJyLCBmdW5jdGlvbiAoeCwgaSwgYSkge1xuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGl0ZXJhdG9yKHgsIGksIGEpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH07XG5cbiAgICB2YXIgX3JlZHVjZSA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBtZW1vKSB7XG4gICAgICAgIGlmIChhcnIucmVkdWNlKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLnJlZHVjZShpdGVyYXRvciwgbWVtbyk7XG4gICAgICAgIH1cbiAgICAgICAgX2VhY2goYXJyLCBmdW5jdGlvbiAoeCwgaSwgYSkge1xuICAgICAgICAgICAgbWVtbyA9IGl0ZXJhdG9yKG1lbW8sIHgsIGksIGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcblxuICAgIHZhciBfa2V5cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrIGluIG9iaikge1xuICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIGtleXMucHVzaChrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5cztcbiAgICB9O1xuXG4gICAgLy8vLyBleHBvcnRlZCBhc3luYyBtb2R1bGUgZnVuY3Rpb25zIC8vLy9cblxuICAgIC8vLy8gbmV4dFRpY2sgaW1wbGVtZW50YXRpb24gd2l0aCBicm93c2VyLWNvbXBhdGlibGUgZmFsbGJhY2sgLy8vL1xuICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcgfHwgIShwcm9jZXNzLm5leHRUaWNrKSkge1xuICAgICAgICBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICAvLyBub3QgYSBkaXJlY3QgYWxpYXMgZm9yIElFMTAgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbik7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gYXN5bmMubmV4dFRpY2s7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhc3luYy5uZXh0VGljayA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhc3luYy5uZXh0VGljayA9IHByb2Nlc3MubmV4dFRpY2s7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgIC8vIG5vdCBhIGRpcmVjdCBhbGlhcyBmb3IgSUUxMCBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gYXN5bmMubmV4dFRpY2s7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYy5lYWNoID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICghYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIG9ubHlfb25jZShkb25lKSApO1xuICAgICAgICB9KTtcbiAgICAgICAgZnVuY3Rpb24gZG9uZShlcnIpIHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBhc3luYy5mb3JFYWNoID0gYXN5bmMuZWFjaDtcblxuICAgIGFzeW5jLmVhY2hTZXJpZXMgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgaWYgKCFhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY29tcGxldGVkID0gMDtcbiAgICAgICAgdmFyIGl0ZXJhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihhcnJbY29tcGxldGVkXSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29tcGxldGVkID49IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVyYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaXRlcmF0ZSgpO1xuICAgIH07XG4gICAgYXN5bmMuZm9yRWFjaFNlcmllcyA9IGFzeW5jLmVhY2hTZXJpZXM7XG5cbiAgICBhc3luYy5lYWNoTGltaXQgPSBmdW5jdGlvbiAoYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBmbiA9IF9lYWNoTGltaXQobGltaXQpO1xuICAgICAgICBmbi5hcHBseShudWxsLCBbYXJyLCBpdGVyYXRvciwgY2FsbGJhY2tdKTtcbiAgICB9O1xuICAgIGFzeW5jLmZvckVhY2hMaW1pdCA9IGFzeW5jLmVhY2hMaW1pdDtcblxuICAgIHZhciBfZWFjaExpbWl0ID0gZnVuY3Rpb24gKGxpbWl0KSB7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgIGlmICghYXJyLmxlbmd0aCB8fCBsaW1pdCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY29tcGxldGVkID0gMDtcbiAgICAgICAgICAgIHZhciBzdGFydGVkID0gMDtcbiAgICAgICAgICAgIHZhciBydW5uaW5nID0gMDtcblxuICAgICAgICAgICAgKGZ1bmN0aW9uIHJlcGxlbmlzaCAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlIChydW5uaW5nIDwgbGltaXQgJiYgc3RhcnRlZCA8IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBydW5uaW5nICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGl0ZXJhdG9yKGFycltzdGFydGVkIC0gMV0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBydW5uaW5nIC09IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBsZW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgIH07XG4gICAgfTtcblxuXG4gICAgdmFyIGRvUGFyYWxsZWwgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBbYXN5bmMuZWFjaF0uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHZhciBkb1BhcmFsbGVsTGltaXQgPSBmdW5jdGlvbihsaW1pdCwgZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBbX2VhY2hMaW1pdChsaW1pdCldLmNvbmNhdChhcmdzKSk7XG4gICAgICAgIH07XG4gICAgfTtcbiAgICB2YXIgZG9TZXJpZXMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBbYXN5bmMuZWFjaFNlcmllc10uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG5cbiAgICB2YXIgX2FzeW5jTWFwID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgYXJyID0gX21hcChhcnIsIGZ1bmN0aW9uICh4LCBpKSB7XG4gICAgICAgICAgICByZXR1cm4ge2luZGV4OiBpLCB2YWx1ZTogeH07XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpdGVyYXRvcih4LnZhbHVlLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpdGVyYXRvcih4LnZhbHVlLCBmdW5jdGlvbiAoZXJyLCB2KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNbeC5pbmRleF0gPSB2O1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgYXN5bmMubWFwID0gZG9QYXJhbGxlbChfYXN5bmNNYXApO1xuICAgIGFzeW5jLm1hcFNlcmllcyA9IGRvU2VyaWVzKF9hc3luY01hcCk7XG4gICAgYXN5bmMubWFwTGltaXQgPSBmdW5jdGlvbiAoYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfbWFwTGltaXQobGltaXQpKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgdmFyIF9tYXBMaW1pdCA9IGZ1bmN0aW9uKGxpbWl0KSB7XG4gICAgICAgIHJldHVybiBkb1BhcmFsbGVsTGltaXQobGltaXQsIF9hc3luY01hcCk7XG4gICAgfTtcblxuICAgIC8vIHJlZHVjZSBvbmx5IGhhcyBhIHNlcmllcyB2ZXJzaW9uLCBhcyBkb2luZyByZWR1Y2UgaW4gcGFyYWxsZWwgd29uJ3RcbiAgICAvLyB3b3JrIGluIG1hbnkgc2l0dWF0aW9ucy5cbiAgICBhc3luYy5yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMuZWFjaFNlcmllcyhhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IobWVtbywgeCwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgICAgIG1lbW8gPSB2O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBtZW1vKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvLyBpbmplY3QgYWxpYXNcbiAgICBhc3luYy5pbmplY3QgPSBhc3luYy5yZWR1Y2U7XG4gICAgLy8gZm9sZGwgYWxpYXNcbiAgICBhc3luYy5mb2xkbCA9IGFzeW5jLnJlZHVjZTtcblxuICAgIGFzeW5jLnJlZHVjZVJpZ2h0ID0gZnVuY3Rpb24gKGFyciwgbWVtbywgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXZlcnNlZCA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH0pLnJldmVyc2UoKTtcbiAgICAgICAgYXN5bmMucmVkdWNlKHJldmVyc2VkLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG4gICAgLy8gZm9sZHIgYWxpYXNcbiAgICBhc3luYy5mb2xkciA9IGFzeW5jLnJlZHVjZVJpZ2h0O1xuXG4gICAgdmFyIF9maWx0ZXIgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICBhcnIgPSBfbWFwKGFyciwgZnVuY3Rpb24gKHgsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiB7aW5kZXg6IGksIHZhbHVlOiB4fTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soX21hcChyZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5pbmRleCAtIGIuaW5kZXg7XG4gICAgICAgICAgICB9KSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5maWx0ZXIgPSBkb1BhcmFsbGVsKF9maWx0ZXIpO1xuICAgIGFzeW5jLmZpbHRlclNlcmllcyA9IGRvU2VyaWVzKF9maWx0ZXIpO1xuICAgIC8vIHNlbGVjdCBhbGlhc1xuICAgIGFzeW5jLnNlbGVjdCA9IGFzeW5jLmZpbHRlcjtcbiAgICBhc3luYy5zZWxlY3RTZXJpZXMgPSBhc3luYy5maWx0ZXJTZXJpZXM7XG5cbiAgICB2YXIgX3JlamVjdCA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIGFyciA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCwgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHtpbmRleDogaSwgdmFsdWU6IHh9O1xuICAgICAgICB9KTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LnZhbHVlLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICghdikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soX21hcChyZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5pbmRleCAtIGIuaW5kZXg7XG4gICAgICAgICAgICB9KSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5yZWplY3QgPSBkb1BhcmFsbGVsKF9yZWplY3QpO1xuICAgIGFzeW5jLnJlamVjdFNlcmllcyA9IGRvU2VyaWVzKF9yZWplY3QpO1xuXG4gICAgdmFyIF9kZXRlY3QgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBtYWluX2NhbGxiYWNrKSB7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayh4KTtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgbWFpbl9jYWxsYmFjaygpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLmRldGVjdCA9IGRvUGFyYWxsZWwoX2RldGVjdCk7XG4gICAgYXN5bmMuZGV0ZWN0U2VyaWVzID0gZG9TZXJpZXMoX2RldGVjdCk7XG5cbiAgICBhc3luYy5zb21lID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIG1haW5fY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMuZWFjaChhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgbWFpbl9jYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgLy8gYW55IGFsaWFzXG4gICAgYXN5bmMuYW55ID0gYXN5bmMuc29tZTtcblxuICAgIGFzeW5jLmV2ZXJ5ID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIG1haW5fY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMuZWFjaChhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXYpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBtYWluX2NhbGxiYWNrKHRydWUpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8vIGFsbCBhbGlhc1xuICAgIGFzeW5jLmFsbCA9IGFzeW5jLmV2ZXJ5O1xuXG4gICAgYXN5bmMuc29ydEJ5ID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLm1hcChhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKGVyciwgY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7dmFsdWU6IHgsIGNyaXRlcmlhOiBjcml0ZXJpYX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbiAobGVmdCwgcmlnaHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhLCBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogMDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIF9tYXAocmVzdWx0cy5zb3J0KGZuKSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMuYXV0byA9IGZ1bmN0aW9uICh0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgdmFyIGtleXMgPSBfa2V5cyh0YXNrcyk7XG4gICAgICAgIHZhciByZW1haW5pbmdUYXNrcyA9IGtleXMubGVuZ3RoXG4gICAgICAgIGlmICghcmVtYWluaW5nVGFza3MpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gW107XG4gICAgICAgIHZhciBhZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnVuc2hpZnQoZm4pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgcmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyc1tpXSA9PT0gZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHRhc2tDb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJlbWFpbmluZ1Rhc2tzLS1cbiAgICAgICAgICAgIF9lYWNoKGxpc3RlbmVycy5zbGljZSgwKSwgZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGFkZExpc3RlbmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghcmVtYWluaW5nVGFza3MpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGhlQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgICAgICAgICAvLyBwcmV2ZW50IGZpbmFsIGNhbGxiYWNrIGZyb20gY2FsbGluZyBpdHNlbGYgaWYgaXQgZXJyb3JzXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgICAgICAgICAgICAgIHRoZUNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBfZWFjaChrZXlzLCBmdW5jdGlvbiAoaykge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSBfaXNBcnJheSh0YXNrc1trXSkgPyB0YXNrc1trXTogW3Rhc2tzW2tdXTtcbiAgICAgICAgICAgIHZhciB0YXNrQ2FsbGJhY2sgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzYWZlUmVzdWx0cyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBfZWFjaChfa2V5cyhyZXN1bHRzKSwgZnVuY3Rpb24ocmtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2FmZVJlc3VsdHNbcmtleV0gPSByZXN1bHRzW3JrZXldO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc2FmZVJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIHNhZmVSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gc3RvcCBzdWJzZXF1ZW50IGVycm9ycyBoaXR0aW5nIGNhbGxiYWNrIG11bHRpcGxlIHRpbWVzXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKHRhc2tDb21wbGV0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciByZXF1aXJlcyA9IHRhc2suc2xpY2UoMCwgTWF0aC5hYnModGFzay5sZW5ndGggLSAxKSkgfHwgW107XG4gICAgICAgICAgICB2YXIgcmVhZHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9yZWR1Y2UocmVxdWlyZXMsIGZ1bmN0aW9uIChhLCB4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoYSAmJiByZXN1bHRzLmhhc093blByb3BlcnR5KHgpKTtcbiAgICAgICAgICAgICAgICB9LCB0cnVlKSAmJiAhcmVzdWx0cy5oYXNPd25Qcm9wZXJ0eShrKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAocmVhZHkoKSkge1xuICAgICAgICAgICAgICAgIHRhc2tbdGFzay5sZW5ndGggLSAxXSh0YXNrQ2FsbGJhY2ssIHJlc3VsdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVhZHkoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFza1t0YXNrLmxlbmd0aCAtIDFdKHRhc2tDYWxsYmFjaywgcmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGFkZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLnJldHJ5ID0gZnVuY3Rpb24odGltZXMsIHRhc2ssIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBERUZBVUxUX1RJTUVTID0gNTtcbiAgICAgICAgdmFyIGF0dGVtcHRzID0gW107XG4gICAgICAgIC8vIFVzZSBkZWZhdWx0cyBpZiB0aW1lcyBub3QgcGFzc2VkXG4gICAgICAgIGlmICh0eXBlb2YgdGltZXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdGFzaztcbiAgICAgICAgICAgIHRhc2sgPSB0aW1lcztcbiAgICAgICAgICAgIHRpbWVzID0gREVGQVVMVF9USU1FUztcbiAgICAgICAgfVxuICAgICAgICAvLyBNYWtlIHN1cmUgdGltZXMgaXMgYSBudW1iZXJcbiAgICAgICAgdGltZXMgPSBwYXJzZUludCh0aW1lcywgMTApIHx8IERFRkFVTFRfVElNRVM7XG4gICAgICAgIHZhciB3cmFwcGVkVGFzayA9IGZ1bmN0aW9uKHdyYXBwZWRDYWxsYmFjaywgd3JhcHBlZFJlc3VsdHMpIHtcbiAgICAgICAgICAgIHZhciByZXRyeUF0dGVtcHQgPSBmdW5jdGlvbih0YXNrLCBmaW5hbEF0dGVtcHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oc2VyaWVzQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGFzayhmdW5jdGlvbihlcnIsIHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJpZXNDYWxsYmFjayghZXJyIHx8IGZpbmFsQXR0ZW1wdCwge2VycjogZXJyLCByZXN1bHQ6IHJlc3VsdH0pO1xuICAgICAgICAgICAgICAgICAgICB9LCB3cmFwcGVkUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB3aGlsZSAodGltZXMpIHtcbiAgICAgICAgICAgICAgICBhdHRlbXB0cy5wdXNoKHJldHJ5QXR0ZW1wdCh0YXNrLCAhKHRpbWVzLT0xKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXN5bmMuc2VyaWVzKGF0dGVtcHRzLCBmdW5jdGlvbihkb25lLCBkYXRhKXtcbiAgICAgICAgICAgICAgICBkYXRhID0gZGF0YVtkYXRhLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICh3cmFwcGVkQ2FsbGJhY2sgfHwgY2FsbGJhY2spKGRhdGEuZXJyLCBkYXRhLnJlc3VsdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiBhIGNhbGxiYWNrIGlzIHBhc3NlZCwgcnVuIHRoaXMgYXMgYSBjb250cm9sbCBmbG93XG4gICAgICAgIHJldHVybiBjYWxsYmFjayA/IHdyYXBwZWRUYXNrKCkgOiB3cmFwcGVkVGFza1xuICAgIH07XG5cbiAgICBhc3luYy53YXRlcmZhbGwgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICghX2lzQXJyYXkodGFza3MpKSB7XG4gICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgdG8gd2F0ZXJmYWxsIG11c3QgYmUgYW4gYXJyYXkgb2YgZnVuY3Rpb25zJyk7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB3cmFwSXRlcmF0b3IgPSBmdW5jdGlvbiAoaXRlcmF0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaCh3cmFwSXRlcmF0b3IobmV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlcmF0b3IuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIHdyYXBJdGVyYXRvcihhc3luYy5pdGVyYXRvcih0YXNrcykpKCk7XG4gICAgfTtcblxuICAgIHZhciBfcGFyYWxsZWwgPSBmdW5jdGlvbihlYWNoZm4sIHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAoX2lzQXJyYXkodGFza3MpKSB7XG4gICAgICAgICAgICBlYWNoZm4ubWFwKHRhc2tzLCBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZuKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGVyciwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0ge307XG4gICAgICAgICAgICBlYWNoZm4uZWFjaChfa2V5cyh0YXNrcyksIGZ1bmN0aW9uIChrLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHRhc2tzW2tdKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLnBhcmFsbGVsID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBfcGFyYWxsZWwoeyBtYXA6IGFzeW5jLm1hcCwgZWFjaDogYXN5bmMuZWFjaCB9LCB0YXNrcywgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5wYXJhbGxlbExpbWl0ID0gZnVuY3Rpb24odGFza3MsIGxpbWl0LCBjYWxsYmFjaykge1xuICAgICAgICBfcGFyYWxsZWwoeyBtYXA6IF9tYXBMaW1pdChsaW1pdCksIGVhY2g6IF9lYWNoTGltaXQobGltaXQpIH0sIHRhc2tzLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnNlcmllcyA9IGZ1bmN0aW9uICh0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgaWYgKF9pc0FycmF5KHRhc2tzKSkge1xuICAgICAgICAgICAgYXN5bmMubWFwU2VyaWVzKHRhc2tzLCBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZuKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGVyciwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0ge307XG4gICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKF9rZXlzKHRhc2tzKSwgZnVuY3Rpb24gKGssIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgdGFza3Nba10oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMuaXRlcmF0b3IgPSBmdW5jdGlvbiAodGFza3MpIHtcbiAgICAgICAgdmFyIG1ha2VDYWxsYmFjayA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFza3NbaW5kZXhdLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmbi5uZXh0KCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZm4ubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGluZGV4IDwgdGFza3MubGVuZ3RoIC0gMSkgPyBtYWtlQ2FsbGJhY2soaW5kZXggKyAxKTogbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZm47XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBtYWtlQ2FsbGJhY2soMCk7XG4gICAgfTtcblxuICAgIGFzeW5jLmFwcGx5ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShcbiAgICAgICAgICAgICAgICBudWxsLCBhcmdzLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIF9jb25jYXQgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGZuLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgciA9IFtdO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2IpIHtcbiAgICAgICAgICAgIGZuKHgsIGZ1bmN0aW9uIChlcnIsIHkpIHtcbiAgICAgICAgICAgICAgICByID0gci5jb25jYXQoeSB8fCBbXSk7XG4gICAgICAgICAgICAgICAgY2IoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIHIpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLmNvbmNhdCA9IGRvUGFyYWxsZWwoX2NvbmNhdCk7XG4gICAgYXN5bmMuY29uY2F0U2VyaWVzID0gZG9TZXJpZXMoX2NvbmNhdCk7XG5cbiAgICBhc3luYy53aGlsc3QgPSBmdW5jdGlvbiAodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh0ZXN0KCkpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhc3luYy53aGlsc3QodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5kb1doaWxzdCA9IGZ1bmN0aW9uIChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgaXRlcmF0b3IoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgaWYgKHRlc3QuYXBwbHkobnVsbCwgYXJncykpIHtcbiAgICAgICAgICAgICAgICBhc3luYy5kb1doaWxzdChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLnVudGlsID0gZnVuY3Rpb24gKHRlc3QsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoIXRlc3QoKSkge1xuICAgICAgICAgICAgaXRlcmF0b3IoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFzeW5jLnVudGlsKHRlc3QsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMuZG9VbnRpbCA9IGZ1bmN0aW9uIChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgaXRlcmF0b3IoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgaWYgKCF0ZXN0LmFwcGx5KG51bGwsIGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuZG9VbnRpbChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLnF1ZXVlID0gZnVuY3Rpb24gKHdvcmtlciwgY29uY3VycmVuY3kpIHtcbiAgICAgICAgaWYgKGNvbmN1cnJlbmN5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBfaW5zZXJ0KHEsIGRhdGEsIHBvcywgY2FsbGJhY2spIHtcbiAgICAgICAgICBpZiAoIXEuc3RhcnRlZCl7XG4gICAgICAgICAgICBxLnN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIV9pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAvLyBjYWxsIGRyYWluIGltbWVkaWF0ZWx5IGlmIHRoZXJlIGFyZSBubyB0YXNrc1xuICAgICAgICAgICAgIHJldHVybiBhc3luYy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgIGlmIChxLmRyYWluKSB7XG4gICAgICAgICAgICAgICAgICAgICBxLmRyYWluKCk7XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2VhY2goZGF0YSwgZnVuY3Rpb24odGFzaykge1xuICAgICAgICAgICAgICB2YXIgaXRlbSA9IHtcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHRhc2ssXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjazogdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nID8gY2FsbGJhY2sgOiBudWxsXG4gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgaWYgKHBvcykge1xuICAgICAgICAgICAgICAgIHEudGFza3MudW5zaGlmdChpdGVtKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBxLnRhc2tzLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAocS5zYXR1cmF0ZWQgJiYgcS50YXNrcy5sZW5ndGggPT09IHEuY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgICAgICAgIHEuc2F0dXJhdGVkKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKHEucHJvY2Vzcyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgd29ya2VycyA9IDA7XG4gICAgICAgIHZhciBxID0ge1xuICAgICAgICAgICAgdGFza3M6IFtdLFxuICAgICAgICAgICAgY29uY3VycmVuY3k6IGNvbmN1cnJlbmN5LFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBudWxsLFxuICAgICAgICAgICAgZW1wdHk6IG51bGwsXG4gICAgICAgICAgICBkcmFpbjogbnVsbCxcbiAgICAgICAgICAgIHN0YXJ0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgcGF1c2VkOiBmYWxzZSxcbiAgICAgICAgICAgIHB1c2g6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICBfaW5zZXJ0KHEsIGRhdGEsIGZhbHNlLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAga2lsbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBxLmRyYWluID0gbnVsbDtcbiAgICAgICAgICAgICAgcS50YXNrcyA9IFtdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVuc2hpZnQ6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICBfaW5zZXJ0KHEsIGRhdGEsIHRydWUsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9jZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFxLnBhdXNlZCAmJiB3b3JrZXJzIDwgcS5jb25jdXJyZW5jeSAmJiBxLnRhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFzayA9IHEudGFza3Muc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHEuZW1wdHkgJiYgcS50YXNrcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHEuZW1wdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB3b3JrZXJzICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd29ya2VycyAtPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXNrLmNhbGxiYWNrLmFwcGx5KHRhc2ssIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocS5kcmFpbiAmJiBxLnRhc2tzLmxlbmd0aCArIHdvcmtlcnMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBxLmRyYWluKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBxLnByb2Nlc3MoKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNiID0gb25seV9vbmNlKG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB3b3JrZXIodGFzay5kYXRhLCBjYik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBxLnRhc2tzLmxlbmd0aDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydW5uaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdvcmtlcnM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWRsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHEudGFza3MubGVuZ3RoICsgd29ya2VycyA9PT0gMDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYXVzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChxLnBhdXNlZCA9PT0gdHJ1ZSkgeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgICBxLnBhdXNlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcS5wcm9jZXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVzdW1lOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHEucGF1c2VkID09PSBmYWxzZSkgeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgICBxLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHEucHJvY2VzcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcTtcbiAgICB9O1xuICAgIFxuICAgIGFzeW5jLnByaW9yaXR5UXVldWUgPSBmdW5jdGlvbiAod29ya2VyLCBjb25jdXJyZW5jeSkge1xuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gX2NvbXBhcmVUYXNrcyhhLCBiKXtcbiAgICAgICAgICByZXR1cm4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBmdW5jdGlvbiBfYmluYXJ5U2VhcmNoKHNlcXVlbmNlLCBpdGVtLCBjb21wYXJlKSB7XG4gICAgICAgICAgdmFyIGJlZyA9IC0xLFxuICAgICAgICAgICAgICBlbmQgPSBzZXF1ZW5jZS5sZW5ndGggLSAxO1xuICAgICAgICAgIHdoaWxlIChiZWcgPCBlbmQpIHtcbiAgICAgICAgICAgIHZhciBtaWQgPSBiZWcgKyAoKGVuZCAtIGJlZyArIDEpID4+PiAxKTtcbiAgICAgICAgICAgIGlmIChjb21wYXJlKGl0ZW0sIHNlcXVlbmNlW21pZF0pID49IDApIHtcbiAgICAgICAgICAgICAgYmVnID0gbWlkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZW5kID0gbWlkIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGJlZztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gX2luc2VydChxLCBkYXRhLCBwcmlvcml0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgICBpZiAoIXEuc3RhcnRlZCl7XG4gICAgICAgICAgICBxLnN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIV9pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAvLyBjYWxsIGRyYWluIGltbWVkaWF0ZWx5IGlmIHRoZXJlIGFyZSBubyB0YXNrc1xuICAgICAgICAgICAgIHJldHVybiBhc3luYy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgIGlmIChxLmRyYWluKSB7XG4gICAgICAgICAgICAgICAgICAgICBxLmRyYWluKCk7XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2VhY2goZGF0YSwgZnVuY3Rpb24odGFzaykge1xuICAgICAgICAgICAgICB2YXIgaXRlbSA9IHtcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHRhc2ssXG4gICAgICAgICAgICAgICAgICBwcmlvcml0eTogcHJpb3JpdHksXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjazogdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nID8gY2FsbGJhY2sgOiBudWxsXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBxLnRhc2tzLnNwbGljZShfYmluYXJ5U2VhcmNoKHEudGFza3MsIGl0ZW0sIF9jb21wYXJlVGFza3MpICsgMSwgMCwgaXRlbSk7XG5cbiAgICAgICAgICAgICAgaWYgKHEuc2F0dXJhdGVkICYmIHEudGFza3MubGVuZ3RoID09PSBxLmNvbmN1cnJlbmN5KSB7XG4gICAgICAgICAgICAgICAgICBxLnNhdHVyYXRlZCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdGFydCB3aXRoIGEgbm9ybWFsIHF1ZXVlXG4gICAgICAgIHZhciBxID0gYXN5bmMucXVldWUod29ya2VyLCBjb25jdXJyZW5jeSk7XG4gICAgICAgIFxuICAgICAgICAvLyBPdmVycmlkZSBwdXNoIHRvIGFjY2VwdCBzZWNvbmQgcGFyYW1ldGVyIHJlcHJlc2VudGluZyBwcmlvcml0eVxuICAgICAgICBxLnB1c2ggPSBmdW5jdGlvbiAoZGF0YSwgcHJpb3JpdHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgX2luc2VydChxLCBkYXRhLCBwcmlvcml0eSwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIHVuc2hpZnQgZnVuY3Rpb25cbiAgICAgICAgZGVsZXRlIHEudW5zaGlmdDtcblxuICAgICAgICByZXR1cm4gcTtcbiAgICB9O1xuXG4gICAgYXN5bmMuY2FyZ28gPSBmdW5jdGlvbiAod29ya2VyLCBwYXlsb2FkKSB7XG4gICAgICAgIHZhciB3b3JraW5nICAgICA9IGZhbHNlLFxuICAgICAgICAgICAgdGFza3MgICAgICAgPSBbXTtcblxuICAgICAgICB2YXIgY2FyZ28gPSB7XG4gICAgICAgICAgICB0YXNrczogdGFza3MsXG4gICAgICAgICAgICBwYXlsb2FkOiBwYXlsb2FkLFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBudWxsLFxuICAgICAgICAgICAgZW1wdHk6IG51bGwsXG4gICAgICAgICAgICBkcmFpbjogbnVsbCxcbiAgICAgICAgICAgIGRyYWluZWQ6IHRydWUsXG4gICAgICAgICAgICBwdXNoOiBmdW5jdGlvbiAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoIV9pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF9lYWNoKGRhdGEsIGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGFza3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyA/IGNhbGxiYWNrIDogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2FyZ28uZHJhaW5lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2FyZ28uc2F0dXJhdGVkICYmIHRhc2tzLmxlbmd0aCA9PT0gcGF5bG9hZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FyZ28uc2F0dXJhdGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUoY2FyZ28ucHJvY2Vzcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJvY2VzczogZnVuY3Rpb24gcHJvY2VzcygpIHtcbiAgICAgICAgICAgICAgICBpZiAod29ya2luZykgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmICh0YXNrcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoY2FyZ28uZHJhaW4gJiYgIWNhcmdvLmRyYWluZWQpIGNhcmdvLmRyYWluKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhcmdvLmRyYWluZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHRzID0gdHlwZW9mIHBheWxvYWQgPT09ICdudW1iZXInXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyB0YXNrcy5zcGxpY2UoMCwgcGF5bG9hZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHRhc2tzLnNwbGljZSgwLCB0YXNrcy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGRzID0gX21hcCh0cywgZnVuY3Rpb24gKHRhc2spIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhc2suZGF0YTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmKGNhcmdvLmVtcHR5KSBjYXJnby5lbXB0eSgpO1xuICAgICAgICAgICAgICAgIHdvcmtpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHdvcmtlcihkcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB3b3JraW5nID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICAgICAgICAgIF9lYWNoKHRzLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhc2tzLmxlbmd0aDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydW5uaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdvcmtpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBjYXJnbztcbiAgICB9O1xuXG4gICAgdmFyIF9jb25zb2xlX2ZuID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncy5jb25jYXQoW2Z1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChjb25zb2xlW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfZWFjaChhcmdzLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGVbbmFtZV0oeCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1dKSk7XG4gICAgICAgIH07XG4gICAgfTtcbiAgICBhc3luYy5sb2cgPSBfY29uc29sZV9mbignbG9nJyk7XG4gICAgYXN5bmMuZGlyID0gX2NvbnNvbGVfZm4oJ2RpcicpO1xuICAgIC8qYXN5bmMuaW5mbyA9IF9jb25zb2xlX2ZuKCdpbmZvJyk7XG4gICAgYXN5bmMud2FybiA9IF9jb25zb2xlX2ZuKCd3YXJuJyk7XG4gICAgYXN5bmMuZXJyb3IgPSBfY29uc29sZV9mbignZXJyb3InKTsqL1xuXG4gICAgYXN5bmMubWVtb2l6ZSA9IGZ1bmN0aW9uIChmbiwgaGFzaGVyKSB7XG4gICAgICAgIHZhciBtZW1vID0ge307XG4gICAgICAgIHZhciBxdWV1ZXMgPSB7fTtcbiAgICAgICAgaGFzaGVyID0gaGFzaGVyIHx8IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIG1lbW9pemVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIHZhciBrZXkgPSBoYXNoZXIuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICBpZiAoa2V5IGluIG1lbW8pIHtcbiAgICAgICAgICAgICAgICBhc3luYy5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIG1lbW9ba2V5XSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChrZXkgaW4gcXVldWVzKSB7XG4gICAgICAgICAgICAgICAgcXVldWVzW2tleV0ucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBxdWV1ZXNba2V5XSA9IFtjYWxsYmFja107XG4gICAgICAgICAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncy5jb25jYXQoW2Z1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVtb1trZXldID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcSA9IHF1ZXVlc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gcS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICBxW2ldLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBtZW1vaXplZC5tZW1vID0gbWVtbztcbiAgICAgICAgbWVtb2l6ZWQudW5tZW1vaXplZCA9IGZuO1xuICAgICAgICByZXR1cm4gbWVtb2l6ZWQ7XG4gICAgfTtcblxuICAgIGFzeW5jLnVubWVtb2l6ZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIChmbi51bm1lbW9pemVkIHx8IGZuKS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgYXN5bmMudGltZXMgPSBmdW5jdGlvbiAoY291bnQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgY291bnRlciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGNvdW50ZXIucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXN5bmMubWFwKGNvdW50ZXIsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnRpbWVzU2VyaWVzID0gZnVuY3Rpb24gKGNvdW50LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGNvdW50ZXIgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBjb3VudGVyLnB1c2goaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFzeW5jLm1hcFNlcmllcyhjb3VudGVyLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5zZXEgPSBmdW5jdGlvbiAoLyogZnVuY3Rpb25zLi4uICovKSB7XG4gICAgICAgIHZhciBmbnMgPSBhcmd1bWVudHM7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgYXN5bmMucmVkdWNlKGZucywgYXJncywgZnVuY3Rpb24gKG5ld2FyZ3MsIGZuLCBjYikge1xuICAgICAgICAgICAgICAgIGZuLmFwcGx5KHRoYXQsIG5ld2FyZ3MuY29uY2F0KFtmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnIgPSBhcmd1bWVudHNbMF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXh0YXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGNiKGVyciwgbmV4dGFyZ3MpO1xuICAgICAgICAgICAgICAgIH1dKSlcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkodGhhdCwgW2Vycl0uY29uY2F0KHJlc3VsdHMpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBhc3luYy5jb21wb3NlID0gZnVuY3Rpb24gKC8qIGZ1bmN0aW9ucy4uLiAqLykge1xuICAgICAgcmV0dXJuIGFzeW5jLnNlcS5hcHBseShudWxsLCBBcnJheS5wcm90b3R5cGUucmV2ZXJzZS5jYWxsKGFyZ3VtZW50cykpO1xuICAgIH07XG5cbiAgICB2YXIgX2FwcGx5RWFjaCA9IGZ1bmN0aW9uIChlYWNoZm4sIGZucyAvKmFyZ3MuLi4qLykge1xuICAgICAgICB2YXIgZ28gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIGVhY2hmbihmbnMsIGZ1bmN0aW9uIChmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBhcmdzLmNvbmNhdChbY2JdKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICAgICAgICAgIHJldHVybiBnby5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBnbztcbiAgICAgICAgfVxuICAgIH07XG4gICAgYXN5bmMuYXBwbHlFYWNoID0gZG9QYXJhbGxlbChfYXBwbHlFYWNoKTtcbiAgICBhc3luYy5hcHBseUVhY2hTZXJpZXMgPSBkb1NlcmllcyhfYXBwbHlFYWNoKTtcblxuICAgIGFzeW5jLmZvcmV2ZXIgPSBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIGZ1bmN0aW9uIG5leHQoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmbihuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIC8vIE5vZGUuanNcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBhc3luYztcbiAgICB9XG4gICAgLy8gQU1EIC8gUmVxdWlyZUpTXG4gICAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBhc3luYztcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGluY2x1ZGVkIGRpcmVjdGx5IHZpYSA8c2NyaXB0PiB0YWdcbiAgICBlbHNlIHtcbiAgICAgICAgcm9vdC5hc3luYyA9IGFzeW5jO1xuICAgIH1cblxufSgpKTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJGV2FBU0hcIikpIiwiLyoqXG4gICMgbm9ybWFsaWNlXG5cbiAgTm9ybWFsaXplIGFuIGljZSBzZXJ2ZXIgY29uZmlndXJhdGlvbiBvYmplY3QgKG9yIHBsYWluIG9sZCBzdHJpbmcpIGludG8gYSBmb3JtYXRcbiAgdGhhdCBpcyB1c2FibGUgaW4gYWxsIGJyb3dzZXJzIHN1cHBvcnRpbmcgV2ViUlRDLiAgUHJpbWFyaWx5IHRoaXMgbW9kdWxlIGlzIGRlc2lnbmVkXG4gIHRvIGhlbHAgd2l0aCB0aGUgdHJhbnNpdGlvbiBvZiB0aGUgYHVybGAgYXR0cmlidXRlIG9mIHRoZSBjb25maWd1cmF0aW9uIG9iamVjdCB0b1xuICB0aGUgYHVybHNgIGF0dHJpYnV0ZS5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgPDw8IGV4YW1wbGVzL3NpbXBsZS5qc1xuXG4qKi9cblxudmFyIHByb3RvY29scyA9IFtcbiAgJ3N0dW46JyxcbiAgJ3R1cm46J1xuXTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgdXJsID0gKGlucHV0IHx8IHt9KS51cmwgfHwgaW5wdXQ7XG4gIHZhciBwcm90b2NvbDtcbiAgdmFyIHBhcnRzO1xuICB2YXIgb3V0cHV0ID0ge307XG5cbiAgLy8gaWYgd2UgZG9uJ3QgaGF2ZSBhIHN0cmluZyB1cmwsIHRoZW4gYWxsb3cgdGhlIGlucHV0IHRvIHBhc3N0aHJvdWdoXG4gIGlmICh0eXBlb2YgdXJsICE9ICdzdHJpbmcnICYmICghICh1cmwgaW5zdGFuY2VvZiBTdHJpbmcpKSkge1xuICAgIHJldHVybiBpbnB1dDtcbiAgfVxuXG4gIC8vIHRyaW0gdGhlIHVybCBzdHJpbmcsIGFuZCBjb252ZXJ0IHRvIGFuIGFycmF5XG4gIHVybCA9IHVybC50cmltKCk7XG5cbiAgLy8gaWYgdGhlIHByb3RvY29sIGlzIG5vdCBrbm93biwgdGhlbiBwYXNzdGhyb3VnaFxuICBwcm90b2NvbCA9IHByb3RvY29sc1twcm90b2NvbHMuaW5kZXhPZih1cmwuc2xpY2UoMCwgNSkpXTtcbiAgaWYgKCEgcHJvdG9jb2wpIHtcbiAgICByZXR1cm4gaW5wdXQ7XG4gIH1cblxuICAvLyBub3cgbGV0J3MgYXR0YWNrIHRoZSByZW1haW5pbmcgdXJsIHBhcnRzXG4gIHVybCA9IHVybC5zbGljZSg1KTtcbiAgcGFydHMgPSB1cmwuc3BsaXQoJ0AnKTtcblxuICAvLyBpZiB3ZSBoYXZlIGFuIGF1dGhlbnRpY2F0aW9uIHBhcnQsIHRoZW4gc2V0IHRoZSBjcmVkZW50aWFsc1xuICBpZiAocGFydHMubGVuZ3RoID4gMSkge1xuICAgIHVybCA9IHBhcnRzWzFdO1xuICAgIHBhcnRzID0gcGFydHNbMF0uc3BsaXQoJzonKTtcblxuICAgIC8vIGFkZCB0aGUgb3V0cHV0IGNyZWRlbnRpYWwgYW5kIHVzZXJuYW1lXG4gICAgb3V0cHV0LnVzZXJuYW1lID0gcGFydHNbMF07XG4gICAgb3V0cHV0LmNyZWRlbnRpYWwgPSAoaW5wdXQgfHwge30pLmNyZWRlbnRpYWwgfHwgcGFydHNbMV0gfHwgJyc7XG4gIH1cblxuICBvdXRwdXQudXJsID0gcHJvdG9jb2wgKyB1cmw7XG4gIG91dHB1dC51cmxzID0gWyBvdXRwdXQudXJsIF07XG5cbiAgcmV0dXJuIG91dHB1dDtcbn07XG4iXX0=
