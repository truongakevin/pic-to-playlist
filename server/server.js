require('dotenv').config();

const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { analyzeImage, generatePlaylist } = require('./helpers');

const app = express();

// use statements
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));
app.use(cors());

// multer configs
const storage_mem = multer.memoryStorage();
const storage_hd = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads");
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
})
const upload = multer({ storage: storage_mem });

// test route
app.get('/hello', (req, res) => {
    res.send('Hello World!');
});

app.post('/analyze-photo', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log('File uploaded');
        // console.log('File uploaded:', req.file);
        // console.log('Buffer uploaded:', req.file.buffer);

        const features = await analyzeImage(req.file.buffer);
        console.log('Image analysis features:', features);

        // Generate playlist for the combined features string
        const combinedSearchString = features.map(feature => feature.feature).join(' ');
        const combinedPlaylist = await generatePlaylist(combinedSearchString);
        // Generate playlists for each individual feature
        let individualPlaylists = [];
        for (const feature of features) {
            const individualPlaylist = await generatePlaylist(feature.feature);
            individualPlaylists = [...individualPlaylists, ...individualPlaylist];
        }
        // Combine the results and remove duplicates
        const allTracks = [...combinedPlaylist, ...individualPlaylists];
        const uniqueTracks = [...new Map(allTracks.map(track => [track.link, track])).values()];

        console.log('Generated playlist:', uniqueTracks);

        // // save file name base on features
        // const featureBasedName = `${features.dominantColor}_${features.brightness}_${Date.now()}.jpg`;
        // const filePath = `uploads/${featureBasedName}`;
        // const filePath = `uploads/${Date.now()}_${req.file.originalname}`;
        // fs.writeFileSync(filePath, req.file.buffer);
        // console.log('File saved to disk at:', filePath);
        
        res.json({ 'features': features, 'playlist': uniqueTracks });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Failed to generate playlist' });
    }
});

// start server
app.listen(process.env.NODE_PORT, () => {
    console.log(`Server listening at ${process.env.NODE_ADDRESS || 'http://localhost:3000'}`);
});