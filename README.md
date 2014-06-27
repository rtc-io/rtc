# rtc

This is a package that will provide you a "one-stop shop" for building
WebRTC applications.  It aggregates together a variety of packages (primarily
from the [rtc.io](https://github.com/rtc-io) suite) to deliver a single
package for building a WebRTC application.

[![experimental](https://img.shields.io/badge/stability-experimental-red.svg)](https://github.com/dominictarr/stability#experimental) 

## Getting Started

To get started with `rtc.js` the first thing you should do is get a copy of the library.  This can be done in any of the following ways:

- By installing it from npm:

  ```
  npm install rtc --save
  ```

- By installing it with bower:

  ```
  bower install rtc
  ```

__NOTE:__ I would strongly recommend using NPM for your managing your application dependencies.


## Example Usage

```js
var rtc = require('rtc');

// prime a session
var session = rtc({ room: 'test-room' });

// add a div (class="rtc-media rtc-localvideo") to the DOM
document.body.appendChild(session.local);

// add a div (class="rtc-media rtc-remotevideo") to the DOM
document.body.appendChild(session.remote);

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
