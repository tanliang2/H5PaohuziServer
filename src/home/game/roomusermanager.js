'use strict';
var structData = require("./../config/structdata");
var upGradeLogic = require("./../logic/upgradelogic");
var eventDispatcher = require("./../controller/eventdispatcher");
export default class roomuserManager extends think.base {
    init(socket, user, roomId, roomModel, deskStation) {
        this.socket = socket;
        this.user = user;
        this.roomId = roomId;
        this.roomModel = roomModel;
        this.deskStation = deskStation;
        this.mahjongList = []; //手牌
        this.specialMahList = []; //亮出来的牌（碰或杠或吃）
        this.currentState = structData.GAME_ST_WAIT;
        this.roundScore = 0; //本局当前输赢情况
        this.totalScore = 0; //在本房间内的输赢情况
        this.pao_num = 0; //在本房间总共放炮的次数
        this.zhuang_num = 0; //坐庄次数
        this.hu_num = 0; //胡次数
        this.isOutline = false;
        this.isready = true;
        this.historyList = []; //出过的牌记录
        this.winList = []; //赢的牌列表
        this.catchedPai = -1; //刚抓到的牌
        this.gangNum = 0; //跑或者提个数
        this.huNum = 0; //胡牌的番数
        this.haveSpecial = false; //当前是否有待处理特殊情况
        this.dissRoomAnswer = -1;
        this.isTing = false;
        this.winResultList = [];
        this.isbot = user.isbot ? true : false;
        this.clientonline = true;
        this.skipPlay = false; //是否要跳过出牌
        this.huxiNum = 0; //当前的胡息数
        this.choupaiList = []; //臭牌列表
        this.palypaiList = []; //自己打过的牌
        this.chouHuList = {}; //能胡未胡的牌列表
        this.checkResult = {};
        this.waitForHu = -1; //跑提偎后的胡牌处理 5跑 4 提 3偎

        var mahLen = 20;
        for (var i = 0; i < mahLen; i++) {
            this.mahjongList.push(0);
        }

        this.clientEventHandle();
    }

