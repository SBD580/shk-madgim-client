var plainSelected = false;
var SELECTED_PLAIN_COLOR = 'red';
var PLAIN_COLOR = '#226688';
var selectedPlainId;
var STATIC_FILE_BASE_URL = location.origin + location.pathname + 'static';
//    var STATIC_FILE_BASE_URL = "23.251.132.20" + location.pathname + 'static';
var NUM_OF_ITEMS = 10;
var SPEED_FACTOR = 100;

var style = {
    "version": 8,
    "sources": {
        "countries": {
            "type": "vector",
            "tiles": [STATIC_FILE_BASE_URL + "/countries/{z}/{x}/{y}.pbf"],
            "maxzoom": 6
        }
    },
    "glyphs": STATIC_FILE_BASE_URL + "/font/{fontstack}/{range}.pbf",
    "layers": [{
        "id": "background",
        "type": "background",
        "paint": {
            "background-color": "#00001E"
        }
    }, {
        "id": "country-glow-outer",
        "type": "line",
        "source": "countries",
        "source-layer": "country",
        "layout": {
            "line-join": "round"
        },
        "paint": {
            "line-color": "#226688",
            "line-width": 5,
            "line-opacity": {
                "stops": [[0, 0], [1, 0.1]]
            }
        }
    }, {
        "id": "country-glow-inner",
        "type": "line",
        "source": "countries",
        "source-layer": "country",
        "layout": {
            "line-join": "round"
        },
        "paint": {
            "line-color": "#226688",
            "line-width": {
                "stops": [[0, 1.2], [1, 1.6], [2, 2], [3, 2.4]]
            },
            "line-opacity": 0.8,
        }
    }, {
        "id": "country",
        "type": "fill",
        "source": "countries",
        "source-layer": "country",
        "paint": {
            "fill-color": "#000"
        }
    }, {
        "id": "land-border-country",
        "type": "line",
        "source": "countries",
        "source-layer": "land-border-country",
        "paint": {
            "line-color": "#fff",
            "line-opacity": 0.5,
            "line-width": {
                "base": 1.5,
                "stops": [[0, 0], [1, 0.8], [2, 1]]
            }
        }
    }]
};

var map = new mapboxgl.Map({
    container: 'map',
    center: [8.3221, 46.5928],
    zoom: 1,
    style: style
});

// disable map rotation using right click + drag
map.dragRotate.disable();

// disable map rotation using touch rotation gesture
//    map.touchZoomRotate.disableRotation();

map.addControl(new mapboxgl.Navigation());
var container = map.getCanvasContainer();
var svg = d3.select(container).append("svg")
// var transform = d3.geo.transform({point: projectPoint});
// var path = d3.geo.path().projection(transform);
var plainGroup;
var plainsJSON;
var plainController = [];
var currentTimestamp;
var interval;
var isPlaying = false;
var minSliderValue = 1469880212; // TODO - get start time from user
var maxSliderValue = 1469886294; // TODO - get end time from user
var stepSize = 10; // the step lenght of the player
var SPEED = 100;
var currentSpeed; // current speen value
var speedStepsSize; // time spep by current speed
// var sliderValue = minSliderValue;

var width = 970,
    height = 500,
    brushHeight = 60;

var minValue, maxValue, currentValue, targetValue, trailLength = 30, alpha = .25;

var dots = [];
var formatMinute = d3.format("+.0f");

initPlayer();

