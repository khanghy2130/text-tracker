const express = require('express')
const path = require('path')
const fs = require('fs')
const p5 = require('node-p5')
const mjpeg = require('mp4-mjpeg')
const ffmpegCommand = require('fluent-ffmpeg')


const app = express()
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/home.html'));
});

app.get('/download/:id', function (req, res) {
    const fileName = `${__dirname}/result/final_${req.params.id}.mp4`;
    if (fs.existsSync(fileName)){
        res.download(fileName, () => {
            // remove file
            try {
                fs.unlinkSync(fileName)
            } catch(err) {
                console.error(err)
            }
        });
    } else {
        res.send(`Error: requested video (${req.params.id}) doesn't exist.`);
    }
});


let isGenerating = false; // generate one video at once

app.listen(PORT, () => {
    console.log(`App is listening at port ${PORT}`)
})



function sketch(p) {
    let canvas;

    p.setup = () => {
        canvas = p.createCanvas(640, 640);
        p.background(50);
        p.textSize(50);
        p.text('hello world!', 50, 100);
        //console.log(canvas.canvas.toDataURL("image/jpeg"));
    }
    p.draw = () => {
        
    }
}
 
let p5Instance = p5.createSketch(sketch);

/*
generateVideo(
    [
    ], 
    12345, 
    null
)
*/

// takes array of dataURLs. creates video with ID. responds with download path
function generateVideo(framesData, id, res){
    const fileName = `./result/id_${id}.mp4`;
    const finalFileName = `./result/final_${id}.mp4`;

    mjpeg({ fileName: fileName, ignoreIdenticalFrames: 0 })
    .then( (recorder) => {
        
        framesData.forEach(dataURL => {
            // append a JPEG image as a data URL to the video
            recorder.appendImageDataUrl( dataURL )
                .then( () => {
                    // image added
                    console.log("images added");
                })
                .catch(handleError)
        });

        recorder.finalize()
            .then( () => {
                // video successfully created
                console.log("video finalized");

                let command = new ffmpegCommand();
                command.input(fileName);
                command.videoCodec("libx264");
                command.videoBitrate("1000k", true);
                command.on("end", function() {
                    // remove file input video file
                    try {
                        fs.unlinkSync(fileName)
                    } catch(err) {
                        console.error(err)
                    }

                    console.log("mp4 ready");
                    isGenerating = false;
                    //res.json( {path: `/download/${id}`} );
                });
                command.on("error", handleError);
                command.output(finalFileName);
                command.run();
            })
            .catch(handleError)
    })
    .catch(handleError)

    function handleError(err){
        console.log(err);
        isGenerating = false;
        //res.json( {path: null} );
    }
}
