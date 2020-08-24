const express = require('express')
const path = require('path')
const base64Img = require('base64-img')
const videoshow = require('videoshow')
const fsExtra = require('fs-extra')

const app = express()
const PORT = 3000

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/home.html'));
});

// program
let isGenerating = false; // generate 1 video at a time




// test
const imageData = "data:image/png;base64,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"

base64Img.img(imageData, __dirname + '/images', 'test', function(err, filepath) {
    if (err) console.log(err);
});


app.listen(PORT, () => {
    console.log(`App is listening at http://localhost:${PORT}`)
})


function generateVideo() {
    let secondsToShowEachImage = 0.1
    let finalVideoPath = './result/video.mp4'

    // setup videoshow options
    let videoOptions = {
        loop: secondsToShowEachImage,
        fps: 24,
        transition: false,
        videoBitrate: 1024,
        videoCodec: 'libx264',
        size: '640x?',
        outputOptions: ['-pix_fmt yuv420p'],
        format: 'mp4'
    }

    // array of images to make the 'videoshow' from
    let images = [
        { path: "./dummy-images/b0.jpg" },
        { path: "./dummy-images/b1.jpg" },
        { path: "./dummy-images/b2.jpg" },
        { path: "./dummy-images/b3.jpg" }
    ]

    videoshow(images, videoOptions)
        .save(finalVideoPath)
        .on('start', function (command) {
            console.log('encoding ' + finalVideoPath + ' with command ' + command)
        })
        .on('error', function (err, stdout, stderr) {
            return Promise.reject(new Error(err))
        })
        .on('end', function (output) {
            // do stuff here when done
            console.log("DONE!!!");
            //////fsExtra.emptyDirSync("./dummy-images")
        })
}