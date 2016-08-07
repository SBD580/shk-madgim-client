app = angular.module('shk', ['ui.router']);
app.constant('config',{
    serverBaseURL: location.origin
})
app.config(function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise("/");
    $stateProvider.state('availability', {
        url: '/',
        templateUrl: 'views/availability.html',
        controller: 'AvailabilityController'
    }).state('search', {
        url: '/search?start&end',
        templateUrl: 'views/search.html'
    });
});
app.run(function ($rootScope, $state, $stateParams) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
});
app.controller('AvailabilityController',function($scope,$timeout,config,$state) {
    $timeout(function() {
        $(function() {
            var DAILIES = 3;
            $('.ui.accordion').accordion();
            //    $('#tabs .item').tab();

            $('.title :checkbox').click(function (e) {
                e.stopPropagation();
            }).change(function () {
                $(this).parents('.title').next('.content').find(':checkbox').prop('checked', $(this).is(':checked'));
            });

            var selectedDate, monthlyAvailability, dailyAvailability;

            var dailies = [];
            for (var i = 0; i < DAILIES; i++) {
                var daily = new CalHeatMap();
                daily.init({
                    itemSelector: "#availability-daily",
                    domain: "hour",
                    subDomain: "min",
                    cellSize: 21,
                    subDomainTextFormat: "%M",
                    range: 24 / DAILIES,
                    start: new Date(),
                    rowLimit: 15,
                    domainMargin: 0,
                    domainGutter: 10,
                    legend: [20, 40, 60, 80, 100],
                    legendColors: ["#B3C073", "#636B3F"],
                    displayLegend: false,
                    label: {
                        height: 20,
                        position: 'top'
                    },
                    onClick: function (date) {
                        $scope.$apply(function(){
                           $state.go('search',{start:date.getTime()/1000,end:date.getTime()/1000+15*60});
                        });
                    }
                });
                dailies.push(daily);
            }

            var monthly = new CalHeatMap();
            monthly.init({
                itemSelector: "#availability-monthly",
                domain: "month",
                subDomain: "day",
                cellSize: 30,
                subDomainTextFormat: "%d",
                range: 4,
                start: new Date(new Date().getFullYear(), 4, 1),
                rowLimit: 6,
                domainMargin: 0,
                domainGutter: 30,
                legend: [20, 40, 60, 80, 100],
                legendColors: ["#B3C073", "#636B3F"],
                displayLegend: false,
                label: {
                    height: 30
                },
                onClick: function (date, nb) {
                    selectedDate = date;
                    monthly.highlight(date);

                    getDailyAvailability(date).then(function (availability) {
                        dailyAvailability = availability;
                        updateDailies();
                    });
                }
            });

            getMonthlyAvailability().then(function (availability) {
                monthlyAvailability = availability;
                monthly.update(updateAvailabilityBySources(monthlyAvailability), false);
            });

            $(':checkbox').change(function () {
                monthly.update(updateAvailabilityBySources(monthlyAvailability), false);
                updateDailies();
            });

            function updateDailies(date) {
                var availability = updateAvailabilityBySources(dailyAvailability);
                dailies.forEach(function (daily, i) {
                    daily.options.data = availability;
                    daily.options.start = new Date(selectedDate.getTime() + i * 24 / DAILIES * 60 * 60 * 1000);
                    daily.rewind();
                });
            }

            function updateAvailabilityBySources(availability) {
                var sources = $(':checkbox:checked').map(function () {
                    return $(this).val();
                }).toArray();

                var data = _.mapValues(_.keyBy(_.filter(availability, function (r) {
                    return _.intersection(_.keys(r.stats), sources).length;
                }), _.property('time')), function (r) {
                    return _.reduce(r.stats, function (r, x, src) {
                        if(sources.length==1) return r + (sources[0]==src?x.count: 0);
                        else return sources.indexOf(src)>=0?Math.max(r,x.count):r;
                    }, 0);
                });

                return data;
            }

            function getMonthlyAvailability() {
                return $.ajax(config.serverBaseURL + '/availability/1-day_IDT');
            }

            function getDailyAvailability(date) {
                return $.ajax(config.serverBaseURL + '/availability/15-minute_IDT/' + parseInt(date.getTime() / 1000) + '/' + (parseInt(date.getTime() / 1000) + 24 * 60 * 60 - 1));
            }
        });
    },0);
});
app.controller('SearchController', function ($scope, $timeout, $http, config, $stateParams) {
    var ctrl = this;

    var STATIC_FILE_BASE_URL = config.serverBaseURL + '/static';

    this.startDate = $stateParams.start?$stateParams.start:null;
    this.endDate = $stateParams.end?$stateParams.end:null;

    $timeout(function () {
        $('#startDate').calendar({
            type: 'date',
            endCalendar: $('#enddate'),
            parser: {
                date: function(text){
                    return moment.unix(text).toDate();
                }
            },
            formatter: {
                date: function(date){
                    return moment(date).format('DD/MM/Y HH:mm:ss');
                }
            }
        });
        $('#endDate').calendar({
            type: 'date',
            startCalendar: $('#startDate'),
            parser: {
                date: function(text){
                    return moment.unix(text).toDate();
                }
            },
            formatter: {
                date: function(date){
                    return moment(date).format('DD/MM/Y HH:mm:ss');
                }
            }
        });

        var map = new mapboxgl.Map({
            container: 'search-map',
            center: [8.3221, 46.5928],
            zoom: 1,
            style: {
                "version": 8,
                "sources": {
                    "countries": {
                        "type": "vector",
                        "tiles": [STATIC_FILE_BASE_URL + "/countries/{z}/{x}/{y}.pbf"],
                        "maxzoom": 6
                    },
                    'item': {
                        type: 'geojson',
                        data: turf.lineString([[]])
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
                    "id": "country",
                    "type": "fill",
                    "source": "countries",
                    "source-layer": "country",
                    "paint": {
                        "fill-color": "#000"
                    }
                }, {
                    "id": "country-fill",
                    "type": "fill",
                    "source": "countries",
                    "source-layer": "country",
                    "paint": {
                        "fill-color": "#fff",
                        "fill-opacity": 0.5
                    },
                    "filter": ["==", "NAME", ""]
                }, {
                    "id": "country-lines",
                    "type": "line",
                    "source": "countries",
                    "source-layer": "country",
                    "layout": {
                        "line-join": "round"
                    },
                    "paint": {
                        "line-color": "#fff",
                        "line-width": 1,
                        "line-opacity": 0.5
                    }
                }, {
                    'id': 'item',
                    'type': 'line',
                    'source': 'item',
                    'paint': {
                        "line-color": "red",
                        "line-width": 1
                    }
                }]
            }
        });

        map.dragRotate.disable();
        map.on("mousemove", function (e) {
            var features = map.queryRenderedFeatures(e.point, {layers: ["country"]});
            if (features.length) {
                map.setFilter("country-fill", ['any', ["==", "NAME", ctrl.polygon ? ctrl.polygon.properties.NAME : ''], ["==", "NAME", features[0].properties.NAME]]);
            } else {
                map.setFilter("country-fill", ["==", "NAME", ctrl.polygon ? ctrl.polygon.properties.NAME : '']);
            }
        });
        map.on('click', function (e) {
            var features = map.queryRenderedFeatures(e.point, {layers: ["country"]});
            if (features.length) {
                if(ctrl.polygon && ctrl.polygon.id==features[0].id){
                    $scope.$apply(function () {
                        ctrl.polygon = null;
                    });
                    map.setFilter("country-fill", ["==", "NAME", '']);
                }else {
                    $scope.$apply(function () {
                        ctrl.polygon = features[0];
                    });
                    map.setFilter("country-fill", ["==", "NAME", features[0].properties.NAME]);
                }
            }
        });
        map.on("mouseout", function () {
            map.setFilter("country-fill", ["==", "NAME", ctrl.polygon ? ctrl.polygon.properties.NAME : '']);
        });

        $scope.$watch('ctrl.result', function () {
            var itemSource = map.getSource('item');
            if (itemSource)
                itemSource.setData(turf.lineString(ctrl.result ? ctrl.result.path.coordinates : [[]]));
        });
    }, 0);

    this.search = function(){
        $scope.loading = true;
        $scope.error = null;
        ctrl.result = null;

        $http({
            url: config.serverBaseURL + '/search',
            method: 'POST',
            data: {
                shape: ctrl.polygon?ctrl.polygon.geometry:null,
                start: ctrl.startDate,
                end: ctrl.endDate
            },
            responseType: 'json'
        }).then(function (res) {
            res.data.results.forEach(function (result) {
                result.startTime = moment.unix(result.startTime);
                result.endTime = moment.unix(result.endTime);
            });
            $scope.results = res.data.results;
            $scope.total = res.data.total;
        }).catch(function (err) {
            $scope.error = err;
            $scope.results = null;
            $scope.tatal = 0;
        }).finally(function () {
            $scope.loading = false;
        });
    };

    $scope.$watch('ctrl.polygon', function () {
        ctrl.search();
    });
});