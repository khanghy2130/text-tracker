const express = require('express')
const path = require('path')
const fs = require('fs')

const p5 = require('node-p5')

const mjpeg = require('mp4-mjpeg')
const ffmpegCommand = require('fluent-ffmpeg')



const app = express()
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));
app.use(express.json({limit: '10mb'}));

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
const END_LINE_WAIT = 12; // wait duration when a line is done
const LETTER_DURATION_FACTOR = 1.3;
const NEXT_LINE_DURATION = 15; // duration of animation moving to next line

let isGenerating = false; // generate one video at once
let p5Program = {}; // contains configs, res, and start()

function sketch(p) {
    let canvas;
    let program = {};
    let framesData;

    p5Program.start = function(){
        isGenerating = true;
        framesData = [];

            program.wordsListsArray = p5Program.configs.wordsListsArray;
            program.lineIndex = 0;
            program.wordIndex = -1; // before 1st word
            program.cameraX = 0;
            program.goingToNextLine = false;
            program.waitCountdown = END_LINE_WAIT*3; // initial wait

        // setup configs
        p.createCanvas(_WIDTH, _WIDTH * p5Program.configs.canvasHeightFactor); 
        p.textFont(p5Program.configs.fFamily, _(p5Program.configs.fSize));

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

        p.noLoop();
    }
    function _(num, isHeight) { return num/100 * (isHeight? p.height : p.width); }
    p.draw = () => {
        if (!p5Program.configs) {
            p.noLoop();
            return;
        }

        p.textSize(_(p5Program.configs.fSize));
        p.textAlign(p.LEFT, p.TOP);
        p.background(p5Program.configs.bgColor);

        p.push();
        renderTextsPlaying();
        p.pop();

        renderFader();
        renderName();

        framesData.push(canvas.canvas.toDataURL("image/jpeg"));
    }

    function renderFader(){
        p.strokeWeight(_(0.5));
        for (let i = p.height/2; i >= 0; i--){
            const strokeColor = p.color(p5Program.configs.bgColor);
            strokeColor.setAlpha(255 - p.map(i, 0, p.height/2, 0, 255));
            p.stroke(strokeColor);
            p.line(0, i, p.width, i);
        }
        p.noStroke();
    }

    function renderTextsPlaying() {
        const masterArr = program.wordsListsArray;
        let currentLine = masterArr[program.lineIndex];

        // vertical scroll
        if (program.goingToNextLine){
            const animationProgress = p.map(
                program.waitCountdown, 
                0, NEXT_LINE_DURATION,
                0, Math.PI/2
            );
            p.translate(0, -_(p.cos(animationProgress) * p5Program.configs.verticalSpacing * program.scrollLinesAmount));
        }
        // horizontal scroll
        p.translate(-_(program.cameraX), 0);
        // update cameraX
        const lastLineWidth = p.textWidth(currentLine.slice(0, program.wordIndex + 1).join(" "));
        if (_(program.cameraX) < lastLineWidth - _(LIMIT_WIDTH)) {
            const DISTANCE = lastLineWidth - _(LIMIT_WIDTH) - _(program.cameraX);
            program.cameraX += p.max(DISTANCE * CAMERA_X_SPEED_ACC, CAMERA_X_SPEED_LIMIT);
        }
        
        // render
        p.fill(p5Program.configs.textColor);
        for (let i=0; i <= program.lineIndex; i++){
            const wordsList = masterArr[program.lineIndex - i]; // inversed order
            let textLine;

            if (i === 0){ // current line?
                let blinkingLine = (p.frameCount % BLINK_DURATION < BLINK_DURATION/2) ? "|" : "";
                textLine = wordsList.slice(0, program.wordIndex + 1).join(" ") + blinkingLine;
            }
            else textLine = wordsList.join(" ");

            textLine = textLine.replace(/_/g, ''); // remove all _
            p.text(
                textLine,
                _(LEFT_PADDING),
                _(50, true) - _(p5Program.configs.verticalSpacing * i)
            );
        }

        // done waiting? => next action
        if (--program.waitCountdown <= 0){

            // just moved to a new line?
            if (program.goingToNextLine){
                program.goingToNextLine = false; // reset
                program.lineIndex += program.scrollLinesAmount;
                program.wordIndex = -1;
                program.cameraX = 0;
            }

            // still has more words?
            else if (program.wordIndex < currentLine.length - 1){
                program.wordIndex++; // next word
                const customeWaitAmount = currentLine[program.wordIndex].split("_").length-1;
                const lettersAmount = currentLine[program.wordIndex].length;
                program.waitCountdown =  (4 + lettersAmount) * LETTER_DURATION_FACTOR + (customeWaitAmount * LETTER_DURATION_FACTOR * 10);

                // extra wait if is last word in the line
                if (program.wordIndex === currentLine.length - 1){
                    program.waitCountdown += END_LINE_WAIT;
                    
                    // another extra wait if is last line
                    if (program.lineIndex === masterArr.length - 1) program.waitCountdown += END_LINE_WAIT*3;
                }
            }

            // still has more lines? => set up next line animation
            else if (program.lineIndex < masterArr.length - 1){
                program.waitCountdown = NEXT_LINE_DURATION;
                program.goingToNextLine = true;
                
                // count empty lines to scroll past
                program.scrollLinesAmount = 1;
                for (let i = program.lineIndex + 1; i < masterArr.length; i++){
                    if (masterArr[i][0].length === 0) program.scrollLinesAmount++;
                    else break;
                }
            }

            // end of animation
            else stopAndPassFrames();
        }
    }

    function renderName(){
        let nameString = p5Program.configs.author;
        if (nameString.length === 0) return;

        p.textAlign(p.RIGHT, p.BOTTOM);
        p.textSize(_(5));
        p.fill(p5Program.configs.textColor);
        p.text(nameString, _(100 - _PADDING_), _(100 - _PADDING_, true));
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