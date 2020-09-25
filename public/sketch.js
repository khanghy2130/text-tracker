// HTML Elements
let previewButton;
let generateButton;

let waitMessage;

let textArea;
let authorInput;
let audioButton;
let audioModal;

let textSizeSlider;
let verticalSpacingSlider;
let textSpeedSlider;
let scrollSpeedSlider;

let bgColorPicker;
let textColorPicker;
let fontFamiliesDropdown;
let ratioDropdown;


// global functions
function setOptionsVisibility(shown){
    document.getElementById("options-container").style.display = shown? "flex" : "none";
}
function setButtonsVisibility(shown){
    document.getElementById("main-buttons-container").style.display = shown? "flex" : "none";
}
function setRecordingControlVisibility(shown){
    document.getElementById("recording-control").style.display = shown? "flex" : "none";
}
function setAudioBtnText(){
    audioButton.innerText = program.hasAudio ? "Audio recorded" : "No audio recorded";
    if (program.hasAudio) audioButton.classList.add("audio-added");
    else audioButton.classList.remove("audio-added");
}
function setAudioModalVisibility(shown){
    audioModal.style.display = shown ? "flex" : "none";
}


// const
const _WIDTH = 576; // for generation
const LEFT_PADDING = 2; // for main text
const LIMIT_WIDTH = 85; // percent of width before scrolling right
const BLINK_DURATION = 30; // smaller is faster
const _PADDING_ = 1.5; // for name text

const CAMERA_X_SPEED_ACC = 0.13;
const CAMERA_X_SPEED_LIMIT = 2;
const END_LINE_WAIT = 12; // wait duration for symbols .,;?! and at the end of a line

const GET_NEXT_LINE_DURATION = (scroll_speed, isHorizontal) => {
    if (isHorizontal) return 30 - Math.round(scroll_speed * 1.2);
    return 30 - scroll_speed;
}
const GET_LETTER_DURATION_FACTOR = text_speed => 3.0 - text_speed;


