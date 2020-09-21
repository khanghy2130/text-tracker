const express = require('express')
const path = require('path')
const fs = require('fs')
const p5 = require('node-p5')
const mjpeg = require('mp4-mjpeg')
const ffmpegCommand = require('fluent-ffmpeg')



const app = express()
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));
app.use(express.json());

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/home.html'));
});

app.get('/download/:id', function (req, res) {
    const fileName = `${__dirname}/result/final_${req.params.id}.mp4`;
    if (fs.existsSync(fileName)){
        res.download(fileName, () => {
            // remove downloaded file from server
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

// responds with { success: boolean, errorMessage?: string }
app.post('/generate', function (req, res) {
    // already generating? respond as fail
    if (isGenerating) {
        res.json( {
            success: false,
            errorMessage: "Server is busy, please try again later."
        } );
        return;
    }

    console.log("Start generating video...");
    p5Program.configs = req.body;
    p5Program.start();

    res.json( {success: true} );
});

// responds with { videoIsReady: boolean, errorMessage?: string }
app.get('/status/:id', function(req, res){
    // if still generating then not ready
    if (isGenerating) {
        res.json( {videoIsReady: false} );
        return;
    }

    const fileName = `${__dirname}/result/final_${req.params.id}.mp4`;
    if (fs.existsSync(fileName)){
        res.json( {videoIsReady: true} );
    }
    // video does not exist
    else {
        res.json( {
            videoIsReady: false,
            errorMessage: "Can't find the generated video with the given ID."
        } );
    }
});

app.listen(PORT, () => {
    console.log(`App is listening at port ${PORT}`)
})

// load fonts
const loadedFonts = [
    p5.loadFont({ path: './fonts/Merriweather.ttf', family: 'Merriweather' }),
    p5.loadFont({ path: './fonts/Poppins.ttf', family: 'Poppins' }),
    p5.loadFont({ path: './fonts/PlayfairDisplay.ttf', family: 'Playfair Display' })
];

// const
const _WIDTH = 576; // for generation
const LEFT_PADDING = 2; // for main text
const LIMIT_WIDTH = 80; // percent of width before scrolling right
const BLINK_DURATION = 30; // smaller is faster
const _PADDING_ = 1.5; // for name text

const CAMERA_X_SPEED_ACC = 0.04;
const CAMERA_X_SPEED_LIMIT = 0.6;
// durations below: bigger => slower
const END_LINE_WAIT = 15; // wait duration when a line is done
const LETTER_DURATION_FACTOR = 1.0;
const NEXT_LINE_DURATION = 10; // duration of animation moving to next line

let isGenerating = false; // generate one video at once
let p5Program = {}; // contains configs, res, and start()

function sketch(p) {
    let canvas;
    let framesData = [];

    let i = 0; ///////

    p5Program.start = function(){
        isGenerating = true;
        framesData = [];
        i = 0; // important

        // setup configs
        p.createCanvas(_WIDTH, _WIDTH * p5Program.configs.canvasHeightFactor); 

        p.loop();
    }

    function stopAndPassFrames(){
        p.noLoop();

        generateVideo(
            framesData,
            p5Program.configs.id
        )
    }

    p.setup = () => {
        canvas = p.createCanvas(480, 480);
        p.frameRate(999);
        p.noStroke();
        p.imageMode(p.CENTER);
        p.noLoop();
    }
    p.draw = () => {
        if (!p5Program.configs) {
            p.noLoop();
            return;
        }

        if (i < 100){
            i++;
            const r = p.min(p.width, p.height) * 0.2;
            const t = p.frameCount * 0.07;
            p.fill(250);
            p.circle(
                p.width/2 + p.cos(t) * r,
                p.height/2 + p.sin(t) * r,
                r * 0.3
            );
            p.background(0, 0, 0, 15);

            framesData.push(canvas.canvas.toDataURL("image/jpeg"));
        } else stopAndPassFrames();
    }
}

// load fonts
let p5Instance = p5.createSketch(sketch);


// takes array of dataURLs. creates video with ID. responds with download path
function generateVideo(framesArray, id){
    const rawVideoFile = `./result/raw_${id}.mp4`;

    let audioFile;
    if (p5Program.configs.hasAudio){
        const audioBuffer = Buffer.from(p5Program.configs.audioBlob64.split("data:audio/mp3;base64,").pop(), "base64");
        fs.writeFileSync(`./audio/audio_${id}.mp3`, audioBuffer, {encoding: "base64"});

        audioFile = `./audio/audio_${id}.mp3`;
    }

    const finalVideoFile = `./result/final_${id}.mp4`;

    mjpeg({ fileName: rawVideoFile, ignoreIdenticalFrames: 0 })
    .then( (recorder) => {
        
        console.log("Adding all frames...");
        // adding all frames
        (function addNextFrame(framesList){
            if (framesList.length === 0) finalize();
            else {
                recorder.appendImageDataUrl( framesList.shift() )
                    .then( () => {
                        addNextFrame(framesList);
                    })
                    .catch(handleError)
            }
        })(framesArray)

        function finalize(){
            recorder.finalize()
                .then( () => {
                    // video successfully created
                    console.log("video finalized...");
    
                    let command = new ffmpegCommand();
                    command.input(rawVideoFile);
                    if (audioFile) command.input(audioFile);

                    command.videoCodec("libx264");
                    command.videoBitrate("1000k", true);
                    command.on("end", function() {
                        isGenerating = false;
                        console.log("mp4 ready!");
                        // remove file input video file
                        try {
                            fs.unlinkSync(rawVideoFile)
                        } catch(err) {
                            console.error(err)
                        }
                    });
                    command.on("error", handleError);
                    command.output(finalVideoFile);
                    command.run();
                })
                .catch(handleError)
        }
    })
    .catch(handleError)

    function handleError(err){
        console.log(err);
        isGenerating = false;
    }
}