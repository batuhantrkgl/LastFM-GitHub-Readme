const { extractColors } = require('./src/svg');
async function run() {
    const url = 'https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png'; // Typical lastfm image
    console.log("Colors:", await extractColors(url, 'dark'));
}
run().catch(console.error);
