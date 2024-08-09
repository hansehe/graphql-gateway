const http = require('http');
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy');

const hostname = '127.0.0.1';
const port = 1337;
const proxyPort = 8181;

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
    if (req.url.startsWith('/graphql')) {
        // Forward requests starting with /proxy to the target server
        proxy.web(req, res, { target: `http://127.0.0.1:${proxyPort}` });
    } else {
        // Serve the HTML file
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');
                res.end('Internal Server Error');
            } else {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html');
                res.end(data);
            }
        });
    }
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
    console.log(`Proxying requests at http://${hostname}:${port}/proxy to http://127.0.0.1:${proxyPort}/`);
});