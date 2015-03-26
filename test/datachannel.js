var assert = require('assert');
var uuid = require('uuid');
var RTC = require('../');
var connections = [];
var roomId = uuid.v4();
var dcs = [];

suite('datachannels connectivity');

test('create connection:0', function() {
  var conn = RTC({ room: roomId, constraints: null });

  // create the datachannel
  conn.createDataChannel('test');

  assert(conn);
  assert(conn.id);
  connections.push(conn);
});

test('create connection:1', function() {
  var conn = RTC({ room: roomId, constraints: null });

  // create the datachannel
  conn.createDataChannel('test');

  assert(conn);
  assert(conn.id);
  connections.push(conn);
});

test('receive channel:opened:test events for both connections', function(done) {
  var expected = 2;

  function checkExpected() {
    expected--;
    if (expected <= 0) {
      done();
    }
  }

  this.timeout(10e3);

  connections[0].once('channel:opened:test', function(id, dc) {
    assert.equal(id, connections[1].id);
    dcs[0] = dc;

    checkExpected();
  });

  connections[1].once('channel:opened:test', function(id, dc) {
    assert.equal(id, connections[0].id);
    dcs[1] = dc;

    checkExpected();
  });
});

test('close connections', function() {
  connections.splice(0).forEach(function(conn) {
    conn.close();
  });
});
