/**
 * Created by Yarden on 7/17/2016.
 */
var isPlaying = false;
var startTime = 1468634054; // TODO - get start time from user
var endTime = 1468640447; // TODO - get end time from user 
var tickNum = 10;
// var sliderValue = startTime;
 

initPlayer();

function initPlayer() {
    setCurrentTimestamp(startTime);
    initData();
    $('#play-pause').click(function () {
        if (isPlaying === false) {
            // playback.start();
            startPlayback();
            $('#play-pause-icon').removeClass('fa-play');
            $('#play-pause-icon').addClass('fa-pause');
            isPlaying = true;
        } else {
            // playback.stop();
            stopPlayback();
            $('#play-pause-icon').removeClass('fa-pause');
            $('#play-pause-icon').addClass('fa-play');
            isPlaying = false;
        }
    });

    $('#cursor-date').html(dateStr(startTime));
    $('#cursor-time').html(timeStr(startTime));

    $('#time-slider').slider({
        min: startTime,
        max: endTime,
        step: tickNum,
        value: startTime,
        slide: function (event, ui) {
            // sliderValue = ui.value;
            setSliderMove(ui.value);
            // playback.setCursor(ui.value); TODO - make a move
            updateDateUI(ui.value);
        }
    });

    // $('#speed-slider').slider({
    //     min: -9,
    //     max: 9,
    //     step: .1,
    //     value: self._speedToSliderVal(this.playback.getSpeed()),
    //     orientation: 'vertical',
    //     slide: function (event, ui) {
    //         var speed = self._sliderValToSpeed(parseFloat(ui.value));
    //         playback.setSpeed(speed);
    //         $('.speed').html(speed).val(speed);
    //     }
    // });
   //
   // // $('#speed-input').on('keyup', function (e) {
   //  //     var speed = parseFloat($('#speed-input').val());
   //  //     if (!speed) return;
   //  //     playback.setSpeed(speed);
   //  //     $('#speed-slider').slider('value', speedToSliderVal(speed));
   //  //     $('#speed-icon-val').html(speed);
   //  //     if (e.keyCode === 13) {
   //  //         $('.speed-menu').dropdown('toggle');
   //  //     }
   //  // });
   //  //
   //  // $('#calendar').datepicker({
   //  //     changeMonth: true,
   //  //     changeYear: true,
   //  //     altField: '#date-input',
   //  //     altFormat: 'mm/dd/yy',
   //  //     defaultDate: new Date(playback.getTime()),
   //  //     onSelect: function (date) {
   //  //         var date = new Date(date);
   //  //         var time = $('#timepicker').data('timepicker');
   //  //         var ts = self._combineDateAndTime(date, time);
   //  //         playback.setCursor(ts);
   //  //         $('#time-slider').slider('value', ts);
   //  //     }
   //  // });
   //  //
   //  // $('#date-input').on('keyup', function (e) {
   //  //     $('#calendar').datepicker('setDate', $('#date-input').val());
   //  // });
   //  //
   //  // $('.dropdown-menu').on('click', function (e) {
   //  //     e.stopPropagation();
   //  // });
   //  //
   //  // $('#timepicker').timepicker({
   //  //     showSeconds: true
   //  // });
   //  //
   //  // $('#timepicker').timepicker('setTime',
   //  //     new Date(playback.getTime()).toTimeString());
   //  //
   //  // $('#timepicker').timepicker().on('changeTime.timepicker', function (e) {
   //  //     var date = $('#calendar').datepicker('getDate');
   //  //     var ts = self._combineDateAndTime(date, e.time);
   //  //     playback.setCursor(ts);
   //  //     $('#time-slider').slider('value', ts);
   //  // });
   //  //
   //  // $('#load-tracks-btn').on('click', function (e) {
   //  //     $('#load-tracks-modal').modal();
   //  // });
   //  //
   //  // $('#load-tracks-save').on('click', function (e) {
   //  //     var file = $('#load-tracks-file').get(0).files[0];
   //  //     self._loadTracksFromFile(file);
   //  // });

};


function updateDateUI(timestamp) {
    $('#cursor-date').html(dateStr(timestamp));
    $('#cursor-time').html(timeStr(timestamp));
}

function setSliderMove(timestamp) {
    var plainController = getPlainController();
    setCurrentTimestamp(timestamp)
    // sliderValue = timestamp;
    for(var currPlain in plainController) {
        var nextPos = getNextPos(timestamp, plainController[currPlain]);

        // in case there is no pos to the current time we will wit to the next time
        // TODO - calc position relativly
        if(nextPos != undefined)
            movePlain(currPlain, nextPos);
    }
}

function getNextPos(timestamp, plainTicks){
    var startPlain = Object.keys(plainTicks)[0];
    var endPlain = Object.keys(plainTicks)[Object.keys(plainTicks).length - 1];

    if (timestamp > endPlain)
        timestamp = endPlain;
    if (timestamp < startPlain)
        timestamp = startPlain;
    if(plainTicks[timestamp] == undefined)
        return plainTicks[getCloseTimestamo(timestamp,plainTicks)];
    return plainTicks[timestamp];
}


function startPlayback() {
    console.log("in start playback");
};

function stopPlayback() {
    console.log("in stop playback");
};


// TODO - make in seperate class of date utils
function dateStr(time) {
    return new Date(time*1000).toDateString();
}

function timeStr(time) {
    time = time * 1000;
    var d = new Date(time);
    var h = d.getHours();
    var m = d.getMinutes();
    var s = d.getSeconds();
    var tms = time / 1000;
    var dec = (tms - Math.floor(tms)).toFixed(2).slice(1);
    var mer = 'AM';
    if (h > 11) {
        h %= 12;
        mer = 'PM';
    }
    if (h === 0) h = 12;
    if (m < 10) m = '0' + m;
    if (s < 10) s = '0' + s;
    return h + ':' + m + ':' + s + dec + ' ' + mer;
}
