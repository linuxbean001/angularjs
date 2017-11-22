bbApp.controller('matchSetupController', function ($scope, Match, $location, localStorageService) {
    var lastMatchSetup = localStorageService.get('LastMatchSetup');
    if (lastMatchSetup != null) {
        Match.players = lastMatchSetup.players;
        Match.numberOfGames = lastMatchSetup.numberOfGames;
        Match.gameClock = lastMatchSetup.gameClock;
    }
    $scope.players = Match.players;
    $scope.match = Match;
    var validate = function() {
        var p = Match.players;
        var valid = true;
        if (p[0].name.length <= 0 || p[1].name.length <= 0) {
            valid = false;
        }
        if (Match.numberOfGames <= 0) {
            valid = false;
        }
        if (!(p[0].points > 0 && p[1].points > 0)) {
            valid = false;
        }
        return valid;
    };
    $scope.swapPlayers = function() {
        var p = Match.players[0];
        Match.players[0] = Match.players[1];
        Match.players[1] = p;
    };
    $scope.startMatch = function() {
        if (!validate()) {
            alert("The information you entered is invalid");
            return;
        }
        localStorageService.add('LastMatchSetup', {players: Match.players, numberOfGames: Match.numberOfGames, gameClock: Match.gameClock});
        Match.init();
        Match.startNextGame();
        $location.path("/game");
    };
});

bbApp.controller('gameController', function ($scope, Match, $location, $filter, $interval) {
    if (!Match.curGame) {
        $location.path("/");
    }
    $scope.game = Match.curGame;
    $scope.match = Match;
    $scope.promptEndingMatch = function() {
        if (confirm("End this match?")) {
            window.location.reload();
        }
    };
    $scope.getActivePlayer = function() {
        return $scope.match.players[$scope.game.curPlayerIdx];
    };
    $scope.getInactivePlayer = function() {
        return $scope.match.players[Util.neg($scope.game.curPlayerIdx)];
    };
    $scope.getActivePlayerScoreClass = function() {
        var curBall = $scope.game.score[$scope.game.curPlayerIdx].curBall;
       // $scope.getActivePlayerdemo();
        $scope.getActivePlayer_background();
        $scope.getPlayer1Points();
        $scope.getPlayer2Points();
        return 'playerScoreBall-' + curBall + ' playerScoreActive';

    };
    

    $scope.getActivePlayerdemo = function() {
        var curBall = $scope.game.score[$scope.game.curPlayerIdx].curBall;
       return 'shootimg-' + curBall;
    };
    $scope.getActivePlayer_background = function() {
        var curBall = $scope.game.score[$scope.game.curPlayerIdx].curBall;
       return 'background-' + curBall;
    };
    $scope.isTargetAvailable = function() {
        var curBall = $scope.game.score[$scope.game.curPlayerIdx].curBall;
        return curBall != 3;
    };
    $scope.getInactivePlayerScoreClass = function() {
        var curBall = $scope.game.score[Util.neg($scope.game.curPlayerIdx)].curBall;
        return 'playerScoreBall-' + curBall + ' playerScoreInactive';
    };
    $scope.getActivePlayerPoints = function() {
        var score = $scope.game.score[$scope.game.curPlayerIdx];
        return score.curPoints;
    }
    $scope.getInactivePlayerPoints = function() {
        var score = $scope.game.score[Util.neg($scope.game.curPlayerIdx)];
        return score.curPoints;
    }
    //ragahv
    $scope.getPlayer1Points = function() {
        var score = $scope.game.score[0];
        return score.curPoints;
    }
    $scope.getPlayer2Points = function() {
        var score = $scope.game.score[1];
        return score.curPoints;
    }
    $scope.getActivePlayerScoreClass_player2 = function() {
        var curBall1 = $scope.game.score[1].curBall;
          return 'playerScoreBall-' + curBall1 + ' playerScoreInactive';
    }
     $scope.getActivePlayerScoreClass_player1 = function() {
        var curBall0 = $scope.game.score[0].curBall+ ' playerScoreInactive';
          return 'playerScoreBall-' + curBall0 ;
    }

    //end raghav
    $scope.missed = function() {
        var cmd = new MissedCommand($scope.game);
        $scope.game.commands.push(cmd);
        cmd.execute();
        if ($scope.game.isShootout()) {
            if ($scope.lastShootoutInning == true) {
                handleGameOver();
            } else {
                $scope.lastShootoutInning = true;
                // End the game if the current player wins without shooting
                var score = Match.curGame.score;
                var curIdx = $scope.game.curPlayerIdx;
                var otherIdx = Util.neg(curIdx);
                var curScoreRatio = score[curIdx].curPoints / Match.players[curIdx].points;
                var otherScoreRatio = score[otherIdx].curPoints / Match.players[otherIdx].points;
                if (curScoreRatio > otherScoreRatio) {
                    handleGameOver();
                }
            }
        }
    };
    $scope.made = function () {
        var cmd = new MadeCommand($scope.game);
        $scope.game.commands.push(cmd);
        cmd.execute();
        afterSuccessShot();
    };
    $scope.target = function () {
        var cmd = new TargetCommand($scope.game);
        $scope.game.commands.push(cmd);
        cmd.execute();
        afterSuccessShot();
    };
    var afterSuccessShot = function() {
        if ($scope.game.isShootout() && $scope.game.isCurPlayerOverMax()) {
            if ($scope.lastShootoutInning == true) {
                handleGameOver();
            } else {
                $scope.missed();
            }
        } else if ($scope.game.isCurPlayerOverMax()) {
            handleGameOver();
        }
    };
    var handleGameOver = function() {
        $interval.cancel(stopTimer);
        $location.path("/result");
    };
    $scope.undo = function() {
        var cmd = $scope.game.commands.pop();
        cmd.undo();
    };
    $scope.togglePause = function () {
        if ($scope.game.currentPauseTime() == 0) {
            $scope.game.pause();
        } else {
            $scope.game.resume();
            angular.element(Util.$('#gameTimer')).removeClass('timerPaused');
        }
    };
    var updateTimer = function() {
        if ($scope.game != null) {
            var timerElem = Util.$('#gameTimer');
            var remainingTime = $scope.game.remainingTime();
            angular.element(timerElem).text($filter('date')(remainingTime, 'mm:ss'));
            if ($scope.game.currentPauseTime() != 0) {
                angular.element(timerElem).toggleClass('timerPaused');
            }
            if ($scope.game.isShootout()) {
                $interval.cancel(stopTimer);
                angular.element(timerElem).text("Shootout");
                angular.element(timerElem).addClass('timerWarning');
                angular.element(document.getElementById('gameScreen')).addClass("shootout");
                setupShootout();
            }
        }
    };
    var stopTimer;
    if (Match.gameClock != null) {
        stopTimer = $interval(updateTimer, 1000);
    }
    var setupShootout = function () {
        var score = $scope.game.score;
        var idx;
        if (score[0].curPoints == score[1].curPoints) {
            idx = $scope.game.breakingPlayerIdx;
        } else {
            idx = (score[0].curPoints < score[1].curPoints) ? 0 : 1;
        }
        $scope.game.curPlayerIdx = idx;
        // reset colors
        score[0].curBall = 1;
        score[1].curBall = 1;
    };
});

