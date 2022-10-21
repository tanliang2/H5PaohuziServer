'use strict';
import botmanager from './botmanager';
var structData = require("./../config/structdata");
var upGradeLogic = require("./../logic/upgradelogic");
var eventDispatcher = require("./../controller/eventdispatcher");
export default class extends think.base {
    init(roomId, roomType = 1) {
        this.roomID = roomId;
        this.roomName = "";
        this.roomsetData = null;
        this.roomStation = structData.ROOM_ST_WAIT_JOIN; //游戏状态
        this.userList = {}; //房间里的用户信息列表
        this.mahjongStore = []; //剩余的牌
        this.zDeskStation = -1; //庄家位置
        this.isGaming = false; //是否处于游戏中
        this.gameType = upGradeLogic.TYPE_NORMAL;
        this.doSpcialUserList = []; //需要处理特殊情况的玩家列表
        this.lastPlayedCard = -1; //记录最后一张出的牌，用来处理特殊情况
        this.waitDoSpecialNum = 0; //待处理特殊情况数量，优先级为胡 > 碰/杠 > 吃
        this.waitDoSpecialList = {}; //待处理特殊情况列表
        this.currtPlayUser = 0; //最后出牌的玩家
        this.currtCatchUser = 0; //当前抓牌的玩家
        this.maxRound = 2;
        this.currentRound = 1; //当前进行的圈数
        this.roundIndex = 1; //当前圈进度
        this.roomType = roomType; //房间类型 1 房卡房间 2 普通房间 3 中级场 4 高级场
        this.panNum = 0;
        this.isDissing = false; //玩家是否在投票解散房间
        this.playback = {}; //本局回放数据
        this.liangzhang = -1; //亮张的牌
        this.tihuList = []; //天胡列表
        this.startTiList = {}; //开局提牌列表
        this.skipList = {}; //特殊操作选择过的玩家
        this.inBeforPlay = true; //是否处于开局处理阶段
    }
    //获取一个空闲的座位
    getFreeDesk() {
        for (var i = 1; i < 4; i++) {
            if (!this.userList[i]) {
                return i;
            }
        }
    }
    //用户进入房间
    addUser(roomUser, isreback = false) {
        if (!isreback) {
            var userPos = -1;
            for (var i = 1; i < 4; i++) {
                if (!this.userList[i]) {
                    this.userList[i] = roomUser;
                    userPos = i;
                    break;
                }
            }
        }
        var res = {};
        res.rules = [];
        res.infos = [];
        res.uid = roomUser.user.uid;
        for (var k in this.userList) {
            var userInfo = {};
            userInfo.nick = this.userList[k].user.nickName;
            userInfo.pic = this.userList[k].user.iconUrl;
            userInfo.pos = Number(k);
            userInfo.uid = this.userList[k].user.uid;
            userInfo.sex = this.userList[k].user.sexNum;
            userInfo.game_times = 1;
            userInfo.drop_rate = 0;
            userInfo.ip = this.userList[k].isbot ? this.userList[k].getRandonIp() : this.userList[k].socket.handshake.address.substr(7);
            userInfo.isReady = this.userList[k].currentState == structData.GAME_ST_READY;
            if (this.userList[k].isOutline)
                userInfo.status = "offline";
            else
                userInfo.status = "online";
            res.infos.push(userInfo);
        }
        var userCount = 0;
        for (var k in this.userList) {
            this.userList[k].onUserIn(res);
            userCount++;
        }
        if (userCount == 3 && this.roomStation == structData.ROOM_ST_WAIT_JOIN) {
            if (this.roomType == 1)
                this.roomStation = structData.ROOM_ST_WAIT_START;
            else
                this.checkStart();
        }

    }
    //添加一个机器人
    addBot() {
        var userPos = -1;
        for (var i = 1; i < 4; i++) {
            if (!this.userList[i]) {
                userPos = i;
                break;
            }
        }
        if (userPos == -1) return;
        var bot = new botmanager(this.roomID, this, userPos);
        this.userList[userPos] = bot;
        var res = {};
        res.rules = [];
        res.infos = [];
        res.uid = bot.user.uid;
        for (var k in this.userList) {
            var userInfo = {};
            userInfo.nick = this.userList[k].user.nickName;
            userInfo.pic = this.userList[k].user.iconUrl;
            userInfo.pos = Number(k);
            userInfo.uid = this.userList[k].user.uid;
            userInfo.sex = this.userList[k].user.sexNum;
            userInfo.game_times = 1;
            userInfo.drop_rate = 0;
            userInfo.ip = this.userList[k].isbot ? this.userList[k].getRandonIp() : this.userList[k].socket.handshake.address.substr(7);
            userInfo.isReady = this.userList[k].currentState == structData.GAME_ST_READY;
            if (this.userList[k].isOutline)
                userInfo.status = "offline";
            else
                userInfo.status = "online";
            res.infos.push(userInfo);
        }
        var userCount = 0;
        for (var k in this.userList) {
            this.userList[k].onUserIn(res);
            userCount++;
        }
        if (userCount == 3 && this.roomStation == structData.ROOM_ST_WAIT_JOIN) {
            if (this.roomType == 1)
                this.roomStation = structData.ROOM_ST_WAIT_START;
            else
                this.checkStart();
        }
    }
    //有用户离开房间
    async userLeaveRoom(deskStation) {
        if (!this.userList) return;
        if (!this.userList[deskStation]) return;
        //如果是房主的话房间解散
        if (deskStation == 1 && !this.isGaming && this.roomType == 1) {
            var roundList = { 24: 12, 12: 6, 6: 4 };
            if (this.userList[1]) {
                let userModel = think.model('user', think.config('db'), 'home');
                await userModel.setUserRoomcard(this.userList[1].user.uid, roundList[this.maxRound], 3);
            }
            this.dissovlerRoom();
            return;
        }
        var res = {};
        res.rules = [];
        res.infos = [];
        res.uid = this.userList[deskStation].user.uid;
        for (var k in this.userList) {
            var userInfo = {};
            userInfo.nick = this.userList[k].user.nickName;
            userInfo.pic = this.userList[k].user.iconUrl;
            userInfo.pos = Number(k);
            userInfo.uid = this.userList[k].user.uid;
            userInfo.sex = this.userList[k].user.sexNum;
            userInfo.game_times = 1;
            userInfo.drop_rate = 0;
            userInfo.ip = this.userList[k].isbot ? this.userList[k].getRandonIp() : this.userList[k].socket.handshake.address.substr(7);
            userInfo.isReady = this.userList[k].currentState == structData.GAME_ST_READY;
            if (k == deskStation) {
                if (!this.isGaming)
                    userInfo.status = "leave";
                else
                    userInfo.status = "offline";
            } else {
                if (this.userList[k].isOutline)
                    userInfo.status = "offline";
                else
                    userInfo.status = "online";
            }
            res.infos.push(userInfo);
        }
        for (var k in this.userList) {
            if (k != deskStation)
                this.userList[k].onUserLeave(res);
        }
        if (!this.isGaming) {
            if (!this.userList[deskStation].isbot)
                this.userList[deskStation].socket.leave(this.roomID);
            this.userList[deskStation].dispose();
            this.userList[deskStation] = null;
            delete this.userList[deskStation];
        }
        if (this.getUserCount(false) == 0) {
            this.dissovlerRoom();
            return;
        }
        if (this.roomType != 1 && !this.isGaming) {
            this.roomStation = structData.ROOM_ST_WAIT_JOIN;
            this.currentRound = 1; //当前进行的圈数
            this.roundIndex = 1; //当前圈进度
            for (var k in this.userList) {
                this.userList[k].resetRoundRecord();
            }
        }
    }
    //轮到玩家出牌
    onUserTrun(deskStation) {
        for (var k in this.userList) {
            this.userList[k].socket.emit("allowPushCard", deskStation);
        }
    }
    //获取房间用户数量
    getUserCount(withBot = true) {
        var userCount = 0;
        for (var k in this.userList) {
            if (!withBot) {
                if (!this.userList[k].isbot)
                    userCount++;
            } else {
                userCount++;
            }
        }
        return userCount;
    }
    //用户解散房间投票
    onUserDissRoom() {
        this.isDissing = true;
        var res = {};
        var now = new Date();
        res.time = now.getTime();
        res.vote = {};
        var dissNumber = 0;
        var agreeNum = 0;
        for (var k in this.userList) {
            if(this.userList[k].isOutline)
            {
                this.userList[k].dissRoomAnswer = 1;
            }
            res.vote[this.userList[k].user.uid] = this.userList[k].dissRoomAnswer;
            if (this.userList[k].dissRoomAnswer != -1 || this.userList[k].isOutline) dissNumber++;
            if (this.userList[k].dissRoomAnswer == 1 || this.userList[k].isOutline) agreeNum++;
        }
        for (var k in this.userList) {
            if (!this.userList[k].isbot)
                this.userList[k].socket.emit("onDissRoom", res);
            if (dissNumber >= 3) {
                this.userList[k].dissRoomAnswer = -1;
                this.isDissing = false;
            }
        }
        if (agreeNum >= 3) {
            var that = this;
            setTimeout(function () {
                if (that.panNum == 0) {
                    that.dissovlerRoom();
                }
                else
                    that.gameover();
            }, 800);
        }

    }
    //解散房间
    dissovlerRoom() {
        for (var k in this.userList) {
            if (!this.userList[k].isbot) {
                this.userList[k].socket.emit("roomDissovled");
                this.userList[k].socket.leave(this.roomID);
            }
            this.userList[k].dispose();
            this.userList[k] = null;
            delete this.userList[k];
        }
        this.userList = null;
        if (upGradeLogic.socketioProxy)
            upGradeLogic.socketioProxy.dissovleRoom(this.roomID);
        //  eventDispatcher.eventEmitter.emit("dissovleRoom", this.roomID);
    }
    //检查是否开始游戏
    checkStart(readypos = -1) {
        // var userNum = 0;
        // for (var k in this.userList) {
        //     if (this.userList[k].currentState != structData.GAME_ST_READY) {
        //         return false;
        //     }
        //     userNum++;
        // }
        // if (userNum == 3)
        //     this.startGame();
        // return true;
        var userNum = 0;
        for (var k in this.userList) {
            if (this.userList[k].currentState == structData.GAME_ST_READY) {
                userNum++;
            }
        }
        if (readypos != -1) {
            for (var k in this.userList) {
                this.userList[k].socket.emit("userReady", readypos);
            }
        }
        if (userNum == 3) {
            if (this.roomType != 1)
                this.startGame();
            else
                this.userList[1].socket.emit("allready");
        }
        return true;
    }
    //牌局开始的提牌检测
    checkStartTi() {
        for (var k in this.userList) {
            this.userList[k].checkStartTi();
            this.userList[k].autoTi();
        }
        var userTiList = [];
        for (var k in this.startTiList) {
            if (this.startTiList[k].length > 0) {
                var tiData = {};
                tiData.pos = k;
                tiData.list = this.startTiList[k];
                userTiList.push(tiData);
            }
        }
        if (userTiList.length > 0) {
            var cur = {};
            for (var k in this.userList) {
                cur[k] = this.userList[k].huxiNum;
            }
            for (var k in this.userList) {
                this.userList[k].socket.emit("startTi", userTiList, cur);
            }
        } else {
            for (var k in this.userList) {
                this.userList[k].socket.emit("firstPlay");
            }
        }
        if (this.userList[this.zDeskStation] && !this.userList[this.zDeskStation].skipPlay) {
            //this.userList[this.zDeskStation].socket.emit("allowPushCard");
            this.onUserTrun(this.zDeskStation);
        } else {
            var that = this;
            setTimeout(function () {
                that.changeToNext();
            }, 2000);
        }
        this.inBeforPlay = false;
    }
    //开始游戏
    startGame() {
        //圈数结束
        if (this.currentRound > this.maxRound && this.roomType == 1) {
            this.gameover();
            return;
        }
        if (this.roomType != 1) {
            var hasobj = { 1: "roomcard", 2: "normal", 3: "middle", 4: "hight" };
            var roomcfg = think.config("roomcfg");
            var cfgData = roomcfg[hasobj[this.roomType]];
            var limit = cfgData.limit;
            var lackCoinList = [];
            for (var k in this.userList) {
                if (this.userList[k].user.currency < limit) {
                    lackCoinList.push(k);
                }
            }
            if (lackCoinList.length > 0) {
                this.gameover(lackCoinList);
                return;
            }
        }

        var setMahjongData = upGradeLogic.socketioProxy ? upGradeLogic.socketioProxy.getRoomSetMahList(this.roomID) : null; //测试设置的数据
        if (setMahjongData) {
            this.mahjongStore = setMahjongData.mahjongSetList;
        } else {
            //upGradeLogic.getAllMahjong(this.gameType);
            this.mahjongStore = upGradeLogic.getAllMahjong(this.gameType);//[3,4, 4,4, 4, 5, 5, 15, 7, 8, 9, 10, 10, 11,11, 12,13,16, 17, 17, 0,9, 2, 2, 5, 6, 7, 7, 10, 11,12,13, 13, 13, 16, 17, 17, 18, 18, 19, 19, 9,2, 1, 2, 3, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,3, 1, 2, 3, 5, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        }

        var szPoint = Math.floor(Math.random() * 11) + 2;
        if (this.zDeskStation == -1) this.zDeskStation = 1 + szPoint % 3;
        if (setMahjongData) {
            this.zDeskStation = setMahjongData.setZhuang;
        }
        this.currtCatchUser = this.zDeskStation;
        var roomdata = {};
        roomdata.roomid = this.roomID;
        roomdata.roomType = this.roomType;
        roomdata.zDeskStation = this.zDeskStation;
        this.playback.roomdata = roomdata;
        this.playback.initialCard = {};
        this.playback.userList = {};
        this.playback.actionList = [];
        for (var k in this.userList) {
            var cardNum = (k == this.zDeskStation) ? 21 : 20;
            for (var i = 0; i < cardNum; i++) {
                var cardValue = this.mahjongStore.shift();
                this.userList[k].mahjongList[cardValue]++;
                if (i == 20) this.liangzhang = cardValue;
            }
        }
        this.lastPlayedCard = this.liangzhang;
        for (var k in this.userList) {

            var mahDataList = [];
            for (var i = 0; i < this.userList[k].mahjongList.length; i++) {
                if (this.userList[k].mahjongList[i] > 0) {
                    for (var j = 0; j < this.userList[k].mahjongList[i]; j++) {
                        var mahData = upGradeLogic.getMahData(i);
                        mahDataList.push(mahData);
                    }
                }
            }
            this.playback.initialCard[k] = mahDataList;
            this.playback.userList[k] = this.userList[k].user;
            this.userList[k].startGame(szPoint, this.zDeskStation);
        }
        this.isGaming = true;
        this.roomStation = structData.ROOM_ST_WAIT_PLAY;
        this.currentRound++;
    }
    //游戏结束
    gameover(gapMoneyList = []) {
        var res = {};
        res.persons = {};
        res.settlement = {};
        for (var k in this.userList) {
            var person = {};
            person.nick = this.userList[k].user.nickName;
            person.pic = this.userList[k].user.iconUrl;
            person.pao_num = this.userList[k].pao_num;
            person.pos = k;
            person.new_card = 0;
            person.zhuang_num = this.userList[k].zhuang_num;
            person.hu_num = this.userList[k].hu_num;
            person.cur = this.userList[k].totalScore;
            res.settlement[k] = this.userList[k].totalScore;
            res.persons[k] = person;
        }
        var islackcoin = gapMoneyList.length > 0 ? true : false;
        for (var k in this.userList) {
            var islack = gapMoneyList.indexOf(k) != -1;
            if (!this.userList[k].isbot) {
                this.userList[k].socket.emit("gameover", res, islackcoin, islack);
                this.userList[k].socket.leave(this.roomID);
            }
            this.userList[k].dispose();
            this.userList[k] = null;
            delete this.userList[k];
        }

        this.panNum = 0;
        if (this.getUserCount(false) == 0) {
            this.dissovlerRoom();
        }
    }
    //玩家出牌
    userPlayCard(deskStation, mahjongValue, iscanWei = false, isauto = false) {
        this.skipList = {}; //特殊操作选择过的玩家
        this.lastPlayedCard = mahjongValue;
        this.currtPlayUser = deskStation;
        //回放动作数据
        var actionData = { action: 100, pos: deskStation, cardVal: mahjongValue };
        this.playback.actionList.push(actionData);
        var resData = {};
        resData.deskStation = deskStation;
        resData.mahjongValue = mahjongValue;
        resData.isauto = isauto;
        resData.iscanWei = iscanWei;
        resData.remainPai = this.mahjongStore.length;
        this.waitDoSpecialNum = 0;
        this.doSpcialUserList = [];
        for (var k in this.userList) {
            this.waitDoSpecialList[k] = {};
            if (!this.userList[k].isbot)
                this.userList[k].socket.emit("onPlayCard", resData);
            if (!isauto) {
                if (k != deskStation) this.userList[k].checkSpecial(deskStation, mahjongValue, isauto);
            } else {
                if (iscanWei) {
                    if (k == this.currtCatchUser) {
                        this.userList[k].checkSpecial(deskStation, mahjongValue, isauto);
                    }
                } else {
                    this.userList[k].checkSpecial(deskStation, mahjongValue, isauto);
                }

            }
        }
        if (this.waitDoSpecialNum == 0) {
            var that = this;
            setTimeout(function () {
                that.userList[that.currtPlayUser].historyList.push(mahjongValue);
                var res = {};
                res.deskStation = that.currtPlayUser;
                res.pai = mahjongValue;
                for (var k in that.userList) {
                    if (!that.userList[k].isbot)
                        that.userList[k].socket.emit("poolPai", res);
                }
                that.changeToNext();
            }, 2000);

        } else {
            for (var k in this.userList) {
                if (!this.userList[k].isbot)
                    this.userList[k].socket.emit("showTips");
            }
        }
    }
    //下一位玩家抓牌
    changeToNext() {
        var nextStation = (this.currtPlayUser == 3 ? 1 : this.currtPlayUser + 1);
        this.currtCatchUser = nextStation;
        //流局
        if (this.mahjongStore.length == 0) {
            this.gameEndWithHe();
            return;
        }
        var cardValue = this.mahjongStore.shift();
        var iscanWei = upGradeLogic.checkPeng(this.userList[this.currtCatchUser].mahjongList, cardValue);
        this.userPlayCard(this.currtCatchUser, cardValue, iscanWei, true);

        // for (var k in this.userList) {
        //     if (nextStation == k) {
        //         this.userList[k].setState(structData.GAME_ST_GETCARD);
        //     }
        // }
    }
    //用户发送聊天消息
    onUserChat(chatObj) {
        for (var k in this.userList) {
            if (!this.userList[k].isbot)
                this.userList[k].socket.emit("onUserChat", chatObj);
        }
    }
    //房主踢人
    onKickUser(pos) {
        if (!this.userList[pos]) return;
        if (!this.userList[pos].isbot) {
            this.userList[pos].socket.leave(this.roomID);
            this.userList[pos].socket.emit("onKicked");
        }
        this.userLeaveRoom(pos);

    }
    //玩家听牌
    onUserTing(pos) {
        var res = {};
        res.pos = pos;
        res.action = 4;
        for (var k in this.userList) {
            if (!this.userList[k].isbot)
                this.userList[k].socket.emit("userTing", res);
        }
    }
    //玩家放弃处理特殊情况
    userSkipSpecial(deskStation) {
        this.waitDoSpecialNum--;
        // if (this.waitDoSpecialList[deskStation] && (this.waitDoSpecialList[deskStation].canChi || this.waitDoSpecialList[deskStation].canPeng)) {
        //     this.userList[deskStation].choupaiList.push(this.lastPlayedCard);
        // }
        if(this.waitDoSpecialList[deskStation] && this.waitDoSpecialList[deskStation].canPeng)
            this.skipList[deskStation] = 2;
        if(this.waitDoSpecialList[deskStation] && !this.waitDoSpecialList[deskStation].canPeng && this.waitDoSpecialList[deskStation].canChi)
            this.skipList[deskStation] = 1;
        
        if(this.waitDoSpecialList[deskStation] && this.waitDoSpecialList[deskStation].canHu)
        {
            this.userList[deskStation].chouHuList[this.lastPlayedCard] = this.userList[deskStation].huxiNum;
        }
        //   console.log("还需要执行的特殊情况数量：" + this.waitDoSpecialNum);
        delete this.waitDoSpecialList[deskStation];
        if(this.userList[deskStation].waitForHu != -1)
        {
            this.userList[deskStation].doSkipHu();
            return;
        }
        // for (var i = 0; i < this.doSpcialUserList.length; i++) {
        //     if (this.doSpcialUserList[i].deskStation == deskStation) {
        //         this.doSpcialUserList.splice(i, 1);
        //         break;
        //     }
        // }
        if (this.waitDoSpecialNum <= 0) {
            if (this.doSpcialUserList.length > 0)
            {
                this.userDoSpecial();
            } else {
                if(this.inBeforPlay)
                {
                    this.doSpcialUserList = [];
                    this.waitDoSpecialNum = 0;
                    this.waitDoSpecialList = {};
                    this.checkStartTi();
                    return;
                }
                for(var k in this.skipList)
                {
                    this.userList[k].choupaiList.push(this.lastPlayedCard);
                }
                var that = this;
                setTimeout(function () {
                    that.userList[that.currtPlayUser].historyList.push(that.lastPlayedCard);
                    var res = {};
                    res.deskStation = that.currtPlayUser;
                    res.pai = that.lastPlayedCard;
                    for (var k in that.userList) {
                        if (!that.userList[k].isbot)
                            that.userList[k].socket.emit("poolPai", res);
                    }
                    that.changeToNext();
                }, 800);
                //  this.changeToNext();
            }

        }
    }
    //处理可能多个玩家的特殊情况
    userDoSpecial(deskStation = -1, actionType = -1) {
        if (deskStation != -1 && this.waitDoSpecialList[deskStation] && this.waitDoSpecialNum > 0) {
            this.waitDoSpecialList[deskStation].isdone = true;
            if (this.waitDoSpecialList[deskStation].canHu && actionType == 6) {
                var otherCanHu = false;
                for (var k in this.waitDoSpecialList) {
                    if (+k != deskStation && this.waitDoSpecialList[k].canHu && !this.waitDoSpecialList[k].isdone ) {
                        if(+k == +this.currtCatchUser)
                        {
                            otherCanHu = true;
                            break;
                        }
                        else{
                            if(upGradeLogic.isNextDesk(this.currtCatchUser,k))
                            {
                                otherCanHu = true;
                                break;
                            }
                        }
                    }
                }
                if (!otherCanHu) {
                    var winList = [];
                    for (var i = 0; i < this.doSpcialUserList.length; i++) {
                        if (this.doSpcialUserList[i].type == 6) {
                            winList.push(this.doSpcialUserList[i].deskStation);
                        }
                    }
                    if (winList.length > 0) {
                        if (winList.indexOf(this.currtCatchUser) != -1) {
                            this.countResult([this.currtCatchUser]);
                        } else {
                            // winList.sort(function (a, b) {
                            //     return (a > b) ? -1 : 1;
                            // });
                            if(winList.length == 1)
                                this.countResult([winList[0]]);
                            else if(winList.length == 2)
                            {
                                var winUser = this.currtCatchUser + 1 > 3 ? 1 : this.currtCatchUser + 1;
                                this.countResult([winUser]);
                            }
                        }
                    }
                    return;
                }
            } else if (actionType == 2 || actionType == 3 || actionType == -3 || actionType == 4 || actionType == 5) {
                var needWait = false;
                for (var k in this.waitDoSpecialList) {
                    if (+k != deskStation && this.waitDoSpecialList[k].canHu && !this.waitDoSpecialList[k].isdone) {
                        needWait = true;
                        break;
                    }
                }
                if (!needWait) {
                    var doSpecialData;
                    for (var i = 0; i < this.doSpcialUserList.length; i++) {
                        if (this.doSpcialUserList[i].deskStation == deskStation) {
                            doSpecialData = this.doSpcialUserList[i];
                            break;
                        }
                    }
                    for (var k in this.skipList) {
                        if (this.skipList[k] == 2) {
                            this.userList[k].choupaiList.push(this.lastPlayedCard);
                        } else {
                            if (doSpecialData.type < this.skipList[k]) {
                                this.userList[k].choupaiList.push(this.lastPlayedCard);
                            } else if (doSpecialData.type == this.skipList[k] && this.skipList[k] == 1) {
                                if (+k == +this.currtCatchUser) {
                                    this.userList[k].choupaiList.push(this.lastPlayedCard);
                                }
                            }
                        }
                    }
                    this.userList[deskStation].exectueSpecial(doSpecialData, this.lastPlayedCard);
                    this.doSpcialUserList = [];
                    this.waitDoSpecialNum = 0;
                    this.waitDoSpecialList = {};
                    return;
                }
            }else if(actionType == 1)
            {
                var needWait = false;
                for (var k in this.waitDoSpecialList) {
                    if(+k != deskStation && (this.waitDoSpecialList[k].canHu || this.waitDoSpecialList[k].canPao ||this.waitDoSpecialList[k].canTi ||this.waitDoSpecialList[k].canWei ||this.waitDoSpecialList[k].canPeng))
                    {
                        needWait = true;
                        break;
                    }
                    if(+k != deskStation && this.waitDoSpecialList[k].canChi)
                    {
                        if(+k == +this.currtCatchUser)
                        {
                            needWait = true;
                            break;
                        }
                    }
                }
                if(!needWait)
                {
                    var doSpecialData;
                    for (var i = 0; i < this.doSpcialUserList.length; i++) {
                        if (this.doSpcialUserList[i].deskStation == deskStation) {
                            doSpecialData = this.doSpcialUserList[i];
                            break;
                        }
                    }
                    for (var k in this.skipList) {
                        if (this.skipList[k] == 2) {
                            this.userList[k].choupaiList.push(this.lastPlayedCard);
                        } else {
                            if (doSpecialData.type < this.skipList[k]) {
                                this.userList[k].choupaiList.push(this.lastPlayedCard);
                            } else if (doSpecialData.type == this.skipList[k] && this.skipList[k] == 1) {
                                if (+k == +this.currtCatchUser) {
                                    this.userList[k].choupaiList.push(this.lastPlayedCard);
                                }
                            }
                        }
                    }
                    this.userList[deskStation].exectueSpecial(doSpecialData, this.lastPlayedCard);
                    this.doSpcialUserList = [];
                    this.waitDoSpecialNum = 0;
                    this.waitDoSpecialList = {};
                    return;
                }
            }
        }

        if (this.waitDoSpecialNum <= 0 && this.doSpcialUserList.length > 0) {
            this.doSpcialUserList.sort(function (a, b) {
                return a.type > b.type ? -1 : 1;
            })
            var winList = [];
            var chiList = [];
            for (var i = 0; i < this.doSpcialUserList.length; i++) {
                if (this.doSpcialUserList[i].type == 6) {
                    winList.push(this.doSpcialUserList[i].deskStation);
                }
                if (this.doSpcialUserList[i].type == 1) {
                    chiList.push(this.doSpcialUserList[i].deskStation);
                }
            }
            var doSpecialData = this.doSpcialUserList[0];
            if (winList.length > 0) {
                if (winList.indexOf(this.currtCatchUser) != -1) {
                    this.countResult([this.currtCatchUser]);
                } else {
                    if (winList.length == 1)
                        this.countResult([winList[0]]);
                    else if (winList.length == 2) {
                        var winUser = this.currtCatchUser + 1 > 3 ? 1 : this.currtCatchUser + 1;
                        this.countResult([winUser]);
                    }
                }
            } else {
                if (this.doSpcialUserList.length == 2 && chiList.length == 2) {
                    for (var i = 0; i < this.doSpcialUserList.length; i++) {
                        if (+this.doSpcialUserList[i].deskStation == +this.currtCatchUser) {
                            doSpecialData = this.doSpcialUserList[i];
                            break;
                        }
                    }
                }
                for (var k in this.skipList) {
                    if (this.skipList[k] == 2) {
                        this.userList[k].choupaiList.push(this.lastPlayedCard);
                    } else {
                        if (doSpecialData.type < this.skipList[k]) {
                            this.userList[k].choupaiList.push(this.lastPlayedCard);
                        } else if (doSpecialData.type == this.skipList[k] && this.skipList[k] == 1) {
                            if (+k == +this.currtCatchUser) {
                                this.userList[k].choupaiList.push(this.lastPlayedCard);
                            }
                        }
                    }
                }
                this.userList[doSpecialData.deskStation].exectueSpecial(doSpecialData, this.lastPlayedCard);
                this.doSpcialUserList = [];
                this.waitDoSpecialNum = 0;
                this.waitDoSpecialList = {};
            }
        }
    }
    //更新玩家已经亮开的牌
    updateUserSpecialList(deskStation, action, pai, chipai) {
        for (var k in this.userList) {
            this.userList[k].updateUserSpecialList(deskStation, action, pai, chipai);
        }
    }
    //流局
    gameEndWithHe() {
        this.countResult(-1);
    }

    //统计结果,winType:0其他玩家放炮 1 自摸
    async countResult(winList,istianhu = false) {
        //回放动作数据
        // var pos = (winList == -1) ? -1 : winList[0];
        // var cardVal = this.lastPlayedCard;
        // var actData = {action:4,pos:pos,cardVal:cardVal,playPos:this.currtPlayUser};
        // this.playback.actionList.push(actData);
        // //回放数据写入数据库,并获取id
        // var playbackId = await think.model('playback', think.config('db'), 'home').addRecord(this.playback);
        // this.playback = {};

        var result = {};
        result.scoreList = {};
        result.hupai = {};
        result.hupai.pos_hu = winList != -1 ? winList[0] : -1;
        result.person = [];
        this.panNum++;
        this.userList[this.zDeskStation].zhuang_num++;
        var hasobj = { 1: "roomcard", 2: "normal", 3: "middle", 4: "hight" };
        var roomcfg = think.config("roomcfg");
        var cfgData = roomcfg[hasobj[this.roomType]];
        var baseScore = cfgData.baseScore;

        var winType = (winList != -1 && winList[0] == this.currtCatchUser) ? 1 : 0;
        var winResultList = {};
        var fan = 1;
        if (winList == -1) {
            winType = -1;
            result.hupai = 0;
        } else {
            var lastPlayedCard = this.lastPlayedCard;
            var isChangeZhuang = false;
            var isHaidihu = (this.mahjongStore.length == 0);
            result.hupai.type = (winType == 0) ? 17 : 7;
            result.hupai.pai = upGradeLogic.getMahData(this.lastPlayedCard);
            for (var i = 0; i < winList.length; i++) {
                this.userList[winList[i]].hu_num++;
                var winResult = upGradeLogic.getResultFan(this.userList[winList[i]].mahjongList, this.userList[winList[i]].specialMahList, winType, lastPlayedCard,this.inBeforPlay,isHaidihu);
                if(winResult == null)
                    winResult = upGradeLogic.getResultFan(this.userList[winList[i]].mahjongList, this.userList[winList[i]].specialMahList, winType, -1 ,this.inBeforPlay,isHaidihu);
                winResultList[winList[i]] = winResult;
                if (winList[i] != this.zDeskStation && !isChangeZhuang) {
                    isChangeZhuang = true;
                    //this.roundIndex++;
                    //this.currentRound++;
                    // if (this.roundIndex > 3) {
                    //     this.currentRound++;
                    //     this.roundIndex = 1;
                    // }
                    this.zDeskStation = (this.zDeskStation == 3 ? 1 : this.zDeskStation + 1);
                }
            }
        }

        if (winList != -1) {
            for (var k in this.userList) {
                if (k == winList[0]) {
                    this.userList[k].roundScore += baseScore * 2 * winResultList[winList[0]].fan * winResultList[winList[0]].baseScore;
                    this.userList[k].huNum += 3 * winResultList[winList[0]].fan;
                } else {
                    this.userList[k].roundScore -= baseScore * winResultList[winList[0]].fan * winResultList[winList[0]].baseScore;
                    this.userList[k].huNum -= 1 * winResultList[winList[0]].fan;
                }
            }
        }

        var resultlist = {};
        for (var k in this.userList) {
            var resultData = {};
            resultData.nick = this.userList[k].user.nickName;
            resultData.gain = this.userList[k].roundScore;
            resultlist[k] = resultData;
            result.scoreList[k] = this.userList[k].roundScore;
            var pdata = {};
            pdata.pos = k;
            pdata.left = [];
            for (var i = 0; i < this.userList[k].mahjongList.length; i++) {
                for (var j = 0; j < this.userList[k].mahjongList[i]; j++) {
                    var mahData = upGradeLogic.getMahData(i);
                    pdata.left.push(mahData);
                }
            }
            pdata[2] = [];
            pdata[1] = [];
            pdata[3] = [];
            pdata[-3] = [];
            pdata[4] = [];
            pdata[5] = [];
            pdata[10] = [];
            pdata[11] = [];
            pdata[12] = [];
            pdata[13] = [];
            if (winList != -1) {
                for (var i = 0; i < this.userList[winList[0]].specialMahList.length; i++) {
                    var action = this.userList[winList[0]].specialMahList[i].action;
                    var specialList = this.userList[winList[0]].specialMahList[i].moArr;
                    pdata[action].push(specialList);
                }
                for (var i = 0; i < winResultList[winList[0]].shouList.length; i++) {
                    var action = winResultList[winList[0]].shouList[i].action;
                    var specialList = winResultList[winList[0]].shouList[i].moArr;
                    pdata[action].push(specialList);
                }
            }

            pdata.uid = this.userList[k].user.uid;
            pdata.nick = this.userList[k].user.nickName;
            if (winList != -1) {
                pdata.fan = winResultList[winList[0]].fan;
                pdata.hu_type = winResultList[winList[0]].fanList;
                pdata.huxi = winResultList[winList[0]].huxiNum;
            } else {
                pdata.fan = 0;
                pdata.hu_type = [];
                pdata.huxi = 0;
            }
            pdata.cur = this.userList[k].roundScore;
            pdata.pic = this.userList[k].user.iconUrl;
            result.person.push(pdata);
        }
        var userRecordList = [];
        for (var k in this.userList) {
            if (!this.userList[k].isbot) {
                var userData = {};
                userData.uid = this.userList[k].user.uid;
                var recordData = {};
                recordData.gain = this.userList[k].roundScore;
                recordData.resultList = resultlist;
                recordData.roomId = this.roomID;
                recordData.isWinner = (winList != -1 && winList.indexOf(Number(k)) != -1) ? true : false;
                //    recordData.paybackId = playbackId;
                userData.recordData = recordData;
                userRecordList.push(userData);
            }
            if (this.roomType != 1) {
                result.gain = this.userList[k].roundScore;
                this.userList[k].user.currency += this.userList[k].roundScore;
                this.userList[k].currentState = structData.GAME_ST_WAIT;
            }
            this.userList[k].totalScore += this.userList[k].roundScore;
            this.userList[k].showResult(result);
        }
        think.model('user', think.config('db'), 'home').updateUsersRecord(userRecordList, this.roomType);
        this.clearGame();
        this.roomStation = structData.ROOM_ST_WAIT_CONTINUE;
        if (this.roomType != 1)
            this.isGaming = false;
    }
    //断线重连
    onUserReback(uid, socket, type) {
        if (this.roomStation == structData.ROOM_ST_WAIT_START) {
            var res = {};
            res.rules = [];
            res.infos = [];
            res.uid = uid;
            var userpos = 0;
            for (var k in this.userList) {
                if (this.userList[k].user.uid == uid) {
                    userpos = k;
                }
                var userInfo = {};
                userInfo.nick = this.userList[k].user.nickName;
                userInfo.pic = this.userList[k].user.iconUrl;
                userInfo.pos = Number(k);
                userInfo.uid = this.userList[k].user.uid;
                userInfo.sex = this.userList[k].user.sexNum;
                userInfo.game_times = 1;
                userInfo.drop_rate = 0;
                userInfo.ip = this.userList[k].isbot ? this.userList[k].getRandonIp() : this.userList[k].socket.handshake.address.substr(7);
                userInfo.isReady = this.userList[k].currentState == structData.GAME_ST_READY;
                if (this.userList[k].isOutline)
                    userInfo.status = "offline";
                else
                    userInfo.status = "online";
                res.infos.push(userInfo);
            }
            this.userList[userpos].setSocket(socket);
            socket.emit("reback_wait", res);
            return;
        }
        var res = {};
        res.type = type;
        res.roomid = this.roomID;
        res.turn = this.currtCatchUser;
        res.zhuang = this.zDeskStation;
        res.dui_num = this.mahjongStore.length;
        res.cur_round = 1;
        res.max_round = 25;
        res.step = this.isGaming ? 5 : 1;
        res.status = this.roomStation;
        res.person = [];
        res.continue = [];
        res.bao = upGradeLogic.getMahData(this.bao);
        if (this.isDissing) {
            var disRes = {};
            var now = new Date();
            disRes.time = now.getTime();
            disRes.vote = {};
            for (var k in this.userList) {
                disRes.vote[this.userList[k].user.uid] = this.userList[k].dissRoomAnswer;
            }
            res.dissRes = disRes;
        }
        var userPos = 0;
        for (var k in this.userList) {
            var pdata = {};
            pdata.pos = k;
            var men = {};
            men[2] = [];
            men[1] = [];
            men[3] = [];
            men[-3] = [];
            men[4] = [];
            men[5] = [];
            for (var i = 0; i < this.userList[k].specialMahList.length; i++) {
                var action = this.userList[k].specialMahList[i].action;
                var specialList = this.userList[k].specialMahList[i].moArr;
                if (specialList.length == 3) {
                    if (specialList[0] == specialList[1]) {
                        men[action].push([upGradeLogic.getMahData(specialList[0]), upGradeLogic.getMahData(specialList[1]), upGradeLogic.getMahData(specialList[2])]);
                    } else {
                        men[1].push([upGradeLogic.getMahData(specialList[0]), upGradeLogic.getMahData(specialList[1]), upGradeLogic.getMahData(specialList[2])]);
                    }
                } else {
                    men[action].push([upGradeLogic.getMahData(specialList[0]), upGradeLogic.getMahData(specialList[1]), upGradeLogic.getMahData(specialList[2]), upGradeLogic.getMahData(specialList[3])]);
                }
            }
            pdata.men = men;
            pdata.cur = this.userList[k].roundScore;

            if (this.userList[k].user.uid != uid) {
                var shou = 0;
                for (var i = 0; i < this.userList[k].mahjongList.length; i++) {
                    shou += this.userList[k].mahjongList[i];
                }
                pdata.shou = shou;
            } else {
                userPos = k;
                pdata.shou = [];
                this.userList[k].isOutline = false;
                for (var i = 0; i < this.userList[k].mahjongList.length; i++) {
                    for (var j = 0; j < this.userList[k].mahjongList[i]; j++) {
                        var mahData = upGradeLogic.getMahData(i);
                        pdata.shou.push(mahData);
                    }
                }
            }
            pdata.wai = this.userList[k].historyList;
            pdata.isTing = this.userList[k].isTing;
            res.person.push(pdata);
            if (this.userList[k].currentState == structData.GAME_ST_READY)
                res.continue.push(k);

        }
        res.checkResult = this.userList[userPos].checkResult;
        res.playedCard = this.lastPlayedCard;
        this.userList[userPos].setSocket(socket);
        socket.emit("reback", res);
        // var _this = this;
        // if(this.currtCatchUser == userPos)
        // {
        //     setTimeout(function() {
        //         _this.userList[userPos].checkMahList();
        //     }, 1500);   
        // }
    }
    //一局结束后清理数据
    clearGame() {
        for (var k in this.userList) {
            this.userList[k].clear();
        }
        //    this.isGaming = false;
        this.doSpcialUserList = [];
        this.lastPlayedCard = -1;
        this.waitDoSpecialNum = 0;
        this.currtPlayUser = 0;
        this.currtCatchUser = 0; //当前抓牌的玩家
        this.tihuList = []; //天胡列表 
        this.clearOutline();
        if (upGradeLogic.socketioProxy)
            upGradeLogic.socketioProxy.removeRoomSetMahList(this.roomID);
        this.liangzhang = -1; //亮张的牌
        this.startTiList = {}; //开局提牌列表
        this.skipList = {}; //特殊操作选择过的玩家
        this.inBeforPlay = true;
    }
    //玩家点击继续游戏
    onUserContinue(deskStation) {
        var res = {};
        res.pos = deskStation;
        for (var k in this.userList) {
            if (!this.userList[k].isbot)
                this.userList[k].socket.emit("onUserContinue", res);
        }
        this.checkStart();
    }

    //一局结束后清理掉线玩家
    clearOutline() {
        for (var i in this.userList) {
            if (this.userList[i].isOutline) {
                this.userList[i].socket = null;
                this.userList[i] = null;
                delete this.userList[i];
            }
        }
    }
    //获取房间信息
    getRoomData() {
        var roomData = {};
        roomData.roomID = this.roomID;
        roomData.station = this.roomStation;
        roomData.userList = [];
        roomData.creater = (this.roomType == 1) ? this.userList[1].user.uname : "系统创建(金币场)";
        for (var k in this.userList) {
            roomData.userList.push(this.userList[k].user);
        }
        return roomData;
    }
}