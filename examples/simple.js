var rtc = require('..');

// prime a session
var session = rtc({ room: 'test-room' });

// add a div (class="rtc-media rtc-localvideo") to the DOM
document.body.appendChild(session.local);

// add a div (class="rtc-media rtc-remotevideo") to the DOM
document.body.appendChild(session.remote);
