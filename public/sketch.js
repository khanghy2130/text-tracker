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

// let program = {
//     UNIQUE_ID : 0, // new id when generate
//     status: "idle", // idle, playing
//     y: 0,
//     textRectHeight: 0,
//     downloadPath: ""
// };
// const WAIT_FINISH = 40; // wait duration frames amount
// let waitObj = {
//     timer: 0,
//     beginning: true // 2 waits for begin and end
// }

// // set waittimer / return if wait is done
// function updateWait(beginning){
//     // setting new wait?
//     if (!isNaN(beginning)) {
//         waitObj.beginning = beginning;
//         waitObj.timer = 0;
//     }
//     waitObj.timer++;
//     return waitObj.timer >= WAIT_FINISH;
// }

// const sketch = (p) => {
//     function createTheCanvas(creating){
//         const heightFactor = [1, 9/16, 16/9][Number(ratioDropdown.value)];
//         const widthValue = p.min(document.documentElement.clientWidth, (heightFactor > 1) ? 300 : 500);
//         p.createCanvas(widthValue, widthValue * heightFactor);
//     }

//     function previewClicked(){
//         program.y = 0;
//         if (program.status === "idle"){
//             previewButton.innerText = "Stop preview";
//             setOptionsVisibility(false);
//             program.status = "playing";
//             setUpTextPosition();
//             updateWait(1);
//         }
//         else if (program.status === "playing") {
//             previewButton.innerText = "Preview";
//             setOptionsVisibility(true);
//             program.status = "idle";
//         }
//     }

//     function startGenerating(){
//         if (program.status === "playing") previewClicked(); // exist preview
//         waitMessage.hidden = false;
//         setOptionsVisibility(false);
//         setButtonsVisibility(false);
//         program.status = "generating";

        
//         // send configs
//         const _WIDTH = 576;
//         const resultLinesList = getResultLinesList(_WIDTH);

//         program.UNIQUE_ID = Date.now(); // new id
//         const configs = {
//             id: program.UNIQUE_ID, 

//             _WIDTH,
//             WAIT_FINISH,
//             SCROLL_SPEED,
//             TOP_PADDING,
//             BOTTOM_PADDING,
//             LEFT_PADDING,
//             RIGHT_PADDING,

//             bgColor: bgColorPicker.value,
//             textColor: textColorPicker.value,
//             processedText: getResultLinesList(_WIDTH).join(String.fromCharCode(10)),
//             author: authorInput.value,
//             rectHeight: textSizeSlider.value/100 * _WIDTH * resultLinesList.length * LINE_HEIGHT_FACTOR,

//             canvasHeightFactor: [1, 9/16, 16/9][Number(ratioDropdown.value)], // ratio
//             fSize: textSizeSlider.value/100 * _WIDTH,
//             fFamily: fontFamiliesDropdown.value
//         };

//         // fetching { success: boolean, errorMessage?: string }
//         fetch('/generate', {
//             method: 'POST', 
//             headers: {'Content-Type': 'application/json'},
//             body: JSON.stringify( configs )
//           })
//           .then(res => res.json())
//           .then(data => {
//             if (!data.success) stopGenerating(false, data.errorMessage);
//             else startWaitng(); // generation started!
//           })
//           .catch((error) => {
//             console.log(error);
//             stopGenerating(false);
//           });
//     }

//     // called when receives a respond from /status/:id
//     function stopGenerating(success, errorMessage){
//         waitMessage.hidden = true;
//         setOptionsVisibility(true);
//         setButtonsVisibility(true);
//         program.status = "idle";
//         program.y = 0;

//         if (success){
//             let linkEle = document.createElement('a');
//             linkEle.href = "/download/" + program.UNIQUE_ID;
//             linkEle.click();
//         } else alert(errorMessage || "Something went wrong");
//     }


//     let intervalID;
//     function startWaitng(){
//         intervalID = setInterval(function(){
//             // fetching { videoIsReady: boolean, errorMessage?: string }
//             fetch('/status/' + program.UNIQUE_ID)
//                 .then(res => res.json())
//                 .then(data => {
//                     // error?
//                     if (data.errorMessage) stopWating(false, data.errorMessage);
//                     // video is ready?
//                     else if (data.videoIsReady) stopWating(true);
//                     else console.log("Video not ready.");
//                 })
//                 .catch((error) => {
//                     console.log(error);
//                     stopGenerating(false);
//                 });
//         }, 2000);
//     }
//     function stopWating(success, errorMessage){
//         clearInterval(intervalID); // stops interval
//         stopGenerating(success, errorMessage);
//     }




