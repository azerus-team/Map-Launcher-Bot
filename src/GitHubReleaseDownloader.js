const https = require("https");
const fs = require("fs");



function getReleases(owner, repo) {
    return new Promise((resolve, reject) => {
        //const url = new URL(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
        const options = {
            hostname: 'api.github.com',
            port: 443,
            path: `/repos/${owner}/${repo}/releases/latest`,
            headers: {
                "User-Agent": "NodeJS"
            }
        };
        let clientRequest = https.get(options, (res) => {
            let data = "";
            res.on("data", chunk => {
                let s = chunk.toString();
                data += s;
            });
            res.on("end", () => {
                try {
                    let parse = JSON.parse(data);
                    resolve(parse);
                } catch (e) {
                    reject(e);
                }
            });

            res.on("error", (error) => {
                console.error(error);
                reject(error);
            })
        }).on("error", (err) => {
            console.error(err);
        });
    })
};

/**
 *
 * @param owner
 * @param repo
 * @returns {Promise<String>}
 */
exports.getDownloadLink = function getDownloadLink(owner, repo) {
    return new Promise(async (resolve, reject) => {
        let releases = getReleases(owner, repo);
        releases.then(json => {
            let link = json["assets"][0]["browser_download_url"];
            try {
                fs.rmdirSync("./world.zip")
            } catch (e) {
            }
            let worldFile = fs.createWriteStream("./world.zip");
            https.get(link, (res) => {
                //res.pipe(worldFile);
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk.toString();
                });
                res.on("end", () => {
                    data = data.replace("&amp;", "&");
                    let matcher = data.match(/<html><body>You are being <a href="(.*)">redirected<\/a>\.<\/body><\/html>/);
                    console.log(matcher);

                    let url = matcher[1];
                    url = url.replace(/&amp;/gm, "&");
                    resolve(url);
                });
                res.on("error", (error) => {
                    console.log(error);
                    reject(error);
                });
            });
        }).catch(err => {
            reject(err);
        });
    });
}

exports.downloadRelease = function (owner, repo, filepath) {
    return new Promise(async (resolve, reject) => {
        try {
            fs.rmdirSync(filepath)
        } catch (e) {
        }
        let url = await getDownloadLink(owner, repo);
        console.log(url);
        let worldFile = fs.createWriteStream(filepath);
        https.get(url, (res) => {
            res.pipe(worldFile);
            res.on("end", () => {
                resolve();
            });
            res.on("error", (error) => {
                console.log(error);
                reject(error);
            });
        });

    });
}