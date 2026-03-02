const { getNowPlaying } = require("./src/lastfm");
const { extractColors } = require("./src/svg");
require("dotenv").config();

async function test() {
  try {
    const username = "batuhantrkgl";
    const data = await getNowPlaying(username);
    if (data && data.track) {
      console.log("Track:", data.track.name);
      console.log("Image URL:", data.track.image);
      const colors = await extractColors(data.track.image, "dark");
      console.log("Extracted Dark Colors:", colors);
    } else {
      console.log("No track data found.");
    }
  } catch (e) {
    console.error(e);
  }
}
test();
