/**
 * Server entry point for the Last.fm GitHub README widget
 */
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Homepage: ${process.env.homepage_url || 'http://localhost:' + PORT}`);
});