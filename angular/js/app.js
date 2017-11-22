var bbApp = angular.module('bbApp', ['ngRoute', 'LocalStorageModule']);
var Util = {
    neg: function(val) {
        return (val == 0) ? 1 : 0;
    },
    $: function(str) {
        return document.querySelector(str);
    }
};

var Command = function(execute, undo) {
    this.execute = execute;
    this.undo = undo;
};

var MadeCommand = function(game) {
    var execute = function() {
        var score = game.score[game.curPlayerIdx];
        this.ball = score.curBall; // save for ref in undo
        addPoints(score, this, score.curBall);
        score.curBall = (score.curBall == 3) ? 1 : score.curBall + 1;
    };
    var undo = function () {
        var score = game.score[game.curPlayerIdx];
        removePoints(score, this, this.ball);
        score.curBall = this.ball;
    };
    return new Command(execute, undo);
};

var addPoints = function (score, command, points) {
    score.curPoints += points;
    score.curRun += points;
    command.backupHighRun = score.highRun;
    if (score.curRun > score.highRun) {
        score.highRun = score.curRun;
    }
};

var removePoints = function (score, command, points) {
    score.curPoints -= points;
    score.curRun -= points;
    score.highRun = command.backupHighRun;
};

var MissedCommand = function(game) {
    var execute = function() {
        game.innings++;
        var score = game.score[game.curPlayerIdx];
        this.ball = score.curBall; // save for ref in undo
        this.playerIdx = game.curPlayerIdx;
        if (score.curBall == 3) score.curBall = 1;
        game.curPlayerIdx = Util.neg(game.curPlayerIdx);
        this.backupCurRun = score.curRun;
        score.curRun = 0;
    };
    var undo = function () {
        game.innings--;
        var score = game.score[this.playerIdx];
        score.curBall = this.ball;
        game.curPlayerIdx = this.playerIdx;
        score.curRun = this.backupCurRun;
    };
    return new Command(execute, undo);
};

var TargetCommand = function(game) {
    var execute = function() {
        var score = game.score[game.curPlayerIdx];
        addPoints(score, this, 3);
    };
    var undo = function () {
        var score = game.score[game.curPlayerIdx];
        removePoints(score, this, 3);
    };
    return new Command(execute, undo);
};

bbApp.config(function($routeProvider){
    $routeProvider.
        when('/matchSetup', {templateUrl: 'matchSetup.html', controller: 'matchSetupController'}).
        when('/game', {templateUrl: 'game.html', controller: 'gameController'}).
        when('/result', {templateUrl: 'gameResult.html', controller: 'gameResultController'}).
        when('/', {templateUrl: 'splash.html'}).
        otherwise({redirectTo: '/'});
});

bbApp.factory('Match', function(){
    var match = {};
    match.gameClock = null;
    match.numberOfGames = 3;
    match.players = [{name:'Player A', points: 30}, {name:'Player B', points: 30}];
    match.isOver = function() {
        return match.curGame.gameNo >= match.numberOfGames;
    };
    match.winner = function() {
        if (match.score[0] == match.score[1])
            return null;
        else
            return (match.score[0] > match.score[1]) ? match.players[0] : match.players[1];
    };
    match.init = function() {
        match.score = [0,0];
        match.curGame = null;
        match.prevGame = null;
    };
    match.startNextGame = function() {
        var game = {};
        game.commands = [];
        game.startTime = new Date();
        game.totalPauseTime = 0;
        game.innings = 0;
        if (match.curGame) {
            var prevGame = match.curGame;
            game.breakingPlayerIdx = Util.neg(prevGame.breakingPlayerIdx);
            game.gameNo = prevGame.gameNo + 1;
            match.prevGame = prevGame;
        } else {
            // first game
            game.breakingPlayerIdx = 0;
            game.gameNo = 1;
        }
        game.curPlayerIdx = game.breakingPlayerIdx;
        game.score = [
            {curPoints: 0, curBall: 1, curRun: 0, highRun: 0},
            {curPoints: 0, curBall: 1, curRun: 0, highRun: 0}
        ];
        game.isCurPlayerOverMax = function() {
            return (game.score[game.curPlayerIdx].curPoints >= match.players[game.curPlayerIdx].points);
        };
        game.pause = function() {
            game.pauseStarted = new Date();
        };
        game.currentPauseTime = function() {
            return (game.pauseStarted != null) ? (new Date() - game.pauseStarted) : 0;
        };
        game.resume = function() {
            game.totalPauseTime += game.currentPauseTime();
            game.pauseStarted = null;
        };
        game.remainingTime = function() {
            if (match.gameClock != null) {
                var pause = game.totalPauseTime + game.currentPauseTime();
                var elapsedTime = new Date().getTime() - game.startTime;
                return match.gameClock * 60000 - elapsedTime + pause;
            }
            return null;
        };
        game.isShootout = function() {
            return (match.gameClock != null && game.remainingTime() < 0);
        };
        match.curGame = game;
    };
    return match;
});

bbApp.directive('onLongPress', function($timeout) {
    return {
        restrict: 'A',
        link: function($scope, $elm, $attrs) {
            $elm.bind('touchstart', function(evt) {
                // Locally scoped variable that will keep track of the long press
                $scope.longPress = true;

                // We'll set a timeout for 600 ms for a long press
                $timeout(function() {
                    if ($scope.longPress) {
                        // If the touchend event hasn't fired,
                        // apply the function given in on the element's on-long-press attribute
                        $scope.$apply(function() {
                            $scope.$eval($attrs.onLongPress)
                        });
                    }
                }, 600);
            });

            $elm.bind('touchend', function(evt) {
                // Prevent the onLongPress event from firing
                $scope.longPress = false;
                // If there is an on-touch-end function attached to this element, apply it
                if ($attrs.onTouchEnd) {
                    $scope.$apply(function() {
                        $scope.$eval($attrs.onTouchEnd)
                    });
                }
            });
        }
    };
});