//     function setUpTextPosition(){
//         const linesAmount = getResultLinesList(p.width).length;
//         program.textRectHeight = textSizeSlider.value/100 * p.width * linesAmount * LINE_HEIGHT_FACTOR;
//         program.y = 0;
//     }
//     function setOptionsVisibility(shown){
//         document.getElementById("options-container").style.display = (shown)? "flex" : "none";
//     }
//     function setButtonsVisibility(shown){
//         document.getElementById("main-buttons-container").style.display = (shown)? "flex" : "none";
//     }

//     p.setup = () => {
//         // get html elements
//         previewButton = document.getElementById("btn-preview");
//         generateButton = document.getElementById("btn-generate");

//         waitMessage = document.getElementById("wait-message");

//         textArea = document.getElementById("text-area");
//         authorInput = document.getElementById("author");
//         textSizeSlider = document.getElementById("text-size-slider");
//         verticalSpacingSlider = document.getElementById("veritcal-slider");
//         bgColorPicker = document.getElementById("bg-color-picker");
//         textColorPicker = document.getElementById("text-color-picker");
//         fontFamiliesDropdown = document.getElementById("ff-dropdown");
//         ratioDropdown = document.getElementById("ratio-dropdown");

//         // element events
//         previewButton.onclick = previewClicked;
//         generateButton.onclick = startGenerating;
//         ratioDropdown.onchange = createTheCanvas;


//         createTheCanvas();
//         p.frameRate(30);
//         p.noStroke();
//         p.imageMode(p.CENTER);
//         p.rectMode(p.CORNER);
//     };

//     const SCROLL_SPEED = 0.33;
//     const TOP_PADDING = 0.4;
//     const BOTTOM_PADDING = 0.7;
//     const LEFT_PADDING = 0.03;
//     const RIGHT_PADDING = 0.9;
//     p.draw = () => {
//         if (program.status === "idle"){
//             renderText();
//             renderName();
//         }
//         else if (program.status === "playing"){
//             renderText();
//             renderName();

//             // if still waiting
//             if (!updateWait()) return;

//             const bottomOfTextRect = p.height * TOP_PADDING - program.y/100 * p.height + program.textRectHeight;
//             if (bottomOfTextRect > p.height * BOTTOM_PADDING){
//                 program.y += SCROLL_SPEED;
//             } 
//             // finished scrolling, but has it wait for the end yet?
//             else {
//                 if (waitObj.beginning === 1) updateWait(2);
//                 else previewClicked();
//             }
//         }
//         else if (program.status === "generating"){
//             const r = p.min(p.width, p.height) * 0.2;
//             const t = p.frameCount * 0.07;
//             p.fill(250);
//             p.circle(
//                 p.width/2 + p.cos(t) * r,
//                 p.height/2 + p.sin(t) * r,
//                 r * 0.3
//             );
//             p.background(0, 0, 0, 15);
//         }
//     };

//     const LINE_HEIGHT_FACTOR = 1.25;
//     const LINE_CHAR_FACTOR = 0.52;
//     function getResultLinesList(w){
//         const fSize = textSizeSlider.value/100 * w;
//         const linesList = textArea.value.split(String.fromCharCode(10));

//         // remove empty trailing lines
//         while(linesList.length > 0 && linesList[linesList.length - 1].length === 0){
//             linesList.pop();
//         }

//         // loop thru each line to see if it's too long then cut it
//         const charsLimit = (w * RIGHT_PADDING) / (fSize * LINE_CHAR_FACTOR);
//         for (let i=0; i < linesList.length; i++){
//             let line = linesList[i];
//             // if this line is too long
//             if (line.length > charsLimit){
//                 let wordsList = line.split(" ");
//                 currentCharCount = 0;

