var structData = require("./../config/structdata");
//所有牌
var allCardList = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

//胡牌类型对应的番数
var fanConfig = { 1: 2, 2: 4, 3: 3, 4: 4, 5: 5, 6: 5, 7: 6, 8: 8 };

exports.socketioProxy = null;

//获取麻将牌
exports.getAllMahjong = function () {
    var mahjongList;
    mahjongList = [].concat(allCardList);
    mahjongList.sort(function (a, b) {
        return Math.random() > 0.5 ? -1 : 1;
    })
    return mahjongList;
}

var mahjongSetList = {};
//设置玩家初始牌
exports.setUserMahJong = function (req, res) {
    var setList = JSON.parse(req.body.setList);
    var roomId = req.body.roomId;
    var allMahjongList = [].concat(allMahjongList_bc);
    var mahjongList = [];
    var zDeskStation = 0;
    for (var i = 0; i < setList.length; i++) {
        if (setList[i].length == 21) zDeskStation = i + 1;
        for (var j = 0; j < setList[i].length; j++) {
            var mahjongValue = setList[i][j];
            var index = allMahjongList.indexOf(mahjongValue);
            if (index != -1)
                allMahjongList.splice(index, 1);
            mahjongList.push(mahjongValue);
        }
    }
    allMahjongList.sort(function (a, b) {
        return Math.random() > 0.5 ? -1 : 1;
    })
    mahjongList = mahjongList.concat(allMahjongList);
    mahjongSetList[roomId] = {};
    mahjongSetList[roomId].setZhuang = zDeskStation;
    mahjongSetList[roomId].mahjongSetList = mahjongList;
    var resData = {};
    resData.action = "setRoomCard";
    resData.msg = "设置成功";
    res.end(JSON.stringify(resData));
}
//获取设置的麻将牌
exports.getRoomSetMahList = function (roomId) {
    return mahjongSetList[roomId];
}
//删除设置的牌
exports.removeRoomSetMahList = function (roomId) {
    delete mahjongSetList[roomId];
}

//开局亮张后检测是否天胡
exports.checkTianHu = function (cardList, liangzhang = -1) {
    var tiNum = 0;
    var canNum = 0;
    var tempList = [].concat(cardList);
    if (liangzhang != -1) {
        tempList[liangzhang]++;
    }
    var wintype = liangzhang == -1 ? 1 : 0;
    return getResultFanInner(tempList, [], wintype, -1, true);
}
//获取手牌中的提
exports.getHandTilist = function (handList) {
    var tiList = [];
    for (var i = 0; i < handList.length; i++) {
        if (handList[i] == 4) {
            tiList.push(i);
        }
    }
    return tiList;
}