let program = {
    UNIQUE_ID : 0, // new id when generate
    status: "idle", // idle, playing, recording, finalizing, generating

    // for playing scene
    wordsListsArray: [], // array of arrays of words => used to create rendering data in real time (array of strings)
    lineIndex: 0,
    wordIndex: 0,
    goingToNextLine: false, // true when animating to next line
    scrollLinesAmount: 0, // amount of empty lines to scroll past
    cameraX: 0, // real render value, not percentage
    waitCountdown: 0, // various wait times (end of line? how long is the word?)
    horizontalScrollMark: 0, // current ending point for cameraX
    previousScrollMark: 0, // starting point for hoerizontalScrollMark
    scrollProgress: 0, // 0 - scroll duration
    zoomOutLevel: 0, // 0 1 2

    isRecording: false,
    recordingCountdown: 0, // frameRate * 3
    hasAudio: false,
    audioBlob64: null,
    audioPlayer: null
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

            if (program.hasAudio) {
                program.audioPlayer.currentTime = 0;
                program.audioPlayer.play();
            }
        }
        else if (program.status === "playing") {
            previewButton.innerText = "Preview";
            setOptionsVisibility(true);
            setupScene("idle");

            if (program.hasAudio) program.audioPlayer.pause();
        }
    }


    function startGenerating(){
        // confirmation
        let confirmed = confirm("Confirm to generate? Please preview first to see if everything is good.");
        if (!confirmed) return;

        if (program.status === "playing") previewClicked(); // exist preview
        setupScene("generating");

        // send configs
        const linesList = textArea.value.split(String.fromCharCode(10));
        program.UNIQUE_ID = Date.now(); // new id
        const configs = {
            id: program.UNIQUE_ID,

            audioBlob64: program.hasAudio ? program.audioBlob64 : null,
            hasAudio: program.hasAudio,
            
            bgColor: bgColorPicker.value,
            textColor: textColorPicker.value,
            wordsListsArray: linesList.map(str => str.split(" ")),
            author: authorInput.value,

            verticalSpacing: Number(verticalSpacingSlider.value),
            fSize: Number(textSizeSlider.value),
            textSpeed: Number(textSpeedSlider.value),
            scrollSpeed: Number(scrollSpeedSlider.value),

            fFamily: fontFamiliesDropdown.value,
            canvasHeightFactor: [1, 9/16, 16/9][Number(ratioDropdown.value)] // ratio
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
                    stopWating(false);
                });
        }, 2000);
    }
    function stopWating(success, errorMessage){
        clearInterval(intervalID); // stops interval
        stopGenerating(success, errorMessage);
    }

    function removeAudio() {
        if (program.hasAudio){
            program.hasAudio = false;
            setAudioBtnText();
        }
    }
    function cancelRecordingButtonClicked() {
        setupScene("canceling");

        _cancelRecording();
        console.log("Recording canceled.");
        setupScene("idle");
    }

    function setupScene(sceneName){
        program.status = sceneName;
        if (sceneName === "idle"){
            setAudioBtnText();
            waitMessage.hidden = true;
            setRecordingControlVisibility(false);
            setOptionsVisibility(true);
            setButtonsVisibility(true);
        }
        else if (sceneName === "playing"){
            setOptionsVisibility(false);
            setButtonsVisibility(true);

            setupAnimation();
        }
        else if (sceneName === "recording"){
            // recording control will be shown when countdown is done
            setOptionsVisibility(false);
            setButtonsVisibility(false);

            program.isRecording = false;
            program.recordingCountdown = 30 * 3;
            setAudioModalVisibility(false);

            setupAnimation();
        }
        if (sceneName === "finalizing"){
            setRecordingControlVisibility(false);
            program.isRecording = false;

            _finishRecording();
        }
        else if (sceneName === "generating"){
            waitMessage.hidden = false;
            setOptionsVisibility(false);
            setButtonsVisibility(false);
        }

        function setupAnimation(){
            const linesList = textArea.value.split(String.fromCharCode(10));
            program.wordsListsArray = linesList.map(str => str.split(" "));
            program.lineIndex = 0;
            program.wordIndex = -1; // before 1st word
            program.cameraX = 0;
            program.goingToNextLine = false;
            program.waitCountdown = END_LINE_WAIT*3; // initial wait
            program.horizontalScrollMark = 0;
            program.previousScrollMark = 0;
            program.scrollProgress = 999;
            program.zoomOutLevel = 0;
        }
    }
    
    p.setup = () => {
        // get html elements
        previewButton = document.getElementById("btn-preview");
        generateButton = document.getElementById("btn-generate");
        waitMessage = document.getElementById("wait-message");

        textArea = document.getElementById("text-area");
        authorInput = document.getElementById("author");
        audioButton = document.getElementById("audio-button");
        audioModal = document.getElementById("audio-modal");

        textSizeSlider = document.getElementById("text-size-slider");
        verticalSpacingSlider = document.getElementById("vertical-slider");
        textSpeedSlider = document.getElementById("text-speed-slider");
        scrollSpeedSlider = document.getElementById("scroll-speed-slider");

        bgColorPicker = document.getElementById("bg-color-picker");
        textColorPicker = document.getElementById("text-color-picker");
        fontFamiliesDropdown = document.getElementById("ff-dropdown");
        ratioDropdown = document.getElementById("ratio-dropdown");

        // element events
        document.getElementById("record-audio-button").onclick = () => {setupScene("recording")};
        document.getElementById("remove-audio-button").onclick = removeAudio;
        document.getElementById("cancel-recording-button").onclick = cancelRecordingButtonClicked;
        previewButton.onclick = previewClicked;
        generateButton.onclick = startGenerating;
        ratioDropdown.onchange = createTheCanvas;
        textArea.value = "Click Preview to play animation of this sample texts.\nUse UNDERSCORES__ to wait longer.\n\nSee more options below.";
        textArea.onchange = removeAudio;
        
        setAudioModalVisibility(false);
        
        createTheCanvas();
        p.frameRate(30);
        p.noStroke();
        setupScene("idle");
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

            renderFader();
            renderName();
        }
        // playing or recording (after countdown)
        else if (program.status === "playing" || (program.status === "recording" && program.isRecording)){
            p.background(bgColorPicker.value);

            p.push();
            renderTextsPlaying();
            p.pop();

            renderFader();
            renderName();
        }
        // still counting down to record
        else if (program.status === "recording" && !program.isRecording){
            p.background(30);
            p.fill(250);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(_(25));
            p.text(p.max(1, p.ceil(program.recordingCountdown / 30)), p.width/2, p.height/2);

            program.recordingCountdown--;
            if (program.recordingCountdown === 0){
                _startRecording(() => {
                    program.isRecording = true; // starting animation
                    setRecordingControlVisibility(true);
                    console.log("Started recording...");
                }, 
                () => {
                    console.log("Error while starting recording!");
                    setupScene("idle");
                    alert("Couldn't start recording, please check the mic access.");
                }, 
                (blob) => {
                    console.log("Successfully finalized audio.");

                    // set properties for program object
                    (async () => {
                        program.audioBlob64 = await blobToBase64(blob);
                    })();

                    blob.lastModifiedDate = new Date();
                    blob.name = "audio.mp3";
                    
                    program.audioPlayer = new Audio(URL.createObjectURL(blob));
                    program.hasAudio = true;
                    setupScene("idle");
                    alert("Audio added, click Preview to play.");
                });
            }
        }
        else if (program.status === "finalizing"){
            p.background(30);
            p.fill(250);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(_(8));
            p.text("Finalizing audio...", p.width/2, p.height/2);
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

    function renderFader(){
        p.strokeWeight(_(0.5));
        for (let i = p.height/2; i >= 0; i--){
            const strokeColor = p.color(bgColorPicker.value);
            strokeColor.setAlpha(255 - p.map(i, 0, p.height/2, 0, 255));
            p.stroke(strokeColor);
            p.line(0, i, p.width, i);
        }
        p.noStroke();
    }

    function renderTextsPlaying() {
        const masterArr = program.wordsListsArray;
        let currentLine = masterArr[program.lineIndex];
        p.textSize(_(textSizeSlider.value - program.zoomOutLevel * 0.9));

        // vertical scroll animation
        if (program.goingToNextLine){
            const animationProgress = p.map(
                program.waitCountdown, 
                0, GET_NEXT_LINE_DURATION(scrollSpeedSlider.value),
                0, Math.PI/2
            );
            p.translate(0, -_(p.cos(animationProgress) * verticalSpacingSlider.value * program.scrollLinesAmount));
        }

        // horizontal scroll animation
        const nextHorizontalScrollDuration = GET_NEXT_LINE_DURATION(scrollSpeedSlider.value, true);
        if (program.scrollProgress < nextHorizontalScrollDuration) program.scrollProgress++;
        const animationProgress = p.map(
            nextHorizontalScrollDuration - program.scrollProgress, 
            0, nextHorizontalScrollDuration,
            0, Math.PI/2
        );
        const DISTANCE = program.horizontalScrollMark - program.previousScrollMark;
        p.translate(-p.cos(animationProgress) * DISTANCE, 0);

        // static horizontal & vertical scroll
        p.translate(-program.previousScrollMark, _(50, true));
        // update cameraX
        const lastLineWidth = p.textWidth(currentLine.slice(0, program.wordIndex + 1).join(" "));
        // still behind the mark? => scroll
        if (program.cameraX < program.horizontalScrollMark) {
            let DISTANCE = program.horizontalScrollMark - program.cameraX;
            program.cameraX += p.max(DISTANCE * CAMERA_X_SPEED_ACC, CAMERA_X_SPEED_LIMIT);
        }
        // popping text is out of screen? => update mark
        if (lastLineWidth > program.horizontalScrollMark + _(LIMIT_WIDTH + 5)) {
            if (program.zoomOutLevel < 2) program.zoomOutLevel++;
            p.textSize(_(textSizeSlider.value - program.zoomOutLevel * 0.9));
            /////console.log(p.textWidth(currentLine) - _(LIMIT_WIDTH - 5) < program.horizontalScrollMark + _(60));
            program.previousScrollMark = program.horizontalScrollMark; // going next
            program.horizontalScrollMark = p.min(
                p.textWidth(currentLine) - _(LIMIT_WIDTH - 5), 
                program.horizontalScrollMark + _(60)
            );
            program.scrollProgress = 0;
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
                - _(verticalSpacingSlider.value * i)
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
                program.horizontalScrollMark = 0;
                program.zoomOutLevel = 0;
            }

            // still has more words?
            else if (program.wordIndex < currentLine.length - 1){
                program.wordIndex++; // next word
                const word = currentLine[program.wordIndex];
                const customeWaitAmount = word.split("_").length-1;
                const lettersAmount = word.length;
                const enders = [",", ".", ";", "?", "!"];
                const periodWait = (enders.includes(word[word.length - 1])) ? END_LINE_WAIT : 0;
                const LDF = GET_LETTER_DURATION_FACTOR(textSpeedSlider.value);
                program.waitCountdown = periodWait + (4 + lettersAmount) * LDF + (customeWaitAmount * LDF * 10);

                // extra wait if is last word in the line
                if (program.wordIndex === currentLine.length - 1){
                    program.waitCountdown += END_LINE_WAIT;

                    // another extra wait if is last line
                    if (program.lineIndex === masterArr.length - 1) program.waitCountdown += END_LINE_WAIT*3;
                }
            }

            // still has more lines? => set up next line animation
            else if (program.lineIndex < masterArr.length - 1){
                program.waitCountdown = GET_NEXT_LINE_DURATION(scrollSpeedSlider.value);
                program.goingToNextLine = true;
                
                // count empty lines to scroll past
                program.scrollLinesAmount = 1;
                let leadingToEmptiness = true;
                for (let i = program.lineIndex + 1; i < masterArr.length; i++){
                    if (masterArr[i][0].length === 0) program.scrollLinesAmount++;
                    else {
                        leadingToEmptiness = false;
                        break;
                    }
                }
                // prevent crash
                if (leadingToEmptiness) program.scrollLinesAmount--;
            }

            // end of animation
            else {
                if (program.status === "playing") previewClicked();
                else if (program.status === "recording") setupScene("finalizing"); // wait scene
            }
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


const blobToBase64 = (blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = function () {
        resolve(reader.result);
      };
    });
};
