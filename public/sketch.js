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
const LIMIT_WIDTH = 80; // percent of width before scrolling right
const BLINK_DURATION = 30; // smaller is faster
const _PADDING_ = 1.5; // for name text

const CAMERA_X_SPEED_ACC = 0.04;
const CAMERA_X_SPEED_LIMIT = 0.6;
// durations below: bigger => slower
const END_LINE_WAIT = 12; // wait duration when a line is done
const LETTER_DURATION_FACTOR = 1.3;
const NEXT_LINE_DURATION = 15; // duration of animation moving to next line

let recorder;
let program = {
    UNIQUE_ID : 0, // new id when generate
    status: "idle", // idle, playing, recording, finalizing, generating

    // for playing scene
    wordsListsArray: [], // array of arrays of words => used to create rendering data in real time (array of strings)
    lineIndex: 0,
    wordIndex: 0,
    goingToNextLine: false, // true when animating to next line
    cameraX: 0,
    waitCountdown: 0, // various wait times (end of line? how long is the word?)

    isRecording: false,
    recordingCountdown: 0, // frameRate * 3
    hasAudio: false,
    audioBlob: null,
    audioFile: null,
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

            canvasHeightFactor: [1, 9/16, 16/9][Number(ratioDropdown.value)], // ratio
            verticalSpacing: Number(verticalSpacingSlider.value),
            fSize: Number(textSizeSlider.value),
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
    function cancelRecording() {
        setupScene("canceling");
        stopRecording(([buffer, blob]) => {
            console.log("Recording canceled.");
            setupScene("idle");
        }, (err) => {
            console.log(err);
            alert("Failed to finalize audio.");
        });
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
        if (program.status === "finalizing"){
            setRecordingControlVisibility(false);
            program.isRecording = false;

            stopRecording(([buffer, blob]) => {
                console.log("Successfully finalized audio.");

                // set properties for program object
                (async () => {
                    program.audioBlob64 = await blobToBase64(blob);
                })();

                program.audioFile = new File(buffer, `audio.mp3`, {
                    type: blob.type,
                    lastModified: Date.now()
                });
                program.audioPlayer = new Audio(URL.createObjectURL(program.audioFile));
                program.hasAudio = true;
                setupScene("idle");
                alert("Audio added, click Preview to play.");
            }, (err) => {
                console.log(err);
                alert("Failed to finalize audio.");
            });
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
        bgColorPicker = document.getElementById("bg-color-picker");
        textColorPicker = document.getElementById("text-color-picker");
        fontFamiliesDropdown = document.getElementById("ff-dropdown");
        ratioDropdown = document.getElementById("ratio-dropdown");

        // element events
        document.getElementById("record-audio-button").onclick = () => {setupScene("recording")};
        document.getElementById("remove-audio-button").onclick = removeAudio;
        document.getElementById("cancel-recording-button").onclick = cancelRecording;
        previewButton.onclick = previewClicked;
        generateButton.onclick = startGenerating;
        ratioDropdown.onchange = createTheCanvas;
        textArea.value = "Click Preview to play animation of this sample texts.\nUse UNDERSCORES__ to wait longer.\n\nSee more options below.";
        textArea.onchange = removeAudio;
        
        setAudioModalVisibility(false);
        recorder = new MicRecorder({bitRate: 128});
        
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
            p.text(p.max(0, p.ceil(program.recordingCountdown / 30)), p.width/2, p.height/2);

            program.recordingCountdown--;
            if (program.recordingCountdown === 0){
                startRecording(() => {
                    program.isRecording = true; // starting animation
                    setRecordingControlVisibility(true);
                    console.log("Started recording...");
                }, (err) => {
                    console.log(err);
                    setupScene("idle");
                    alert("Couldn't start recording, please check the mic access.");
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


function startRecording(successCallback, failCallback){
    // Start recording. Browser will request permission to use your microphone.
    recorder.start().then(successCallback).catch(failCallback);
}
function stopRecording(successCallback, failCallback){
    recorder.stop().getMp3().then(successCallback).catch(failCallback);
}


const blobToBase64 = (blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = function () {
        resolve(reader.result);
      };
    });
};
