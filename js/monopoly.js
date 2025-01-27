var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 400;
Monopoly.doubleCounter = 0;
// game pieces initialization
Monopoly.init = function () {
    $(document).ready(function () {
        Monopoly.adjustBoardSize();
        $(window).bind("resize", Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();
    });
};

Monopoly.start = function () {
    Monopoly.showPopup("intro")
};


Monopoly.initDice = function () {
    $(".dice").click(function () {
        if (Monopoly.allowRoll) {
            Monopoly.rollDice();
        }
    });
};

//Few methods for retrieving information
Monopoly.getCurrentPlayer = function () {
    return $(".player.current-turn");
};

Monopoly.getPlayersCell = function (player) {
    return player.closest(".cell");
};

Monopoly.getPlayersMoney = function (player) {
    return parseInt(player.attr("data-money"));
};

Monopoly.updatePlayersMoney = function (player, amount) {
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    if (playersMoney < 0) {
        alert("you are broke!")
    }
    player.attr("data-money", playersMoney);
    player.attr("title", player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");
};

//When user clicks on a dice: double will give him another turn,
// triple of these will send to jai
Monopoly.rollDice = function () {
    Monopoly.currentRoll1 = Math.floor(Math.random() * 6) + 1;
    Monopoly.currentRoll2 = Math.floor(Math.random() * 6) + 1;
    $(".dice").find(".dice-dot").css("opacity", 0);
    $(".dice#dice1").attr("data-num", Monopoly.currentRoll1).find(".dice-dot.num" + Monopoly.currentRoll1).css("opacity", 1);
    $(".dice#dice2").attr("data-num", Monopoly.currentRoll2).find(".dice-dot.num" + Monopoly.currentRoll2).css("opacity", 1);
    if (Monopoly.currentRoll1 === Monopoly.currentRoll2) {
        Monopoly.doubleCounter++;
    }
    else Monopoly.doubleCounter = 0;
    var currentPlayer = Monopoly.getCurrentPlayer();
    if (Monopoly.doubleCounter >= 3) {
        Monopoly.handleAction(currentPlayer, "jail");
    }
    else {
        Monopoly.handleAction(currentPlayer, "move", Monopoly.currentRoll1 + Monopoly.currentRoll2);
    }
};

// lower opacity on dices after throw, to emphasise this throw already happened
Monopoly.dimDices = function () {
    $(".dice#dice1").attr("data-num", Monopoly.currentRoll1).find(".dice-dot.num" + Monopoly.currentRoll1).css("opacity", 0.5);
    $(".dice#dice2").attr("data-num", Monopoly.currentRoll2).find(".dice-dot.num" + Monopoly.currentRoll2).css("opacity", 0.5);
}

Monopoly.movePlayer = function (player, steps) {
    Monopoly.allowRoll = false;
    var playerMovementInterval = setInterval(function () {
        if (steps == 0) {
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
        } else {
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            nextCell.find(".content").append(player);
            steps--;
        }
    }, 200);
};

// handles what happens when a user stop oon a cell
Monopoly.handleTurn = function () {
    Monopoly.dimDices();
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    $(".dice#dice1").attr("data-num", Monopoly.currentRoll1).find(".dice-dot.num" + Monopoly.currentRoll1).css("opacity", 0.5);
    $(".dice#dice2").attr("data-num", Monopoly.currentRoll2).find(".dice-dot.num" + Monopoly.currentRoll2).css("opacity", 0.5);
    if (playerCell.is(".available.property")) {
        Monopoly.handleBuyProperty(player, playerCell);
    } else if (playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))) {
        Monopoly.handlePayRent(player, playerCell);
    } else if (playerCell.is(".go-to-jail")) {
        Monopoly.handleGoToJail(player);
    } else if (playerCell.is(".chance")) {
        Monopoly.handleChanceCard(player);
    } else if (playerCell.is(".community")) {
        Monopoly.handleCommunityCard(player);
    } else {
        Monopoly.setNextPlayerTurn();
    }
}

//switches turn, also handles counting jail turns
Monopoly.setNextPlayerTurn = function () {
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
    if (Monopoly.doubleCounter === 0) {
        var playerId = parseInt(currentPlayerTurn.attr("id").replace("player", ""));
        var nextPlayerId = playerId + 1;
        if (nextPlayerId > $(".player").length) {
            nextPlayerId = 1;
        }
        currentPlayerTurn.removeClass("current-turn");
        var nextPlayer = $(".player#player" + nextPlayerId);
        nextPlayer.addClass("current-turn");
    }
    else nextPlayer = currentPlayerTurn;
    if (nextPlayer.is(".jailed")) {
        if (Monopoly.doubleCounter === 0) {
            var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
            currentJailTime++;
            nextPlayer.attr("data-jail-time", currentJailTime);
            if (currentJailTime > 3) {
                nextPlayer.removeClass("jailed");
                nextPlayer.removeAttr("data-jail-time");
            }
            Monopoly.setNextPlayerTurn();
            return;
        }
        else Monopoly.doubleCounter = 0;

    }
    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};

