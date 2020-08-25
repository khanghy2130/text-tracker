// HTML Elements
let previewButton;
let generateButton;

let waitMessage;

let textArea;
let textSizeSlider;
let bgColorPicker;
let textColorPicker;
let fontFamiliesDropdown;
let ratioDropdown;

let program = {
    UNIQUE_ID : Date.now(),
    status: "idle", // idle, playing, generating, waiting
    y: 0,
    textRectHeight: 0,

    framesData: [],
    downloadPath: ""
};

const SCROLL_SPEED = 0.6;

const sketch = (p) => {
    function createTheCanvas(){
        const heightFactor = [1, 9/16, 16/9][Number(ratioDropdown.value)];
        const widthValue = p.min(document.documentElement.clientWidth, (heightFactor > 1) ? 300 : 500);
        p.createCanvas(widthValue, widthValue * heightFactor);
    }

    function previewClicked(){
        program.y = 0;
        if (program.status === "idle"){
            previewButton.innerText = "Stop preview";
            setOptionsVisibility(false);
            program.status = "playing";
            setUpTextPosition();
        }
        else if (program.status === "playing") {
            previewButton.innerText = "Preview";
            setOptionsVisibility(true);
            program.status = "idle";
        }
    }

    function startGenerating(){
        if (program.status === "playing") previewClicked(); // exist preview
        waitMessage.hidden = false;
        setOptionsVisibility(false);
        setButtonsVisibility(false);
        program.status = "generating";
        setUpTextPosition();
        program.framesData = [];
    }

    function sendData(){
        program.status = "waiting";

        fetch('/upload', {
            method: 'POST', 
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify( {id: program.UNIQUE_ID, frames: program.framesData} )
          })
          .then(res => res.json())
          .then(data => {
            if (data.path === null) throw "no path data";
            program.downloadPath = data.path;
            stopGenerating(true);
          })
          .catch((error) => {
            console.log(error);
            stopGenerating(false);
          });
    }

    function stopGenerating(success){
        waitMessage.hidden = true;
        setOptionsVisibility(true);
        setButtonsVisibility(true);
        program.status = "idle";

        if (success){
            let linkEle = document.createElement('a');
            linkEle.href = program.downloadPath;
            linkEle.click();
        } else alert("Something went wrong, please retry.");
    }


    function setUpTextPosition(){
        const linesAmount = getResultLinesList().length;
        program.textRectHeight = textSizeSlider.value/100 * p.width * linesAmount * LINE_HEIGHT_FACTOR;
        program.y = 0;
    }
    function setOptionsVisibility(shown){
        document.getElementById("options-container").style.display = (shown)? "flex" : "none";
    }
    function setButtonsVisibility(shown){
        document.getElementById("main-buttons-container").style.display = (shown)? "flex" : "none";
    }

    p.setup = () => {
        // get html elements
        previewButton = document.getElementById("btn-preview");
        generateButton = document.getElementById("btn-generate");

        waitMessage = document.getElementById("wait-message");

        textArea = document.getElementById("text-area");
        textSizeSlider = document.getElementById("text-size-slider");
        bgColorPicker = document.getElementById("bg-color-picker");
        textColorPicker = document.getElementById("text-color-picker");
        fontFamiliesDropdown = document.getElementById("ff-dropdown");
        ratioDropdown = document.getElementById("ratio-dropdown");

        // element events
        previewButton.onclick = previewClicked;
        generateButton.onclick = startGenerating;
        ratioDropdown.onchange = createTheCanvas;


        createTheCanvas();
        p.frameRate(30);
        p.textAlign(p.LEFT, p.TOP);
        p.noStroke();
    };

    const STOPPING_FACTOR = 0.8;
    p.draw = () => {
        if (program.status === "idle"){
            renderText();
        }
        else if (program.status === "playing"){
            renderText();

            const bottomOfTextRect = p.height * 0.2 - program.y/100 * p.height + program.textRectHeight;
            if (bottomOfTextRect > p.height * STOPPING_FACTOR){
                program.y += SCROLL_SPEED;
            } else previewClicked();
        }
        else if (program.status === "generating"){
            renderText();

            // capture frame
            const bottomOfTextRect = p.height * 0.2 - program.y/100 * p.height + program.textRectHeight;
            if (bottomOfTextRect > p.height * STOPPING_FACTOR){
                program.y += SCROLL_SPEED;
                const canvasEle = document.getElementById("defaultCanvas0");
                program.framesData.push(canvasEle.toDataURL());
            } else sendData();
        }
    };

    const LINE_HEIGHT_FACTOR = 1.25;
    const LINE_CHAR_FACTOR = 0.52;
    function getResultLinesList(){
        const fSize = textSizeSlider.value/100 * p.width;
        const renderY = p.height * 0.2 - program.y/100 * p.height;
        const linesList = textArea.value.split(String.fromCharCode(10));

        // remove empty trailing lines
        while(linesList.length > 0 && linesList[linesList.length - 1].length === 0){
            linesList.pop();
        }

        // loop thru each line to see if it's too long then cut it
        const charsLimit = (p.width * 0.9) / (fSize * LINE_CHAR_FACTOR);
        for (let i=0; i < linesList.length; i++){
            let line = linesList[i];
            // if this line is too long
            if (line.length > charsLimit){
                let wordsList = line.split(" ");
                currentCharCount = 0;

                let newLine = "";
                wordsList.forEach((word) => {
                    if (currentCharCount + word.length <= charsLimit) {
                        // same line
                        currentCharCount += word.length + 1; // word and a space
                        newLine += word + " ";
                    } else {
                        // new line
                        currentCharCount = word.length + 1;
                        newLine += "\n" + word + " ";
                    }
                });

                linesList[i] = newLine;

/*
                for (let j=1; j < line.length; j++){
                    // find the first SPACE that is beyond charsLimit to cut
                    if (line[j] === " " && j >= charsLimit){
                        linesList[i] = line.slice(0, j); // 1st part
                        linesList.splice(i+1, 0, line.slice(j+1)); // 2nd part
                        break;
                    }
                }   */             
            }
        }

        return linesList;
    }

    function renderText(){
        const fSize = textSizeSlider.value/100 * p.width;
        const renderY = p.height * 0.2 - program.y/100 * p.height;
        const linesList = getResultLinesList();

        p.background(bgColorPicker.value);

        // p.fill(250);
        // p.rect(0, renderY, 300, program.textRectHeight);
        
        p.fill(textColorPicker.value); 
        p.textFont(fontFamiliesDropdown.value, fSize);
        p.text(linesList.join(String.fromCharCode(10)), p.width * 0.03, renderY);

        
    }
};

window.onload = () => {
    new p5(sketch, document.getElementById("canvas-program-container"));
};