//检查手牌，获取胡牌的全部牌型
function getWinMahJongList(handList, outList, checktianhu = false) {
    var menNumber = outList.length;
    var listBak = [].concat(handList);
    var winResultList = []; //胡牌的所有情况
    var kanList = []; //手中的坎
    var tiList = [];
    var gangNum = 0; //提或跑
    for (var i = 0; i < listBak.length; i++) {
        if (listBak[i] == 3) {
            listBak[i] = 0;
            menNumber++;
            kanList.push(i);
        } else if (listBak[i] == 4) {
            listBak[i] = 0;
            gangNum++;
            menNumber++;
            tiList.push(i);
        }
    }
    for (var i = 0; i < outList.length; i++) {
        if (outList[i].action == 4 || outList[i].action == 5) {
            gangNum++;
        }
    }
    if (checktianhu) {
        if (gangNum >= 3 || menNumber >= 5) {
            var result = {};
            result.specialHu = true;
            result.menList = [];
            for (var i = 0; i < kanList.length; i++) {
                result.menList.push([kanList[i], kanList[i], kanList[i]]);
            }
            for (var i = 0; i < tiList.length; i++) {
                result.menList.push([tiList[i], tiList[i], tiList[i], tiList[i]]);
            }
            var noJongList = [].concat(listBak);
            var checkIndex = 0;
            var checkLen = 19;
            (function checkTianhuList(checkIndex) {
                if (checkIndex > checkLen) return;
                var checkValue = noJongList[checkIndex];
                if (checkValue == 0) {
                    checkIndex++;
                } else {
                    if (checkIndex == 18 || checkIndex == 19 || checkIndex == 8 || checkIndex == 9) {
                        if (checkIndex == 18 || checkIndex == 19) return;
                        if (noJongList[checkIndex] + noJongList[checkIndex + 10] >= 3) {
                            var currValue = noJongList[checkIndex];
                            noJongList[checkIndex] -= currValue;
                            noJongList[checkIndex + 10] -= (3 - currValue);
                            var men;
                            if (currValue == 1) {
                                men = [checkIndex, checkIndex + 10, checkIndex + 10];
                            } else {
                                men = [checkIndex, checkIndex, checkIndex + 10];
                            }
                            result.menList.push(men);
                        }
                        checkIndex++;
                    } else {
                        if (noJongList[checkIndex] > 0) {
                            if (checkIndex < 10) {
                                if (checkIndex == 1 || checkIndex == 6 || checkIndex == 9) {
                                    for (var j = 0; j < 2; j++) {
                                        if (noJongList[1] >= 1 && noJongList[6] >= 1 && noJongList[9] >= 1) {
                                            var men = [1, 6, 9];
                                            result.menList.push(men);
                                            noJongList[1]--;
                                            noJongList[6]--;
                                            noJongList[9]--;
                                        }
                                    }
                                }
                            } else {
                                if (checkIndex == 11 || checkIndex == 16 || checkIndex == 19) {
                                    for (var j = 0; j < 2; j++) {
                                        if (noJongList[11] >= 1 && noJongList[16] >= 1 && noJongList[19] >= 1) {
                                            var men = [11, 16, 19];
                                            result.menList.push(men);
                                            noJongList[11]--;
                                            noJongList[16]--;
                                            noJongList[19]--;
                                        }
                                    }
                                }
                            }
                        }

                        if(noJongList[checkIndex] > 0)
                        {
                            if (noJongList[checkIndex + 1] < checkValue || noJongList[checkIndex + 2] < checkValue) {
                                if (checkValue > 1) {
                                    if (noJongList[checkIndex + 1] >= 1 && noJongList[checkIndex + 2] >= 1) {
                                        var men = [checkIndex, checkIndex + 1, checkIndex + 2];
                                        result.menList.push(men);
                                        noJongList[checkIndex] -= 1;
                                        noJongList[checkIndex + 1] -= 1;
                                        noJongList[checkIndex + 2] -= 1;
                                    }
                                }
                            } else {
                                for (var j = 0; j < checkValue; j++) {
                                    var men = [checkIndex, checkIndex + 1, checkIndex + 2];
                                    result.menList.push(men);
                                }
                                noJongList[checkIndex] -= checkValue;
                                noJongList[checkIndex + 1] -= checkValue;
                                noJongList[checkIndex + 2] -= checkValue;
                            }
                        }

                        if (noJongList[checkIndex] > 0) {
                            if (checkIndex < 10) {
                                if (noJongList[checkIndex] + noJongList[checkIndex + 10] >= 3) {
                                    var currValue = noJongList[checkIndex];
                                    noJongList[checkIndex] -= currValue;
                                    noJongList[checkIndex + 10] -= (3 - currValue);
                                    var men;
                                    if (currValue == 1) {
                                        men = [checkIndex, checkIndex + 10, checkIndex + 10];
                                    } else {
                                        men = [checkIndex, checkIndex, checkIndex + 10];
                                    }
                                    result.menList.push(men);
                                }
                            } else {
                                if (noJongList[checkIndex] + noJongList[checkIndex - 10] >= 3) {
                                    var currValue = noJongList[checkIndex];
                                    noJongList[checkIndex] -= currValue;
                                    noJongList[checkIndex - 10] -= (3 - currValue);
                                    var men;
                                    if (currValue == 1) {
                                        men = [checkIndex, checkIndex + 10, checkIndex + 10];
                                    } else {
                                        men = [checkIndex, checkIndex, checkIndex + 10];
                                    }
                                    result.menList.push(men);
                                }
                            }
                        }

                        if (noJongList[checkIndex] > 0) return;
                        checkIndex++;
                    }
                }
                checkTianhuList(checkIndex);
            })(checkIndex);
            winResultList.push(result);
            return winResultList;
        }
    }
    if (gangNum > 0) {
        var jongList = [];
        for (var i = 0; i < listBak.length; i++) {
            if (listBak[i] == 2) {
                jongList.push(i);
            }
        }
        if (jongList.length == 0) return false;
        for (var i = 0; i < jongList.length; i++) {
            var jongValue = jongList[i];
            var result = {};
            result.jongValue = jongValue; //对子
            result.menList = []; //普通三张牌组
            var noJongList = [].concat(listBak);
            noJongList[jongValue] -= 2;
            var men = [jongValue, jongValue];
            result.menList.push(men);
            if (checktianhu) {
                for (var j = 0; j < kanList.length; j++) {
                    result.menList.push([kanList[j], kanList[j], kanList[j]]);
                }
                for (var j = 0; j < tiList.length; j++) {
                    result.menList.push([tiList[j], tiList[j], tiList[j], tiList[j]]);
                }
            }
            var checkIndex = 0;
            var checkLen = 19;
            (function checkNoJongList(checkIndex) {
                if (checkIndex > checkLen) return;
                var checkValue = noJongList[checkIndex];
                if (checkValue == 0) {
                    checkIndex++;
                } else {
                    if (checkIndex == 18 || checkIndex == 19 || checkIndex == 8 || checkIndex == 9) {
                        if (checkIndex == 18 || checkIndex == 19) return;
                        if (noJongList[checkIndex] + noJongList[checkIndex + 10] >= 3) {
                            var currValue = noJongList[checkIndex];
                            noJongList[checkIndex] -= currValue;
                            noJongList[checkIndex + 10] -= (3 - currValue);
                            var men;
                            if (currValue == 1) {
                                men = [checkIndex, checkIndex + 10, checkIndex + 10];
                            } else {
                                men = [checkIndex, checkIndex, checkIndex + 10];
                            }
                            result.menList.push(men);
                        }
                        checkIndex++;
                    } else {
                        if (noJongList[checkIndex] > 0) {
                            if (checkIndex < 10) {
                                if (checkIndex == 1 || checkIndex == 6 || checkIndex == 9) {
                                    for (var j = 0; j < 2; j++) {
                                        if (noJongList[1] >= 1 && noJongList[6] >= 1 && noJongList[9] >= 1) {
                                            var men = [1, 6, 9];
                                            result.menList.push(men);
                                            noJongList[1]--;
                                            noJongList[6]--;
                                            noJongList[9]--;
                                        }
                                    }
                                }
                            } else {
                                if (checkIndex == 11 || checkIndex == 16 || checkIndex == 19) {
                                    for (var j = 0; j < 2; j++) {
                                        if (noJongList[11] >= 1 && noJongList[16] >= 1 && noJongList[19] >= 1) {
                                            var men = [11, 16, 19];
                                            result.menList.push(men);
                                            noJongList[11]--;
                                            noJongList[16]--;
                                            noJongList[19]--;
                                        }
                                    }
                                }
                            }
                        }

                        if (noJongList[checkIndex] > 0) {
                            if (noJongList[checkIndex + 1] < checkValue || noJongList[checkIndex + 2] < checkValue) {
                                if (checkValue > 1) {
                                    if (noJongList[checkIndex + 1] >= 1 && noJongList[checkIndex + 2] >= 1) {
                                        var men = [checkIndex, checkIndex + 1, checkIndex + 2];
                                        result.menList.push(men);
                                        noJongList[checkIndex] -= 1;
                                        noJongList[checkIndex + 1] -= 1;
                                        noJongList[checkIndex + 2] -= 1;
                                    }
                                }
                            } else {
                                for (var j = 0; j < checkValue; j++) {
                                    var men = [checkIndex, checkIndex + 1, checkIndex + 2];
                                    result.menList.push(men);
                                }
                                noJongList[checkIndex] -= checkValue;
                                noJongList[checkIndex + 1] -= checkValue;
                                noJongList[checkIndex + 2] -= checkValue;
                            }
                        }

                        if (noJongList[checkIndex] > 0) {
                            if (checkIndex < 10) {
                                if (noJongList[checkIndex] + noJongList[checkIndex + 10] >= 3) {
                                    var currValue = noJongList[checkIndex];
                                    noJongList[checkIndex] -= currValue;
                                    noJongList[checkIndex + 10] -= (3 - currValue);
                                    var men;
                                    if (currValue == 1) {
                                        men = [checkIndex, checkIndex + 10, checkIndex + 10];
                                    } else {
                                        men = [checkIndex, checkIndex, checkIndex + 10];
                                    }
                                    result.menList.push(men);
                                }
                            } else {
                                if (noJongList[checkIndex] + noJongList[checkIndex - 10] >= 3) {
                                    var currValue = noJongList[checkIndex];
                                    noJongList[checkIndex] -= currValue;
                                    noJongList[checkIndex - 10] -= (3 - currValue);
                                    var men;
                                    if (currValue == 1) {
                                        men = [checkIndex, checkIndex + 10, checkIndex + 10];
                                    } else {
                                        men = [checkIndex, checkIndex, checkIndex + 10];
                                    }
                                    result.menList.push(men);
                                }
                            }
                        }

                        if (noJongList[checkIndex] > 0) return;
                        checkIndex++;
                    }
                }
                checkNoJongList(checkIndex);
            })(checkIndex);
            if ((!checktianhu && result.menList.length + menNumber == 7) || (checktianhu && result.menList.length == 7))
                winResultList.push(result);
        }
    } else {
        var result = {};
        result.menList = []; //普通三张牌组
        if (checktianhu) {
            for (var i = 0; i < kanList.length; i++) {
                result.menList.push([kanList[i], kanList[i], kanList[i]]);
            }
            for (var i = 0; i < tiList.length; i++) {
                result.menList.push([tiList[i], tiList[i], tiList[i], tiList[i]]);
            }
        }
        var noJongList = [].concat(listBak);
        var checkIndex = 0;
        var checkLen = 19;
        (function checkNoJongList(checkIndex) {
            if (checkIndex > checkLen) return;
            var checkValue = noJongList[checkIndex];
            if (checkValue == 0) {
                checkIndex++;
            } else {
                if (checkIndex == 18 || checkIndex == 19 || checkIndex == 8 || checkIndex == 9) {
                    if (checkIndex == 18 || checkIndex == 19) return;
                    if (noJongList[checkIndex] + noJongList[checkIndex + 10] >= 3) {
                        var currValue = noJongList[checkIndex];
                        noJongList[checkIndex] -= currValue;
                        noJongList[checkIndex + 10] -= (3 - currValue);
                        var men;
                        if (currValue == 1) {
                            men = [checkIndex, checkIndex + 10, checkIndex + 10];
                        } else {
                            men = [checkIndex, checkIndex, checkIndex + 10];
                        }
                        result.menList.push(men);
                    }
                    checkIndex++;
                } else {
                    if (noJongList[checkIndex + 1] < checkValue || noJongList[checkIndex + 2] < checkValue) {
                        if (checkValue > 1) {
                            if (noJongList[checkIndex + 1] >= 1 && noJongList[checkIndex + 2] >= 1) {
                                var men = [checkIndex, checkIndex + 1, checkIndex + 2];
                                result.menList.push(men);
                                noJongList[checkIndex] -= 1;
                                noJongList[checkIndex + 1] -= 1;
                                noJongList[checkIndex + 2] -= 1;
                            }
                        }
                    } else {
                        for (var j = 0; j < checkValue; j++) {
                            var men = [checkIndex, checkIndex + 1, checkIndex + 2];
                            result.menList.push(men);
                        }
                        noJongList[checkIndex] -= checkValue;
                        noJongList[checkIndex + 1] -= checkValue;
                        noJongList[checkIndex + 2] -= checkValue;
                    }

                    if (noJongList[checkIndex] > 0) {
                        if (checkIndex < 10) {
                            if (checkIndex == 1 || checkIndex == 6 || checkIndex == 9) {
                                for (var j = 0; j < 2; j++) {
                                    if (noJongList[1] >= 1 && noJongList[6] >= 1 && noJongList[9] >= 1) {
                                        var men = [1, 6, 9];
                                        result.menList.push(men);
                                        noJongList[1]--;
                                        noJongList[6]--;
                                        noJongList[9]--;
                                    }
                                }
                            }
                        } else {
                            if (checkIndex == 11 || checkIndex == 16 || checkIndex == 19) {
                                for (var j = 0; j < 2; j++) {
                                    if (noJongList[11] >= 1 && noJongList[16] >= 1 && noJongList[19] >= 1) {
                                        var men = [11, 16, 19];
                                        result.menList.push(men);
                                        noJongList[11]--;
                                        noJongList[16]--;
                                        noJongList[19]--;
                                    }
                                }
                            }
                        }
                    }

                    if (noJongList[checkIndex] > 0) {
                        if (checkIndex < 10) {
                            if (noJongList[checkIndex] + noJongList[checkIndex + 10] >= 3) {
                                var currValue = noJongList[checkIndex];
                                noJongList[checkIndex] -= currValue;
                                noJongList[checkIndex + 10] -= (3 - currValue);
                                var men;
                                if (currValue == 1) {
                                    men = [checkIndex, checkIndex + 10, checkIndex + 10];
                                } else {
                                    men = [checkIndex, checkIndex, checkIndex + 10];
                                }
                                result.menList.push(men);
                            }
                        } else {
                            if (noJongList[checkIndex] + noJongList[checkIndex - 10] >= 3) {
                                var currValue = noJongList[checkIndex];
                                noJongList[checkIndex] -= currValue;
                                noJongList[checkIndex - 10] -= (3 - currValue);
                                var men;
                                if (currValue == 1) {
                                    men = [checkIndex, checkIndex + 10, checkIndex + 10];
                                } else {
                                    men = [checkIndex, checkIndex, checkIndex + 10];
                                }
                                result.menList.push(men);
                            }
                        }
                    }

                    if (noJongList[checkIndex] > 0) return;
                    checkIndex++;
                }
            }
            checkNoJongList(checkIndex);
        })(checkIndex);
        if ((!checktianhu && result.menList.length + menNumber >= 7) || (checktianhu && result.menList.length >= 7))
            winResultList.push(result);
    }

    return winResultList;
}

