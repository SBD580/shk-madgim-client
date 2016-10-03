app = angular.module('shk', ['ui.router']);
app.constant('config', {
    serverBaseURL: location.origin
})
app.config(function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise("/");
    $stateProvider.state('main', {
        abstract: true,
        templateUrl: 'views/main.html',
        controller: 'MainController',
        controllerAs: 'mctrl',
        params: {
            sources: ''
        }
    }).state('availability', {
        parent: 'main',
        url: '/?sources',
        templateUrl: 'views/availability.html',
        controller: 'AvailabilityController',
        controllerAs: 'ctrl'
    }).state('search', {
        parent: 'main',
        url: '/search?sources&start&end&types',
        templateUrl: 'views/search.html',
        controller: 'SearchController',
        controllerAs: 'ctrl'
    });
});
app.run(function ($rootScope, $state, $stateParams) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
});
app.controller('MainController', function ($scope, $timeout, $state, $stateParams) {
    $scope.sources = [{
        name: 'Group A',
        items: [{
            id: 'RS1', name: 'RS1'
        }, {
            id: 'RS2', name: 'RS2'
        }]
    }, {
        name: 'Group B',
        items: [{
            id: 'RS3', name: 'RS3'
        }, {
            id: 'RS4', name: 'RS4'
        }, {
            id: 'RS5', name: 'RS5'
        }]
    }, {
        name: 'Group C',
        items: [{
            id: 'RS6', name: 'RS6'
        }]
    }];
    var sourcesParam = $state.params.sources;
    if (sourcesParam) {
        sourcesParam = sourcesParam.split(',');
    }
    $scope.sources.forEach(function (group) {
        group.selected = false;
        group.items.forEach(function (item) {
            item.selected = sourcesParam ? sourcesParam.indexOf(item.id) >= 0 : item.selected !== false;
            group.selected = group.selected || item.selected;
        });
    });
    this.getFilteredSources = function () {
        var sources = this.getSources();
        return _.some(sources, {selected: false}) ? _.filter(sources, {selected: true}) : [];
    };
    this.getSources = function () {
        return _.flatten($scope.sources.map(_.property('items')));
    };
    this.updateByGroup = function (group) {
        group.items.forEach(function (item) {
            item.selected = group.selected;
        });
    };
    this.updateGroupSelection = function (group) {
        group.selected = _.some(group.items, _.property('selected'));
    };
    $timeout(function () {
        $('#sources .ui.accordion').accordion({
            exclusive: false
        });
        $('#sources .title :checkbox').click(function (e) {
            e.stopPropagation();
        });
    });

    var self = this;
    $scope.$watch('sources', function () {
        $state.transitionTo($state.current.name, {
            sources: self.getFilteredSources().map(_.property('id')).join(',')
        }, {notify: false, inherit:true});
    }, true);
});
app.controller('AvailabilityController', function ($scope, $timeout, config, $state) {
    $timeout(function () {
        var DAILIES = 3;

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
                    $scope.$apply(function () {
                        $state.go('search', {start: date.getTime() / 1000, end: date.getTime() / 1000 + 15 * 60});
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
            start: new Date(new Date().getFullYear(), 6, 1),
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

        function updateMonthly() {
            monthly.update(updateAvailabilityBySources(monthlyAvailability), false);
        };

        function updateDailies() {
            if (!selectedDate) return;

            var availability = updateAvailabilityBySources(dailyAvailability);
            dailies.forEach(function (daily, i) {
                daily.options.data = availability;
                daily.options.start = new Date(selectedDate.getTime() + i * 24 / DAILIES * 60 * 60 * 1000);
                daily.rewind();
            });
        }

        function updateAvailabilityBySources(availability) {
            var sources = $scope.mctrl.getSources().filter(_.matches({selected: true})).map(_.property('id'));

            var data = _.mapValues(_.keyBy(_.filter(availability, function (r) {
                return _.intersection(_.keys(r.stats), sources).length;
            }), _.property('time')), function (r) {
                return _.reduce(r.stats, function (r, x, src) {
                    if (sources.length == 1) return r + (sources[0] == src ? x.count : 0);
                    else return sources.indexOf(src) >= 0 ? Math.max(r, x.count) : r;
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

        $scope.$watch('sources', function () {
            $timeout(function () {
                updateMonthly();
                updateDailies();
            }, 0);
        }, true);
    }, 0);
});
app.controller('SearchController', function ($scope, $timeout, $http, config, $stateParams, $state) {
    var ctrl = this;

    var STATIC_FILE_BASE_URL = config.serverBaseURL + '/static';

    this.startDate = $stateParams.start ? $stateParams.start : null;
    this.endDate = $stateParams.end ? $stateParams.end : null;
    this.types = $stateParams.types ? $stateParams.types.split(',') : null;

    $timeout(function () {
        $('#search-types .ui.dropdown').dropdown();
        $('#startDate').calendar({
            endCalendar: $('#enddate'),
            parser: {
                date: function (text) {
                    return moment.unix(text).toDate();
                }
            },
            formatter: {
                date: function (date) {
                    return moment(date).format('DD/MM/Y');
                },
                time: function (date) {
                    return moment(date).format('HH:mm');
                }
            },
            onChange: function (date) {
                $timeout(function () {
                    ctrl.startDate = moment(date).unix();
                }, 0);
            }
        });
        $('#endDate').calendar({
            startCalendar: $('#startDate'),
            parser: {
                date: function (text) {
                    return moment.unix(text).toDate();
                }
            },
            formatter: {
                date: function (date) {
                    return moment(date).format('DD/MM/Y');
                },
                time: function (date) {
                    return moment(date).format('HH:mm');
                }
            },
            onChange: function (date) {
                $timeout(function () {
                    ctrl.endDate = moment(date).unix();
                }, 0);
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
                    'selected': {
                        type: 'geojson',
                        data: turf.lineString([[]])
                    },
                    'preview': {
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
                    'id': 'selected',
                    'type': 'line',
                    'source': 'selected',
                    'paint': {
                        "line-color": "red",
                        "line-width": 1
                    }
                }, {
                    'id': 'preview',
                    'type': 'line',
                    'source': 'preview',
                    'paint': {
                        "line-color": "red",
                        "line-width": 1,
                        "line-opacity": 0.5
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
                if (ctrl.polygon && ctrl.polygon.id == features[0].id) {
                    $scope.$apply(function () {
                        ctrl.polygon = null;
                    });
                    map.setFilter("country-fill", ["==", "NAME", '']);
                } else {
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
            $timeout(function () {
                var source = map.getSource('selected');
                if (source) {
                    var polyline = turf.lineString(ctrl.result ? ctrl.result.path.coordinates : [[]]);
                    source.setData(polyline);
                    if (ctrl.result) {
                        map.fitBounds(turf.bbox(polyline), {padding: 40, maxZoom: 5});
                    }
                }
            }, 0);
        });
        $scope.$watch('previewResult', function () {
            $timeout(function () {
                var source = map.getSource('preview');
                if (source) {
                    var polyline = turf.lineString($scope.previewResult ? $scope.previewResult.path.coordinates : [[]]);
                    source.setData(polyline);
                }
            }, 0);
        });
        $scope.$watch('results', function () {
            $timeout(function () {
                map.resize();
            }, 0);
        });
    }, 0);

    this.search = function () {
        $scope.loading = true;
        $scope.error = null;
        ctrl.result = null;

        $http({
            url: config.serverBaseURL + '/search',
            method: 'POST',
            data: {
                shape: ctrl.polygon ? ctrl.polygon.geometry : null,
                start: ctrl.startDate,
                end: ctrl.endDate,
                sources: $scope.mctrl.getFilteredSources().map(_.property('id')),
                types: ctrl.types
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

    $scope.$watchGroup(['ctrl.polygon'], function () {
        ctrl.search();
    });
    $scope.$watch('sources', function () {
        ctrl.search();
    }, true);

    $scope.$watchGroup(['ctrl.startDate', 'ctrl.endDate', 'ctrl.types'], function () {
        ctrl.search();

        $state.transitionTo($state.current.name, {
            start: ctrl.startDate,
            end: ctrl.endDate,
            types: ctrl.types && ctrl.types.length ? ctrl.types.join(',') : null
        }, {notify: false, inherit:true});
    });
});