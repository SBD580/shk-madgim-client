/**
 * Created by Yarden on 7/14/2016.
 */

// (function(){
//     "use strict";
//     function formsCtrl($scope, formsService){
//         $scope.firstName = [{'userName': "Yarden Davidof"}];
//
//
//     }
//     angular.module('mainApp').controller('formsCtrl', ['$scope', 'formsService',  formsCtrl])
// })();

angular.module('mainApp', []).controller('formsCtrl', function($scope) {
    $scope.firstName = [{'userName': "Yarden Davidof"}];

    $scope.onClick = function (d) {
      $scope.currentPlain = "yyyyy";
    };
});