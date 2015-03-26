# rtc

This is a package that will provide you a "one-stop shop" for building WebRTC applications.  It aggregates together a variety of packages (primarily from the [rtc.io](https://github.com/rtc-io) suite) to deliver a single package for building a WebRTC application.

[![NPM](https://nodei.co/npm/rtc.png)](https://nodei.co/npm/rtc/)

[![Build Status](https://img.shields.io/travis/rtc-io/rtc.svg?branch=master)](https://travis-ci.org/rtc-io/rtc)
[![unstable](https://img.shields.io/badge/stability-unstable-yellowgreen.svg)](https://github.com/dominictarr/stability#unstable)
[![bitHound Score](https://www.bithound.io/github/rtc-io/rtc/badges/score.svg)](https://www.bithound.io/github/rtc-io/rtc)
[![Gitter chat](https://badges.gitter.im/rtc-io/discuss.png)](https://gitter.im/rtc-io/discuss)

## Getting Started

Probably the easiest way to get started with `RTC` is to take it for a testdrive using [jsbin](http://jsbin.com/dahuka/edit?html,css,js,output). This demo uses the minified JS file (and associated sourcemaps for debugging) from:

`//cdn.jsdelivr.net/rtc/latest/rtc.min.js`

If you wish to use a specific version, then you can replace `latest` with the version number (from `3.0.1` onwards):

`//cdn.jsdelivr.net/rtc/3.2.3/rtc.min.js`

### Package Managers FTW!

I'd recommend using a package manager if you aren't already and here are the relevant instructions for installing `RTC` from a number of popular options:

- __npm__: `npm install rtc --save`
- __bower__: `bower install rtc-io/rtc`

## Basic Usage

Establish a connection and render local and remote video feeds.

```html
<html>
<head>
<title>rtc.io simple conferencing</title>
<link rel="stylesheet" href="http://yui.yahooapis.com/pure/0.5.0/pure-min.css">
<link rel="stylesheet" href="layout.css">
</head>
<body onload="RTC()" class="pure-g">
    <div class="pure-u-1-5">
        <div id="l-video"></div>
    </div>
    <div class="pure-u-4-5" id="r-video"></div>
<script src="https://cdn.jsdelivr.net/rtc/latest/rtc.min.js"></script>
</body>
</html>
```

In this example, the [default configuration options](defaultconfig.js) are used for configuration, which are displayed below for informational purposes:

```js
// a default configuration that is used by the rtc package
module.exports = {
  // simple constraints for defaults
  constraints: {
    video: true,
    audio: true
  },

  // use the public switchboard for signalling
  signaller: 'https://switchboard.rtc.io',

  // no room is defined by default
  // rtc-quickconnect will autogenerate using a location.hash
  room: undefined,

  // specify ice servers or a generator function to create ice servers
  ice: [],

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

  // should we atempt to load any plugins?
  plugins: [],

  // common options overrides that are used across rtc.io packages
  options: {}
};
```

## Diving Deeper

If there is a specific application that you are looking to build with [rtc.io](http://rtc.io/) feel free to [open an issue](https://github.com/rtc-io/rtc/issues/new) and outline a few of your requirements (video, audio, data, etc) and we can give you some advice.  In most cases, the following is a good rule of thumb for working our where you should jump in with rtc.io packages.

- Video and/or audio is crucial to my application and I haven't done a lot of work with [browserify](http://browserify.org)

  _Use the `rtc` distribution files from the CDN, and build your app_

- I feel comfortable using browserify, and find it a great way of building apps.

  _Configure your application using npm, and start by including the rtc package (`npm install --save rtc`).  If you need more flexibility than what is offered through this package, take something like [`rtc-quickconnect`](https://github.com/rtc-io/rtc-quickconnect) for a spin._

- I am building something that isn't really media related, and just want to play with data channels.

  _You are going to want to use [`rtc-quickconnect`](https://github.com/rtc-io/rtc-quickconnect) and we'd strongly recommend getting comfortable with browserify if you aren't already as it's going to make your life a lot easier._


## Other Simple Demos / Tutorials

- [Data Channels Only Demo](http://jsbin.com/rimexe/edit?html,js,output) - if you really don't want to go down the [`rtc-quickconnect`](https://github.com/rtc-io/rtc-quickconnect) and browserify road.


## License(s)

### Apache 2.0

Copyright 2014-2015 National ICT Australia Limited (NICTA)

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
