'use strict';
var structData = require("./../config/structdata");
var upGradeLogic = require("./../logic/upgradelogic");
var eventDispatcher = require("./../controller/eventdispatcher");
export default class extends think.base {
    init(roomId, roomModel, deskStation)
    {
        this.user = {}
        this.roomId = roomId;
        this.roomModel = roomModel;
        this.deskStation = deskStation;
        this.mahjongList = []; //手牌
        this.specialMahList = []; //亮出来的牌（碰或杠或吃）
        this.currentState = structData.GAME_ST_READY;
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
        this.gangNum = 0; //开杠数
        this.huNum = 0; //胡牌的番数
        this.haveSpecial = false; //当前是否有待处理特殊情况
        this.dissRoomAnswer = 1;
        this.isTing = false;
        this.isbot =  true;
        this.ip = "222." + (Math.round( Math.random() * 10) + 180) + "." + (Math.round( Math.random() * 10)) + "." + (Math.round( Math.random() * 10) + 250);

        var userData = {};
		userData["currency"] = 10000;
		userData["nickName"] = this.getRandomName();
		userData["uid"] = Math.round( Math.random() * 9000) + 1000;
		userData["iconUrl"] = "";
		userData["sexNum"] = Math.random() > 0.5 ? 1 : 0;
		userData["uname"] = userData["nickName"];
        this.user = userData;

        var mahLen = this.roomModel.gameType == upGradeLogic.TYPE_NORMAL ? 30 : 27;
        for (var i = 0; i < mahLen; i++) {
            this.mahjongList.push(0);
        }
    }
    //获取随机名字
    getRandomName(){
        var wordList = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
        var nameLen = Math.round( Math.random() * 8) + 2;
        var name = "";
        for(var i = 0; i < nameLen;i++)
        {
            var randomIndex = Math.floor( Math.random() * wordList.length);
            name += wordList[randomIndex];
        }
        return name;
    }
    //获取随机ip
    getRandonIp(){
        return this.ip;
    }
    //处理玩家出牌
    onPlayCard(mahjongValue, isting) {
        this.mahjongList[mahjongValue]--;
        this.roomModel.userPlayCard(this.deskStation, mahjongValue);
        this.historyList.push(upGradeLogic.getMahData(mahjongValue));
        if (isting && !this.isTing) {
            this.isTing = true;
            this.roomModel.onUserTing(this.deskStation);
        }
    }
    //更新指定玩家亮出的牌
    updateUserSpecialList(deskStation, action, pai, chiPai) {
       
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
    //有玩家进入了房间
    onUserIn(roomData) {
        
    }
    //有玩家离开了房间
    onUserLeave(roomData) {
        
    }
    //处理特殊情况
    onDoSpecial(data) {
        this.haveSpecial = false;
        var doSpecialData = {};
        doSpecialData.deskStation = this.deskStation;
        doSpecialData.type = data.type; //1吃 2碰 3杠 4 胡 5 听
        doSpecialData.eatList = data.eatList; //吃的类型，0 吃头 1 吃中 2 吃尾
        doSpecialData.gangValue = data.gangValue;
        this.roomModel.doSpcialUserList.push(doSpecialData);
        this.roomModel.waitDoSpecialNum--;
        //    console.log("还需要执行的特殊情况数量：" + this.roomModel.waitDoSpecialNum);
        this.roomModel.userDoSpecial(this.deskStation,data.type);
    }
    //检查是否触发特殊情况
    checkSpecial(deskStation, mahjongValue) {
        var checkResult = {};
        checkResult.data = {};
        checkResult.canPeng = this.isTing ? false : upGradeLogic.checkPeng(this.mahjongList, mahjongValue);
        if (checkResult.canPeng) {
            checkResult.data[2] = upGradeLogic.getMahData(mahjongValue);
            this.roomModel.waitDoSpecialList[this.deskStation].canPeng = true;
        }
        checkResult.canGang = this.isTing ? false : upGradeLogic.checkGang(this.mahjongList, mahjongValue);
        if (checkResult.canGang) {
            var pais = [upGradeLogic.getMahData(mahjongValue)];
            checkResult.data[25] = pais;
            this.roomModel.waitDoSpecialList[this.deskStation].canGang = true;
        }
        checkResult.canHu = (upGradeLogic.getTingMahList(this.mahjongList,this.roomModel.bao).indexOf(mahjongValue) != -1);
        if (checkResult.canHu) {
            checkResult.data[99] = upGradeLogic.getMahData(mahjongValue);
            this.roomModel.waitDoSpecialList[this.deskStation].canHu = true;
        }
        var canChi = false;
        if (!this.isTing) {
            if (upGradeLogic.isNextDesk(deskStation, this.deskStation)) {
                checkResult.canChiResult = upGradeLogic.checkChi(this.mahjongList, mahjongValue);
                if (checkResult.canChiResult.head || checkResult.canChiResult.middle || checkResult.canChiResult.end) {
                    canChi = true;
                    var pais = [];
                    if (checkResult.canChiResult.head) {
                        pais = pais.concat([upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue + 1), upGradeLogic.getMahData(mahjongValue + 2)]);
                    }
                    if (checkResult.canChiResult.middle) {
                        pais = pais.concat([upGradeLogic.getMahData(mahjongValue - 1), upGradeLogic.getMahData(mahjongValue), upGradeLogic.getMahData(mahjongValue + 1)]);
                    }
                    if (checkResult.canChiResult.end) {
                        pais = pais.concat([upGradeLogic.getMahData(mahjongValue - 2), upGradeLogic.getMahData(mahjongValue - 1), upGradeLogic.getMahData(mahjongValue)]);
                    }
                    checkResult.data[1] = pais;
                    this.roomModel.waitDoSpecialList[this.deskStation].canChi = true;
                }
            }
        }

        if(checkResult.canHu)
        {
            this.haveSpecial = true;
            this.roomModel.waitDoSpecialNum++;
            var data = { type: 4, eatList: [], gangValue: -1 };
            var that = this;
            setTimeout(function() {
                that.onDoSpecial(data);
            }, 1000);
            return;
        }

        if (checkResult.canPeng) {
            this.haveSpecial = true;
            this.roomModel.waitDoSpecialNum++;
            var data = { type: 2, eatList: [], gangValue: -1 };
            var that = this;
            setTimeout(function() {
                that.onDoSpecial(data);
            }, 800);
        }
    }
    //检查手牌
    checkMahList() {
        var paiList = [];
        for(var i = 0; i < this.mahjongList.length;i++)
        {
            if(this.mahjongList[i] > 0 && i != this.roomModel.bao)
            {
                paiList.push(i);
            }
        }
        var randomIndex = Math.floor(Math.random() * paiList.length);
        var that = this;
        setTimeout(function() {
            that.onPlayCard(paiList[randomIndex],false);
        }, 3000);
    }
    //执行特殊操作
    exectueSpecial(data, mahjongValue) {
        var pai = [];
        var chiPai = [];
        var actionData = {};
        switch (data.type) {
            case 2:
                actionData.action = 2;
                this.mahjongList[mahjongValue] -= 2;
                var moArr = [mahjongValue, mahjongValue, mahjongValue];
                actionData.moArr = moArr;
                actionData.playUser = this.roomModel.currtPlayUser;
                this.specialMahList.push(actionData);
                pai = [upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser), upGradeLogic.getMahData(mahjongValue, this.roomModel.currtPlayUser)]
                this.roomModel.currtCatchUser = this.deskStation;
                this.roomModel.updateUserSpecialList(this.deskStation, 2, pai, chiPai);
          //      this.roomModel.userList[this.roomModel.currtPlayUser].deleteHistoryCard(mahjongValue);
                //回放动作数据
                var actData = {action:actionData.action,pos:this.deskStation,cardVal:mahjongValue,playPos:this.roomModel.currtPlayUser,resPai:pai};
                this.roomModel.playback.actionList.push(actData);
                this.checkMahList();
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
                var mahjongNumber = 0;
                for(var i = 0; i < _this.mahjongList.length;i++)
                {
                    mahjongNumber += _this.mahjongList[i];
                }
                if(mahjongNumber >= 14) return;
                var cardValue = _this.roomModel.mahjongStore.shift();
                _this.mahjongList[cardValue]++;
                this.catchedPai = cardValue;
                this.roomModel.currtCatchUser = this.deskStation;
                //回放动作数据
                var actionData = {action:101,pos:this.deskStation,cardVal:cardValue};
                this.roomModel.playback.actionList.push(actionData);

                var otherObj = {};
                otherObj.pos = this.deskStation;
                otherObj.dui_num = this.roomModel.mahjongStore.length;
                otherObj.gang_end = true;
                for (var k in this.roomModel.userList) {
                    if (k != this.deskStation) {
                        if(!this.roomModel.userList[k].isbot)
                            this.roomModel.userList[k].socket.emit("otherGetCard", otherObj);
                    }
                }
                this.checkMahList();
                break;
        }
    }

    //展示结果
    showResult(result) {
        var _this = this;
        setTimeout(function() {
            _this.currentState = structData.GAME_ST_READY;
            _this.roomModel.onUserContinue(_this.deskStation);
        }, 5000);
    }

    //一局接受后清理数据
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
    }
    //开始游戏
    startGame(szPoint, zDeskStation) {
        this.currentState = structData.GAME_ST_ONTURN;
        if(this.deskStation == zDeskStation)
        {
            this.checkMahList();
        }
    }
    //清理总牌局记录
    clearRoundRecord(){
        this.totalScore = 0; //在本房间内的输赢情况
        this.pao_num = 0; //在本房间总共放炮的次数
        this.zhuang_num = 0; //坐庄次数
        this.hu_num = 0; //胡次数
        this.roomModel = null;
        this.currentState = structData.GAME_ST_READY;
    }
    //重置牌局记录
    resetRoundRecord(){
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