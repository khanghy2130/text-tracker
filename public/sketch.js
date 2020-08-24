// HTML Elements
let previewButton;
let generateButton;
let textArea;
let textSizeSlider;
let bgColorPicker;
let textColorPicker;
let fontFamiliesDropdown;
let ratioDropdown;

let program = {
    UNIQUE_ID : Date.now(),
    status: "idle", // idle, playing, generating
    y: 0,
    textRectHeight: 0,

    framesData: []
};


const sketch = (p) => {
    function createTheCanvas(){
        const heightFactor = [1, 9/16, 16/9][Number(ratioDropdown.value)];
        const widthValue = p.min(document.documentElement.clientWidth, (heightFactor > 1) ? 300 : 500);
        p.createCanvas(widthValue, widthValue * heightFactor);
    }

    function previewClicked(){
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
        setOptionsVisibility(false);
        setButtonsVisibility(false);
        program.status = "generating";
        setUpTextPosition();
        program.framesData = [];
    }

    function sendData(){
        console.log(program.framesData);
        stopGenerating(true);
    }

    function stopGenerating(success){
        setOptionsVisibility(true);
        setButtonsVisibility(true);
        program.status = "idle";

        if (success){
            alert("success");
        } else alert("fail");
    }


    function setUpTextPosition(){
        let linesAmount = textArea.value.split(String.fromCharCode(10)).length;
            program.textRectHeight = textSizeSlider.value/100 * p.width * linesAmount * 0.28;
            program.y = -program.textRectHeight/2; // image mode is center -> half of text rect is below canvas height
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
        p.frameRate(40);
        p.textAlign(p.CENTER, p.CENTER);

    };


    p.draw = () => {
        if (program.status === "idle"){
            p.background(bgColorPicker.value);
            p.fill(textColorPicker.value);
            p.textFont(fontFamiliesDropdown.value, textSizeSlider.value/100 * p.width);
            p.text(textArea.value, p.width/2, p.height/2);
        }
        else if (program.status === "playing"){
            p.background(bgColorPicker.value);
            p.fill(textColorPicker.value);
            p.textFont(fontFamiliesDropdown.value, textSizeSlider.value/100 * p.width);
            p.text(textArea.value, p.width/2, p.height - (program.y/100 * p.height));

            if (program.y++ < 100 + program.textRectHeight/2){}
            else previewClicked();
        }
        else if (program.status === "generating"){
            p.background(bgColorPicker.value);
            p.fill(textColorPicker.value);
            p.textFont(fontFamiliesDropdown.value, textSizeSlider.value/100 * p.width);
            p.text(textArea.value, p.width/2, p.height - (program.y/100 * p.height));

            // capture frame
            if (program.y++ < 100 + program.textRectHeight/2){
                const canvasEle = document.getElementById("defaultCanvas0");
                program.framesData.push(canvasEle.toDataURL());
            } else sendData();
        }
    };
};

window.onload = () => {
    new p5(sketch, document.getElementById("canvas-program-container"));
};



///////////// hide options when generating