//                 let newLine = "";
//                 wordsList.forEach((word) => {
//                     if (currentCharCount + word.length <= charsLimit) {
//                         // same line
//                         currentCharCount += word.length + 1; // word and a space
//                         newLine += word + " ";
//                     } else {
//                         // new line
//                         currentCharCount = word.length + 1;
//                         newLine += String.fromCharCode(10) + word + " ";
//                     }
//                 });

//                 linesList[i] = newLine;          
//             }
//         }

//         return linesList.join(String.fromCharCode(10)).split(String.fromCharCode(10));
//     }

//     function renderText(){
//         const fSize = textSizeSlider.value/100 * p.width;
//         const renderY = p.height * TOP_PADDING - program.y/100 * p.height;
//         const linesList = getResultLinesList(p.width);

//         p.textAlign(p.LEFT, p.TOP);
//         p.background(bgColorPicker.value);
        
//         p.fill(textColorPicker.value); 
//         p.textFont(fontFamiliesDropdown.value, fSize);
//         p.text(linesList.join(String.fromCharCode(10)), p.width * LEFT_PADDING, renderY);
//     }

//     function renderName(){
//         const _PADDING_ = 0.02;
//         let nameString = authorInput.value;
//         if (nameString.length === 0) return;

//         p.textAlign(p.RIGHT, p.TOP);
//         p.textSize(p.width * 0.05);

//         p.fill(bgColorPicker.value);
//         p.rect(
//             p.width, 0, 
//             (_PADDING_*2 + nameString.length*0.028) * -p.width, 
//             (_PADDING_*2 + 0.05) * p.width
//         );

//         p.fill(textColorPicker.value);
//         p.text(nameString, p.width * (1 - _PADDING_), p.width * _PADDING_);
//     }
// };



let program = {
    UNIQUE_ID : 0, // new id when generate
    status: "idle", // idle, playing, generating

    // for playing scene
    wordsListsArray: [], // array of arrays of words => used to create rendering data in real time (array of strings)
    lineIndex: 0,
    wordIndex: 0,
    lineTransitionAP: 0, // AP = animation progress
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
        textArea.value = "Line 1 ...\nLine 2...\nLine 3..."

        createTheCanvas();
        p.frameRate(30);
        p.noStroke();
        p.imageMode(p.CENTER);
        p.rectMode(p.CORNER);
    };

    // const
    const LEFT_PADDING = 2;

    function _(num, isHeight) { return num/100 * (isHeight? p.height : p.width); }
    p.draw = () => {
        p.textFont(fontFamiliesDropdown.value, _(textSizeSlider.value));
        p.textAlign(p.LEFT, p.TOP);

        if (program.status === "idle"){
            p.background(bgColorPicker.value);
            const linesList = textArea.value.split(String.fromCharCode(10));

            p.push();
            // move camera to the right if last line is long
            const limitWidth = _(90);
            const lastLineWidth = p.textWidth(linesList[linesList.length - 1]);
            if (lastLineWidth > limitWidth) p.translate(limitWidth - lastLineWidth, 0);

            // render idle input text
            for (let i=0; i < linesList.length; i++){
                let textLine = linesList[linesList.length - 1 - i]; // inversed
                p.text(
                    textLine,
                    _(LEFT_PADDING),
                    _(50, true) - _(verticalSpacingSlider.value * i)
                );
            }
            p.pop();

            p.tint("yellow");
            p.image(faderImage, _(50), _(25, true), _(105), _(50, true));

            renderName();
        }
        else if (program.status === "playing"){
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

    function renderText() {
        const linesList = textArea.value.split(String.fromCharCode(10));

    }

    function renderName(){
        const _PADDING_ = 1.5;
        let nameString = authorInput.value;
        if (nameString.length === 0) return;

        p.textAlign(p.RIGHT, p.TOP);
        p.textSize(_(5));
        p.fill(bgColorPicker.value);
        p.rect(
            p.width, 0, 
            -_(_PADDING_*2) - p.textWidth(nameString), 
            _(_PADDING_*2 + 5)
        );

        p.fill(textColorPicker.value);
        p.text(nameString, _(100 - _PADDING_), _(_PADDING_));
    }
};



window.onload = () => {
    new p5(sketch, document.getElementById("canvas-program-container"));
};