function initPlayer() {
    setCurrentTimestamp(minSliderValue);
    initData();
    $('#play-pause').click(function () {
        if (isPlaying === false) {
            startPlayback();
        } else {
            stopPlayback();
        }
    });

    $('#cursor-date').html(dateStr(minSliderValue));
    $('#cursor-time').html(timeStr(minSliderValue));

    $('#time-slider').slider({
        min: minSliderValue,
        max: maxSliderValue,
        step: stepSize,
        value: minSliderValue,
        slide: function (event, ui) {
            setSliderMove(ui.value);
            updateDateUI(ui.value);
        },
        stop: function (event, ui) {
            console.log('slider released');
            updateData();
        }
    });

    $('#speed-slider').slider({
        min: -9,
        max: 9,
        step: .1,
        value: speedToSliderVal(getSpeed()),
        orientation: 'vertical',
        slide: function (event, ui) {
            var speed = sliderToSpeedVal(parseFloat(ui.value));
            setSpeed(speed);
            $('.speed').html(speed).val(speed);
        }
    });

    $('#speed-input').on('keyup', function (e) {
        var speed = parseFloat($('#speed-input').val());
        if (!speed) return;
        setSpeed(speed);
        $('#speed-slider').slider('value', speedToSliderVal(speed));
        $('#speed-icon-val').html(speed);
        if (e.keyCode === 13) {
            $('.speed-menu').dropdown('toggle');
        }
    });

    $('#calendar').datepicker({
        changeMonth: true,
        changeYear: true,
        altField: '#date-input',
        altFormat: 'mm/dd/yy',
        defaultDate: new Date(currentTimestamp),
        onSelect: function (date) {
            var date = new Date(date);
            var time = $('#timepicker').data('timepicker');
            var ts = combineDateAndTime(date, time);
            setSliderMove(ts);
            $('#time-slider').slider('value', ts);
        }
    });

    $('#date-input').on('keyup', function (e) {
        $('#calendar').datepicker('setDate', $('#date-input').val());
    });

    $('.dropdown-menu').on('click', function (e) {
        e.stopPropagation();
    });

    // $('#timepicker').timepicker({
    //     showSeconds: true
    // });
    //
    // $('#timepicker').timepicker('setTime',
    //     new Date(currentTimestamp).toTimeString());
    //
    // $('#timepicker').timepicker().on('changeTime.timepicker', function (e) {
    //     var date = $('#calendar').datepicker('getDate');
    //     var ts = combineDateAndTime(date, e.time);
    //     setSliderMove(ts);
    //     $('#time-slider').slider('value', ts);
    // });
    //
    // $('#load-tracks-btn').on('click', function (e) {
    //     $('#load-tracks-modal').modal();
    // });
    //
    // $('#load-tracks-save').on('click', function (e) {
    //     var file = $('#load-tracks-file').get(0).files[0];
    //     self._loadTracksFromFile(file);
    // });

};

function setSpeed(speed) {
    currentSpeed = speed;
    speedStepsSize = stepSize / speed;
    if (interval) {
        // TODO - is needed ?
        stopPlayback();
        startPlayback();
    }
}

function getSpeed(speed) {
    return currentSpeed;
}

function sliderToSpeedVal(value) {
    if (val < 0) return parseFloat((1 + val / 10).toFixed(2));
    return val + 1;
}

function speedToSliderVal(speed) {
    if (speed < 1) return -10 + speed * 10;
    return speed - 1;
}

function updateDateUI(timestamp) {
    $('#cursor-date').html(dateStr(timestamp));
    $('#cursor-time').html(timeStr(timestamp));
}

function setSliderMove(timestamp) {
    //var plainController = getPlainController();
    setCurrentTimestamp(timestamp)
    updateProjection();
}

function getNextPos(timestamp, plainTicks) {
    var startPlain = Object.keys(plainTicks)[0];
    var endPlain = Object.keys(plainTicks)[Object.keys(plainTicks).length - 1];

    if (timestamp > endPlain)
        timestamp = endPlain;
    if (timestamp < startPlain)
        timestamp = startPlain;
    if (plainTicks[timestamp] == undefined)
        return plainTicks[getCloseTimestamo(timestamp, plainTicks)];
    return plainTicks[timestamp];
}