    //进入房间后初始化
    startUp() {
        var gameState = this.currentState;
        var roomData = {};
        var userDataList = {};
        roomData.gameStation = this.roomModel.gameStation;
        roomData.zDeskStation = this.roomModel.zDeskStation;
        roomData.selfDeskStation = this.deskStation;
        roomData.selfState = this.currentState;
        roomData.roomId = this.roomId;
        roomData.roomType = this.roomModel.roomType;
        roomData.maxRound = this.roomModel.maxRound;
        roomData.haveSpecial = this.haveSpecial;
        roomData.waitDoSpecialNum = this.roomModel.waitDoSpecialNum;
        this.socket.emit("initRoom", roomData);
    }
    //重新进入游戏时设置socket
    setSocket(socket) {
        if (this.socket.id != socket.id) {
            this.socket.leave(this.roomId);
            this.socket = null;
            //    this.socket.disconnect();
            this.socket = socket;
            this.clientEventHandle();
        }
    }
    //事件监听
    clientEventHandle() {
        var _this = this;
        _this.socket.setMaxListeners(255);
        //准备
        _this.socket.on("ready", function (isready) {
            if (isready)
                _this.currentState = structData.GAME_ST_READY;
            else
                _this.currentState = structData.GAME_ST_WAIT;
            _this.roomModel.checkStart(_this.deskStation);
        })
        //房主开始游戏
        _this.socket.on("startGame", function () {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.roomModel.startGame();
        })
        //前端发牌完毕
        _this.socket.on("cardPutDown", function () {
            _this.onCardPutDown();
        })
        //出牌
        _this.socket.on("playCard", function (data) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            //   if (_this.deskStation != _this.roomModel.currtCatchUser) return;
            _this.onPlayCard(data);
        });
        //处理特殊情况
        _this.socket.on("doSpecial", function (data) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.onDoSpecial(data);
        });
        //放弃处理特殊情况
        _this.socket.on("skipSpecial", function () {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.haveSpecial = false;
            _this.roomModel.userSkipSpecial(_this.deskStation);
        })
        //起牌后检查是否有特殊情况（杠、听、胡）
        _this.socket.on("checkSelfSpecial", function () {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            //   _this.checkMahList();
        })
        //主动退出房间
        _this.socket.on("leaveRoom", function (deskStation) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.socket.leave(_this.roomId);
            _this.roomModel.userLeaveRoom(deskStation);
        })
        //验证并未掉线
        _this.socket.on("notoutline", function () {
            _this.clientonline = true;
        })
        //用户掉线
        _this.socket.on('disconnect', function () {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.clientonline = false;
            _this.socket.emit("disconnectTest");
            setTimeout(function () {
                if (!_this.clientonline) {
                    if (upGradeLogic.socketioProxy)
                        upGradeLogic.socketioProxy.removeSocket(_this.socket);
                    _this.isOutline = true;
                    _this.currentState = structData.GAME_ST_OUT;
                    for (var i = 0; i < _this.roomModel.doSpcialUserList.length; i++) {
                        if (_this.roomModel.doSpcialUserList[i].deskStation == _this.deskStation) {
                            _this.roomModel.doSpcialUserList.splice(i, 1);
                            break;
                        }
                    }
                    if (_this.haveSpecial) {
                 //       _this.roomModel.userSkipSpecial(_this.deskStation);
                    }
                    _this.socket.leave(_this.roomId);
                    _this.roomModel.userLeaveRoom(_this.deskStation);
                    if (_this.roomModel && _this.roomModel.isDissing) {
                        _this.dissRoomAnswer = 1;
                        _this.roomModel.onUserDissRoom();
                    }
                }
            }, 1500);

            // if (!_this.roomModel.isGaming)
            //     _this.roomModel.clearOutline();
        });
        //继续游戏，准备
        _this.socket.on("continueGame", function () {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.currentState = structData.GAME_ST_READY;
            _this.roomModel.onUserContinue(_this.deskStation);
        })
        //用户发送聊天消息
        _this.socket.on("userChat", function (chatObj) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.roomModel.onUserChat(chatObj);
        })
        //踢人
        _this.socket.on("kickUser", function (pos) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.roomModel.onKickUser(pos);
        })
        //解散房间投票
        _this.socket.on("dissolveRoom", function (answer) {
            if (!_this.socket) return;
            if (!_this.roomModel) return;
            _this.dissRoomAnswer = answer;
            _this.roomModel.onUserDissRoom();
        })
    }
    //处理玩家出牌
    onPlayCard(mahjongValue) {
        this.mahjongList[mahjongValue]--;
        this.roomModel.userPlayCard(this.deskStation, mahjongValue);
        // this.historyList.push(upGradeLogic.getMahData(mahjongValue));
        this.palypaiList.push(mahjongValue);
    }
    //删除出牌记录中的牌
    deleteHistoryCard(mahjongValue) {
        var mahData = upGradeLogic.getMahData(mahjongValue);
        for (var i = 0; i < this.historyList.length; i++) {
            if (mahData.type == this.historyList[i].type && mahData.number == this.historyList[i].number) {
                this.historyList.splice(i, 1);
                break;
            }
        }
    }
    //处理特殊情况
    onDoSpecial(data) {
        this.haveSpecial = false;
        var doSpecialData = {};
        doSpecialData.deskStation = this.deskStation;
        doSpecialData.type = data.type; //1吃 2碰 3偎牌 4 提 5跑 6 胡 -3臭偎
        doSpecialData.eatObj = data.eatObj; //吃的类型，0 吃头 1 吃中 2 吃尾
        doSpecialData.gangValue = data.gangValue;
        this.roomModel.doSpcialUserList.push(doSpecialData);
        this.roomModel.waitDoSpecialNum--;
        //    console.log("还需要执行的特殊情况数量：" + this.roomModel.waitDoSpecialNum);
        this.roomModel.userDoSpecial(this.deskStation, data.type);
    }
    //检查是否触发特殊情况
    checkSpecial(deskStation, mahjongValue, isauto) {
        this.checkResult = {};
        this.checkResult.data = {};
        var ischouWei = false;
        if (deskStation == this.deskStation && isauto) {
            this.checkResult.canTi = upGradeLogic.checkTi(this.mahjongList, this.specialMahList, mahjongValue);
            if (!this.checkResult.canTi) {
                this.checkResult.canPao = upGradeLogic.checkPao(this.mahjongList, this.specialMahList, mahjongValue);
            }
            this.checkResult.canWei = upGradeLogic.checkPeng(this.mahjongList, mahjongValue);
            ischouWei = (this.choupaiList.indexOf(mahjongValue) != -1);
        } else {
            this.checkResult.canPao = upGradeLogic.checkPao(this.mahjongList, this.specialMahList, mahjongValue,isauto);
            this.checkResult.canPeng = (upGradeLogic.checkPeng(this.mahjongList, mahjongValue) && this.choupaiList.indexOf(mahjongValue) == -1 && this.palypaiList.indexOf(mahjongValue) == -1);
        }
        if (this.checkResult.canPeng) {
            this.checkResult.data[2] = upGradeLogic.getMahData(mahjongValue);
            this.roomModel.waitDoSpecialList[this.deskStation].canPeng = true;
        }

        this.checkResult.canHu = ((upGradeLogic.getResultFan(this.mahjongList, this.specialMahList, 0, mahjongValue) != null) && this.chouHuList[mahjongValue] != this.huxiNum);// (upGradeLogic.getTingMahList(this.mahjongList,this.specialMahList).indexOf(mahjongValue) != -1);
        if (this.checkResult.canHu) {
            this.checkResult.data[6] = upGradeLogic.getMahData(mahjongValue);
            this.roomModel.waitDoSpecialList[this.deskStation].canHu = true;
        }
        var canChi = false;
        if ((upGradeLogic.isNextDesk(deskStation, this.deskStation) || (deskStation == this.deskStation && isauto)) && (this.choupaiList.indexOf(mahjongValue) == -1 && this.palypaiList.indexOf(mahjongValue) == -1)) {
            this.checkResult.canChiResult = upGradeLogic.checkChi(this.mahjongList, mahjongValue);
            if (this.checkResult.canChiResult.length > 0) {
                canChi = true;
                this.checkResult.data[1] = this.checkResult.canChiResult;
                this.roomModel.waitDoSpecialList[this.deskStation].canChi = true;
            }
        }

        if (this.checkResult.canPao) {
            this.haveSpecial = true;
            this.roomModel.waitDoSpecialNum++;
            this.roomModel.waitDoSpecialList[this.deskStation].canPao = true;
            var data = { type: 5, eatObj: [], gangValue: mahjongValue };
            var that = this;
            setTimeout(function () {
                that.onDoSpecial(data);
            }, 1100);
        } else if (this.checkResult.canTi) {
            this.haveSpecial = true;
            this.roomModel.waitDoSpecialNum++;
            this.roomModel.waitDoSpecialList[this.deskStation].canTi = true;
            var data = { type: 4, eatObj: [], gangValue: mahjongValue };
            var that = this;
            setTimeout(function () {
                that.onDoSpecial(data);
            }, 1100);
        } else if (this.checkResult.canWei) {
            this.haveSpecial = true;
            this.roomModel.waitDoSpecialNum++;
            this.roomModel.waitDoSpecialList[this.deskStation].canWei = true;
            var type = ischouWei ? -3 : 3;
            var data = { type: type, eatObj: [], gangValue: -1 };
            var that = this;
            setTimeout(function () {
                that.onDoSpecial(data);
            }, 1100);
        } else if (this.checkResult.canPeng || this.checkResult.canHu || canChi) {
            this.haveSpecial = true;
            this.roomModel.waitDoSpecialNum++;
            this.socket.emit("doSelfSpecial", this.checkResult);
        }

    }
    //检查手牌
    checkMahList() {
        this.checkResult = {};
        this.checkResult.data = {};
        this.checkResult.canHu = upGradeLogic.getResultFan(this.mahjongList, this.specialMahList, 0, -1) != null;
        if (this.checkResult.canHu) {
            this.checkResult.data[6] = upGradeLogic.getMahData(this.roomModel.lastPlayedCard);
            this.roomModel.waitDoSpecialNum++;
            this.haveSpecial = true;
            this.socket.emit("doSelfSpecial", this.checkResult); //处理抓牌后的特殊情况
            return true;
        }
        this.checkResult = {};
        return false;
    }
    //碰、吃后检查是否听牌
    checkTing() {
        var checkResult = {};
        checkResult.data = {};
        var lizhitingList = [];
        if (!this.isTing) {
            lizhitingList = upGradeLogic.getLizhiList(this.mahjongList, this.specialMahList);
            if (lizhitingList.length > 0) {
                checkResult.lizhitingList = lizhitingList;
                checkResult.data[4] = lizhitingList;
            }
        }
        if (lizhitingList.length > 0) {
            this.roomModel.waitDoSpecialNum++;
            this.socket.emit("doSelfSpecial", checkResult); //处理抓牌后的特殊情况
        } else {
            //this.socket.emit("allowPushCard"); //允许出牌
            this.roomModel.onUserTrun(this.deskStation);
        }
    }
    //更新指定玩家亮出的牌
    updateUserSpecialList(deskStation, action, pai, chiPai) {
        this.checkResult = {};
        var res = {};
        res.turn = deskStation;
        var cur = {};
        for (var k in this.roomModel.userList) {
            cur[k] = this.roomModel.userList[k].huxiNum;
        }
        res.cur = cur;
        res.action = action;
        res.pai = pai;
        res.chiPai = chiPai;
        // res.specialMahList = this.roomModel.userList[deskStation].specialMahList;
        this.socket.emit("updateSpecialList", res);
    }
    //跳过胡牌后的执行
    doSkipHu(){
        this.roomModel.currtCatchUser = this.deskStation;
        if(this.waitForHu == 4 || this.waitForHu == 5) this.gangNum++;
        if (this.gangNum >= 2) {
            var that = this;
            setTimeout(function () {
                that.roomModel.currtPlayUser = that.deskStation;
                that.roomModel.changeToNext();
            }, 1000);
        } else {
            var mahLen = 0;
            var canplay = false;
            for (var i = 0; i < this.mahjongList.length; i++) {
                mahLen += this.mahjongList[i];
                if (this.mahjongList[i] != 0 && this.mahjongList[i] != 3) {
                    canplay = true;
                }
            }
            if (mahLen > 0 && canplay)
                //   this.socket.emit("allowPushCard"); //允许出牌
                this.roomModel.onUserTrun(this.deskStation);
            else {
                var that = this;
                setTimeout(function () {
                    that.roomModel.currtPlayUser = that.deskStation;
                    that.roomModel.changeToNext();
                }, 1000);
                // this.roomModel.changeToNext();
            }
        }  
        this.waitForHu = -1;
    }
    //执行特殊操作
    exectueSpecial(data, mahjongValue) {
        var pai = [];
        var chiPai = []; //要删掉的手牌
        var actionData = {};
        switch (data.type) {
            case 1:
                actionData.action = 1;
                actionData.moArr = data.eatObj.list;
                this.specialMahList.push(actionData);
                if ((actionData.moArr[0] == 0 && actionData.moArr[1] == 1 && actionData.moArr[2] == 2) || (actionData.moArr[0] == 1 && actionData.moArr[1] == 6 && actionData.moArr[2] == 9)) {
                    this.huxiNum += 3;
                } else if ((actionData.moArr[0] == 10 && actionData.moArr[1] == 11 && actionData.moArr[2] == 12) || (actionData.moArr[0] == 11 && actionData.moArr[1] == 16 && actionData.moArr[2] == 19)) {
                    this.huxiNum += 6;
                }
                var skipOne = true;
                for (var i = 0; i < data.eatObj.list.length; i++) {
                    pai.push(upGradeLogic.getMahData(data.eatObj.list[i]));
                    if (skipOne && data.eatObj.list[i] == mahjongValue) {
                        skipOne = false;
                        continue;
                    }
                    this.mahjongList[data.eatObj.list[i]]--;
                    chiPai.push(upGradeLogic.getMahData(data.eatObj.list[i]));
                }
                for (var i = 0; i < data.eatObj.biList.length; i += 3) {
                    this.mahjongList[data.eatObj.biList[i]]--;
                    this.mahjongList[data.eatObj.biList[i + 1]]--;
                    this.mahjongList[data.eatObj.biList[i + 2]]--;
                    chiPai.push(upGradeLogic.getMahData(data.eatObj.biList[i]));
                    chiPai.push(upGradeLogic.getMahData(data.eatObj.biList[i + 1]));
                    chiPai.push(upGradeLogic.getMahData(data.eatObj.biList[i + 2]));
                    pai.push(upGradeLogic.getMahData(data.eatObj.biList[i]));
                    pai.push(upGradeLogic.getMahData(data.eatObj.biList[i + 1]));
                    pai.push(upGradeLogic.getMahData(data.eatObj.biList[i + 2]));
                    var biData = {};
                    biData.action = 1;
                    biData.moArr = [data.eatObj.biList[i], data.eatObj.biList[i + 1], data.eatObj.biList[i + 2]];
                    this.specialMahList.push(biData);
                    if ((biData.moArr[0] == 0 && biData.moArr[1] == 1 && biData.moArr[2] == 2) || (biData.moArr[0] == 1 && biData.moArr[1] == 6 && biData.moArr[2] == 9)) {
                        this.huxiNum += 3;
                    } else if ((biData.moArr[0] == 10 && biData.moArr[1] == 11 && biData.moArr[2] == 12) || (biData.moArr[0] == 11 && biData.moArr[1] == 16 && biData.moArr[2] == 19)) {
                        this.huxiNum += 6;
                    }
                }

                this.roomModel.updateUserSpecialList(this.deskStation, 1, pai, chiPai);
                this.roomModel.currtCatchUser = this.deskStation;
                //       this.roomModel.userList[this.roomModel.currtPlayUser].deleteHistoryCard(mahjongValue);
                if (this.skipPlay) {
                    this.skipPlay = false;
                    var that = this;
                    setTimeout(function () {
                        that.roomModel.currtPlayUser = that.deskStation;
                        that.roomModel.changeToNext();
                    }, 1000);
                } else {
                    var mahLen = 0;
                    var canplay = false;
                    for (var i = 0; i < this.mahjongList.length; i++) {
                        mahLen += this.mahjongList[i];
                        if (this.mahjongList[i] != 0 && this.mahjongList[i] != 3) {
                            canplay = true;
                        }
                    }
                    if (mahLen > 0 && canplay)
                        this.roomModel.onUserTrun(this.deskStation);
                    //   this.socket.emit("allowPushCard"); //允许出牌
                    else {
                        var that = this;
                        setTimeout(function () {
                            that.roomModel.currtPlayUser = that.deskStation;
                            that.roomModel.changeToNext();
                        }, 1000);
                        // this.roomModel.changeToNext();
                    }

                }

                // //回放动作数据
                // var playbackChi = [chiPai[0],chiPai[1]];
                // var actData = {action:actionData.action,pos:this.deskStation,cardVal:mahjongValue,playPos:this.roomModel.currtPlayUser,resPai:pai,resChi:playbackChi};
                // this.roomModel.playback.actionList.push(actData);
                break;
            case 2:
                actionData.action = 2;
                this.mahjongList[mahjongValue] -= 2;
                var moArr = [mahjongValue, mahjongValue, mahjongValue];
                actionData.moArr = moArr;
                this.specialMahList.push(actionData);
                if (actionData.moArr[0] < 10)
                    this.huxiNum += 1;
                else
                    this.huxiNum += 3;
                pai = [upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser)];
                this.roomModel.updateUserSpecialList(this.deskStation, 2, pai, chiPai);
                this.roomModel.currtCatchUser = this.deskStation;
                //       this.roomModel.userList[this.roomModel.currtPlayUser].deleteHistoryCard(mahjongValue);
                if (this.skipPlay) {
                    this.skipPlay = false;
                    var that = this;
                    setTimeout(function () {
                        that.roomModel.currtPlayUser = that.deskStation;
                        that.roomModel.changeToNext();
                    }, 1000);
                } else {
                    var mahLen = 0;
                    var canplay = false;
                    for (var i = 0; i < this.mahjongList.length; i++) {
                        mahLen += this.mahjongList[i];
                        if (this.mahjongList[i] != 0 && this.mahjongList[i] != 3) {
                            canplay = true;
                        }
                    }
                    if (mahLen > 0 && canplay)
                        this.roomModel.onUserTrun(this.deskStation);
                    //this.socket.emit("allowPushCard"); //允许出牌
                    else {
                        var that = this;
                        setTimeout(function () {
                            that.roomModel.currtPlayUser = that.deskStation;
                            that.roomModel.changeToNext();
                        }, 1000);
                        // this.roomModel.changeToNext();
                    }
                }

                //回放动作数据
                // var actData = {action:actionData.action,pos:this.deskStation,cardVal:mahjongValue,playPos:this.roomModel.currtPlayUser,resPai:pai};
                // this.roomModel.playback.actionList.push(actData);
                break;
            case 3:
            case -3:
                actionData.action = data.type;
                this.mahjongList[mahjongValue] = 0;
                var moArr = [mahjongValue, mahjongValue, mahjongValue];
                actionData.moArr = moArr;
                this.specialMahList.push(actionData);
                if (actionData.moArr[0] < 10)
                    this.huxiNum += 3;
                else
                    this.huxiNum += 6;
                pai = [upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue)];
                this.roomModel.updateUserSpecialList(this.deskStation, data.type, pai, chiPai);
                if(this.checkMahList()) 
                {
                    this.waitForHu = 3;
                    return;
                }
                this.roomModel.currtCatchUser = this.deskStation;
                //          this.roomModel.userList[this.roomModel.currtPlayUser].deleteHistoryCard(mahjongValue);
                if (this.skipPlay) {
                    this.skipPlay = false;
                    var that = this;
                    setTimeout(function () {
                        that.roomModel.currtPlayUser = that.deskStation;
                        that.roomModel.changeToNext();
                    }, 1000);
                } else {
                    var mahLen = 0;
                    var canplay = false;
                    for (var i = 0; i < this.mahjongList.length; i++) {
                        mahLen += this.mahjongList[i];
                        if (this.mahjongList[i] != 0 && this.mahjongList[i] != 3) {
                            canplay = true;
                        }
                    }
                    if (mahLen > 0 && canplay)
                        //  this.socket.emit("allowPushCard"); //允许出牌
                        this.roomModel.onUserTrun(this.deskStation);
                    else {
                        var that = this;
                        setTimeout(function () {
                            that.roomModel.currtPlayUser = that.deskStation;
                            that.roomModel.changeToNext();
                        }, 1000);
                        // this.roomModel.changeToNext();
                    }
                }
                break;
            case 4:
                var isBackHead = false; //是否是用偎牌提
                for (var i = 0; i < this.specialMahList.length; i++) {
                    if ((this.specialMahList[i].moArr[0] == this.specialMahList[i].moArr[1]) && (this.specialMahList[i].moArr[0] == this.specialMahList[i].moArr[2]) && (this.specialMahList[i].moArr[0] == mahjongValue)) {
                        this.specialMahList[i].moArr.push(mahjongValue);
                        this.specialMahList[i].action = 4;
                        this.huxiNum += 6;
                        isBackHead = true;
                        pai = [upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue)]
                        break;
                    }
                }
                if (!isBackHead) {
                    var moArr = [mahjongValue, mahjongValue, mahjongValue, mahjongValue];
                    actionData.action = 4;
                    actionData.moArr = moArr;
                    this.specialMahList.push(actionData);
                    if (actionData.moArr[0] < 10)
                        this.huxiNum += 9;
                    else
                        this.huxiNum += 12;
                    pai = [upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue)];
                    //      this.roomModel.userList[this.roomModel.currtPlayUser].deleteHistoryCard(mahjongValue);
                }
                this.mahjongList[mahjongValue] = 0;
                // //回放动作数据
                // var actData = {action:action,pos:this.deskStation,cardVal:mahjongValue,playPos:this.roomModel.currtPlayUser,resPai:pai};
                // this.roomModel.playback.actionList.push(actData);

                this.roomModel.updateUserSpecialList(this.deskStation, 4, pai, chiPai);
                if(this.checkMahList()) 
                {
                    this.waitForHu = 4;
                    return;
                }
                this.roomModel.currtCatchUser = this.deskStation;
                if (this.gangNum > 0) {
                    var that = this;
                    setTimeout(function () {
                        that.roomModel.currtPlayUser = that.deskStation;
                        that.roomModel.changeToNext();
                    }, 1000);
                } else {
                    var mahLen = 0;
                    var canplay = false;
                    for (var i = 0; i < this.mahjongList.length; i++) {
                        mahLen += this.mahjongList[i];
                        if (this.mahjongList[i] != 0 && this.mahjongList[i] != 3) {
                            canplay = true;
                        }
                    }
                    if (mahLen > 0 && canplay)
                        //   this.socket.emit("allowPushCard"); //允许出牌
                        this.roomModel.onUserTrun(this.deskStation);
                    else {
                        var that = this;
                        setTimeout(function () {
                            that.roomModel.currtPlayUser = that.deskStation;
                            that.roomModel.changeToNext();
                        }, 1000);
                        // this.roomModel.changeToNext();
                    }
                }
                this.gangNum++;
                break;
            case 5:
                var isBackHead = false; //是否是用偎牌或者碰牌跑
                for (var i = 0; i < this.specialMahList.length; i++) {
                    if ((this.specialMahList[i].moArr[0] == this.specialMahList[i].moArr[1]) && (this.specialMahList[i].moArr[0] == this.specialMahList[i].moArr[2]) && (this.specialMahList[i].moArr[0] == mahjongValue)) {
                        this.specialMahList[i].moArr.push(mahjongValue);
                        if (this.specialMahList[i].action == 2) {
                            if (this.specialMahList[i].moArr[0] < 10) {
                                this.huxiNum += 5;
                            } else {
                                this.huxiNum += 6;
                            }
                        } else {
                            this.huxiNum += 3;
                        }
                        this.specialMahList[i].action = 5;
                        isBackHead = true;
                        pai = [upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue)]
                        break;
                    }
                }
                if (!isBackHead) {
                    var moArr = [mahjongValue, mahjongValue, mahjongValue, mahjongValue];
                    actionData.action = 5;
                    actionData.moArr = moArr;
                    this.specialMahList.push(actionData);
                    if (actionData.moArr[0] < 10)
                        this.huxiNum += 6;
                    else
                        this.huxiNum += 9;
                    pai = [upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue)];
                    //     this.roomModel.userList[this.roomModel.currtPlayUser].deleteHistoryCard(mahjongValue);
                }
                this.mahjongList[mahjongValue] = 0;
                // //回放动作数据
                // var actData = {action:action,pos:this.deskStation,cardVal:mahjongValue,playPos:this.roomModel.currtPlayUser,resPai:pai};
                // this.roomModel.playback.actionList.push(actData);

                this.roomModel.updateUserSpecialList(this.deskStation, 5, pai, chiPai);
                if(this.checkMahList()) 
                {
                    this.waitForHu = 5;
                    return;
                }
                this.roomModel.currtCatchUser = this.deskStation;
                if (this.gangNum > 0) {
                    var that = this;
                    setTimeout(function () {
                        that.roomModel.currtPlayUser = that.deskStation;
                        that.roomModel.changeToNext();
                    }, 1000);
                } else {
                    var mahLen = 0;
                    var canplay = false;
                    for (var i = 0; i < this.mahjongList.length; i++) {
                        mahLen += this.mahjongList[i];
                        if (this.mahjongList[i] != 0 && this.mahjongList[i] != 3) {
                            canplay = true;
                        }
                    }
                    if (mahLen > 0 && canplay)
                        //   this.socket.emit("allowPushCard"); //允许出牌
                        this.roomModel.onUserTrun(this.deskStation);
                    else {
                        var that = this;
                        setTimeout(function () {
                            that.roomModel.currtPlayUser = that.deskStation;
                            that.roomModel.changeToNext();
                        }, 1000);
                        // this.roomModel.changeToNext();
                    }
                }
                this.gangNum++;
                break;
            case 6:
                this.roomModel.countResult(this.deskStation);
                break;
        }
    }
    //设置状态
    setState(state) {
        this.currentState = state;
        var _this = this;
        switch (this.currentState) {
            case structData.GAME_ST_GETCARD:
                //流局
                if (_this.roomModel.mahjongStore.length == 0) {
                    _this.roomModel.gameEndWithHe();
                    return;
                }
                var cardValue = _this.roomModel.mahjongStore.shift();
                this.catchedPai = cardValue;
                this.roomModel.currtCatchUser = this.deskStation;
                //回放动作数据
                var actionData = { action: 101, pos: this.deskStation, cardVal: cardValue };
                this.roomModel.playback.actionList.push(actionData);

                var obj = {};
                obj.pai = upGradeLogic.getMahData(cardValue);
                obj.dui_num = this.roomModel.mahjongStore.length;
                _this.socket.emit("getCard", obj);
                var otherObj = {};
                otherObj.pos = this.deskStation;
                otherObj.dui_num = this.roomModel.mahjongStore.length;
                otherObj.gang_end = true;
                for (var k in this.roomModel.userList) {
                    if (k != this.deskStation) {
                        if (!this.roomModel.userList[k].isbot)
                            this.roomModel.userList[k].socket.emit("otherGetCard", otherObj);
                    }
                }
                //       console.log("牌池剩余牌数：" + _this.roomModel.mahjongStore.length);
                break;
            case structData.GAME_ST_CHECK_MAH:
                //       this.checkMahList();
                break;
        }
    }
    //托管状态或者时间到了自动出牌
    autoPlay() {
        for (var i = 0; i < this.mahjongList.length; i++) {
            if (this.mahjongList[i] > 0) {
                this.mahjongList[i]--;
                this.roomModel.userPlayCard(this.deskStation, i);
                break;
            }
        }
    }
    //一局结束后清理数据
    clear() {
        this.currentState = structData.GAME_ST_WAIT;
        for (var i = 0; i < this.mahjongList.length; i++) {
            this.mahjongList[i] = 0;
        }
        this.specialMahList = [];
        this.roundScore = 0;
        this.isready = false;
        this.historyList = []; //出过的牌记录
        this.winList = []; //赢的牌列表
        this.catchedPai = -1; //刚抓到的牌
        this.gangNum = 0;
        this.huNum = 0;
        this.haveSpecial = false; //当前是否有待处理特殊情况
        this.isTing = false;
        this.winResultList = [];
        this.skipPlay = false;
        this.huxiNum = 0; //当前的胡息数
        this.choupaiList = []; //臭牌列表
        this.palypaiList = []; //自己打过的牌
        this.chouHuList = {}; //能胡未胡的牌列表
        this.checkResult = {};
        this.waitForHu = -1;
    }
    //展示结果
    showResult(result) {
        this.socket.emit("showResult", result);
    }
    //开始游戏
    startGame(szPoint, zDeskStation) {
        var res = {};
        res.data = {};
        res.data.szPoint = szPoint;
        res.data.zhuang = zDeskStation;
        res.data.mahjongList = this.mahjongList;
        res.data.dui_num = 67; //剩余牌的数量
        res.data.cur_round = this.roomModel.currentRound;
        res.data.max_round = this.roomModel.maxRound;
        res.data.state = this.currentState;
        res.data.cur = { "1": 0, "2": 0, "3": 0, "4": 0 };
        res.data.liangzhang = this.roomModel.liangzhang;
        this.socket.emit("startGame", res);
    }
    //前端发牌完毕
    onCardPutDown() {
        if (!this.roomModel) return;
        var normalHuList = [];
        for (var k in this.roomModel.userList) {
            var liangzhang = (this.roomModel.zDeskStation == k) ? -1 : this.roomModel.liangzhang;
            this.roomModel.userList[k].currentState = structData.GAME_ST_ONTURN;
            var checkResult = upGradeLogic.checkTianHu(this.roomModel.userList[k].mahjongList, liangzhang);
            if (checkResult) {
                if(checkResult.specialHu)
                    this.roomModel.tihuList.push(k);
                else
                    normalHuList.push(k);
            }
        }
        if (this.roomModel.tihuList.length > 0) {
            var that = this;
            setTimeout(function () {
                if (that.roomModel.tihuList.indexOf(that.roomModel.zDeskStation + "") != -1) {
                    that.roomModel.countResult([that.roomModel.zDeskStation],true);
                } else {
                    that.roomModel.tihuList.sort(function (a, b) {
                        return (a > b) ? -1 : 1;
                    });
                    that.roomModel.countResult([that.roomModel.tihuList[0]],true);
                }
            }, 500);
            
        }else if(normalHuList.length > 0)
        {
            for(var i = 0; i < normalHuList.length;i++)
            {
                this.roomModel.userList[normalHuList[i]].checkResult.data = {};
                this.roomModel.userList[normalHuList[i]].checkResult.data[6] = upGradeLogic.getMahData(this.roomModel.liangzhang);
                this.roomModel.waitDoSpecialList[normalHuList[i]] = {};
                this.roomModel.waitDoSpecialList[normalHuList[i]].canHu = true;
                this.roomModel.userList[normalHuList[i]].haveSpecial = true;
                this.roomModel.waitDoSpecialNum++;
                this.roomModel.userList[normalHuList[i]].socket.emit("doSelfSpecial", this.roomModel.userList[normalHuList[i]].checkResult);
            }
            for (var k in this.roomModel.userList) {
                if (!this.roomModel.userList[k].isbot)
                    this.roomModel.userList[k].socket.emit("showTips");
            }
        }else {
            this.roomModel.checkStartTi();
        }

    }
    //开局提牌检测
    checkStartTi() {
        var tiList = [];
        for (var i = 0; i < this.mahjongList.length; i++) {
            if (this.mahjongList[i] == 4) {
                tiList.push(upGradeLogic.getMahData(i));
            }
        }
        if (tiList.length >= 2) this.skipPlay = true;
        if (tiList.length > 0) {
            this.roomModel.startTiList[this.deskStation] = tiList;
        }
    }
    //开局自动提牌
    autoTi() {
        for (var i = 0; i < this.mahjongList.length; i++) {
            if (this.mahjongList[i] == 4) {
                this.gangNum++;
                this.mahjongList[i] = 0;
                var actionData = {};
                actionData.action = 4;
                actionData.moArr = [i, i, i, i];
                this.specialMahList.push(actionData);
                if (i < 10) {
                    this.huxiNum += 9;
                } else {
                    this.huxiNum += 12;
                }
            }
        }
    }
    //有玩家进入了房间
    onUserIn(roomData) {
        this.socket.emit("onUserIn", roomData);
    }
    //有玩家离开了房间
    onUserLeave(roomData) {
        this.socket.emit("onUserLeave", roomData);
    }
    //清理总牌局记录
    clearRoundRecord() {
        this.totalScore = 0; //在本房间内的输赢情况
        this.pao_num = 0; //在本房间总共放炮的次数
        this.zhuang_num = 0; //坐庄次数
        this.hu_num = 0; //胡次数
        this.socket = null;
        this.roomModel = null;
        this.currentState = structData.GAME_ST_READY;
    }
    //重置牌局记录
    resetRoundRecord() {
        this.totalScore = 0; //在本房间内的输赢情况
        this.pao_num = 0; //在本房间总共放炮的次数
        this.zhuang_num = 0; //坐庄次数
        this.hu_num = 0; //胡次数
    }
    dispose() {
        this.clear();
        this.clearRoundRecord();
    }
}