// next methods open popups for dealing with certain types of cells
Monopoly.handleBuyProperty = function (player, propertyCell) {
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click", function () {
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")) {
            Monopoly.handleBuy(player, propertyCell, propertyCost);
        } else {
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};

Monopoly.handlePayRent = function (player, propertyCell) {
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click", function () {
        var properyOwner = $(".player#" + properyOwnerId);
        Monopoly.updatePlayersMoney(player, currentRent);
        Monopoly.updatePlayersMoney(properyOwner, -1 * currentRent);
        Monopoly.closeAndNextTurn();
    });
    Monopoly.showPopup("pay");
};


Monopoly.handleGoToJail = function (player) {
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click", function () {
        Monopoly.handleAction(player, "jail");
    });
    Monopoly.showPopup("jail");
};


Monopoly.handleChanceCard = function (player) {
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function (chanceJson) {
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", chanceJson["action"]).attr("data-amount", chanceJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("chance");
};

Monopoly.handleCommunityCard = function (player) {
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function (communityJson) {
        popup.find(".popup-content #text-placeholder").text(communityJson["content"]);
        popup.find(".popup-title").text(communityJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", communityJson["action"]).attr("data-amount", communityJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("community");
};


Monopoly.sendToJail = function (player) {
    player.addClass("jailed");
    player.attr("data-jail-time", 1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.doubleCounter = 0;
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

// Method for retrieving a specific popup
Monopoly.getPopup = function (popupId) {
    return $(".popup-lightbox .popup-page#" + popupId);
};

Monopoly.calculateProperyCost = function (propertyCell) {
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group", "")) * 5;
    if (cellGroup == "rail") {
        cellPrice = 10;
    }
    return cellPrice;
};


Monopoly.calculateProperyRent = function (propertyCost) {
    return propertyCost / 2;
};

//End turn mainly after landing on a property
Monopoly.closeAndNextTurn = function () {
    Monopoly.closePopup();
    Monopoly.setNextPlayerTurn();
};

//starter method for chossing number of players
Monopoly.initPopups = function () {
    $(".popup-page#intro").find("button").click(function () {
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers", numOfPlayers)) {
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};


Monopoly.handleBuy = function (player, propertyCell, propertyCost) {
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost) {
        Monopoly.showErrorMsg();
        Monopoly.playSound("aww");

    } else {
        Monopoly.updatePlayersMoney(player, propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);

        propertyCell.removeClass("available")
            .addClass(player.attr("id"))
            .attr("data-owner", player.attr("id"))
            .attr("data-rent", rent);
        Monopoly.setNextPlayerTurn();
    }
};




//Intermediate method: defining the course of a turn, mainly for chancs/community cards
Monopoly.handleAction = function (player, action, amount) {
    switch (action) {
        case "move":
            Monopoly.movePlayer(player, amount);
            break;
        case "pay":
            Monopoly.updatePlayersMoney(player, amount);
            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
    };
    Monopoly.closePopup();
};





Monopoly.createPlayers = function (numOfPlayers) {
    Monopoly.numOfPlayers = numOfPlayers;
    var startCell = $(".go");
    for (var i = 1; i <= numOfPlayers; i++) {
        var player = $("<div />").addClass("player shadowed").attr("id", "player" + i).attr("title", "player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i == 1) {
            player.addClass("current-turn");
        }
        player.attr("data-money", Monopoly.moneyAtStart);
    }
};

// helper method or moving player
Monopoly.getNextCell = function (cell) {
    var currentCellId = parseInt(cell.attr("id").replace("cell", ""));
    var nextCellId = currentCellId + 1
    if (nextCellId > 40) {
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};

//in case of passing the first cell: get some money
Monopoly.handlePassedGo = function () {
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player, -Monopoly.moneyAtStart / 10);
};

// Make sure number of pplayers chosen is valid
Monopoly.isValidInput = function (validate, value) {
    var isValid = false;
    switch (validate) {
        case "numofplayers":
            if (value >= 1 && value <= 6) {
                isValid = true;
            }
            break;
    }
    if (!isValid) {
        Monopoly.showErrorMsg();
    }
    return isValid;
}

//Show error masseges throughout popups
Monopoly.showErrorMsg = function () {
    $(".popup-page .invalid-error").fadeTo(500, 1);
    setTimeout(function () {
        $(".popup-page .invalid-error").fadeTo(500, 0);
    }, 2000);
};

//In case of window resize keeps the board looking good
Monopoly.adjustBoardSize = function () {
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(), $(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) * 2;
    $(".board").css({ "height": boardSize, "width": boardSize });
}

Monopoly.closePopup = function () {
    $(".popup-lightbox").fadeOut();
};

Monopoly.playSound = function (sound) {
    var snd = new Audio("./sounds/" + sound + ".wav");
    snd.play();
}
//Helper method for shwing popups
Monopoly.showPopup = function (popupId) {
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};

//calling the initialization method
Monopoly.init();