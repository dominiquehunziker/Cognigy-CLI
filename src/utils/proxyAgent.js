'use strict';

import { request } from 'http';
import { Agent } from 'https';

class ProxyAgent extends Agent {
    constructor(options) {
        const { proxy, ...opts } = options;
        super(opts);

        this.proxy = new URL(proxy);
    }

    createConnection(options, callback) {
        const req = request({
            host: this.proxy.hostname,
            port: this.proxy.port,
            method: 'CONNECT',
            path: `${options.host}:${options.port}`,
            headers: {
                Connection: this.keepAlive ? 'keep-alive' : 'close',
                Host: `${options.host}:${options.port}`
            },
            setHost: false,
            agent: false,
            timeout: options.timeout || 0
        }).on('connect', (res, socket) => {
            req.removeAllListeners()
            socket.removeAllListeners()

            if (res.statusCode === 200) {
                const secureSocket = super.createConnection({ ...options, socket });
                callback(null, secureSocket)
            } else {
                callback(new Error(`Proxy - Bad response: ${res.statusCode}`), null)
            }
        });

        req.once('timeout', () => {
            req.destroy(new Error('Proxy - Timeout'));
        });

        req.once('error', err => {
            req.removeAllListeners();
            callback(err, null);
        });

        req.end();
    }
}

export function getAgent() {
    const rawProxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;

    if (!rawProxyUrl) {
        return false;
    }

    return new ProxyAgent({ proxy: rawProxyUrl });
}