function intervalMove() {
    if (currentTimestamp + SPEED < maxSliderValue) {
        setCurrentTimestamp(currentTimestamp + SPEED);
    }
    else {
        setCurrentTimestamp(maxSliderValue)
        stopPlayback();
    }
    updateDateUI(currentTimestamp);
    $('#time-slider').slider("option", "value", currentTimestamp);
    updateProjection();
}

function startPlayback() {
    console.log("in start playback");
    $('#play-pause-icon').removeClass('fa-play');
    $('#play-pause-icon').addClass('fa-pause');
    isPlaying = true;
    if (interval) return;
    interval = window.setInterval(intervalMove, 250);
};

function stopPlayback() {
    console.log("in stop playback");
    $('#play-pause-icon').removeClass('fa-pause');
    $('#play-pause-icon').addClass('fa-play');
    isPlaying = false;
    if (!interval) return;
    clearInterval(interval);
    interval = null;
};


// TODO - make in seperate class of date utils
function dateStr(time) {
    return new Date(time * 1000).toDateString();
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


function combineDateAndTime(date, time) {
    var yr = date.getFullYear();
    var mo = date.getMonth();
    var dy = date.getDate();
    // the calendar uses hour and the timepicker uses hours...
    var hr = time.hours || time.hour;
    if (time.meridian === 'PM' && hr !== 12) hr += 12;
    var min = time.minutes || time.minute;
    var sec = time.seconds || time.second;
    return new Date(yr, mo, dy, hr, min, sec).getTime();
}

function setCurrentTimestamp(time) {
    currentTimestamp = time;
}


function initlize() {
    updateD3();
    updateProjection();
}


function updateD3() {
    plainGroup = svg.selectAll(".g-plainGroup").data(plainsJSON.items);

    plainGroup.enter().append("g")
        .attr("class", function (plainItem) {
            // var ticks = [];
            // plainItem.path.coordinates.forEach(function (coordinateItem, j) {
            //     // map between the timestamp to its coordinates TODO - add spped and angle
            //     ticks[coordinateItem[3]] = [coordinateItem[0], coordinateItem[1]];
            // });
            // // TODO - need that d3 be synced with plainController - right now plain controller not remove the old plains
            // plainController[plainItem.id] = ticks;
            return "g-plainGroup g-pcmlain-" + plainItem.id;
        }).on("click", onClick)

    plainGroup.append("path").attr({
        d: "m25.21488,3.93375c-0.44355,0 -0.84275,0.18332 -1.17933,0.51592c-0.33397,0.33267 -0.61055,0.80884 -0.84275,1.40377c-0.45922,1.18911 -0.74362,2.85964 -0.89755,4.86085c-0.15655,1.99729 -0.18263,4.32223 -0.11741,6.81118c-5.51835,2.26427 -16.7116,6.93857 -17.60916,7.98223c-1.19759,1.38937 -0.81143,2.98095 -0.32874,4.03902l18.39971,-3.74549c0.38616,4.88048 0.94192,9.7138 1.42461,13.50099c-1.80032,0.52703 -5.1609,1.56679 -5.85232,2.21255c-0.95496,0.88711 -0.95496,3.75718 -0.95496,3.75718l7.53,-0.61316c0.17743,1.23545 0.28701,1.95767 0.28701,1.95767l0.01304,0.06557l0.06002,0l0.13829,0l0.0574,0l0.01043,-0.06557c0,0 0.11218,-0.72222 0.28961,-1.95767l7.53164,0.61316c0,0 0,-2.87006 -0.95496,-3.75718c-0.69044,-0.64577 -4.05363,-1.68813 -5.85133,-2.21516c0.48009,-3.77545 1.03061,-8.58921 1.42198,-13.45404l18.18207,3.70115c0.48009,-1.05806 0.86881,-2.64965 -0.32617,-4.03902c-0.88969,-1.03062 -11.81147,-5.60054 -17.39409,-7.89352c0.06524,-2.52287 0.04175,-4.88024 -0.1148,-6.89989l0,-0.00476c-0.15655,-1.99844 -0.44094,-3.6683 -0.90277,-4.8561c-0.22699,-0.59493 -0.50356,-1.07111 -0.83754,-1.40377c-0.33658,-0.3326 -0.73578,-0.51592 -1.18194,-0.51592l0,0l-0.00001,0l0,0z",
        'stroke-width': 0
    }).attr('fill', PLAIN_COLOR).attr("transform", "scale(0.4)");

    plainGroup.exit().remove();
}

function onClick(d) {
    console.log("on click" + d.id);
    selectPlain(d.id);
}

map.on('click', function (e) {

    // if plainGroup not selected remove the color
    if (plainSelected == false)
        svg.select(".g-plainGroup-" + selectedPlainId).selectAll("path").attr("fill", PLAIN_COLOR);
    plainSelected = false;
});

function selectPlain(id) {
    svg.select(".g-plainGroup-" + selectedPlainId).selectAll("path").attr("fill", PLAIN_COLOR);
    selectedPlainId = id;
    svg.select(".g-plainGroup-" + id).selectAll("path").attr("fill", SELECTED_PLAIN_COLOR);
    $('#flightId').after("<li>" + id + "</li>");
    plainSelected = true;
}
;

// TODO - need to be in service
function initData() {
    $.getJSON("data/initial/" + currentTimestamp, function (result) {
        plainsJSON = result;
        initTicks();
        initlize();
    });
}

function updateData() {
    $.getJSON("data/initial/" + currentTimestamp, function (result) {
        plainsJSON = result;
        initTicks();
        updateD3();
        updateProjection();
        // updateD3();
    });
}

function getPlainController() {
    return plainController;
}

function initTicks() {

    plainController = [];
    plainsJSON.items.forEach(function (plainItem, i) {

        var ticks = [];
        plainItem.path.coordinates.forEach(function (coordinateItem, j) {
            // map between the timestamp to its coordinates TODO - add spped and angle
            ticks[coordinateItem[3]] = [coordinateItem[0], coordinateItem[1]];
        });
        plainController[plainItem.id] = ticks;
    });
};


map.on("load", function () {
    //
    // document.getElementById('slider').addEventListener('input', function (e) {
    //     sliderIndex = parseInt(e.target.value, 10);
    //     sliderChanged(sliderIndex)
    // });
});

map.on("render", function () {
    updateProjection();
});


function updateProjection() {

    if (typeof plainGroup != 'undefined') {
        plainGroup.attr("transform", function (d) {
            // in case the plainGroup path is over
            if (d.endTime < currentTimestamp) {
                //         // TODO - hide plainGroup from map or remove
                //         svg.select(".g-plainGroup-" + d.id).remove();
                //         console.log("remove path plainGroup " + d.id);
                return;
            }

            if (svg.select(".g-plainGroup-" + d.id)[0] == null) {
                console.log("create plainGroup d3 " + d.id);
                plainGroup.append("path").attr({
                    d: "m25.21488,3.93375c-0.44355,0 -0.84275,0.18332 -1.17933,0.51592c-0.33397,0.33267 -0.61055,0.80884 -0.84275,1.40377c-0.45922,1.18911 -0.74362,2.85964 -0.89755,4.86085c-0.15655,1.99729 -0.18263,4.32223 -0.11741,6.81118c-5.51835,2.26427 -16.7116,6.93857 -17.60916,7.98223c-1.19759,1.38937 -0.81143,2.98095 -0.32874,4.03902l18.39971,-3.74549c0.38616,4.88048 0.94192,9.7138 1.42461,13.50099c-1.80032,0.52703 -5.1609,1.56679 -5.85232,2.21255c-0.95496,0.88711 -0.95496,3.75718 -0.95496,3.75718l7.53,-0.61316c0.17743,1.23545 0.28701,1.95767 0.28701,1.95767l0.01304,0.06557l0.06002,0l0.13829,0l0.0574,0l0.01043,-0.06557c0,0 0.11218,-0.72222 0.28961,-1.95767l7.53164,0.61316c0,0 0,-2.87006 -0.95496,-3.75718c-0.69044,-0.64577 -4.05363,-1.68813 -5.85133,-2.21516c0.48009,-3.77545 1.03061,-8.58921 1.42198,-13.45404l18.18207,3.70115c0.48009,-1.05806 0.86881,-2.64965 -0.32617,-4.03902c-0.88969,-1.03062 -11.81147,-5.60054 -17.39409,-7.89352c0.06524,-2.52287 0.04175,-4.88024 -0.1148,-6.89989l0,-0.00476c-0.15655,-1.99844 -0.44094,-3.6683 -0.90277,-4.8561c-0.22699,-0.59493 -0.50356,-1.07111 -0.83754,-1.40377c-0.33658,-0.3326 -0.73578,-0.51592 -1.18194,-0.51592l0,0l-0.00001,0l0,0z",
                    'stroke-width': 0
                }).attr('fill', PLAIN_COLOR).attr("transform", "scale(0.4)");
            }

//
//             if(plainController[d.id] == undefined){
//                 console.log("plainController is null " + d.id);
// return;}
//             else {
            var loc = plainController[d.id][currentTimestamp];

            // var loc = [d.path.coordinates[sliderIndex][0], d.path.coordinates[sliderIndex][1]];
            if (loc == undefined)
                loc = plainController[d.id][getCloseTimestamo(currentTimestamp, plainController[d.id])];
            // pos = map.project(loc);
            var pos = mapboxProjection(loc);
            // }
            return "translate(" + pos[0] + "," + pos[1] + ")";
        });
    }
};

// we can project a lonlat coordinate pair using mapbox's built in projection function
function mapboxProjection(lonlat) {
    var p = map.project(new mapboxgl.LngLat(lonlat[0], lonlat[1]))
    return [p.x, p.y];
}


function movePlain(id, newLoc) {
    pos = mapboxProjection(newLoc);
    svg.select(".g-plainGroup-" + id).selectAll("path")
        .attr("transform", "translate(" + pos[0] + "," + pos[1] + ") scale(0.4)");
}


// function update(rand) {
//     for (var i = 0; i < dots.length; i++) {
//         var loc = dots[i].loc;
//
//         if (rand) {
//             var now = Date.now();
//
//             dots[i].loc = loc = turf.destination(turf.point(loc), dots[i].speed * SPEED_FACTOR * (now - dots[i].lastUpdate) / 1000 / 1000, dots[i].angle, 'kilometers').geometry.coordinates;
//             if (loc[0] >= 180 || loc[0] <= -180 || loc[1] >= 90 || loc[1] <= -90) {
//                 dots[i].loc = [-180 + Math.random() * 360, -90 + Math.random() * 180];
//                 dots[i].angle = -180 + Math.random() * 360;
//                 dots[i].speed = 400 + Math.random() * 300;
//             }
//
//             dots[i].lastUpdate = now;
//         }
//
//         var pos = map.project(loc);
//
//         dots[i].dot.attr("transform", "translate(" + pos.x + ',' + pos.y + ") scale(0.3) rotate(" + dots[i].angle + ")");
//     }
// }


//requestAnimationFrame(function(){
//	update(true);
//	requestAnimationFrame(arguments.callee);
//});
//
// function projectPoint(lon, lat) {
//     // TODO - change to mapbox projection
//     var point = projection([lon, lat]);
//     this.stream.point(point.x, point.y);
// }


function getCloseTimestamo(timestamp, plainTicks) {
    // for (first in obj) break;
    var curr = Object.keys(plainTicks)[0];
    for (currTime in plainTicks) {
        if (Math.abs(timestamp - currTime) < Math.abs(timestamp - curr))
            curr = currTime;
    }
    return curr;
}