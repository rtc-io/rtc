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

  <<< examples/connect.js

**/

module.exports = function(opts) {
  var rtc = new EventEmitter();
  var constraints = [].concat((opts || {}).capture || [ DEFAULT_CONSTRAINTS ]);
  var plugins = (opts || {}).plugins || [];
  var localStreams = [];

  // capture media
  var captureTargets = constraints.map(parseConstraints).map(function(constraints) {
    return media({ constraints: constraints, plugins: plugins });
  });

  function gotLocalStream(stream) {
    localStreams.push(stream);
    if (localStreams.length >= captureTargets.length) {
      console.log('got enough stuff to connect');
    }

    media({ stream: stream, plugins: plugins, muted: true }).render(rtc.localVideo);
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
  rtc.localVideo = crel('div')

  // create the remote container
  rtc.remoteVideo = crel('div');


  return rtc;
}
