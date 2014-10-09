!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.RTC=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// a default configuration that is used by the rtc package
module.exports = {
  // simple constraints for defaults
  constraints: {
    video: true,
    audio: true
  },

  // use the public switchboard for signalling
  signaller: '//switchboard.rtc.io',

  // no room is defined by default
  // rtc-quickconnect will autogenerate using a location.hash
  room: undefined,

  // any data channels that we want to create for the conference
  // by default a chat channel is created, but other channels can be added also
  // additionally options can be supplied to customize the data channel config
  // see: <http://w3c.github.io/webrtc-pc/#idl-def-RTCDataChannelInit>
  channels: {
    chat: true
  },

  // the selector that will be used to identify the localvideo container
  localContainer: '#l-video',

  // the selector that will be used to identify the remotevideo container
  remoteContainer: '#r-video',

  // common options that are used across rtc.io packages
  options: {
    // should we atempt to load any plugins?
    plugins: []
  }
};

},{}],2:[function(require,module,exports){
var defaults = require('cog/defaults');
var extend = require('cog/extend');
var attach = require('rtc-attach');
var capture = require('rtc-capture');
var quickconnect = require('rtc-quickconnect');
var chain = require('whisk/chain');
var append = require('fdom/append');
var tweak = require('fdom/classtweak');
var qsa = require('fdom/qsa');
var kgo = require('kgo');

module.exports = function(config) {
  var conference;

  // extend our configuration with the defaults
  config = defaults({}, config, require('./defaultconfig.js'));

  // create our conference instance
  conference = quickconnect(
    config.signaller,
    extend({ expectedLocalStreams: 1 }, config.opts, {
      room: config.room
    })
  );

  conference
  .on('call:ended', removeRemoteVideos)
  .on('stream:added', remoteVideo(conference, config));

  Object.keys(config.channels || {}).forEach(function(name) {
    var channelConfig = config.channels[name];

    conference.createDataChannel(name, channelConfig === true ? null : channelConfig);
  });

  // if we have constraints, then capture video
  if (config.constraints) {
    localVideo(conference, config);
  }

  return conference;
}

function localVideo(qc, config) {
  // use kgo to help with flow control
  kgo(config)
  ('capture', [ 'constraints', 'options' ], capture)
  ('attach', [ 'capture', 'options' ], attach.local)
  ('render-local', [ 'attach' ], chain([
    tweak('+rtc'),
    tweak('+localvideo'),
    append.to((config || {}).localContainer || '#l-video')
  ]))
  ('start-conference', [ 'capture' ], qc.addStream)
  .on('error', reportError(qc, config));
}

function remoteVideo(qc, config) {
  return function(id, stream) {
    kgo({ stream: stream })
    ('attach', [ 'stream' ], attach)
    ('render-remote', [ 'attach' ], function(el) {
      el.dataset.peer = id;
      append.to((config || {}).remoteContainer || '#r-video', el);
    })
    .on('error', reportError(qc, config));
  };
}

function removeRemoteVideos(id) {
  qsa('[data-peer="' + id + '"]').forEach(function(el) {
    el.parentNode.removeChild(el);
  });
}

function reportError(qc, config) {
  return function(err) {
  };
}

},{"./defaultconfig.js":1,"cog/defaults":5,"cog/extend":6,"fdom/append":11,"fdom/classtweak":12,"fdom/qsa":13,"kgo":14,"rtc-attach":16,"rtc-capture":17,"rtc-quickconnect":21,"whisk/chain":47}],3:[function(require,module,exports){
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
      }
      throw TypeError('Uncaught, unspecified "error" event.');
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

},{}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
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
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ### append

  ```js
  var append = require('fdom/append');
  ```
**/

var append = module.exports = function() {
  console.log('not yet implemented');

  return false;
};

/**
  #### append.to(target, => child) => child

  Append the specified `child` element to the `target` element using the
  familiar `appendChild` method of the target.

  <<< examples/append-to.js

**/

append.to = function(target, child) {

  function append(el) {
    var t = target;
    if (typeof t == 'string' || (t instanceof String)) {
      t = document.querySelector(t);
    }

    if (t && typeof t.appendChild == 'function') {
      t.appendChild(el);
      return el;
    }
  }

  return child ? append(child) : append;
};

},{}],12:[function(require,module,exports){
/* jshint node: true */
'use strict';

var reDelim = /[\s\,]\s*/;
var opMappings = {
  '+': 'add',
  '-': 'remove',
  '~': 'toggle',
  '!': 'toggle'
};

/**
  ### classtweak(operations, => el)

  A functional helper for making
  [classList](http://www.w3.org/TR/domcore/#dom-element-classlist)
  modifications to elements, supporting partial application.

  <<< examples/classtweak.js

**/
module.exports = function(mods, element) {
  var rules = mods.trim().split(reDelim)
    // create the rule objects
    .map(function(rule) {
      return {
        op: opMappings[rule.charAt(0)],
        cls: rule.slice(1)
      };
    })
    // removed non mapped operation codes
    .filter(function(rule) {
      return rule.op;
    });

  function tweak(el) {
    if (! el.classList) {
      return el;
    }

    // iterate through the rules and apply the changes
    rules.forEach(function(rule) {
      el.classList[rule.op](rule.cls);
    });

    return el;
  }

  return element ? tweak(element) : tweak;
};
},{}],13:[function(require,module,exports){
/* jshint node: true */
/* global document: false */
'use strict';

var classSelectorRE = /^\.([\w\-]+)$/;
var idSelectorRE = /^#([\w\-]+)$/;
var tagSelectorRE = /^[\w\-]+$/;

/**
  ### qsa(selector, scope?)

  This function is used to get the results of the querySelectorAll output
  in the fastest possible way.  This code is very much based on the
  implementation in
  [zepto](https://github.com/madrobby/zepto/blob/master/src/zepto.js#L104),
  but perhaps not quite as terse.

  <<< examples/qsa.js

**/
module.exports = function(selector, scope) {
  var idSearch;

  // default the element to the document
  scope = scope || document;

  // determine whether we are doing an id search or not
  idSearch = scope === document && idSelectorRE.test(selector);

  // perform the search
  return idSearch ?
    // we are doing an id search, return the element search in an array
    [scope.getElementById(RegExp.$1)] :
    // not an id search, call the appropriate selector
    Array.prototype.slice.call(
        classSelectorRE.test(selector) ?
          scope.getElementsByClassName(RegExp.$1) :
            tagSelectorRE.test(selector) ?
              scope.getElementsByTagName(selector) :
              scope.querySelectorAll(selector)
    );
};
},{}],14:[function(require,module,exports){
var run = require('./run'),
    EventEmitter = require('events').EventEmitter,
    fnRegex = /^function.*?\((.*?)\)/;

var defer = typeof setImmediate === 'function' ? setImmediate : setTimeout;

function newKgo(){
    var returnlessId = 0,
        tasks = {},
        results = {},
        errorHandlers = {},
        inFlight,
        defaultsDefined;

    function kgoFn(name, dependencies, fn){
        if(inFlight){
            throw "No tasks or defaults may be set after kgo is in flight";
        }

        if(arguments.length === 1 && name !== null && typeof name === 'object'){
            if(defaultsDefined){
                throw "Defaults may be defined only once per kgo";
            }

            for(var key in name){
                if(key in tasks){
                    throw "A task is already defined for " + key;
                }
                results[key] = name[key];
            }
            defaultsDefined = true;
            return kgoFn;
        }

        if(typeof name !== 'string'){
            fn = dependencies;
            dependencies = name;
            name = (returnlessId++).toString() + '__returnless';
        }

        if(typeof dependencies === 'function'){
            fn = dependencies;
            dependencies = [];
        }

        if(typeof fn !== 'function'){
            throw new Error('No function provided for task number ' + Object.keys(tasks).length + ' (' + name + ')');
        }

        if(name in results){
            throw "A default with the same name as this task (" + name + ") has already been set";
        }

        tasks[name] = {
            name: name,
            args: dependencies,
            fn: fn
        };

        return kgoFn;
    }

    for(var key in EventEmitter.prototype){
        kgoFn[key] = EventEmitter.prototype[key];
    }

    kgoFn.apply(null, arguments);

    defer(function(){
        inFlight = true;
        run(tasks, results, kgoFn);
    });

    return kgoFn;
}

module.exports = newKgo;
},{"./run":15,"events":3}],15:[function(require,module,exports){
var ignoreDependency = /^\!.+/;

function Step(task, args, done){
    this._task = task;
    this._args = args;
    this._done = done;
}
Step.prototype._count = 1;
Step.prototype._runs = 0;
Step.prototype.run = function(){
    var step = this,
        results = [],
        didError;

    this._task.fn.apply(this, this._args.concat([function(error, result){
        results.push(result);
        step._runs++;
        if(error){
            didError = true;
            step.done(error);
        }else if(!didError && step._runs === step._count){
            step.done(null, results);
        }
    }]));
};
Step.prototype.count = function(number){
    this._parallel = true;
    this._count = number;
};
Step.prototype.done = function(error, results){
    if(error){
        return this._done(error);
    }
    this._done(null, this._parallel ? results : results[0]);
};

function runTask(task, results, aboutToRun, done){
    var name = task.name,
        dependants = task.args,
        taskFunction = task.fn,
        args = [];

    if(dependants){
        for(var i = 0; i < dependants.length; i++) {
            var dependantName = dependants[i],
                ignore = dependantName.match(ignoreDependency);

            if(ignore){
                dependantName = dependantName.slice(1);
            }

            if(!(dependantName in results)){
                return;
            }

            if(!ignore){
                args.push(results[dependantName]);
            }
        }
    }

    var step = new Step(task, args, function(error, result){
        done(name, error, result);
    });

    aboutToRun(name);
    step.run();
}

function run(tasks, results, emitter){
    var currentTask;

    for(var key in tasks){
        currentTask = tasks[key];

        runTask(
            currentTask,
            results,
            function(name){
                delete tasks[name];
            },
            function(name, error, result){
                if(error){
                    emitter.emit('error', error, name);
                    return;
                }

                results[name] = result;
                run(tasks, results, emitter);
            }
        );
    }
}

function cloneAndRun(tasks, results, emitter){
    var todo = {};

    for(var key in tasks){
        todo[key] = tasks[key];
    }

    run(todo, results, emitter);
}

module.exports = cloneAndRun;
},{}],16:[function(require,module,exports){
var plugin = require('rtc-core/plugin');
var extend = require('cog/extend');

/**
  # rtc-attach

  Roughly equivalent to the
  [`attachMediaStream`](https://www.npmjs.org/package/attachmediastream)
  package but with support for rtc.io plugins.  Also uses an error first
  async API to allow plugins time to initialize.

  ## Example Usage

  <<< examples/simple.js

  ## Example using Plugins

  <<< examples/plugins.js

  ## Reference

  ### `attach(stream, opts?, callback)`

  Attach `stream` to a HTML element that will render the content. The provided
  `callback` follows the format of `fn(err, element)`.  While the async nature
  of this package may seem odd, because a plugin may need time to initialize
  this caters for this case in addition to standard usage in the browser.

  - `autoplay` (default: `true`) - by default after the stream has been
    attached to the element it will be played.  This is done by calling
    the `play()` function on the element rather than relying on `autoplay`
    attribute functionality.

  - `el` (default: `null`) - if you with to supply an element to be used
    instead of creating a new element to receive the stream specify it here.

  - `muted` (default: `false`) - whether the created element should be muted
    or not.  For local streams this should almost always, be true so consider
    using the `attach.local` helper function for simple cases.

  - `plugins` (default: `[]`) - specify one or more plugins that can be used
    to render the media stream appropriate to the current platform in the
    event that WebRTC and/or media capture is supported via a browser plugin.

**/
var attach = module.exports = function(stream, opts, callback) {
  var URL = typeof window != 'undefined' && window.URL;
  var el;
  var pinst;

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  function attachToElement(s, o) {
    var autoplay = (o || {}).autoplay;
    var elType = 'audio';
    var el = (o || {}).el;

    // check the stream is valid
    isValid = s && typeof s.getVideoTracks == 'function';

    // determine the element type
    if (isValid && s.getVideoTracks().length > 0) {
      elType = 'video';
    }

    // prepare the element
    el = el || document.createElement(elType);

    // attach the stream
    if (URL && URL.createObjectURL) {
      el.src = URL.createObjectURL(stream);
    }
    else if (el.srcObject) {
      el.srcObject = stream;
    }
    else if (el.mozSrcObject) {
      el.mozSrcObject = stream;
    }

    if ((o || {}).muted) {
      el.muted = true;
      el.setAttribute('muted', '');
    }

    if (autoplay === undefined || autoplay) {
      el.play();
    }

    return el;
  }

  // see if we are using a plugin
  pinst = plugin((opts || {}).plugins);
  if (pinst) {
    return pinst.init(opts, function(err) {
      if (err) {
        return callback(err);
      }

      if (typeof pinst.attach != 'function') {
        return callback(new Error('plugin must support the attach function'));
      }

      callback(null, pinst.attach(stream, opts));
    });
  }

  callback(null, attachToElement(stream, opts));
};

/**
  ### `attach.local(stream, opts?, callback)`

  Attach a local stream with options appropriate for local streams:

  - `muted`: `true`

**/
attach.local = function(stream, opts, callback) {
  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  attach(stream, extend({ muted: true }, opts), callback);
};

},{"cog/extend":6,"rtc-core/plugin":20}],17:[function(require,module,exports){
var plugin = require('rtc-core/plugin');
var detect = require('rtc-core/detect');

// patch navigator getUserMedia
navigator.getUserMedia = navigator.getUserMedia ||
  detect.call(navigator, 'getUserMedia');

/**
  # rtc-capture

  Roughly equivalent to the
  [`getUserMedia`](https://www.npmjs.org/package/getusermedia) package but with
  support for rtc.io plugins.

  ## Example Usage

  <<< examples/simple.js

  ## Example with using Plugins

  <<< examples/plugins.js

  ## Reference

  ### `capture(constraints, opts?, callback)`

  Capture media with the supplied `constraints`.  If an `opts` argument is
  supplied look for plugins that may change the behaviour of the capture
  operation.

**/
module.exports = function(constraints, opts, callback) {
  var pinst;

  function handleCapture(stream) {
    callback(null, stream);
  }

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  // see if we are using a plugin
  pinst = plugin((opts || {}).plugins);
  if (pinst) {
    return pinst.init(opts, function(err) {
      if (err) {
        return callback(err);
      }

      if (typeof navigator.getUserMedia != 'function') {
        return callback(new Error('plugin does not support media capture'));
      }

      navigator.getUserMedia(constraints, handleCapture, callback);
    });
  }

  if (typeof navigator.getUserMedia != 'function') {
    return callback(new Error('getUserMedia not supported'));
  }

  navigator.getUserMedia(constraints, handleCapture, callback);
};

},{"rtc-core/detect":18,"rtc-core/plugin":20}],18:[function(require,module,exports){
/* jshint node: true */
/* global window: false */
/* global navigator: false */

'use strict';

var browser = require('detect-browser');

/**
  ### `rtc-core/detect`

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

},{"detect-browser":19}],19:[function(require,module,exports){
var browsers = [
  [ 'chrome', /Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/ ],
  [ 'firefox', /Firefox\/([0-9\.]+)(?:\s|$)/ ],
  [ 'opera', /Opera\/([0-9\.]+)(?:\s|$)/ ],
  [ 'ie', /Trident\/7\.0.*rv\:([0-9\.]+)\).*Gecko$/ ],
  [ 'ie', /MSIE\s([0-9\.]+);.*Trident\/[4-6].0/ ],
  [ 'ie', /MSIE\s(7\.0)/ ],
  [ 'bb10', /BB10;\sTouch.*Version\/([0-9\.]+)/ ],
  [ 'android', /Android\s([0-9\.]+)/ ],
  [ 'ios', /iPad\;\sCPU\sOS\s([0-9\._]+)/ ],
  [ 'ios',  /iPhone\;\sCPU\siPhone\sOS\s([0-9\._]+)/ ],
  [ 'safari', /Safari\/([0-9\._]+)/ ]
];

var match = browsers.map(match).filter(isMatch)[0];
var parts = match && match[3].split(/[._]/).slice(0,3);

while (parts && parts.length < 3) {
  parts.push('0');
}

// set the name and version
exports.name = match && match[0];
exports.version = parts && parts.join('.');

function match(pair) {
  return pair.concat(pair[1].exec(navigator.userAgent));
}

function isMatch(pair) {
  return !!pair[2];
}

},{}],20:[function(require,module,exports){
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

},{"./detect":18}],21:[function(require,module,exports){
(function (process){
/* jshint node: true */
'use strict';

var rtc = require('rtc-tools');
var mbus = require('mbus');
var cleanup = require('rtc-tools/cleanup');
var debug = rtc.logger('rtc-quickconnect');
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

  - `expectedLocalStreams` (default: not specified) _added 3.0_

    By providing a positive integer value for this option will mean that
    the created quickconnect instance will wait until the specified number of
    streams have been added to the quickconnect "template" before announcing
    to the signaling server.

  - `manualJoin` (default: `false`)

    Set this value to `true` if you would prefer to call the `join` function
    to connecting to the signalling server, rather than having that happen
    automatically as soon as quickconnect is ready to.

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
  var allowJoin = !(opts || {}).manualJoin;
  var profile = {};
  var announced = false;

  // collect the local streams
  var localStreams = [];

  // create the calls map
  var calls = signaller.calls = getable({});

  // create the known data channels registry
  var channels = {};

  // save the plugins passed to the signaller
  var plugins = signaller.plugins = (opts || {}).plugins || [];

  // check how many local streams have been expected (default: 0)
  var expectedLocalStreams = parseInt((opts || {}).expectedLocalStreams, 10) || 0;
  var announceTimer = 0;

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
      var channel = call.channels.get(label);
      var args = [id, channel, label];

      // emit the plain channel:closed event
      signaller.apply(signaller, ['channel:closed'].concat(args));

      // emit the labelled version of the event
      signaller.apply(signaller, ['channel:closed:' + label].concat(args));

      // decouple the events
      channel.onopen = null;
    });

    // trigger stream:removed events for each of the remotestreams in the pc
    call.streams.forEach(function(stream) {
      signaller('stream:removed', id, stream);
    });

    // delete the call data
    calls.delete(id);

    // trigger the call:ended event
    signaller('call:ended', id, call.pc);

    // ensure the peer connection is properly cleaned up
    cleanup(call.pc);
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
    signaller('call:started', id, pc, data);

    // examine the existing remote streams after a short delay
    process.nextTick(function() {
      // iterate through any remote streams
      streams.forEach(receiveRemoteStream(id));
    });
  }

  function checkReadyToAnnounce() {
    clearTimeout(announceTimer);
    if (! allowJoin) {
      return;
    }

    // if we are waiting for a set number of streams, then wait until we have
    // the required number
    if (expectedLocalStreams && localStreams.length < expectedLocalStreams) {
      return;
    }

    // announce ourselves to our new friend
    announceTimer = setTimeout(function() {
      var data = extend({}, profile, { room: room });

      // announce and emit the local announce event
      signaller.announce(data);
      announced = true;
    }, 0);
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
      signaller('stream:removed', id, evt.stream);
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
      signaller.apply(signaller, ['channel:opened'].concat(args));

      // emit the channel:opened:%label% eve
      signaller.apply(
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

  function handleLocalAnnounce(data) {
    // if we send an announce with an updated room then update our local room name
    if (data && typeof data.room != 'undefined') {
      room = data.room;
    }
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
    signaller('peer:connect', data.id, pc, data);

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
    monitor = rtc.couple(pc, data.id, signaller, extend({}, opts, {
      logger: mbus('pc.' + data.id, signaller)
    }));

    signaller('peer:couple', data.id, pc, data, monitor);

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

  function handlePeerFilter(evt) {
    // only connect with the peer if we are ready
    evt.allow = evt.allow && (localStreams.length >= expectedLocalStreams);
  }

  function handlePeerUpdate(data) {
    var id = data && data.id;
    var activeCall = id && calls.get(id);

    // if we have received an update for a peer that has no active calls,
    // then pass this onto the announce handler
    if (id && (! activeCall)) {
      debug('received peer update from peer ' + id + ', no active calls');
      return handlePeerAnnounce(data);
    }
  }

  function receiveRemoteStream(id) {
    var call = calls.get(id);

    return function(stream) {
      signaller('stream:added', id, stream, call && call.data);
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
  signaller.on('peer:update', handlePeerUpdate);
  signaller.on('peer:leave', callEnd);

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

    checkReadyToAnnounce();
    return signaller;
  };

  /**
    #### endCalls()

    The `endCalls` function terminates all the active calls that have been
    created in this quickconnect instance.  Calling `endCalls` does not
    kill the connection with the signalling server.

  **/
  signaller.endCalls = function() {
    calls.keys().forEach(callEnd);
  };

  /**
    #### close()

    The `close` function provides a convenient way of closing all associated
    peer connections.  This function simply uses the `endCalls` function and
    the underlying `leave` function of the signaller to do a "full cleanup"
    of all connections.
  **/
  signaller.close = function() {
    signaller.endCalls();
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
    #### join()

    The `join` function is used when `manualJoin` is set to true when creating
    a quickconnect instance.  Call the `join` function once you are ready to
    join the signalling server and initiate connections with other people.

  **/
  signaller.join = function() {
    allowJoin = true;
    checkReadyToAnnounce();
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

  // if we have an expected number of local streams, then use a filter to
  // check if we should respond
  if (expectedLocalStreams) {
    signaller.on('peer:filter', handlePeerFilter);
  }

  // respond to local announce messages
  signaller.on('local:announce', handleLocalAnnounce);

  // check to see if we are ready to announce
  checkReadyToAnnounce();

  // pass the signaller on
  return signaller;
};

}).call(this,require('_process'))
},{"_process":4,"cog/defaults":5,"cog/extend":6,"cog/getable":7,"mbus":22,"rtc-signaller":25,"rtc-tools":40,"rtc-tools/cleanup":36}],22:[function(require,module,exports){
var createTrie = require('array-trie');
var reDelim = /[\.\:]/;

/**
  # mbus

  If Node's EventEmitter and Eve were to have a child, it might look something like this.
  No wildcard support at this stage though...

  ## Example Usage

  <<< docs/usage.md

  ## Reference

  ### `mbus(namespace?, parent?, scope?)`

  Create a new message bus with `namespace` inheriting from the `parent`
  mbus instance.  If events from this message bus should be triggered with
  a specific `this` scope, then specify it using the `scope` argument.

**/

var createBus = module.exports = function(namespace, parent, scope) {
  var registry = createTrie();
  var feeds = [];

  function bus(name) {
    var args = [].slice.call(arguments, 1);
    var parts = getNameParts(name);
    var delimited = parts.join('.');
    var handlers = registry.get(parts) || [];
    var results;

    // send through the feeds
    feeds.forEach(function(feed) {
      feed({ name: delimited, args: args });
    });

    // run the registered handlers
    results = [].concat(handlers).map(function(handler) {
      return handler.apply(scope || this, args);
    });

    // run the parent handlers
    if (bus.parent) {
      results = results.concat(
        bus.parent.apply(scope || this, [namespace.concat(parts)].concat(args))
      );
    }

    return results;
  }

  /**
    ### `mbus#clear()`

    Reset the handler registry, which essential deregisters all event listeners.

    _Alias:_ `removeAllListeners`
  **/
  function clear(name) {
    // if we have a name, reset handlers for that handler
    if (name) {
      registry.set(getNameParts(name), []);
    }
    // otherwise, reset the entire handler registry
    else {
      registry = createTrie();
    }
  }

  /**
    ### `mbus#feed(handler)`

    Attach a handler function that will see all events that are sent through
    this bus in an "object stream" format that matches the following format:

    ```
    { name: 'event.name', args: [ 'event', 'args' ] }
    ```

    The feed function returns a function that can be called to stop the feed
    sending data.

  **/
  function feed(handler) {
    function stop() {
      feeds.splice(feeds.indexOf(handler), 1);
    }

    feeds.push(handler);
    return stop;
  }

  function getNameParts(name) {
    return Array.isArray(name) ? name : name.split(reDelim);
  }

  /**
    ### `mbus#off(name, handler)`

    Deregister an event handler.
  **/
  function off(name, handler) {
    var handlers = registry.get(getNameParts(name));
    var idx = handlers ? handlers.indexOf(handler) : -1;

    if (idx >= 0) {
      handlers.splice(idx, 1);
    }
  }

  /**
    ### `mbus#on(name, handler)`

    Register an event handler for the event `name`.

  **/
  function on(name, handler) {
    var parts = getNameParts(name);
    var handlers = registry.get(parts);

    if (handlers) {
      handlers.push(handler);
    }
    else {
      registry.set(parts, [ handler ]);
    }

    return bus;
  }


  /**
    ### `mbus#once(name, handler)`

    Register an event handler for the event `name` that will only
    trigger once (i.e. the handler will be deregistered immediately after
    being triggered the first time).

  **/
  function once(name, handler) {
    return on(name, function handleEvent() {
      var result = handler.apply(this, arguments);
      bus.off(name, handleEvent);

      return result;
    });
  }

  if (typeof namespace == 'function') {
    parent = namespace;
    namespace = '';
  }

  namespace = (namespace && namespace.split(reDelim)) || [];

  bus.clear = bus.removeAllListeners = clear;
  bus.feed = feed;
  bus.on = bus.addListener = on;
  bus.once = once;
  bus.off = bus.removeListener = off;
  bus.parent = parent || (namespace && namespace.length > 0 && createBus());

  return bus;
};

},{"array-trie":24}],23:[function(require,module,exports){
"use strict"

function compileSearch(funcName, predicate, reversed, extraArgs, useNdarray, earlyOut) {
  var code = [
    "function ", funcName, "(a,l,h,", extraArgs.join(","),  "){",
earlyOut ? "" : "var i=", (reversed ? "l-1" : "h+1"),
";while(l<=h){\
var m=(l+h)>>>1,x=a", useNdarray ? ".get(m)" : "[m]"]
  if(earlyOut) {
    if(predicate.indexOf("c") < 0) {
      code.push(";if(x===y){return m}else if(x<=y){")
    } else {
      code.push(";var p=c(x,y);if(p===0){return m}else if(p<=0){")
    }
  } else {
    code.push(";if(", predicate, "){i=m;")
  }
  if(reversed) {
    code.push("l=m+1}else{h=m-1}")
  } else {
    code.push("h=m-1}else{l=m+1}")
  }
  code.push("}")
  if(earlyOut) {
    code.push("return -1};")
  } else {
    code.push("return i};")
  }
  return code.join("")
}

function compileBoundsSearch(predicate, reversed, suffix, earlyOut) {
  var result = new Function([
  compileSearch("A", "x" + predicate + "y", reversed, ["y"], false, earlyOut),
  compileSearch("B", "x" + predicate + "y", reversed, ["y"], true, earlyOut),
  compileSearch("P", "c(x,y)" + predicate + "0", reversed, ["y", "c"], false, earlyOut),
  compileSearch("Q", "c(x,y)" + predicate + "0", reversed, ["y", "c"], true, earlyOut),
"function dispatchBsearch", suffix, "(a,y,c,l,h){\
if(a.shape){\
if(typeof(c)==='function'){\
return Q(a,(l===undefined)?0:l|0,(h===undefined)?a.shape[0]-1:h|0,y,c)\
}else{\
return B(a,(c===undefined)?0:c|0,(l===undefined)?a.shape[0]-1:l|0,y)\
}}else{\
if(typeof(c)==='function'){\
return P(a,(l===undefined)?0:l|0,(h===undefined)?a.length-1:h|0,y,c)\
}else{\
return A(a,(c===undefined)?0:c|0,(l===undefined)?a.length-1:l|0,y)\
}}}\
return dispatchBsearch", suffix].join(""))
  return result()
}

module.exports = {
  ge: compileBoundsSearch(">=", false, "GE"),
  gt: compileBoundsSearch(">", false, "GT"),
  lt: compileBoundsSearch("<", true, "LT"),
  le: compileBoundsSearch("<=", true, "LE"),
  eq: compileBoundsSearch("-", true, "EQ", true)
}

},{}],24:[function(require,module,exports){
"use strict"

var bounds = require("binary-search-bounds")

module.exports = createTrie

function Trie(symbols, children, value) {
  this.symbols = symbols
  this.children = children
  this.value = value
}

var proto = Trie.prototype

proto.set = function(s, value) {
  if(s.shape) {
    var v = this
    var n = s.shape[0]
    for(var i=0; i<n; ++i) {
      var c = s.get(i)
      var j = bounds.ge(v.symbols, c)
      if(j < v.symbols.length && v.symbols[j] === c) {
        v = v.children[j]
      } else {
        var l = new Trie([], [], value)
        for(var k=n-1; k>i; --k) {
          l = new Trie([s.get(k)], [l])
        }
        v.symbols.splice(j, 0, c)
        v.children.splice(j, 0, l)
        return value
      }
    }
    return v.value = value
  } else {
    var v = this
    var n = s.length
    for(var i=0; i<n; ++i) {
      var c = s[i]
      var j = bounds.ge(v.symbols, c)
      if(j < v.symbols.length && v.symbols[j] === c) {
        v = v.children[j]
      } else {
        var l = new Trie([], [], value)
        for(var k=n-1; k>i; --k) {
          l = new Trie([s[k]], [l])
        }
        v.symbols.splice(j, 0, c)
        v.children.splice(j, 0, l)
        return value
      }
    }
    return v.value = value
  }
}

proto.get = function(s) {
  if(s.shape) {
    var v = this
    var n = s.shape[0]
    for(var i=0; i<n; ++i) {
      var c = s.get(i)
      var j = bounds.eq(v.symbols, c)
      if(j < 0) {
        return
      }
      v = v.children[j]
    }
    return v.value
  } else {
    var v = this
    var n = s.length
    for(var i=0; i<n; ++i) {
      var c = s[i]
      var j = bounds.eq(v.symbols, c)
      if(j < 0) {
        return
      }
      v = v.children[j]
    }
    return v.value
  }
}

function createTrie() {
  return new Trie([],[])
}
},{"binary-search-bounds":23}],25:[function(require,module,exports){
var extend = require('cog/extend');

module.exports = function(messenger, opts) {
  return require('./signaller.js')(messenger, extend({
    connect: require('./primus-loader')
  }, opts));
};

},{"./primus-loader":33,"./signaller.js":35,"cog/extend":6}],26:[function(require,module,exports){
module.exports = {
  // messenger events
  dataEvent: 'data',
  openEvent: 'open',
  closeEvent: 'close',
  errorEvent: 'error',

  // messenger functions
  writeMethod: 'write',
  closeMethod: 'close',

  // leave timeout (ms)
  leaveTimeout: 3000
};

},{}],27:[function(require,module,exports){
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

    signaller('peer:filter', evt);

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
      signaller('peer:connected', data.id, data);

      // if the peer is existing, then update the data
      if (peer && (! peer.inactive)) {
        debug('signaller: ' + signaller.id + ' received update, data: ', data);

        // update the data
        copyData(peer.data, data);

        // trigger the peer update event
        return signaller('peer:update', data, srcData);
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
      return signaller('peer:announce', data, peer);
    }
  };
};

},{"cog/extend":6,"cog/logger":9}],28:[function(require,module,exports){
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
},{"./announce":27,"./leave":29}],29:[function(require,module,exports){
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
        signaller('peer:leave', data.id, peer);
      }, opts.leaveTimeout);
    }

    // emit the event
    signaller('peer:disconnected', data.id, peer);
  };
};

},{}],30:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 * 
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

/*global window, navigator, document, require, process, module */
(function (app) {
  'use strict';
  var namespace = 'cuid',
    c = 0,
    blockSize = 4,
    base = 36,
    discreteValues = Math.pow(base, blockSize),

    pad = function pad(num, size) {
      var s = "000000000" + num;
      return s.substr(s.length-size);
    },

    randomBlock = function randomBlock() {
      return pad((Math.random() *
            discreteValues << 0)
            .toString(base), blockSize);
    },

    safeCounter = function () {
      c = (c < discreteValues) ? c : 0;
      c++; // this is not subliminal
      return c - 1;
    },

    api = function cuid() {
      // Starting with a lowercase letter makes
      // it HTML element ID friendly.
      var letter = 'c', // hard-coded allows for sequential access

        // timestamp
        // warning: this exposes the exact date and time
        // that the uid was created.
        timestamp = (new Date().getTime()).toString(base),

        // Prevent same-machine collisions.
        counter,

        // A few chars to generate distinct ids for different
        // clients (so different computers are far less
        // likely to generate the same id)
        fingerprint = api.fingerprint(),

        // Grab some more chars from Math.random()
        random = randomBlock() + randomBlock();

        counter = pad(safeCounter().toString(base), blockSize);

      return  (letter + timestamp + counter + fingerprint + random);
    };

  api.slug = function slug() {
    var date = new Date().getTime().toString(36),
      counter,
      print = api.fingerprint().slice(0,1) +
        api.fingerprint().slice(-1),
      random = randomBlock().slice(-2);

      counter = safeCounter().toString(36).slice(-4);

    return date.slice(-2) + 
      counter + print + random;
  };

  api.globalCount = function globalCount() {
    // We want to cache the results of this
    var cache = (function calc() {
        var i,
          count = 0;

        for (i in window) {
          count++;
        }

        return count;
      }());

    api.globalCount = function () { return cache; };
    return cache;
  };

  api.fingerprint = function browserPrint() {
    return pad((navigator.mimeTypes.length +
      navigator.userAgent.length).toString(36) +
      api.globalCount().toString(36), 4);
  };

  // don't change anything from here down.
  if (app.register) {
    app.register(namespace, api);
  } else if (typeof module !== 'undefined') {
    module.exports = api;
  } else {
    app[namespace] = api;
  }

}(this.applitude || this));

},{}],31:[function(require,module,exports){
/* jshint node: true */
'use strict';

var reVariable = /\{\{\s*([^\}]+?)\s*\}\}/;
var mods = require('./mods');

/**
  # formatter

  This is a simple library designed to do one thing and one thing only -
  replace variables in strings with variable values.  It is built in such a
  way that the formatter strings are parsed and you are provided with a
  function than can efficiently be called to provide the custom output.

  ## Example Usage

  <<< examples/likefood.js

  __NOTE__: Formatter is not designed to be a templating library and if
  you are already using something like Handlebars or
  [hogan](https://github.com/twitter/hogan.js) in your library or application
  stack consider using them instead.

  ## Using named variables

  In the examples above we saw how the formatter can be used to replace
  function arguments in a formatter string.  We can also set up a formatter
  to use particular key values from an input string instead if that is more
  suitable:

  <<< examples/likefood-named.js

  ## Nested Property Values

  Since version `0.1.0` you can also access nested property values, as you
  can with templates like handlebars.

  ## Partial Execution

  Since version `0.3.x` formatter also supports partial execution when using
  indexed arguments (e.g. `{{ 0 }}`, `{{ 1 }}`, etc).  For example:

  <<< examples/partial.js

  In the case above, the original formatter function returned by `formatter`
  did not receive enough values to resolve all the required variables.  As
  such it returned a function ready to accept the remaining values.

  Once all values have been received the output will be generated.

  ## Performance

  I've done some
  [performance benchmarks](http://jsperf.com/formatter-performance) and
  formatter is faster than handlebars, but that isn't surprising as it is far
  simpler and doesn't have the smarts of HBS.  The test is really there to
  ensure that I didn't do anything too silly...

  Additionally, it should be noted that using formatter is 100% slower than
  concatenating strings, so don't use it where performance is critical. 
  Do use it where not repeating yourself is.
**/

var formatter = module.exports = function(format, opts) {
  // extract the matches from the string
  var parts = [];
  var output = [];
  var chunk;
  var varname;
  var varParts;
  var match = reVariable.exec(format);
  var isNumeric;
  var outputIdx = 0;
  var ignoreNumeric = (opts || {}).ignoreNumeric;

  while (match) {
    // get the prematch chunk
    chunk = format.slice(0, match.index);
    
    // if we have a valid chunk, add it to the parts
    if (chunk) {
      output[outputIdx++] = chunk;
    }
    
    varParts = match[1].split(/\s*\|\s*/);
    match[1] = varParts[0];
    
    // extract the varname
    varname = parseInt(match[1], 10);
    isNumeric = !isNaN(varname);

    // if this is a numeric replacement expression, and we are ignoring
    // those expressions then pass it through to the output
    if (ignoreNumeric && isNumeric) {
      output[outputIdx++] = match[0];
    }
    // otherwise, handle normally
    else {
      // extract the expression and add it as a function
      parts[parts.length] = {
        idx: (outputIdx++),
        numeric: isNumeric,
        varname: isNumeric ? varname : match[1],
        modifiers: varParts.length > 1 ? createModifiers(varParts.slice(1)) : []
      };
    }

    // remove this matched chunk and replacer from the string
    format = format.slice(match.index + match[0].length);

    // check for the next match
    match = reVariable.exec(format);
  }
  
  // if we still have some of the format string remaining, add it to the list
  if (format) {
    output[outputIdx++] = format;
  }

  return collect(parts, output);
};

formatter.error = function(message) {
  // create the format
  var format = formatter(message);
  
  return function(err) {
    var output;
    
    // if no error has been supplied, then pass it straight through
    if (! err) {
      return;
    }

    output = new Error(
      format.apply(null, Array.prototype.slice.call(arguments, 1)));

    output._original = err;

    // return the new error
    return output;
  };
};

function collect(parts, resolved, indexShift) {
  // default optionals
  indexShift = indexShift || 0;

  return function() {
    var output = [].concat(resolved);
    var unresolved;
    var ii;
    var part;
    var partIdx;
    var propNames;
    var val;
    var numericResolved = [];

    // find the unresolved parts
    unresolved = parts.filter(function(part) {
      return typeof output[part.idx] == 'undefined';
    });

    // initialise the counter
    ii = unresolved.length;

    // iterate through the unresolved parts and attempt to resolve the value
    for (; ii--; ) {
      part = unresolved[ii];

      if (typeof part == 'object') {
        // if this is a numeric part, this is a simple index lookup
        if (part.numeric) {
          partIdx = part.varname - indexShift;
          if (arguments.length > partIdx) {
            output[part.idx] = arguments[partIdx];
            if (numericResolved.indexOf(part.varname) < 0) {
              numericResolved[numericResolved.length] = part.varname;
            }
          }
        }
        // otherwise, we are doing a recursive property search
        else if (arguments.length > 0) {
          propNames = (part.varname || '').split('.');

          // initialise the output from the last valid argument
          output[part.idx] = (arguments[arguments.length - 1] || {});
          while (output[part.idx] && propNames.length > 0) {
            val = output[part.idx][propNames.shift()];
            output[part.idx] = typeof val != 'undefined' ? val : '';
          }
        }

        // if the output was resolved, then apply the modifier
        if (typeof output[part.idx] != 'undefined' && part.modifiers) {
          output[part.idx] = applyModifiers(part.modifiers, output[part.idx]);
        }
      }
    }

    // reasses unresolved (only caring about numeric parts)
    unresolved = parts.filter(function(part) {
      return part.numeric && typeof output[part.idx] == 'undefined';
    });

    // if we have no unresolved parts, then return the value
    if (unresolved.length === 0) {
      return output.join('');
    }

    // otherwise, return the collect function again
    return collect(
      parts,
      output,
      indexShift + numericResolved.length
    );
  };
}

function applyModifiers(modifiers, value) {
  // if we have modifiers, then tweak the output
  for (var ii = 0, count = modifiers.length; ii < count; ii++) {
    value = modifiers[ii](value);
  }

  return value;
}

function createModifiers(modifierStrings) {
  var modifiers = [];
  var parts;
  var fn;
  
  for (var ii = 0, count = modifierStrings.length; ii < count; ii++) {
    parts = modifierStrings[ii].split(':');
    fn = mods[parts[0].toLowerCase()];
    
    if (fn) {
      modifiers[modifiers.length] = fn.apply(null, parts.slice(1));
    }
  }
  
  return modifiers;
}

},{"./mods":32}],32:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## Modifiers

**/

/**
  ### Length Modifier (len)

  The length modifier is used to ensure that a string is exactly the length specified.  The string is sliced to the required max length, and then padded out with spaces (or a specified character) to meet the required length.

  ```js
  // pad the string test to 10 characters
  formatter('{{ 0|len:10 }}')('test');   // 'test      '

  // pad the string test to 10 characters, using a as the padding character
  formatter('{{ 0|len:10:a }}')('test'); // 'testaaaaaa'
  ```
**/
exports.len = function(length, padder) {
  var testInt = parseInt(padder, 10);
  var isNumber;

  // default the padder to a space
  padder = (! isNaN(testInt)) ? testInt : (padder || ' ');

  // check whether we have a number for padding (we will pad left if we do)
  isNumber = typeof padder == 'number';
  
  return function(input) {
    var output = input.toString().slice(0, length);
    
    // pad the string to the required length
    while (output.length < length) {
      output = isNumber ? padder + output : output + padder;
    }
    
    return output;
  };
};
},{}],33:[function(require,module,exports){
/* jshint node: true */
/* global document, location, Primus: false */
'use strict';

var reTrailingSlash = /\/$/;
var formatter = require('formatter');
var primusUrl = formatter('{{ signalhost }}{{ primusPath }}');

/**
  ### loadPrimus(signalhost, opts?, callback)

  This is a convenience function that is patched into the signaller to assist
  with loading the `primus.js` client library from an `rtc-switchboard`
  signaling server.

  In the case that you wish to load `primus.js` from a location other than
  the default location of `{{ signalhost }}/rtc.io/primus.js` you can
  provide an options object which allows for the following customizations:

  - `primusPath` (default: `/rtc.io/primus.js`)

    The path at which the `primus.js` file can be found on the signalhost.

   __NOTE:__ The above options are passed through when creating a
   signaller object, and thus packages such as
   [rtc-quickconnect](https://github.com/rtc-io/rtc-quickconnect)
   will allow you to make the customisation with it's top level
   options also.

**/
module.exports = function(signalhost, opts, callback) {
  var anchor = document.createElement('a');
  var script;
  var scriptSrc;

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  // initialise the anchor with the signalhost
  anchor.href = signalhost;

  // initialise the script location
  scriptSrc = primusUrl({
    signalhost: signalhost.replace(reTrailingSlash, ''),
    primusPath: (opts || {}).primusPath || '/rtc.io/primus.js'
  });

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

},{"formatter":31}],34:[function(require,module,exports){
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

    signaller.apply(
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

    // discard primus messages
    if (data && data.slice(0, 6) === 'primus') {
      return;
    }

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
        signaller(
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

},{"./handlers":28,"cog/jsonparse":8,"cog/logger":9}],35:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc-signaller');
var detect = require('rtc-core/detect');
var defaults = require('cog/defaults');
var extend = require('cog/extend');
var mbus = require('mbus');
var throttle = require('cog/throttle');
var getable = require('cog/getable');
var uuid = require('cuid');

// initialise the list of valid "write" methods
var WRITE_METHODS = ['write', 'send'];
var CLOSE_METHODS = ['close', 'end'];

// initialise signaller metadata so we don't have to include the package.json
// TODO: make this checkable with some kind of prepublish script
var metadata = {
  version: '3.1.0'
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
  var signaller = mbus('', (opts || {}).logger);

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

    messenger.addEventListener('open', handleMessengerOpen);
    messenger.addEventListener('close', handleMessengerClose);
  }

  function bindEvents() {
    // handle message data events
    messenger.on(opts.dataEvent, processor);
    messenger.on(opts.openEvent, handleMessengerOpen);
    messenger.on(opts.closeEvent, handleMessengerClose);
    messenger.on(opts.errorEvent, handleMessengerClose);
  }

  function connectToHost(url) {
    if (typeof connect != 'function') {
      return signaller('error', new Error('no connect function'));
    }

    // load primus
    connect(url, opts, function(err, socket) {
      if (err) {
        return signaller('error', err);
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

  function handleMessengerClose(err) {
    if (err instanceof Error) {
      console.log('socket closed with error: ', err);
    }

    connected = false;
    signaller('disconnected');
  }

  function handleMessengerOpen() {
    connected = true;
    signaller('open');
    signaller('connected');
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
        opts.writeMethod + '" write method');
    }

    // handle core browser messenging apis
    if (typeof messenger.on == 'function') {
      bindEvents();
    }
    else if (typeof messenger.addEventListener == 'function') {
      bindBrowserEvents();
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
    setTimeout(signaller.bind(signaller, 'init'), 0);
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

    function sendAnnounce() {
      (sender || send)('/announce', attributes);
      signaller('local:announce', attributes);
    }

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
        return signaller.once('connected', sendAnnounce);
      }

      sendAnnounce();
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

},{"./defaults":26,"./processor":34,"cog/defaults":5,"cog/extend":6,"cog/getable":7,"cog/logger":9,"cog/throttle":10,"cuid":30,"mbus":22,"rtc-core/detect":18}],36:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc/cleanup');

var CANNOT_CLOSE_STATES = [
  'closed'
];

var EVENTS_DECOUPLE_BC = [
  'addstream',
  'datachannel',
  'icecandidate',
  'negotiationneeded',
  'removestream',
  'signalingstatechange'
];

var EVENTS_DECOUPLE_AC = [
  'iceconnectionstatechange'
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

  function decouple(events) {
    events.forEach(function(evtName) {
      if (pc['on' + evtName]) {
        pc['on' + evtName] = null;
      }
    });
  }

  // decouple "before close" events
  decouple(EVENTS_DECOUPLE_BC);

  if (canClose) {
    debug('attempting connection close, current state: '+ pc.iceConnectionState);
    pc.close();
  }

  // remove the event listeners
  // after a short delay giving the connection time to trigger
  // close and iceconnectionstatechange events
  setTimeout(function() {
    decouple(EVENTS_DECOUPLE_AC);
  }, 100);
};

},{"cog/logger":9}],37:[function(require,module,exports){
/* jshint node: true */
'use strict';

var mbus = require('mbus');
var queue = require('rtc-taskqueue');
var cleanup = require('./cleanup');
var monitor = require('./monitor');
var detect = require('./detect');
var findPlugin = require('rtc-core/plugin');
var CLOSED_STATES = [ 'closed', 'failed' ];

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
  var mon = monitor(pc, targetId, signaller, (opts || {}).logger);
  var emit = mbus('', mon);
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

  // initilaise the negotiation helpers
  var isMaster = signaller.isMaster(targetId);

  // initialise the processing queue (one at a time please)
  var q = queue(pc, opts);

  function createOrRequestOffer() {
    if (! isMaster) {
      return signaller.to(targetId).send('/negotiate');
    }

    q.createOffer();
  }

  function debounceOffer() {
    debug('debouncing offer');
    clearTimeout(offerTimeout);
    offerTimeout = setTimeout(q.createOffer, 50);
  }

  function decouple() {
    debug('decoupling ' + signaller.id + ' from ' + targetId);

    // stop the monitor
//     mon.removeAllListeners();
    mon.stop();

    // cleanup the peerconnection
    cleanup(pc);

    // remove listeners
    signaller.removeListener('sdp', handleSdp);
    signaller.removeListener('candidate', handleCandidate);
    signaller.removeListener('negotiate', handleNegotiateRequest);
  }

  function handleCandidate(data) {
    q.addIceCandidate(data);
  }

  function handleSdp(sdp, src) {
    emit('sdp.remote', sdp);

    // if the source is unknown or not a match, then don't process
    if ((! src) || (src.id !== targetId)) {
      return;
    }

    q.setRemoteDescription(sdp);
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

    mon.on('statechange', handleDisconnectAbort);
  }

  function handleDisconnectAbort() {
    debug('connection state changed to: ' + pc.iceConnectionState);
    resetDisconnectTimer();

    // if we have a closed or failed status, then close the connection
    if (CLOSED_STATES.indexOf(pc.iceConnectionState) >= 0) {
      return mon('closed');
    }

    mon.once('disconnect', handleDisconnect);
  };

  function handleLocalCandidate(evt) {
    if (evt.candidate) {
      resetDisconnectTimer();

      emit('ice.local', evt.candidate);
      signaller.to(targetId).send('/candidate', evt.candidate);
      endOfCandidates = false;
    }
    else if (! endOfCandidates) {
      endOfCandidates = true;
      emit('ice.gathercomplete');
      signaller.to(targetId).send('/endofcandidates', {});
    }
  }

  function handleNegotiateRequest(src) {
    if (src.id === targetId) {
      emit('negotiate.request', src.id);
      debounceOffer();
    }
  }

  function resetDisconnectTimer() {
    mon.off('statechange', handleDisconnectAbort);

    // clear the disconnect timer
    debug('reset disconnect timer, state: ' + pc.iceConnectionState);
    clearTimeout(disconnectTimer);
  }

  // when regotiation is needed look for the peer
  if (reactive) {
    pc.onnegotiationneeded = function() {
      emit('negotiate.renegotiate');
      createOrRequestOffer();
    };
  }

  pc.onicecandidate = handleLocalCandidate;

  // when the task queue tells us we have sdp available, send that over the wire
  q.on('sdp.local', function(desc) {
    signaller.to(targetId).send('/sdp', desc);
  });

  // when we receive sdp, then
  signaller.on('sdp', handleSdp);
  signaller.on('candidate', handleCandidate);

  // if this is a master connection, listen for negotiate events
  if (isMaster) {
    signaller.on('negotiate', handleNegotiateRequest);
  }

  // when the connection closes, remove event handlers
  mon.once('closed', handleConnectionClose);
  mon.once('disconnected', handleDisconnect);

  // patch in the create offer functions
  mon.createOffer = createOrRequestOffer;

  return mon;
}

module.exports = couple;

},{"./cleanup":36,"./detect":38,"./monitor":41,"cog/logger":9,"mbus":22,"rtc-core/plugin":20,"rtc-taskqueue":42}],38:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ### rtc-tools/detect

  Provide the [rtc-core/detect](https://github.com/rtc-io/rtc-core#detect)
  functionality.
**/
module.exports = require('rtc-core/detect');

},{"rtc-core/detect":18}],39:[function(require,module,exports){
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

  In the event that you use short term authentication for TURN, and you want
  to generate new `iceServers` regularly, you can specify an iceServerGenerator
  that will be used prior to coupling. This generator should return a fully
  compliant W3C (RTCIceServer dictionary)[http://www.w3.org/TR/webrtc/#idl-def-RTCIceServer].

  If you pass in both a generator and iceServers, the iceServers _will be
  ignored and the generator used instead.
**/

var iceServerGenerator = function () {
  return [];
}

exports.config = function(config) {
  var iceServerGenerator = (config || {}).iceServerGenerator;

  return defaults({}, config, {
    iceServers: typeof iceServerGenerator == 'function' ? iceServerGenerator() : []
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

},{"./detect":38,"cog/defaults":5,"cog/logger":9}],40:[function(require,module,exports){
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

  // generate the config based on options provided
  var config = gen.config(opts);

  // generate appropriate connection constraints
  var constraints = gen.connectionConstraints(opts, constraints);

  if (plugin && typeof plugin.createConnection == 'function') {
    return plugin.createConnection(config, constraints);
  }
  else {
    return new ((opts || {}).RTCPeerConnection || RTCPeerConnection)(
      config, constraints
    );
  }
};

},{"./couple":37,"./detect":38,"./generators":39,"cog/logger":9,"rtc-core/plugin":20}],41:[function(require,module,exports){
/* jshint node: true */
'use strict';

var mbus = require('mbus');

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
  monitor(pc, targetId, signaller, parentBus) => mbus
  ```

  The monitor is a useful tool for determining the state of `pc` (an
  `RTCPeerConnection`) instance in the context of your application. The
  monitor uses both the `iceConnectionState` information of the peer
  connection and also the various
  [signaller events](https://github.com/rtc-io/rtc-signaller#signaller-events)
  to determine when the connection has been `connected` and when it has
  been `disconnected`.

  A monitor created `mbus` is returned as the result of a
  [couple](https://github.com/rtc-io/rtc#rtccouple) between a local peer
  connection and it's remote counterpart.

**/
module.exports = function(pc, targetId, signaller, parentBus) {
  var monitor = mbus('', parentBus);
  var state;

  function checkState() {
    var newState = getMappedState(pc.iceConnectionState);

    // flag the we had a state change
    monitor('statechange', pc, newState);

    // if the active state has changed, then send the appopriate message
    if (state !== newState) {
      monitor(newState);
      state = newState;
    }
  }

  function handleClose() {
    monitor('closed');
  }

  function handlePeerLeave(peerId) {
    // if the peer leaving is not the peer we are connected to
    // then we aren't interested
    if (peerId !== targetId) {
      return;
    }

    // trigger a closed event
    monitor('closed');
  }

  pc.addEventListener('close', handleClose);
  peerStateEvents.forEach(function(evtName) {
    pc.addEventListener(evtName, checkState);
  });

  monitor.stop = function() {
    pc.removeEventListener('close', handleClose);
    peerStateEvents.forEach(function(evtName) {
      pc.removeEventListener(evtName, checkState);
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

  return monitor;
};

/* internal helpers */

function getMappedState(state) {
  return stateMappings[state] || state;
}

},{"mbus":22}],42:[function(require,module,exports){
var detect = require('rtc-core/detect');
var zip = require('whisk/zip');
var findPlugin = require('rtc-core/plugin');
var PriorityQueue = require('priorityqueuejs');

// some validation routines
var checkCandidate = require('rtc-validator/candidate');

// the sdp cleaner
var sdpclean = require('rtc-sdpclean');

var PRIORITY_LOW = 100;
var PRIORITY_WAIT = 1000;

// priority order (lower is better)
var DEFAULT_PRIORITIES = [
  'candidate',
  'setLocalDescription',
  'setRemoteDescription',
  'createAnswer',
  'createOffer'
];

// define event mappings
var METHOD_EVENTS = {
  setLocalDescription: 'setlocaldesc',
  setRemoteDescription: 'setremotedesc',
  createOffer: 'offer',
  createAnswer: 'answer'
};

/**
  # rtc-taskqueue

  This is a package that assists with applying actions to an `RTCPeerConnection`
  in as reliable order as possible. It is primarily used by the coupling logic
  of the [`rtc-tools`](https://github.com/rtc-io/rtc-tools).

  ## Example Usage

  To be completed
**/
module.exports = function(pc, opts) {
  // create the task queue
  var queue = new PriorityQueue(orderTasks);
  var tq = require('mbus')('', (opts || {}).logger);

  // initialise task importance
  var priorities = (opts || {}).priorities || DEFAULT_PRIORITIES;

  // check for plugin usage
  var plugin = findPlugin((opts || {}).plugins);

  // initialise state tracking
  var checkQueueTimer = 0;
  var currentTask;
  var defaultFail = tq.bind(tq, 'fail');

  // initialise session description and icecandidate objects
  var RTCSessionDescription = (opts || {}).RTCSessionDescription ||
    detect('RTCSessionDescription');

  var RTCIceCandidate = (opts || {}).RTCIceCandidate ||
    detect('RTCIceCandidate');

  function abortQueue(err) {
    console.error(err);
  }

  function applyCandidate(task, next) {
    var candidate;
    var data = task.args[0];

    // we have a null candidate, we have finished gathering candidates
    if (! data.candidate) {
      return next();
    }

    try {
      candidate = createIceCandidate(data);
      pc.addIceCandidate(candidate);
      tq('ice.remote.applied', candidate);
    }
    catch (e) {
      tq('ice.remote.invalid', candidate);
      return next(e);
    }

    next();
  }

  function checkQueue() {
    // peek at the next item on the queue
    var next = (! queue.isEmpty()) && (! currentTask) && queue.peek();
    var ready = next && testReady(next);
    var retry = (! queue.isEmpty()) && isNotClosed(pc);

//     debug('checking queue: ', currentTask, next && next.name, ready);

    // if we don't have a task ready, then abort
    if (! ready) {
      return retry && triggerQueueCheck(100);
    }

    // update the current task (dequeue)
    currentTask = queue.deq();

    // process the task
    currentTask.fn(currentTask, function(err) {
      var fail = currentTask.fail || defaultFail;
      var pass = currentTask.pass;
      var taskName = currentTask.name;

      // unset the current task
      currentTask = null;

      // if errored, fail
      if (err) {
        console.error(taskName + ' task failed: ', err);
        return fail(err);
      }

      if (typeof pass == 'function') {
        pass.apply(null, [].slice.call(arguments, 1));
      }

      triggerQueueCheck();
    });
  }

  function cleansdp(desc) {
    // ensure we have clean sdp
    var sdpErrors = [];
    var sdp = desc && sdpclean(desc.sdp, { collector: sdpErrors });

    // if we don't have a match, log some info
    if (desc && sdp !== desc.sdp) {
      console.info('invalid lines removed from sdp: ', sdpErrors);
      desc.sdp = sdp;
    }

    return desc;
  }

  function completeConnection() {
    if (pc.signalingState === 'have-remote-offer') {
      return tq.createAnswer();
    }
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

  function emitSdp(sdp) {
    tq('sdp.local', pc.localDescription);
  }

  function enqueue(name, handler, opts) {
    return function() {
      var args = [].slice.call(arguments);

      if (opts && typeof opts.processArgs == 'function') {
        args = args.map(opts.processArgs);
      }

      queue.enq({
        args: args,
        name: name,
        fn: handler,

        // initilaise any checks that need to be done prior
        // to the task executing
        checks: [ isNotClosed ].concat((opts || {}).checks || []),

        // initialise the pass and fail handlers
        pass: (opts || {}).pass,
        fail: (opts || {}).fail
      });

      triggerQueueCheck();
    };
  }

  function execMethod(task, next) {
    var fn = pc[task.name];
    var eventName = METHOD_EVENTS[task.name] || (task.name || '').toLowerCase();
    var cbArgs = [ success, fail ];
    var isOffer = task.name === 'createOffer';

    function fail(err) {
      tq.apply(tq, [ 'negotiate.error', task.name, err ].concat(task.args));
      next(err);
    }

    function success() {
      tq.apply(tq, [ ['negotiate', eventName, 'ok'], task.name ].concat(task.args));
      next.apply(null, [null].concat([].slice.call(arguments)));
    }

    if (typeof fn != 'function') {
      return next(new Error('cannot call "' + task.name + '" on RTCPeerConnection'));
    }

    // invoke the function
    tq.apply(tq, ['negotiate.' + eventName].concat(task.args));
    fn.apply(
      pc,
      task.args.concat(cbArgs).concat(isOffer ? generateConstraints() : [])
    );
  }

  function extractCandidateEventData(data) {
    // if we have been passed an event, then extract the candidate from the data
    if (data.srcElement && data.candidate) {
      data = data.candidate;
    }

    return data;
  }

  function generateConstraints() {
    var allowedKeys = {
      offertoreceivevideo: 'OfferToReceiveVideo',
      offertoreceiveaudio: 'OfferToReceiveAudio',
      icerestart: 'IceRestart',
      voiceactivitydetection: 'VoiceActivityDetection'
    };

    var constraints = {
      OfferToReceiveVideo: true,
      OfferToReceiveAudio: true
    };

    // update known keys to match
    Object.keys(opts || {}).forEach(function(key) {
      if (allowedKeys[key.toLowerCase]) {
        constraints[allowedKeys[key.toLowerCase()]] = opts[key];
      }
    });

    return { mandatory: constraints };
  }

  function hasLocalOrRemoteDesc(pc, task) {
    return pc.localDescription !== null || pc.remoteDescription !== null;
  }

  function isNotNegotiating(pc) {
    return pc.signalingState !== 'have-local-offer';
  }

  function isNotClosed(pc) {
    return pc.signalingState !== 'closed';
  }

  function isStable(pc) {
    return pc.signalingState === 'stable';
  }

  function isValidCandidate(pc, data) {
    return checkCandidate(data.args[0]).length === 0;
  }

  function orderTasks(a, b) {
    // apply each of the checks for each task
    var tasks = [a,b];
    var readiness = tasks.map(testReady);
    var taskPriorities = tasks.map(zip(readiness)).map(function(args) {
      var priority = priorities.indexOf(args[0].name);

      return args[1] ? (priority >= 0 ? priority : PRIORITY_LOW) : PRIORITY_WAIT;
    });

    return taskPriorities[1] - taskPriorities[0];
  }

  // check whether a task is ready (does it pass all the checks)
  function testReady(task) {
    return (task.checks || []).reduce(function(memo, check) {
      return memo && check(pc, task);
    }, true);
  }

  function triggerQueueCheck(wait) {
    clearTimeout(checkQueueTimer);
    checkQueueTimer = setTimeout(checkQueue, wait || 5);
  }

  // patch in the queue helper methods
  tq.addIceCandidate = enqueue('addIceCandidate', applyCandidate, {
    processArgs: extractCandidateEventData,
    checks: [ hasLocalOrRemoteDesc, isValidCandidate ]
  });

  tq.setLocalDescription = enqueue('setLocalDescription', execMethod, {
    processArgs: cleansdp,
    pass: emitSdp
  });

  tq.setRemoteDescription = enqueue('setRemoteDescription', execMethod, {
    processArgs: createSessionDescription,
    pass: completeConnection
  });

  tq.createOffer = enqueue('createOffer', execMethod, {
    checks: [ isNotNegotiating ],
    pass: tq.setLocalDescription
  });

  tq.createAnswer = enqueue('createAnswer', execMethod, {
    pass: tq.setLocalDescription
  });

  return tq;
};

},{"mbus":22,"priorityqueuejs":43,"rtc-core/detect":18,"rtc-core/plugin":20,"rtc-sdpclean":44,"rtc-validator/candidate":45,"whisk/zip":46}],43:[function(require,module,exports){
/**
 * Expose `PriorityQueue`.
 */
module.exports = PriorityQueue;

/**
 * Initializes a new empty `PriorityQueue` with the given `comparator(a, b)`
 * function, uses `.DEFAULT_COMPARATOR()` when no function is provided.
 *
 * The comparator function must return a positive number when `a > b`, 0 when
 * `a == b` and a negative number when `a < b`.
 *
 * @param {Function}
 * @return {PriorityQueue}
 * @api public
 */
function PriorityQueue(comparator) {
  this._comparator = comparator || PriorityQueue.DEFAULT_COMPARATOR;
  this._elements = [];
}

/**
 * Compares `a` and `b`, when `a > b` it returns a positive number, when
 * it returns 0 and when `a < b` it returns a negative number.
 *
 * @param {String|Number} a
 * @param {String|Number} b
 * @return {Number}
 * @api public
 */
PriorityQueue.DEFAULT_COMPARATOR = function(a, b) {
  if (a instanceof Number && b instanceof Number) {
    return a - b;
  } else {
    a = a.toString();
    b = b.toString();

    if (a == b) return 0;

    return (a > b) ? 1 : -1;
  }
};

/**
 * Returns whether the priority queue is empty or not.
 *
 * @return {Boolean}
 * @api public
 */
PriorityQueue.prototype.isEmpty = function() {
  return this.size() === 0;
};

/**
 * Peeks at the top element of the priority queue.
 *
 * @return {Object}
 * @throws {Error} when the queue is empty.
 * @api public
 */
PriorityQueue.prototype.peek = function() {
  if (this.isEmpty()) throw new Error('PriorityQueue is empty');

  return this._elements[0];
};

/**
 * Dequeues the top element of the priority queue.
 *
 * @return {Object}
 * @throws {Error} when the queue is empty.
 * @api public
 */
PriorityQueue.prototype.deq = function() {
  var first = this.peek();
  var last = this._elements.pop();
  var size = this.size();

  if (size === 0) return first;

  this._elements[0] = last;
  var current = 0;

  while (current < size) {
    var largest = current;
    var left = (2 * current) + 1;
    var right = (2 * current) + 2;

    if (left < size && this._compare(left, largest) > 0) {
      largest = left;
    }

    if (right < size && this._compare(right, largest) > 0) {
      largest = right;
    }

    if (largest === current) break;

    this._swap(largest, current);
    current = largest;
  }

  return first;
};

/**
 * Enqueues the `element` at the priority queue and returns its new size.
 *
 * @param {Object} element
 * @return {Number}
 * @api public
 */
PriorityQueue.prototype.enq = function(element) {
  var size = this._elements.push(element);
  var current = size - 1;

  while (current > 0) {
    var parent = Math.floor((current - 1) / 2);

    if (this._compare(current, parent) < 0) break;

    this._swap(parent, current);
    current = parent;
  }

  return size;
};

/**
 * Returns the size of the priority queue.
 *
 * @return {Number}
 * @api public
 */
PriorityQueue.prototype.size = function() {
  return this._elements.length;
};

/**
 *  Iterates over queue elements
 *
 *  @param {Function} fn
 */
PriorityQueue.prototype.forEach = function(fn) {
  return this._elements.forEach(fn);
};

/**
 * Compares the values at position `a` and `b` in the priority queue using its
 * comparator function.
 *
 * @param {Number} a
 * @param {Number} b
 * @return {Number}
 * @api private
 */
PriorityQueue.prototype._compare = function(a, b) {
  return this._comparator(this._elements[a], this._elements[b]);
};

/**
 * Swaps the values at position `a` and `b` in the priority queue.
 *
 * @param {Number} a
 * @param {Number} b
 * @api private
 */
PriorityQueue.prototype._swap = function(a, b) {
  var aux = this._elements[a];
  this._elements[a] = this._elements[b];
  this._elements[b] = aux;
};

},{}],44:[function(require,module,exports){
var validators = [
  [ /^(a\=candidate.*)$/, require('rtc-validator/candidate') ]
];

var reSdpLineBreak = /(\r?\n|\\r\\n)/;

/**
  # rtc-sdpclean

  Remove invalid lines from your SDP.

  ## Why?

  This module removes the occasional "bad egg" that will slip into SDP when it
  is generated by the browser.  In particular these situations are catered for:

  - invalid ICE candidates

**/
module.exports = function(input, opts) {
  var lineBreak = detectLineBreak(input);
  var lines = input.split(lineBreak);
  var collector = (opts || {}).collector;

  // filter out invalid lines
  lines = lines.filter(function(line) {
    // iterate through the validators and use the one that matches
    var validator = validators.reduce(function(memo, data, idx) {
      return typeof memo != 'undefined' ? memo : (data[0].exec(line) && {
        line: line.replace(data[0], '$1'),
        fn: data[1]
      });
    }, undefined);

    // if we have a validator, ensure we have no errors
    var errors = validator ? validator.fn(validator.line) : [];

    // if we have errors and an error collector, then add to the collector
    if (collector) {
      errors.forEach(function(err) {
        collector.push(err);
      });
    }

    return errors.length === 0;
  });

  return lines.join(lineBreak);
};

function detectLineBreak(input) {
  var match = reSdpLineBreak.exec(input);

  return match && match[0];
}

},{"rtc-validator/candidate":45}],45:[function(require,module,exports){
var debug = require('cog/logger')('rtc-validator');
var rePrefix = /^(?:a=)?candidate:/;
var reIP = /^(\d+\.){3}\d+$/;

/*

validation rules as per:
http://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-03#section-8.1

   candidate-attribute   = "candidate" ":" foundation SP component-id SP
                           transport SP
                           priority SP
                           connection-address SP     ;from RFC 4566
                           port         ;port from RFC 4566
                           SP cand-type
                           [SP rel-addr]
                           [SP rel-port]
                           *(SP extension-att-name SP
                                extension-att-value)

   foundation            = 1*32ice-char
   component-id          = 1*5DIGIT
   transport             = "UDP" / transport-extension
   transport-extension   = token              ; from RFC 3261
   priority              = 1*10DIGIT
   cand-type             = "typ" SP candidate-types
   candidate-types       = "host" / "srflx" / "prflx" / "relay" / token
   rel-addr              = "raddr" SP connection-address
   rel-port              = "rport" SP port
   extension-att-name    = token
   extension-att-value   = *VCHAR
   ice-char              = ALPHA / DIGIT / "+" / "/"
*/
var partValidation = [
  [ /.+/, 'invalid foundation component', 'foundation' ],
  [ /\d+/, 'invalid component id', 'component-id' ],
  [ /(UDP|TCP)/i, 'transport must be TCP or UDP', 'transport' ],
  [ /\d+/, 'numeric priority expected', 'priority' ],
  [ reIP, 'invalid connection address', 'connection-address' ],
  [ /\d+/, 'invalid connection port', 'connection-port' ],
  [ /typ/, 'Expected "typ" identifier', 'type classifier' ],
  [ /.+/, 'Invalid candidate type specified', 'candidate-type' ]
];

/**
  ### `rtc-validator/candidate`

  Validate that an `RTCIceCandidate` (or plain old object with data, sdpMid,
  etc attributes) is a valid ice candidate.

  Specs reviewed as part of the validation implementation:

  - <http://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-03#section-8.1>
  - <http://tools.ietf.org/html/rfc5245>

**/
module.exports = function(data) {
  var errors = [];
  var candidate = data && (data.candidate || data);
  var prefixMatch = candidate && rePrefix.exec(candidate);
  var parts = prefixMatch && candidate.slice(prefixMatch[0].length).split(/\s/);

  if (! candidate) {
    return [ new Error('empty candidate') ];
  }

  // check that the prefix matches expected
  if (! prefixMatch) {
    return [ new Error('candidate did not match expected sdp line format') ];
  }

  // perform the part validation
  errors = errors.concat(parts.map(validateParts)).filter(Boolean);

  return errors;
};

function validateParts(part, idx) {
  var validator = partValidation[idx];

  if (validator && (! validator[0].test(part))) {
    debug(validator[2] + ' part failed validation: ' + part);
    return new Error(validator[1]);
  }
}

},{"cog/logger":9}],46:[function(require,module,exports){
/**
  ## zip

  zip one array with other arrays

  <<< examples/zip.js

  ### zip todo

  - tests

**/
module.exports = function() {
  var targets = [].slice.call(arguments);

  return function(item, index) {
    return [item].concat(targets.map(function(val) {
      return val[index];
    }));
  };
};
},{}],47:[function(require,module,exports){
/**
  ## chain

  Create a function that will create the combined result of calling all
  the provided functions in the provided order.

  <<< examples/chain.js

**/
module.exports = function(fns) {
  fns = [].concat(fns || []).concat([].slice.call(arguments, 1));

  return function(value) {
    return fns.reduce(function(memo, fn) {
      var result = fn(memo);

      return result !== undefined ? result : memo;
    }, value || 0);
  }
};

},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZWZhdWx0Y29uZmlnLmpzIiwiaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvY29nL2RlZmF1bHRzLmpzIiwibm9kZV9tb2R1bGVzL2NvZy9leHRlbmQuanMiLCJub2RlX21vZHVsZXMvY29nL2dldGFibGUuanMiLCJub2RlX21vZHVsZXMvY29nL2pzb25wYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9jb2cvbG9nZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2NvZy90aHJvdHRsZS5qcyIsIm5vZGVfbW9kdWxlcy9mZG9tL2FwcGVuZC5qcyIsIm5vZGVfbW9kdWxlcy9mZG9tL2NsYXNzdHdlYWsuanMiLCJub2RlX21vZHVsZXMvZmRvbS9xc2EuanMiLCJub2RlX21vZHVsZXMva2dvL2tnby5qcyIsIm5vZGVfbW9kdWxlcy9rZ28vcnVuLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1hdHRhY2gvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLWNhcHR1cmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLWNvcmUvZGV0ZWN0LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL25vZGVfbW9kdWxlcy9kZXRlY3QtYnJvd3Nlci9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL3BsdWdpbi5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL21idXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvbWJ1cy9ub2RlX21vZHVsZXMvYXJyYXktdHJpZS9ub2RlX21vZHVsZXMvYmluYXJ5LXNlYXJjaC1ib3VuZHMvc2VhcmNoLWJvdW5kcy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9tYnVzL25vZGVfbW9kdWxlcy9hcnJheS10cmllL3RyaWUuanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvZGVmYXVsdHMuanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9oYW5kbGVycy9hbm5vdW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2hhbmRsZXJzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvaGFuZGxlcnMvbGVhdmUuanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvY3VpZC9kaXN0L2Jyb3dzZXItY3VpZC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9mb3JtYXR0ZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvZm9ybWF0dGVyL21vZHMuanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9wcmltdXMtbG9hZGVyLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvcHJvY2Vzc29yLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvc2lnbmFsbGVyLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy10b29scy9jbGVhbnVwLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy10b29scy9jb3VwbGUuanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXRvb2xzL2RldGVjdC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtdG9vbHMvZ2VuZXJhdG9ycy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtdG9vbHMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXRvb2xzL21vbml0b3IuanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXRvb2xzL25vZGVfbW9kdWxlcy9ydGMtdGFza3F1ZXVlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvcnRjLXRhc2txdWV1ZS9ub2RlX21vZHVsZXMvcHJpb3JpdHlxdWV1ZWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvcnRjLXRhc2txdWV1ZS9ub2RlX21vZHVsZXMvcnRjLXNkcGNsZWFuL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvcnRjLXRhc2txdWV1ZS9ub2RlX21vZHVsZXMvcnRjLXZhbGlkYXRvci9jYW5kaWRhdGUuanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXRvb2xzL25vZGVfbW9kdWxlcy9ydGMtdGFza3F1ZXVlL25vZGVfbW9kdWxlcy93aGlzay96aXAuanMiLCJub2RlX21vZHVsZXMvd2hpc2svY2hhaW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9zQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBhIGRlZmF1bHQgY29uZmlndXJhdGlvbiB0aGF0IGlzIHVzZWQgYnkgdGhlIHJ0YyBwYWNrYWdlXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gc2ltcGxlIGNvbnN0cmFpbnRzIGZvciBkZWZhdWx0c1xuICBjb25zdHJhaW50czoge1xuICAgIHZpZGVvOiB0cnVlLFxuICAgIGF1ZGlvOiB0cnVlXG4gIH0sXG5cbiAgLy8gdXNlIHRoZSBwdWJsaWMgc3dpdGNoYm9hcmQgZm9yIHNpZ25hbGxpbmdcbiAgc2lnbmFsbGVyOiAnLy9zd2l0Y2hib2FyZC5ydGMuaW8nLFxuXG4gIC8vIG5vIHJvb20gaXMgZGVmaW5lZCBieSBkZWZhdWx0XG4gIC8vIHJ0Yy1xdWlja2Nvbm5lY3Qgd2lsbCBhdXRvZ2VuZXJhdGUgdXNpbmcgYSBsb2NhdGlvbi5oYXNoXG4gIHJvb206IHVuZGVmaW5lZCxcblxuICAvLyBhbnkgZGF0YSBjaGFubmVscyB0aGF0IHdlIHdhbnQgdG8gY3JlYXRlIGZvciB0aGUgY29uZmVyZW5jZVxuICAvLyBieSBkZWZhdWx0IGEgY2hhdCBjaGFubmVsIGlzIGNyZWF0ZWQsIGJ1dCBvdGhlciBjaGFubmVscyBjYW4gYmUgYWRkZWQgYWxzb1xuICAvLyBhZGRpdGlvbmFsbHkgb3B0aW9ucyBjYW4gYmUgc3VwcGxpZWQgdG8gY3VzdG9taXplIHRoZSBkYXRhIGNoYW5uZWwgY29uZmlnXG4gIC8vIHNlZTogPGh0dHA6Ly93M2MuZ2l0aHViLmlvL3dlYnJ0Yy1wYy8jaWRsLWRlZi1SVENEYXRhQ2hhbm5lbEluaXQ+XG4gIGNoYW5uZWxzOiB7XG4gICAgY2hhdDogdHJ1ZVxuICB9LFxuXG4gIC8vIHRoZSBzZWxlY3RvciB0aGF0IHdpbGwgYmUgdXNlZCB0byBpZGVudGlmeSB0aGUgbG9jYWx2aWRlbyBjb250YWluZXJcbiAgbG9jYWxDb250YWluZXI6ICcjbC12aWRlbycsXG5cbiAgLy8gdGhlIHNlbGVjdG9yIHRoYXQgd2lsbCBiZSB1c2VkIHRvIGlkZW50aWZ5IHRoZSByZW1vdGV2aWRlbyBjb250YWluZXJcbiAgcmVtb3RlQ29udGFpbmVyOiAnI3ItdmlkZW8nLFxuXG4gIC8vIGNvbW1vbiBvcHRpb25zIHRoYXQgYXJlIHVzZWQgYWNyb3NzIHJ0Yy5pbyBwYWNrYWdlc1xuICBvcHRpb25zOiB7XG4gICAgLy8gc2hvdWxkIHdlIGF0ZW1wdCB0byBsb2FkIGFueSBwbHVnaW5zP1xuICAgIHBsdWdpbnM6IFtdXG4gIH1cbn07XG4iLCJ2YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG52YXIgYXR0YWNoID0gcmVxdWlyZSgncnRjLWF0dGFjaCcpO1xudmFyIGNhcHR1cmUgPSByZXF1aXJlKCdydGMtY2FwdHVyZScpO1xudmFyIHF1aWNrY29ubmVjdCA9IHJlcXVpcmUoJ3J0Yy1xdWlja2Nvbm5lY3QnKTtcbnZhciBjaGFpbiA9IHJlcXVpcmUoJ3doaXNrL2NoYWluJyk7XG52YXIgYXBwZW5kID0gcmVxdWlyZSgnZmRvbS9hcHBlbmQnKTtcbnZhciB0d2VhayA9IHJlcXVpcmUoJ2Zkb20vY2xhc3N0d2VhaycpO1xudmFyIHFzYSA9IHJlcXVpcmUoJ2Zkb20vcXNhJyk7XG52YXIga2dvID0gcmVxdWlyZSgna2dvJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gIHZhciBjb25mZXJlbmNlO1xuXG4gIC8vIGV4dGVuZCBvdXIgY29uZmlndXJhdGlvbiB3aXRoIHRoZSBkZWZhdWx0c1xuICBjb25maWcgPSBkZWZhdWx0cyh7fSwgY29uZmlnLCByZXF1aXJlKCcuL2RlZmF1bHRjb25maWcuanMnKSk7XG5cbiAgLy8gY3JlYXRlIG91ciBjb25mZXJlbmNlIGluc3RhbmNlXG4gIGNvbmZlcmVuY2UgPSBxdWlja2Nvbm5lY3QoXG4gICAgY29uZmlnLnNpZ25hbGxlcixcbiAgICBleHRlbmQoeyBleHBlY3RlZExvY2FsU3RyZWFtczogMSB9LCBjb25maWcub3B0cywge1xuICAgICAgcm9vbTogY29uZmlnLnJvb21cbiAgICB9KVxuICApO1xuXG4gIGNvbmZlcmVuY2VcbiAgLm9uKCdjYWxsOmVuZGVkJywgcmVtb3ZlUmVtb3RlVmlkZW9zKVxuICAub24oJ3N0cmVhbTphZGRlZCcsIHJlbW90ZVZpZGVvKGNvbmZlcmVuY2UsIGNvbmZpZykpO1xuXG4gIE9iamVjdC5rZXlzKGNvbmZpZy5jaGFubmVscyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGNoYW5uZWxDb25maWcgPSBjb25maWcuY2hhbm5lbHNbbmFtZV07XG5cbiAgICBjb25mZXJlbmNlLmNyZWF0ZURhdGFDaGFubmVsKG5hbWUsIGNoYW5uZWxDb25maWcgPT09IHRydWUgPyBudWxsIDogY2hhbm5lbENvbmZpZyk7XG4gIH0pO1xuXG4gIC8vIGlmIHdlIGhhdmUgY29uc3RyYWludHMsIHRoZW4gY2FwdHVyZSB2aWRlb1xuICBpZiAoY29uZmlnLmNvbnN0cmFpbnRzKSB7XG4gICAgbG9jYWxWaWRlbyhjb25mZXJlbmNlLCBjb25maWcpO1xuICB9XG5cbiAgcmV0dXJuIGNvbmZlcmVuY2U7XG59XG5cbmZ1bmN0aW9uIGxvY2FsVmlkZW8ocWMsIGNvbmZpZykge1xuICAvLyB1c2Uga2dvIHRvIGhlbHAgd2l0aCBmbG93IGNvbnRyb2xcbiAga2dvKGNvbmZpZylcbiAgKCdjYXB0dXJlJywgWyAnY29uc3RyYWludHMnLCAnb3B0aW9ucycgXSwgY2FwdHVyZSlcbiAgKCdhdHRhY2gnLCBbICdjYXB0dXJlJywgJ29wdGlvbnMnIF0sIGF0dGFjaC5sb2NhbClcbiAgKCdyZW5kZXItbG9jYWwnLCBbICdhdHRhY2gnIF0sIGNoYWluKFtcbiAgICB0d2VhaygnK3J0YycpLFxuICAgIHR3ZWFrKCcrbG9jYWx2aWRlbycpLFxuICAgIGFwcGVuZC50bygoY29uZmlnIHx8IHt9KS5sb2NhbENvbnRhaW5lciB8fCAnI2wtdmlkZW8nKVxuICBdKSlcbiAgKCdzdGFydC1jb25mZXJlbmNlJywgWyAnY2FwdHVyZScgXSwgcWMuYWRkU3RyZWFtKVxuICAub24oJ2Vycm9yJywgcmVwb3J0RXJyb3IocWMsIGNvbmZpZykpO1xufVxuXG5mdW5jdGlvbiByZW1vdGVWaWRlbyhxYywgY29uZmlnKSB7XG4gIHJldHVybiBmdW5jdGlvbihpZCwgc3RyZWFtKSB7XG4gICAga2dvKHsgc3RyZWFtOiBzdHJlYW0gfSlcbiAgICAoJ2F0dGFjaCcsIFsgJ3N0cmVhbScgXSwgYXR0YWNoKVxuICAgICgncmVuZGVyLXJlbW90ZScsIFsgJ2F0dGFjaCcgXSwgZnVuY3Rpb24oZWwpIHtcbiAgICAgIGVsLmRhdGFzZXQucGVlciA9IGlkO1xuICAgICAgYXBwZW5kLnRvKChjb25maWcgfHwge30pLnJlbW90ZUNvbnRhaW5lciB8fCAnI3ItdmlkZW8nLCBlbCk7XG4gICAgfSlcbiAgICAub24oJ2Vycm9yJywgcmVwb3J0RXJyb3IocWMsIGNvbmZpZykpO1xuICB9O1xufVxuXG5mdW5jdGlvbiByZW1vdmVSZW1vdGVWaWRlb3MoaWQpIHtcbiAgcXNhKCdbZGF0YS1wZWVyPVwiJyArIGlkICsgJ1wiXScpLmZvckVhY2goZnVuY3Rpb24oZWwpIHtcbiAgICBlbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlcG9ydEVycm9yKHFjLCBjb25maWcpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGVycikge1xuICB9O1xufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuTXV0YXRpb25PYnNlcnZlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgdmFyIHF1ZXVlID0gW107XG5cbiAgICBpZiAoY2FuTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgICB2YXIgaGlkZGVuRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHF1ZXVlTGlzdCA9IHF1ZXVlLnNsaWNlKCk7XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgcXVldWVMaXN0LmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGhpZGRlbkRpdiwgeyBhdHRyaWJ1dGVzOiB0cnVlIH0pO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBoaWRkZW5EaXYuc2V0QXR0cmlidXRlKCd5ZXMnLCAnbm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2RlZmF1bHRzXG5cbmBgYGpzXG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcbmBgYFxuXG4jIyMgZGVmYXVsdHModGFyZ2V0LCAqKVxuXG5TaGFsbG93IGNvcHkgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0aGUgc3VwcGxpZWQgc291cmNlIG9iamVjdHMgKCopIGludG9cbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQuICBEbyBub3QsXG5ob3dldmVyLCBvdmVyd3JpdGUgZXhpc3Rpbmcga2V5cyB3aXRoIG5ldyB2YWx1ZXM6XG5cbmBgYGpzXG5kZWZhdWx0cyh7IGE6IDEsIGI6IDIgfSwgeyBjOiAzIH0sIHsgZDogNCB9LCB7IGI6IDUgfSkpO1xuYGBgXG5cblNlZSBhbiBleGFtcGxlIG9uIFtyZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA3OTQ3NSkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGEgdGFyZ2V0XG4gIHRhcmdldCA9IHRhcmdldCB8fCB7fTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHNvdXJjZXMgYW5kIGNvcHkgdG8gdGhlIHRhcmdldFxuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgaWYgKHRhcmdldFtwcm9wXSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2V4dGVuZFxuXG5gYGBqc1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbmBgYFxuXG4jIyMgZXh0ZW5kKHRhcmdldCwgKilcblxuU2hhbGxvdyBjb3B5IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGhlIHN1cHBsaWVkIHNvdXJjZSBvYmplY3RzICgqKSBpbnRvXG50aGUgdGFyZ2V0IG9iamVjdCwgcmV0dXJuaW5nIHRoZSB0YXJnZXQgb2JqZWN0IG9uY2UgY29tcGxldGVkOlxuXG5gYGBqc1xuZXh0ZW5kKHsgYTogMSwgYjogMiB9LCB7IGM6IDMgfSwgeyBkOiA0IH0sIHsgYjogNSB9KSk7XG5gYGBcblxuU2VlIGFuIGV4YW1wbGUgb24gW3JlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDc5NDc1KS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLmZvckVhY2goZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKCEgc291cmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qKlxuICAjIyBjb2cvZ2V0YWJsZVxuXG4gIFRha2UgYW4gb2JqZWN0IGFuZCBwcm92aWRlIGEgd3JhcHBlciB0aGF0IGFsbG93cyB5b3UgdG8gYGdldGAgYW5kXG4gIGBzZXRgIHZhbHVlcyBvbiB0aGF0IG9iamVjdC5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICBmdW5jdGlvbiBnZXQoa2V5KSB7XG4gICAgcmV0dXJuIHRhcmdldFtrZXldO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0KGtleSwgdmFsdWUpIHtcbiAgICB0YXJnZXRba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGtleSkge1xuICAgIHJldHVybiBkZWxldGUgdGFyZ2V0W2tleV07XG4gIH1cblxuICBmdW5jdGlvbiBrZXlzKCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0YXJnZXQpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHZhbHVlcygpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGFyZ2V0KS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGFyZ2V0W2tleV07XG4gICAgfSk7XG4gIH07XG5cbiAgaWYgKHR5cGVvZiB0YXJnZXQgIT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBnZXQ6IGdldCxcbiAgICBzZXQ6IHNldCxcbiAgICByZW1vdmU6IHJlbW92ZSxcbiAgICBkZWxldGU6IHJlbW92ZSxcbiAgICBrZXlzOiBrZXlzLFxuICAgIHZhbHVlczogdmFsdWVzXG4gIH07XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIGNvZy9qc29ucGFyc2VcblxuICBgYGBqc1xuICB2YXIganNvbnBhcnNlID0gcmVxdWlyZSgnY29nL2pzb25wYXJzZScpO1xuICBgYGBcblxuICAjIyMganNvbnBhcnNlKGlucHV0KVxuXG4gIFRoaXMgZnVuY3Rpb24gd2lsbCBhdHRlbXB0IHRvIGF1dG9tYXRpY2FsbHkgZGV0ZWN0IHN0cmluZ2lmaWVkIEpTT04sIGFuZFxuICB3aGVuIGRldGVjdGVkIHdpbGwgcGFyc2UgaW50byBKU09OIG9iamVjdHMuICBUaGUgZnVuY3Rpb24gbG9va3MgZm9yIHN0cmluZ3NcbiAgdGhhdCBsb29rIGFuZCBzbWVsbCBsaWtlIHN0cmluZ2lmaWVkIEpTT04sIGFuZCBpZiBmb3VuZCBhdHRlbXB0cyB0b1xuICBgSlNPTi5wYXJzZWAgdGhlIGlucHV0IGludG8gYSB2YWxpZCBvYmplY3QuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgaXNTdHJpbmcgPSB0eXBlb2YgaW5wdXQgPT0gJ3N0cmluZycgfHwgKGlucHV0IGluc3RhbmNlb2YgU3RyaW5nKTtcbiAgdmFyIHJlTnVtZXJpYyA9IC9eXFwtP1xcZCtcXC4/XFxkKiQvO1xuICB2YXIgc2hvdWxkUGFyc2UgO1xuICB2YXIgZmlyc3RDaGFyO1xuICB2YXIgbGFzdENoYXI7XG5cbiAgaWYgKCghIGlzU3RyaW5nKSB8fCBpbnB1dC5sZW5ndGggPCAyKSB7XG4gICAgaWYgKGlzU3RyaW5nICYmIHJlTnVtZXJpYy50ZXN0KGlucHV0KSkge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoaW5wdXQpO1xuICAgIH1cblxuICAgIHJldHVybiBpbnB1dDtcbiAgfVxuXG4gIC8vIGNoZWNrIGZvciB0cnVlIG9yIGZhbHNlXG4gIGlmIChpbnB1dCA9PT0gJ3RydWUnIHx8IGlucHV0ID09PSAnZmFsc2UnKSB7XG4gICAgcmV0dXJuIGlucHV0ID09PSAndHJ1ZSc7XG4gIH1cblxuICAvLyBjaGVjayBmb3IgbnVsbFxuICBpZiAoaW5wdXQgPT09ICdudWxsJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gZ2V0IHRoZSBmaXJzdCBhbmQgbGFzdCBjaGFyYWN0ZXJzXG4gIGZpcnN0Q2hhciA9IGlucHV0LmNoYXJBdCgwKTtcbiAgbGFzdENoYXIgPSBpbnB1dC5jaGFyQXQoaW5wdXQubGVuZ3RoIC0gMSk7XG5cbiAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgd2Ugc2hvdWxkIEpTT04ucGFyc2UgdGhlIGlucHV0XG4gIHNob3VsZFBhcnNlID1cbiAgICAoZmlyc3RDaGFyID09ICd7JyAmJiBsYXN0Q2hhciA9PSAnfScpIHx8XG4gICAgKGZpcnN0Q2hhciA9PSAnWycgJiYgbGFzdENoYXIgPT0gJ10nKSB8fFxuICAgIChmaXJzdENoYXIgPT0gJ1wiJyAmJiBsYXN0Q2hhciA9PSAnXCInKTtcblxuICBpZiAoc2hvdWxkUGFyc2UpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIEpTT04ucGFyc2UoaW5wdXQpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgLy8gYXBwYXJlbnRseSBpdCB3YXNuJ3QgdmFsaWQganNvbiwgY2Fycnkgb24gd2l0aCByZWd1bGFyIHByb2Nlc3NpbmdcbiAgICB9XG4gIH1cblxuXG4gIHJldHVybiByZU51bWVyaWMudGVzdChpbnB1dCkgPyBwYXJzZUZsb2F0KGlucHV0KSA6IGlucHV0O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgY29nL2xvZ2dlclxuXG4gIGBgYGpzXG4gIHZhciBsb2dnZXIgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJyk7XG4gIGBgYFxuXG4gIFNpbXBsZSBicm93c2VyIGxvZ2dpbmcgb2ZmZXJpbmcgc2ltaWxhciBmdW5jdGlvbmFsaXR5IHRvIHRoZVxuICBbZGVidWddKGh0dHBzOi8vZ2l0aHViLmNvbS92aXNpb25tZWRpYS9kZWJ1ZykgbW9kdWxlLlxuXG4gICMjIyBVc2FnZVxuXG4gIENyZWF0ZSB5b3VyIHNlbGYgYSBuZXcgbG9nZ2luZyBpbnN0YW5jZSBhbmQgZ2l2ZSBpdCBhIG5hbWU6XG5cbiAgYGBganNcbiAgdmFyIGRlYnVnID0gbG9nZ2VyKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIGRlYnVnZ2luZzpcblxuICBgYGBqc1xuICBkZWJ1ZygnaGVsbG8nKTtcbiAgYGBgXG5cbiAgQXQgdGhpcyBzdGFnZSwgbm8gbG9nIG91dHB1dCB3aWxsIGJlIGdlbmVyYXRlZCBiZWNhdXNlIHlvdXIgbG9nZ2VyIGlzXG4gIGN1cnJlbnRseSBkaXNhYmxlZC4gIEVuYWJsZSBpdDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIG1vcmUgbG9nZ2VyOlxuXG4gIGBgYGpzXG4gIGRlYnVnKCdPaCB0aGlzIGlzIHNvIG11Y2ggbmljZXIgOiknKTtcbiAgLy8gLS0+IHBoaWw6IE9oIHRoaXMgaXMgc29tZSBtdWNoIG5pY2VyIDopXG4gIGBgYFxuXG4gICMjIyBSZWZlcmVuY2VcbioqL1xuXG52YXIgYWN0aXZlID0gW107XG52YXIgdW5sZWFzaExpc3RlbmVycyA9IFtdO1xudmFyIHRhcmdldHMgPSBbIGNvbnNvbGUgXTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyKG5hbWUpXG5cbiAgQ3JlYXRlIGEgbmV3IGxvZ2dpbmcgaW5zdGFuY2UuXG4qKi9cbnZhciBsb2dnZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgLy8gaW5pdGlhbCBlbmFibGVkIGNoZWNrXG4gIHZhciBlbmFibGVkID0gY2hlY2tBY3RpdmUoKTtcblxuICBmdW5jdGlvbiBjaGVja0FjdGl2ZSgpIHtcbiAgICByZXR1cm4gZW5hYmxlZCA9IGFjdGl2ZS5pbmRleE9mKCcqJykgPj0gMCB8fCBhY3RpdmUuaW5kZXhPZihuYW1lKSA+PSAwO1xuICB9XG5cbiAgLy8gcmVnaXN0ZXIgdGhlIGNoZWNrIGFjdGl2ZSB3aXRoIHRoZSBsaXN0ZW5lcnMgYXJyYXlcbiAgdW5sZWFzaExpc3RlbmVyc1t1bmxlYXNoTGlzdGVuZXJzLmxlbmd0aF0gPSBjaGVja0FjdGl2ZTtcblxuICAvLyByZXR1cm4gdGhlIGFjdHVhbCBsb2dnaW5nIGZ1bmN0aW9uXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzdHJpbmcgbWVzc2FnZVxuICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PSAnc3RyaW5nJyB8fCAoYXJnc1swXSBpbnN0YW5jZW9mIFN0cmluZykpIHtcbiAgICAgIGFyZ3NbMF0gPSBuYW1lICsgJzogJyArIGFyZ3NbMF07XG4gICAgfVxuXG4gICAgLy8gaWYgbm90IGVuYWJsZWQsIGJhaWxcbiAgICBpZiAoISBlbmFibGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gbG9nXG4gICAgdGFyZ2V0cy5mb3JFYWNoKGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgdGFyZ2V0LmxvZy5hcHBseSh0YXJnZXQsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnJlc2V0KClcblxuICBSZXNldCBsb2dnaW5nIChyZW1vdmUgdGhlIGRlZmF1bHQgY29uc29sZSBsb2dnZXIsIGZsYWcgYWxsIGxvZ2dlcnMgYXNcbiAgaW5hY3RpdmUsIGV0YywgZXRjLlxuKiovXG5sb2dnZXIucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgLy8gcmVzZXQgdGFyZ2V0cyBhbmQgYWN0aXZlIHN0YXRlc1xuICB0YXJnZXRzID0gW107XG4gIGFjdGl2ZSA9IFtdO1xuXG4gIHJldHVybiBsb2dnZXIuZW5hYmxlKCk7XG59O1xuXG4vKipcbiAgIyMjIyBsb2dnZXIudG8odGFyZ2V0KVxuXG4gIEFkZCBhIGxvZ2dpbmcgdGFyZ2V0LiAgVGhlIGxvZ2dlciBtdXN0IGhhdmUgYSBgbG9nYCBtZXRob2QgYXR0YWNoZWQuXG5cbioqL1xubG9nZ2VyLnRvID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIHRhcmdldHMgPSB0YXJnZXRzLmNvbmNhdCh0YXJnZXQgfHwgW10pO1xuXG4gIHJldHVybiBsb2dnZXI7XG59O1xuXG4vKipcbiAgIyMjIyBsb2dnZXIuZW5hYmxlKG5hbWVzKilcblxuICBFbmFibGUgbG9nZ2luZyB2aWEgdGhlIG5hbWVkIGxvZ2dpbmcgaW5zdGFuY2VzLiAgVG8gZW5hYmxlIGxvZ2dpbmcgdmlhIGFsbFxuICBpbnN0YW5jZXMsIHlvdSBjYW4gcGFzcyBhIHdpbGRjYXJkOlxuXG4gIGBgYGpzXG4gIGxvZ2dlci5lbmFibGUoJyonKTtcbiAgYGBgXG5cbiAgX19UT0RPOl9fIHdpbGRjYXJkIGVuYWJsZXJzXG4qKi9cbmxvZ2dlci5lbmFibGUgPSBmdW5jdGlvbigpIHtcbiAgLy8gdXBkYXRlIHRoZSBhY3RpdmVcbiAgYWN0aXZlID0gYWN0aXZlLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXG4gIC8vIHRyaWdnZXIgdGhlIHVubGVhc2ggbGlzdGVuZXJzXG4gIHVubGVhc2hMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgIGxpc3RlbmVyKCk7XG4gIH0pO1xuXG4gIHJldHVybiBsb2dnZXI7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyBjb2cvdGhyb3R0bGVcblxuICBgYGBqc1xuICB2YXIgdGhyb3R0bGUgPSByZXF1aXJlKCdjb2cvdGhyb3R0bGUnKTtcbiAgYGBgXG5cbiAgIyMjIHRocm90dGxlKGZuLCBkZWxheSwgb3B0cylcblxuICBBIGNoZXJyeS1waWNrYWJsZSB0aHJvdHRsZSBmdW5jdGlvbi4gIFVzZWQgdG8gdGhyb3R0bGUgYGZuYCB0byBlbnN1cmVcbiAgdGhhdCBpdCBjYW4gYmUgY2FsbGVkIGF0IG1vc3Qgb25jZSBldmVyeSBgZGVsYXlgIG1pbGxpc2Vjb25kcy4gIFdpbGxcbiAgZmlyZSBmaXJzdCBldmVudCBpbW1lZGlhdGVseSwgZW5zdXJpbmcgdGhlIG5leHQgZXZlbnQgZmlyZWQgd2lsbCBvY2N1clxuICBhdCBsZWFzdCBgZGVsYXlgIG1pbGxpc2Vjb25kcyBhZnRlciB0aGUgZmlyc3QsIGFuZCBzbyBvbi5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuLCBkZWxheSwgb3B0cykge1xuICB2YXIgbGFzdEV4ZWMgPSAob3B0cyB8fCB7fSkubGVhZGluZyAhPT0gZmFsc2UgPyAwIDogRGF0ZS5ub3coKTtcbiAgdmFyIHRyYWlsaW5nID0gKG9wdHMgfHwge30pLnRyYWlsaW5nO1xuICB2YXIgdGltZXI7XG4gIHZhciBxdWV1ZWRBcmdzO1xuICB2YXIgcXVldWVkU2NvcGU7XG5cbiAgLy8gdHJhaWxpbmcgZGVmYXVsdHMgdG8gdHJ1ZVxuICB0cmFpbGluZyA9IHRyYWlsaW5nIHx8IHRyYWlsaW5nID09PSB1bmRlZmluZWQ7XG4gIFxuICBmdW5jdGlvbiBpbnZva2VEZWZlcmVkKCkge1xuICAgIGZuLmFwcGx5KHF1ZXVlZFNjb3BlLCBxdWV1ZWRBcmdzIHx8IFtdKTtcbiAgICBsYXN0RXhlYyA9IERhdGUubm93KCk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRpY2sgPSBEYXRlLm5vdygpO1xuICAgIHZhciBlbGFwc2VkID0gdGljayAtIGxhc3RFeGVjO1xuXG4gICAgLy8gYWx3YXlzIGNsZWFyIHRoZSBkZWZlcmVkIHRpbWVyXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcblxuICAgIGlmIChlbGFwc2VkIDwgZGVsYXkpIHtcbiAgICAgIHF1ZXVlZEFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICBxdWV1ZWRTY29wZSA9IHRoaXM7XG5cbiAgICAgIHJldHVybiB0cmFpbGluZyAmJiAodGltZXIgPSBzZXRUaW1lb3V0KGludm9rZURlZmVyZWQsIGRlbGF5IC0gZWxhcHNlZCkpO1xuICAgIH1cblxuICAgIC8vIGNhbGwgdGhlIGZ1bmN0aW9uXG4gICAgbGFzdEV4ZWMgPSB0aWNrO1xuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyMgYXBwZW5kXG5cbiAgYGBganNcbiAgdmFyIGFwcGVuZCA9IHJlcXVpcmUoJ2Zkb20vYXBwZW5kJyk7XG4gIGBgYFxuKiovXG5cbnZhciBhcHBlbmQgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnbm90IHlldCBpbXBsZW1lbnRlZCcpO1xuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICAjIyMjIGFwcGVuZC50byh0YXJnZXQsID0+IGNoaWxkKSA9PiBjaGlsZFxuXG4gIEFwcGVuZCB0aGUgc3BlY2lmaWVkIGBjaGlsZGAgZWxlbWVudCB0byB0aGUgYHRhcmdldGAgZWxlbWVudCB1c2luZyB0aGVcbiAgZmFtaWxpYXIgYGFwcGVuZENoaWxkYCBtZXRob2Qgb2YgdGhlIHRhcmdldC5cblxuICA8PDwgZXhhbXBsZXMvYXBwZW5kLXRvLmpzXG5cbioqL1xuXG5hcHBlbmQudG8gPSBmdW5jdGlvbih0YXJnZXQsIGNoaWxkKSB7XG5cbiAgZnVuY3Rpb24gYXBwZW5kKGVsKSB7XG4gICAgdmFyIHQgPSB0YXJnZXQ7XG4gICAgaWYgKHR5cGVvZiB0ID09ICdzdHJpbmcnIHx8ICh0IGluc3RhbmNlb2YgU3RyaW5nKSkge1xuICAgICAgdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodCk7XG4gICAgfVxuXG4gICAgaWYgKHQgJiYgdHlwZW9mIHQuYXBwZW5kQ2hpbGQgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdC5hcHBlbmRDaGlsZChlbCk7XG4gICAgICByZXR1cm4gZWw7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNoaWxkID8gYXBwZW5kKGNoaWxkKSA6IGFwcGVuZDtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVEZWxpbSA9IC9bXFxzXFwsXVxccyovO1xudmFyIG9wTWFwcGluZ3MgPSB7XG4gICcrJzogJ2FkZCcsXG4gICctJzogJ3JlbW92ZScsXG4gICd+JzogJ3RvZ2dsZScsXG4gICchJzogJ3RvZ2dsZSdcbn07XG5cbi8qKlxuICAjIyMgY2xhc3N0d2VhayhvcGVyYXRpb25zLCA9PiBlbClcblxuICBBIGZ1bmN0aW9uYWwgaGVscGVyIGZvciBtYWtpbmdcbiAgW2NsYXNzTGlzdF0oaHR0cDovL3d3dy53My5vcmcvVFIvZG9tY29yZS8jZG9tLWVsZW1lbnQtY2xhc3NsaXN0KVxuICBtb2RpZmljYXRpb25zIHRvIGVsZW1lbnRzLCBzdXBwb3J0aW5nIHBhcnRpYWwgYXBwbGljYXRpb24uXG5cbiAgPDw8IGV4YW1wbGVzL2NsYXNzdHdlYWsuanNcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG1vZHMsIGVsZW1lbnQpIHtcbiAgdmFyIHJ1bGVzID0gbW9kcy50cmltKCkuc3BsaXQocmVEZWxpbSlcbiAgICAvLyBjcmVhdGUgdGhlIHJ1bGUgb2JqZWN0c1xuICAgIC5tYXAoZnVuY3Rpb24ocnVsZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3A6IG9wTWFwcGluZ3NbcnVsZS5jaGFyQXQoMCldLFxuICAgICAgICBjbHM6IHJ1bGUuc2xpY2UoMSlcbiAgICAgIH07XG4gICAgfSlcbiAgICAvLyByZW1vdmVkIG5vbiBtYXBwZWQgb3BlcmF0aW9uIGNvZGVzXG4gICAgLmZpbHRlcihmdW5jdGlvbihydWxlKSB7XG4gICAgICByZXR1cm4gcnVsZS5vcDtcbiAgICB9KTtcblxuICBmdW5jdGlvbiB0d2VhayhlbCkge1xuICAgIGlmICghIGVsLmNsYXNzTGlzdCkge1xuICAgICAgcmV0dXJuIGVsO1xuICAgIH1cblxuICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgcnVsZXMgYW5kIGFwcGx5IHRoZSBjaGFuZ2VzXG4gICAgcnVsZXMuZm9yRWFjaChmdW5jdGlvbihydWxlKSB7XG4gICAgICBlbC5jbGFzc0xpc3RbcnVsZS5vcF0ocnVsZS5jbHMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGVsO1xuICB9XG5cbiAgcmV0dXJuIGVsZW1lbnQgPyB0d2VhayhlbGVtZW50KSA6IHR3ZWFrO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIGRvY3VtZW50OiBmYWxzZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NTZWxlY3RvclJFID0gL15cXC4oW1xcd1xcLV0rKSQvO1xudmFyIGlkU2VsZWN0b3JSRSA9IC9eIyhbXFx3XFwtXSspJC87XG52YXIgdGFnU2VsZWN0b3JSRSA9IC9eW1xcd1xcLV0rJC87XG5cbi8qKlxuICAjIyMgcXNhKHNlbGVjdG9yLCBzY29wZT8pXG5cbiAgVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGdldCB0aGUgcmVzdWx0cyBvZiB0aGUgcXVlcnlTZWxlY3RvckFsbCBvdXRwdXRcbiAgaW4gdGhlIGZhc3Rlc3QgcG9zc2libGUgd2F5LiAgVGhpcyBjb2RlIGlzIHZlcnkgbXVjaCBiYXNlZCBvbiB0aGVcbiAgaW1wbGVtZW50YXRpb24gaW5cbiAgW3plcHRvXShodHRwczovL2dpdGh1Yi5jb20vbWFkcm9iYnkvemVwdG8vYmxvYi9tYXN0ZXIvc3JjL3plcHRvLmpzI0wxMDQpLFxuICBidXQgcGVyaGFwcyBub3QgcXVpdGUgYXMgdGVyc2UuXG5cbiAgPDw8IGV4YW1wbGVzL3FzYS5qc1xuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2VsZWN0b3IsIHNjb3BlKSB7XG4gIHZhciBpZFNlYXJjaDtcblxuICAvLyBkZWZhdWx0IHRoZSBlbGVtZW50IHRvIHRoZSBkb2N1bWVudFxuICBzY29wZSA9IHNjb3BlIHx8IGRvY3VtZW50O1xuXG4gIC8vIGRldGVybWluZSB3aGV0aGVyIHdlIGFyZSBkb2luZyBhbiBpZCBzZWFyY2ggb3Igbm90XG4gIGlkU2VhcmNoID0gc2NvcGUgPT09IGRvY3VtZW50ICYmIGlkU2VsZWN0b3JSRS50ZXN0KHNlbGVjdG9yKTtcblxuICAvLyBwZXJmb3JtIHRoZSBzZWFyY2hcbiAgcmV0dXJuIGlkU2VhcmNoID9cbiAgICAvLyB3ZSBhcmUgZG9pbmcgYW4gaWQgc2VhcmNoLCByZXR1cm4gdGhlIGVsZW1lbnQgc2VhcmNoIGluIGFuIGFycmF5XG4gICAgW3Njb3BlLmdldEVsZW1lbnRCeUlkKFJlZ0V4cC4kMSldIDpcbiAgICAvLyBub3QgYW4gaWQgc2VhcmNoLCBjYWxsIHRoZSBhcHByb3ByaWF0ZSBzZWxlY3RvclxuICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKFxuICAgICAgICBjbGFzc1NlbGVjdG9yUkUudGVzdChzZWxlY3RvcikgP1xuICAgICAgICAgIHNjb3BlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoUmVnRXhwLiQxKSA6XG4gICAgICAgICAgICB0YWdTZWxlY3RvclJFLnRlc3Qoc2VsZWN0b3IpID9cbiAgICAgICAgICAgICAgc2NvcGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoc2VsZWN0b3IpIDpcbiAgICAgICAgICAgICAgc2NvcGUucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcilcbiAgICApO1xufTsiLCJ2YXIgcnVuID0gcmVxdWlyZSgnLi9ydW4nKSxcbiAgICBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXIsXG4gICAgZm5SZWdleCA9IC9eZnVuY3Rpb24uKj9cXCgoLio/KVxcKS87XG5cbnZhciBkZWZlciA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicgPyBzZXRJbW1lZGlhdGUgOiBzZXRUaW1lb3V0O1xuXG5mdW5jdGlvbiBuZXdLZ28oKXtcbiAgICB2YXIgcmV0dXJubGVzc0lkID0gMCxcbiAgICAgICAgdGFza3MgPSB7fSxcbiAgICAgICAgcmVzdWx0cyA9IHt9LFxuICAgICAgICBlcnJvckhhbmRsZXJzID0ge30sXG4gICAgICAgIGluRmxpZ2h0LFxuICAgICAgICBkZWZhdWx0c0RlZmluZWQ7XG5cbiAgICBmdW5jdGlvbiBrZ29GbihuYW1lLCBkZXBlbmRlbmNpZXMsIGZuKXtcbiAgICAgICAgaWYoaW5GbGlnaHQpe1xuICAgICAgICAgICAgdGhyb3cgXCJObyB0YXNrcyBvciBkZWZhdWx0cyBtYXkgYmUgc2V0IGFmdGVyIGtnbyBpcyBpbiBmbGlnaHRcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiYgbmFtZSAhPT0gbnVsbCAmJiB0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpe1xuICAgICAgICAgICAgaWYoZGVmYXVsdHNEZWZpbmVkKXtcbiAgICAgICAgICAgICAgICB0aHJvdyBcIkRlZmF1bHRzIG1heSBiZSBkZWZpbmVkIG9ubHkgb25jZSBwZXIga2dvXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvcih2YXIga2V5IGluIG5hbWUpe1xuICAgICAgICAgICAgICAgIGlmKGtleSBpbiB0YXNrcyl7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwiQSB0YXNrIGlzIGFscmVhZHkgZGVmaW5lZCBmb3IgXCIgKyBrZXk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHNba2V5XSA9IG5hbWVba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHRzRGVmaW5lZCA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm4ga2dvRm47XG4gICAgICAgIH1cblxuICAgICAgICBpZih0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgZm4gPSBkZXBlbmRlbmNpZXM7XG4gICAgICAgICAgICBkZXBlbmRlbmNpZXMgPSBuYW1lO1xuICAgICAgICAgICAgbmFtZSA9IChyZXR1cm5sZXNzSWQrKykudG9TdHJpbmcoKSArICdfX3JldHVybmxlc3MnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodHlwZW9mIGRlcGVuZGVuY2llcyA9PT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgICAgICBmbiA9IGRlcGVuZGVuY2llcztcbiAgICAgICAgICAgIGRlcGVuZGVuY2llcyA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gZnVuY3Rpb24gcHJvdmlkZWQgZm9yIHRhc2sgbnVtYmVyICcgKyBPYmplY3Qua2V5cyh0YXNrcykubGVuZ3RoICsgJyAoJyArIG5hbWUgKyAnKScpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYobmFtZSBpbiByZXN1bHRzKXtcbiAgICAgICAgICAgIHRocm93IFwiQSBkZWZhdWx0IHdpdGggdGhlIHNhbWUgbmFtZSBhcyB0aGlzIHRhc2sgKFwiICsgbmFtZSArIFwiKSBoYXMgYWxyZWFkeSBiZWVuIHNldFwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdGFza3NbbmFtZV0gPSB7XG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgYXJnczogZGVwZW5kZW5jaWVzLFxuICAgICAgICAgICAgZm46IGZuXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGtnb0ZuO1xuICAgIH1cblxuICAgIGZvcih2YXIga2V5IGluIEV2ZW50RW1pdHRlci5wcm90b3R5cGUpe1xuICAgICAgICBrZ29GbltrZXldID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZVtrZXldO1xuICAgIH1cblxuICAgIGtnb0ZuLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG5cbiAgICBkZWZlcihmdW5jdGlvbigpe1xuICAgICAgICBpbkZsaWdodCA9IHRydWU7XG4gICAgICAgIHJ1bih0YXNrcywgcmVzdWx0cywga2dvRm4pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGtnb0ZuO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ld0tnbzsiLCJ2YXIgaWdub3JlRGVwZW5kZW5jeSA9IC9eXFwhLisvO1xuXG5mdW5jdGlvbiBTdGVwKHRhc2ssIGFyZ3MsIGRvbmUpe1xuICAgIHRoaXMuX3Rhc2sgPSB0YXNrO1xuICAgIHRoaXMuX2FyZ3MgPSBhcmdzO1xuICAgIHRoaXMuX2RvbmUgPSBkb25lO1xufVxuU3RlcC5wcm90b3R5cGUuX2NvdW50ID0gMTtcblN0ZXAucHJvdG90eXBlLl9ydW5zID0gMDtcblN0ZXAucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHN0ZXAgPSB0aGlzLFxuICAgICAgICByZXN1bHRzID0gW10sXG4gICAgICAgIGRpZEVycm9yO1xuXG4gICAgdGhpcy5fdGFzay5mbi5hcHBseSh0aGlzLCB0aGlzLl9hcmdzLmNvbmNhdChbZnVuY3Rpb24oZXJyb3IsIHJlc3VsdCl7XG4gICAgICAgIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgICAgICBzdGVwLl9ydW5zKys7XG4gICAgICAgIGlmKGVycm9yKXtcbiAgICAgICAgICAgIGRpZEVycm9yID0gdHJ1ZTtcbiAgICAgICAgICAgIHN0ZXAuZG9uZShlcnJvcik7XG4gICAgICAgIH1lbHNlIGlmKCFkaWRFcnJvciAmJiBzdGVwLl9ydW5zID09PSBzdGVwLl9jb3VudCl7XG4gICAgICAgICAgICBzdGVwLmRvbmUobnVsbCwgcmVzdWx0cyk7XG4gICAgICAgIH1cbiAgICB9XSkpO1xufTtcblN0ZXAucHJvdG90eXBlLmNvdW50ID0gZnVuY3Rpb24obnVtYmVyKXtcbiAgICB0aGlzLl9wYXJhbGxlbCA9IHRydWU7XG4gICAgdGhpcy5fY291bnQgPSBudW1iZXI7XG59O1xuU3RlcC5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uKGVycm9yLCByZXN1bHRzKXtcbiAgICBpZihlcnJvcil7XG4gICAgICAgIHJldHVybiB0aGlzLl9kb25lKGVycm9yKTtcbiAgICB9XG4gICAgdGhpcy5fZG9uZShudWxsLCB0aGlzLl9wYXJhbGxlbCA/IHJlc3VsdHMgOiByZXN1bHRzWzBdKTtcbn07XG5cbmZ1bmN0aW9uIHJ1blRhc2sodGFzaywgcmVzdWx0cywgYWJvdXRUb1J1biwgZG9uZSl7XG4gICAgdmFyIG5hbWUgPSB0YXNrLm5hbWUsXG4gICAgICAgIGRlcGVuZGFudHMgPSB0YXNrLmFyZ3MsXG4gICAgICAgIHRhc2tGdW5jdGlvbiA9IHRhc2suZm4sXG4gICAgICAgIGFyZ3MgPSBbXTtcblxuICAgIGlmKGRlcGVuZGFudHMpe1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgZGVwZW5kYW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGRlcGVuZGFudE5hbWUgPSBkZXBlbmRhbnRzW2ldLFxuICAgICAgICAgICAgICAgIGlnbm9yZSA9IGRlcGVuZGFudE5hbWUubWF0Y2goaWdub3JlRGVwZW5kZW5jeSk7XG5cbiAgICAgICAgICAgIGlmKGlnbm9yZSl7XG4gICAgICAgICAgICAgICAgZGVwZW5kYW50TmFtZSA9IGRlcGVuZGFudE5hbWUuc2xpY2UoMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKCEoZGVwZW5kYW50TmFtZSBpbiByZXN1bHRzKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZighaWdub3JlKXtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2gocmVzdWx0c1tkZXBlbmRhbnROYW1lXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgc3RlcCA9IG5ldyBTdGVwKHRhc2ssIGFyZ3MsIGZ1bmN0aW9uKGVycm9yLCByZXN1bHQpe1xuICAgICAgICBkb25lKG5hbWUsIGVycm9yLCByZXN1bHQpO1xuICAgIH0pO1xuXG4gICAgYWJvdXRUb1J1bihuYW1lKTtcbiAgICBzdGVwLnJ1bigpO1xufVxuXG5mdW5jdGlvbiBydW4odGFza3MsIHJlc3VsdHMsIGVtaXR0ZXIpe1xuICAgIHZhciBjdXJyZW50VGFzaztcblxuICAgIGZvcih2YXIga2V5IGluIHRhc2tzKXtcbiAgICAgICAgY3VycmVudFRhc2sgPSB0YXNrc1trZXldO1xuXG4gICAgICAgIHJ1blRhc2soXG4gICAgICAgICAgICBjdXJyZW50VGFzayxcbiAgICAgICAgICAgIHJlc3VsdHMsXG4gICAgICAgICAgICBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGFza3NbbmFtZV07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24obmFtZSwgZXJyb3IsIHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgaWYoZXJyb3Ipe1xuICAgICAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ2Vycm9yJywgZXJyb3IsIG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVzdWx0c1tuYW1lXSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICBydW4odGFza3MsIHJlc3VsdHMsIGVtaXR0ZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY2xvbmVBbmRSdW4odGFza3MsIHJlc3VsdHMsIGVtaXR0ZXIpe1xuICAgIHZhciB0b2RvID0ge307XG5cbiAgICBmb3IodmFyIGtleSBpbiB0YXNrcyl7XG4gICAgICAgIHRvZG9ba2V5XSA9IHRhc2tzW2tleV07XG4gICAgfVxuXG4gICAgcnVuKHRvZG8sIHJlc3VsdHMsIGVtaXR0ZXIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsb25lQW5kUnVuOyIsInZhciBwbHVnaW4gPSByZXF1aXJlKCdydGMtY29yZS9wbHVnaW4nKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5cbi8qKlxuICAjIHJ0Yy1hdHRhY2hcblxuICBSb3VnaGx5IGVxdWl2YWxlbnQgdG8gdGhlXG4gIFtgYXR0YWNoTWVkaWFTdHJlYW1gXShodHRwczovL3d3dy5ucG1qcy5vcmcvcGFja2FnZS9hdHRhY2htZWRpYXN0cmVhbSlcbiAgcGFja2FnZSBidXQgd2l0aCBzdXBwb3J0IGZvciBydGMuaW8gcGx1Z2lucy4gIEFsc28gdXNlcyBhbiBlcnJvciBmaXJzdFxuICBhc3luYyBBUEkgdG8gYWxsb3cgcGx1Z2lucyB0aW1lIHRvIGluaXRpYWxpemUuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlcy9zaW1wbGUuanNcblxuICAjIyBFeGFtcGxlIHVzaW5nIFBsdWdpbnNcblxuICA8PDwgZXhhbXBsZXMvcGx1Z2lucy5qc1xuXG4gICMjIFJlZmVyZW5jZVxuXG4gICMjIyBgYXR0YWNoKHN0cmVhbSwgb3B0cz8sIGNhbGxiYWNrKWBcblxuICBBdHRhY2ggYHN0cmVhbWAgdG8gYSBIVE1MIGVsZW1lbnQgdGhhdCB3aWxsIHJlbmRlciB0aGUgY29udGVudC4gVGhlIHByb3ZpZGVkXG4gIGBjYWxsYmFja2AgZm9sbG93cyB0aGUgZm9ybWF0IG9mIGBmbihlcnIsIGVsZW1lbnQpYC4gIFdoaWxlIHRoZSBhc3luYyBuYXR1cmVcbiAgb2YgdGhpcyBwYWNrYWdlIG1heSBzZWVtIG9kZCwgYmVjYXVzZSBhIHBsdWdpbiBtYXkgbmVlZCB0aW1lIHRvIGluaXRpYWxpemVcbiAgdGhpcyBjYXRlcnMgZm9yIHRoaXMgY2FzZSBpbiBhZGRpdGlvbiB0byBzdGFuZGFyZCB1c2FnZSBpbiB0aGUgYnJvd3Nlci5cblxuICAtIGBhdXRvcGxheWAgKGRlZmF1bHQ6IGB0cnVlYCkgLSBieSBkZWZhdWx0IGFmdGVyIHRoZSBzdHJlYW0gaGFzIGJlZW5cbiAgICBhdHRhY2hlZCB0byB0aGUgZWxlbWVudCBpdCB3aWxsIGJlIHBsYXllZC4gIFRoaXMgaXMgZG9uZSBieSBjYWxsaW5nXG4gICAgdGhlIGBwbGF5KClgIGZ1bmN0aW9uIG9uIHRoZSBlbGVtZW50IHJhdGhlciB0aGFuIHJlbHlpbmcgb24gYGF1dG9wbGF5YFxuICAgIGF0dHJpYnV0ZSBmdW5jdGlvbmFsaXR5LlxuXG4gIC0gYGVsYCAoZGVmYXVsdDogYG51bGxgKSAtIGlmIHlvdSB3aXRoIHRvIHN1cHBseSBhbiBlbGVtZW50IHRvIGJlIHVzZWRcbiAgICBpbnN0ZWFkIG9mIGNyZWF0aW5nIGEgbmV3IGVsZW1lbnQgdG8gcmVjZWl2ZSB0aGUgc3RyZWFtIHNwZWNpZnkgaXQgaGVyZS5cblxuICAtIGBtdXRlZGAgKGRlZmF1bHQ6IGBmYWxzZWApIC0gd2hldGhlciB0aGUgY3JlYXRlZCBlbGVtZW50IHNob3VsZCBiZSBtdXRlZFxuICAgIG9yIG5vdC4gIEZvciBsb2NhbCBzdHJlYW1zIHRoaXMgc2hvdWxkIGFsbW9zdCBhbHdheXMsIGJlIHRydWUgc28gY29uc2lkZXJcbiAgICB1c2luZyB0aGUgYGF0dGFjaC5sb2NhbGAgaGVscGVyIGZ1bmN0aW9uIGZvciBzaW1wbGUgY2FzZXMuXG5cbiAgLSBgcGx1Z2luc2AgKGRlZmF1bHQ6IGBbXWApIC0gc3BlY2lmeSBvbmUgb3IgbW9yZSBwbHVnaW5zIHRoYXQgY2FuIGJlIHVzZWRcbiAgICB0byByZW5kZXIgdGhlIG1lZGlhIHN0cmVhbSBhcHByb3ByaWF0ZSB0byB0aGUgY3VycmVudCBwbGF0Zm9ybSBpbiB0aGVcbiAgICBldmVudCB0aGF0IFdlYlJUQyBhbmQvb3IgbWVkaWEgY2FwdHVyZSBpcyBzdXBwb3J0ZWQgdmlhIGEgYnJvd3NlciBwbHVnaW4uXG5cbioqL1xudmFyIGF0dGFjaCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc3RyZWFtLCBvcHRzLCBjYWxsYmFjaykge1xuICB2YXIgVVJMID0gdHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuVVJMO1xuICB2YXIgZWw7XG4gIHZhciBwaW5zdDtcblxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBmdW5jdGlvbiBhdHRhY2hUb0VsZW1lbnQocywgbykge1xuICAgIHZhciBhdXRvcGxheSA9IChvIHx8IHt9KS5hdXRvcGxheTtcbiAgICB2YXIgZWxUeXBlID0gJ2F1ZGlvJztcbiAgICB2YXIgZWwgPSAobyB8fCB7fSkuZWw7XG5cbiAgICAvLyBjaGVjayB0aGUgc3RyZWFtIGlzIHZhbGlkXG4gICAgaXNWYWxpZCA9IHMgJiYgdHlwZW9mIHMuZ2V0VmlkZW9UcmFja3MgPT0gJ2Z1bmN0aW9uJztcblxuICAgIC8vIGRldGVybWluZSB0aGUgZWxlbWVudCB0eXBlXG4gICAgaWYgKGlzVmFsaWQgJiYgcy5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDApIHtcbiAgICAgIGVsVHlwZSA9ICd2aWRlbyc7XG4gICAgfVxuXG4gICAgLy8gcHJlcGFyZSB0aGUgZWxlbWVudFxuICAgIGVsID0gZWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbFR5cGUpO1xuXG4gICAgLy8gYXR0YWNoIHRoZSBzdHJlYW1cbiAgICBpZiAoVVJMICYmIFVSTC5jcmVhdGVPYmplY3RVUkwpIHtcbiAgICAgIGVsLnNyYyA9IFVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZWwuc3JjT2JqZWN0KSB7XG4gICAgICBlbC5zcmNPYmplY3QgPSBzdHJlYW07XG4gICAgfVxuICAgIGVsc2UgaWYgKGVsLm1velNyY09iamVjdCkge1xuICAgICAgZWwubW96U3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgIH1cblxuICAgIGlmICgobyB8fCB7fSkubXV0ZWQpIHtcbiAgICAgIGVsLm11dGVkID0gdHJ1ZTtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgnbXV0ZWQnLCAnJyk7XG4gICAgfVxuXG4gICAgaWYgKGF1dG9wbGF5ID09PSB1bmRlZmluZWQgfHwgYXV0b3BsYXkpIHtcbiAgICAgIGVsLnBsYXkoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWw7XG4gIH1cblxuICAvLyBzZWUgaWYgd2UgYXJlIHVzaW5nIGEgcGx1Z2luXG4gIHBpbnN0ID0gcGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcbiAgaWYgKHBpbnN0KSB7XG4gICAgcmV0dXJuIHBpbnN0LmluaXQob3B0cywgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHBpbnN0LmF0dGFjaCAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ3BsdWdpbiBtdXN0IHN1cHBvcnQgdGhlIGF0dGFjaCBmdW5jdGlvbicpKTtcbiAgICAgIH1cblxuICAgICAgY2FsbGJhY2sobnVsbCwgcGluc3QuYXR0YWNoKHN0cmVhbSwgb3B0cykpO1xuICAgIH0pO1xuICB9XG5cbiAgY2FsbGJhY2sobnVsbCwgYXR0YWNoVG9FbGVtZW50KHN0cmVhbSwgb3B0cykpO1xufTtcblxuLyoqXG4gICMjIyBgYXR0YWNoLmxvY2FsKHN0cmVhbSwgb3B0cz8sIGNhbGxiYWNrKWBcblxuICBBdHRhY2ggYSBsb2NhbCBzdHJlYW0gd2l0aCBvcHRpb25zIGFwcHJvcHJpYXRlIGZvciBsb2NhbCBzdHJlYW1zOlxuXG4gIC0gYG11dGVkYDogYHRydWVgXG5cbioqL1xuYXR0YWNoLmxvY2FsID0gZnVuY3Rpb24oc3RyZWFtLCBvcHRzLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBhdHRhY2goc3RyZWFtLCBleHRlbmQoeyBtdXRlZDogdHJ1ZSB9LCBvcHRzKSwgY2FsbGJhY2spO1xufTtcbiIsInZhciBwbHVnaW4gPSByZXF1aXJlKCdydGMtY29yZS9wbHVnaW4nKTtcbnZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTtcblxuLy8gcGF0Y2ggbmF2aWdhdG9yIGdldFVzZXJNZWRpYVxubmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcbiAgZGV0ZWN0LmNhbGwobmF2aWdhdG9yLCAnZ2V0VXNlck1lZGlhJyk7XG5cbi8qKlxuICAjIHJ0Yy1jYXB0dXJlXG5cbiAgUm91Z2hseSBlcXVpdmFsZW50IHRvIHRoZVxuICBbYGdldFVzZXJNZWRpYWBdKGh0dHBzOi8vd3d3Lm5wbWpzLm9yZy9wYWNrYWdlL2dldHVzZXJtZWRpYSkgcGFja2FnZSBidXQgd2l0aFxuICBzdXBwb3J0IGZvciBydGMuaW8gcGx1Z2lucy5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgPDw8IGV4YW1wbGVzL3NpbXBsZS5qc1xuXG4gICMjIEV4YW1wbGUgd2l0aCB1c2luZyBQbHVnaW5zXG5cbiAgPDw8IGV4YW1wbGVzL3BsdWdpbnMuanNcblxuICAjIyBSZWZlcmVuY2VcblxuICAjIyMgYGNhcHR1cmUoY29uc3RyYWludHMsIG9wdHM/LCBjYWxsYmFjaylgXG5cbiAgQ2FwdHVyZSBtZWRpYSB3aXRoIHRoZSBzdXBwbGllZCBgY29uc3RyYWludHNgLiAgSWYgYW4gYG9wdHNgIGFyZ3VtZW50IGlzXG4gIHN1cHBsaWVkIGxvb2sgZm9yIHBsdWdpbnMgdGhhdCBtYXkgY2hhbmdlIHRoZSBiZWhhdmlvdXIgb2YgdGhlIGNhcHR1cmVcbiAgb3BlcmF0aW9uLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29uc3RyYWludHMsIG9wdHMsIGNhbGxiYWNrKSB7XG4gIHZhciBwaW5zdDtcblxuICBmdW5jdGlvbiBoYW5kbGVDYXB0dXJlKHN0cmVhbSkge1xuICAgIGNhbGxiYWNrKG51bGwsIHN0cmVhbSk7XG4gIH1cblxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICAvLyBzZWUgaWYgd2UgYXJlIHVzaW5nIGEgcGx1Z2luXG4gIHBpbnN0ID0gcGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcbiAgaWYgKHBpbnN0KSB7XG4gICAgcmV0dXJuIHBpbnN0LmluaXQob3B0cywgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdwbHVnaW4gZG9lcyBub3Qgc3VwcG9ydCBtZWRpYSBjYXB0dXJlJykpO1xuICAgICAgfVxuXG4gICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzLCBoYW5kbGVDYXB0dXJlLCBjYWxsYmFjayk7XG4gICAgfSk7XG4gIH1cblxuICBpZiAodHlwZW9mIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ2dldFVzZXJNZWRpYSBub3Qgc3VwcG9ydGVkJykpO1xuICB9XG5cbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShjb25zdHJhaW50cywgaGFuZGxlQ2FwdHVyZSwgY2FsbGJhY2spO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgd2luZG93OiBmYWxzZSAqL1xuLyogZ2xvYmFsIG5hdmlnYXRvcjogZmFsc2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYnJvd3NlciA9IHJlcXVpcmUoJ2RldGVjdC1icm93c2VyJyk7XG5cbi8qKlxuICAjIyMgYHJ0Yy1jb3JlL2RldGVjdGBcblxuICBBIGJyb3dzZXIgZGV0ZWN0aW9uIGhlbHBlciBmb3IgYWNjZXNzaW5nIHByZWZpeC1mcmVlIHZlcnNpb25zIG9mIHRoZSB2YXJpb3VzXG4gIFdlYlJUQyB0eXBlcy5cblxuICAjIyMgRXhhbXBsZSBVc2FnZVxuXG4gIElmIHlvdSB3YW50ZWQgdG8gZ2V0IHRoZSBuYXRpdmUgYFJUQ1BlZXJDb25uZWN0aW9uYCBwcm90b3R5cGUgaW4gYW55IGJyb3dzZXJcbiAgeW91IGNvdWxkIGRvIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBganNcbiAgdmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpOyAvLyBhbHNvIGF2YWlsYWJsZSBpbiBydGMvZGV0ZWN0XG4gIHZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcbiAgYGBgXG5cbiAgVGhpcyB3b3VsZCBwcm92aWRlIHdoYXRldmVyIHRoZSBicm93c2VyIHByZWZpeGVkIHZlcnNpb24gb2YgdGhlXG4gIFJUQ1BlZXJDb25uZWN0aW9uIGlzIGF2YWlsYWJsZSAoYHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uYCxcbiAgYG1velJUQ1BlZXJDb25uZWN0aW9uYCwgZXRjKS5cbioqL1xudmFyIGRldGVjdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0LCBwcmVmaXhlcykge1xuICB2YXIgcHJlZml4SWR4O1xuICB2YXIgcHJlZml4O1xuICB2YXIgdGVzdE5hbWU7XG4gIHZhciBob3N0T2JqZWN0ID0gdGhpcyB8fCAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZCk7XG5cbiAgLy8gaWYgd2UgaGF2ZSBubyBob3N0IG9iamVjdCwgdGhlbiBhYm9ydFxuICBpZiAoISBob3N0T2JqZWN0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gaW5pdGlhbGlzZSB0byBkZWZhdWx0IHByZWZpeGVzXG4gIC8vIChyZXZlcnNlIG9yZGVyIGFzIHdlIHVzZSBhIGRlY3JlbWVudGluZyBmb3IgbG9vcClcbiAgcHJlZml4ZXMgPSAocHJlZml4ZXMgfHwgWydtcycsICdvJywgJ21veicsICd3ZWJraXQnXSkuY29uY2F0KCcnKTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHByZWZpeGVzIGFuZCByZXR1cm4gdGhlIGNsYXNzIGlmIGZvdW5kIGluIGdsb2JhbFxuICBmb3IgKHByZWZpeElkeCA9IHByZWZpeGVzLmxlbmd0aDsgcHJlZml4SWR4LS07ICkge1xuICAgIHByZWZpeCA9IHByZWZpeGVzW3ByZWZpeElkeF07XG5cbiAgICAvLyBjb25zdHJ1Y3QgdGhlIHRlc3QgY2xhc3MgbmFtZVxuICAgIC8vIGlmIHdlIGhhdmUgYSBwcmVmaXggZW5zdXJlIHRoZSB0YXJnZXQgaGFzIGFuIHVwcGVyY2FzZSBmaXJzdCBjaGFyYWN0ZXJcbiAgICAvLyBzdWNoIHRoYXQgYSB0ZXN0IGZvciBnZXRVc2VyTWVkaWEgd291bGQgcmVzdWx0IGluIGFcbiAgICAvLyBzZWFyY2ggZm9yIHdlYmtpdEdldFVzZXJNZWRpYVxuICAgIHRlc3ROYW1lID0gcHJlZml4ICsgKHByZWZpeCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdGFyZ2V0LnNsaWNlKDEpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQpO1xuXG4gICAgaWYgKHR5cGVvZiBob3N0T2JqZWN0W3Rlc3ROYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgLy8gdXBkYXRlIHRoZSBsYXN0IHVzZWQgcHJlZml4XG4gICAgICBkZXRlY3QuYnJvd3NlciA9IGRldGVjdC5icm93c2VyIHx8IHByZWZpeC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAvLyByZXR1cm4gdGhlIGhvc3Qgb2JqZWN0IG1lbWJlclxuICAgICAgcmV0dXJuIGhvc3RPYmplY3RbdGFyZ2V0XSA9IGhvc3RPYmplY3RbdGVzdE5hbWVdO1xuICAgIH1cbiAgfVxufTtcblxuLy8gZGV0ZWN0IG1vemlsbGEgKHllcywgdGhpcyBmZWVscyBkaXJ0eSlcbmRldGVjdC5tb3ogPSB0eXBlb2YgbmF2aWdhdG9yICE9ICd1bmRlZmluZWQnICYmICEhbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYTtcblxuLy8gc2V0IHRoZSBicm93c2VyIGFuZCBicm93c2VyIHZlcnNpb25cbmRldGVjdC5icm93c2VyID0gYnJvd3Nlci5uYW1lO1xuZGV0ZWN0LmJyb3dzZXJWZXJzaW9uID0gZGV0ZWN0LnZlcnNpb24gPSBicm93c2VyLnZlcnNpb247XG4iLCJ2YXIgYnJvd3NlcnMgPSBbXG4gIFsgJ2Nocm9tZScsIC9DaHJvbSg/OmV8aXVtKVxcLyhbMC05XFwuXSspKDo/XFxzfCQpLyBdLFxuICBbICdmaXJlZm94JywgL0ZpcmVmb3hcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnb3BlcmEnLCAvT3BlcmFcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnaWUnLCAvVHJpZGVudFxcLzdcXC4wLipydlxcOihbMC05XFwuXSspXFwpLipHZWNrbyQvIF0sXG4gIFsgJ2llJywgL01TSUVcXHMoWzAtOVxcLl0rKTsuKlRyaWRlbnRcXC9bNC02XS4wLyBdLFxuICBbICdpZScsIC9NU0lFXFxzKDdcXC4wKS8gXSxcbiAgWyAnYmIxMCcsIC9CQjEwO1xcc1RvdWNoLipWZXJzaW9uXFwvKFswLTlcXC5dKykvIF0sXG4gIFsgJ2FuZHJvaWQnLCAvQW5kcm9pZFxccyhbMC05XFwuXSspLyBdLFxuICBbICdpb3MnLCAvaVBhZFxcO1xcc0NQVVxcc09TXFxzKFswLTlcXC5fXSspLyBdLFxuICBbICdpb3MnLCAgL2lQaG9uZVxcO1xcc0NQVVxcc2lQaG9uZVxcc09TXFxzKFswLTlcXC5fXSspLyBdLFxuICBbICdzYWZhcmknLCAvU2FmYXJpXFwvKFswLTlcXC5fXSspLyBdXG5dO1xuXG52YXIgbWF0Y2ggPSBicm93c2Vycy5tYXAobWF0Y2gpLmZpbHRlcihpc01hdGNoKVswXTtcbnZhciBwYXJ0cyA9IG1hdGNoICYmIG1hdGNoWzNdLnNwbGl0KC9bLl9dLykuc2xpY2UoMCwzKTtcblxud2hpbGUgKHBhcnRzICYmIHBhcnRzLmxlbmd0aCA8IDMpIHtcbiAgcGFydHMucHVzaCgnMCcpO1xufVxuXG4vLyBzZXQgdGhlIG5hbWUgYW5kIHZlcnNpb25cbmV4cG9ydHMubmFtZSA9IG1hdGNoICYmIG1hdGNoWzBdO1xuZXhwb3J0cy52ZXJzaW9uID0gcGFydHMgJiYgcGFydHMuam9pbignLicpO1xuXG5mdW5jdGlvbiBtYXRjaChwYWlyKSB7XG4gIHJldHVybiBwYWlyLmNvbmNhdChwYWlyWzFdLmV4ZWMobmF2aWdhdG9yLnVzZXJBZ2VudCkpO1xufVxuXG5mdW5jdGlvbiBpc01hdGNoKHBhaXIpIHtcbiAgcmV0dXJuICEhcGFpclsyXTtcbn1cbiIsInZhciBkZXRlY3QgPSByZXF1aXJlKCcuL2RldGVjdCcpO1xudmFyIHJlcXVpcmVkRnVuY3Rpb25zID0gW1xuICAnaW5pdCdcbl07XG5cbmZ1bmN0aW9uIGlzU3VwcG9ydGVkKHBsdWdpbikge1xuICByZXR1cm4gcGx1Z2luICYmIHR5cGVvZiBwbHVnaW4uc3VwcG9ydGVkID09ICdmdW5jdGlvbicgJiYgcGx1Z2luLnN1cHBvcnRlZChkZXRlY3QpO1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkKHBsdWdpbikge1xuICB2YXIgc3VwcG9ydGVkRnVuY3Rpb25zID0gcmVxdWlyZWRGdW5jdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBwbHVnaW5bZm5dID09ICdmdW5jdGlvbic7XG4gIH0pO1xuXG4gIHJldHVybiBzdXBwb3J0ZWRGdW5jdGlvbnMubGVuZ3RoID09PSByZXF1aXJlZEZ1bmN0aW9ucy5sZW5ndGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGx1Z2lucykge1xuICByZXR1cm4gW10uY29uY2F0KHBsdWdpbnMgfHwgW10pLmZpbHRlcihpc1N1cHBvcnRlZCkuZmlsdGVyKGlzVmFsaWQpWzBdO1xufVxuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBydGMgPSByZXF1aXJlKCdydGMtdG9vbHMnKTtcbnZhciBtYnVzID0gcmVxdWlyZSgnbWJ1cycpO1xudmFyIGNsZWFudXAgPSByZXF1aXJlKCdydGMtdG9vbHMvY2xlYW51cCcpO1xudmFyIGRlYnVnID0gcnRjLmxvZ2dlcigncnRjLXF1aWNrY29ubmVjdCcpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnY29nL2RlZmF1bHRzJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xudmFyIGdldGFibGUgPSByZXF1aXJlKCdjb2cvZ2V0YWJsZScpO1xudmFyIHJlVHJhaWxpbmdTbGFzaCA9IC9cXC8kLztcblxuLyoqXG4gICMgcnRjLXF1aWNrY29ubmVjdFxuXG4gIFRoaXMgaXMgYSBoaWdoIGxldmVsIGhlbHBlciBtb2R1bGUgZGVzaWduZWQgdG8gaGVscCB5b3UgZ2V0IHVwXG4gIGFuIHJ1bm5pbmcgd2l0aCBXZWJSVEMgcmVhbGx5LCByZWFsbHkgcXVpY2tseS4gIEJ5IHVzaW5nIHRoaXMgbW9kdWxlIHlvdVxuICBhcmUgdHJhZGluZyBvZmYgc29tZSBmbGV4aWJpbGl0eSwgc28gaWYgeW91IG5lZWQgYSBtb3JlIGZsZXhpYmxlXG4gIGNvbmZpZ3VyYXRpb24geW91IHNob3VsZCBkcmlsbCBkb3duIGludG8gbG93ZXIgbGV2ZWwgY29tcG9uZW50cyBvZiB0aGVcbiAgW3J0Yy5pb10oaHR0cDovL3d3dy5ydGMuaW8pIHN1aXRlLiAgSW4gcGFydGljdWxhciB5b3Ugc2hvdWxkIGNoZWNrIG91dFxuICBbcnRjXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0YykuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIEluIHRoZSBzaW1wbGVzdCBjYXNlIHlvdSBzaW1wbHkgY2FsbCBxdWlja2Nvbm5lY3Qgd2l0aCBhIHNpbmdsZSBzdHJpbmdcbiAgYXJndW1lbnQgd2hpY2ggdGVsbHMgcXVpY2tjb25uZWN0IHdoaWNoIHNlcnZlciB0byB1c2UgZm9yIHNpZ25hbGluZzpcblxuICA8PDwgZXhhbXBsZXMvc2ltcGxlLmpzXG5cbiAgPDw8IGRvY3MvZXZlbnRzLm1kXG5cbiAgPDw8IGRvY3MvZXhhbXBsZXMubWRcblxuICAjIyBSZWdhcmRpbmcgU2lnbmFsbGluZyBhbmQgYSBTaWduYWxsaW5nIFNlcnZlclxuXG4gIFNpZ25hbGluZyBpcyBhbiBpbXBvcnRhbnQgcGFydCBvZiBzZXR0aW5nIHVwIGEgV2ViUlRDIGNvbm5lY3Rpb24gYW5kIGZvclxuICBvdXIgZXhhbXBsZXMgd2UgdXNlIG91ciBvd24gdGVzdCBpbnN0YW5jZSBvZiB0aGVcbiAgW3J0Yy1zd2l0Y2hib2FyZF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc3dpdGNoYm9hcmQpLiBGb3IgeW91clxuICB0ZXN0aW5nIGFuZCBkZXZlbG9wbWVudCB5b3UgYXJlIG1vcmUgdGhhbiB3ZWxjb21lIHRvIHVzZSB0aGlzIGFsc28sIGJ1dFxuICBqdXN0IGJlIGF3YXJlIHRoYXQgd2UgdXNlIHRoaXMgZm9yIG91ciB0ZXN0aW5nIHNvIGl0IG1heSBnbyB1cCBhbmQgZG93blxuICBhIGxpdHRsZS4gIElmIHlvdSBuZWVkIHNvbWV0aGluZyBtb3JlIHN0YWJsZSwgd2h5IG5vdCBjb25zaWRlciBkZXBsb3lpbmdcbiAgYW4gaW5zdGFuY2Ugb2YgdGhlIHN3aXRjaGJvYXJkIHlvdXJzZWxmIC0gaXQncyBwcmV0dHkgZWFzeSA6KVxuXG4gICMjIFJlZmVyZW5jZVxuXG4gIGBgYFxuICBxdWlja2Nvbm5lY3Qoc2lnbmFsaG9zdCwgb3B0cz8pID0+IHJ0Yy1zaWdhbGxlciBpbnN0YW5jZSAoKyBoZWxwZXJzKVxuICBgYGBcblxuICAjIyMgVmFsaWQgUXVpY2sgQ29ubmVjdCBPcHRpb25zXG5cbiAgVGhlIG9wdGlvbnMgcHJvdmlkZWQgdG8gdGhlIGBydGMtcXVpY2tjb25uZWN0YCBtb2R1bGUgZnVuY3Rpb24gaW5mbHVlbmNlIHRoZVxuICBiZWhhdmlvdXIgb2Ygc29tZSBvZiB0aGUgdW5kZXJseWluZyBjb21wb25lbnRzIHVzZWQgZnJvbSB0aGUgcnRjLmlvIHN1aXRlLlxuXG4gIExpc3RlZCBiZWxvdyBhcmUgc29tZSBvZiB0aGUgY29tbW9ubHkgdXNlZCBvcHRpb25zOlxuXG4gIC0gYG5zYCAoZGVmYXVsdDogJycpXG5cbiAgICBBbiBvcHRpb25hbCBuYW1lc3BhY2UgZm9yIHlvdXIgc2lnbmFsbGluZyByb29tLiAgV2hpbGUgcXVpY2tjb25uZWN0XG4gICAgd2lsbCBnZW5lcmF0ZSBhIHVuaXF1ZSBoYXNoIGZvciB0aGUgcm9vbSwgdGhpcyBjYW4gYmUgbWFkZSB0byBiZSBtb3JlXG4gICAgdW5pcXVlIGJ5IHByb3ZpZGluZyBhIG5hbWVzcGFjZS4gIFVzaW5nIGEgbmFtZXNwYWNlIG1lYW5zIHR3byBkZW1vc1xuICAgIHRoYXQgaGF2ZSBnZW5lcmF0ZWQgdGhlIHNhbWUgaGFzaCBidXQgdXNlIGEgZGlmZmVyZW50IG5hbWVzcGFjZSB3aWxsIGJlXG4gICAgaW4gZGlmZmVyZW50IHJvb21zLlxuXG4gIC0gYHJvb21gIChkZWZhdWx0OiBudWxsKSBfYWRkZWQgMC42X1xuXG4gICAgUmF0aGVyIHRoYW4gdXNlIHRoZSBpbnRlcm5hbCBoYXNoIGdlbmVyYXRpb25cbiAgICAocGx1cyBvcHRpb25hbCBuYW1lc3BhY2UpIGZvciByb29tIG5hbWUgZ2VuZXJhdGlvbiwgc2ltcGx5IHVzZSB0aGlzIHJvb21cbiAgICBuYW1lIGluc3RlYWQuICBfX05PVEU6X18gVXNlIG9mIHRoZSBgcm9vbWAgb3B0aW9uIHRha2VzIHByZWNlbmRlbmNlIG92ZXJcbiAgICBgbnNgLlxuXG4gIC0gYGRlYnVnYCAoZGVmYXVsdDogZmFsc2UpXG5cbiAgV3JpdGUgcnRjLmlvIHN1aXRlIGRlYnVnIG91dHB1dCB0byB0aGUgYnJvd3NlciBjb25zb2xlLlxuXG4gIC0gYGV4cGVjdGVkTG9jYWxTdHJlYW1zYCAoZGVmYXVsdDogbm90IHNwZWNpZmllZCkgX2FkZGVkIDMuMF9cblxuICAgIEJ5IHByb3ZpZGluZyBhIHBvc2l0aXZlIGludGVnZXIgdmFsdWUgZm9yIHRoaXMgb3B0aW9uIHdpbGwgbWVhbiB0aGF0XG4gICAgdGhlIGNyZWF0ZWQgcXVpY2tjb25uZWN0IGluc3RhbmNlIHdpbGwgd2FpdCB1bnRpbCB0aGUgc3BlY2lmaWVkIG51bWJlciBvZlxuICAgIHN0cmVhbXMgaGF2ZSBiZWVuIGFkZGVkIHRvIHRoZSBxdWlja2Nvbm5lY3QgXCJ0ZW1wbGF0ZVwiIGJlZm9yZSBhbm5vdW5jaW5nXG4gICAgdG8gdGhlIHNpZ25hbGluZyBzZXJ2ZXIuXG5cbiAgLSBgbWFudWFsSm9pbmAgKGRlZmF1bHQ6IGBmYWxzZWApXG5cbiAgICBTZXQgdGhpcyB2YWx1ZSB0byBgdHJ1ZWAgaWYgeW91IHdvdWxkIHByZWZlciB0byBjYWxsIHRoZSBgam9pbmAgZnVuY3Rpb25cbiAgICB0byBjb25uZWN0aW5nIHRvIHRoZSBzaWduYWxsaW5nIHNlcnZlciwgcmF0aGVyIHRoYW4gaGF2aW5nIHRoYXQgaGFwcGVuXG4gICAgYXV0b21hdGljYWxseSBhcyBzb29uIGFzIHF1aWNrY29ubmVjdCBpcyByZWFkeSB0by5cblxuICAjIyMjIE9wdGlvbnMgZm9yIFBlZXIgQ29ubmVjdGlvbiBDcmVhdGlvblxuXG4gIE9wdGlvbnMgdGhhdCBhcmUgcGFzc2VkIG9udG8gdGhlXG4gIFtydGMuY3JlYXRlQ29ubmVjdGlvbl0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMjY3JlYXRlY29ubmVjdGlvbm9wdHMtY29uc3RyYWludHMpXG4gIGZ1bmN0aW9uOlxuXG4gIC0gYGljZVNlcnZlcnNgXG5cbiAgVGhpcyBwcm92aWRlcyBhIGxpc3Qgb2YgaWNlIHNlcnZlcnMgdGhhdCBjYW4gYmUgdXNlZCB0byBoZWxwIG5lZ290aWF0ZSBhXG4gIGNvbm5lY3Rpb24gYmV0d2VlbiBwZWVycy5cblxuICAjIyMjIE9wdGlvbnMgZm9yIFAyUCBuZWdvdGlhdGlvblxuXG4gIFVuZGVyIHRoZSBob29kLCBxdWlja2Nvbm5lY3QgdXNlcyB0aGVcbiAgW3J0Yy9jb3VwbGVdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjI3J0Y2NvdXBsZSkgbG9naWMsIGFuZCB0aGUgb3B0aW9uc1xuICBwYXNzZWQgdG8gcXVpY2tjb25uZWN0IGFyZSBhbHNvIHBhc3NlZCBvbnRvIHRoaXMgZnVuY3Rpb24uXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxob3N0LCBvcHRzKSB7XG4gIHZhciBoYXNoID0gdHlwZW9mIGxvY2F0aW9uICE9ICd1bmRlZmluZWQnICYmIGxvY2F0aW9uLmhhc2guc2xpY2UoMSk7XG4gIHZhciBzaWduYWxsZXIgPSByZXF1aXJlKCdydGMtc2lnbmFsbGVyJykoc2lnbmFsaG9zdCwgb3B0cyk7XG5cbiAgLy8gaW5pdCBjb25maWd1cmFibGUgdmFyc1xuICB2YXIgbnMgPSAob3B0cyB8fCB7fSkubnMgfHwgJyc7XG4gIHZhciByb29tID0gKG9wdHMgfHwge30pLnJvb207XG4gIHZhciBkZWJ1Z2dpbmcgPSAob3B0cyB8fCB7fSkuZGVidWc7XG4gIHZhciBhbGxvd0pvaW4gPSAhKG9wdHMgfHwge30pLm1hbnVhbEpvaW47XG4gIHZhciBwcm9maWxlID0ge307XG4gIHZhciBhbm5vdW5jZWQgPSBmYWxzZTtcblxuICAvLyBjb2xsZWN0IHRoZSBsb2NhbCBzdHJlYW1zXG4gIHZhciBsb2NhbFN0cmVhbXMgPSBbXTtcblxuICAvLyBjcmVhdGUgdGhlIGNhbGxzIG1hcFxuICB2YXIgY2FsbHMgPSBzaWduYWxsZXIuY2FsbHMgPSBnZXRhYmxlKHt9KTtcblxuICAvLyBjcmVhdGUgdGhlIGtub3duIGRhdGEgY2hhbm5lbHMgcmVnaXN0cnlcbiAgdmFyIGNoYW5uZWxzID0ge307XG5cbiAgLy8gc2F2ZSB0aGUgcGx1Z2lucyBwYXNzZWQgdG8gdGhlIHNpZ25hbGxlclxuICB2YXIgcGx1Z2lucyA9IHNpZ25hbGxlci5wbHVnaW5zID0gKG9wdHMgfHwge30pLnBsdWdpbnMgfHwgW107XG5cbiAgLy8gY2hlY2sgaG93IG1hbnkgbG9jYWwgc3RyZWFtcyBoYXZlIGJlZW4gZXhwZWN0ZWQgKGRlZmF1bHQ6IDApXG4gIHZhciBleHBlY3RlZExvY2FsU3RyZWFtcyA9IHBhcnNlSW50KChvcHRzIHx8IHt9KS5leHBlY3RlZExvY2FsU3RyZWFtcywgMTApIHx8IDA7XG4gIHZhciBhbm5vdW5jZVRpbWVyID0gMDtcblxuICBmdW5jdGlvbiBjYWxsQ3JlYXRlKGlkLCBwYywgZGF0YSkge1xuICAgIGNhbGxzLnNldChpZCwge1xuICAgICAgYWN0aXZlOiBmYWxzZSxcbiAgICAgIHBjOiBwYyxcbiAgICAgIGNoYW5uZWxzOiBnZXRhYmxlKHt9KSxcbiAgICAgIGRhdGE6IGRhdGEsXG4gICAgICBzdHJlYW1zOiBbXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2FsbEVuZChpZCkge1xuICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KGlkKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgbm8gZGF0YSwgdGhlbiBkbyBub3RoaW5nXG4gICAgaWYgKCEgY2FsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGRlYnVnKCdlbmRpbmcgY2FsbCB0bzogJyArIGlkKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgbm8gZGF0YSwgdGhlbiByZXR1cm5cbiAgICBjYWxsLmNoYW5uZWxzLmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGxhYmVsKSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IGNhbGwuY2hhbm5lbHMuZ2V0KGxhYmVsKTtcbiAgICAgIHZhciBhcmdzID0gW2lkLCBjaGFubmVsLCBsYWJlbF07XG5cbiAgICAgIC8vIGVtaXQgdGhlIHBsYWluIGNoYW5uZWw6Y2xvc2VkIGV2ZW50XG4gICAgICBzaWduYWxsZXIuYXBwbHkoc2lnbmFsbGVyLCBbJ2NoYW5uZWw6Y2xvc2VkJ10uY29uY2F0KGFyZ3MpKTtcblxuICAgICAgLy8gZW1pdCB0aGUgbGFiZWxsZWQgdmVyc2lvbiBvZiB0aGUgZXZlbnRcbiAgICAgIHNpZ25hbGxlci5hcHBseShzaWduYWxsZXIsIFsnY2hhbm5lbDpjbG9zZWQ6JyArIGxhYmVsXS5jb25jYXQoYXJncykpO1xuXG4gICAgICAvLyBkZWNvdXBsZSB0aGUgZXZlbnRzXG4gICAgICBjaGFubmVsLm9ub3BlbiA9IG51bGw7XG4gICAgfSk7XG5cbiAgICAvLyB0cmlnZ2VyIHN0cmVhbTpyZW1vdmVkIGV2ZW50cyBmb3IgZWFjaCBvZiB0aGUgcmVtb3Rlc3RyZWFtcyBpbiB0aGUgcGNcbiAgICBjYWxsLnN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHNpZ25hbGxlcignc3RyZWFtOnJlbW92ZWQnLCBpZCwgc3RyZWFtKTtcbiAgICB9KTtcblxuICAgIC8vIGRlbGV0ZSB0aGUgY2FsbCBkYXRhXG4gICAgY2FsbHMuZGVsZXRlKGlkKTtcblxuICAgIC8vIHRyaWdnZXIgdGhlIGNhbGw6ZW5kZWQgZXZlbnRcbiAgICBzaWduYWxsZXIoJ2NhbGw6ZW5kZWQnLCBpZCwgY2FsbC5wYyk7XG5cbiAgICAvLyBlbnN1cmUgdGhlIHBlZXIgY29ubmVjdGlvbiBpcyBwcm9wZXJseSBjbGVhbmVkIHVwXG4gICAgY2xlYW51cChjYWxsLnBjKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbGxTdGFydChpZCwgcGMsIGRhdGEpIHtcbiAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChpZCk7XG4gICAgdmFyIHN0cmVhbXMgPSBbXS5jb25jYXQocGMuZ2V0UmVtb3RlU3RyZWFtcygpKTtcblxuICAgIC8vIGZsYWcgdGhlIGNhbGwgYXMgYWN0aXZlXG4gICAgY2FsbC5hY3RpdmUgPSB0cnVlO1xuICAgIGNhbGwuc3RyZWFtcyA9IFtdLmNvbmNhdChwYy5nZXRSZW1vdGVTdHJlYW1zKCkpO1xuXG4gICAgcGMub25hZGRzdHJlYW0gPSBjcmVhdGVTdHJlYW1BZGRIYW5kbGVyKGlkKTtcbiAgICBwYy5vbnJlbW92ZXN0cmVhbSA9IGNyZWF0ZVN0cmVhbVJlbW92ZUhhbmRsZXIoaWQpO1xuXG4gICAgZGVidWcoc2lnbmFsbGVyLmlkICsgJyAtICcgKyBpZCArICcgY2FsbCBzdGFydDogJyArIHN0cmVhbXMubGVuZ3RoICsgJyBzdHJlYW1zJyk7XG4gICAgc2lnbmFsbGVyKCdjYWxsOnN0YXJ0ZWQnLCBpZCwgcGMsIGRhdGEpO1xuXG4gICAgLy8gZXhhbWluZSB0aGUgZXhpc3RpbmcgcmVtb3RlIHN0cmVhbXMgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAvLyBpdGVyYXRlIHRocm91Z2ggYW55IHJlbW90ZSBzdHJlYW1zXG4gICAgICBzdHJlYW1zLmZvckVhY2gocmVjZWl2ZVJlbW90ZVN0cmVhbShpZCkpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2tSZWFkeVRvQW5ub3VuY2UoKSB7XG4gICAgY2xlYXJUaW1lb3V0KGFubm91bmNlVGltZXIpO1xuICAgIGlmICghIGFsbG93Sm9pbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIGFyZSB3YWl0aW5nIGZvciBhIHNldCBudW1iZXIgb2Ygc3RyZWFtcywgdGhlbiB3YWl0IHVudGlsIHdlIGhhdmVcbiAgICAvLyB0aGUgcmVxdWlyZWQgbnVtYmVyXG4gICAgaWYgKGV4cGVjdGVkTG9jYWxTdHJlYW1zICYmIGxvY2FsU3RyZWFtcy5sZW5ndGggPCBleHBlY3RlZExvY2FsU3RyZWFtcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGFubm91bmNlIG91cnNlbHZlcyB0byBvdXIgbmV3IGZyaWVuZFxuICAgIGFubm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGRhdGEgPSBleHRlbmQoe30sIHByb2ZpbGUsIHsgcm9vbTogcm9vbSB9KTtcblxuICAgICAgLy8gYW5ub3VuY2UgYW5kIGVtaXQgdGhlIGxvY2FsIGFubm91bmNlIGV2ZW50XG4gICAgICBzaWduYWxsZXIuYW5ub3VuY2UoZGF0YSk7XG4gICAgICBhbm5vdW5jZWQgPSB0cnVlO1xuICAgIH0sIDApO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlU3RyZWFtQWRkSGFuZGxlcihpZCkge1xuICAgIHJldHVybiBmdW5jdGlvbihldnQpIHtcbiAgICAgIGRlYnVnKCdwZWVyICcgKyBpZCArICcgYWRkZWQgc3RyZWFtJyk7XG4gICAgICB1cGRhdGVSZW1vdGVTdHJlYW1zKGlkKTtcbiAgICAgIHJlY2VpdmVSZW1vdGVTdHJlYW0oaWQpKGV2dC5zdHJlYW0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVN0cmVhbVJlbW92ZUhhbmRsZXIoaWQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICBkZWJ1ZygncGVlciAnICsgaWQgKyAnIHJlbW92ZWQgc3RyZWFtJyk7XG4gICAgICB1cGRhdGVSZW1vdGVTdHJlYW1zKGlkKTtcbiAgICAgIHNpZ25hbGxlcignc3RyZWFtOnJlbW92ZWQnLCBpZCwgZXZ0LnN0cmVhbSk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEFjdGl2ZUNhbGwocGVlcklkKSB7XG4gICAgdmFyIGNhbGwgPSBjYWxscy5nZXQocGVlcklkKTtcblxuICAgIGlmICghIGNhbGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gYWN0aXZlIGNhbGwgZm9yIHBlZXI6ICcgKyBwZWVySWQpO1xuICAgIH1cblxuICAgIHJldHVybiBjYWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gZ290UGVlckNoYW5uZWwoY2hhbm5lbCwgcGMsIGRhdGEpIHtcbiAgICB2YXIgY2hhbm5lbE1vbml0b3I7XG5cbiAgICBmdW5jdGlvbiBjaGFubmVsUmVhZHkoKSB7XG4gICAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChkYXRhLmlkKTtcbiAgICAgIHZhciBhcmdzID0gWyBkYXRhLmlkLCBjaGFubmVsLCBkYXRhLCBwYyBdO1xuXG4gICAgICAvLyBkZWNvdXBsZSB0aGUgY2hhbm5lbC5vbm9wZW4gbGlzdGVuZXJcbiAgICAgIGRlYnVnKCdyZXBvcnRpbmcgY2hhbm5lbCBcIicgKyBjaGFubmVsLmxhYmVsICsgJ1wiIHJlYWR5LCBoYXZlIGNhbGw6ICcgKyAoISFjYWxsKSk7XG4gICAgICBjbGVhckludGVydmFsKGNoYW5uZWxNb25pdG9yKTtcbiAgICAgIGNoYW5uZWwub25vcGVuID0gbnVsbDtcblxuICAgICAgLy8gc2F2ZSB0aGUgY2hhbm5lbFxuICAgICAgaWYgKGNhbGwpIHtcbiAgICAgICAgY2FsbC5jaGFubmVscy5zZXQoY2hhbm5lbC5sYWJlbCwgY2hhbm5lbCk7XG4gICAgICB9XG5cbiAgICAgIC8vIHRyaWdnZXIgdGhlICVjaGFubmVsLmxhYmVsJTpvcGVuIGV2ZW50XG4gICAgICBkZWJ1ZygndHJpZ2dlcmluZyBjaGFubmVsOm9wZW5lZCBldmVudHMgZm9yIGNoYW5uZWw6ICcgKyBjaGFubmVsLmxhYmVsKTtcblxuICAgICAgLy8gZW1pdCB0aGUgcGxhaW4gY2hhbm5lbDpvcGVuZWQgZXZlbnRcbiAgICAgIHNpZ25hbGxlci5hcHBseShzaWduYWxsZXIsIFsnY2hhbm5lbDpvcGVuZWQnXS5jb25jYXQoYXJncykpO1xuXG4gICAgICAvLyBlbWl0IHRoZSBjaGFubmVsOm9wZW5lZDolbGFiZWwlIGV2ZVxuICAgICAgc2lnbmFsbGVyLmFwcGx5KFxuICAgICAgICBzaWduYWxsZXIsXG4gICAgICAgIFsnY2hhbm5lbDpvcGVuZWQ6JyArIGNoYW5uZWwubGFiZWxdLmNvbmNhdChhcmdzKVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBkZWJ1ZygnY2hhbm5lbCAnICsgY2hhbm5lbC5sYWJlbCArICcgZGlzY292ZXJlZCBmb3IgcGVlcjogJyArIGRhdGEuaWQpO1xuICAgIGlmIChjaGFubmVsLnJlYWR5U3RhdGUgPT09ICdvcGVuJykge1xuICAgICAgcmV0dXJuIGNoYW5uZWxSZWFkeSgpO1xuICAgIH1cblxuICAgIGRlYnVnKCdjaGFubmVsIG5vdCByZWFkeSwgY3VycmVudCBzdGF0ZSA9ICcgKyBjaGFubmVsLnJlYWR5U3RhdGUpO1xuICAgIGNoYW5uZWwub25vcGVuID0gY2hhbm5lbFJlYWR5O1xuXG4gICAgLy8gbW9uaXRvciB0aGUgY2hhbm5lbCBvcGVuIChkb24ndCB0cnVzdCB0aGUgY2hhbm5lbCBvcGVuIGV2ZW50IGp1c3QgeWV0KVxuICAgIGNoYW5uZWxNb25pdG9yID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICBkZWJ1ZygnY2hlY2tpbmcgY2hhbm5lbCBzdGF0ZSwgY3VycmVudCBzdGF0ZSA9ICcgKyBjaGFubmVsLnJlYWR5U3RhdGUpO1xuICAgICAgaWYgKGNoYW5uZWwucmVhZHlTdGF0ZSA9PT0gJ29wZW4nKSB7XG4gICAgICAgIGNoYW5uZWxSZWFkeSgpO1xuICAgICAgfVxuICAgIH0sIDUwMCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVMb2NhbEFubm91bmNlKGRhdGEpIHtcbiAgICAvLyBpZiB3ZSBzZW5kIGFuIGFubm91bmNlIHdpdGggYW4gdXBkYXRlZCByb29tIHRoZW4gdXBkYXRlIG91ciBsb2NhbCByb29tIG5hbWVcbiAgICBpZiAoZGF0YSAmJiB0eXBlb2YgZGF0YS5yb29tICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICByb29tID0gZGF0YS5yb29tO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVBlZXJBbm5vdW5jZShkYXRhKSB7XG4gICAgdmFyIHBjO1xuICAgIHZhciBtb25pdG9yO1xuXG4gICAgLy8gaWYgdGhlIHJvb20gaXMgbm90IGEgbWF0Y2gsIGFib3J0XG4gICAgaWYgKGRhdGEucm9vbSAhPT0gcm9vbSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZSBhIHBlZXIgY29ubmVjdGlvblxuICAgIHBjID0gcnRjLmNyZWF0ZUNvbm5lY3Rpb24ob3B0cywgKG9wdHMgfHwge30pLmNvbnN0cmFpbnRzKTtcbiAgICBzaWduYWxsZXIoJ3BlZXI6Y29ubmVjdCcsIGRhdGEuaWQsIHBjLCBkYXRhKTtcblxuICAgIC8vIGFkZCB0aGlzIGNvbm5lY3Rpb24gdG8gdGhlIGNhbGxzIGxpc3RcbiAgICBjYWxsQ3JlYXRlKGRhdGEuaWQsIHBjLCBkYXRhKTtcblxuICAgIC8vIGFkZCB0aGUgbG9jYWwgc3RyZWFtc1xuICAgIGxvY2FsU3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSwgaWR4KSB7XG4gICAgICBwYy5hZGRTdHJlYW0oc3RyZWFtKTtcbiAgICB9KTtcblxuICAgIC8vIGFkZCB0aGUgZGF0YSBjaGFubmVsc1xuICAgIC8vIGRvIHRoaXMgZGlmZmVyZW50bHkgYmFzZWQgb24gd2hldGhlciB0aGUgY29ubmVjdGlvbiBpcyBhXG4gICAgLy8gbWFzdGVyIG9yIGEgc2xhdmUgY29ubmVjdGlvblxuICAgIGlmIChzaWduYWxsZXIuaXNNYXN0ZXIoZGF0YS5pZCkpIHtcbiAgICAgIGRlYnVnKCdpcyBtYXN0ZXIsIGNyZWF0aW5nIGRhdGEgY2hhbm5lbHM6ICcsIE9iamVjdC5rZXlzKGNoYW5uZWxzKSk7XG5cbiAgICAgIC8vIGNyZWF0ZSB0aGUgY2hhbm5lbHNcbiAgICAgIE9iamVjdC5rZXlzKGNoYW5uZWxzKS5mb3JFYWNoKGZ1bmN0aW9uKGxhYmVsKSB7XG4gICAgICAgZ290UGVlckNoYW5uZWwocGMuY3JlYXRlRGF0YUNoYW5uZWwobGFiZWwsIGNoYW5uZWxzW2xhYmVsXSksIHBjLCBkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHBjLm9uZGF0YWNoYW5uZWwgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBldnQgJiYgZXZ0LmNoYW5uZWw7XG5cbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBubyBjaGFubmVsLCBhYm9ydFxuICAgICAgICBpZiAoISBjaGFubmVsKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYW5uZWxzW2NoYW5uZWwubGFiZWxdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBnb3RQZWVyQ2hhbm5lbChjaGFubmVsLCBwYywgZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gY291cGxlIHRoZSBjb25uZWN0aW9uc1xuICAgIGRlYnVnKCdjb3VwbGluZyAnICsgc2lnbmFsbGVyLmlkICsgJyB0byAnICsgZGF0YS5pZCk7XG4gICAgbW9uaXRvciA9IHJ0Yy5jb3VwbGUocGMsIGRhdGEuaWQsIHNpZ25hbGxlciwgZXh0ZW5kKHt9LCBvcHRzLCB7XG4gICAgICBsb2dnZXI6IG1idXMoJ3BjLicgKyBkYXRhLmlkLCBzaWduYWxsZXIpXG4gICAgfSkpO1xuXG4gICAgc2lnbmFsbGVyKCdwZWVyOmNvdXBsZScsIGRhdGEuaWQsIHBjLCBkYXRhLCBtb25pdG9yKTtcblxuICAgIC8vIG9uY2UgYWN0aXZlLCB0cmlnZ2VyIHRoZSBwZWVyIGNvbm5lY3QgZXZlbnRcbiAgICBtb25pdG9yLm9uY2UoJ2Nvbm5lY3RlZCcsIGNhbGxTdGFydC5iaW5kKG51bGwsIGRhdGEuaWQsIHBjLCBkYXRhKSlcbiAgICBtb25pdG9yLm9uY2UoJ2Nsb3NlZCcsIGNhbGxFbmQuYmluZChudWxsLCBkYXRhLmlkKSk7XG5cbiAgICAvLyBpZiB3ZSBhcmUgdGhlIG1hc3RlciBjb25ubmVjdGlvbiwgY3JlYXRlIHRoZSBvZmZlclxuICAgIC8vIE5PVEU6IHRoaXMgb25seSByZWFsbHkgZm9yIHRoZSBzYWtlIG9mIHBvbGl0ZW5lc3MsIGFzIHJ0YyBjb3VwbGVcbiAgICAvLyBpbXBsZW1lbnRhdGlvbiBoYW5kbGVzIHRoZSBzbGF2ZSBhdHRlbXB0aW5nIHRvIGNyZWF0ZSBhbiBvZmZlclxuICAgIGlmIChzaWduYWxsZXIuaXNNYXN0ZXIoZGF0YS5pZCkpIHtcbiAgICAgIG1vbml0b3IuY3JlYXRlT2ZmZXIoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVQZWVyRmlsdGVyKGV2dCkge1xuICAgIC8vIG9ubHkgY29ubmVjdCB3aXRoIHRoZSBwZWVyIGlmIHdlIGFyZSByZWFkeVxuICAgIGV2dC5hbGxvdyA9IGV2dC5hbGxvdyAmJiAobG9jYWxTdHJlYW1zLmxlbmd0aCA+PSBleHBlY3RlZExvY2FsU3RyZWFtcyk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVQZWVyVXBkYXRlKGRhdGEpIHtcbiAgICB2YXIgaWQgPSBkYXRhICYmIGRhdGEuaWQ7XG4gICAgdmFyIGFjdGl2ZUNhbGwgPSBpZCAmJiBjYWxscy5nZXQoaWQpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSByZWNlaXZlZCBhbiB1cGRhdGUgZm9yIGEgcGVlciB0aGF0IGhhcyBubyBhY3RpdmUgY2FsbHMsXG4gICAgLy8gdGhlbiBwYXNzIHRoaXMgb250byB0aGUgYW5ub3VuY2UgaGFuZGxlclxuICAgIGlmIChpZCAmJiAoISBhY3RpdmVDYWxsKSkge1xuICAgICAgZGVidWcoJ3JlY2VpdmVkIHBlZXIgdXBkYXRlIGZyb20gcGVlciAnICsgaWQgKyAnLCBubyBhY3RpdmUgY2FsbHMnKTtcbiAgICAgIHJldHVybiBoYW5kbGVQZWVyQW5ub3VuY2UoZGF0YSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVjZWl2ZVJlbW90ZVN0cmVhbShpZCkge1xuICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KGlkKTtcblxuICAgIHJldHVybiBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHNpZ25hbGxlcignc3RyZWFtOmFkZGVkJywgaWQsIHN0cmVhbSwgY2FsbCAmJiBjYWxsLmRhdGEpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVSZW1vdGVTdHJlYW1zKGlkKSB7XG4gICAgdmFyIGNhbGwgPSBjYWxscy5nZXQoaWQpO1xuXG4gICAgaWYgKGNhbGwgJiYgY2FsbC5wYykge1xuICAgICAgY2FsbC5zdHJlYW1zID0gW10uY29uY2F0KGNhbGwucGMuZ2V0UmVtb3RlU3RyZWFtcygpKTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcm9vbSBpcyBub3QgZGVmaW5lZCwgdGhlbiBnZW5lcmF0ZSB0aGUgcm9vbSBuYW1lXG4gIGlmICghIHJvb20pIHtcbiAgICAvLyBpZiB0aGUgaGFzaCBpcyBub3QgYXNzaWduZWQsIHRoZW4gY3JlYXRlIGEgcmFuZG9tIGhhc2ggdmFsdWVcbiAgICBpZiAoISBoYXNoKSB7XG4gICAgICBoYXNoID0gbG9jYXRpb24uaGFzaCA9ICcnICsgKE1hdGgucG93KDIsIDUzKSAqIE1hdGgucmFuZG9tKCkpO1xuICAgIH1cblxuICAgIHJvb20gPSBucyArICcjJyArIGhhc2g7XG4gIH1cblxuICBpZiAoZGVidWdnaW5nKSB7XG4gICAgcnRjLmxvZ2dlci5lbmFibGUuYXBwbHkocnRjLmxvZ2dlciwgQXJyYXkuaXNBcnJheShkZWJ1ZykgPyBkZWJ1Z2dpbmcgOiBbJyonXSk7XG4gIH1cblxuICBzaWduYWxsZXIub24oJ3BlZXI6YW5ub3VuY2UnLCBoYW5kbGVQZWVyQW5ub3VuY2UpO1xuICBzaWduYWxsZXIub24oJ3BlZXI6dXBkYXRlJywgaGFuZGxlUGVlclVwZGF0ZSk7XG4gIHNpZ25hbGxlci5vbigncGVlcjpsZWF2ZScsIGNhbGxFbmQpO1xuXG4gIC8qKlxuICAgICMjIyBRdWlja2Nvbm5lY3QgQnJvYWRjYXN0IGFuZCBEYXRhIENoYW5uZWwgSGVscGVyIEZ1bmN0aW9uc1xuXG4gICAgVGhlIGZvbGxvd2luZyBhcmUgZnVuY3Rpb25zIHRoYXQgYXJlIHBhdGNoZWQgaW50byB0aGUgYHJ0Yy1zaWduYWxsZXJgXG4gICAgaW5zdGFuY2UgdGhhdCBtYWtlIHdvcmtpbmcgd2l0aCBhbmQgY3JlYXRpbmcgZnVuY3Rpb25hbCBXZWJSVEMgYXBwbGljYXRpb25zXG4gICAgYSBsb3Qgc2ltcGxlci5cblxuICAqKi9cblxuICAvKipcbiAgICAjIyMjIGFkZFN0cmVhbVxuXG4gICAgYGBgXG4gICAgYWRkU3RyZWFtKHN0cmVhbTpNZWRpYVN0cmVhbSkgPT4gcWNcbiAgICBgYGBcblxuICAgIEFkZCB0aGUgc3RyZWFtIHRvIGFjdGl2ZSBjYWxscyBhbmQgYWxzbyBzYXZlIHRoZSBzdHJlYW0gc28gdGhhdCBpdFxuICAgIGNhbiBiZSBhZGRlZCB0byBmdXR1cmUgY2FsbHMuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5icm9hZGNhc3QgPSBzaWduYWxsZXIuYWRkU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgbG9jYWxTdHJlYW1zLnB1c2goc3RyZWFtKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYW55IGFjdGl2ZSBjYWxscywgdGhlbiBhZGQgdGhlIHN0cmVhbVxuICAgIGNhbGxzLnZhbHVlcygpLmZvckVhY2goZnVuY3Rpb24oZGF0YSkge1xuICAgICAgZGF0YS5wYy5hZGRTdHJlYW0oc3RyZWFtKTtcbiAgICB9KTtcblxuICAgIGNoZWNrUmVhZHlUb0Fubm91bmNlKCk7XG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIGVuZENhbGxzKClcblxuICAgIFRoZSBgZW5kQ2FsbHNgIGZ1bmN0aW9uIHRlcm1pbmF0ZXMgYWxsIHRoZSBhY3RpdmUgY2FsbHMgdGhhdCBoYXZlIGJlZW5cbiAgICBjcmVhdGVkIGluIHRoaXMgcXVpY2tjb25uZWN0IGluc3RhbmNlLiAgQ2FsbGluZyBgZW5kQ2FsbHNgIGRvZXMgbm90XG4gICAga2lsbCB0aGUgY29ubmVjdGlvbiB3aXRoIHRoZSBzaWduYWxsaW5nIHNlcnZlci5cblxuICAqKi9cbiAgc2lnbmFsbGVyLmVuZENhbGxzID0gZnVuY3Rpb24oKSB7XG4gICAgY2FsbHMua2V5cygpLmZvckVhY2goY2FsbEVuZCk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyBjbG9zZSgpXG5cbiAgICBUaGUgYGNsb3NlYCBmdW5jdGlvbiBwcm92aWRlcyBhIGNvbnZlbmllbnQgd2F5IG9mIGNsb3NpbmcgYWxsIGFzc29jaWF0ZWRcbiAgICBwZWVyIGNvbm5lY3Rpb25zLiAgVGhpcyBmdW5jdGlvbiBzaW1wbHkgdXNlcyB0aGUgYGVuZENhbGxzYCBmdW5jdGlvbiBhbmRcbiAgICB0aGUgdW5kZXJseWluZyBgbGVhdmVgIGZ1bmN0aW9uIG9mIHRoZSBzaWduYWxsZXIgdG8gZG8gYSBcImZ1bGwgY2xlYW51cFwiXG4gICAgb2YgYWxsIGNvbm5lY3Rpb25zLlxuICAqKi9cbiAgc2lnbmFsbGVyLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgc2lnbmFsbGVyLmVuZENhbGxzKCk7XG4gICAgc2lnbmFsbGVyLmxlYXZlKCk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyBjcmVhdGVEYXRhQ2hhbm5lbChsYWJlbCwgY29uZmlnKVxuXG4gICAgUmVxdWVzdCB0aGF0IGEgZGF0YSBjaGFubmVsIHdpdGggdGhlIHNwZWNpZmllZCBgbGFiZWxgIGlzIGNyZWF0ZWQgb25cbiAgICB0aGUgcGVlciBjb25uZWN0aW9uLiAgV2hlbiB0aGUgZGF0YSBjaGFubmVsIGlzIG9wZW4gYW5kIGF2YWlsYWJsZSwgYW5cbiAgICBldmVudCB3aWxsIGJlIHRyaWdnZXJlZCB1c2luZyB0aGUgbGFiZWwgb2YgdGhlIGRhdGEgY2hhbm5lbC5cblxuICAgIEZvciBleGFtcGxlLCBpZiBhIG5ldyBkYXRhIGNoYW5uZWwgd2FzIHJlcXVlc3RlZCB1c2luZyB0aGUgZm9sbG93aW5nXG4gICAgY2FsbDpcblxuICAgIGBgYGpzXG4gICAgdmFyIHFjID0gcXVpY2tjb25uZWN0KCdodHRwOi8vcnRjLmlvL3N3aXRjaGJvYXJkJykuY3JlYXRlRGF0YUNoYW5uZWwoJ3Rlc3QnKTtcbiAgICBgYGBcblxuICAgIFRoZW4gd2hlbiB0aGUgZGF0YSBjaGFubmVsIGlzIHJlYWR5IGZvciB1c2UsIGEgYHRlc3Q6b3BlbmAgZXZlbnQgd291bGRcbiAgICBiZSBlbWl0dGVkIGJ5IGBxY2AuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5jcmVhdGVEYXRhQ2hhbm5lbCA9IGZ1bmN0aW9uKGxhYmVsLCBvcHRzKSB7XG4gICAgLy8gY3JlYXRlIGEgY2hhbm5lbCBvbiBhbGwgZXhpc3RpbmcgY2FsbHNcbiAgICBjYWxscy5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbihwZWVySWQpIHtcbiAgICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KHBlZXJJZCk7XG4gICAgICB2YXIgZGM7XG5cbiAgICAgIC8vIGlmIHdlIGFyZSB0aGUgbWFzdGVyIGNvbm5lY3Rpb24sIGNyZWF0ZSB0aGUgZGF0YSBjaGFubmVsXG4gICAgICBpZiAoY2FsbCAmJiBjYWxsLnBjICYmIHNpZ25hbGxlci5pc01hc3RlcihwZWVySWQpKSB7XG4gICAgICAgIGRjID0gY2FsbC5wYy5jcmVhdGVEYXRhQ2hhbm5lbChsYWJlbCwgb3B0cyk7XG4gICAgICAgIGdvdFBlZXJDaGFubmVsKGRjLCBjYWxsLnBjLCBjYWxsLmRhdGEpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gc2F2ZSB0aGUgZGF0YSBjaGFubmVsIG9wdHMgaW4gdGhlIGxvY2FsIGNoYW5uZWxzIGRpY3Rpb25hcnlcbiAgICBjaGFubmVsc1tsYWJlbF0gPSBvcHRzIHx8IG51bGw7XG5cbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgam9pbigpXG5cbiAgICBUaGUgYGpvaW5gIGZ1bmN0aW9uIGlzIHVzZWQgd2hlbiBgbWFudWFsSm9pbmAgaXMgc2V0IHRvIHRydWUgd2hlbiBjcmVhdGluZ1xuICAgIGEgcXVpY2tjb25uZWN0IGluc3RhbmNlLiAgQ2FsbCB0aGUgYGpvaW5gIGZ1bmN0aW9uIG9uY2UgeW91IGFyZSByZWFkeSB0b1xuICAgIGpvaW4gdGhlIHNpZ25hbGxpbmcgc2VydmVyIGFuZCBpbml0aWF0ZSBjb25uZWN0aW9ucyB3aXRoIG90aGVyIHBlb3BsZS5cblxuICAqKi9cbiAgc2lnbmFsbGVyLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgICBhbGxvd0pvaW4gPSB0cnVlO1xuICAgIGNoZWNrUmVhZHlUb0Fubm91bmNlKCk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyByZWFjdGl2ZSgpXG5cbiAgICBGbGFnIHRoYXQgdGhpcyBzZXNzaW9uIHdpbGwgYmUgYSByZWFjdGl2ZSBjb25uZWN0aW9uLlxuXG4gICoqL1xuICBzaWduYWxsZXIucmVhY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBhZGQgdGhlIHJlYWN0aXZlIGZsYWdcbiAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICBvcHRzLnJlYWN0aXZlID0gdHJ1ZTtcblxuICAgIC8vIGNoYWluXG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIHJlbW92ZVN0cmVhbVxuXG4gICAgYGBgXG4gICAgcmVtb3ZlU3RyZWFtKHN0cmVhbTpNZWRpYVN0cmVhbSlcbiAgICBgYGBcblxuICAgIFJlbW92ZSB0aGUgc3BlY2lmaWVkIHN0cmVhbSBmcm9tIGJvdGggdGhlIGxvY2FsIHN0cmVhbXMgdGhhdCBhcmUgdG9cbiAgICBiZSBjb25uZWN0ZWQgdG8gbmV3IHBlZXJzLCBhbmQgYWxzbyBmcm9tIGFueSBhY3RpdmUgY2FsbHMuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICB2YXIgbG9jYWxJbmRleCA9IGxvY2FsU3RyZWFtcy5pbmRleE9mKHN0cmVhbSk7XG5cbiAgICAvLyByZW1vdmUgdGhlIHN0cmVhbSBmcm9tIGFueSBhY3RpdmUgY2FsbHNcbiAgICBjYWxscy52YWx1ZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGNhbGwpIHtcbiAgICAgIGNhbGwucGMucmVtb3ZlU3RyZWFtKHN0cmVhbSk7XG4gICAgfSk7XG5cbiAgICAvLyByZW1vdmUgdGhlIHN0cmVhbSBmcm9tIHRoZSBsb2NhbFN0cmVhbXMgYXJyYXlcbiAgICBpZiAobG9jYWxJbmRleCA+PSAwKSB7XG4gICAgICBsb2NhbFN0cmVhbXMuc3BsaWNlKGxvY2FsSW5kZXgsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBzaWduYWxsZXI7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyByZXF1ZXN0Q2hhbm5lbFxuXG4gICAgYGBgXG4gICAgcmVxdWVzdENoYW5uZWwodGFyZ2V0SWQsIGxhYmVsLCBjYWxsYmFjaylcbiAgICBgYGBcblxuICAgIFRoaXMgaXMgYSBmdW5jdGlvbiB0aGF0IGNhbiBiZSB1c2VkIHRvIHJlc3BvbmQgdG8gcmVtb3RlIHBlZXJzIHN1cHBseWluZ1xuICAgIGEgZGF0YSBjaGFubmVsIGFzIHBhcnQgb2YgdGhlaXIgY29uZmlndXJhdGlvbi4gIEFzIHBlciB0aGUgYHJlY2VpdmVTdHJlYW1gXG4gICAgZnVuY3Rpb24gdGhpcyBmdW5jdGlvbiB3aWxsIGVpdGhlciBmaXJlIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseSBpZiB0aGVcbiAgICBjaGFubmVsIGlzIGFscmVhZHkgYXZhaWxhYmxlLCBvciBvbmNlIHRoZSBjaGFubmVsIGhhcyBiZWVuIGRpc2NvdmVyZWQgb25cbiAgICB0aGUgY2FsbC5cblxuICAqKi9cbiAgc2lnbmFsbGVyLnJlcXVlc3RDaGFubmVsID0gZnVuY3Rpb24odGFyZ2V0SWQsIGxhYmVsLCBjYWxsYmFjaykge1xuICAgIHZhciBjYWxsID0gZ2V0QWN0aXZlQ2FsbCh0YXJnZXRJZCk7XG4gICAgdmFyIGNoYW5uZWwgPSBjYWxsICYmIGNhbGwuY2hhbm5lbHMuZ2V0KGxhYmVsKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgdGhlbiBjaGFubmVsIHRyaWdnZXIgdGhlIGNhbGxiYWNrIGltbWVkaWF0ZWx5XG4gICAgaWYgKGNoYW5uZWwpIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIGNoYW5uZWwpO1xuICAgICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgICB9XG5cbiAgICAvLyBpZiBub3QsIHdhaXQgZm9yIGl0XG4gICAgc2lnbmFsbGVyLm9uY2UoJ2NoYW5uZWw6b3BlbmVkOicgKyBsYWJlbCwgZnVuY3Rpb24oaWQsIGRjKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBkYyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgcmVxdWVzdFN0cmVhbVxuXG4gICAgYGBgXG4gICAgcmVxdWVzdFN0cmVhbSh0YXJnZXRJZCwgaWR4LCBjYWxsYmFjaylcbiAgICBgYGBcblxuICAgIFVzZWQgdG8gcmVxdWVzdCBhIHJlbW90ZSBzdHJlYW0gZnJvbSBhIHF1aWNrY29ubmVjdCBpbnN0YW5jZS4gSWYgdGhlXG4gICAgc3RyZWFtIGlzIGFscmVhZHkgYXZhaWxhYmxlIGluIHRoZSBjYWxscyByZW1vdGUgc3RyZWFtcywgdGhlbiB0aGUgY2FsbGJhY2tcbiAgICB3aWxsIGJlIHRyaWdnZXJlZCBpbW1lZGlhdGVseSwgb3RoZXJ3aXNlIHRoaXMgZnVuY3Rpb24gd2lsbCBtb25pdG9yXG4gICAgYHN0cmVhbTphZGRlZGAgZXZlbnRzIGFuZCB3YWl0IGZvciBhIG1hdGNoLlxuXG4gICAgSW4gdGhlIGNhc2UgdGhhdCBhbiB1bmtub3duIHRhcmdldCBpcyByZXF1ZXN0ZWQsIHRoZW4gYW4gZXhjZXB0aW9uIHdpbGxcbiAgICBiZSB0aHJvd24uXG4gICoqL1xuICBzaWduYWxsZXIucmVxdWVzdFN0cmVhbSA9IGZ1bmN0aW9uKHRhcmdldElkLCBpZHgsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGNhbGwgPSBnZXRBY3RpdmVDYWxsKHRhcmdldElkKTtcbiAgICB2YXIgc3RyZWFtO1xuXG4gICAgZnVuY3Rpb24gd2FpdEZvclN0cmVhbShwZWVySWQpIHtcbiAgICAgIGlmIChwZWVySWQgIT09IHRhcmdldElkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gZ2V0IHRoZSBzdHJlYW1cbiAgICAgIHN0cmVhbSA9IGNhbGwucGMuZ2V0UmVtb3RlU3RyZWFtcygpW2lkeF07XG5cbiAgICAgIC8vIGlmIHdlIGhhdmUgdGhlIHN0cmVhbSwgdGhlbiByZW1vdmUgdGhlIGxpc3RlbmVyIGFuZCB0cmlnZ2VyIHRoZSBjYlxuICAgICAgaWYgKHN0cmVhbSkge1xuICAgICAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ3N0cmVhbTphZGRlZCcsIHdhaXRGb3JTdHJlYW0pO1xuICAgICAgICBjYWxsYmFjayhudWxsLCBzdHJlYW0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGxvb2sgZm9yIHRoZSBzdHJlYW0gaW4gdGhlIHJlbW90ZSBzdHJlYW1zIG9mIHRoZSBjYWxsXG4gICAgc3RyZWFtID0gY2FsbC5wYy5nZXRSZW1vdGVTdHJlYW1zKClbaWR4XTtcblxuICAgIC8vIGlmIHdlIGZvdW5kIHRoZSBzdHJlYW0gdGhlbiB0cmlnZ2VyIHRoZSBjYWxsYmFja1xuICAgIGlmIChzdHJlYW0pIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIHN0cmVhbSk7XG4gICAgICByZXR1cm4gc2lnbmFsbGVyO1xuICAgIH1cblxuICAgIC8vIG90aGVyd2lzZSB3YWl0IGZvciB0aGUgc3RyZWFtXG4gICAgc2lnbmFsbGVyLm9uKCdzdHJlYW06YWRkZWQnLCB3YWl0Rm9yU3RyZWFtKTtcbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgcHJvZmlsZShkYXRhKVxuXG4gICAgVXBkYXRlIHRoZSBwcm9maWxlIGRhdGEgd2l0aCB0aGUgYXR0YWNoZWQgaW5mb3JtYXRpb24sIHNvIHdoZW5cbiAgICB0aGUgc2lnbmFsbGVyIGFubm91bmNlcyBpdCBpbmNsdWRlcyB0aGlzIGRhdGEgaW4gYWRkaXRpb24gdG8gYW55XG4gICAgcm9vbSBhbmQgaWQgaW5mb3JtYXRpb24uXG5cbiAgKiovXG4gIHNpZ25hbGxlci5wcm9maWxlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIGV4dGVuZChwcm9maWxlLCBkYXRhKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYWxyZWFkeSBhbm5vdW5jZWQsIHRoZW4gcmVhbm5vdW5jZSBvdXIgcHJvZmlsZSB0byBwcm92aWRlXG4gICAgLy8gb3RoZXJzIGEgYHBlZXI6dXBkYXRlYCBldmVudFxuICAgIGlmIChhbm5vdW5jZWQpIHtcbiAgICAgIHNpZ25hbGxlci5hbm5vdW5jZShwcm9maWxlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgd2FpdEZvckNhbGxcblxuICAgIGBgYFxuICAgIHdhaXRGb3JDYWxsKHRhcmdldElkLCBjYWxsYmFjaylcbiAgICBgYGBcblxuICAgIFdhaXQgZm9yIGEgY2FsbCBmcm9tIHRoZSBzcGVjaWZpZWQgdGFyZ2V0SWQuICBJZiB0aGUgY2FsbCBpcyBhbHJlYWR5XG4gICAgYWN0aXZlIHRoZSBjYWxsYmFjayB3aWxsIGJlIGZpcmVkIGltbWVkaWF0ZWx5LCBvdGhlcndpc2Ugd2Ugd2lsbCB3YWl0XG4gICAgZm9yIGEgYGNhbGw6c3RhcnRlZGAgZXZlbnQgdGhhdCBtYXRjaGVzIHRoZSByZXF1ZXN0ZWQgYHRhcmdldElkYFxuXG4gICoqL1xuICBzaWduYWxsZXIud2FpdEZvckNhbGwgPSBmdW5jdGlvbih0YXJnZXRJZCwgY2FsbGJhY2spIHtcbiAgICB2YXIgY2FsbCA9IGNhbGxzLmdldCh0YXJnZXRJZCk7XG5cbiAgICBpZiAoY2FsbCAmJiBjYWxsLmFjdGl2ZSkge1xuICAgICAgY2FsbGJhY2sobnVsbCwgY2FsbC5wYyk7XG4gICAgICByZXR1cm4gc2lnbmFsbGVyO1xuICAgIH1cblxuICAgIHNpZ25hbGxlci5vbignY2FsbDpzdGFydGVkJywgZnVuY3Rpb24gaGFuZGxlTmV3Q2FsbChpZCkge1xuICAgICAgaWYgKGlkID09PSB0YXJnZXRJZCkge1xuICAgICAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ2NhbGw6c3RhcnRlZCcsIGhhbmRsZU5ld0NhbGwpO1xuICAgICAgICBjYWxsYmFjayhudWxsLCBjYWxscy5nZXQoaWQpLnBjKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICAvLyBpZiB3ZSBoYXZlIGFuIGV4cGVjdGVkIG51bWJlciBvZiBsb2NhbCBzdHJlYW1zLCB0aGVuIHVzZSBhIGZpbHRlciB0b1xuICAvLyBjaGVjayBpZiB3ZSBzaG91bGQgcmVzcG9uZFxuICBpZiAoZXhwZWN0ZWRMb2NhbFN0cmVhbXMpIHtcbiAgICBzaWduYWxsZXIub24oJ3BlZXI6ZmlsdGVyJywgaGFuZGxlUGVlckZpbHRlcik7XG4gIH1cblxuICAvLyByZXNwb25kIHRvIGxvY2FsIGFubm91bmNlIG1lc3NhZ2VzXG4gIHNpZ25hbGxlci5vbignbG9jYWw6YW5ub3VuY2UnLCBoYW5kbGVMb2NhbEFubm91bmNlKTtcblxuICAvLyBjaGVjayB0byBzZWUgaWYgd2UgYXJlIHJlYWR5IHRvIGFubm91bmNlXG4gIGNoZWNrUmVhZHlUb0Fubm91bmNlKCk7XG5cbiAgLy8gcGFzcyB0aGUgc2lnbmFsbGVyIG9uXG4gIHJldHVybiBzaWduYWxsZXI7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSkiLCJ2YXIgY3JlYXRlVHJpZSA9IHJlcXVpcmUoJ2FycmF5LXRyaWUnKTtcbnZhciByZURlbGltID0gL1tcXC5cXDpdLztcblxuLyoqXG4gICMgbWJ1c1xuXG4gIElmIE5vZGUncyBFdmVudEVtaXR0ZXIgYW5kIEV2ZSB3ZXJlIHRvIGhhdmUgYSBjaGlsZCwgaXQgbWlnaHQgbG9vayBzb21ldGhpbmcgbGlrZSB0aGlzLlxuICBObyB3aWxkY2FyZCBzdXBwb3J0IGF0IHRoaXMgc3RhZ2UgdGhvdWdoLi4uXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBkb2NzL3VzYWdlLm1kXG5cbiAgIyMgUmVmZXJlbmNlXG5cbiAgIyMjIGBtYnVzKG5hbWVzcGFjZT8sIHBhcmVudD8sIHNjb3BlPylgXG5cbiAgQ3JlYXRlIGEgbmV3IG1lc3NhZ2UgYnVzIHdpdGggYG5hbWVzcGFjZWAgaW5oZXJpdGluZyBmcm9tIHRoZSBgcGFyZW50YFxuICBtYnVzIGluc3RhbmNlLiAgSWYgZXZlbnRzIGZyb20gdGhpcyBtZXNzYWdlIGJ1cyBzaG91bGQgYmUgdHJpZ2dlcmVkIHdpdGhcbiAgYSBzcGVjaWZpYyBgdGhpc2Agc2NvcGUsIHRoZW4gc3BlY2lmeSBpdCB1c2luZyB0aGUgYHNjb3BlYCBhcmd1bWVudC5cblxuKiovXG5cbnZhciBjcmVhdGVCdXMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG5hbWVzcGFjZSwgcGFyZW50LCBzY29wZSkge1xuICB2YXIgcmVnaXN0cnkgPSBjcmVhdGVUcmllKCk7XG4gIHZhciBmZWVkcyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGJ1cyhuYW1lKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgdmFyIHBhcnRzID0gZ2V0TmFtZVBhcnRzKG5hbWUpO1xuICAgIHZhciBkZWxpbWl0ZWQgPSBwYXJ0cy5qb2luKCcuJyk7XG4gICAgdmFyIGhhbmRsZXJzID0gcmVnaXN0cnkuZ2V0KHBhcnRzKSB8fCBbXTtcbiAgICB2YXIgcmVzdWx0cztcblxuICAgIC8vIHNlbmQgdGhyb3VnaCB0aGUgZmVlZHNcbiAgICBmZWVkcy5mb3JFYWNoKGZ1bmN0aW9uKGZlZWQpIHtcbiAgICAgIGZlZWQoeyBuYW1lOiBkZWxpbWl0ZWQsIGFyZ3M6IGFyZ3MgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBydW4gdGhlIHJlZ2lzdGVyZWQgaGFuZGxlcnNcbiAgICByZXN1bHRzID0gW10uY29uY2F0KGhhbmRsZXJzKS5tYXAoZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgcmV0dXJuIGhhbmRsZXIuYXBwbHkoc2NvcGUgfHwgdGhpcywgYXJncyk7XG4gICAgfSk7XG5cbiAgICAvLyBydW4gdGhlIHBhcmVudCBoYW5kbGVyc1xuICAgIGlmIChidXMucGFyZW50KSB7XG4gICAgICByZXN1bHRzID0gcmVzdWx0cy5jb25jYXQoXG4gICAgICAgIGJ1cy5wYXJlbnQuYXBwbHkoc2NvcGUgfHwgdGhpcywgW25hbWVzcGFjZS5jb25jYXQocGFydHMpXS5jb25jYXQoYXJncykpXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgLyoqXG4gICAgIyMjIGBtYnVzI2NsZWFyKClgXG5cbiAgICBSZXNldCB0aGUgaGFuZGxlciByZWdpc3RyeSwgd2hpY2ggZXNzZW50aWFsIGRlcmVnaXN0ZXJzIGFsbCBldmVudCBsaXN0ZW5lcnMuXG5cbiAgICBfQWxpYXM6XyBgcmVtb3ZlQWxsTGlzdGVuZXJzYFxuICAqKi9cbiAgZnVuY3Rpb24gY2xlYXIobmFtZSkge1xuICAgIC8vIGlmIHdlIGhhdmUgYSBuYW1lLCByZXNldCBoYW5kbGVycyBmb3IgdGhhdCBoYW5kbGVyXG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIHJlZ2lzdHJ5LnNldChnZXROYW1lUGFydHMobmFtZSksIFtdKTtcbiAgICB9XG4gICAgLy8gb3RoZXJ3aXNlLCByZXNldCB0aGUgZW50aXJlIGhhbmRsZXIgcmVnaXN0cnlcbiAgICBlbHNlIHtcbiAgICAgIHJlZ2lzdHJ5ID0gY3JlYXRlVHJpZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgICMjIyBgbWJ1cyNmZWVkKGhhbmRsZXIpYFxuXG4gICAgQXR0YWNoIGEgaGFuZGxlciBmdW5jdGlvbiB0aGF0IHdpbGwgc2VlIGFsbCBldmVudHMgdGhhdCBhcmUgc2VudCB0aHJvdWdoXG4gICAgdGhpcyBidXMgaW4gYW4gXCJvYmplY3Qgc3RyZWFtXCIgZm9ybWF0IHRoYXQgbWF0Y2hlcyB0aGUgZm9sbG93aW5nIGZvcm1hdDpcblxuICAgIGBgYFxuICAgIHsgbmFtZTogJ2V2ZW50Lm5hbWUnLCBhcmdzOiBbICdldmVudCcsICdhcmdzJyBdIH1cbiAgICBgYGBcblxuICAgIFRoZSBmZWVkIGZ1bmN0aW9uIHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGNhbiBiZSBjYWxsZWQgdG8gc3RvcCB0aGUgZmVlZFxuICAgIHNlbmRpbmcgZGF0YS5cblxuICAqKi9cbiAgZnVuY3Rpb24gZmVlZChoYW5kbGVyKSB7XG4gICAgZnVuY3Rpb24gc3RvcCgpIHtcbiAgICAgIGZlZWRzLnNwbGljZShmZWVkcy5pbmRleE9mKGhhbmRsZXIpLCAxKTtcbiAgICB9XG5cbiAgICBmZWVkcy5wdXNoKGhhbmRsZXIpO1xuICAgIHJldHVybiBzdG9wO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0TmFtZVBhcnRzKG5hbWUpIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheShuYW1lKSA/IG5hbWUgOiBuYW1lLnNwbGl0KHJlRGVsaW0pO1xuICB9XG5cbiAgLyoqXG4gICAgIyMjIGBtYnVzI29mZihuYW1lLCBoYW5kbGVyKWBcblxuICAgIERlcmVnaXN0ZXIgYW4gZXZlbnQgaGFuZGxlci5cbiAgKiovXG4gIGZ1bmN0aW9uIG9mZihuYW1lLCBoYW5kbGVyKSB7XG4gICAgdmFyIGhhbmRsZXJzID0gcmVnaXN0cnkuZ2V0KGdldE5hbWVQYXJ0cyhuYW1lKSk7XG4gICAgdmFyIGlkeCA9IGhhbmRsZXJzID8gaGFuZGxlcnMuaW5kZXhPZihoYW5kbGVyKSA6IC0xO1xuXG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBoYW5kbGVycy5zcGxpY2UoaWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICAjIyMgYG1idXMjb24obmFtZSwgaGFuZGxlcilgXG5cbiAgICBSZWdpc3RlciBhbiBldmVudCBoYW5kbGVyIGZvciB0aGUgZXZlbnQgYG5hbWVgLlxuXG4gICoqL1xuICBmdW5jdGlvbiBvbihuYW1lLCBoYW5kbGVyKSB7XG4gICAgdmFyIHBhcnRzID0gZ2V0TmFtZVBhcnRzKG5hbWUpO1xuICAgIHZhciBoYW5kbGVycyA9IHJlZ2lzdHJ5LmdldChwYXJ0cyk7XG5cbiAgICBpZiAoaGFuZGxlcnMpIHtcbiAgICAgIGhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmVnaXN0cnkuc2V0KHBhcnRzLCBbIGhhbmRsZXIgXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ1cztcbiAgfVxuXG5cbiAgLyoqXG4gICAgIyMjIGBtYnVzI29uY2UobmFtZSwgaGFuZGxlcilgXG5cbiAgICBSZWdpc3RlciBhbiBldmVudCBoYW5kbGVyIGZvciB0aGUgZXZlbnQgYG5hbWVgIHRoYXQgd2lsbCBvbmx5XG4gICAgdHJpZ2dlciBvbmNlIChpLmUuIHRoZSBoYW5kbGVyIHdpbGwgYmUgZGVyZWdpc3RlcmVkIGltbWVkaWF0ZWx5IGFmdGVyXG4gICAgYmVpbmcgdHJpZ2dlcmVkIHRoZSBmaXJzdCB0aW1lKS5cblxuICAqKi9cbiAgZnVuY3Rpb24gb25jZShuYW1lLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIG9uKG5hbWUsIGZ1bmN0aW9uIGhhbmRsZUV2ZW50KCkge1xuICAgICAgdmFyIHJlc3VsdCA9IGhhbmRsZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGJ1cy5vZmYobmFtZSwgaGFuZGxlRXZlbnQpO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBuYW1lc3BhY2UgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHBhcmVudCA9IG5hbWVzcGFjZTtcbiAgICBuYW1lc3BhY2UgPSAnJztcbiAgfVxuXG4gIG5hbWVzcGFjZSA9IChuYW1lc3BhY2UgJiYgbmFtZXNwYWNlLnNwbGl0KHJlRGVsaW0pKSB8fCBbXTtcblxuICBidXMuY2xlYXIgPSBidXMucmVtb3ZlQWxsTGlzdGVuZXJzID0gY2xlYXI7XG4gIGJ1cy5mZWVkID0gZmVlZDtcbiAgYnVzLm9uID0gYnVzLmFkZExpc3RlbmVyID0gb247XG4gIGJ1cy5vbmNlID0gb25jZTtcbiAgYnVzLm9mZiA9IGJ1cy5yZW1vdmVMaXN0ZW5lciA9IG9mZjtcbiAgYnVzLnBhcmVudCA9IHBhcmVudCB8fCAobmFtZXNwYWNlICYmIG5hbWVzcGFjZS5sZW5ndGggPiAwICYmIGNyZWF0ZUJ1cygpKTtcblxuICByZXR1cm4gYnVzO1xufTtcbiIsIlwidXNlIHN0cmljdFwiXG5cbmZ1bmN0aW9uIGNvbXBpbGVTZWFyY2goZnVuY05hbWUsIHByZWRpY2F0ZSwgcmV2ZXJzZWQsIGV4dHJhQXJncywgdXNlTmRhcnJheSwgZWFybHlPdXQpIHtcbiAgdmFyIGNvZGUgPSBbXG4gICAgXCJmdW5jdGlvbiBcIiwgZnVuY05hbWUsIFwiKGEsbCxoLFwiLCBleHRyYUFyZ3Muam9pbihcIixcIiksICBcIil7XCIsXG5lYXJseU91dCA/IFwiXCIgOiBcInZhciBpPVwiLCAocmV2ZXJzZWQgPyBcImwtMVwiIDogXCJoKzFcIiksXG5cIjt3aGlsZShsPD1oKXtcXFxudmFyIG09KGwraCk+Pj4xLHg9YVwiLCB1c2VOZGFycmF5ID8gXCIuZ2V0KG0pXCIgOiBcIlttXVwiXVxuICBpZihlYXJseU91dCkge1xuICAgIGlmKHByZWRpY2F0ZS5pbmRleE9mKFwiY1wiKSA8IDApIHtcbiAgICAgIGNvZGUucHVzaChcIjtpZih4PT09eSl7cmV0dXJuIG19ZWxzZSBpZih4PD15KXtcIilcbiAgICB9IGVsc2Uge1xuICAgICAgY29kZS5wdXNoKFwiO3ZhciBwPWMoeCx5KTtpZihwPT09MCl7cmV0dXJuIG19ZWxzZSBpZihwPD0wKXtcIilcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY29kZS5wdXNoKFwiO2lmKFwiLCBwcmVkaWNhdGUsIFwiKXtpPW07XCIpXG4gIH1cbiAgaWYocmV2ZXJzZWQpIHtcbiAgICBjb2RlLnB1c2goXCJsPW0rMX1lbHNle2g9bS0xfVwiKVxuICB9IGVsc2Uge1xuICAgIGNvZGUucHVzaChcImg9bS0xfWVsc2V7bD1tKzF9XCIpXG4gIH1cbiAgY29kZS5wdXNoKFwifVwiKVxuICBpZihlYXJseU91dCkge1xuICAgIGNvZGUucHVzaChcInJldHVybiAtMX07XCIpXG4gIH0gZWxzZSB7XG4gICAgY29kZS5wdXNoKFwicmV0dXJuIGl9O1wiKVxuICB9XG4gIHJldHVybiBjb2RlLmpvaW4oXCJcIilcbn1cblxuZnVuY3Rpb24gY29tcGlsZUJvdW5kc1NlYXJjaChwcmVkaWNhdGUsIHJldmVyc2VkLCBzdWZmaXgsIGVhcmx5T3V0KSB7XG4gIHZhciByZXN1bHQgPSBuZXcgRnVuY3Rpb24oW1xuICBjb21waWxlU2VhcmNoKFwiQVwiLCBcInhcIiArIHByZWRpY2F0ZSArIFwieVwiLCByZXZlcnNlZCwgW1wieVwiXSwgZmFsc2UsIGVhcmx5T3V0KSxcbiAgY29tcGlsZVNlYXJjaChcIkJcIiwgXCJ4XCIgKyBwcmVkaWNhdGUgKyBcInlcIiwgcmV2ZXJzZWQsIFtcInlcIl0sIHRydWUsIGVhcmx5T3V0KSxcbiAgY29tcGlsZVNlYXJjaChcIlBcIiwgXCJjKHgseSlcIiArIHByZWRpY2F0ZSArIFwiMFwiLCByZXZlcnNlZCwgW1wieVwiLCBcImNcIl0sIGZhbHNlLCBlYXJseU91dCksXG4gIGNvbXBpbGVTZWFyY2goXCJRXCIsIFwiYyh4LHkpXCIgKyBwcmVkaWNhdGUgKyBcIjBcIiwgcmV2ZXJzZWQsIFtcInlcIiwgXCJjXCJdLCB0cnVlLCBlYXJseU91dCksXG5cImZ1bmN0aW9uIGRpc3BhdGNoQnNlYXJjaFwiLCBzdWZmaXgsIFwiKGEseSxjLGwsaCl7XFxcbmlmKGEuc2hhcGUpe1xcXG5pZih0eXBlb2YoYyk9PT0nZnVuY3Rpb24nKXtcXFxucmV0dXJuIFEoYSwobD09PXVuZGVmaW5lZCk/MDpsfDAsKGg9PT11bmRlZmluZWQpP2Euc2hhcGVbMF0tMTpofDAseSxjKVxcXG59ZWxzZXtcXFxucmV0dXJuIEIoYSwoYz09PXVuZGVmaW5lZCk/MDpjfDAsKGw9PT11bmRlZmluZWQpP2Euc2hhcGVbMF0tMTpsfDAseSlcXFxufX1lbHNle1xcXG5pZih0eXBlb2YoYyk9PT0nZnVuY3Rpb24nKXtcXFxucmV0dXJuIFAoYSwobD09PXVuZGVmaW5lZCk/MDpsfDAsKGg9PT11bmRlZmluZWQpP2EubGVuZ3RoLTE6aHwwLHksYylcXFxufWVsc2V7XFxcbnJldHVybiBBKGEsKGM9PT11bmRlZmluZWQpPzA6Y3wwLChsPT09dW5kZWZpbmVkKT9hLmxlbmd0aC0xOmx8MCx5KVxcXG59fX1cXFxucmV0dXJuIGRpc3BhdGNoQnNlYXJjaFwiLCBzdWZmaXhdLmpvaW4oXCJcIikpXG4gIHJldHVybiByZXN1bHQoKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2U6IGNvbXBpbGVCb3VuZHNTZWFyY2goXCI+PVwiLCBmYWxzZSwgXCJHRVwiKSxcbiAgZ3Q6IGNvbXBpbGVCb3VuZHNTZWFyY2goXCI+XCIsIGZhbHNlLCBcIkdUXCIpLFxuICBsdDogY29tcGlsZUJvdW5kc1NlYXJjaChcIjxcIiwgdHJ1ZSwgXCJMVFwiKSxcbiAgbGU6IGNvbXBpbGVCb3VuZHNTZWFyY2goXCI8PVwiLCB0cnVlLCBcIkxFXCIpLFxuICBlcTogY29tcGlsZUJvdW5kc1NlYXJjaChcIi1cIiwgdHJ1ZSwgXCJFUVwiLCB0cnVlKVxufVxuIiwiXCJ1c2Ugc3RyaWN0XCJcblxudmFyIGJvdW5kcyA9IHJlcXVpcmUoXCJiaW5hcnktc2VhcmNoLWJvdW5kc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZVRyaWVcblxuZnVuY3Rpb24gVHJpZShzeW1ib2xzLCBjaGlsZHJlbiwgdmFsdWUpIHtcbiAgdGhpcy5zeW1ib2xzID0gc3ltYm9sc1xuICB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW5cbiAgdGhpcy52YWx1ZSA9IHZhbHVlXG59XG5cbnZhciBwcm90byA9IFRyaWUucHJvdG90eXBlXG5cbnByb3RvLnNldCA9IGZ1bmN0aW9uKHMsIHZhbHVlKSB7XG4gIGlmKHMuc2hhcGUpIHtcbiAgICB2YXIgdiA9IHRoaXNcbiAgICB2YXIgbiA9IHMuc2hhcGVbMF1cbiAgICBmb3IodmFyIGk9MDsgaTxuOyArK2kpIHtcbiAgICAgIHZhciBjID0gcy5nZXQoaSlcbiAgICAgIHZhciBqID0gYm91bmRzLmdlKHYuc3ltYm9scywgYylcbiAgICAgIGlmKGogPCB2LnN5bWJvbHMubGVuZ3RoICYmIHYuc3ltYm9sc1tqXSA9PT0gYykge1xuICAgICAgICB2ID0gdi5jaGlsZHJlbltqXVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGwgPSBuZXcgVHJpZShbXSwgW10sIHZhbHVlKVxuICAgICAgICBmb3IodmFyIGs9bi0xOyBrPmk7IC0taykge1xuICAgICAgICAgIGwgPSBuZXcgVHJpZShbcy5nZXQoayldLCBbbF0pXG4gICAgICAgIH1cbiAgICAgICAgdi5zeW1ib2xzLnNwbGljZShqLCAwLCBjKVxuICAgICAgICB2LmNoaWxkcmVuLnNwbGljZShqLCAwLCBsKVxuICAgICAgICByZXR1cm4gdmFsdWVcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHYudmFsdWUgPSB2YWx1ZVxuICB9IGVsc2Uge1xuICAgIHZhciB2ID0gdGhpc1xuICAgIHZhciBuID0gcy5sZW5ndGhcbiAgICBmb3IodmFyIGk9MDsgaTxuOyArK2kpIHtcbiAgICAgIHZhciBjID0gc1tpXVxuICAgICAgdmFyIGogPSBib3VuZHMuZ2Uodi5zeW1ib2xzLCBjKVxuICAgICAgaWYoaiA8IHYuc3ltYm9scy5sZW5ndGggJiYgdi5zeW1ib2xzW2pdID09PSBjKSB7XG4gICAgICAgIHYgPSB2LmNoaWxkcmVuW2pdXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbCA9IG5ldyBUcmllKFtdLCBbXSwgdmFsdWUpXG4gICAgICAgIGZvcih2YXIgaz1uLTE7IGs+aTsgLS1rKSB7XG4gICAgICAgICAgbCA9IG5ldyBUcmllKFtzW2tdXSwgW2xdKVxuICAgICAgICB9XG4gICAgICAgIHYuc3ltYm9scy5zcGxpY2UoaiwgMCwgYylcbiAgICAgICAgdi5jaGlsZHJlbi5zcGxpY2UoaiwgMCwgbClcbiAgICAgICAgcmV0dXJuIHZhbHVlXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB2LnZhbHVlID0gdmFsdWVcbiAgfVxufVxuXG5wcm90by5nZXQgPSBmdW5jdGlvbihzKSB7XG4gIGlmKHMuc2hhcGUpIHtcbiAgICB2YXIgdiA9IHRoaXNcbiAgICB2YXIgbiA9IHMuc2hhcGVbMF1cbiAgICBmb3IodmFyIGk9MDsgaTxuOyArK2kpIHtcbiAgICAgIHZhciBjID0gcy5nZXQoaSlcbiAgICAgIHZhciBqID0gYm91bmRzLmVxKHYuc3ltYm9scywgYylcbiAgICAgIGlmKGogPCAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdiA9IHYuY2hpbGRyZW5bal1cbiAgICB9XG4gICAgcmV0dXJuIHYudmFsdWVcbiAgfSBlbHNlIHtcbiAgICB2YXIgdiA9IHRoaXNcbiAgICB2YXIgbiA9IHMubGVuZ3RoXG4gICAgZm9yKHZhciBpPTA7IGk8bjsgKytpKSB7XG4gICAgICB2YXIgYyA9IHNbaV1cbiAgICAgIHZhciBqID0gYm91bmRzLmVxKHYuc3ltYm9scywgYylcbiAgICAgIGlmKGogPCAwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdiA9IHYuY2hpbGRyZW5bal1cbiAgICB9XG4gICAgcmV0dXJuIHYudmFsdWVcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVUcmllKCkge1xuICByZXR1cm4gbmV3IFRyaWUoW10sW10pXG59IiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihtZXNzZW5nZXIsIG9wdHMpIHtcbiAgcmV0dXJuIHJlcXVpcmUoJy4vc2lnbmFsbGVyLmpzJykobWVzc2VuZ2VyLCBleHRlbmQoe1xuICAgIGNvbm5lY3Q6IHJlcXVpcmUoJy4vcHJpbXVzLWxvYWRlcicpXG4gIH0sIG9wdHMpKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gbWVzc2VuZ2VyIGV2ZW50c1xuICBkYXRhRXZlbnQ6ICdkYXRhJyxcbiAgb3BlbkV2ZW50OiAnb3BlbicsXG4gIGNsb3NlRXZlbnQ6ICdjbG9zZScsXG4gIGVycm9yRXZlbnQ6ICdlcnJvcicsXG5cbiAgLy8gbWVzc2VuZ2VyIGZ1bmN0aW9uc1xuICB3cml0ZU1ldGhvZDogJ3dyaXRlJyxcbiAgY2xvc2VNZXRob2Q6ICdjbG9zZScsXG5cbiAgLy8gbGVhdmUgdGltZW91dCAobXMpXG4gIGxlYXZlVGltZW91dDogMzAwMFxufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgncnRjLXNpZ25hbGxlcicpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbnZhciByb2xlcyA9IFsnYScsICdiJ107XG5cbi8qKlxuICAjIyMjIGFubm91bmNlXG5cbiAgYGBgXG4gIC9hbm5vdW5jZXwlbWV0YWRhdGElfHtcImlkXCI6IFwiLi4uXCIsIC4uLiB9XG4gIGBgYFxuXG4gIFdoZW4gYW4gYW5ub3VuY2UgbWVzc2FnZSBpcyByZWNlaXZlZCBieSB0aGUgc2lnbmFsbGVyLCB0aGUgYXR0YWNoZWRcbiAgb2JqZWN0IGRhdGEgaXMgZGVjb2RlZCBhbmQgdGhlIHNpZ25hbGxlciBlbWl0cyBhbiBgYW5ub3VuY2VgIG1lc3NhZ2UuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxsZXIpIHtcblxuICBmdW5jdGlvbiBjb3B5RGF0YSh0YXJnZXQsIHNvdXJjZSkge1xuICAgIGlmICh0YXJnZXQgJiYgc291cmNlKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRhdGFBbGxvd2VkKGRhdGEpIHtcbiAgICB2YXIgZXZ0ID0ge1xuICAgICAgZGF0YTogZGF0YSxcbiAgICAgIGFsbG93OiB0cnVlXG4gICAgfTtcblxuICAgIHNpZ25hbGxlcigncGVlcjpmaWx0ZXInLCBldnQpO1xuXG4gICAgcmV0dXJuIGV2dC5hbGxvdztcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihhcmdzLCBtZXNzYWdlVHlwZSwgc3JjRGF0YSwgc3JjU3RhdGUsIGlzRE0pIHtcbiAgICB2YXIgZGF0YSA9IGFyZ3NbMF07XG4gICAgdmFyIHBlZXI7XG5cbiAgICBkZWJ1ZygnYW5ub3VuY2UgaGFuZGxlciBpbnZva2VkLCByZWNlaXZlZCBkYXRhOiAnLCBkYXRhKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgdmFsaWQgZGF0YSB0aGVuIHByb2Nlc3NcbiAgICBpZiAoZGF0YSAmJiBkYXRhLmlkICYmIGRhdGEuaWQgIT09IHNpZ25hbGxlci5pZCkge1xuICAgICAgaWYgKCEgZGF0YUFsbG93ZWQoZGF0YSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gY2hlY2sgdG8gc2VlIGlmIHRoaXMgaXMgYSBrbm93biBwZWVyXG4gICAgICBwZWVyID0gc2lnbmFsbGVyLnBlZXJzLmdldChkYXRhLmlkKTtcblxuICAgICAgLy8gdHJpZ2dlciB0aGUgcGVlciBjb25uZWN0ZWQgZXZlbnQgdG8gZmxhZyB0aGF0IHdlIGtub3cgYWJvdXQgYVxuICAgICAgLy8gcGVlciBjb25uZWN0aW9uLiBUaGUgcGVlciBoYXMgcGFzc2VkIHRoZSBcImZpbHRlclwiIGNoZWNrIGJ1dCBtYXlcbiAgICAgIC8vIGJlIGFubm91bmNlZCAvIHVwZGF0ZWQgZGVwZW5kaW5nIG9uIHByZXZpb3VzIGNvbm5lY3Rpb24gc3RhdHVzXG4gICAgICBzaWduYWxsZXIoJ3BlZXI6Y29ubmVjdGVkJywgZGF0YS5pZCwgZGF0YSk7XG5cbiAgICAgIC8vIGlmIHRoZSBwZWVyIGlzIGV4aXN0aW5nLCB0aGVuIHVwZGF0ZSB0aGUgZGF0YVxuICAgICAgaWYgKHBlZXIgJiYgKCEgcGVlci5pbmFjdGl2ZSkpIHtcbiAgICAgICAgZGVidWcoJ3NpZ25hbGxlcjogJyArIHNpZ25hbGxlci5pZCArICcgcmVjZWl2ZWQgdXBkYXRlLCBkYXRhOiAnLCBkYXRhKTtcblxuICAgICAgICAvLyB1cGRhdGUgdGhlIGRhdGFcbiAgICAgICAgY29weURhdGEocGVlci5kYXRhLCBkYXRhKTtcblxuICAgICAgICAvLyB0cmlnZ2VyIHRoZSBwZWVyIHVwZGF0ZSBldmVudFxuICAgICAgICByZXR1cm4gc2lnbmFsbGVyKCdwZWVyOnVwZGF0ZScsIGRhdGEsIHNyY0RhdGEpO1xuICAgICAgfVxuXG4gICAgICAvLyBjcmVhdGUgYSBuZXcgcGVlclxuICAgICAgcGVlciA9IHtcbiAgICAgICAgaWQ6IGRhdGEuaWQsXG5cbiAgICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgbG9jYWwgcm9sZSBpbmRleFxuICAgICAgICByb2xlSWR4OiBbZGF0YS5pZCwgc2lnbmFsbGVyLmlkXS5zb3J0KCkuaW5kZXhPZihkYXRhLmlkKSxcblxuICAgICAgICAvLyBpbml0aWFsaXNlIHRoZSBwZWVyIGRhdGFcbiAgICAgICAgZGF0YToge31cbiAgICAgIH07XG5cbiAgICAgIC8vIGluaXRpYWxpc2UgdGhlIHBlZXIgZGF0YVxuICAgICAgY29weURhdGEocGVlci5kYXRhLCBkYXRhKTtcblxuICAgICAgLy8gcmVzZXQgaW5hY3Rpdml0eSBzdGF0ZVxuICAgICAgY2xlYXJUaW1lb3V0KHBlZXIubGVhdmVUaW1lcik7XG4gICAgICBwZWVyLmluYWN0aXZlID0gZmFsc2U7XG5cbiAgICAgIC8vIHNldCB0aGUgcGVlciBkYXRhXG4gICAgICBzaWduYWxsZXIucGVlcnMuc2V0KGRhdGEuaWQsIHBlZXIpO1xuXG4gICAgICAvLyBpZiB0aGlzIGlzIGFuIGluaXRpYWwgYW5ub3VuY2UgbWVzc2FnZSAobm8gdmVjdG9yIGNsb2NrIGF0dGFjaGVkKVxuICAgICAgLy8gdGhlbiBzZW5kIGEgYW5ub3VuY2UgcmVwbHlcbiAgICAgIGlmIChzaWduYWxsZXIuYXV0b3JlcGx5ICYmICghIGlzRE0pKSB7XG4gICAgICAgIHNpZ25hbGxlclxuICAgICAgICAgIC50byhkYXRhLmlkKVxuICAgICAgICAgIC5zZW5kKCcvYW5ub3VuY2UnLCBzaWduYWxsZXIuYXR0cmlidXRlcyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGVtaXQgYSBuZXcgcGVlciBhbm5vdW5jZSBldmVudFxuICAgICAgcmV0dXJuIHNpZ25hbGxlcigncGVlcjphbm5vdW5jZScsIGRhdGEsIHBlZXIpO1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMjIHNpZ25hbGxlciBtZXNzYWdlIGhhbmRsZXJzXG5cbioqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNpZ25hbGxlciwgb3B0cykge1xuICByZXR1cm4ge1xuICAgIGFubm91bmNlOiByZXF1aXJlKCcuL2Fubm91bmNlJykoc2lnbmFsbGVyLCBvcHRzKSxcbiAgICBsZWF2ZTogcmVxdWlyZSgnLi9sZWF2ZScpKHNpZ25hbGxlciwgb3B0cylcbiAgfTtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIyMgbGVhdmVcblxuICBgYGBcbiAgL2xlYXZlfHtcImlkXCI6XCIuLi5cIn1cbiAgYGBgXG5cbiAgV2hlbiBhIGxlYXZlIG1lc3NhZ2UgaXMgcmVjZWl2ZWQgZnJvbSBhIHBlZXIsIHdlIGNoZWNrIHRvIHNlZSBpZiB0aGF0IGlzXG4gIGEgcGVlciB0aGF0IHdlIGFyZSBtYW5hZ2luZyBzdGF0ZSBpbmZvcm1hdGlvbiBmb3IgYW5kIGlmIHdlIGFyZSB0aGVuIHRoZVxuICBwZWVyIHN0YXRlIGlzIHJlbW92ZWQuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxsZXIsIG9wdHMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICB2YXIgZGF0YSA9IGFyZ3NbMF07XG4gICAgdmFyIHBlZXIgPSBzaWduYWxsZXIucGVlcnMuZ2V0KGRhdGEgJiYgZGF0YS5pZCk7XG5cbiAgICBpZiAocGVlcikge1xuICAgICAgLy8gc3RhcnQgdGhlIGluYWN0aXZpdHkgdGltZXJcbiAgICAgIHBlZXIubGVhdmVUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHBlZXIuaW5hY3RpdmUgPSB0cnVlO1xuICAgICAgICBzaWduYWxsZXIoJ3BlZXI6bGVhdmUnLCBkYXRhLmlkLCBwZWVyKTtcbiAgICAgIH0sIG9wdHMubGVhdmVUaW1lb3V0KTtcbiAgICB9XG5cbiAgICAvLyBlbWl0IHRoZSBldmVudFxuICAgIHNpZ25hbGxlcigncGVlcjpkaXNjb25uZWN0ZWQnLCBkYXRhLmlkLCBwZWVyKTtcbiAgfTtcbn07XG4iLCIvKipcbiAqIGN1aWQuanNcbiAqIENvbGxpc2lvbi1yZXNpc3RhbnQgVUlEIGdlbmVyYXRvciBmb3IgYnJvd3NlcnMgYW5kIG5vZGUuXG4gKiBTZXF1ZW50aWFsIGZvciBmYXN0IGRiIGxvb2t1cHMgYW5kIHJlY2VuY3kgc29ydGluZy5cbiAqIFNhZmUgZm9yIGVsZW1lbnQgSURzIGFuZCBzZXJ2ZXItc2lkZSBsb29rdXBzLlxuICpcbiAqIEV4dHJhY3RlZCBmcm9tIENMQ1RSXG4gKiBcbiAqIENvcHlyaWdodCAoYykgRXJpYyBFbGxpb3R0IDIwMTJcbiAqIE1JVCBMaWNlbnNlXG4gKi9cblxuLypnbG9iYWwgd2luZG93LCBuYXZpZ2F0b3IsIGRvY3VtZW50LCByZXF1aXJlLCBwcm9jZXNzLCBtb2R1bGUgKi9cbihmdW5jdGlvbiAoYXBwKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIG5hbWVzcGFjZSA9ICdjdWlkJyxcbiAgICBjID0gMCxcbiAgICBibG9ja1NpemUgPSA0LFxuICAgIGJhc2UgPSAzNixcbiAgICBkaXNjcmV0ZVZhbHVlcyA9IE1hdGgucG93KGJhc2UsIGJsb2NrU2l6ZSksXG5cbiAgICBwYWQgPSBmdW5jdGlvbiBwYWQobnVtLCBzaXplKSB7XG4gICAgICB2YXIgcyA9IFwiMDAwMDAwMDAwXCIgKyBudW07XG4gICAgICByZXR1cm4gcy5zdWJzdHIocy5sZW5ndGgtc2l6ZSk7XG4gICAgfSxcblxuICAgIHJhbmRvbUJsb2NrID0gZnVuY3Rpb24gcmFuZG9tQmxvY2soKSB7XG4gICAgICByZXR1cm4gcGFkKChNYXRoLnJhbmRvbSgpICpcbiAgICAgICAgICAgIGRpc2NyZXRlVmFsdWVzIDw8IDApXG4gICAgICAgICAgICAudG9TdHJpbmcoYmFzZSksIGJsb2NrU2l6ZSk7XG4gICAgfSxcblxuICAgIHNhZmVDb3VudGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgYyA9IChjIDwgZGlzY3JldGVWYWx1ZXMpID8gYyA6IDA7XG4gICAgICBjKys7IC8vIHRoaXMgaXMgbm90IHN1YmxpbWluYWxcbiAgICAgIHJldHVybiBjIC0gMTtcbiAgICB9LFxuXG4gICAgYXBpID0gZnVuY3Rpb24gY3VpZCgpIHtcbiAgICAgIC8vIFN0YXJ0aW5nIHdpdGggYSBsb3dlcmNhc2UgbGV0dGVyIG1ha2VzXG4gICAgICAvLyBpdCBIVE1MIGVsZW1lbnQgSUQgZnJpZW5kbHkuXG4gICAgICB2YXIgbGV0dGVyID0gJ2MnLCAvLyBoYXJkLWNvZGVkIGFsbG93cyBmb3Igc2VxdWVudGlhbCBhY2Nlc3NcblxuICAgICAgICAvLyB0aW1lc3RhbXBcbiAgICAgICAgLy8gd2FybmluZzogdGhpcyBleHBvc2VzIHRoZSBleGFjdCBkYXRlIGFuZCB0aW1lXG4gICAgICAgIC8vIHRoYXQgdGhlIHVpZCB3YXMgY3JlYXRlZC5cbiAgICAgICAgdGltZXN0YW1wID0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpKS50b1N0cmluZyhiYXNlKSxcblxuICAgICAgICAvLyBQcmV2ZW50IHNhbWUtbWFjaGluZSBjb2xsaXNpb25zLlxuICAgICAgICBjb3VudGVyLFxuXG4gICAgICAgIC8vIEEgZmV3IGNoYXJzIHRvIGdlbmVyYXRlIGRpc3RpbmN0IGlkcyBmb3IgZGlmZmVyZW50XG4gICAgICAgIC8vIGNsaWVudHMgKHNvIGRpZmZlcmVudCBjb21wdXRlcnMgYXJlIGZhciBsZXNzXG4gICAgICAgIC8vIGxpa2VseSB0byBnZW5lcmF0ZSB0aGUgc2FtZSBpZClcbiAgICAgICAgZmluZ2VycHJpbnQgPSBhcGkuZmluZ2VycHJpbnQoKSxcblxuICAgICAgICAvLyBHcmFiIHNvbWUgbW9yZSBjaGFycyBmcm9tIE1hdGgucmFuZG9tKClcbiAgICAgICAgcmFuZG9tID0gcmFuZG9tQmxvY2soKSArIHJhbmRvbUJsb2NrKCk7XG5cbiAgICAgICAgY291bnRlciA9IHBhZChzYWZlQ291bnRlcigpLnRvU3RyaW5nKGJhc2UpLCBibG9ja1NpemUpO1xuXG4gICAgICByZXR1cm4gIChsZXR0ZXIgKyB0aW1lc3RhbXAgKyBjb3VudGVyICsgZmluZ2VycHJpbnQgKyByYW5kb20pO1xuICAgIH07XG5cbiAgYXBpLnNsdWcgPSBmdW5jdGlvbiBzbHVnKCkge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoKS5nZXRUaW1lKCkudG9TdHJpbmcoMzYpLFxuICAgICAgY291bnRlcixcbiAgICAgIHByaW50ID0gYXBpLmZpbmdlcnByaW50KCkuc2xpY2UoMCwxKSArXG4gICAgICAgIGFwaS5maW5nZXJwcmludCgpLnNsaWNlKC0xKSxcbiAgICAgIHJhbmRvbSA9IHJhbmRvbUJsb2NrKCkuc2xpY2UoLTIpO1xuXG4gICAgICBjb3VudGVyID0gc2FmZUNvdW50ZXIoKS50b1N0cmluZygzNikuc2xpY2UoLTQpO1xuXG4gICAgcmV0dXJuIGRhdGUuc2xpY2UoLTIpICsgXG4gICAgICBjb3VudGVyICsgcHJpbnQgKyByYW5kb207XG4gIH07XG5cbiAgYXBpLmdsb2JhbENvdW50ID0gZnVuY3Rpb24gZ2xvYmFsQ291bnQoKSB7XG4gICAgLy8gV2Ugd2FudCB0byBjYWNoZSB0aGUgcmVzdWx0cyBvZiB0aGlzXG4gICAgdmFyIGNhY2hlID0gKGZ1bmN0aW9uIGNhbGMoKSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgIGNvdW50ID0gMDtcblxuICAgICAgICBmb3IgKGkgaW4gd2luZG93KSB7XG4gICAgICAgICAgY291bnQrKztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgIH0oKSk7XG5cbiAgICBhcGkuZ2xvYmFsQ291bnQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBjYWNoZTsgfTtcbiAgICByZXR1cm4gY2FjaGU7XG4gIH07XG5cbiAgYXBpLmZpbmdlcnByaW50ID0gZnVuY3Rpb24gYnJvd3NlclByaW50KCkge1xuICAgIHJldHVybiBwYWQoKG5hdmlnYXRvci5taW1lVHlwZXMubGVuZ3RoICtcbiAgICAgIG5hdmlnYXRvci51c2VyQWdlbnQubGVuZ3RoKS50b1N0cmluZygzNikgK1xuICAgICAgYXBpLmdsb2JhbENvdW50KCkudG9TdHJpbmcoMzYpLCA0KTtcbiAgfTtcblxuICAvLyBkb24ndCBjaGFuZ2UgYW55dGhpbmcgZnJvbSBoZXJlIGRvd24uXG4gIGlmIChhcHAucmVnaXN0ZXIpIHtcbiAgICBhcHAucmVnaXN0ZXIobmFtZXNwYWNlLCBhcGkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBhcGk7XG4gIH0gZWxzZSB7XG4gICAgYXBwW25hbWVzcGFjZV0gPSBhcGk7XG4gIH1cblxufSh0aGlzLmFwcGxpdHVkZSB8fCB0aGlzKSk7XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVWYXJpYWJsZSA9IC9cXHtcXHtcXHMqKFteXFx9XSs/KVxccypcXH1cXH0vO1xudmFyIG1vZHMgPSByZXF1aXJlKCcuL21vZHMnKTtcblxuLyoqXG4gICMgZm9ybWF0dGVyXG5cbiAgVGhpcyBpcyBhIHNpbXBsZSBsaWJyYXJ5IGRlc2lnbmVkIHRvIGRvIG9uZSB0aGluZyBhbmQgb25lIHRoaW5nIG9ubHkgLVxuICByZXBsYWNlIHZhcmlhYmxlcyBpbiBzdHJpbmdzIHdpdGggdmFyaWFibGUgdmFsdWVzLiAgSXQgaXMgYnVpbHQgaW4gc3VjaCBhXG4gIHdheSB0aGF0IHRoZSBmb3JtYXR0ZXIgc3RyaW5ncyBhcmUgcGFyc2VkIGFuZCB5b3UgYXJlIHByb3ZpZGVkIHdpdGggYVxuICBmdW5jdGlvbiB0aGFuIGNhbiBlZmZpY2llbnRseSBiZSBjYWxsZWQgdG8gcHJvdmlkZSB0aGUgY3VzdG9tIG91dHB1dC5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgPDw8IGV4YW1wbGVzL2xpa2Vmb29kLmpzXG5cbiAgX19OT1RFX186IEZvcm1hdHRlciBpcyBub3QgZGVzaWduZWQgdG8gYmUgYSB0ZW1wbGF0aW5nIGxpYnJhcnkgYW5kIGlmXG4gIHlvdSBhcmUgYWxyZWFkeSB1c2luZyBzb21ldGhpbmcgbGlrZSBIYW5kbGViYXJzIG9yXG4gIFtob2dhbl0oaHR0cHM6Ly9naXRodWIuY29tL3R3aXR0ZXIvaG9nYW4uanMpIGluIHlvdXIgbGlicmFyeSBvciBhcHBsaWNhdGlvblxuICBzdGFjayBjb25zaWRlciB1c2luZyB0aGVtIGluc3RlYWQuXG5cbiAgIyMgVXNpbmcgbmFtZWQgdmFyaWFibGVzXG5cbiAgSW4gdGhlIGV4YW1wbGVzIGFib3ZlIHdlIHNhdyBob3cgdGhlIGZvcm1hdHRlciBjYW4gYmUgdXNlZCB0byByZXBsYWNlXG4gIGZ1bmN0aW9uIGFyZ3VtZW50cyBpbiBhIGZvcm1hdHRlciBzdHJpbmcuICBXZSBjYW4gYWxzbyBzZXQgdXAgYSBmb3JtYXR0ZXJcbiAgdG8gdXNlIHBhcnRpY3VsYXIga2V5IHZhbHVlcyBmcm9tIGFuIGlucHV0IHN0cmluZyBpbnN0ZWFkIGlmIHRoYXQgaXMgbW9yZVxuICBzdWl0YWJsZTpcblxuICA8PDwgZXhhbXBsZXMvbGlrZWZvb2QtbmFtZWQuanNcblxuICAjIyBOZXN0ZWQgUHJvcGVydHkgVmFsdWVzXG5cbiAgU2luY2UgdmVyc2lvbiBgMC4xLjBgIHlvdSBjYW4gYWxzbyBhY2Nlc3MgbmVzdGVkIHByb3BlcnR5IHZhbHVlcywgYXMgeW91XG4gIGNhbiB3aXRoIHRlbXBsYXRlcyBsaWtlIGhhbmRsZWJhcnMuXG5cbiAgIyMgUGFydGlhbCBFeGVjdXRpb25cblxuICBTaW5jZSB2ZXJzaW9uIGAwLjMueGAgZm9ybWF0dGVyIGFsc28gc3VwcG9ydHMgcGFydGlhbCBleGVjdXRpb24gd2hlbiB1c2luZ1xuICBpbmRleGVkIGFyZ3VtZW50cyAoZS5nLiBge3sgMCB9fWAsIGB7eyAxIH19YCwgZXRjKS4gIEZvciBleGFtcGxlOlxuXG4gIDw8PCBleGFtcGxlcy9wYXJ0aWFsLmpzXG5cbiAgSW4gdGhlIGNhc2UgYWJvdmUsIHRoZSBvcmlnaW5hbCBmb3JtYXR0ZXIgZnVuY3Rpb24gcmV0dXJuZWQgYnkgYGZvcm1hdHRlcmBcbiAgZGlkIG5vdCByZWNlaXZlIGVub3VnaCB2YWx1ZXMgdG8gcmVzb2x2ZSBhbGwgdGhlIHJlcXVpcmVkIHZhcmlhYmxlcy4gIEFzXG4gIHN1Y2ggaXQgcmV0dXJuZWQgYSBmdW5jdGlvbiByZWFkeSB0byBhY2NlcHQgdGhlIHJlbWFpbmluZyB2YWx1ZXMuXG5cbiAgT25jZSBhbGwgdmFsdWVzIGhhdmUgYmVlbiByZWNlaXZlZCB0aGUgb3V0cHV0IHdpbGwgYmUgZ2VuZXJhdGVkLlxuXG4gICMjIFBlcmZvcm1hbmNlXG5cbiAgSSd2ZSBkb25lIHNvbWVcbiAgW3BlcmZvcm1hbmNlIGJlbmNobWFya3NdKGh0dHA6Ly9qc3BlcmYuY29tL2Zvcm1hdHRlci1wZXJmb3JtYW5jZSkgYW5kXG4gIGZvcm1hdHRlciBpcyBmYXN0ZXIgdGhhbiBoYW5kbGViYXJzLCBidXQgdGhhdCBpc24ndCBzdXJwcmlzaW5nIGFzIGl0IGlzIGZhclxuICBzaW1wbGVyIGFuZCBkb2Vzbid0IGhhdmUgdGhlIHNtYXJ0cyBvZiBIQlMuICBUaGUgdGVzdCBpcyByZWFsbHkgdGhlcmUgdG9cbiAgZW5zdXJlIHRoYXQgSSBkaWRuJ3QgZG8gYW55dGhpbmcgdG9vIHNpbGx5Li4uXG5cbiAgQWRkaXRpb25hbGx5LCBpdCBzaG91bGQgYmUgbm90ZWQgdGhhdCB1c2luZyBmb3JtYXR0ZXIgaXMgMTAwJSBzbG93ZXIgdGhhblxuICBjb25jYXRlbmF0aW5nIHN0cmluZ3MsIHNvIGRvbid0IHVzZSBpdCB3aGVyZSBwZXJmb3JtYW5jZSBpcyBjcml0aWNhbC4gXG4gIERvIHVzZSBpdCB3aGVyZSBub3QgcmVwZWF0aW5nIHlvdXJzZWxmIGlzLlxuKiovXG5cbnZhciBmb3JtYXR0ZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZvcm1hdCwgb3B0cykge1xuICAvLyBleHRyYWN0IHRoZSBtYXRjaGVzIGZyb20gdGhlIHN0cmluZ1xuICB2YXIgcGFydHMgPSBbXTtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICB2YXIgY2h1bms7XG4gIHZhciB2YXJuYW1lO1xuICB2YXIgdmFyUGFydHM7XG4gIHZhciBtYXRjaCA9IHJlVmFyaWFibGUuZXhlYyhmb3JtYXQpO1xuICB2YXIgaXNOdW1lcmljO1xuICB2YXIgb3V0cHV0SWR4ID0gMDtcbiAgdmFyIGlnbm9yZU51bWVyaWMgPSAob3B0cyB8fCB7fSkuaWdub3JlTnVtZXJpYztcblxuICB3aGlsZSAobWF0Y2gpIHtcbiAgICAvLyBnZXQgdGhlIHByZW1hdGNoIGNodW5rXG4gICAgY2h1bmsgPSBmb3JtYXQuc2xpY2UoMCwgbWF0Y2guaW5kZXgpO1xuICAgIFxuICAgIC8vIGlmIHdlIGhhdmUgYSB2YWxpZCBjaHVuaywgYWRkIGl0IHRvIHRoZSBwYXJ0c1xuICAgIGlmIChjaHVuaykge1xuICAgICAgb3V0cHV0W291dHB1dElkeCsrXSA9IGNodW5rO1xuICAgIH1cbiAgICBcbiAgICB2YXJQYXJ0cyA9IG1hdGNoWzFdLnNwbGl0KC9cXHMqXFx8XFxzKi8pO1xuICAgIG1hdGNoWzFdID0gdmFyUGFydHNbMF07XG4gICAgXG4gICAgLy8gZXh0cmFjdCB0aGUgdmFybmFtZVxuICAgIHZhcm5hbWUgPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xuICAgIGlzTnVtZXJpYyA9ICFpc05hTih2YXJuYW1lKTtcblxuICAgIC8vIGlmIHRoaXMgaXMgYSBudW1lcmljIHJlcGxhY2VtZW50IGV4cHJlc3Npb24sIGFuZCB3ZSBhcmUgaWdub3JpbmdcbiAgICAvLyB0aG9zZSBleHByZXNzaW9ucyB0aGVuIHBhc3MgaXQgdGhyb3VnaCB0byB0aGUgb3V0cHV0XG4gICAgaWYgKGlnbm9yZU51bWVyaWMgJiYgaXNOdW1lcmljKSB7XG4gICAgICBvdXRwdXRbb3V0cHV0SWR4KytdID0gbWF0Y2hbMF07XG4gICAgfVxuICAgIC8vIG90aGVyd2lzZSwgaGFuZGxlIG5vcm1hbGx5XG4gICAgZWxzZSB7XG4gICAgICAvLyBleHRyYWN0IHRoZSBleHByZXNzaW9uIGFuZCBhZGQgaXQgYXMgYSBmdW5jdGlvblxuICAgICAgcGFydHNbcGFydHMubGVuZ3RoXSA9IHtcbiAgICAgICAgaWR4OiAob3V0cHV0SWR4KyspLFxuICAgICAgICBudW1lcmljOiBpc051bWVyaWMsXG4gICAgICAgIHZhcm5hbWU6IGlzTnVtZXJpYyA/IHZhcm5hbWUgOiBtYXRjaFsxXSxcbiAgICAgICAgbW9kaWZpZXJzOiB2YXJQYXJ0cy5sZW5ndGggPiAxID8gY3JlYXRlTW9kaWZpZXJzKHZhclBhcnRzLnNsaWNlKDEpKSA6IFtdXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHJlbW92ZSB0aGlzIG1hdGNoZWQgY2h1bmsgYW5kIHJlcGxhY2VyIGZyb20gdGhlIHN0cmluZ1xuICAgIGZvcm1hdCA9IGZvcm1hdC5zbGljZShtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCk7XG5cbiAgICAvLyBjaGVjayBmb3IgdGhlIG5leHQgbWF0Y2hcbiAgICBtYXRjaCA9IHJlVmFyaWFibGUuZXhlYyhmb3JtYXQpO1xuICB9XG4gIFxuICAvLyBpZiB3ZSBzdGlsbCBoYXZlIHNvbWUgb2YgdGhlIGZvcm1hdCBzdHJpbmcgcmVtYWluaW5nLCBhZGQgaXQgdG8gdGhlIGxpc3RcbiAgaWYgKGZvcm1hdCkge1xuICAgIG91dHB1dFtvdXRwdXRJZHgrK10gPSBmb3JtYXQ7XG4gIH1cblxuICByZXR1cm4gY29sbGVjdChwYXJ0cywgb3V0cHV0KTtcbn07XG5cbmZvcm1hdHRlci5lcnJvciA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgLy8gY3JlYXRlIHRoZSBmb3JtYXRcbiAgdmFyIGZvcm1hdCA9IGZvcm1hdHRlcihtZXNzYWdlKTtcbiAgXG4gIHJldHVybiBmdW5jdGlvbihlcnIpIHtcbiAgICB2YXIgb3V0cHV0O1xuICAgIFxuICAgIC8vIGlmIG5vIGVycm9yIGhhcyBiZWVuIHN1cHBsaWVkLCB0aGVuIHBhc3MgaXQgc3RyYWlnaHQgdGhyb3VnaFxuICAgIGlmICghIGVycikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG91dHB1dCA9IG5ldyBFcnJvcihcbiAgICAgIGZvcm1hdC5hcHBseShudWxsLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSk7XG5cbiAgICBvdXRwdXQuX29yaWdpbmFsID0gZXJyO1xuXG4gICAgLy8gcmV0dXJuIHRoZSBuZXcgZXJyb3JcbiAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xufTtcblxuZnVuY3Rpb24gY29sbGVjdChwYXJ0cywgcmVzb2x2ZWQsIGluZGV4U2hpZnQpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25hbHNcbiAgaW5kZXhTaGlmdCA9IGluZGV4U2hpZnQgfHwgMDtcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG91dHB1dCA9IFtdLmNvbmNhdChyZXNvbHZlZCk7XG4gICAgdmFyIHVucmVzb2x2ZWQ7XG4gICAgdmFyIGlpO1xuICAgIHZhciBwYXJ0O1xuICAgIHZhciBwYXJ0SWR4O1xuICAgIHZhciBwcm9wTmFtZXM7XG4gICAgdmFyIHZhbDtcbiAgICB2YXIgbnVtZXJpY1Jlc29sdmVkID0gW107XG5cbiAgICAvLyBmaW5kIHRoZSB1bnJlc29sdmVkIHBhcnRzXG4gICAgdW5yZXNvbHZlZCA9IHBhcnRzLmZpbHRlcihmdW5jdGlvbihwYXJ0KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIG91dHB1dFtwYXJ0LmlkeF0gPT0gJ3VuZGVmaW5lZCc7XG4gICAgfSk7XG5cbiAgICAvLyBpbml0aWFsaXNlIHRoZSBjb3VudGVyXG4gICAgaWkgPSB1bnJlc29sdmVkLmxlbmd0aDtcblxuICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgdW5yZXNvbHZlZCBwYXJ0cyBhbmQgYXR0ZW1wdCB0byByZXNvbHZlIHRoZSB2YWx1ZVxuICAgIGZvciAoOyBpaS0tOyApIHtcbiAgICAgIHBhcnQgPSB1bnJlc29sdmVkW2lpXTtcblxuICAgICAgaWYgKHR5cGVvZiBwYXJ0ID09ICdvYmplY3QnKSB7XG4gICAgICAgIC8vIGlmIHRoaXMgaXMgYSBudW1lcmljIHBhcnQsIHRoaXMgaXMgYSBzaW1wbGUgaW5kZXggbG9va3VwXG4gICAgICAgIGlmIChwYXJ0Lm51bWVyaWMpIHtcbiAgICAgICAgICBwYXJ0SWR4ID0gcGFydC52YXJuYW1lIC0gaW5kZXhTaGlmdDtcbiAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IHBhcnRJZHgpIHtcbiAgICAgICAgICAgIG91dHB1dFtwYXJ0LmlkeF0gPSBhcmd1bWVudHNbcGFydElkeF07XG4gICAgICAgICAgICBpZiAobnVtZXJpY1Jlc29sdmVkLmluZGV4T2YocGFydC52YXJuYW1lKSA8IDApIHtcbiAgICAgICAgICAgICAgbnVtZXJpY1Jlc29sdmVkW251bWVyaWNSZXNvbHZlZC5sZW5ndGhdID0gcGFydC52YXJuYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBvdGhlcndpc2UsIHdlIGFyZSBkb2luZyBhIHJlY3Vyc2l2ZSBwcm9wZXJ0eSBzZWFyY2hcbiAgICAgICAgZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBwcm9wTmFtZXMgPSAocGFydC52YXJuYW1lIHx8ICcnKS5zcGxpdCgnLicpO1xuXG4gICAgICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgb3V0cHV0IGZyb20gdGhlIGxhc3QgdmFsaWQgYXJndW1lbnRcbiAgICAgICAgICBvdXRwdXRbcGFydC5pZHhdID0gKGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV0gfHwge30pO1xuICAgICAgICAgIHdoaWxlIChvdXRwdXRbcGFydC5pZHhdICYmIHByb3BOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YWwgPSBvdXRwdXRbcGFydC5pZHhdW3Byb3BOYW1lcy5zaGlmdCgpXTtcbiAgICAgICAgICAgIG91dHB1dFtwYXJ0LmlkeF0gPSB0eXBlb2YgdmFsICE9ICd1bmRlZmluZWQnID8gdmFsIDogJyc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgdGhlIG91dHB1dCB3YXMgcmVzb2x2ZWQsIHRoZW4gYXBwbHkgdGhlIG1vZGlmaWVyXG4gICAgICAgIGlmICh0eXBlb2Ygb3V0cHV0W3BhcnQuaWR4XSAhPSAndW5kZWZpbmVkJyAmJiBwYXJ0Lm1vZGlmaWVycykge1xuICAgICAgICAgIG91dHB1dFtwYXJ0LmlkeF0gPSBhcHBseU1vZGlmaWVycyhwYXJ0Lm1vZGlmaWVycywgb3V0cHV0W3BhcnQuaWR4XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZWFzc2VzIHVucmVzb2x2ZWQgKG9ubHkgY2FyaW5nIGFib3V0IG51bWVyaWMgcGFydHMpXG4gICAgdW5yZXNvbHZlZCA9IHBhcnRzLmZpbHRlcihmdW5jdGlvbihwYXJ0KSB7XG4gICAgICByZXR1cm4gcGFydC5udW1lcmljICYmIHR5cGVvZiBvdXRwdXRbcGFydC5pZHhdID09ICd1bmRlZmluZWQnO1xuICAgIH0pO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBubyB1bnJlc29sdmVkIHBhcnRzLCB0aGVuIHJldHVybiB0aGUgdmFsdWVcbiAgICBpZiAodW5yZXNvbHZlZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBvdXRwdXQuam9pbignJyk7XG4gICAgfVxuXG4gICAgLy8gb3RoZXJ3aXNlLCByZXR1cm4gdGhlIGNvbGxlY3QgZnVuY3Rpb24gYWdhaW5cbiAgICByZXR1cm4gY29sbGVjdChcbiAgICAgIHBhcnRzLFxuICAgICAgb3V0cHV0LFxuICAgICAgaW5kZXhTaGlmdCArIG51bWVyaWNSZXNvbHZlZC5sZW5ndGhcbiAgICApO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhcHBseU1vZGlmaWVycyhtb2RpZmllcnMsIHZhbHVlKSB7XG4gIC8vIGlmIHdlIGhhdmUgbW9kaWZpZXJzLCB0aGVuIHR3ZWFrIHRoZSBvdXRwdXRcbiAgZm9yICh2YXIgaWkgPSAwLCBjb3VudCA9IG1vZGlmaWVycy5sZW5ndGg7IGlpIDwgY291bnQ7IGlpKyspIHtcbiAgICB2YWx1ZSA9IG1vZGlmaWVyc1tpaV0odmFsdWUpO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNb2RpZmllcnMobW9kaWZpZXJTdHJpbmdzKSB7XG4gIHZhciBtb2RpZmllcnMgPSBbXTtcbiAgdmFyIHBhcnRzO1xuICB2YXIgZm47XG4gIFxuICBmb3IgKHZhciBpaSA9IDAsIGNvdW50ID0gbW9kaWZpZXJTdHJpbmdzLmxlbmd0aDsgaWkgPCBjb3VudDsgaWkrKykge1xuICAgIHBhcnRzID0gbW9kaWZpZXJTdHJpbmdzW2lpXS5zcGxpdCgnOicpO1xuICAgIGZuID0gbW9kc1twYXJ0c1swXS50b0xvd2VyQ2FzZSgpXTtcbiAgICBcbiAgICBpZiAoZm4pIHtcbiAgICAgIG1vZGlmaWVyc1ttb2RpZmllcnMubGVuZ3RoXSA9IGZuLmFwcGx5KG51bGwsIHBhcnRzLnNsaWNlKDEpKTtcbiAgICB9XG4gIH1cbiAgXG4gIHJldHVybiBtb2RpZmllcnM7XG59XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgTW9kaWZpZXJzXG5cbioqL1xuXG4vKipcbiAgIyMjIExlbmd0aCBNb2RpZmllciAobGVuKVxuXG4gIFRoZSBsZW5ndGggbW9kaWZpZXIgaXMgdXNlZCB0byBlbnN1cmUgdGhhdCBhIHN0cmluZyBpcyBleGFjdGx5IHRoZSBsZW5ndGggc3BlY2lmaWVkLiAgVGhlIHN0cmluZyBpcyBzbGljZWQgdG8gdGhlIHJlcXVpcmVkIG1heCBsZW5ndGgsIGFuZCB0aGVuIHBhZGRlZCBvdXQgd2l0aCBzcGFjZXMgKG9yIGEgc3BlY2lmaWVkIGNoYXJhY3RlcikgdG8gbWVldCB0aGUgcmVxdWlyZWQgbGVuZ3RoLlxuXG4gIGBgYGpzXG4gIC8vIHBhZCB0aGUgc3RyaW5nIHRlc3QgdG8gMTAgY2hhcmFjdGVyc1xuICBmb3JtYXR0ZXIoJ3t7IDB8bGVuOjEwIH19JykoJ3Rlc3QnKTsgICAvLyAndGVzdCAgICAgICdcblxuICAvLyBwYWQgdGhlIHN0cmluZyB0ZXN0IHRvIDEwIGNoYXJhY3RlcnMsIHVzaW5nIGEgYXMgdGhlIHBhZGRpbmcgY2hhcmFjdGVyXG4gIGZvcm1hdHRlcigne3sgMHxsZW46MTA6YSB9fScpKCd0ZXN0Jyk7IC8vICd0ZXN0YWFhYWFhJ1xuICBgYGBcbioqL1xuZXhwb3J0cy5sZW4gPSBmdW5jdGlvbihsZW5ndGgsIHBhZGRlcikge1xuICB2YXIgdGVzdEludCA9IHBhcnNlSW50KHBhZGRlciwgMTApO1xuICB2YXIgaXNOdW1iZXI7XG5cbiAgLy8gZGVmYXVsdCB0aGUgcGFkZGVyIHRvIGEgc3BhY2VcbiAgcGFkZGVyID0gKCEgaXNOYU4odGVzdEludCkpID8gdGVzdEludCA6IChwYWRkZXIgfHwgJyAnKTtcblxuICAvLyBjaGVjayB3aGV0aGVyIHdlIGhhdmUgYSBudW1iZXIgZm9yIHBhZGRpbmcgKHdlIHdpbGwgcGFkIGxlZnQgaWYgd2UgZG8pXG4gIGlzTnVtYmVyID0gdHlwZW9mIHBhZGRlciA9PSAnbnVtYmVyJztcbiAgXG4gIHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuICAgIHZhciBvdXRwdXQgPSBpbnB1dC50b1N0cmluZygpLnNsaWNlKDAsIGxlbmd0aCk7XG4gICAgXG4gICAgLy8gcGFkIHRoZSBzdHJpbmcgdG8gdGhlIHJlcXVpcmVkIGxlbmd0aFxuICAgIHdoaWxlIChvdXRwdXQubGVuZ3RoIDwgbGVuZ3RoKSB7XG4gICAgICBvdXRwdXQgPSBpc051bWJlciA/IHBhZGRlciArIG91dHB1dCA6IG91dHB1dCArIHBhZGRlcjtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCBkb2N1bWVudCwgbG9jYXRpb24sIFByaW11czogZmFsc2UgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIHJlVHJhaWxpbmdTbGFzaCA9IC9cXC8kLztcbnZhciBmb3JtYXR0ZXIgPSByZXF1aXJlKCdmb3JtYXR0ZXInKTtcbnZhciBwcmltdXNVcmwgPSBmb3JtYXR0ZXIoJ3t7IHNpZ25hbGhvc3QgfX17eyBwcmltdXNQYXRoIH19Jyk7XG5cbi8qKlxuICAjIyMgbG9hZFByaW11cyhzaWduYWxob3N0LCBvcHRzPywgY2FsbGJhY2spXG5cbiAgVGhpcyBpcyBhIGNvbnZlbmllbmNlIGZ1bmN0aW9uIHRoYXQgaXMgcGF0Y2hlZCBpbnRvIHRoZSBzaWduYWxsZXIgdG8gYXNzaXN0XG4gIHdpdGggbG9hZGluZyB0aGUgYHByaW11cy5qc2AgY2xpZW50IGxpYnJhcnkgZnJvbSBhbiBgcnRjLXN3aXRjaGJvYXJkYFxuICBzaWduYWxpbmcgc2VydmVyLlxuXG4gIEluIHRoZSBjYXNlIHRoYXQgeW91IHdpc2ggdG8gbG9hZCBgcHJpbXVzLmpzYCBmcm9tIGEgbG9jYXRpb24gb3RoZXIgdGhhblxuICB0aGUgZGVmYXVsdCBsb2NhdGlvbiBvZiBge3sgc2lnbmFsaG9zdCB9fS9ydGMuaW8vcHJpbXVzLmpzYCB5b3UgY2FuXG4gIHByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3Qgd2hpY2ggYWxsb3dzIGZvciB0aGUgZm9sbG93aW5nIGN1c3RvbWl6YXRpb25zOlxuXG4gIC0gYHByaW11c1BhdGhgIChkZWZhdWx0OiBgL3J0Yy5pby9wcmltdXMuanNgKVxuXG4gICAgVGhlIHBhdGggYXQgd2hpY2ggdGhlIGBwcmltdXMuanNgIGZpbGUgY2FuIGJlIGZvdW5kIG9uIHRoZSBzaWduYWxob3N0LlxuXG4gICBfX05PVEU6X18gVGhlIGFib3ZlIG9wdGlvbnMgYXJlIHBhc3NlZCB0aHJvdWdoIHdoZW4gY3JlYXRpbmcgYVxuICAgc2lnbmFsbGVyIG9iamVjdCwgYW5kIHRodXMgcGFja2FnZXMgc3VjaCBhc1xuICAgW3J0Yy1xdWlja2Nvbm5lY3RdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXF1aWNrY29ubmVjdClcbiAgIHdpbGwgYWxsb3cgeW91IHRvIG1ha2UgdGhlIGN1c3RvbWlzYXRpb24gd2l0aCBpdCdzIHRvcCBsZXZlbFxuICAgb3B0aW9ucyBhbHNvLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsaG9zdCwgb3B0cywgY2FsbGJhY2spIHtcbiAgdmFyIGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgdmFyIHNjcmlwdDtcbiAgdmFyIHNjcmlwdFNyYztcblxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICAvLyBpbml0aWFsaXNlIHRoZSBhbmNob3Igd2l0aCB0aGUgc2lnbmFsaG9zdFxuICBhbmNob3IuaHJlZiA9IHNpZ25hbGhvc3Q7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgc2NyaXB0IGxvY2F0aW9uXG4gIHNjcmlwdFNyYyA9IHByaW11c1VybCh7XG4gICAgc2lnbmFsaG9zdDogc2lnbmFsaG9zdC5yZXBsYWNlKHJlVHJhaWxpbmdTbGFzaCwgJycpLFxuICAgIHByaW11c1BhdGg6IChvcHRzIHx8IHt9KS5wcmltdXNQYXRoIHx8ICcvcnRjLmlvL3ByaW11cy5qcydcbiAgfSk7XG5cbiAgLy8gbG9vayBmb3IgdGhlIHNjcmlwdCBmaXJzdFxuICBzY3JpcHQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdzY3JpcHRbc3JjPVwiJyArIHNjcmlwdFNyYyArICdcIl0nKTtcblxuICAvLyBpZiB3ZSBmb3VuZCwgdGhlIHNjcmlwdCB0cmlnZ2VyIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseVxuICBpZiAoc2NyaXB0ICYmIHR5cGVvZiBQcmltdXMgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgUHJpbXVzKTtcbiAgfVxuICAvLyBvdGhlcndpc2UsIGlmIHRoZSBzY3JpcHQgZXhpc3RzIGJ1dCBQcmltdXMgaXMgbm90IGxvYWRlZCxcbiAgLy8gdGhlbiB3YWl0IGZvciB0aGUgbG9hZFxuICBlbHNlIGlmIChzY3JpcHQpIHtcbiAgICBzY3JpcHQuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgY2FsbGJhY2sobnVsbCwgUHJpbXVzKTtcbiAgICB9KTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIG90aGVyd2lzZSBjcmVhdGUgdGhlIHNjcmlwdCBhbmQgbG9hZCBwcmltdXNcbiAgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gIHNjcmlwdC5zcmMgPSBzY3JpcHRTcmM7XG5cbiAgc2NyaXB0Lm9uZXJyb3IgPSBjYWxsYmFjaztcbiAgc2NyaXB0LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAvLyBpZiB3ZSBoYXZlIGEgc2lnbmFsaG9zdCB0aGF0IGlzIG5vdCBiYXNlcGF0aGVkIGF0IC9cbiAgICAvLyB0aGVuIHR3ZWFrIHRoZSBwcmltdXMgcHJvdG90eXBlXG4gICAgaWYgKGFuY2hvci5wYXRobmFtZSAhPT0gJy8nKSB7XG4gICAgICBQcmltdXMucHJvdG90eXBlLnBhdGhuYW1lID0gYW5jaG9yLnBhdGhuYW1lLnJlcGxhY2UocmVUcmFpbGluZ1NsYXNoLCAnJykgK1xuICAgICAgICBQcmltdXMucHJvdG90eXBlLnBhdGhuYW1lO1xuICAgIH1cblxuICAgIGNhbGxiYWNrKG51bGwsIFByaW11cyk7XG4gIH0pO1xuXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ3J0Yy1zaWduYWxsZXInKTtcbnZhciBqc29ucGFyc2UgPSByZXF1aXJlKCdjb2cvanNvbnBhcnNlJyk7XG5cbi8qKlxuICAjIyMgc2lnbmFsbGVyIHByb2Nlc3MgaGFuZGxpbmdcblxuICBXaGVuIGEgc2lnbmFsbGVyJ3MgdW5kZXJsaW5nIG1lc3NlbmdlciBlbWl0cyBhIGBkYXRhYCBldmVudCB0aGlzIGlzXG4gIGRlbGVnYXRlZCB0byBhIHNpbXBsZSBtZXNzYWdlIHBhcnNlciwgd2hpY2ggYXBwbGllcyB0aGUgZm9sbG93aW5nIHNpbXBsZVxuICBsb2dpYzpcblxuICAtIElzIHRoZSBtZXNzYWdlIGEgYC90b2AgbWVzc2FnZS4gSWYgc28sIHNlZSBpZiB0aGUgbWVzc2FnZSBpcyBmb3IgdGhpc1xuICAgIHNpZ25hbGxlciAoY2hlY2tpbmcgdGhlIHRhcmdldCBpZCAtIDJuZCBhcmcpLiAgSWYgc28gcGFzcyB0aGVcbiAgICByZW1haW5kZXIgb2YgdGhlIG1lc3NhZ2Ugb250byB0aGUgc3RhbmRhcmQgcHJvY2Vzc2luZyBjaGFpbi4gIElmIG5vdCxcbiAgICBkaXNjYXJkIHRoZSBtZXNzYWdlLlxuXG4gIC0gSXMgdGhlIG1lc3NhZ2UgYSBjb21tYW5kIG1lc3NhZ2UgKHByZWZpeGVkIHdpdGggYSBmb3J3YXJkIHNsYXNoKS4gSWYgc28sXG4gICAgbG9vayBmb3IgYW4gYXBwcm9wcmlhdGUgbWVzc2FnZSBoYW5kbGVyIGFuZCBwYXNzIHRoZSBtZXNzYWdlIHBheWxvYWQgb25cbiAgICB0byBpdC5cblxuICAtIEZpbmFsbHksIGRvZXMgdGhlIG1lc3NhZ2UgbWF0Y2ggYW55IHBhdHRlcm5zIHRoYXQgd2UgYXJlIGxpc3RlbmluZyBmb3I/XG4gICAgSWYgc28sIHRoZW4gcGFzcyB0aGUgZW50aXJlIG1lc3NhZ2UgY29udGVudHMgb250byB0aGUgcmVnaXN0ZXJlZCBoYW5kbGVyLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNpZ25hbGxlciwgb3B0cykge1xuICB2YXIgaGFuZGxlcnMgPSByZXF1aXJlKCcuL2hhbmRsZXJzJykoc2lnbmFsbGVyLCBvcHRzKTtcblxuICBmdW5jdGlvbiBzZW5kRXZlbnQocGFydHMsIHNyY1N0YXRlLCBkYXRhKSB7XG4gICAgLy8gaW5pdGlhbGlzZSB0aGUgZXZlbnQgbmFtZVxuICAgIHZhciBldnROYW1lID0gcGFydHNbMF0uc2xpY2UoMSk7XG5cbiAgICAvLyBjb252ZXJ0IGFueSB2YWxpZCBqc29uIG9iamVjdHMgdG8ganNvblxuICAgIHZhciBhcmdzID0gcGFydHMuc2xpY2UoMikubWFwKGpzb25wYXJzZSk7XG5cbiAgICBzaWduYWxsZXIuYXBwbHkoXG4gICAgICBzaWduYWxsZXIsXG4gICAgICBbZXZ0TmFtZV0uY29uY2F0KGFyZ3MpLmNvbmNhdChbc3JjU3RhdGUsIGRhdGFdKVxuICAgICk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24ob3JpZ2luYWxEYXRhKSB7XG4gICAgdmFyIGRhdGEgPSBvcmlnaW5hbERhdGE7XG4gICAgdmFyIGlzTWF0Y2ggPSB0cnVlO1xuICAgIHZhciBwYXJ0cztcbiAgICB2YXIgaGFuZGxlcjtcbiAgICB2YXIgc3JjRGF0YTtcbiAgICB2YXIgc3JjU3RhdGU7XG4gICAgdmFyIGlzRGlyZWN0TWVzc2FnZSA9IGZhbHNlO1xuXG4gICAgLy8gZGlzY2FyZCBwcmltdXMgbWVzc2FnZXNcbiAgICBpZiAoZGF0YSAmJiBkYXRhLnNsaWNlKDAsIDYpID09PSAncHJpbXVzJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGZvcmNlIHRoZSBpZCBpbnRvIHN0cmluZyBmb3JtYXQgc28gd2UgY2FuIHJ1biBsZW5ndGggYW5kIGNvbXBhcmlzb24gdGVzdHMgb24gaXRcbiAgICB2YXIgaWQgPSBzaWduYWxsZXIuaWQgKyAnJztcbiAgICBkZWJ1Zygnc2lnbmFsbGVyICcgKyBpZCArICcgcmVjZWl2ZWQgZGF0YTogJyArIG9yaWdpbmFsRGF0YSk7XG5cbiAgICAvLyBwcm9jZXNzIC90byBtZXNzYWdlc1xuICAgIGlmIChkYXRhLnNsaWNlKDAsIDMpID09PSAnL3RvJykge1xuICAgICAgaXNNYXRjaCA9IGRhdGEuc2xpY2UoNCwgaWQubGVuZ3RoICsgNCkgPT09IGlkO1xuICAgICAgaWYgKGlzTWF0Y2gpIHtcbiAgICAgICAgcGFydHMgPSBkYXRhLnNsaWNlKDUgKyBpZC5sZW5ndGgpLnNwbGl0KCd8JykubWFwKGpzb25wYXJzZSk7XG5cbiAgICAgICAgLy8gZ2V0IHRoZSBzb3VyY2UgZGF0YVxuICAgICAgICBpc0RpcmVjdE1lc3NhZ2UgPSB0cnVlO1xuXG4gICAgICAgIC8vIGV4dHJhY3QgdGhlIHZlY3RvciBjbG9jayBhbmQgdXBkYXRlIHRoZSBwYXJ0c1xuICAgICAgICBwYXJ0cyA9IHBhcnRzLm1hcChqc29ucGFyc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGlmIHRoaXMgaXMgbm90IGEgbWF0Y2gsIHRoZW4gYmFpbFxuICAgIGlmICghIGlzTWF0Y2gpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBjaG9wIHRoZSBkYXRhIGludG8gcGFydHNcbiAgICBwYXJ0cyA9IHBhcnRzIHx8IGRhdGEuc3BsaXQoJ3wnKS5tYXAoanNvbnBhcnNlKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzcGVjaWZpYyBoYW5kbGVyIGZvciB0aGUgYWN0aW9uLCB0aGVuIGludm9rZVxuICAgIGlmICh0eXBlb2YgcGFydHNbMF0gPT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIGV4dHJhY3QgdGhlIG1ldGFkYXRhIGZyb20gdGhlIGlucHV0IGRhdGFcbiAgICAgIHNyY0RhdGEgPSBwYXJ0c1sxXTtcblxuICAgICAgLy8gaWYgd2UgZ290IGRhdGEgZnJvbSBvdXJzZWxmLCB0aGVuIHRoaXMgaXMgcHJldHR5IGR1bWJcbiAgICAgIC8vIGJ1dCBpZiB3ZSBoYXZlIHRoZW4gdGhyb3cgaXQgYXdheVxuICAgICAgaWYgKHNyY0RhdGEgJiYgc3JjRGF0YS5pZCA9PT0gc2lnbmFsbGVyLmlkKSB7XG4gICAgICAgIHJldHVybiBjb25zb2xlLndhcm4oJ2dvdCBkYXRhIGZyb20gb3Vyc2VsZiwgZGlzY2FyZGluZycpO1xuICAgICAgfVxuXG4gICAgICAvLyBnZXQgdGhlIHNvdXJjZSBzdGF0ZVxuICAgICAgc3JjU3RhdGUgPSBzaWduYWxsZXIucGVlcnMuZ2V0KHNyY0RhdGEgJiYgc3JjRGF0YS5pZCkgfHwgc3JjRGF0YTtcblxuICAgICAgLy8gaGFuZGxlIGNvbW1hbmRzXG4gICAgICBpZiAocGFydHNbMF0uY2hhckF0KDApID09PSAnLycpIHtcbiAgICAgICAgLy8gbG9vayBmb3IgYSBoYW5kbGVyIGZvciB0aGUgbWVzc2FnZSB0eXBlXG4gICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyc1twYXJ0c1swXS5zbGljZSgxKV07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBoYW5kbGVyKFxuICAgICAgICAgICAgcGFydHMuc2xpY2UoMiksXG4gICAgICAgICAgICBwYXJ0c1swXS5zbGljZSgxKSxcbiAgICAgICAgICAgIHNyY0RhdGEsXG4gICAgICAgICAgICBzcmNTdGF0ZSxcbiAgICAgICAgICAgIGlzRGlyZWN0TWVzc2FnZVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgc2VuZEV2ZW50KHBhcnRzLCBzcmNTdGF0ZSwgb3JpZ2luYWxEYXRhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gb3RoZXJ3aXNlLCBlbWl0IGRhdGFcbiAgICAgIGVsc2Uge1xuICAgICAgICBzaWduYWxsZXIoXG4gICAgICAgICAgJ2RhdGEnLFxuICAgICAgICAgIHBhcnRzLnNsaWNlKDAsIDEpLmNvbmNhdChwYXJ0cy5zbGljZSgyKSksXG4gICAgICAgICAgc3JjRGF0YSxcbiAgICAgICAgICBzcmNTdGF0ZSxcbiAgICAgICAgICBpc0RpcmVjdE1lc3NhZ2VcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdydGMtc2lnbmFsbGVyJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG52YXIgbWJ1cyA9IHJlcXVpcmUoJ21idXMnKTtcbnZhciB0aHJvdHRsZSA9IHJlcXVpcmUoJ2NvZy90aHJvdHRsZScpO1xudmFyIGdldGFibGUgPSByZXF1aXJlKCdjb2cvZ2V0YWJsZScpO1xudmFyIHV1aWQgPSByZXF1aXJlKCdjdWlkJyk7XG5cbi8vIGluaXRpYWxpc2UgdGhlIGxpc3Qgb2YgdmFsaWQgXCJ3cml0ZVwiIG1ldGhvZHNcbnZhciBXUklURV9NRVRIT0RTID0gWyd3cml0ZScsICdzZW5kJ107XG52YXIgQ0xPU0VfTUVUSE9EUyA9IFsnY2xvc2UnLCAnZW5kJ107XG5cbi8vIGluaXRpYWxpc2Ugc2lnbmFsbGVyIG1ldGFkYXRhIHNvIHdlIGRvbid0IGhhdmUgdG8gaW5jbHVkZSB0aGUgcGFja2FnZS5qc29uXG4vLyBUT0RPOiBtYWtlIHRoaXMgY2hlY2thYmxlIHdpdGggc29tZSBraW5kIG9mIHByZXB1Ymxpc2ggc2NyaXB0XG52YXIgbWV0YWRhdGEgPSB7XG4gIHZlcnNpb246ICczLjEuMCdcbn07XG5cbi8qKlxuICAjIHJ0Yy1zaWduYWxsZXJcblxuICBUaGUgYHJ0Yy1zaWduYWxsZXJgIG1vZHVsZSBwcm92aWRlcyBhIHRyYW5zcG9ydGxlc3Mgc2lnbmFsbGluZ1xuICBtZWNoYW5pc20gZm9yIFdlYlJUQy5cblxuICAjIyBQdXJwb3NlXG5cbiAgPDw8IGRvY3MvcHVycG9zZS5tZFxuXG4gICMjIEdldHRpbmcgU3RhcnRlZFxuXG4gIFdoaWxlIHRoZSBzaWduYWxsZXIgaXMgY2FwYWJsZSBvZiBjb21tdW5pY2F0aW5nIGJ5IGEgbnVtYmVyIG9mIGRpZmZlcmVudFxuICBtZXNzZW5nZXJzIChpLmUuIGFueXRoaW5nIHRoYXQgY2FuIHNlbmQgYW5kIHJlY2VpdmUgbWVzc2FnZXMgb3ZlciBhIHdpcmUpXG4gIGl0IGNvbWVzIHdpdGggc3VwcG9ydCBmb3IgdW5kZXJzdGFuZGluZyBob3cgdG8gY29ubmVjdCB0byBhblxuICBbcnRjLXN3aXRjaGJvYXJkXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zd2l0Y2hib2FyZCkgb3V0IG9mIHRoZSBib3guXG5cbiAgVGhlIGZvbGxvd2luZyBjb2RlIHNhbXBsZSBkZW1vbnN0cmF0ZXMgaG93OlxuXG4gIDw8PCBleGFtcGxlcy9nZXR0aW5nLXN0YXJ0ZWQuanNcblxuICA8PDwgZG9jcy9ldmVudHMubWRcblxuICA8PDwgZG9jcy9zaWduYWxmbG93LWRpYWdyYW1zLm1kXG5cbiAgIyMgUmVmZXJlbmNlXG5cbiAgVGhlIGBydGMtc2lnbmFsbGVyYCBtb2R1bGUgaXMgZGVzaWduZWQgdG8gYmUgdXNlZCBwcmltYXJpbHkgaW4gYSBmdW5jdGlvbmFsXG4gIHdheSBhbmQgd2hlbiBjYWxsZWQgaXQgY3JlYXRlcyBhIG5ldyBzaWduYWxsZXIgdGhhdCB3aWxsIGVuYWJsZVxuICB5b3UgdG8gY29tbXVuaWNhdGUgd2l0aCBvdGhlciBwZWVycyB2aWEgeW91ciBtZXNzYWdpbmcgbmV0d29yay5cblxuICBgYGBqc1xuICAvLyBjcmVhdGUgYSBzaWduYWxsZXIgZnJvbSBzb21ldGhpbmcgdGhhdCBrbm93cyBob3cgdG8gc2VuZCBtZXNzYWdlc1xuICB2YXIgc2lnbmFsbGVyID0gcmVxdWlyZSgncnRjLXNpZ25hbGxlcicpKG1lc3Nlbmdlcik7XG4gIGBgYFxuXG4gIEFzIGRlbW9uc3RyYXRlZCBpbiB0aGUgZ2V0dGluZyBzdGFydGVkIGd1aWRlLCB5b3UgY2FuIGFsc28gcGFzcyB0aHJvdWdoXG4gIGEgc3RyaW5nIHZhbHVlIGluc3RlYWQgb2YgYSBtZXNzZW5nZXIgaW5zdGFuY2UgaWYgeW91IHNpbXBseSB3YW50IHRvXG4gIGNvbm5lY3QgdG8gYW4gZXhpc3RpbmcgYHJ0Yy1zd2l0Y2hib2FyZGAgaW5zdGFuY2UuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihtZXNzZW5nZXIsIG9wdHMpIHtcbiAgLy8gZ2V0IHRoZSBhdXRvcmVwbHkgc2V0dGluZ1xuICB2YXIgYXV0b3JlcGx5ID0gKG9wdHMgfHwge30pLmF1dG9yZXBseTtcbiAgdmFyIGNvbm5lY3QgPSAob3B0cyB8fCB7fSkuY29ubmVjdDtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBtZXRhZGF0YVxuICB2YXIgbG9jYWxNZXRhID0ge307XG5cbiAgLy8gY3JlYXRlIHRoZSBzaWduYWxsZXJcbiAgdmFyIHNpZ25hbGxlciA9IG1idXMoJycsIChvcHRzIHx8IHt9KS5sb2dnZXIpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGlkXG4gIHZhciBpZCA9IHNpZ25hbGxlci5pZCA9IChvcHRzIHx8IHt9KS5pZCB8fCB1dWlkKCk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgYXR0cmlidXRlc1xuICB2YXIgYXR0cmlidXRlcyA9IHNpZ25hbGxlci5hdHRyaWJ1dGVzID0ge1xuICAgIGJyb3dzZXI6IGRldGVjdC5icm93c2VyLFxuICAgIGJyb3dzZXJWZXJzaW9uOiBkZXRlY3QuYnJvd3NlclZlcnNpb24sXG4gICAgaWQ6IGlkLFxuICAgIGFnZW50OiAnc2lnbmFsbGVyQCcgKyBtZXRhZGF0YS52ZXJzaW9uXG4gIH07XG5cbiAgLy8gY3JlYXRlIHRoZSBwZWVycyBtYXBcbiAgdmFyIHBlZXJzID0gc2lnbmFsbGVyLnBlZXJzID0gZ2V0YWJsZSh7fSk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgZGF0YSBldmVudCBuYW1lXG5cbiAgdmFyIGNvbm5lY3RlZCA9IGZhbHNlO1xuICB2YXIgd3JpdGU7XG4gIHZhciBjbG9zZTtcbiAgdmFyIHByb2Nlc3NvcjtcbiAgdmFyIGFubm91bmNlVGltZXIgPSAwO1xuXG4gIGZ1bmN0aW9uIGFubm91bmNlT25SZWNvbm5lY3QoKSB7XG4gICAgc2lnbmFsbGVyLmFubm91bmNlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBiaW5kQnJvd3NlckV2ZW50cygpIHtcbiAgICBtZXNzZW5nZXIuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgcHJvY2Vzc29yKGV2dC5kYXRhKTtcbiAgICB9KTtcblxuICAgIG1lc3Nlbmdlci5hZGRFdmVudExpc3RlbmVyKCdvcGVuJywgaGFuZGxlTWVzc2VuZ2VyT3Blbik7XG4gICAgbWVzc2VuZ2VyLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgaGFuZGxlTWVzc2VuZ2VyQ2xvc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gYmluZEV2ZW50cygpIHtcbiAgICAvLyBoYW5kbGUgbWVzc2FnZSBkYXRhIGV2ZW50c1xuICAgIG1lc3Nlbmdlci5vbihvcHRzLmRhdGFFdmVudCwgcHJvY2Vzc29yKTtcbiAgICBtZXNzZW5nZXIub24ob3B0cy5vcGVuRXZlbnQsIGhhbmRsZU1lc3Nlbmdlck9wZW4pO1xuICAgIG1lc3Nlbmdlci5vbihvcHRzLmNsb3NlRXZlbnQsIGhhbmRsZU1lc3NlbmdlckNsb3NlKTtcbiAgICBtZXNzZW5nZXIub24ob3B0cy5lcnJvckV2ZW50LCBoYW5kbGVNZXNzZW5nZXJDbG9zZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb25uZWN0VG9Ib3N0KHVybCkge1xuICAgIGlmICh0eXBlb2YgY29ubmVjdCAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gc2lnbmFsbGVyKCdlcnJvcicsIG5ldyBFcnJvcignbm8gY29ubmVjdCBmdW5jdGlvbicpKTtcbiAgICB9XG5cbiAgICAvLyBsb2FkIHByaW11c1xuICAgIGNvbm5lY3QodXJsLCBvcHRzLCBmdW5jdGlvbihlcnIsIHNvY2tldCkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gc2lnbmFsbGVyKCdlcnJvcicsIGVycik7XG4gICAgICB9XG5cbiAgICAgIC8vIGNyZWF0ZSB0aGUgYWN0dWFsIG1lc3NlbmdlciBmcm9tIGEgcHJpbXVzIGNvbm5lY3Rpb25cbiAgICAgIHNpZ25hbGxlci5fbWVzc2VuZ2VyID0gbWVzc2VuZ2VyID0gc29ja2V0LmNvbm5lY3QodXJsKTtcblxuICAgICAgLy8gbm93IGluaXRcbiAgICAgIGluaXQoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZURhdGFMaW5lKGFyZ3MpIHtcbiAgICByZXR1cm4gYXJncy5tYXAocHJlcGFyZUFyZykuam9pbignfCcpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTWV0YWRhdGEoKSB7XG4gICAgcmV0dXJuIGV4dGVuZCh7fSwgbG9jYWxNZXRhLCB7IGlkOiBzaWduYWxsZXIuaWQgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBleHRyYWN0UHJvcChuYW1lKSB7XG4gICAgcmV0dXJuIG1lc3NlbmdlcltuYW1lXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZU1lc3NlbmdlckNsb3NlKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgY29uc29sZS5sb2coJ3NvY2tldCBjbG9zZWQgd2l0aCBlcnJvcjogJywgZXJyKTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWQgPSBmYWxzZTtcbiAgICBzaWduYWxsZXIoJ2Rpc2Nvbm5lY3RlZCcpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlTWVzc2VuZ2VyT3BlbigpIHtcbiAgICBjb25uZWN0ZWQgPSB0cnVlO1xuICAgIHNpZ25hbGxlcignb3BlbicpO1xuICAgIHNpZ25hbGxlcignY29ubmVjdGVkJyk7XG4gIH1cblxuICAvLyBhdHRlbXB0IHRvIGRldGVjdCB3aGV0aGVyIHRoZSB1bmRlcmx5aW5nIG1lc3NlbmdlciBpcyBjbG9zaW5nXG4gIC8vIHRoaXMgY2FuIGJlIHRvdWdoIGFzIHdlIGRlYWwgd2l0aCBib3RoIG5hdGl2ZSAob3Igc2ltdWxhdGVkIG5hdGl2ZSlcbiAgLy8gc29ja2V0cyBvciBhbiBhYnN0cmFjdGlvbiBsYXllciBzdWNoIGFzIHByaW11c1xuICBmdW5jdGlvbiBpc0Nsb3NpbmcoKSB7XG4gICAgdmFyIGlzQWJzdHJhY3Rpb24gPSBtZXNzZW5nZXIgJiZcbiAgICAgICAgLy8gYSBwcmltdXMgc29ja2V0IGhhcyBhIHNvY2tldCBhdHRyaWJ1dGVcbiAgICAgICAgdHlwZW9mIG1lc3Nlbmdlci5zb2NrZXQgIT0gJ3VuZGVmaW5lZCc7XG5cbiAgICByZXR1cm4gaXNBYnN0cmFjdGlvbiA/IGZhbHNlIDogKFxuICAgICAgbWVzc2VuZ2VyICYmXG4gICAgICB0eXBlb2YgbWVzc2VuZ2VyLnJlYWR5U3RhdGUgIT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIG1lc3Nlbmdlci5yZWFkeVN0YXRlID49IDJcbiAgICApO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNGKHRhcmdldCkge1xuICAgIHJldHVybiB0eXBlb2YgdGFyZ2V0ID09ICdmdW5jdGlvbic7XG4gIH1cblxuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIC8vIGV4dHJhY3QgdGhlIHdyaXRlIGFuZCBjbG9zZSBmdW5jdGlvbiByZWZlcmVuY2VzXG4gICAgd3JpdGUgPSBbb3B0cy53cml0ZU1ldGhvZF0uY29uY2F0KFdSSVRFX01FVEhPRFMpLm1hcChleHRyYWN0UHJvcCkuZmlsdGVyKGlzRilbMF07XG4gICAgY2xvc2UgPSBbb3B0cy5jbG9zZU1ldGhvZF0uY29uY2F0KENMT1NFX01FVEhPRFMpLm1hcChleHRyYWN0UHJvcCkuZmlsdGVyKGlzRilbMF07XG5cbiAgICAvLyBjcmVhdGUgdGhlIHByb2Nlc3NvclxuICAgIHNpZ25hbGxlci5wcm9jZXNzID0gcHJvY2Vzc29yID0gcmVxdWlyZSgnLi9wcm9jZXNzb3InKShzaWduYWxsZXIsIG9wdHMpO1xuXG4gICAgLy8gaWYgdGhlIG1lc3NlbmdlciBkb2Vzbid0IHByb3ZpZGUgYSB2YWxpZCB3cml0ZSBtZXRob2QsIHRoZW4gY29tcGxhaW5cbiAgICBpZiAodHlwZW9mIHdyaXRlICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncHJvdmlkZWQgbWVzc2VuZ2VyIGRvZXMgbm90IGltcGxlbWVudCBhIFwiJyArXG4gICAgICAgIG9wdHMud3JpdGVNZXRob2QgKyAnXCIgd3JpdGUgbWV0aG9kJyk7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIGNvcmUgYnJvd3NlciBtZXNzZW5naW5nIGFwaXNcbiAgICBpZiAodHlwZW9mIG1lc3Nlbmdlci5vbiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBiaW5kRXZlbnRzKCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBtZXNzZW5nZXIuYWRkRXZlbnRMaXN0ZW5lciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBiaW5kQnJvd3NlckV2ZW50cygpO1xuICAgIH1cblxuICAgIC8vIGRldGVybWluZSBpZiB3ZSBhcmUgY29ubmVjdGVkIG9yIG5vdFxuICAgIGNvbm5lY3RlZCA9IG1lc3Nlbmdlci5jb25uZWN0ZWQgfHwgZmFsc2U7XG4gICAgaWYgKCEgY29ubmVjdGVkKSB7XG4gICAgICBzaWduYWxsZXIub25jZSgnY29ubmVjdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGFsd2F5cyBhbm5vdW5jZSBvbiByZWNvbm5lY3RcbiAgICAgICAgc2lnbmFsbGVyLm9uKCdjb25uZWN0ZWQnLCBhbm5vdW5jZU9uUmVjb25uZWN0KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGVtaXQgdGhlIGluaXRpYWxpemVkIGV2ZW50XG4gICAgc2V0VGltZW91dChzaWduYWxsZXIuYmluZChzaWduYWxsZXIsICdpbml0JyksIDApO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJlcGFyZUFyZyhhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyA9PSAnb2JqZWN0JyAmJiAoISAoYXJnIGluc3RhbmNlb2YgU3RyaW5nKSkpIHtcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmcpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgYXJnID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBhcmc7XG4gIH1cblxuICAvKipcbiAgICAjIyMgc2lnbmFsbGVyI3NlbmQobWVzc2FnZSwgZGF0YSopXG5cbiAgICBVc2UgdGhlIHNlbmQgZnVuY3Rpb24gdG8gc2VuZCBhIG1lc3NhZ2UgdG8gb3RoZXIgcGVlcnMgaW4gdGhlIGN1cnJlbnRcbiAgICBzaWduYWxsaW5nIHNjb3BlIChpZiBhbm5vdW5jZWQgaW4gYSByb29tIHRoaXMgd2lsbCBiZSBhIHJvb20sIG90aGVyd2lzZVxuICAgIGJyb2FkY2FzdCB0byBhbGwgcGVlcnMgY29ubmVjdGVkIHRvIHRoZSBzaWduYWxsaW5nIHNlcnZlcikuXG5cbiAgKiovXG4gIHZhciBzZW5kID0gc2lnbmFsbGVyLnNlbmQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBpdGVyYXRlIG92ZXIgdGhlIGFyZ3VtZW50cyBhbmQgc3RyaW5naWZ5IGFzIHJlcXVpcmVkXG4gICAgLy8gdmFyIG1ldGFkYXRhID0geyBpZDogc2lnbmFsbGVyLmlkIH07XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgdmFyIGRhdGFsaW5lO1xuXG4gICAgLy8gaW5qZWN0IHRoZSBtZXRhZGF0YVxuICAgIGFyZ3Muc3BsaWNlKDEsIDAsIGNyZWF0ZU1ldGFkYXRhKCkpO1xuICAgIGRhdGFsaW5lID0gY3JlYXRlRGF0YUxpbmUoYXJncyk7XG5cbiAgICAvLyBwZXJmb3JtIGFuIGlzY2xvc2luZyBjaGVja1xuICAgIGlmIChpc0Nsb3NpbmcoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIGFyZSBub3QgaW5pdGlhbGl6ZWQsIHRoZW4gd2FpdCB1bnRpbCB3ZSBhcmVcbiAgICBpZiAoISBjb25uZWN0ZWQpIHtcbiAgICAgIHJldHVybiBzaWduYWxsZXIub25jZSgnY29ubmVjdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHdyaXRlLmNhbGwobWVzc2VuZ2VyLCBkYXRhbGluZSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBzZW5kIHRoZSBkYXRhIG92ZXIgdGhlIG1lc3NlbmdlclxuICAgIHJldHVybiB3cml0ZS5jYWxsKG1lc3NlbmdlciwgZGF0YWxpbmUpO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyBhbm5vdW5jZShkYXRhPylcblxuICAgIFRoZSBgYW5ub3VuY2VgIGZ1bmN0aW9uIG9mIHRoZSBzaWduYWxsZXIgd2lsbCBwYXNzIGFuIGAvYW5ub3VuY2VgIG1lc3NhZ2VcbiAgICB0aHJvdWdoIHRoZSBtZXNzZW5nZXIgbmV0d29yay4gIFdoZW4gbm8gYWRkaXRpb25hbCBkYXRhIGlzIHN1cHBsaWVkIHRvXG4gICAgdGhpcyBmdW5jdGlvbiB0aGVuIG9ubHkgdGhlIGlkIG9mIHRoZSBzaWduYWxsZXIgaXMgc2VudCB0byBhbGwgYWN0aXZlXG4gICAgbWVtYmVycyBvZiB0aGUgbWVzc2VuZ2luZyBuZXR3b3JrLlxuXG4gICAgIyMjIyBKb2luaW5nIFJvb21zXG5cbiAgICBUbyBqb2luIGEgcm9vbSB1c2luZyBhbiBhbm5vdW5jZSBjYWxsIHlvdSBzaW1wbHkgcHJvdmlkZSB0aGUgbmFtZSBvZiB0aGVcbiAgICByb29tIHlvdSB3aXNoIHRvIGpvaW4gYXMgcGFydCBvZiB0aGUgZGF0YSBibG9jayB0aGF0IHlvdSBhbm5vdWNlLCBmb3JcbiAgICBleGFtcGxlOlxuXG4gICAgYGBganNcbiAgICBzaWduYWxsZXIuYW5ub3VuY2UoeyByb29tOiAndGVzdHJvb20nIH0pO1xuICAgIGBgYFxuXG4gICAgU2lnbmFsbGluZyBzZXJ2ZXJzIChzdWNoIGFzXG4gICAgW3J0Yy1zd2l0Y2hib2FyZF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc3dpdGNoYm9hcmQpKSB3aWxsIHRoZW5cbiAgICBwbGFjZSB5b3VyIHBlZXIgY29ubmVjdGlvbiBpbnRvIGEgcm9vbSB3aXRoIG90aGVyIHBlZXJzIHRoYXQgaGF2ZSBhbHNvXG4gICAgYW5ub3VuY2VkIGluIHRoaXMgcm9vbS5cblxuICAgIE9uY2UgeW91IGhhdmUgam9pbmVkIGEgcm9vbSwgdGhlIHNlcnZlciB3aWxsIG9ubHkgZGVsaXZlciBtZXNzYWdlcyB0aGF0XG4gICAgeW91IGBzZW5kYCB0byBvdGhlciBwZWVycyB3aXRoaW4gdGhhdCByb29tLlxuXG4gICAgIyMjIyBQcm92aWRpbmcgQWRkaXRpb25hbCBBbm5vdW5jZSBEYXRhXG5cbiAgICBUaGVyZSBtYXkgYmUgaW5zdGFuY2VzIHdoZXJlIHlvdSB3aXNoIHRvIHNlbmQgYWRkaXRpb25hbCBkYXRhIGFzIHBhcnQgb2ZcbiAgICB5b3VyIGFubm91bmNlIG1lc3NhZ2UgaW4geW91ciBhcHBsaWNhdGlvbi4gIEZvciBpbnN0YW5jZSwgbWF5YmUgeW91IHdhbnRcbiAgICB0byBzZW5kIGFuIGFsaWFzIG9yIG5pY2sgYXMgcGFydCBvZiB5b3VyIGFubm91bmNlIG1lc3NhZ2UgcmF0aGVyIHRoYW4ganVzdFxuICAgIHVzZSB0aGUgc2lnbmFsbGVyJ3MgZ2VuZXJhdGVkIGlkLlxuXG4gICAgSWYgZm9yIGluc3RhbmNlIHlvdSB3ZXJlIHdyaXRpbmcgYSBzaW1wbGUgY2hhdCBhcHBsaWNhdGlvbiB5b3UgY291bGQgam9pblxuICAgIHRoZSBgd2VicnRjYCByb29tIGFuZCB0ZWxsIGV2ZXJ5b25lIHlvdXIgbmFtZSB3aXRoIHRoZSBmb2xsb3dpbmcgYW5ub3VuY2VcbiAgICBjYWxsOlxuXG4gICAgYGBganNcbiAgICBzaWduYWxsZXIuYW5ub3VuY2Uoe1xuICAgICAgcm9vbTogJ3dlYnJ0YycsXG4gICAgICBuaWNrOiAnRGFtb24nXG4gICAgfSk7XG4gICAgYGBgXG5cbiAgICAjIyMjIEFubm91bmNpbmcgVXBkYXRlc1xuXG4gICAgVGhlIHNpZ25hbGxlciBpcyB3cml0dGVuIHRvIGRpc3Rpbmd1aXNoIGJldHdlZW4gaW5pdGlhbCBwZWVyIGFubm91bmNlbWVudHNcbiAgICBhbmQgcGVlciBkYXRhIHVwZGF0ZXMgKHNlZSB0aGUgZG9jcyBvbiB0aGUgYW5ub3VuY2UgaGFuZGxlciBiZWxvdykuIEFzXG4gICAgc3VjaCBpdCBpcyBvayB0byBwcm92aWRlIGFueSBkYXRhIHVwZGF0ZXMgdXNpbmcgdGhlIGFubm91bmNlIG1ldGhvZCBhbHNvLlxuXG4gICAgRm9yIGluc3RhbmNlLCBJIGNvdWxkIHNlbmQgYSBzdGF0dXMgdXBkYXRlIGFzIGFuIGFubm91bmNlIG1lc3NhZ2UgdG8gZmxhZ1xuICAgIHRoYXQgSSBhbSBnb2luZyBvZmZsaW5lOlxuXG4gICAgYGBganNcbiAgICBzaWduYWxsZXIuYW5ub3VuY2UoeyBzdGF0dXM6ICdvZmZsaW5lJyB9KTtcbiAgICBgYGBcblxuICAqKi9cbiAgc2lnbmFsbGVyLmFubm91bmNlID0gZnVuY3Rpb24oZGF0YSwgc2VuZGVyKSB7XG5cbiAgICBmdW5jdGlvbiBzZW5kQW5ub3VuY2UoKSB7XG4gICAgICAoc2VuZGVyIHx8IHNlbmQpKCcvYW5ub3VuY2UnLCBhdHRyaWJ1dGVzKTtcbiAgICAgIHNpZ25hbGxlcignbG9jYWw6YW5ub3VuY2UnLCBhdHRyaWJ1dGVzKTtcbiAgICB9XG5cbiAgICBjbGVhclRpbWVvdXQoYW5ub3VuY2VUaW1lcik7XG5cbiAgICAvLyB1cGRhdGUgaW50ZXJuYWwgYXR0cmlidXRlc1xuICAgIGV4dGVuZChhdHRyaWJ1dGVzLCBkYXRhLCB7IGlkOiBzaWduYWxsZXIuaWQgfSk7XG5cbiAgICAvLyBpZiB3ZSBhcmUgYWxyZWFkeSBjb25uZWN0ZWQsIHRoZW4gZW5zdXJlIHdlIGFubm91bmNlIG9uXG4gICAgLy8gcmVjb25uZWN0XG4gICAgaWYgKGNvbm5lY3RlZCkge1xuICAgICAgLy8gYWx3YXlzIGFubm91bmNlIG9uIHJlY29ubmVjdFxuICAgICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdjb25uZWN0ZWQnLCBhbm5vdW5jZU9uUmVjb25uZWN0KTtcbiAgICAgIHNpZ25hbGxlci5vbignY29ubmVjdGVkJywgYW5ub3VuY2VPblJlY29ubmVjdCk7XG4gICAgfVxuXG4gICAgLy8gc2VuZCB0aGUgYXR0cmlidXRlcyBvdmVyIHRoZSBuZXR3b3JrXG4gICAgcmV0dXJuIGFubm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEgY29ubmVjdGVkKSB7XG4gICAgICAgIHJldHVybiBzaWduYWxsZXIub25jZSgnY29ubmVjdGVkJywgc2VuZEFubm91bmNlKTtcbiAgICAgIH1cblxuICAgICAgc2VuZEFubm91bmNlKCk7XG4gICAgfSwgKG9wdHMgfHwge30pLmFubm91bmNlRGVsYXkgfHwgMTApO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyBpc01hc3Rlcih0YXJnZXRJZClcblxuICAgIEEgc2ltcGxlIGZ1bmN0aW9uIHRoYXQgaW5kaWNhdGVzIHdoZXRoZXIgdGhlIGxvY2FsIHNpZ25hbGxlciBpcyB0aGUgbWFzdGVyXG4gICAgZm9yIGl0J3MgcmVsYXRpb25zaGlwIHdpdGggcGVlciBzaWduYWxsZXIgaW5kaWNhdGVkIGJ5IGB0YXJnZXRJZGAuICBSb2xlc1xuICAgIGFyZSBkZXRlcm1pbmVkIGF0IHRoZSBwb2ludCBhdCB3aGljaCBzaWduYWxsaW5nIHBlZXJzIGRpc2NvdmVyIGVhY2ggb3RoZXIsXG4gICAgYW5kIGFyZSBzaW1wbHkgd29ya2VkIG91dCBieSB3aGljaGV2ZXIgcGVlciBoYXMgdGhlIGxvd2VzdCBzaWduYWxsZXIgaWRcbiAgICB3aGVuIGxleGlncmFwaGljYWxseSBzb3J0ZWQuXG5cbiAgICBGb3IgZXhhbXBsZSwgaWYgd2UgaGF2ZSB0d28gc2lnbmFsbGVyIHBlZXJzIHRoYXQgaGF2ZSBkaXNjb3ZlcmVkIGVhY2hcbiAgICBvdGhlcnMgd2l0aCB0aGUgZm9sbG93aW5nIGlkczpcblxuICAgIC0gYGIxMWY0ZmQwLWZlYjUtNDQ3Yy04MGM4LWM1MWQ4YzNjY2VkMmBcbiAgICAtIGA4YTA3ZjgyZS00OWE1LTRiOWItYTAyZS00M2Q5MTEzODJiZTZgXG5cbiAgICBUaGV5IHdvdWxkIGJlIGFzc2lnbmVkIHJvbGVzOlxuXG4gICAgLSBgYjExZjRmZDAtZmViNS00NDdjLTgwYzgtYzUxZDhjM2NjZWQyYFxuICAgIC0gYDhhMDdmODJlLTQ5YTUtNGI5Yi1hMDJlLTQzZDkxMTM4MmJlNmAgKG1hc3RlcilcblxuICAqKi9cbiAgc2lnbmFsbGVyLmlzTWFzdGVyID0gZnVuY3Rpb24odGFyZ2V0SWQpIHtcbiAgICB2YXIgcGVlciA9IHBlZXJzLmdldCh0YXJnZXRJZCk7XG5cbiAgICByZXR1cm4gcGVlciAmJiBwZWVyLnJvbGVJZHggIT09IDA7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIGxlYXZlKClcblxuICAgIFRlbGwgdGhlIHNpZ25hbGxpbmcgc2VydmVyIHdlIGFyZSBsZWF2aW5nLiAgQ2FsbGluZyB0aGlzIGZ1bmN0aW9uIGlzXG4gICAgdXN1YWxseSBub3QgcmVxdWlyZWQgdGhvdWdoIGFzIHRoZSBzaWduYWxsaW5nIHNlcnZlciBzaG91bGQgaXNzdWUgY29ycmVjdFxuICAgIGAvbGVhdmVgIG1lc3NhZ2VzIHdoZW4gaXQgZGV0ZWN0cyBhIGRpc2Nvbm5lY3QgZXZlbnQuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5sZWF2ZSA9IHNpZ25hbGxlci5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHNlbmQgdGhlIGxlYXZlIHNpZ25hbFxuICAgIHNlbmQoJy9sZWF2ZScsIHsgaWQ6IGlkIH0pO1xuXG4gICAgLy8gc3RvcCBhbm5vdW5jaW5nIG9uIHJlY29ubmVjdFxuICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignY29ubmVjdGVkJywgYW5ub3VuY2VPblJlY29ubmVjdCk7XG5cbiAgICAvLyBjYWxsIHRoZSBjbG9zZSBtZXRob2RcbiAgICBpZiAodHlwZW9mIGNsb3NlID09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNsb3NlLmNhbGwobWVzc2VuZ2VyKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIG1ldGFkYXRhKGRhdGE/KVxuXG4gICAgR2V0IChwYXNzIG5vIGRhdGEpIG9yIHNldCB0aGUgbWV0YWRhdGEgdGhhdCBpcyBwYXNzZWQgdGhyb3VnaCB3aXRoIGVhY2hcbiAgICByZXF1ZXN0IHNlbnQgYnkgdGhlIHNpZ25hbGxlci5cblxuICAgIF9fTk9URTpfXyBSZWdhcmRsZXNzIG9mIHdoYXQgaXMgcGFzc2VkIHRvIHRoaXMgZnVuY3Rpb24sIG1ldGFkYXRhXG4gICAgZ2VuZXJhdGVkIGJ5IHRoZSBzaWduYWxsZXIgd2lsbCAqKmFsd2F5cyoqIGluY2x1ZGUgdGhlIGlkIG9mIHRoZSBzaWduYWxsZXJcbiAgICBhbmQgdGhpcyBjYW5ub3QgYmUgbW9kaWZpZWQuXG4gICoqL1xuICBzaWduYWxsZXIubWV0YWRhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBleHRlbmQoe30sIGxvY2FsTWV0YSk7XG4gICAgfVxuXG4gICAgbG9jYWxNZXRhID0gZXh0ZW5kKHt9LCBkYXRhKTtcbiAgfTtcblxuICAvKipcbiAgICAjIyMgdG8odGFyZ2V0SWQpXG5cbiAgICBVc2UgdGhlIGB0b2AgZnVuY3Rpb24gdG8gc2VuZCBhIG1lc3NhZ2UgdG8gdGhlIHNwZWNpZmllZCB0YXJnZXQgcGVlci5cbiAgICBBIGxhcmdlIHBhcmdlIG9mIG5lZ290aWF0aW5nIGEgV2ViUlRDIHBlZXIgY29ubmVjdGlvbiBpbnZvbHZlcyBkaXJlY3RcbiAgICBjb21tdW5pY2F0aW9uIGJldHdlZW4gdHdvIHBhcnRpZXMgd2hpY2ggbXVzdCBiZSBkb25lIGJ5IHRoZSBzaWduYWxsaW5nXG4gICAgc2VydmVyLiAgVGhlIGB0b2AgZnVuY3Rpb24gcHJvdmlkZXMgYSBzaW1wbGUgd2F5IHRvIHByb3ZpZGUgYSBsb2dpY2FsXG4gICAgY29tbXVuaWNhdGlvbiBjaGFubmVsIGJldHdlZW4gdGhlIHR3byBwYXJ0aWVzOlxuXG4gICAgYGBganNcbiAgICB2YXIgc2VuZCA9IHNpZ25hbGxlci50bygnZTk1ZmEwNWItOTA2Mi00NWM2LWJmYTItNTA1NWJmNjYyNWY0Jykuc2VuZDtcblxuICAgIC8vIGNyZWF0ZSBhbiBvZmZlciBvbiBhIGxvY2FsIHBlZXIgY29ubmVjdGlvblxuICAgIHBjLmNyZWF0ZU9mZmVyKFxuICAgICAgZnVuY3Rpb24oZGVzYykge1xuICAgICAgICAvLyBzZXQgdGhlIGxvY2FsIGRlc2NyaXB0aW9uIHVzaW5nIHRoZSBvZmZlciBzZHBcbiAgICAgICAgLy8gaWYgdGhpcyBvY2N1cnMgc3VjY2Vzc2Z1bGx5IHNlbmQgdGhpcyB0byBvdXIgcGVlclxuICAgICAgICBwYy5zZXRMb2NhbERlc2NyaXB0aW9uKFxuICAgICAgICAgIGRlc2MsXG4gICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzZW5kKCcvc2RwJywgZGVzYyk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBoYW5kbGVGYWlsXG4gICAgICAgICk7XG4gICAgICB9LFxuICAgICAgaGFuZGxlRmFpbFxuICAgICk7XG4gICAgYGBgXG5cbiAgKiovXG4gIHNpZ25hbGxlci50byA9IGZ1bmN0aW9uKHRhcmdldElkKSB7XG4gICAgLy8gY3JlYXRlIGEgc2VuZGVyIHRoYXQgd2lsbCBwcmVwZW5kIG1lc3NhZ2VzIHdpdGggL3RvfHRhcmdldElkfFxuICAgIHZhciBzZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGdldCB0aGUgcGVlciAoeWVzIHdoZW4gc2VuZCBpcyBjYWxsZWQgdG8gbWFrZSBzdXJlIGl0IGhhc24ndCBsZWZ0KVxuICAgICAgdmFyIHBlZXIgPSBzaWduYWxsZXIucGVlcnMuZ2V0KHRhcmdldElkKTtcbiAgICAgIHZhciBhcmdzO1xuXG4gICAgICBpZiAoISBwZWVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBwZWVyOiAnICsgdGFyZ2V0SWQpO1xuICAgICAgfVxuXG4gICAgICAvLyBpZiB0aGUgcGVlciBpcyBpbmFjdGl2ZSwgdGhlbiBhYm9ydFxuICAgICAgaWYgKHBlZXIuaW5hY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBhcmdzID0gW1xuICAgICAgICAnL3RvJyxcbiAgICAgICAgdGFyZ2V0SWRcbiAgICAgIF0uY29uY2F0KFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG5cbiAgICAgIC8vIGluamVjdCBtZXRhZGF0YVxuICAgICAgYXJncy5zcGxpY2UoMywgMCwgY3JlYXRlTWV0YWRhdGEoKSk7XG5cbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBjcmVhdGVEYXRhTGluZShhcmdzKTtcbiAgICAgICAgZGVidWcoJ1RYICgnICsgdGFyZ2V0SWQgKyAnKTogJyArIG1zZyk7XG5cbiAgICAgICAgd3JpdGUuY2FsbChtZXNzZW5nZXIsIG1zZyk7XG4gICAgICB9LCAwKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFubm91bmNlOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHJldHVybiBzaWduYWxsZXIuYW5ub3VuY2UoZGF0YSwgc2VuZGVyKTtcbiAgICAgIH0sXG5cbiAgICAgIHNlbmQ6IHNlbmRlcixcbiAgICB9XG4gIH07XG5cbiAgLy8gaW5pdGlhbGlzZSBvcHRzIGRlZmF1bHRzXG4gIG9wdHMgPSBkZWZhdWx0cyh7fSwgb3B0cywgcmVxdWlyZSgnLi9kZWZhdWx0cycpKTtcblxuICAvLyBzZXQgdGhlIGF1dG9yZXBseSBmbGFnXG4gIHNpZ25hbGxlci5hdXRvcmVwbHkgPSBhdXRvcmVwbHkgPT09IHVuZGVmaW5lZCB8fCBhdXRvcmVwbHk7XG5cbiAgLy8gaWYgdGhlIG1lc3NlbmdlciBpcyBhIHN0cmluZywgdGhlbiB3ZSBhcmUgZ29pbmcgdG8gYXR0YWNoIHRvIGFcbiAgLy8gd3MgZW5kcG9pbnQgYW5kIGF1dG9tYXRpY2FsbHkgc2V0IHVwIHByaW11c1xuICBpZiAodHlwZW9mIG1lc3NlbmdlciA9PSAnc3RyaW5nJyB8fCAobWVzc2VuZ2VyIGluc3RhbmNlb2YgU3RyaW5nKSkge1xuICAgIGNvbm5lY3RUb0hvc3QobWVzc2VuZ2VyKTtcbiAgfVxuICAvLyBvdGhlcndpc2UsIGluaXRpYWxpc2UgdGhlIGNvbm5lY3Rpb25cbiAgZWxzZSB7XG4gICAgaW5pdCgpO1xuICB9XG5cbiAgLy8gY29ubmVjdCBhbiBpbnN0YW5jZSBvZiB0aGUgbWVzc2VuZ2VyIHRvIHRoZSBzaWduYWxsZXJcbiAgc2lnbmFsbGVyLl9tZXNzZW5nZXIgPSBtZXNzZW5nZXI7XG5cbiAgLy8gZXhwb3NlIHRoZSBwcm9jZXNzIGFzIGEgcHJvY2VzcyBmdW5jdGlvblxuICBzaWduYWxsZXIucHJvY2VzcyA9IHByb2Nlc3NvcjtcblxuICByZXR1cm4gc2lnbmFsbGVyO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgncnRjL2NsZWFudXAnKTtcblxudmFyIENBTk5PVF9DTE9TRV9TVEFURVMgPSBbXG4gICdjbG9zZWQnXG5dO1xuXG52YXIgRVZFTlRTX0RFQ09VUExFX0JDID0gW1xuICAnYWRkc3RyZWFtJyxcbiAgJ2RhdGFjaGFubmVsJyxcbiAgJ2ljZWNhbmRpZGF0ZScsXG4gICduZWdvdGlhdGlvbm5lZWRlZCcsXG4gICdyZW1vdmVzdHJlYW0nLFxuICAnc2lnbmFsaW5nc3RhdGVjaGFuZ2UnXG5dO1xuXG52YXIgRVZFTlRTX0RFQ09VUExFX0FDID0gW1xuICAnaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJ1xuXTtcblxuLyoqXG4gICMjIyBydGMtdG9vbHMvY2xlYW51cFxuXG4gIGBgYFxuICBjbGVhbnVwKHBjKVxuICBgYGBcblxuICBUaGUgYGNsZWFudXBgIGZ1bmN0aW9uIGlzIHVzZWQgdG8gZW5zdXJlIHRoYXQgYSBwZWVyIGNvbm5lY3Rpb24gaXMgcHJvcGVybHlcbiAgY2xvc2VkIGFuZCByZWFkeSB0byBiZSBjbGVhbmVkIHVwIGJ5IHRoZSBicm93c2VyLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGMpIHtcbiAgLy8gc2VlIGlmIHdlIGNhbiBjbG9zZSB0aGUgY29ubmVjdGlvblxuICB2YXIgY3VycmVudFN0YXRlID0gcGMuaWNlQ29ubmVjdGlvblN0YXRlO1xuICB2YXIgY2FuQ2xvc2UgPSBDQU5OT1RfQ0xPU0VfU1RBVEVTLmluZGV4T2YoY3VycmVudFN0YXRlKSA8IDA7XG5cbiAgZnVuY3Rpb24gZGVjb3VwbGUoZXZlbnRzKSB7XG4gICAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZ0TmFtZSkge1xuICAgICAgaWYgKHBjWydvbicgKyBldnROYW1lXSkge1xuICAgICAgICBwY1snb24nICsgZXZ0TmFtZV0gPSBudWxsO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gZGVjb3VwbGUgXCJiZWZvcmUgY2xvc2VcIiBldmVudHNcbiAgZGVjb3VwbGUoRVZFTlRTX0RFQ09VUExFX0JDKTtcblxuICBpZiAoY2FuQ2xvc2UpIHtcbiAgICBkZWJ1ZygnYXR0ZW1wdGluZyBjb25uZWN0aW9uIGNsb3NlLCBjdXJyZW50IHN0YXRlOiAnKyBwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgIHBjLmNsb3NlKCk7XG4gIH1cblxuICAvLyByZW1vdmUgdGhlIGV2ZW50IGxpc3RlbmVyc1xuICAvLyBhZnRlciBhIHNob3J0IGRlbGF5IGdpdmluZyB0aGUgY29ubmVjdGlvbiB0aW1lIHRvIHRyaWdnZXJcbiAgLy8gY2xvc2UgYW5kIGljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZSBldmVudHNcbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICBkZWNvdXBsZShFVkVOVFNfREVDT1VQTEVfQUMpO1xuICB9LCAxMDApO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBtYnVzID0gcmVxdWlyZSgnbWJ1cycpO1xudmFyIHF1ZXVlID0gcmVxdWlyZSgncnRjLXRhc2txdWV1ZScpO1xudmFyIGNsZWFudXAgPSByZXF1aXJlKCcuL2NsZWFudXAnKTtcbnZhciBtb25pdG9yID0gcmVxdWlyZSgnLi9tb25pdG9yJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcbnZhciBmaW5kUGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG52YXIgQ0xPU0VEX1NUQVRFUyA9IFsgJ2Nsb3NlZCcsICdmYWlsZWQnIF07XG5cbi8qKlxuICAjIyMgcnRjLXRvb2xzL2NvdXBsZVxuXG4gICMjIyMgY291cGxlKHBjLCB0YXJnZXRJZCwgc2lnbmFsbGVyLCBvcHRzPylcblxuICBDb3VwbGUgYSBXZWJSVEMgY29ubmVjdGlvbiB3aXRoIGFub3RoZXIgd2VicnRjIGNvbm5lY3Rpb24gaWRlbnRpZmllZCBieVxuICBgdGFyZ2V0SWRgIHZpYSB0aGUgc2lnbmFsbGVyLlxuXG4gIFRoZSBmb2xsb3dpbmcgb3B0aW9ucyBjYW4gYmUgcHJvdmlkZWQgaW4gdGhlIGBvcHRzYCBhcmd1bWVudDpcblxuICAtIGBzZHBmaWx0ZXJgIChkZWZhdWx0OiBudWxsKVxuXG4gICAgQSBzaW1wbGUgZnVuY3Rpb24gZm9yIGZpbHRlcmluZyBTRFAgYXMgcGFydCBvZiB0aGUgcGVlclxuICAgIGNvbm5lY3Rpb24gaGFuZHNoYWtlIChzZWUgdGhlIFVzaW5nIEZpbHRlcnMgZGV0YWlscyBiZWxvdykuXG5cbiAgIyMjIyMgRXhhbXBsZSBVc2FnZVxuXG4gIGBgYGpzXG4gIHZhciBjb3VwbGUgPSByZXF1aXJlKCdydGMvY291cGxlJyk7XG5cbiAgY291cGxlKHBjLCAnNTQ4Nzk5NjUtY2U0My00MjZlLWE4ZWYtMDlhYzFlMzlhMTZkJywgc2lnbmFsbGVyKTtcbiAgYGBgXG5cbiAgIyMjIyMgVXNpbmcgRmlsdGVyc1xuXG4gIEluIGNlcnRhaW4gaW5zdGFuY2VzIHlvdSBtYXkgd2lzaCB0byBtb2RpZnkgdGhlIHJhdyBTRFAgdGhhdCBpcyBwcm92aWRlZFxuICBieSB0aGUgYGNyZWF0ZU9mZmVyYCBhbmQgYGNyZWF0ZUFuc3dlcmAgY2FsbHMuICBUaGlzIGNhbiBiZSBkb25lIGJ5IHBhc3NpbmdcbiAgYSBgc2RwZmlsdGVyYCBmdW5jdGlvbiAob3IgYXJyYXkpIGluIHRoZSBvcHRpb25zLiAgRm9yIGV4YW1wbGU6XG5cbiAgYGBganNcbiAgLy8gcnVuIHRoZSBzZHAgZnJvbSB0aHJvdWdoIGEgbG9jYWwgdHdlYWtTZHAgZnVuY3Rpb24uXG4gIGNvdXBsZShwYywgJzU0ODc5OTY1LWNlNDMtNDI2ZS1hOGVmLTA5YWMxZTM5YTE2ZCcsIHNpZ25hbGxlciwge1xuICAgIHNkcGZpbHRlcjogdHdlYWtTZHBcbiAgfSk7XG4gIGBgYFxuXG4qKi9cbmZ1bmN0aW9uIGNvdXBsZShwYywgdGFyZ2V0SWQsIHNpZ25hbGxlciwgb3B0cykge1xuICB2YXIgZGVidWdMYWJlbCA9IChvcHRzIHx8IHt9KS5kZWJ1Z0xhYmVsIHx8ICdydGMnO1xuICB2YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoZGVidWdMYWJlbCArICcvY291cGxlJyk7XG5cbiAgLy8gY3JlYXRlIGEgbW9uaXRvciBmb3IgdGhlIGNvbm5lY3Rpb25cbiAgdmFyIG1vbiA9IG1vbml0b3IocGMsIHRhcmdldElkLCBzaWduYWxsZXIsIChvcHRzIHx8IHt9KS5sb2dnZXIpO1xuICB2YXIgZW1pdCA9IG1idXMoJycsIG1vbik7XG4gIHZhciBxdWV1ZWRDYW5kaWRhdGVzID0gW107XG4gIHZhciBzZHBGaWx0ZXIgPSAob3B0cyB8fCB7fSkuc2RwZmlsdGVyO1xuICB2YXIgcmVhY3RpdmUgPSAob3B0cyB8fCB7fSkucmVhY3RpdmU7XG4gIHZhciBvZmZlclRpbWVvdXQ7XG4gIHZhciBlbmRPZkNhbmRpZGF0ZXMgPSB0cnVlO1xuICB2YXIgcGx1Z2luID0gZmluZFBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG5cbiAgLy8gY29uZmlndXJlIHRoZSB0aW1lIHRvIHdhaXQgYmV0d2VlbiByZWNlaXZpbmcgYSAnZGlzY29ubmVjdCdcbiAgLy8gaWNlQ29ubmVjdGlvblN0YXRlIGFuZCBkZXRlcm1pbmluZyB0aGF0IHdlIGFyZSBjbG9zZWRcbiAgdmFyIGRpc2Nvbm5lY3RUaW1lb3V0ID0gKG9wdHMgfHwge30pLmRpc2Nvbm5lY3RUaW1lb3V0IHx8IDEwMDAwO1xuICB2YXIgZGlzY29ubmVjdFRpbWVyO1xuXG4gIC8vIGluaXRpbGFpc2UgdGhlIG5lZ290aWF0aW9uIGhlbHBlcnNcbiAgdmFyIGlzTWFzdGVyID0gc2lnbmFsbGVyLmlzTWFzdGVyKHRhcmdldElkKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBwcm9jZXNzaW5nIHF1ZXVlIChvbmUgYXQgYSB0aW1lIHBsZWFzZSlcbiAgdmFyIHEgPSBxdWV1ZShwYywgb3B0cyk7XG5cbiAgZnVuY3Rpb24gY3JlYXRlT3JSZXF1ZXN0T2ZmZXIoKSB7XG4gICAgaWYgKCEgaXNNYXN0ZXIpIHtcbiAgICAgIHJldHVybiBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9uZWdvdGlhdGUnKTtcbiAgICB9XG5cbiAgICBxLmNyZWF0ZU9mZmVyKCk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWJvdW5jZU9mZmVyKCkge1xuICAgIGRlYnVnKCdkZWJvdW5jaW5nIG9mZmVyJyk7XG4gICAgY2xlYXJUaW1lb3V0KG9mZmVyVGltZW91dCk7XG4gICAgb2ZmZXJUaW1lb3V0ID0gc2V0VGltZW91dChxLmNyZWF0ZU9mZmVyLCA1MCk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWNvdXBsZSgpIHtcbiAgICBkZWJ1ZygnZGVjb3VwbGluZyAnICsgc2lnbmFsbGVyLmlkICsgJyBmcm9tICcgKyB0YXJnZXRJZCk7XG5cbiAgICAvLyBzdG9wIHRoZSBtb25pdG9yXG4vLyAgICAgbW9uLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgIG1vbi5zdG9wKCk7XG5cbiAgICAvLyBjbGVhbnVwIHRoZSBwZWVyY29ubmVjdGlvblxuICAgIGNsZWFudXAocGMpO1xuXG4gICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xuICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignc2RwJywgaGFuZGxlU2RwKTtcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ2NhbmRpZGF0ZScsIGhhbmRsZUNhbmRpZGF0ZSk7XG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCduZWdvdGlhdGUnLCBoYW5kbGVOZWdvdGlhdGVSZXF1ZXN0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZUNhbmRpZGF0ZShkYXRhKSB7XG4gICAgcS5hZGRJY2VDYW5kaWRhdGUoZGF0YSk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVTZHAoc2RwLCBzcmMpIHtcbiAgICBlbWl0KCdzZHAucmVtb3RlJywgc2RwKTtcblxuICAgIC8vIGlmIHRoZSBzb3VyY2UgaXMgdW5rbm93biBvciBub3QgYSBtYXRjaCwgdGhlbiBkb24ndCBwcm9jZXNzXG4gICAgaWYgKCghIHNyYykgfHwgKHNyYy5pZCAhPT0gdGFyZ2V0SWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcS5zZXRSZW1vdGVEZXNjcmlwdGlvbihzZHApO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlQ29ubmVjdGlvbkNsb3NlKCkge1xuICAgIGRlYnVnKCdjYXB0dXJlZCBwYyBjbG9zZSwgaWNlQ29ubmVjdGlvblN0YXRlID0gJyArIHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgZGVjb3VwbGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZURpc2Nvbm5lY3QoKSB7XG4gICAgZGVidWcoJ2NhcHR1cmVkIHBjIGRpc2Nvbm5lY3QsIG1vbml0b3JpbmcgY29ubmVjdGlvbiBzdGF0dXMnKTtcblxuICAgIC8vIHN0YXJ0IHRoZSBkaXNjb25uZWN0IHRpbWVyXG4gICAgZGlzY29ubmVjdFRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGRlYnVnKCdtYW51YWxseSBjbG9zaW5nIGNvbm5lY3Rpb24gYWZ0ZXIgZGlzY29ubmVjdCB0aW1lb3V0Jyk7XG4gICAgICBwYy5jbG9zZSgpO1xuICAgIH0sIGRpc2Nvbm5lY3RUaW1lb3V0KTtcblxuICAgIG1vbi5vbignc3RhdGVjaGFuZ2UnLCBoYW5kbGVEaXNjb25uZWN0QWJvcnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlRGlzY29ubmVjdEFib3J0KCkge1xuICAgIGRlYnVnKCdjb25uZWN0aW9uIHN0YXRlIGNoYW5nZWQgdG86ICcgKyBwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgIHJlc2V0RGlzY29ubmVjdFRpbWVyKCk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgY2xvc2VkIG9yIGZhaWxlZCBzdGF0dXMsIHRoZW4gY2xvc2UgdGhlIGNvbm5lY3Rpb25cbiAgICBpZiAoQ0xPU0VEX1NUQVRFUy5pbmRleE9mKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSkgPj0gMCkge1xuICAgICAgcmV0dXJuIG1vbignY2xvc2VkJyk7XG4gICAgfVxuXG4gICAgbW9uLm9uY2UoJ2Rpc2Nvbm5lY3QnLCBoYW5kbGVEaXNjb25uZWN0KTtcbiAgfTtcblxuICBmdW5jdGlvbiBoYW5kbGVMb2NhbENhbmRpZGF0ZShldnQpIHtcbiAgICBpZiAoZXZ0LmNhbmRpZGF0ZSkge1xuICAgICAgcmVzZXREaXNjb25uZWN0VGltZXIoKTtcblxuICAgICAgZW1pdCgnaWNlLmxvY2FsJywgZXZ0LmNhbmRpZGF0ZSk7XG4gICAgICBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9jYW5kaWRhdGUnLCBldnQuY2FuZGlkYXRlKTtcbiAgICAgIGVuZE9mQ2FuZGlkYXRlcyA9IGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIGlmICghIGVuZE9mQ2FuZGlkYXRlcykge1xuICAgICAgZW5kT2ZDYW5kaWRhdGVzID0gdHJ1ZTtcbiAgICAgIGVtaXQoJ2ljZS5nYXRoZXJjb21wbGV0ZScpO1xuICAgICAgc2lnbmFsbGVyLnRvKHRhcmdldElkKS5zZW5kKCcvZW5kb2ZjYW5kaWRhdGVzJywge30pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZU5lZ290aWF0ZVJlcXVlc3Qoc3JjKSB7XG4gICAgaWYgKHNyYy5pZCA9PT0gdGFyZ2V0SWQpIHtcbiAgICAgIGVtaXQoJ25lZ290aWF0ZS5yZXF1ZXN0Jywgc3JjLmlkKTtcbiAgICAgIGRlYm91bmNlT2ZmZXIoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZXNldERpc2Nvbm5lY3RUaW1lcigpIHtcbiAgICBtb24ub2ZmKCdzdGF0ZWNoYW5nZScsIGhhbmRsZURpc2Nvbm5lY3RBYm9ydCk7XG5cbiAgICAvLyBjbGVhciB0aGUgZGlzY29ubmVjdCB0aW1lclxuICAgIGRlYnVnKCdyZXNldCBkaXNjb25uZWN0IHRpbWVyLCBzdGF0ZTogJyArIHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgY2xlYXJUaW1lb3V0KGRpc2Nvbm5lY3RUaW1lcik7XG4gIH1cblxuICAvLyB3aGVuIHJlZ290aWF0aW9uIGlzIG5lZWRlZCBsb29rIGZvciB0aGUgcGVlclxuICBpZiAocmVhY3RpdmUpIHtcbiAgICBwYy5vbm5lZ290aWF0aW9ubmVlZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0KCduZWdvdGlhdGUucmVuZWdvdGlhdGUnKTtcbiAgICAgIGNyZWF0ZU9yUmVxdWVzdE9mZmVyKCk7XG4gICAgfTtcbiAgfVxuXG4gIHBjLm9uaWNlY2FuZGlkYXRlID0gaGFuZGxlTG9jYWxDYW5kaWRhdGU7XG5cbiAgLy8gd2hlbiB0aGUgdGFzayBxdWV1ZSB0ZWxscyB1cyB3ZSBoYXZlIHNkcCBhdmFpbGFibGUsIHNlbmQgdGhhdCBvdmVyIHRoZSB3aXJlXG4gIHEub24oJ3NkcC5sb2NhbCcsIGZ1bmN0aW9uKGRlc2MpIHtcbiAgICBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9zZHAnLCBkZXNjKTtcbiAgfSk7XG5cbiAgLy8gd2hlbiB3ZSByZWNlaXZlIHNkcCwgdGhlblxuICBzaWduYWxsZXIub24oJ3NkcCcsIGhhbmRsZVNkcCk7XG4gIHNpZ25hbGxlci5vbignY2FuZGlkYXRlJywgaGFuZGxlQ2FuZGlkYXRlKTtcblxuICAvLyBpZiB0aGlzIGlzIGEgbWFzdGVyIGNvbm5lY3Rpb24sIGxpc3RlbiBmb3IgbmVnb3RpYXRlIGV2ZW50c1xuICBpZiAoaXNNYXN0ZXIpIHtcbiAgICBzaWduYWxsZXIub24oJ25lZ290aWF0ZScsIGhhbmRsZU5lZ290aWF0ZVJlcXVlc3QpO1xuICB9XG5cbiAgLy8gd2hlbiB0aGUgY29ubmVjdGlvbiBjbG9zZXMsIHJlbW92ZSBldmVudCBoYW5kbGVyc1xuICBtb24ub25jZSgnY2xvc2VkJywgaGFuZGxlQ29ubmVjdGlvbkNsb3NlKTtcbiAgbW9uLm9uY2UoJ2Rpc2Nvbm5lY3RlZCcsIGhhbmRsZURpc2Nvbm5lY3QpO1xuXG4gIC8vIHBhdGNoIGluIHRoZSBjcmVhdGUgb2ZmZXIgZnVuY3Rpb25zXG4gIG1vbi5jcmVhdGVPZmZlciA9IGNyZWF0ZU9yUmVxdWVzdE9mZmVyO1xuXG4gIHJldHVybiBtb247XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY291cGxlO1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIyBydGMtdG9vbHMvZGV0ZWN0XG5cbiAgUHJvdmlkZSB0aGUgW3J0Yy1jb3JlL2RldGVjdF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtY29yZSNkZXRlY3QpXG4gIGZ1bmN0aW9uYWxpdHkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ2dlbmVyYXRvcnMnKTtcbnZhciBkZXRlY3QgPSByZXF1aXJlKCcuL2RldGVjdCcpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnY29nL2RlZmF1bHRzJyk7XG5cbnZhciBtYXBwaW5ncyA9IHtcbiAgY3JlYXRlOiB7XG4gICAgZHRsczogZnVuY3Rpb24oYykge1xuICAgICAgaWYgKCEgZGV0ZWN0Lm1veikge1xuICAgICAgICBjLm9wdGlvbmFsID0gKGMub3B0aW9uYWwgfHwgW10pLmNvbmNhdCh7IER0bHNTcnRwS2V5QWdyZWVtZW50OiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gICMjIyBydGMtdG9vbHMvZ2VuZXJhdG9yc1xuXG4gIFRoZSBnZW5lcmF0b3JzIHBhY2thZ2UgcHJvdmlkZXMgc29tZSB1dGlsaXR5IG1ldGhvZHMgZm9yIGdlbmVyYXRpbmdcbiAgY29uc3RyYWludCBvYmplY3RzIGFuZCBzaW1pbGFyIGNvbnN0cnVjdHMuXG5cbiAgYGBganNcbiAgdmFyIGdlbmVyYXRvcnMgPSByZXF1aXJlKCdydGMvZ2VuZXJhdG9ycycpO1xuICBgYGBcblxuKiovXG5cbi8qKlxuICAjIyMjIGdlbmVyYXRvcnMuY29uZmlnKGNvbmZpZylcblxuICBHZW5lcmF0ZSBhIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHN1aXRhYmxlIGZvciBwYXNzaW5nIGludG8gYW4gVzNDXG4gIFJUQ1BlZXJDb25uZWN0aW9uIGNvbnN0cnVjdG9yIGZpcnN0IGFyZ3VtZW50LCBiYXNlZCBvbiBvdXIgY3VzdG9tIGNvbmZpZy5cblxuICBJbiB0aGUgZXZlbnQgdGhhdCB5b3UgdXNlIHNob3J0IHRlcm0gYXV0aGVudGljYXRpb24gZm9yIFRVUk4sIGFuZCB5b3Ugd2FudFxuICB0byBnZW5lcmF0ZSBuZXcgYGljZVNlcnZlcnNgIHJlZ3VsYXJseSwgeW91IGNhbiBzcGVjaWZ5IGFuIGljZVNlcnZlckdlbmVyYXRvclxuICB0aGF0IHdpbGwgYmUgdXNlZCBwcmlvciB0byBjb3VwbGluZy4gVGhpcyBnZW5lcmF0b3Igc2hvdWxkIHJldHVybiBhIGZ1bGx5XG4gIGNvbXBsaWFudCBXM0MgKFJUQ0ljZVNlcnZlciBkaWN0aW9uYXJ5KVtodHRwOi8vd3d3LnczLm9yZy9UUi93ZWJydGMvI2lkbC1kZWYtUlRDSWNlU2VydmVyXS5cblxuICBJZiB5b3UgcGFzcyBpbiBib3RoIGEgZ2VuZXJhdG9yIGFuZCBpY2VTZXJ2ZXJzLCB0aGUgaWNlU2VydmVycyBfd2lsbCBiZVxuICBpZ25vcmVkIGFuZCB0aGUgZ2VuZXJhdG9yIHVzZWQgaW5zdGVhZC5cbioqL1xuXG52YXIgaWNlU2VydmVyR2VuZXJhdG9yID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gW107XG59XG5cbmV4cG9ydHMuY29uZmlnID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gIHZhciBpY2VTZXJ2ZXJHZW5lcmF0b3IgPSAoY29uZmlnIHx8IHt9KS5pY2VTZXJ2ZXJHZW5lcmF0b3I7XG5cbiAgcmV0dXJuIGRlZmF1bHRzKHt9LCBjb25maWcsIHtcbiAgICBpY2VTZXJ2ZXJzOiB0eXBlb2YgaWNlU2VydmVyR2VuZXJhdG9yID09ICdmdW5jdGlvbicgPyBpY2VTZXJ2ZXJHZW5lcmF0b3IoKSA6IFtdXG4gIH0pO1xufTtcblxuLyoqXG4gICMjIyMgZ2VuZXJhdG9ycy5jb25uZWN0aW9uQ29uc3RyYWludHMoZmxhZ3MsIGNvbnN0cmFpbnRzKVxuXG4gIFRoaXMgaXMgYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCB3aWxsIGdlbmVyYXRlIGFwcHJvcHJpYXRlIGNvbm5lY3Rpb25cbiAgY29uc3RyYWludHMgZm9yIGEgbmV3IGBSVENQZWVyQ29ubmVjdGlvbmAgb2JqZWN0IHdoaWNoIGlzIGNvbnN0cnVjdGVkXG4gIGluIHRoZSBmb2xsb3dpbmcgd2F5OlxuXG4gIGBgYGpzXG4gIHZhciBjb25uID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKGZsYWdzLCBjb25zdHJhaW50cyk7XG4gIGBgYFxuXG4gIEluIG1vc3QgY2FzZXMgdGhlIGNvbnN0cmFpbnRzIG9iamVjdCBjYW4gYmUgbGVmdCBlbXB0eSwgYnV0IHdoZW4gY3JlYXRpbmdcbiAgZGF0YSBjaGFubmVscyBzb21lIGFkZGl0aW9uYWwgb3B0aW9ucyBhcmUgcmVxdWlyZWQuICBUaGlzIGZ1bmN0aW9uXG4gIGNhbiBnZW5lcmF0ZSB0aG9zZSBhZGRpdGlvbmFsIG9wdGlvbnMgYW5kIGludGVsbGlnZW50bHkgY29tYmluZSBhbnlcbiAgdXNlciBkZWZpbmVkIGNvbnN0cmFpbnRzIChpbiBgY29uc3RyYWludHNgKSB3aXRoIHNob3J0aGFuZCBmbGFncyB0aGF0XG4gIG1pZ2h0IGJlIHBhc3NlZCB3aGlsZSB1c2luZyB0aGUgYHJ0Yy5jcmVhdGVDb25uZWN0aW9uYCBoZWxwZXIuXG4qKi9cbmV4cG9ydHMuY29ubmVjdGlvbkNvbnN0cmFpbnRzID0gZnVuY3Rpb24oZmxhZ3MsIGNvbnN0cmFpbnRzKSB7XG4gIHZhciBnZW5lcmF0ZWQgPSB7fTtcbiAgdmFyIG0gPSBtYXBwaW5ncy5jcmVhdGU7XG4gIHZhciBvdXQ7XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBmbGFncyBhbmQgYXBwbHkgdGhlIGNyZWF0ZSBtYXBwaW5nc1xuICBPYmplY3Qua2V5cyhmbGFncyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAobVtrZXldKSB7XG4gICAgICBtW2tleV0oZ2VuZXJhdGVkKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIGdlbmVyYXRlIHRoZSBjb25uZWN0aW9uIGNvbnN0cmFpbnRzXG4gIG91dCA9IGRlZmF1bHRzKHt9LCBjb25zdHJhaW50cywgZ2VuZXJhdGVkKTtcbiAgZGVidWcoJ2dlbmVyYXRlZCBjb25uZWN0aW9uIGNvbnN0cmFpbnRzOiAnLCBvdXQpO1xuXG4gIHJldHVybiBvdXQ7XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyBydGMtdG9vbHNcblxuICBUaGUgYHJ0Yy10b29sc2AgbW9kdWxlIGRvZXMgbW9zdCBvZiB0aGUgaGVhdnkgbGlmdGluZyB3aXRoaW4gdGhlXG4gIFtydGMuaW9dKGh0dHA6Ly9ydGMuaW8pIHN1aXRlLiAgUHJpbWFyaWx5IGl0IGhhbmRsZXMgdGhlIGxvZ2ljIG9mIGNvdXBsaW5nXG4gIGEgbG9jYWwgYFJUQ1BlZXJDb25uZWN0aW9uYCB3aXRoIGl0J3MgcmVtb3RlIGNvdW50ZXJwYXJ0IHZpYSBhblxuICBbcnRjLXNpZ25hbGxlcl0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc2lnbmFsbGVyKSBzaWduYWxsaW5nXG4gIGNoYW5uZWwuXG5cbiAgIyMgR2V0dGluZyBTdGFydGVkXG5cbiAgSWYgeW91IGRlY2lkZSB0aGF0IHRoZSBgcnRjLXRvb2xzYCBtb2R1bGUgaXMgYSBiZXR0ZXIgZml0IGZvciB5b3UgdGhhbiBlaXRoZXJcbiAgW3J0Yy1xdWlja2Nvbm5lY3RdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXF1aWNrY29ubmVjdCkgb3JcbiAgW3J0Yy1nbHVlXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1nbHVlKSB0aGVuIHRoZSBjb2RlIHNuaXBwZXQgYmVsb3dcbiAgd2lsbCBwcm92aWRlIHlvdSBhIGd1aWRlIG9uIGhvdyB0byBnZXQgc3RhcnRlZCB1c2luZyBpdCBpbiBjb25qdW5jdGlvbiB3aXRoXG4gIHRoZSBbcnRjLXNpZ25hbGxlcl0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc2lnbmFsbGVyKSBhbmRcbiAgW3J0Yy1tZWRpYV0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtbWVkaWEpIG1vZHVsZXM6XG5cbiAgPDw8IGV4YW1wbGVzL2dldHRpbmctc3RhcnRlZC5qc1xuXG4gIFRoaXMgY29kZSBkZWZpbml0ZWx5IGRvZXNuJ3QgY292ZXIgYWxsIHRoZSBjYXNlcyB0aGF0IHlvdSBuZWVkIHRvIGNvbnNpZGVyXG4gIChpLmUuIHBlZXJzIGxlYXZpbmcsIGV0YykgYnV0IGl0IHNob3VsZCBkZW1vbnN0cmF0ZSBob3cgdG86XG5cbiAgMS4gQ2FwdHVyZSB2aWRlbyBhbmQgYWRkIGl0IHRvIGEgcGVlciBjb25uZWN0aW9uXG4gIDIuIENvdXBsZSBhIGxvY2FsIHBlZXIgY29ubmVjdGlvbiB3aXRoIGEgcmVtb3RlIHBlZXIgY29ubmVjdGlvblxuICAzLiBEZWFsIHdpdGggdGhlIHJlbW90ZSBzdGVhbSBiZWluZyBkaXNjb3ZlcmVkIGFuZCBob3cgdG8gcmVuZGVyXG4gICAgIHRoYXQgdG8gdGhlIGxvY2FsIGludGVyZmFjZS5cblxuICAjIyBSZWZlcmVuY2VcblxuKiovXG5cbnZhciBnZW4gPSByZXF1aXJlKCcuL2dlbmVyYXRvcnMnKTtcblxuLy8gZXhwb3J0IGRldGVjdFxudmFyIGRldGVjdCA9IGV4cG9ydHMuZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcbnZhciBmaW5kUGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG5cbi8vIGV4cG9ydCBjb2cgbG9nZ2VyIGZvciBjb252ZW5pZW5jZVxuZXhwb3J0cy5sb2dnZXIgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJyk7XG5cbi8vIGV4cG9ydCBwZWVyIGNvbm5lY3Rpb25cbnZhciBSVENQZWVyQ29ubmVjdGlvbiA9XG5leHBvcnRzLlJUQ1BlZXJDb25uZWN0aW9uID0gZGV0ZWN0KCdSVENQZWVyQ29ubmVjdGlvbicpO1xuXG4vLyBhZGQgdGhlIGNvdXBsZSB1dGlsaXR5XG5leHBvcnRzLmNvdXBsZSA9IHJlcXVpcmUoJy4vY291cGxlJyk7XG5cbi8qKlxuICAjIyMgY3JlYXRlQ29ubmVjdGlvblxuXG4gIGBgYFxuICBjcmVhdGVDb25uZWN0aW9uKG9wdHM/LCBjb25zdHJhaW50cz8pID0+IFJUQ1BlZXJDb25uZWN0aW9uXG4gIGBgYFxuXG4gIENyZWF0ZSBhIG5ldyBgUlRDUGVlckNvbm5lY3Rpb25gIGF1dG8gZ2VuZXJhdGluZyBkZWZhdWx0IG9wdHMgYXMgcmVxdWlyZWQuXG5cbiAgYGBganNcbiAgdmFyIGNvbm47XG5cbiAgLy8gdGhpcyBpcyBva1xuICBjb25uID0gcnRjLmNyZWF0ZUNvbm5lY3Rpb24oKTtcblxuICAvLyBhbmQgc28gaXMgdGhpc1xuICBjb25uID0gcnRjLmNyZWF0ZUNvbm5lY3Rpb24oe1xuICAgIGljZVNlcnZlcnM6IFtdXG4gIH0pO1xuICBgYGBcbioqL1xuZXhwb3J0cy5jcmVhdGVDb25uZWN0aW9uID0gZnVuY3Rpb24ob3B0cywgY29uc3RyYWludHMpIHtcbiAgdmFyIHBsdWdpbiA9IGZpbmRQbHVnaW4oKG9wdHMgfHwge30pLnBsdWdpbnMpO1xuXG4gIC8vIGdlbmVyYXRlIHRoZSBjb25maWcgYmFzZWQgb24gb3B0aW9ucyBwcm92aWRlZFxuICB2YXIgY29uZmlnID0gZ2VuLmNvbmZpZyhvcHRzKTtcblxuICAvLyBnZW5lcmF0ZSBhcHByb3ByaWF0ZSBjb25uZWN0aW9uIGNvbnN0cmFpbnRzXG4gIHZhciBjb25zdHJhaW50cyA9IGdlbi5jb25uZWN0aW9uQ29uc3RyYWludHMob3B0cywgY29uc3RyYWludHMpO1xuXG4gIGlmIChwbHVnaW4gJiYgdHlwZW9mIHBsdWdpbi5jcmVhdGVDb25uZWN0aW9uID09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gcGx1Z2luLmNyZWF0ZUNvbm5lY3Rpb24oY29uZmlnLCBjb25zdHJhaW50cyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIG5ldyAoKG9wdHMgfHwge30pLlJUQ1BlZXJDb25uZWN0aW9uIHx8IFJUQ1BlZXJDb25uZWN0aW9uKShcbiAgICAgIGNvbmZpZywgY29uc3RyYWludHNcbiAgICApO1xuICB9XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIG1idXMgPSByZXF1aXJlKCdtYnVzJyk7XG5cbi8vIGRlZmluZSBzb21lIHN0YXRlIG1hcHBpbmdzIHRvIHNpbXBsaWZ5IHRoZSBldmVudHMgd2UgZ2VuZXJhdGVcbnZhciBzdGF0ZU1hcHBpbmdzID0ge1xuICBjb21wbGV0ZWQ6ICdjb25uZWN0ZWQnXG59O1xuXG4vLyBkZWZpbmUgdGhlIGV2ZW50cyB0aGF0IHdlIG5lZWQgdG8gd2F0Y2ggZm9yIHBlZXIgY29ubmVjdGlvblxuLy8gc3RhdGUgY2hhbmdlc1xudmFyIHBlZXJTdGF0ZUV2ZW50cyA9IFtcbiAgJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJyxcbiAgJ2ljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZScsXG5dO1xuXG4vKipcbiAgIyMjIHJ0Yy10b29scy9tb25pdG9yXG5cbiAgYGBgXG4gIG1vbml0b3IocGMsIHRhcmdldElkLCBzaWduYWxsZXIsIHBhcmVudEJ1cykgPT4gbWJ1c1xuICBgYGBcblxuICBUaGUgbW9uaXRvciBpcyBhIHVzZWZ1bCB0b29sIGZvciBkZXRlcm1pbmluZyB0aGUgc3RhdGUgb2YgYHBjYCAoYW5cbiAgYFJUQ1BlZXJDb25uZWN0aW9uYCkgaW5zdGFuY2UgaW4gdGhlIGNvbnRleHQgb2YgeW91ciBhcHBsaWNhdGlvbi4gVGhlXG4gIG1vbml0b3IgdXNlcyBib3RoIHRoZSBgaWNlQ29ubmVjdGlvblN0YXRlYCBpbmZvcm1hdGlvbiBvZiB0aGUgcGVlclxuICBjb25uZWN0aW9uIGFuZCBhbHNvIHRoZSB2YXJpb3VzXG4gIFtzaWduYWxsZXIgZXZlbnRzXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zaWduYWxsZXIjc2lnbmFsbGVyLWV2ZW50cylcbiAgdG8gZGV0ZXJtaW5lIHdoZW4gdGhlIGNvbm5lY3Rpb24gaGFzIGJlZW4gYGNvbm5lY3RlZGAgYW5kIHdoZW4gaXQgaGFzXG4gIGJlZW4gYGRpc2Nvbm5lY3RlZGAuXG5cbiAgQSBtb25pdG9yIGNyZWF0ZWQgYG1idXNgIGlzIHJldHVybmVkIGFzIHRoZSByZXN1bHQgb2YgYVxuICBbY291cGxlXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0YyNydGNjb3VwbGUpIGJldHdlZW4gYSBsb2NhbCBwZWVyXG4gIGNvbm5lY3Rpb24gYW5kIGl0J3MgcmVtb3RlIGNvdW50ZXJwYXJ0LlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGMsIHRhcmdldElkLCBzaWduYWxsZXIsIHBhcmVudEJ1cykge1xuICB2YXIgbW9uaXRvciA9IG1idXMoJycsIHBhcmVudEJ1cyk7XG4gIHZhciBzdGF0ZTtcblxuICBmdW5jdGlvbiBjaGVja1N0YXRlKCkge1xuICAgIHZhciBuZXdTdGF0ZSA9IGdldE1hcHBlZFN0YXRlKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG5cbiAgICAvLyBmbGFnIHRoZSB3ZSBoYWQgYSBzdGF0ZSBjaGFuZ2VcbiAgICBtb25pdG9yKCdzdGF0ZWNoYW5nZScsIHBjLCBuZXdTdGF0ZSk7XG5cbiAgICAvLyBpZiB0aGUgYWN0aXZlIHN0YXRlIGhhcyBjaGFuZ2VkLCB0aGVuIHNlbmQgdGhlIGFwcG9wcmlhdGUgbWVzc2FnZVxuICAgIGlmIChzdGF0ZSAhPT0gbmV3U3RhdGUpIHtcbiAgICAgIG1vbml0b3IobmV3U3RhdGUpO1xuICAgICAgc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVDbG9zZSgpIHtcbiAgICBtb25pdG9yKCdjbG9zZWQnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVBlZXJMZWF2ZShwZWVySWQpIHtcbiAgICAvLyBpZiB0aGUgcGVlciBsZWF2aW5nIGlzIG5vdCB0aGUgcGVlciB3ZSBhcmUgY29ubmVjdGVkIHRvXG4gICAgLy8gdGhlbiB3ZSBhcmVuJ3QgaW50ZXJlc3RlZFxuICAgIGlmIChwZWVySWQgIT09IHRhcmdldElkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gdHJpZ2dlciBhIGNsb3NlZCBldmVudFxuICAgIG1vbml0b3IoJ2Nsb3NlZCcpO1xuICB9XG5cbiAgcGMuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBoYW5kbGVDbG9zZSk7XG4gIHBlZXJTdGF0ZUV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2dE5hbWUpIHtcbiAgICBwYy5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIGNoZWNrU3RhdGUpO1xuICB9KTtcblxuICBtb25pdG9yLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBwYy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIGhhbmRsZUNsb3NlKTtcbiAgICBwZWVyU3RhdGVFdmVudHMuZm9yRWFjaChmdW5jdGlvbihldnROYW1lKSB7XG4gICAgICBwYy5yZW1vdmVFdmVudExpc3RlbmVyKGV2dE5hbWUsIGNoZWNrU3RhdGUpO1xuICAgIH0pO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBwZWVyOmxlYXZlIGxpc3RlbmVyXG4gICAgaWYgKHNpZ25hbGxlciAmJiB0eXBlb2Ygc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcigncGVlcjpsZWF2ZScsIGhhbmRsZVBlZXJMZWF2ZSk7XG4gICAgfVxuICB9O1xuXG4gIG1vbml0b3IuY2hlY2tTdGF0ZSA9IGNoZWNrU3RhdGU7XG5cbiAgLy8gaWYgd2UgaGF2ZW4ndCBiZWVuIHByb3ZpZGVkIGEgdmFsaWQgcGVlciBjb25uZWN0aW9uLCBhYm9ydFxuICBpZiAoISBwYykge1xuICAgIHJldHVybiBtb25pdG9yO1xuICB9XG5cbiAgLy8gZGV0ZXJtaW5lIHRoZSBpbml0aWFsIGlzIGFjdGl2ZSBzdGF0ZVxuICBzdGF0ZSA9IGdldE1hcHBlZFN0YXRlKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG5cbiAgLy8gaWYgd2UndmUgYmVlbiBwcm92aWRlZCBhIHNpZ25hbGxlciwgdGhlbiB3YXRjaCBmb3IgcGVlcjpsZWF2ZSBldmVudHNcbiAgaWYgKHNpZ25hbGxlciAmJiB0eXBlb2Ygc2lnbmFsbGVyLm9uID09ICdmdW5jdGlvbicpIHtcbiAgICBzaWduYWxsZXIub24oJ3BlZXI6bGVhdmUnLCBoYW5kbGVQZWVyTGVhdmUpO1xuICB9XG5cbiAgcmV0dXJuIG1vbml0b3I7XG59O1xuXG4vKiBpbnRlcm5hbCBoZWxwZXJzICovXG5cbmZ1bmN0aW9uIGdldE1hcHBlZFN0YXRlKHN0YXRlKSB7XG4gIHJldHVybiBzdGF0ZU1hcHBpbmdzW3N0YXRlXSB8fCBzdGF0ZTtcbn1cbiIsInZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTtcbnZhciB6aXAgPSByZXF1aXJlKCd3aGlzay96aXAnKTtcbnZhciBmaW5kUGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG52YXIgUHJpb3JpdHlRdWV1ZSA9IHJlcXVpcmUoJ3ByaW9yaXR5cXVldWVqcycpO1xuXG4vLyBzb21lIHZhbGlkYXRpb24gcm91dGluZXNcbnZhciBjaGVja0NhbmRpZGF0ZSA9IHJlcXVpcmUoJ3J0Yy12YWxpZGF0b3IvY2FuZGlkYXRlJyk7XG5cbi8vIHRoZSBzZHAgY2xlYW5lclxudmFyIHNkcGNsZWFuID0gcmVxdWlyZSgncnRjLXNkcGNsZWFuJyk7XG5cbnZhciBQUklPUklUWV9MT1cgPSAxMDA7XG52YXIgUFJJT1JJVFlfV0FJVCA9IDEwMDA7XG5cbi8vIHByaW9yaXR5IG9yZGVyIChsb3dlciBpcyBiZXR0ZXIpXG52YXIgREVGQVVMVF9QUklPUklUSUVTID0gW1xuICAnY2FuZGlkYXRlJyxcbiAgJ3NldExvY2FsRGVzY3JpcHRpb24nLFxuICAnc2V0UmVtb3RlRGVzY3JpcHRpb24nLFxuICAnY3JlYXRlQW5zd2VyJyxcbiAgJ2NyZWF0ZU9mZmVyJ1xuXTtcblxuLy8gZGVmaW5lIGV2ZW50IG1hcHBpbmdzXG52YXIgTUVUSE9EX0VWRU5UUyA9IHtcbiAgc2V0TG9jYWxEZXNjcmlwdGlvbjogJ3NldGxvY2FsZGVzYycsXG4gIHNldFJlbW90ZURlc2NyaXB0aW9uOiAnc2V0cmVtb3RlZGVzYycsXG4gIGNyZWF0ZU9mZmVyOiAnb2ZmZXInLFxuICBjcmVhdGVBbnN3ZXI6ICdhbnN3ZXInXG59O1xuXG4vKipcbiAgIyBydGMtdGFza3F1ZXVlXG5cbiAgVGhpcyBpcyBhIHBhY2thZ2UgdGhhdCBhc3Npc3RzIHdpdGggYXBwbHlpbmcgYWN0aW9ucyB0byBhbiBgUlRDUGVlckNvbm5lY3Rpb25gXG4gIGluIGFzIHJlbGlhYmxlIG9yZGVyIGFzIHBvc3NpYmxlLiBJdCBpcyBwcmltYXJpbHkgdXNlZCBieSB0aGUgY291cGxpbmcgbG9naWNcbiAgb2YgdGhlIFtgcnRjLXRvb2xzYF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtdG9vbHMpLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBUbyBiZSBjb21wbGV0ZWRcbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwYywgb3B0cykge1xuICAvLyBjcmVhdGUgdGhlIHRhc2sgcXVldWVcbiAgdmFyIHF1ZXVlID0gbmV3IFByaW9yaXR5UXVldWUob3JkZXJUYXNrcyk7XG4gIHZhciB0cSA9IHJlcXVpcmUoJ21idXMnKSgnJywgKG9wdHMgfHwge30pLmxvZ2dlcik7XG5cbiAgLy8gaW5pdGlhbGlzZSB0YXNrIGltcG9ydGFuY2VcbiAgdmFyIHByaW9yaXRpZXMgPSAob3B0cyB8fCB7fSkucHJpb3JpdGllcyB8fCBERUZBVUxUX1BSSU9SSVRJRVM7XG5cbiAgLy8gY2hlY2sgZm9yIHBsdWdpbiB1c2FnZVxuICB2YXIgcGx1Z2luID0gZmluZFBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG5cbiAgLy8gaW5pdGlhbGlzZSBzdGF0ZSB0cmFja2luZ1xuICB2YXIgY2hlY2tRdWV1ZVRpbWVyID0gMDtcbiAgdmFyIGN1cnJlbnRUYXNrO1xuICB2YXIgZGVmYXVsdEZhaWwgPSB0cS5iaW5kKHRxLCAnZmFpbCcpO1xuXG4gIC8vIGluaXRpYWxpc2Ugc2Vzc2lvbiBkZXNjcmlwdGlvbiBhbmQgaWNlY2FuZGlkYXRlIG9iamVjdHNcbiAgdmFyIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IChvcHRzIHx8IHt9KS5SVENTZXNzaW9uRGVzY3JpcHRpb24gfHxcbiAgICBkZXRlY3QoJ1JUQ1Nlc3Npb25EZXNjcmlwdGlvbicpO1xuXG4gIHZhciBSVENJY2VDYW5kaWRhdGUgPSAob3B0cyB8fCB7fSkuUlRDSWNlQ2FuZGlkYXRlIHx8XG4gICAgZGV0ZWN0KCdSVENJY2VDYW5kaWRhdGUnKTtcblxuICBmdW5jdGlvbiBhYm9ydFF1ZXVlKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGx5Q2FuZGlkYXRlKHRhc2ssIG5leHQpIHtcbiAgICB2YXIgY2FuZGlkYXRlO1xuICAgIHZhciBkYXRhID0gdGFzay5hcmdzWzBdO1xuXG4gICAgLy8gd2UgaGF2ZSBhIG51bGwgY2FuZGlkYXRlLCB3ZSBoYXZlIGZpbmlzaGVkIGdhdGhlcmluZyBjYW5kaWRhdGVzXG4gICAgaWYgKCEgZGF0YS5jYW5kaWRhdGUpIHtcbiAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNhbmRpZGF0ZSA9IGNyZWF0ZUljZUNhbmRpZGF0ZShkYXRhKTtcbiAgICAgIHBjLmFkZEljZUNhbmRpZGF0ZShjYW5kaWRhdGUpO1xuICAgICAgdHEoJ2ljZS5yZW1vdGUuYXBwbGllZCcsIGNhbmRpZGF0ZSk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICB0cSgnaWNlLnJlbW90ZS5pbnZhbGlkJywgY2FuZGlkYXRlKTtcbiAgICAgIHJldHVybiBuZXh0KGUpO1xuICAgIH1cblxuICAgIG5leHQoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrUXVldWUoKSB7XG4gICAgLy8gcGVlayBhdCB0aGUgbmV4dCBpdGVtIG9uIHRoZSBxdWV1ZVxuICAgIHZhciBuZXh0ID0gKCEgcXVldWUuaXNFbXB0eSgpKSAmJiAoISBjdXJyZW50VGFzaykgJiYgcXVldWUucGVlaygpO1xuICAgIHZhciByZWFkeSA9IG5leHQgJiYgdGVzdFJlYWR5KG5leHQpO1xuICAgIHZhciByZXRyeSA9ICghIHF1ZXVlLmlzRW1wdHkoKSkgJiYgaXNOb3RDbG9zZWQocGMpO1xuXG4vLyAgICAgZGVidWcoJ2NoZWNraW5nIHF1ZXVlOiAnLCBjdXJyZW50VGFzaywgbmV4dCAmJiBuZXh0Lm5hbWUsIHJlYWR5KTtcblxuICAgIC8vIGlmIHdlIGRvbid0IGhhdmUgYSB0YXNrIHJlYWR5LCB0aGVuIGFib3J0XG4gICAgaWYgKCEgcmVhZHkpIHtcbiAgICAgIHJldHVybiByZXRyeSAmJiB0cmlnZ2VyUXVldWVDaGVjaygxMDApO1xuICAgIH1cblxuICAgIC8vIHVwZGF0ZSB0aGUgY3VycmVudCB0YXNrIChkZXF1ZXVlKVxuICAgIGN1cnJlbnRUYXNrID0gcXVldWUuZGVxKCk7XG5cbiAgICAvLyBwcm9jZXNzIHRoZSB0YXNrXG4gICAgY3VycmVudFRhc2suZm4oY3VycmVudFRhc2ssIGZ1bmN0aW9uKGVycikge1xuICAgICAgdmFyIGZhaWwgPSBjdXJyZW50VGFzay5mYWlsIHx8IGRlZmF1bHRGYWlsO1xuICAgICAgdmFyIHBhc3MgPSBjdXJyZW50VGFzay5wYXNzO1xuICAgICAgdmFyIHRhc2tOYW1lID0gY3VycmVudFRhc2submFtZTtcblxuICAgICAgLy8gdW5zZXQgdGhlIGN1cnJlbnQgdGFza1xuICAgICAgY3VycmVudFRhc2sgPSBudWxsO1xuXG4gICAgICAvLyBpZiBlcnJvcmVkLCBmYWlsXG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGFza05hbWUgKyAnIHRhc2sgZmFpbGVkOiAnLCBlcnIpO1xuICAgICAgICByZXR1cm4gZmFpbChlcnIpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHBhc3MgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBwYXNzLmFwcGx5KG51bGwsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgICB9XG5cbiAgICAgIHRyaWdnZXJRdWV1ZUNoZWNrKCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhbnNkcChkZXNjKSB7XG4gICAgLy8gZW5zdXJlIHdlIGhhdmUgY2xlYW4gc2RwXG4gICAgdmFyIHNkcEVycm9ycyA9IFtdO1xuICAgIHZhciBzZHAgPSBkZXNjICYmIHNkcGNsZWFuKGRlc2Muc2RwLCB7IGNvbGxlY3Rvcjogc2RwRXJyb3JzIH0pO1xuXG4gICAgLy8gaWYgd2UgZG9uJ3QgaGF2ZSBhIG1hdGNoLCBsb2cgc29tZSBpbmZvXG4gICAgaWYgKGRlc2MgJiYgc2RwICE9PSBkZXNjLnNkcCkge1xuICAgICAgY29uc29sZS5pbmZvKCdpbnZhbGlkIGxpbmVzIHJlbW92ZWQgZnJvbSBzZHA6ICcsIHNkcEVycm9ycyk7XG4gICAgICBkZXNjLnNkcCA9IHNkcDtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVzYztcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBsZXRlQ29ubmVjdGlvbigpIHtcbiAgICBpZiAocGMuc2lnbmFsaW5nU3RhdGUgPT09ICdoYXZlLXJlbW90ZS1vZmZlcicpIHtcbiAgICAgIHJldHVybiB0cS5jcmVhdGVBbnN3ZXIoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVJY2VDYW5kaWRhdGUoZGF0YSkge1xuICAgIGlmIChwbHVnaW4gJiYgdHlwZW9mIHBsdWdpbi5jcmVhdGVJY2VDYW5kaWRhdGUgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHBsdWdpbi5jcmVhdGVJY2VDYW5kaWRhdGUoZGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSVENJY2VDYW5kaWRhdGUoZGF0YSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVTZXNzaW9uRGVzY3JpcHRpb24oZGF0YSkge1xuICAgIGlmIChwbHVnaW4gJiYgdHlwZW9mIHBsdWdpbi5jcmVhdGVTZXNzaW9uRGVzY3JpcHRpb24gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHBsdWdpbi5jcmVhdGVTZXNzaW9uRGVzY3JpcHRpb24oZGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oZGF0YSk7XG4gIH1cblxuICBmdW5jdGlvbiBlbWl0U2RwKHNkcCkge1xuICAgIHRxKCdzZHAubG9jYWwnLCBwYy5sb2NhbERlc2NyaXB0aW9uKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVucXVldWUobmFtZSwgaGFuZGxlciwgb3B0cykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgICBpZiAob3B0cyAmJiB0eXBlb2Ygb3B0cy5wcm9jZXNzQXJncyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGFyZ3MgPSBhcmdzLm1hcChvcHRzLnByb2Nlc3NBcmdzKTtcbiAgICAgIH1cblxuICAgICAgcXVldWUuZW5xKHtcbiAgICAgICAgYXJnczogYXJncyxcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgZm46IGhhbmRsZXIsXG5cbiAgICAgICAgLy8gaW5pdGlsYWlzZSBhbnkgY2hlY2tzIHRoYXQgbmVlZCB0byBiZSBkb25lIHByaW9yXG4gICAgICAgIC8vIHRvIHRoZSB0YXNrIGV4ZWN1dGluZ1xuICAgICAgICBjaGVja3M6IFsgaXNOb3RDbG9zZWQgXS5jb25jYXQoKG9wdHMgfHwge30pLmNoZWNrcyB8fCBbXSksXG5cbiAgICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgcGFzcyBhbmQgZmFpbCBoYW5kbGVyc1xuICAgICAgICBwYXNzOiAob3B0cyB8fCB7fSkucGFzcyxcbiAgICAgICAgZmFpbDogKG9wdHMgfHwge30pLmZhaWxcbiAgICAgIH0pO1xuXG4gICAgICB0cmlnZ2VyUXVldWVDaGVjaygpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBleGVjTWV0aG9kKHRhc2ssIG5leHQpIHtcbiAgICB2YXIgZm4gPSBwY1t0YXNrLm5hbWVdO1xuICAgIHZhciBldmVudE5hbWUgPSBNRVRIT0RfRVZFTlRTW3Rhc2submFtZV0gfHwgKHRhc2submFtZSB8fCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgY2JBcmdzID0gWyBzdWNjZXNzLCBmYWlsIF07XG4gICAgdmFyIGlzT2ZmZXIgPSB0YXNrLm5hbWUgPT09ICdjcmVhdGVPZmZlcic7XG5cbiAgICBmdW5jdGlvbiBmYWlsKGVycikge1xuICAgICAgdHEuYXBwbHkodHEsIFsgJ25lZ290aWF0ZS5lcnJvcicsIHRhc2submFtZSwgZXJyIF0uY29uY2F0KHRhc2suYXJncykpO1xuICAgICAgbmV4dChlcnIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICB0cS5hcHBseSh0cSwgWyBbJ25lZ290aWF0ZScsIGV2ZW50TmFtZSwgJ29rJ10sIHRhc2submFtZSBdLmNvbmNhdCh0YXNrLmFyZ3MpKTtcbiAgICAgIG5leHQuYXBwbHkobnVsbCwgW251bGxdLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGZuICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBuZXh0KG5ldyBFcnJvcignY2Fubm90IGNhbGwgXCInICsgdGFzay5uYW1lICsgJ1wiIG9uIFJUQ1BlZXJDb25uZWN0aW9uJykpO1xuICAgIH1cblxuICAgIC8vIGludm9rZSB0aGUgZnVuY3Rpb25cbiAgICB0cS5hcHBseSh0cSwgWyduZWdvdGlhdGUuJyArIGV2ZW50TmFtZV0uY29uY2F0KHRhc2suYXJncykpO1xuICAgIGZuLmFwcGx5KFxuICAgICAgcGMsXG4gICAgICB0YXNrLmFyZ3MuY29uY2F0KGNiQXJncykuY29uY2F0KGlzT2ZmZXIgPyBnZW5lcmF0ZUNvbnN0cmFpbnRzKCkgOiBbXSlcbiAgICApO1xuICB9XG5cbiAgZnVuY3Rpb24gZXh0cmFjdENhbmRpZGF0ZUV2ZW50RGF0YShkYXRhKSB7XG4gICAgLy8gaWYgd2UgaGF2ZSBiZWVuIHBhc3NlZCBhbiBldmVudCwgdGhlbiBleHRyYWN0IHRoZSBjYW5kaWRhdGUgZnJvbSB0aGUgZGF0YVxuICAgIGlmIChkYXRhLnNyY0VsZW1lbnQgJiYgZGF0YS5jYW5kaWRhdGUpIHtcbiAgICAgIGRhdGEgPSBkYXRhLmNhbmRpZGF0ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdlbmVyYXRlQ29uc3RyYWludHMoKSB7XG4gICAgdmFyIGFsbG93ZWRLZXlzID0ge1xuICAgICAgb2ZmZXJ0b3JlY2VpdmV2aWRlbzogJ09mZmVyVG9SZWNlaXZlVmlkZW8nLFxuICAgICAgb2ZmZXJ0b3JlY2VpdmVhdWRpbzogJ09mZmVyVG9SZWNlaXZlQXVkaW8nLFxuICAgICAgaWNlcmVzdGFydDogJ0ljZVJlc3RhcnQnLFxuICAgICAgdm9pY2VhY3Rpdml0eWRldGVjdGlvbjogJ1ZvaWNlQWN0aXZpdHlEZXRlY3Rpb24nXG4gICAgfTtcblxuICAgIHZhciBjb25zdHJhaW50cyA9IHtcbiAgICAgIE9mZmVyVG9SZWNlaXZlVmlkZW86IHRydWUsXG4gICAgICBPZmZlclRvUmVjZWl2ZUF1ZGlvOiB0cnVlXG4gICAgfTtcblxuICAgIC8vIHVwZGF0ZSBrbm93biBrZXlzIHRvIG1hdGNoXG4gICAgT2JqZWN0LmtleXMob3B0cyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmIChhbGxvd2VkS2V5c1trZXkudG9Mb3dlckNhc2VdKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzW2FsbG93ZWRLZXlzW2tleS50b0xvd2VyQ2FzZSgpXV0gPSBvcHRzW2tleV07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4geyBtYW5kYXRvcnk6IGNvbnN0cmFpbnRzIH07XG4gIH1cblxuICBmdW5jdGlvbiBoYXNMb2NhbE9yUmVtb3RlRGVzYyhwYywgdGFzaykge1xuICAgIHJldHVybiBwYy5sb2NhbERlc2NyaXB0aW9uICE9PSBudWxsIHx8IHBjLnJlbW90ZURlc2NyaXB0aW9uICE9PSBudWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNOb3ROZWdvdGlhdGluZyhwYykge1xuICAgIHJldHVybiBwYy5zaWduYWxpbmdTdGF0ZSAhPT0gJ2hhdmUtbG9jYWwtb2ZmZXInO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNOb3RDbG9zZWQocGMpIHtcbiAgICByZXR1cm4gcGMuc2lnbmFsaW5nU3RhdGUgIT09ICdjbG9zZWQnO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNTdGFibGUocGMpIHtcbiAgICByZXR1cm4gcGMuc2lnbmFsaW5nU3RhdGUgPT09ICdzdGFibGUnO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNWYWxpZENhbmRpZGF0ZShwYywgZGF0YSkge1xuICAgIHJldHVybiBjaGVja0NhbmRpZGF0ZShkYXRhLmFyZ3NbMF0pLmxlbmd0aCA9PT0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9yZGVyVGFza3MoYSwgYikge1xuICAgIC8vIGFwcGx5IGVhY2ggb2YgdGhlIGNoZWNrcyBmb3IgZWFjaCB0YXNrXG4gICAgdmFyIHRhc2tzID0gW2EsYl07XG4gICAgdmFyIHJlYWRpbmVzcyA9IHRhc2tzLm1hcCh0ZXN0UmVhZHkpO1xuICAgIHZhciB0YXNrUHJpb3JpdGllcyA9IHRhc2tzLm1hcCh6aXAocmVhZGluZXNzKSkubWFwKGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgIHZhciBwcmlvcml0eSA9IHByaW9yaXRpZXMuaW5kZXhPZihhcmdzWzBdLm5hbWUpO1xuXG4gICAgICByZXR1cm4gYXJnc1sxXSA/IChwcmlvcml0eSA+PSAwID8gcHJpb3JpdHkgOiBQUklPUklUWV9MT1cpIDogUFJJT1JJVFlfV0FJVDtcbiAgICB9KTtcblxuICAgIHJldHVybiB0YXNrUHJpb3JpdGllc1sxXSAtIHRhc2tQcmlvcml0aWVzWzBdO1xuICB9XG5cbiAgLy8gY2hlY2sgd2hldGhlciBhIHRhc2sgaXMgcmVhZHkgKGRvZXMgaXQgcGFzcyBhbGwgdGhlIGNoZWNrcylcbiAgZnVuY3Rpb24gdGVzdFJlYWR5KHRhc2spIHtcbiAgICByZXR1cm4gKHRhc2suY2hlY2tzIHx8IFtdKS5yZWR1Y2UoZnVuY3Rpb24obWVtbywgY2hlY2spIHtcbiAgICAgIHJldHVybiBtZW1vICYmIGNoZWNrKHBjLCB0YXNrKTtcbiAgICB9LCB0cnVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyaWdnZXJRdWV1ZUNoZWNrKHdhaXQpIHtcbiAgICBjbGVhclRpbWVvdXQoY2hlY2tRdWV1ZVRpbWVyKTtcbiAgICBjaGVja1F1ZXVlVGltZXIgPSBzZXRUaW1lb3V0KGNoZWNrUXVldWUsIHdhaXQgfHwgNSk7XG4gIH1cblxuICAvLyBwYXRjaCBpbiB0aGUgcXVldWUgaGVscGVyIG1ldGhvZHNcbiAgdHEuYWRkSWNlQ2FuZGlkYXRlID0gZW5xdWV1ZSgnYWRkSWNlQ2FuZGlkYXRlJywgYXBwbHlDYW5kaWRhdGUsIHtcbiAgICBwcm9jZXNzQXJnczogZXh0cmFjdENhbmRpZGF0ZUV2ZW50RGF0YSxcbiAgICBjaGVja3M6IFsgaGFzTG9jYWxPclJlbW90ZURlc2MsIGlzVmFsaWRDYW5kaWRhdGUgXVxuICB9KTtcblxuICB0cS5zZXRMb2NhbERlc2NyaXB0aW9uID0gZW5xdWV1ZSgnc2V0TG9jYWxEZXNjcmlwdGlvbicsIGV4ZWNNZXRob2QsIHtcbiAgICBwcm9jZXNzQXJnczogY2xlYW5zZHAsXG4gICAgcGFzczogZW1pdFNkcFxuICB9KTtcblxuICB0cS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGVucXVldWUoJ3NldFJlbW90ZURlc2NyaXB0aW9uJywgZXhlY01ldGhvZCwge1xuICAgIHByb2Nlc3NBcmdzOiBjcmVhdGVTZXNzaW9uRGVzY3JpcHRpb24sXG4gICAgcGFzczogY29tcGxldGVDb25uZWN0aW9uXG4gIH0pO1xuXG4gIHRxLmNyZWF0ZU9mZmVyID0gZW5xdWV1ZSgnY3JlYXRlT2ZmZXInLCBleGVjTWV0aG9kLCB7XG4gICAgY2hlY2tzOiBbIGlzTm90TmVnb3RpYXRpbmcgXSxcbiAgICBwYXNzOiB0cS5zZXRMb2NhbERlc2NyaXB0aW9uXG4gIH0pO1xuXG4gIHRxLmNyZWF0ZUFuc3dlciA9IGVucXVldWUoJ2NyZWF0ZUFuc3dlcicsIGV4ZWNNZXRob2QsIHtcbiAgICBwYXNzOiB0cS5zZXRMb2NhbERlc2NyaXB0aW9uXG4gIH0pO1xuXG4gIHJldHVybiB0cTtcbn07XG4iLCIvKipcbiAqIEV4cG9zZSBgUHJpb3JpdHlRdWV1ZWAuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gUHJpb3JpdHlRdWV1ZTtcblxuLyoqXG4gKiBJbml0aWFsaXplcyBhIG5ldyBlbXB0eSBgUHJpb3JpdHlRdWV1ZWAgd2l0aCB0aGUgZ2l2ZW4gYGNvbXBhcmF0b3IoYSwgYilgXG4gKiBmdW5jdGlvbiwgdXNlcyBgLkRFRkFVTFRfQ09NUEFSQVRPUigpYCB3aGVuIG5vIGZ1bmN0aW9uIGlzIHByb3ZpZGVkLlxuICpcbiAqIFRoZSBjb21wYXJhdG9yIGZ1bmN0aW9uIG11c3QgcmV0dXJuIGEgcG9zaXRpdmUgbnVtYmVyIHdoZW4gYGEgPiBiYCwgMCB3aGVuXG4gKiBgYSA9PSBiYCBhbmQgYSBuZWdhdGl2ZSBudW1iZXIgd2hlbiBgYSA8IGJgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAcmV0dXJuIHtQcmlvcml0eVF1ZXVlfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gUHJpb3JpdHlRdWV1ZShjb21wYXJhdG9yKSB7XG4gIHRoaXMuX2NvbXBhcmF0b3IgPSBjb21wYXJhdG9yIHx8IFByaW9yaXR5UXVldWUuREVGQVVMVF9DT01QQVJBVE9SO1xuICB0aGlzLl9lbGVtZW50cyA9IFtdO1xufVxuXG4vKipcbiAqIENvbXBhcmVzIGBhYCBhbmQgYGJgLCB3aGVuIGBhID4gYmAgaXQgcmV0dXJucyBhIHBvc2l0aXZlIG51bWJlciwgd2hlblxuICogaXQgcmV0dXJucyAwIGFuZCB3aGVuIGBhIDwgYmAgaXQgcmV0dXJucyBhIG5lZ2F0aXZlIG51bWJlci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IGFcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gYlxuICogQHJldHVybiB7TnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuUHJpb3JpdHlRdWV1ZS5ERUZBVUxUX0NPTVBBUkFUT1IgPSBmdW5jdGlvbihhLCBiKSB7XG4gIGlmIChhIGluc3RhbmNlb2YgTnVtYmVyICYmIGIgaW5zdGFuY2VvZiBOdW1iZXIpIHtcbiAgICByZXR1cm4gYSAtIGI7XG4gIH0gZWxzZSB7XG4gICAgYSA9IGEudG9TdHJpbmcoKTtcbiAgICBiID0gYi50b1N0cmluZygpO1xuXG4gICAgaWYgKGEgPT0gYikgcmV0dXJuIDA7XG5cbiAgICByZXR1cm4gKGEgPiBiKSA/IDEgOiAtMTtcbiAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHByaW9yaXR5IHF1ZXVlIGlzIGVtcHR5IG9yIG5vdC5cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuaXNFbXB0eSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zaXplKCkgPT09IDA7XG59O1xuXG4vKipcbiAqIFBlZWtzIGF0IHRoZSB0b3AgZWxlbWVudCBvZiB0aGUgcHJpb3JpdHkgcXVldWUuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fVxuICogQHRocm93cyB7RXJyb3J9IHdoZW4gdGhlIHF1ZXVlIGlzIGVtcHR5LlxuICogQGFwaSBwdWJsaWNcbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUucGVlayA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5pc0VtcHR5KCkpIHRocm93IG5ldyBFcnJvcignUHJpb3JpdHlRdWV1ZSBpcyBlbXB0eScpO1xuXG4gIHJldHVybiB0aGlzLl9lbGVtZW50c1swXTtcbn07XG5cbi8qKlxuICogRGVxdWV1ZXMgdGhlIHRvcCBlbGVtZW50IG9mIHRoZSBwcmlvcml0eSBxdWV1ZS5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAdGhyb3dzIHtFcnJvcn0gd2hlbiB0aGUgcXVldWUgaXMgZW1wdHkuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5kZXEgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGZpcnN0ID0gdGhpcy5wZWVrKCk7XG4gIHZhciBsYXN0ID0gdGhpcy5fZWxlbWVudHMucG9wKCk7XG4gIHZhciBzaXplID0gdGhpcy5zaXplKCk7XG5cbiAgaWYgKHNpemUgPT09IDApIHJldHVybiBmaXJzdDtcblxuICB0aGlzLl9lbGVtZW50c1swXSA9IGxhc3Q7XG4gIHZhciBjdXJyZW50ID0gMDtcblxuICB3aGlsZSAoY3VycmVudCA8IHNpemUpIHtcbiAgICB2YXIgbGFyZ2VzdCA9IGN1cnJlbnQ7XG4gICAgdmFyIGxlZnQgPSAoMiAqIGN1cnJlbnQpICsgMTtcbiAgICB2YXIgcmlnaHQgPSAoMiAqIGN1cnJlbnQpICsgMjtcblxuICAgIGlmIChsZWZ0IDwgc2l6ZSAmJiB0aGlzLl9jb21wYXJlKGxlZnQsIGxhcmdlc3QpID4gMCkge1xuICAgICAgbGFyZ2VzdCA9IGxlZnQ7XG4gICAgfVxuXG4gICAgaWYgKHJpZ2h0IDwgc2l6ZSAmJiB0aGlzLl9jb21wYXJlKHJpZ2h0LCBsYXJnZXN0KSA+IDApIHtcbiAgICAgIGxhcmdlc3QgPSByaWdodDtcbiAgICB9XG5cbiAgICBpZiAobGFyZ2VzdCA9PT0gY3VycmVudCkgYnJlYWs7XG5cbiAgICB0aGlzLl9zd2FwKGxhcmdlc3QsIGN1cnJlbnQpO1xuICAgIGN1cnJlbnQgPSBsYXJnZXN0O1xuICB9XG5cbiAgcmV0dXJuIGZpcnN0O1xufTtcblxuLyoqXG4gKiBFbnF1ZXVlcyB0aGUgYGVsZW1lbnRgIGF0IHRoZSBwcmlvcml0eSBxdWV1ZSBhbmQgcmV0dXJucyBpdHMgbmV3IHNpemUuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnRcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLmVucSA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgdmFyIHNpemUgPSB0aGlzLl9lbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuICB2YXIgY3VycmVudCA9IHNpemUgLSAxO1xuXG4gIHdoaWxlIChjdXJyZW50ID4gMCkge1xuICAgIHZhciBwYXJlbnQgPSBNYXRoLmZsb29yKChjdXJyZW50IC0gMSkgLyAyKTtcblxuICAgIGlmICh0aGlzLl9jb21wYXJlKGN1cnJlbnQsIHBhcmVudCkgPCAwKSBicmVhaztcblxuICAgIHRoaXMuX3N3YXAocGFyZW50LCBjdXJyZW50KTtcbiAgICBjdXJyZW50ID0gcGFyZW50O1xuICB9XG5cbiAgcmV0dXJuIHNpemU7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHNpemUgb2YgdGhlIHByaW9yaXR5IHF1ZXVlLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX2VsZW1lbnRzLmxlbmd0aDtcbn07XG5cbi8qKlxuICogIEl0ZXJhdGVzIG92ZXIgcXVldWUgZWxlbWVudHNcbiAqXG4gKiAgQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGZuKSB7XG4gIHJldHVybiB0aGlzLl9lbGVtZW50cy5mb3JFYWNoKGZuKTtcbn07XG5cbi8qKlxuICogQ29tcGFyZXMgdGhlIHZhbHVlcyBhdCBwb3NpdGlvbiBgYWAgYW5kIGBiYCBpbiB0aGUgcHJpb3JpdHkgcXVldWUgdXNpbmcgaXRzXG4gKiBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBhXG4gKiBAcGFyYW0ge051bWJlcn0gYlxuICogQHJldHVybiB7TnVtYmVyfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLl9jb21wYXJlID0gZnVuY3Rpb24oYSwgYikge1xuICByZXR1cm4gdGhpcy5fY29tcGFyYXRvcih0aGlzLl9lbGVtZW50c1thXSwgdGhpcy5fZWxlbWVudHNbYl0pO1xufTtcblxuLyoqXG4gKiBTd2FwcyB0aGUgdmFsdWVzIGF0IHBvc2l0aW9uIGBhYCBhbmQgYGJgIGluIHRoZSBwcmlvcml0eSBxdWV1ZS5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gYVxuICogQHBhcmFtIHtOdW1iZXJ9IGJcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5fc3dhcCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGF1eCA9IHRoaXMuX2VsZW1lbnRzW2FdO1xuICB0aGlzLl9lbGVtZW50c1thXSA9IHRoaXMuX2VsZW1lbnRzW2JdO1xuICB0aGlzLl9lbGVtZW50c1tiXSA9IGF1eDtcbn07XG4iLCJ2YXIgdmFsaWRhdG9ycyA9IFtcbiAgWyAvXihhXFw9Y2FuZGlkYXRlLiopJC8sIHJlcXVpcmUoJ3J0Yy12YWxpZGF0b3IvY2FuZGlkYXRlJykgXVxuXTtcblxudmFyIHJlU2RwTGluZUJyZWFrID0gLyhcXHI/XFxufFxcXFxyXFxcXG4pLztcblxuLyoqXG4gICMgcnRjLXNkcGNsZWFuXG5cbiAgUmVtb3ZlIGludmFsaWQgbGluZXMgZnJvbSB5b3VyIFNEUC5cblxuICAjIyBXaHk/XG5cbiAgVGhpcyBtb2R1bGUgcmVtb3ZlcyB0aGUgb2NjYXNpb25hbCBcImJhZCBlZ2dcIiB0aGF0IHdpbGwgc2xpcCBpbnRvIFNEUCB3aGVuIGl0XG4gIGlzIGdlbmVyYXRlZCBieSB0aGUgYnJvd3Nlci4gIEluIHBhcnRpY3VsYXIgdGhlc2Ugc2l0dWF0aW9ucyBhcmUgY2F0ZXJlZCBmb3I6XG5cbiAgLSBpbnZhbGlkIElDRSBjYW5kaWRhdGVzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCwgb3B0cykge1xuICB2YXIgbGluZUJyZWFrID0gZGV0ZWN0TGluZUJyZWFrKGlucHV0KTtcbiAgdmFyIGxpbmVzID0gaW5wdXQuc3BsaXQobGluZUJyZWFrKTtcbiAgdmFyIGNvbGxlY3RvciA9IChvcHRzIHx8IHt9KS5jb2xsZWN0b3I7XG5cbiAgLy8gZmlsdGVyIG91dCBpbnZhbGlkIGxpbmVzXG4gIGxpbmVzID0gbGluZXMuZmlsdGVyKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHZhbGlkYXRvcnMgYW5kIHVzZSB0aGUgb25lIHRoYXQgbWF0Y2hlc1xuICAgIHZhciB2YWxpZGF0b3IgPSB2YWxpZGF0b3JzLnJlZHVjZShmdW5jdGlvbihtZW1vLCBkYXRhLCBpZHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgbWVtbyAhPSAndW5kZWZpbmVkJyA/IG1lbW8gOiAoZGF0YVswXS5leGVjKGxpbmUpICYmIHtcbiAgICAgICAgbGluZTogbGluZS5yZXBsYWNlKGRhdGFbMF0sICckMScpLFxuICAgICAgICBmbjogZGF0YVsxXVxuICAgICAgfSk7XG4gICAgfSwgdW5kZWZpbmVkKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSB2YWxpZGF0b3IsIGVuc3VyZSB3ZSBoYXZlIG5vIGVycm9yc1xuICAgIHZhciBlcnJvcnMgPSB2YWxpZGF0b3IgPyB2YWxpZGF0b3IuZm4odmFsaWRhdG9yLmxpbmUpIDogW107XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGVycm9ycyBhbmQgYW4gZXJyb3IgY29sbGVjdG9yLCB0aGVuIGFkZCB0byB0aGUgY29sbGVjdG9yXG4gICAgaWYgKGNvbGxlY3Rvcikge1xuICAgICAgZXJyb3JzLmZvckVhY2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIGNvbGxlY3Rvci5wdXNoKGVycik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZXJyb3JzLmxlbmd0aCA9PT0gMDtcbiAgfSk7XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4obGluZUJyZWFrKTtcbn07XG5cbmZ1bmN0aW9uIGRldGVjdExpbmVCcmVhayhpbnB1dCkge1xuICB2YXIgbWF0Y2ggPSByZVNkcExpbmVCcmVhay5leGVjKGlucHV0KTtcblxuICByZXR1cm4gbWF0Y2ggJiYgbWF0Y2hbMF07XG59XG4iLCJ2YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ3J0Yy12YWxpZGF0b3InKTtcbnZhciByZVByZWZpeCA9IC9eKD86YT0pP2NhbmRpZGF0ZTovO1xudmFyIHJlSVAgPSAvXihcXGQrXFwuKXszfVxcZCskLztcblxuLypcblxudmFsaWRhdGlvbiBydWxlcyBhcyBwZXI6XG5odHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9kcmFmdC1pZXRmLW1tdXNpYy1pY2Utc2lwLXNkcC0wMyNzZWN0aW9uLTguMVxuXG4gICBjYW5kaWRhdGUtYXR0cmlidXRlICAgPSBcImNhbmRpZGF0ZVwiIFwiOlwiIGZvdW5kYXRpb24gU1AgY29tcG9uZW50LWlkIFNQXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc3BvcnQgU1BcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHByaW9yaXR5IFNQXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLWFkZHJlc3MgU1AgICAgIDtmcm9tIFJGQyA0NTY2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBwb3J0ICAgICAgICAgO3BvcnQgZnJvbSBSRkMgNDU2NlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgU1AgY2FuZC10eXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBbU1AgcmVsLWFkZHJdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBbU1AgcmVsLXBvcnRdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAqKFNQIGV4dGVuc2lvbi1hdHQtbmFtZSBTUFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24tYXR0LXZhbHVlKVxuXG4gICBmb3VuZGF0aW9uICAgICAgICAgICAgPSAxKjMyaWNlLWNoYXJcbiAgIGNvbXBvbmVudC1pZCAgICAgICAgICA9IDEqNURJR0lUXG4gICB0cmFuc3BvcnQgICAgICAgICAgICAgPSBcIlVEUFwiIC8gdHJhbnNwb3J0LWV4dGVuc2lvblxuICAgdHJhbnNwb3J0LWV4dGVuc2lvbiAgID0gdG9rZW4gICAgICAgICAgICAgIDsgZnJvbSBSRkMgMzI2MVxuICAgcHJpb3JpdHkgICAgICAgICAgICAgID0gMSoxMERJR0lUXG4gICBjYW5kLXR5cGUgICAgICAgICAgICAgPSBcInR5cFwiIFNQIGNhbmRpZGF0ZS10eXBlc1xuICAgY2FuZGlkYXRlLXR5cGVzICAgICAgID0gXCJob3N0XCIgLyBcInNyZmx4XCIgLyBcInByZmx4XCIgLyBcInJlbGF5XCIgLyB0b2tlblxuICAgcmVsLWFkZHIgICAgICAgICAgICAgID0gXCJyYWRkclwiIFNQIGNvbm5lY3Rpb24tYWRkcmVzc1xuICAgcmVsLXBvcnQgICAgICAgICAgICAgID0gXCJycG9ydFwiIFNQIHBvcnRcbiAgIGV4dGVuc2lvbi1hdHQtbmFtZSAgICA9IHRva2VuXG4gICBleHRlbnNpb24tYXR0LXZhbHVlICAgPSAqVkNIQVJcbiAgIGljZS1jaGFyICAgICAgICAgICAgICA9IEFMUEhBIC8gRElHSVQgLyBcIitcIiAvIFwiL1wiXG4qL1xudmFyIHBhcnRWYWxpZGF0aW9uID0gW1xuICBbIC8uKy8sICdpbnZhbGlkIGZvdW5kYXRpb24gY29tcG9uZW50JywgJ2ZvdW5kYXRpb24nIF0sXG4gIFsgL1xcZCsvLCAnaW52YWxpZCBjb21wb25lbnQgaWQnLCAnY29tcG9uZW50LWlkJyBdLFxuICBbIC8oVURQfFRDUCkvaSwgJ3RyYW5zcG9ydCBtdXN0IGJlIFRDUCBvciBVRFAnLCAndHJhbnNwb3J0JyBdLFxuICBbIC9cXGQrLywgJ251bWVyaWMgcHJpb3JpdHkgZXhwZWN0ZWQnLCAncHJpb3JpdHknIF0sXG4gIFsgcmVJUCwgJ2ludmFsaWQgY29ubmVjdGlvbiBhZGRyZXNzJywgJ2Nvbm5lY3Rpb24tYWRkcmVzcycgXSxcbiAgWyAvXFxkKy8sICdpbnZhbGlkIGNvbm5lY3Rpb24gcG9ydCcsICdjb25uZWN0aW9uLXBvcnQnIF0sXG4gIFsgL3R5cC8sICdFeHBlY3RlZCBcInR5cFwiIGlkZW50aWZpZXInLCAndHlwZSBjbGFzc2lmaWVyJyBdLFxuICBbIC8uKy8sICdJbnZhbGlkIGNhbmRpZGF0ZSB0eXBlIHNwZWNpZmllZCcsICdjYW5kaWRhdGUtdHlwZScgXVxuXTtcblxuLyoqXG4gICMjIyBgcnRjLXZhbGlkYXRvci9jYW5kaWRhdGVgXG5cbiAgVmFsaWRhdGUgdGhhdCBhbiBgUlRDSWNlQ2FuZGlkYXRlYCAob3IgcGxhaW4gb2xkIG9iamVjdCB3aXRoIGRhdGEsIHNkcE1pZCxcbiAgZXRjIGF0dHJpYnV0ZXMpIGlzIGEgdmFsaWQgaWNlIGNhbmRpZGF0ZS5cblxuICBTcGVjcyByZXZpZXdlZCBhcyBwYXJ0IG9mIHRoZSB2YWxpZGF0aW9uIGltcGxlbWVudGF0aW9uOlxuXG4gIC0gPGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL2RyYWZ0LWlldGYtbW11c2ljLWljZS1zaXAtc2RwLTAzI3NlY3Rpb24tOC4xPlxuICAtIDxodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM1MjQ1PlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZGF0YSkge1xuICB2YXIgZXJyb3JzID0gW107XG4gIHZhciBjYW5kaWRhdGUgPSBkYXRhICYmIChkYXRhLmNhbmRpZGF0ZSB8fCBkYXRhKTtcbiAgdmFyIHByZWZpeE1hdGNoID0gY2FuZGlkYXRlICYmIHJlUHJlZml4LmV4ZWMoY2FuZGlkYXRlKTtcbiAgdmFyIHBhcnRzID0gcHJlZml4TWF0Y2ggJiYgY2FuZGlkYXRlLnNsaWNlKHByZWZpeE1hdGNoWzBdLmxlbmd0aCkuc3BsaXQoL1xccy8pO1xuXG4gIGlmICghIGNhbmRpZGF0ZSkge1xuICAgIHJldHVybiBbIG5ldyBFcnJvcignZW1wdHkgY2FuZGlkYXRlJykgXTtcbiAgfVxuXG4gIC8vIGNoZWNrIHRoYXQgdGhlIHByZWZpeCBtYXRjaGVzIGV4cGVjdGVkXG4gIGlmICghIHByZWZpeE1hdGNoKSB7XG4gICAgcmV0dXJuIFsgbmV3IEVycm9yKCdjYW5kaWRhdGUgZGlkIG5vdCBtYXRjaCBleHBlY3RlZCBzZHAgbGluZSBmb3JtYXQnKSBdO1xuICB9XG5cbiAgLy8gcGVyZm9ybSB0aGUgcGFydCB2YWxpZGF0aW9uXG4gIGVycm9ycyA9IGVycm9ycy5jb25jYXQocGFydHMubWFwKHZhbGlkYXRlUGFydHMpKS5maWx0ZXIoQm9vbGVhbik7XG5cbiAgcmV0dXJuIGVycm9ycztcbn07XG5cbmZ1bmN0aW9uIHZhbGlkYXRlUGFydHMocGFydCwgaWR4KSB7XG4gIHZhciB2YWxpZGF0b3IgPSBwYXJ0VmFsaWRhdGlvbltpZHhdO1xuXG4gIGlmICh2YWxpZGF0b3IgJiYgKCEgdmFsaWRhdG9yWzBdLnRlc3QocGFydCkpKSB7XG4gICAgZGVidWcodmFsaWRhdG9yWzJdICsgJyBwYXJ0IGZhaWxlZCB2YWxpZGF0aW9uOiAnICsgcGFydCk7XG4gICAgcmV0dXJuIG5ldyBFcnJvcih2YWxpZGF0b3JbMV0pO1xuICB9XG59XG4iLCIvKipcbiAgIyMgemlwXG5cbiAgemlwIG9uZSBhcnJheSB3aXRoIG90aGVyIGFycmF5c1xuXG4gIDw8PCBleGFtcGxlcy96aXAuanNcblxuICAjIyMgemlwIHRvZG9cblxuICAtIHRlc3RzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHRhcmdldHMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KSB7XG4gICAgcmV0dXJuIFtpdGVtXS5jb25jYXQodGFyZ2V0cy5tYXAoZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXR1cm4gdmFsW2luZGV4XTtcbiAgICB9KSk7XG4gIH07XG59OyIsIi8qKlxuICAjIyBjaGFpblxuXG4gIENyZWF0ZSBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBjcmVhdGUgdGhlIGNvbWJpbmVkIHJlc3VsdCBvZiBjYWxsaW5nIGFsbFxuICB0aGUgcHJvdmlkZWQgZnVuY3Rpb25zIGluIHRoZSBwcm92aWRlZCBvcmRlci5cblxuICA8PDwgZXhhbXBsZXMvY2hhaW4uanNcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZucykge1xuICBmbnMgPSBbXS5jb25jYXQoZm5zIHx8IFtdKS5jb25jYXQoW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcblxuICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZm5zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBmbikge1xuICAgICAgdmFyIHJlc3VsdCA9IGZuKG1lbW8pO1xuXG4gICAgICByZXR1cm4gcmVzdWx0ICE9PSB1bmRlZmluZWQgPyByZXN1bHQgOiBtZW1vO1xuICAgIH0sIHZhbHVlIHx8IDApO1xuICB9XG59O1xuIl19
