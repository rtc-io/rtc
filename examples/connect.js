var rtc = require('..');

var session = rtc({
  signaller: 'http://rtc.io/switchboard/',
  room: 'test-room',

  // specify any plugins we wish to use (iOS, temasys, etc)
  plugins: [
  ],

  // specify what we want to capture locally
  capture: { video: true, audio: true }
});

// add a div (class="rtc-media rtc-localvideo") to the DOM
document.body.appendChild(session.localVideo);

// add a div (class="rtc-media rtc-remotevideo") to the DOM
document.body.appendChild(session.remoteVideo);
