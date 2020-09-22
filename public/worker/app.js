/* https://github.com/addpipe/simple-web-audio-recorder-demo/blob/master/js/app.js */

URL = window.URL || window.webkitURL;

let gumStream; 						//stream from getUserMedia()
let recorder; 						//WebAudioRecorder object
let input; 							//MediaStreamAudioSourceNode  we'll be recording

// shim for AudioContext when it's not avb. 
let AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext; //new audio context to help us record


function _startRecording(successCallback, failCallback, onCompleteCallback) {
	navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device
		*/
		audioContext = new AudioContext();

		//assign to gumStream for later use
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);
		
		//stop the input from playing back through the speakers
		//input.connect(audioContext.destination)


		recorder = new WebAudioRecorder(input, {
		  workerDir: "worker/", // must end with slash
		  encoding: "mp3",
		  onEncoderLoading: function(recorder, encoding) {
            console.log("encoder loading..."); ///////
		  },
		  onEncoderLoaded: function(recorder, encoding) {
            console.log("encoder loaded."); ///////
		  }
		});

		recorder.onComplete = function(recorder, blob) { 
			onCompleteCallback(blob);
		}

		recorder.setOptions({
		  encodeAfterRecord: true,
	      mp3: {bitRate: 160}
	    });

		successCallback(); // set up to record

		//start the recording process
		recorder.startRecording();

	}).catch(function(err) {
		//getUserMedia() fails
		console.log(err);
		failCallback();
	});

	
}

function _finishRecording() {
	//stop microphone access
	gumStream.getAudioTracks()[0].stop();
	//tell the recorder to finish the recording (stop recording + encode the recorded audio)
	recorder.finishRecording();
}

function _cancelRecording() {
	//stop microphone access
	gumStream.getAudioTracks()[0].stop();
	//tell the recorder to cancel the recording (cancel recording)
	recorder.cancelRecording();
}