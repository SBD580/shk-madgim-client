var app = angular.module('shk-player', ['ui.router']);
app.constant('config', {
    serverBaseURL: location.origin,
    slidingWindow: 30*60
});
app.filter('size',function(){
   return function(v){
       return _.size(v);
   };
});
app.factory('mapStyle', function (config) {
    return {
        "version": 8,
        "sources": {
            "countries": {
                "type": "vector",
                "tiles": [config.serverBaseURL + "/static/countries/{z}/{x}/{y}.pbf"],
                "maxzoom": 6
            }
        },
        "glyphs": config.serverBaseURL + "/static/font/{fontstack}/{range}.pbf",
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
});
app.service('Data', function ($http, config) {
    this.initial = function (time) {
        return $http({
            url: config.serverBaseURL + '/data/initial/' + time,
            method: 'GET',
            responseType: 'json'
        });
    };
    this.range = function (startTime, endTime, type) {
        if(!type) type = 'started';

        return $http({
            url: config.serverBaseURL + '/data/range/' + startTime + (endTime ? '/' + endTime : ''),
            params: {
                type: type
            },
            method: 'GET',
            responseType: 'json'
        });
    }
});
app.config(function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise("/");
    $stateProvider.state('main', {
        url: '/?time',
        templateUrl: 'views/main.html',
        controller: 'MainController',
        controllerAs: 'ctrl'
    });
});
app.controller('MainController', function ($scope, $timeout, $state, $stateParams, mapStyle, Data, $interval,config) {
    $scope.loading = true;
    $scope.time = parseInt($stateParams.time);
    $scope.items = {};

    this.cachedItems = {};
    this.cacheMin = $scope.time;
    this.cacheMax = $scope.time;

    var self = this;

    $(function () {
        var map = new mapboxgl.Map({
            container: 'map',
            center: [8.3221, 46.5928],
            zoom: 1,
            style: mapStyle
        });

        map.dragRotate.disable();
        map.addControl(new mapboxgl.Navigation());

        var container = map.getCanvasContainer();
        var svg = d3.select(container).append("svg");
        var path = d3.geoPath().projection(d3.geoTransform({
            point: function (x, y) {
                var p = map.project([x, y]);
                this.stream.point(p.x, p.y);
            }
        }));

        function getItemCurrentPosition(item) {
            var timeIndex = Math.min(item.path.coordinates.length - 1, _.sortedIndex(item.path.times, $scope.time));
            var point = item.path.coordinates[timeIndex];
            var angle = item.path.angles[timeIndex];
            // var angle = 0;
            // if (timeIndex < item.path.coordinates.length - 1)
            //     angle = turf.bearing(turf.point(point), turf.point(item.path.coordinates[timeIndex + 1]));
            // else if (timeIndex > 0)
            //     angle = turf.bearing(turf.point(point), turf.point(item.path.coordinates[timeIndex - 1]));

            return [point[0], point[1], angle];
        }

        function itemMapTransform(item) {
            var pos = map.project(new mapboxgl.LngLat(item.pos[0], item.pos[1]));
            return 'translate(' + pos.x + ',' + pos.y + ')';
        }

        map.on("render", function () {
            svg.selectAll("g.symbol")/*.transition().duration(0)*/.attr('transform', itemMapTransform);
            svg.selectAll("g.track path").attr('d', function (item) {
                return path(item.geojson);
            });
        });

        $scope.$watchCollection('items', function (items) {
            var gItems = svg.selectAll("g.item").data(_.values(items), _.property('id'));
            var gItem = gItems.enter().append('g').attrs({
                class: 'item',
                id: function (item) {
                    return 'item-' + item.id;
                }
            });
            // symbol.append('g').attr('class','track').append('path').attrs({
            //     'stroke-width': 1,
            //     'stroke': '#fff',
            //     'fill': 'none',
            //     'stroke-opacity': 0.5
            // }).attr('d',function(item){
            //     return path(item.geojson);
            // });
            var gSymbol = gItem.append('g').attrs({
                class: 'symbol',
                'transform': itemMapTransform
            }).on('click', function (item) {
                $scope.$apply(function () {
                    $scope.item = item;
                });
            }).append('g').attrs({
                transform: function(item){return 'scale(0.4) rotate(' + item.pos[2] + ')';}
            });
            var gSymbolInner = gSymbol.append('svg').attrs({
                preserveAspectRatio: 'xMidYMid meet',
                viewBox: '0 0 50 50',
                width: 50,
                height: 50,
                x: -25,
                y: -25
            });
            gSymbolInner.append('path').attrs({
                d: "m25.21488,3.93375c-0.44355,0 -0.84275,0.18332 -1.17933,0.51592c-0.33397,0.33267 -0.61055,0.80884 -0.84275,1.40377c-0.45922,1.18911 -0.74362,2.85964 -0.89755,4.86085c-0.15655,1.99729 -0.18263,4.32223 -0.11741,6.81118c-5.51835,2.26427 -16.7116,6.93857 -17.60916,7.98223c-1.19759,1.38937 -0.81143,2.98095 -0.32874,4.03902l18.39971,-3.74549c0.38616,4.88048 0.94192,9.7138 1.42461,13.50099c-1.80032,0.52703 -5.1609,1.56679 -5.85232,2.21255c-0.95496,0.88711 -0.95496,3.75718 -0.95496,3.75718l7.53,-0.61316c0.17743,1.23545 0.28701,1.95767 0.28701,1.95767l0.01304,0.06557l0.06002,0l0.13829,0l0.0574,0l0.01043,-0.06557c0,0 0.11218,-0.72222 0.28961,-1.95767l7.53164,0.61316c0,0 0,-2.87006 -0.95496,-3.75718c-0.69044,-0.64577 -4.05363,-1.68813 -5.85133,-2.21516c0.48009,-3.77545 1.03061,-8.58921 1.42198,-13.45404l18.18207,3.70115c0.48009,-1.05806 0.86881,-2.64965 -0.32617,-4.03902c-0.88969,-1.03062 -11.81147,-5.60054 -17.39409,-7.89352c0.06524,-2.52287 0.04175,-4.88024 -0.1148,-6.89989l0,-0.00476c-0.15655,-1.99844 -0.44094,-3.6683 -0.90277,-4.8561c-0.22699,-0.59493 -0.50356,-1.07111 -0.83754,-1.40377c-0.33658,-0.3326 -0.73578,-0.51592 -1.18194,-0.51592l0,0l-0.00001,0l0,0z",
                'stroke-width': 0,
                'fill': '#226688'
            });
            gItems.exit().remove();
        });

        function handleNewItems(items){
            items.forEach(itemTransformer);
            items = _.keyBy(items, _.property('id'));
            _.assign($scope.items,items);
            _.assign(self.cachedItems,items);
        }

        var updateItems = /*_.debounce(*/function(){
            if ($scope.time > self.cacheMax) {
                Data.range(self.cacheMax, $scope.time).then(function (res) {
                    handleNewItems(res.data.items);
                }).catch(console.error);
                self.cacheMax = $scope.time;
            } else if ($scope.time < self.cacheMin) {
                Data.range($scope.time, self.cacheMin, 'ended').then(function (res) {
                    handleNewItems(res.data.items);
                }).catch(console.error);
                self.cacheMin = $scope.time;
            }
        }/*,500)*/;

        $scope.$watch('time', function (time) {
            // _.remove($scope.items, function (item) {
            //     return item.endTime <= time || item.startTime>time;
            // });
            $scope.time = parseInt(time);

            //updateItems();

            _.keys($scope.items).filter(function(id){
                var item = $scope.items[id];
                return item.endTime <= time || item.startTime>time;
            }).forEach(function(id){
                delete $scope.items[id];
            });
            _.assign($scope.items,_.pickBy(self.cachedItems,function(item){
                return item.startTime<=$scope.time && item.endTime>$scope.time;
            }));

            _.each($scope.items,function (item) {
                item.pos = getItemCurrentPosition(item);
            });
            svg.selectAll("g.symbol")/*.transition().duration(500).ease(d3.easeLinear)*/.attr('transform', itemMapTransform).select('g')/*.transition().duration(500).ease(d3.easeLinear)*/.attr('transform',function(item){return 'scale(0.4) rotate(' + item.pos[2] + ')';});
        });
        $scope.$watch('item', function (item) {
            var gItem = svg.select('g.item.current').classed('current', false);
            gItem.selectAll('g.track, circle.selection').remove();
            if (item) {
                var gItem = svg.select('g#item-' + item.id).classed('current', true);
                gItem.insert('g',':first-child').attr('class', 'track').append('path').attrs({
                    'stroke-width': 1,
                    'stroke': '#fff',
                    'fill': 'none',
                    'stroke-opacity': 0.5
                }).attr('d', function (item) {
                    return path(item.geojson);
                });
                gItem.select('g.symbol').select('g').insert('circle',':first-child').attrs({
                    class: 'selection',
                    r: 30,
                    fill: 'none',
                    'stroke-width': 2,
                    'stroke': '#fff'
                });
            }
        });

        function itemTransformer(item) {
            item.path.times = item.path.coordinates.map(function (coord) {
                return coord[3];
            });
            item.path.angles = item.path.coordinates.map(function (coord, idx, arr){
                var angle = 0;
                if (idx < arr.length - 1)
                    angle = turf.bearing(turf.point(coord), turf.point(arr[idx + 1]));
                else if (idx > 0)
                    angle = turf.bearing(turf.point(coord), turf.point(arr[idx - 1]));
                return angle;
            });
            item.geojson = turf.lineString(item.path.coordinates);
            item.pos = getItemCurrentPosition(item);
        }

        Data.initial($stateParams.time).then(function (res) {
            handleNewItems(res.data.items);
        }).catch(function (e) {
            console.error(e)
        }).finally(function () {
            $scope.loading = false;
        });

        $("#time-slider > input").ionRangeSlider({
            min: self.cacheMin-config.slidingWindow,
            max: self.cacheMax+config.slidingWindow,
            grid: true,
            grid_num: 10,
            prettify: function (t) {
                return moment.unix(t).format("HH:mm:ss");
            },
            onFinish: function(){
                $scope.$apply(updateItems);
            }
        });
        $("#time-slider-back > input").ionRangeSlider({
            hide_min_max: true,
            hide_from_to: true,
            from_shadow: true
        });

        $scope.$watchGroup(['ctrl.cacheMin','ctrl.cacheMax'],function(){
            $("#time-slider > input").data('ionRangeSlider').update({
                min: self.cacheMin-config.slidingWindow,
                max: self.cacheMax+config.slidingWindow
            });
            $("#time-slider-back > input").data('ionRangeSlider').update({
                min: self.cacheMin-config.slidingWindow,
                max: self.cacheMax+config.slidingWindow,
                from_min: self.cacheMin,
                from_max: self.cacheMax,
                from: self.cacheMin
            });
        });
    });
});