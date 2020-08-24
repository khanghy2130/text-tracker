let textArea;
let textSizeSlider;
let bgColorPicker;
let textColorPicker;
let fontFamiliesDropdown;
let ratioDropdown;

const sketch = (p) => {

    p.setup = () => {
        // load html elements
        textArea = document.getElementById("text-area");
        textSizeSlider = document.getElementById("text-size-slider");
        bgColorPicker = document.getElementById("bg-color-picker");
        textColorPicker = document.getElementById("text-color-picker");
        fontFamiliesDropdown = document.getElementById("ff-dropdown");
        ratioDropdown = document.getElementById("ratio-dropdown");


        const CANVAS_SIZE = p.min(document.documentElement.clientWidth, 500);
        p.createCanvas(CANVAS_SIZE, CANVAS_SIZE);
        p.frameRate(30);
        p.textAlign(p.CENTER, p.TOP);

    };


    p.draw = () => {
        p.background("green");
    };
};

window.onload = () => {
    new p5(sketch, document.getElementById("canvas-program-container"));
};
