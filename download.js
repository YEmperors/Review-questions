const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error('Status: ' + res.statusCode));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', err => reject(err));
  });
}

const url = "https://mirror.ghproxy.com/https://github.com/neutralinojs/neutralinojs/releases/download/v5.3.0/neutralinojs-v5.3.0.zip";
console.log("Downloading from proxy...");
download(url, 'neutralinojs.zip').then(() => {
  console.log("Downloaded neutralinojs.zip");
}).catch(err => {
  console.error("Failed:", err.message);
});
