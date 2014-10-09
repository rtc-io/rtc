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