//获取胡牌列表
exports.getWinList = function (mahjongList, specialList) {
    return getWinMahJongList(mahjongList, specialList);
}

//获取听牌列表
function getTingList(mahjongList, specialList) {
    var mahJongLen = 20;
    var tingList = [];
    for (var i = 0; i < mahJongLen; i++) {
        var tempCheckList = [].concat(mahjongList);
        if (tempCheckList[i] < 4) tempCheckList[i]++;
        var checkResult = getWinMahJongList(tempCheckList, specialList);
        if (checkResult.length > 0 || checkResult == structData.QD || checkResult == structData.SBD) {
            tingList.push(i);
        }
    }
    return tingList;
}
//获取听牌后赢的牌列表
exports.getTingMahList = function (mahjongList, specialList) {
    return getTingList(mahjongList, specialList);
}

//获取打出听的牌及对应的胡牌列表
exports.getLizhiList = function (mahjongList, specialList) {
    var resultList = [];
    for (var i = 0; i < mahjongList.length; i++) {
        if (mahjongList[i] == 0) continue;
        var tempCheckList = [].concat(mahjongList);
        tempCheckList[i]--;
        var tinglist = getTingList(tempCheckList, specialList);
        if (tinglist.length > 0) {
            var result = {};
            result.mahjongValue = i;
            result.tinglist = tinglist;
            resultList.push(result);
        }
    }
    return resultList;
}
//碰牌检测
exports.checkPeng = function (mahjongList, mahjongValue) {
    return (mahjongList[mahjongValue] == 2) ? true : false;
}
//提牌检测
exports.checkTi = function (handcardList, deskcardList, cardValue) {
    if (handcardList[cardValue] == 3) return true;
    for (var i = 0; i < deskcardList.length; i++) {
        if (deskcardList[i].action == 3 && deskcardList[i].moArr[0] == cardValue) {
            return true;
        }
    }
    return false;
}
//跑牌检测
exports.checkPao = function (handcardList, deskcardList, cardValue, isauto = true) {
    if (handcardList[cardValue] == 3) return true;
    for (var i = 0; i < deskcardList.length; i++) {
        if ((deskcardList[i].action == 3 || deskcardList[i].action == 2) && deskcardList[i].moArr[0] == cardValue && isauto) {
            return true;
        } else if (deskcardList[i].action == 3 && deskcardList[i].moArr[0] == cardValue && !isauto) {
            return true;
        }
    }
    return false;
}
//吃牌检测
exports.checkChi = function (mahjongList, mahjongValue) {
    var resultList = [];
    if (mahjongValue == 0 || mahjongValue == 10) {
        if (mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue + 1] < 3 && mahjongList[mahjongValue + 2] > 0 && mahjongList[mahjongValue + 2] < 3)
            resultList.push({ list: [mahjongValue, mahjongValue + 1, mahjongValue + 2] });
    } else if (mahjongValue == 1 || mahjongValue == 11) {
        if (mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue + 1] < 3 && mahjongList[mahjongValue + 2] > 0 && mahjongList[mahjongValue + 2] < 3)
            resultList.push({ list: [mahjongValue, mahjongValue + 1, mahjongValue + 2] });
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue + 1] < 3)
            resultList.push({ list: [mahjongValue - 1, mahjongValue, mahjongValue + 1] });
    } else if (mahjongValue == 9 || mahjongValue == 19) {
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue - 2] > 0 && mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue - 2] < 3)
            resultList.push({ list: [mahjongValue - 2, mahjongValue - 1, mahjongValue] });
    } else if (mahjongValue == 8 || mahjongValue == 18 || mahjongValue == 25) {
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue - 2] > 0 && mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue - 2] < 3)
            resultList.push({ list: [mahjongValue - 2, mahjongValue - 1, mahjongValue] });
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue + 1] < 3)
            resultList.push({ list: [mahjongValue - 1, mahjongValue, mahjongValue + 1] });
    } else {
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue - 2] > 0 && mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue - 2] < 3)
            resultList.push({ list: [mahjongValue - 2, mahjongValue - 1, mahjongValue] });
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue + 1] < 3)
            resultList.push({ list: [mahjongValue - 1, mahjongValue, mahjongValue + 1] });
        if (mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue + 2] > 0 && mahjongList[mahjongValue + 1] < 3 && mahjongList[mahjongValue + 2] < 3)
            resultList.push({ list: [mahjongValue, mahjongValue + 1, mahjongValue + 2] });
    }
    if ((mahjongValue == 1 && mahjongList[6] > 0 && mahjongList[9] > 0 && mahjongList[6] < 3 && mahjongList[9] < 3) || (mahjongValue == 6 && mahjongList[1] > 0 && mahjongList[9] > 0 && mahjongList[1] < 3 && mahjongList[9] < 3) || (mahjongValue == 9 && mahjongList[1] > 0 && mahjongList[6] > 0 && mahjongList[1] < 3 && mahjongList[6] < 3)) {
        resultList.push({ list: [1, 6, 9] });
    }
    if ((mahjongValue == 11 && mahjongList[16] > 0 && mahjongList[19] > 0 && mahjongList[16] < 3 && mahjongList[19] < 3) || (mahjongValue == 16 && mahjongList[11] > 0 && mahjongList[19] > 0 && mahjongList[11] < 3 && mahjongList[19] < 3) || (mahjongValue == 19 && mahjongList[11] > 0 && mahjongList[16] > 0 && mahjongList[11] < 3 && mahjongList[16] < 3)) {
        resultList.push({ list: [11, 16, 19] });
    }
    if (mahjongValue < 10 && (mahjongList[mahjongValue + 10] + mahjongList[mahjongValue] >= 2) && mahjongList[mahjongValue + 10] < 3 && mahjongList[mahjongValue] < 3) {
        if (mahjongList[mahjongValue] == 0 && mahjongList[mahjongValue + 10] == 2) {
            resultList.push({ list: [mahjongValue, mahjongValue + 10, mahjongValue + 10] });
        } else if (mahjongList[mahjongValue] >= 1 && mahjongList[mahjongValue + 10] == 1) {
            resultList.push({ list: [mahjongValue, mahjongValue, mahjongValue + 10] });
        } else if (mahjongList[mahjongValue] >= 1 && mahjongList[mahjongValue + 10] == 2) {
            resultList.push({ list: [mahjongValue, mahjongValue + 10, mahjongValue + 10] });
            resultList.push({ list: [mahjongValue, mahjongValue, mahjongValue + 10] });
        }
    }
    if (mahjongValue >= 10 && (mahjongList[mahjongValue - 10] + mahjongList[mahjongValue] >= 2) && mahjongList[mahjongValue - 10] < 3 && mahjongList[mahjongValue] < 3) {
        if (mahjongList[mahjongValue] == 0 && mahjongList[mahjongValue - 10] == 2) {
            resultList.push({ list: [mahjongValue, mahjongValue - 10, mahjongValue - 10] });
        } else if (mahjongList[mahjongValue] >= 1 && mahjongList[mahjongValue - 10] == 1) {
            resultList.push({ list: [mahjongValue, mahjongValue, mahjongValue - 10] });
        } else if (mahjongList[mahjongValue] >= 1 && mahjongList[mahjongValue - 10] == 2) {
            resultList.push({ list: [mahjongValue, mahjongValue - 10, mahjongValue - 10] });
            resultList.push({ list: [mahjongValue, mahjongValue, mahjongValue - 10] });
        }
    }
    for (var i = 0; i < resultList.length; i++) {
        var isSaveOne = false;
        var biCardList = [].concat(mahjongList);
        for (var j = 0; j < resultList[i].list.length; j++) {
            if (resultList[i].list[j] == mahjongValue && isSaveOne == false) {
                isSaveOne = true;
                continue;
            }
            biCardList[resultList[i].list[j]]--;
        }
        if (biCardList[mahjongValue] > 0) {
            var biRes = checkBi(biCardList, mahjongValue);
            if (biRes == false) {
                resultList.splice(i, 1);
                i--;
            } else {
                resultList[i].biList = biRes;
            }
        }

    }
    return resultList;
}
//比牌检测
function checkBi(mahjongList, mahjongValue) {
    var tempList = [].concat(mahjongList);
    var resultList = [];
    if (mahjongValue == 0 || mahjongValue == 10) {
        if (mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue + 2] > 0 && mahjongList[mahjongValue] > 0 &&
            mahjongList[mahjongValue + 1] < 3 && mahjongList[mahjongValue + 2] < 3 && mahjongList[mahjongValue] < 3)
            resultList.push({ list: [mahjongValue, mahjongValue + 1, mahjongValue + 2] });
    } else if (mahjongValue == 1 || mahjongValue == 11) {
        if (mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue + 2] > 0 && mahjongList[mahjongValue] > 0 &&
            mahjongList[mahjongValue + 1] < 3 && mahjongList[mahjongValue + 2] < 3 && mahjongList[mahjongValue] < 3)
            resultList.push({ list: [mahjongValue, mahjongValue + 1, mahjongValue + 2] });
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue] > 0 &&
            mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue + 1] < 3 && mahjongList[mahjongValue] < 3)
            resultList.push({ list: [mahjongValue - 1, mahjongValue, mahjongValue + 1] });
    } else if (mahjongValue == 9 || mahjongValue == 19) {
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue - 2] > 0 && mahjongList[mahjongValue] > 0 &&
            mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue - 2] < 3 && mahjongList[mahjongValue] < 3)
            resultList.push({ list: [mahjongValue - 2, mahjongValue - 1, mahjongValue] });
    } else if (mahjongValue == 8 || mahjongValue == 18 || mahjongValue == 25) {
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue - 2] > 0 && mahjongList[mahjongValue] > 0 &&
            mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue - 2] < 3 && mahjongList[mahjongValue] < 3)
            resultList.push({ list: [mahjongValue - 2, mahjongValue - 1, mahjongValue] });
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue] > 0 &&
            mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue + 1] < 3 && mahjongList[mahjongValue] < 3)
            resultList.push({ list: [mahjongValue - 1, mahjongValue, mahjongValue + 1] });
    } else {
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue - 2] > 0 && mahjongList[mahjongValue] > 0 &&
            mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue - 2] < 3 && mahjongList[mahjongValue] < 3)
            resultList.push({ list: [mahjongValue - 2, mahjongValue - 1, mahjongValue] });
        if (mahjongList[mahjongValue - 1] > 0 && mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue] > 0 &&
            mahjongList[mahjongValue - 1] < 3 && mahjongList[mahjongValue + 1] < 3 && mahjongList[mahjongValue] < 3)
            resultList.push({ list: [mahjongValue - 1, mahjongValue, mahjongValue + 1] });
        if (mahjongList[mahjongValue + 1] > 0 && mahjongList[mahjongValue + 2] > 0 && mahjongList[mahjongValue] > 0 &&
            mahjongList[mahjongValue + 1] < 3 && mahjongList[mahjongValue + 2] < 3 && mahjongList[mahjongValue] < 3)
            resultList.push({ list: [mahjongValue, mahjongValue + 1, mahjongValue + 2] });
    }
    if ((mahjongValue == 1 && mahjongList[6] > 0 && mahjongList[9] > 0 && mahjongList[mahjongValue] > 0) || (mahjongValue == 6 && mahjongList[1] > 0 && mahjongList[9] > 0 && mahjongList[mahjongValue] > 0) || (mahjongValue == 9 && mahjongList[1] > 0 && mahjongList[6] > 0 && mahjongList[mahjongValue] > 0)) {
        if (mahjongList[1] < 3 && mahjongList[6] < 3 && mahjongList[9] < 3)
            resultList.push({ list: [1, 6, 9] });
    }
    if ((mahjongValue == 11 && mahjongList[16] > 0 && mahjongList[19] > 0 && mahjongList[mahjongValue] > 0) || (mahjongValue == 16 && mahjongList[11] > 0 && mahjongList[19] > 0 && mahjongList[mahjongValue] > 0) || (mahjongValue == 19 && mahjongList[11] > 0 && mahjongList[16] > 0 && mahjongList[mahjongValue] > 0)) {
        if (mahjongList[11] < 3 && mahjongList[16] < 3 && mahjongList[19] < 3)
            resultList.push({ list: [11, 16, 19] });
    }
    if (mahjongValue < 10 && (mahjongList[mahjongValue + 10] + mahjongList[mahjongValue] >= 3) && (mahjongList[mahjongValue + 10] < 3 && mahjongList[mahjongValue] < 3)) {
        if (mahjongList[mahjongValue] == 1 && mahjongList[mahjongValue + 10] == 2) {
            resultList.push({ list: [mahjongValue, mahjongValue + 10, mahjongValue + 10] });
        } else if (mahjongList[mahjongValue] == 2 && mahjongList[mahjongValue + 10] == 1) {
            resultList.push({ list: [mahjongValue, mahjongValue, mahjongValue + 10] });
        } else if (mahjongList[mahjongValue] == 2 && mahjongList[mahjongValue + 10] == 2) {
            resultList.push({ list: [mahjongValue, mahjongValue + 10, mahjongValue + 10] });
            resultList.push({ list: [mahjongValue, mahjongValue, mahjongValue + 10] });
        }
    }
    if (mahjongValue >= 10 && (mahjongList[mahjongValue - 10] + mahjongList[mahjongValue] >= 3) && (mahjongList[mahjongValue - 10] < 3 && mahjongList[mahjongValue] < 3)) {
        if (mahjongList[mahjongValue] == 1 && mahjongList[mahjongValue - 10] == 2) {
            resultList.push({ list: [mahjongValue, mahjongValue - 10, mahjongValue - 10] });
        } else if (mahjongList[mahjongValue] == 2 && mahjongList[mahjongValue - 10] == 1) {
            resultList.push({ list: [mahjongValue, mahjongValue, mahjongValue - 10] });
        } else if (mahjongList[mahjongValue] == 2 && mahjongList[mahjongValue - 10] == 2) {
            resultList.push({ list: [mahjongValue, mahjongValue - 10, mahjongValue - 10] });
            resultList.push({ list: [mahjongValue, mahjongValue, mahjongValue - 10] });
        }
    }
    if (resultList.length == 0) return false;
    for (var i = 0; i < resultList.length; i++) {
        var biCardList = [].concat(mahjongList);
        for (var j = 0; j < resultList[i].list.length; j++) {
            biCardList[resultList[i].list[j]]--;
        }
        if (biCardList[mahjongValue] > 0) {
            var checkRes = checkBi(biCardList, mahjongValue);
            if (checkRes == false) {
                return false;
            } else {
                resultList[i].biList = checkRes;
            }
        }
    }
    return resultList;
}
//判断是否为下家
exports.isNextDesk = function (myDesk, otherDesk) {
    if (myDesk == 3 && otherDesk == 1) return true;
    return (otherDesk - myDesk) == 1;
}

