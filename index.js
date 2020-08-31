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

app.post('/generate', function (req, res) {
    // already generating? respond as fail
    if (isGenerating) {
        res.json( {path: null} );
        return;
    }

    console.log("Start generating video...");
    p5Program.configs = req.body;
    p5Program.res = res;
    p5Program.start();
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


let isGenerating = false; // generate one video at once
let p5Program = {}; // contains configs, res, and start()

function sketch(p) {
    let canvas;
    let y = 0;
    let framesData = [];

    p5Program.start = function(){
        isGenerating = true;
        y = 0;
        framesData = [];

        // setup configs
        const _WIDTH = p5Program.configs._WIDTH;
        p.createCanvas(_WIDTH, _WIDTH * p5Program.configs.canvasHeightFactor); 

        p.loop();
    }

    function stopAndPassFrames(){
        p.noLoop();

        // adding 1st and last frame
        for (let i=0; i < p5Program.configs.WAIT_FINISH; i++){
            framesData.unshift(framesData[0]);
            framesData.push(framesData[framesData.length - 1]);
        }

        generateVideo(
            framesData,
            p5Program.configs.id, 
            p5Program.res
        )
    }

    p.setup = () => {
        canvas = p.createCanvas(480, 480);
        p.frameRate(999);
        p.noStroke();
        p.noLoop();
    }
    p.draw = () => {
        if (!p5Program.configs) {
            p.noLoop();
            return;
        }

        renderText();
        renderName();
        
        const bottomOfTextRect = p.height * p5Program.configs.TOP_PADDING - y/100 * p.height + p5Program.configs.rectHeight;
        // if y is below OR framesData has nothing
        if (bottomOfTextRect > p.height * p5Program.configs.BOTTOM_PADDING || framesData.length === 0){
            y += p5Program.configs.SCROLL_SPEED;
            framesData.push(canvas.canvas.toDataURL("image/jpeg"));
        } else stopAndPassFrames();
    }

    function renderText(){
        const renderY = p.height * p5Program.configs.TOP_PADDING - y/100 * p.height;
        p.textAlign(p.LEFT, p.TOP);
        p.background(p5Program.configs.bgColor);
        p.textFont(p5Program.configs.fFamily, p5Program.configs.fSize);
        p.fill(p5Program.configs.textColor);
        p.text(p5Program.configs.processedText, p.width * p5Program.configs.LEFT_PADDING, renderY);
    }
    function renderName(){
        const _PADDING_ = 0.02;
        let nameString = p5Program.configs.author;
        if (nameString.length === 0) return;

        p.textAlign(p.RIGHT, p.TOP);
        p.textSize(p.width * 0.05);

        p.fill(p5Program.configs.bgColor);
        p.rect(
            p.width, 0, 
            (_PADDING_*2 + nameString.length*0.028) * -p.width, 
            (_PADDING_*2 + 0.05) * p.width
        );
        
        p.fill(p5Program.configs.textColor);
        p.text(nameString, p.width * (1 - _PADDING_), p.width * _PADDING_);
    }
}

// load fonts
let p5Instance = p5.createSketch(sketch);


// takes array of dataURLs. creates video with ID. responds with download path
function generateVideo(framesArray, id, res){
    const fileName = `./result/id_${id}.mp4`;
    const finalFileName = `./result/final_${id}.mp4`;

    mjpeg({ fileName: fileName, ignoreIdenticalFrames: 0 })
    .then( (recorder) => {
        
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
    
                        console.log("mp4 ready!");
                        isGenerating = false;
                        res.json( {path: `/download/${id}`} );
                    });
                    command.on("error", handleError);
                    command.output(finalFileName);
                    command.run();
                })
                .catch(handleError)
        }
    })
    .catch(handleError)

    function handleError(err){
        console.log(err);
        isGenerating = false;
        res.json( {path: null} );
    }
}
