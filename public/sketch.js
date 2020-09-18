// HTML Elements
let previewButton;
let generateButton;

let waitMessage;

let textArea;
let authorInput;
let textSizeSlider;
let verticalSpacingSlider;
let bgColorPicker;
let textColorPicker;
let fontFamiliesDropdown;
let ratioDropdown;

// image
let faderImage;

// global functions
function setOptionsVisibility(shown){
    document.getElementById("options-container").style.display = (shown)? "flex" : "none";
}
function setButtonsVisibility(shown){
    document.getElementById("main-buttons-container").style.display = (shown)? "flex" : "none";
}


// const
const LEFT_PADDING = 2; // for main text
const LIMIT_WIDTH = 80; // percent of width before scrolling right
const BLINK_DURATION = 30; // smaller is faster
const _PADDING_ = 1.5; // for name text

const CAMERA_X_SPEED_ACC = 0.035;
const CAMERA_X_SPEED_LIMIT = 0.6;
const END_LINE_WAIT = 25; // wait duration when a line is done
const LETTER_DURATION_FACTOR = 1.7;
const NEXT_LINE_DURATION = 17; // duration of animation moving to next line

let program = {
    UNIQUE_ID : 0, // new id when generate
    status: "idle", // idle, playing, generating

    // for playing scene
    wordsListsArray: [], // array of arrays of words => used to create rendering data in real time (array of strings)
    lineIndex: 0,
    wordIndex: 0,
    goingToNextLine: false, // true when animating to next line
    cameraX: 0,
    waitCountdown: 0 // various wait times (end of line? how long is the word?)
};