//将服务器数据转换为显示数据
exports.getMahData = function (mahjongValue, pos = -1) {
    return getMahDataInner(mahjongValue, pos);
}
//得到服务器需要的数据
exports.getMahjongValue = function (paiData) {
    var mahjongValue = (paiData.type - 1) * 10 + (paiData.number - 1);
    return mahjongValue;
}
//将服务器数据转换为显示数据
function getMahDataInner(mahjongValue, pos = -1) {
    var mahData = {};
    mahData.type = Math.floor(mahjongValue / 10) + 1;
    mahData.number = (mahjongValue % 10) + 1;
    mahData.pos = pos;
    return mahData;
}

function getResultFanInner(handCardList, specialCardList, wintype, lastPlayCard = -1, istianhu = false, isHaidiHu = false) {
    return module.exports.getResultFan(handCardList, specialCardList, wintype, lastPlayCard, istianhu, isHaidiHu)
}
//牌型判断
exports.getResultFan = function (handCardList, specialCardList, wintype, lastPlayCard = -1, istianhu = false, isHaidiHu = false) {
    var result = {};
    var allResult = [];
    var checkList = [].concat(handCardList);
    if (lastPlayCard != -1) checkList[lastPlayCard]++;
    var handcardWinList = getWinMahJongList(checkList, specialCardList, istianhu);
    if ((handcardWinList && handcardWinList.length == 0) || !handcardWinList) return null;

    var huxiNum = 0;
    var hongNumber = 0; //红字个数
    var daNumber = 0; //大字个数
    var xiaoNumber = 0; //小字个数
    var duiNumber = 0; //碰碰胡个数
    for (var i = 0; i < checkList.length; i++) {
        if (i == 1 || i == 6 || i == 9 || i == 11 || i == 16 || i == 19) {
            hongNumber += checkList[i];
        }
        if (i < 10)
            xiaoNumber += checkList[i];
        else
            daNumber += checkList[i];
    }
    for (var i = 0; i < specialCardList.length; i++) {
        for (var j = 0; j < specialCardList[i].moArr.length; j++) {
            if (specialCardList[i].moArr[j] == 1 || specialCardList[i].moArr[j] == 6 || specialCardList[i].moArr[j] == 9 || specialCardList[i].moArr[j] == 11 || specialCardList[i].moArr[j] == 16 || specialCardList[i].moArr[j] == 19)
                hongNumber++;
            if (specialCardList[i].moArr[j] < 10)
                xiaoNumber++;
            else
                daNumber++;
        }
        if (specialCardList[i].action == 2) {
            duiNumber++;
            if (specialCardList[i].moArr[0] < 10)
                huxiNum += 1;
            else
                huxiNum += 3;
        } else if (specialCardList[i].action == 3) {
            duiNumber++;
            if (specialCardList[i].moArr[0] < 10)
                huxiNum += 3;
            else
                huxiNum += 6;
        } else if (specialCardList[i].action == 4) {
            duiNumber++;
            if (specialCardList[i].moArr[0] < 10)
                huxiNum += 9;
            else
                huxiNum += 12;
        } else if (specialCardList[i].action == 5) {
            duiNumber++;
            if (specialCardList[i].moArr[0] < 10)
                huxiNum += 6;
            else
                huxiNum += 9;
        } else if (specialCardList[i].action == 1) {
            if ((specialCardList[i].moArr[0] == 0 && specialCardList[i].moArr[1] == 1 && specialCardList[i].moArr[2] == 2) || (specialCardList[i].moArr[0] == 1 && specialCardList[i].moArr[1] == 6 && specialCardList[i].moArr[2] == 9)) {
                huxiNum += 3;
            } else if ((specialCardList[i].moArr[0] == 10 && specialCardList[i].moArr[1] == 11 && specialCardList[i].moArr[2] == 12) || (specialCardList[i].moArr[0] == 11 && specialCardList[i].moArr[1] == 16 && specialCardList[i].moArr[2] == 19)) {
                huxiNum += 6;
            }
        }
    }
    var shouList = [];
    if (!istianhu) {
        for (var i = 0; i < checkList.length; i++) {
            if (checkList[i] == 3) {
                duiNumber++;
                if (i < 10) {
                    huxiNum += 3;
                } else {
                    huxiNum += 6;
                }
                var actionData = {};
                actionData.action = 10;
                actionData.moArr = [i, i, i];
                shouList.push(actionData);
            } else if (checkList[i] == 4) {
                duiNumber++;
                if (i < 10) {
                    huxiNum += 6;
                } else {
                    huxiNum += 9;
                }
                var actionData = {};
                actionData.action = 5;
                actionData.moArr = [i, i, i, i];
                shouList.push(actionData);
            }
        }
    }

    for (var i = 0; i < handcardWinList.length; i++) {
        var tempResult = {};
        tempResult.fanList = [];
        tempResult.huxiNum = huxiNum;
        tempResult.duiNumber = duiNumber;
        tempResult.shouList = shouList;
        tempResult.fan = 1;
        var moList = handcardWinList[i].menList;
        for (var j = 0; j < moList.length; j++) {
            if (moList[j].length == 4 && moList[j][0] == moList[j][1] && moList[j][1] == moList[j][2] && moList[j][2] == moList[j][3]) {
                tempResult.duiNumber++;
                if (moList[j][0] < 10) {
                    tempResult.huxiNum += 9;
                } else {
                    tempResult.huxiNum += 12;
                }
                var actionData = {};
                actionData.action = 4;
                actionData.moArr = moList[j];
                tempResult.shouList.push(actionData);
            } else if (moList[j][0] == moList[j][1] && moList[j][1] == moList[j][2]) {
                tempResult.duiNumber++;
                if (moList[j][0] < 10) {
                    tempResult.huxiNum += 3;
                } else {
                    tempResult.huxiNum += 6;
                }
                var actionData = {};
                actionData.action = 10;
                actionData.moArr = moList[j];
                tempResult.shouList.push(actionData);
            } else if ((moList[j][0] == 0 && moList[j][1] == 1 && moList[j][2] == 2) || (moList[j][0] == 1 && moList[j][1] == 6 && moList[j][2] == 9)) {
                tempResult.huxiNum += 3;
                var actionData = {};
                actionData.action = 11;
                actionData.moArr = moList[j];
                tempResult.shouList.push(actionData);
            } else if ((moList[j][0] == 10 && moList[j][1] == 11 && moList[j][2] == 12) || (moList[j][0] == 11 && moList[j][1] == 16 && moList[j][2] == 19)) {
                tempResult.huxiNum += 6;
                var actionData = {};
                actionData.action = 11;
                actionData.moArr = moList[j];
                tempResult.shouList.push(actionData);
            } else if ((moList[j][0] == moList[j][1] && (moList[j][0] == moList[j][2] + 10 || moList[j][0] == moList[j][2] - 10)) ||
                (moList[j][1] == moList[j][2] && (moList[j][1] == moList[j][0] + 10 || moList[j][1] == moList[j][0] - 10))) {
                var actionData = {};
                actionData.action = 12;
                actionData.moArr = moList[j];
                tempResult.shouList.push(actionData);
            } else if (moList[j].length == 2 && moList[j][0] == moList[j][1]) {
                tempResult.duiNumber++;
                var actionData = {};
                actionData.action = 13;
                actionData.moArr = moList[j];
                tempResult.shouList.push(actionData);
            } else {
                var actionData = {};
                actionData.action = 11;
                actionData.moArr = moList[j];
                tempResult.shouList.push(actionData);
            }
        }
        if (tempResult.huxiNum < 15) continue;
        if (istianhu) {
            tempResult.fanList.push(structData.TH);
            if (handcardWinList[i].specialHu) {
                tempResult.fan += 6;
                tempResult.specialHu = true;
            } else {
                tempResult.huxiNum *= 2;
            }
        }
        tempResult.baseScore = Math.floor((tempResult.huxiNum - 12) / 3); //底分
        if (wintype == 1) {
            tempResult.baseScore++;
            tempResult.fanList.push(structData.ZM);
        }
        if (hongNumber == 4 || hongNumber == 7 || (hongNumber > 10 && hongNumber < 13)) {
            tempResult.fanList.push(structData.HH);
            tempResult.fan += fanConfig[structData.HH];
        }
        if (hongNumber == 1) {
            tempResult.fanList.push(structData.ZDH);
            tempResult.fan += fanConfig[structData.ZDH];
        }
        if (hongNumber == 10) {
            tempResult.fanList.push(structData.JDH);
            tempResult.fan += fanConfig[structData.JDH];
        }
        if (hongNumber >= 13) {
            tempResult.fanList.push(structData.HW);
            tempResult.fan += (fanConfig[structData.HW] + (hongNumber - 13));
        }
        if (hongNumber == 0) {
            tempResult.fanList.push(structData.WH);
            tempResult.fan += fanConfig[structData.WH];
        }
        if (tempResult.duiNumber == 7) {
            tempResult.fanList.push(structData.DDH);
            tempResult.fan += fanConfig[structData.DDH];
        }
        if (daNumber >= 18) {
            tempResult.fanList.push(structData.DH);
            tempResult.fan += (fanConfig[structData.DH] + (daNumber - 18));
        }
        if (xiaoNumber >= 16) {
            tempResult.fanList.push(structData.XH);
            tempResult.fan += (fanConfig[structData.XH] + (xiaoNumber - 16));
        }
        if (tempResult.fan > 1) tempResult.fan -= 1;
        if (isHaidiHu) {
            tempResult.fanList.push(structData.HDH);
            tempResult.fan += (tempResult.fan > 1) ? 2 : 1;
        }
        allResult.push(tempResult);
    }
    allResult.sort(function (a, b) {
        return (a.fan * a.baseScore) > (b.fan * b.baseScore) ? -1 : 1;
    })
    return allResult.length > 0 ? allResult[0] : null;
}