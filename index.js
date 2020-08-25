const express = require('express')
const path = require('path')
const base64Img = require('base64-img')
const videoshow = require('videoshow')
const fsExtra = require('fs-extra')

const app = express()
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));
app.use(express.json({limit: '15mb'}));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/home.html'));
});

app.get('/download/:id', function (req, res) {
    const file = `${__dirname}/result/v_${req.params.id}.mp4`;
    res.download(file);
});


let isGenerating = false; // generate one video at once

app.post('/upload', function (req, res) {
    if (isGenerating) {
        res.json( {path: null} );
        return;
    }

    console.log("generation process started");
    generateVideo(req.body, res);
});






app.listen(PORT, () => {
    console.log(`App is listening at port ${PORT}`)
})


function generateVideo(body, res) {
    isGenerating = true;
    
    // clear images directory then make new frames
    fsExtra.emptyDirSync("./images");
    body.frames.forEach((frameData, index) => {
        base64Img.imgSync(frameData, __dirname + '/images', 'frame' + index);
    });

    let finalVideoPath = `./result/v_${body.id}.mp4`

    // setup videoshow options
    let videoOptions = {
        fps: 30,
        transition: false,
        videoBitrate: 2048,
        videoCodec: 'libx264',
        size: '640x?',
        outputOptions: ['-pix_fmt yuv420p'],
        format: 'mp4'
    }

    function getTimeImage(index){
        if (index === 0 || index === body.frames.length - 1) return 1.7; // wait time
        else return 1/15; // frame time
    }
    // array of images
    let images = body.frames.map(
        (frameData, index) => ({path: `./images/frame${index}.png`, loop: getTimeImage(index)})
    );

    videoshow(images, videoOptions)
        .save(finalVideoPath)
        .on('start', function (command) {
            //console.log('encoding ' + finalVideoPath + ' with command ' + command)
        })
        .on('error', function (err, stdout, stderr) {
            console.log(err);
            isGenerating = false;
            res.json( {path: null} );
            return Promise.reject(new Error(err))
        })
        .on('end', function (output) {
            // success
            console.log("video generated");
            isGenerating = false;
            res.json( {path: `/download/${body.id}`} );
        })
}