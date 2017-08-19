const http = require('http');
const createRPC = require('multiplex-rpc');
const wsock = require('websocket-stream');
const eos = require('end-of-stream');
const { decode } = require('./snapshot');

const methods = ['step', 'next', 'previous'];

class Client {
  constructor (ws, rpc, plex) {
    this.plex = plex;
    this.ws = ws;
    this.rpc = rpc;
  }

  close () {
    this.ws.end();
  }

  step () {
    const { plex } = this;
    return new Promise((resolve, reject) => {
      plex.step((er, res) => {
        if (er) {
          return reject(er);
        }
        if (typeof res === 'object' && res !== null && res.type === 'Buffer' && Array.isArray(res.data)) {
          return resolve(decode(new Buffer(res.data)));
        }
        return resolve();
      })
    })
  }
}

module.exports = (server) => {
  let whref = server;
  if (whref instanceof http.Server) {
    whref = 'ws://localhost:' + whref.address().port;
  }

  const ws = wsock(whref);
  const rpc = createRPC();
  const plex = rpc.wrap(methods);

  ws.pipe(rpc).pipe(ws);

  eos(ws, er => {
    if (er) {
      console.error(er);
    }
    console.log('ended')
    rpc.destroy();
  })

  return new Client(ws, rpc, plex);
}