const sketch = (p) => {
    function createTheCanvas(){
        const heightFactor = [1, 9/16, 16/9][Number(ratioDropdown.value)];
        const widthValue = p.min(document.documentElement.clientWidth, (heightFactor > 1) ? 300 : 500);
        p.createCanvas(widthValue, widthValue * heightFactor);
    }

    function previewClicked(){
        // set up playing or idle scene
        if (program.status === "idle"){
            previewButton.innerText = "Stop preview";
            setupScene("playing");
        }
        else if (program.status === "playing") {
            previewButton.innerText = "Preview";
            setOptionsVisibility(true);
            setupScene("idle");
        }
    }

    function startGenerating(){
        if (program.status === "playing") previewClicked(); // exist preview
        setupScene("generating");

        // send configs
        const _WIDTH = 576;

        program.UNIQUE_ID = Date.now(); // new id
        const configs = {
            id: program.UNIQUE_ID, 

            _WIDTH,

            bgColor: bgColorPicker.value,
            textColor: textColorPicker.value,
            processedText: "", //////
            author: authorInput.value,

            canvasHeightFactor: [1, 9/16, 16/9][Number(ratioDropdown.value)], // ratio
            veritcalSpacing: 0, //////////
            fSize: textSizeSlider.value/100 * _WIDTH,
            fFamily: fontFamiliesDropdown.value
        };

        // fetching { success: boolean, errorMessage?: string }
        fetch('/generate', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify( configs )
          })
          .then(res => res.json())
          .then(data => {
            if (!data.success) stopGenerating(false, data.errorMessage);
            else startWaitng(); // generation started!
          })
          .catch((error) => {
            console.log(error);
            stopGenerating(false);
          });
    }

    // called when receives a respond from /status/:id
    function stopGenerating(success, errorMessage){
        setupScene("idle");

        if (success){
            let linkEle = document.createElement('a');
            linkEle.href = "/download/" + program.UNIQUE_ID;
            linkEle.click();
        } else alert(errorMessage || "Something went wrong");
    }


    let intervalID;
    function startWaitng(){
        intervalID = setInterval(function(){
            // fetching { videoIsReady: boolean, errorMessage?: string }
            fetch('/status/' + program.UNIQUE_ID)
                .then(res => res.json())
                .then(data => {
                    // error?
                    if (data.errorMessage) stopWating(false, data.errorMessage);
                    // video is ready?
                    else if (data.videoIsReady) stopWating(true);
                    else console.log("Video not ready.");
                })
                .catch((error) => {
                    console.log(error);
                    stopGenerating(false);
                });
        }, 2000);
    }
    function stopWating(success, errorMessage){
        clearInterval(intervalID); // stops interval
        stopGenerating(success, errorMessage);
    }

    function setupScene(sceneName){
        program.status = sceneName;
        if (sceneName === "idle"){
            waitMessage.hidden = true;
            setOptionsVisibility(true);
            setButtonsVisibility(true);
        }
        else if (sceneName === "playing"){
            waitMessage.hidden = true;
            setOptionsVisibility(false);
            setButtonsVisibility(true);

            const linesList = textArea.value.split(String.fromCharCode(10));
            program.wordsListsArray = linesList.map(str => str.split(" "));
            program.lineIndex = 0;
            program.wordIndex = -1; // before 1st word
            program.cameraX = 0;
            program.goingToNextLine = false;
            program.waitCountdown = END_LINE_WAIT; // initial wait
        }
        else if (sceneName === "generating"){
            waitMessage.hidden = false;
            setOptionsVisibility(false);
            setButtonsVisibility(false);
        }
    }
    
    p.preload = () => {
        faderImage = p.loadImage("./fader.png");
    };
    p.setup = () => {
        // get html elements
        previewButton = document.getElementById("btn-preview");
        generateButton = document.getElementById("btn-generate");
        waitMessage = document.getElementById("wait-message");

        textArea = document.getElementById("text-area");
        authorInput = document.getElementById("author");
        textSizeSlider = document.getElementById("text-size-slider");
        verticalSpacingSlider = document.getElementById("vertical-slider");
        bgColorPicker = document.getElementById("bg-color-picker");
        textColorPicker = document.getElementById("text-color-picker");
        fontFamiliesDropdown = document.getElementById("ff-dropdown");
        ratioDropdown = document.getElementById("ratio-dropdown");

        // element events
        previewButton.onclick = previewClicked;
        //////generateButton.onclick = startGenerating;
        ratioDropdown.onchange = createTheCanvas;
        textArea.value = "Click Preview to play animation of this sample texts.\nUse UNDERSCORES__ to wait longer.\n\nSee more options below."

        createTheCanvas();
        p.frameRate(30);
        p.noStroke();
        p.imageMode(p.CENTER);
        p.rectMode(p.CORNER);
    };


    function _(num, isHeight) { return num/100 * (isHeight? p.height : p.width); }
    p.draw = () => {
        p.textFont(fontFamiliesDropdown.value, _(textSizeSlider.value));
        p.textAlign(p.LEFT, p.TOP);

        if (program.status === "idle"){
            p.background(bgColorPicker.value);

            p.push();
            // move camera to the right if last line is long
            const limitWidth = _(LIMIT_WIDTH);
            const linesList = textArea.value.split(String.fromCharCode(10));
            const lastLineWidth = p.textWidth(linesList[linesList.length - 1]);
            if (lastLineWidth > limitWidth) p.translate(limitWidth - lastLineWidth, 0);

            p.fill(textColorPicker.value);
            // render idle input text
            for (let i=0; i < linesList.length; i++){
                let textLine = linesList[linesList.length - 1 - i]; // inversed order
                textLine = textLine.replace(/_/g, ''); // remove all _
                let blinkingLine = (i === 0 && p.frameCount % BLINK_DURATION < BLINK_DURATION/2) ? "|" : "";
                p.text(
                    textLine + blinkingLine,
                    _(LEFT_PADDING),
                    _(50, true) - _(verticalSpacingSlider.value * i)
                );
            }
            p.pop();

            // fader
            p.tint(bgColorPicker.value); 
            p.image(faderImage, _(50), _(25, true), _(105), _(50, true));

            renderName();
        }
        else if (program.status === "playing"){
            p.background(bgColorPicker.value);

            p.push();
            renderTextsPlaying();
            p.pop();

            // fader
            p.tint(bgColorPicker.value);
            p.image(faderImage, _(50), _(25, true), _(105), _(50, true));
            renderName();
        }
        else if (program.status === "generating"){
            const r = p.min(p.width, p.height) * 0.2;
            const t = p.frameCount * 0.07;
            p.fill(250);
            p.circle(
                p.width/2 + p.cos(t) * r,
                p.height/2 + p.sin(t) * r,
                r * 0.3
            );
            p.background(0, 0, 0, 15);
        }
    };

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
            p.translate(0, -_(p.cos(animationProgress) * verticalSpacingSlider.value * program.scrollLinesAmount));
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
        p.fill(textColorPicker.value);
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
                _(50, true) - _(verticalSpacingSlider.value * i)
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
            else previewClicked();
        }
    }

    function renderName(){
        let nameString = authorInput.value;
        if (nameString.length === 0) return;

        p.textAlign(p.RIGHT, p.BOTTOM);
        p.textSize(_(5));
        p.fill(textColorPicker.value);
        p.text(nameString, _(100 - _PADDING_), _(100 - _PADDING_, true));
    }
};



window.onload = () => {
    new p5(sketch, document.getElementById("canvas-program-container"));
};



