# rtc

This is a package that will provide you a "one-stop shop" for building
WebRTC applications.  It aggregates together a variety of packages (primarily
from the [rtc.io](https://github.com/rtc-io) suite) to deliver a single
package for building a WebRTC application.


[![NPM](https://nodei.co/npm/rtc.png)](https://nodei.co/npm/rtc/)

[![experimental](https://img.shields.io/badge/stability-experimental-red.svg)](https://github.com/dominictarr/stability#experimental)

## Getting Started

Grab the latest distribution build of rtc at:

https://cdn.rawgit.com/rtc-io/rtc/5559c185db3793fbc6209a59c12cfec49c9e83b2/dist/rtc.min.js

Also available via bower:

  ```
  bower install rtc
  ```

Or if you prefer to work directly with the CommonJS module you can install it via npm:

  ```
  npm install rtc --save
  ```

We use [browserify](https://browserify.org) to bundle our CommonJS modules for use in the browser.


## Basic Usage

Establish a connection and render local and remote video feeds.

```html

<div id="r-video"></div>
<div id="l-video"></div>

<script src="/path/to/rtc.js"></script>

```

```js
// rtc needs a named room and a signalling server location to create a session.
// switchboard.rtc.io may be used for testing, or you can host your own signaller
// with rtc-switchboard module.
var rtcOpts = {
      room: 'test-room',
      signaller: '//switchboard.rtc.io'
    };
// call RTC module
var rtc = RTC(rtcOpts);
// A div element to show our local video stream
var localVideo = document.getElementById('l-video');
// A div element to show our remote video streams
var remoteVideo = document.getElementById('r-video');

// Display local and remote video streams
localVideo.appendChild(rtc.local);
remoteVideo.appendChild(rtc.remote);
```
## Sharing Video, Audio and Data Streams

Add a data channel to share text messages

```html
<div id="messages" contenteditable></div>
<div id="r-video"></div>
<div id="l-video"></div>

<script src="/path/to/rtc.js"></script>

```

```js
// Set RTC options.
var rtcOpts = {
    room: 'test-room-2',
    signaller: '//switchboard.rtc.io'
  };
// call RTC module
var rtc = RTC(rtcOpts);
// A contenteditable element to show our messages
var messageWindow = document.getElementById('messages');
// A div element to show our local video stream
var localVideo = document.getElementById('l-video');
// A div element to show our remote video streams
var remoteVideo = document.getElementById('r-video');

// Bind to events happening on the data channel
function bindDataChannelEvents(id, channel, attributes, connection) {

  // Receive message
  channel.onmessage = function (evt) {
    messageWindow.innerHTML = evt.data;
  };

  // Send message
  messageWindow.onkeyup = function () {
    channel.send(this.innerHTML);
  };
}

// Start working with the established session
function init(session) {
  session.createDataChannel('chat');
  session.on('channel:opened:chat', bindDataChannelEvents);
}

// Display local and remote video streams
localVideo.appendChild(rtc.local);
remoteVideo.appendChild(rtc.remote);

// Detect when RTC has established a session
rtc.on('ready', init);
```

## License(s)

### Apache 2.0

Copyright 2014 National ICT Australia Limited (NICTA)

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