bbApp.controller('gameResultController', function ($scope, Match, $location) {
    if (!Match.curGame) {
        $location.path("/");
    }
    var calcWinnerIdx = function() {
        var scoreRatio0 = score[0].curPoints / Match.players[0].points;
        var scoreRatio1 = score[1].curPoints / Match.players[1].points;
        var result = (scoreRatio0 > scoreRatio1) ? 0 : 1;
        if (shootout) {
            if (scoreRatio0 == scoreRatio1) {
                result = -1;
            } else if (score[0].curPoints >= Match.players[0].points && score[1].curPoints >= Match.players[1].points) {
                result = -1;
            }
        }
        return result;
    };
    var calcMatchScore = function() {
        if (shootout) {
            return 1;
        } else {
            //return ($scope.shutout) ? 3 : 2;
             return 1;
        }

    };
    var shootout = Match.curGame.isShootout();
    var score = Match.curGame.score;
    var winnerIdx = calcWinnerIdx();
    $scope.winnerIdx = winnerIdx;
    $scope.shutout = (score[Util.neg(winnerIdx)].curPoints == 0);
    if (winnerIdx < 0) {
        Match.score[0] += 1;
        Match.score[1] += 1;
    } else {
        Match.score[winnerIdx] += calcMatchScore();
    }
    $scope.match = Match;
    $scope.nextGame = function() {
        Match.startNextGame();
        $location.path("/game");
    };
});