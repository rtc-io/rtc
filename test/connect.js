var assert = require('assert');
var uuid = require('uuid');
var RTC = require('../');
var connections = [];
var roomId = uuid.v4();

suite('connectivity');

test('create connection:0', function() {
  var conn = RTC({ room: roomId, constraints: null });

  assert(conn);
  assert(conn.id);
  connections.push(conn);
});

test('create connection:1', function() {
  var conn = RTC({ room: roomId, constraints: null });

  assert(conn);
  assert(conn.id);
  connections.push(conn);
});

test('receive call:started events for both connections', function(done) {
  var expected = 2;

  function checkExpected() {
    expected--;
    if (expected <= 0) {
      done();
    }
  }

  this.timeout(10e3);

  connections[0].once('call:started', function(id) {
    assert.equal(id, connections[1].id);
    checkExpected();
  });

  connections[1].once('call:started', function(id) {
    assert.equal(id, connections[0].id);
    checkExpected();
  });
});

test('close connections', function() {
  connections.splice(0).forEach(function(conn) {
    conn.close();
  });
});
