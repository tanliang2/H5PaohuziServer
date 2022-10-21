'use strict';
/**
 * model
 */
export default class extends think.model.mongo {
    async getUserList() {
        // var list = [];
        // for (var i = 1001; i < 1004; i++) {
        //     var udata = await this.cache(3600).where({ "userData.uid": i }).find();
        //     var nickname = udata.userData.name;
        //     list.push(nickname);
        // }
        // return list;
        var userdata = await this.where({ uname: "liuxin111" }).find();
        return userdata;
    }
    //普通添加用户
    async addUser(username, pwd) {
        let usercountModel = think.model('usercount', think.config('db'), 'home');
        var userCount = await usercountModel.getUserCount();
        var insertId = await this.add({
            uname: username,
            password: pwd,
            userData: {
                name: username,
                uid: userCount,
                level: 1,
                iconUrl: "",
                roomcard:100,
                currency: 10000,
                lastSignTime: 0,
                sex: 0,
                signature: "",
                package: [],
                clubList: [],
                friendList: [],
                bgImgList: [],
                clubNum: 0,
                msgList: [{ fromUid: "0001", type: 3, msg: "刚注册的用户可以在个人中心任务里面领取注册奖励哦！", state: 1, time: new Date(), title: "领取注册奖励" }],
                recordData: { roundCount: 0, winCount: 0, gain: 0, recordList: {"1":[],"2":[]} },
                activityData: { isGetRegReward: false },
                payRecordList: []
            }
        });
        await usercountModel.addUserCount();
        return insertId;
    }
    //添加微信用户
    async addWxUser(udata) {
        let usercountModel = think.model('usercount', think.config('db'), 'home');
        var userCount = await usercountModel.getUserCount();
        var insertId = await this.add({
            uname: udata.openid,
            password: "111111",
            userData: {
                name: udata.nickname,
                uid: userCount,
                level: 1,
                iconUrl: udata.headimgurl,
                roomcard:100,
                currency: 10000,
                lastSignTime: 0,
                sex: udata.sex,
                signature: "",
                province: udata.province,
                city: udata.city,
                friendList: [],
                bgImgList: [],
                country: udata.country,
                msgList: [{ fromUid: "0001", type: 3, msg: "刚注册的用户可以在个人中心任务里面领取注册奖励哦！", state: 1, time: new Date(), title: "领取注册奖励" }],
                recordData: { roundCount: 0, winCount: 0, gain: 0, recordList: {"1":[],"2":[]} },
                activityData: { isGetRegReward: false },
                payRecordList: []
            }
        });
        usercountModel.addUserCount();
        return insertId;
    }
    //更新微信用户数据
    async updateWxUserData(udata) {
        await this.where({ uname: udata.openid }).update({
            $set: {
                "userData.name": udata.nickname, "userData.iconUrl": udata.headimgurl, "userData.sex": udata.sex, "userData.province": udata.province
                , "userData.city": udata.city, "userData.country": udata.country
            }
        });
        var userdata = await this.where({ uname: udata.openid }).find();
        return userdata;
    }
    //查找用户
    async findUser(uname) {
        try {
            var userdata = await this.where({ uname: uname }).find();
            return userdata;
        } catch (err) {
            return null;
        }

    }
    //根据用户id查找用户
    async findUserById(uid) {
        try {
            var userdata = await this.where({ "userData.uid": Number(uid) }).find();
            return userdata;
        } catch (err) {
            return null;
        }
    }
    //更新列表玩家战绩
    async updateUsersRecord(userlist,roomtype = 1) {
        for (var i = 0; i < userlist.length; i++) {
            await this.updateUserRecord(userlist[i],roomtype);
        }
    }
    //更新战绩
    async updateUserRecord(udata,roomtype) {
        var recordData = udata.recordData;
        var winCount = recordData.isWinner ? 1 : 0;
        var winCurrency = (roomtype > 1) ? Number(recordData.gain) : 0;
        //var userdata = await this.where({ "userData.uid": Number(udata.uid) }).find();
        // if(!userdata.userData.recordData.recordList["2"])
        // {
        //     await this.where({ "userData.uid": Number(udata.uid) }).update({
        //         $set:{"userData.recordData.recordList.2":[]}
        //     });
        // }
        await this.where({ "userData.uid": Number(udata.uid) }).update({
            $inc: { 'userData.recordData.roundCount': 1, 'userData.recordData.winCount': winCount, 'userData.recordData.gain': Number(recordData.gain) ,'userData.currency':winCurrency},
            $push: { 'userData.recordData.recordList.2': { time: new Date().toLocaleString(), resultList: recordData.resultList, roomId: recordData.roomId,paybackId:recordData.paybackId } }
        });
       var userdata = await this.where({ "userData.uid": Number(udata.uid) }).find();
        if(userdata.userData.recordData.recordList["2"].length > 50)
        {
            await this.where({ "userData.uid": Number(udata.uid) }).update({
                $pop: { "userData.recordData.recordList.2": -1 } 
            });
        }
    }
    //获取游戏战绩记录
    async getRecordData(uid) {
        var userdata = await this.where({ "userData.uid": Number(uid) }).find();
        if (userdata && userdata.userData)
            return userdata.userData.recordData;
        return null;
    }
    //增量更新用户金币
    async setUserCurrency(uid, offset, type = 2) {
        await this.where({ "userData.uid": Number(uid) }).update({ $inc: { "userData.currency": offset } });
        var userdata = await this.where({ "userData.uid": Number(uid) }).find();
        var currentNum = userdata.userData.currency;
        await this.where({ "userData.uid": Number(uid) }).update({ $addToSet: { "userData.payRecordList": { type: type, offsetNum: offset, currentNum: Number(currentNum), time: new Date().toLocaleString() } } });
        return true;
    }
    //增量更新用户房卡
    async setUserRoomcard(uid,offset,type = 2)
    {
        var udata = await this.where({ "userData.uid": Number(uid) }).find();
        if(udata.userData.roomcard + offset < 0) return false;
        await this.where({ "userData.uid": Number(uid) }).update({ $inc: { "userData.roomcard": offset } });
        var userdata = await this.where({ "userData.uid": Number(uid) }).find();
        var currentNum = userdata.userData.roomcard;
        await this.where({ "userData.uid": Number(uid) }).update({ $addToSet: { "userData.payRecordList": { type: type, offsetNum: offset, currentNum: Number(currentNum), time: new Date().toLocaleString() } } });
        return true;
    }
    //获取用户房卡变动记录
    async getUserPayRecord(uname) {
        var result = {};
        var userdata = await this.where({ uname: uname }).find();
        if (userdata) {
            result.status = 0;
            result.payRecord = userdata.userData.payRecordList;
        } else {
            result.status = 1;
        }
        return result;
    }
    //后台修改用户资料
    async alterUserData(uname, nickName, password, roomcard,currency) {
        var userdata = await this.where({ uname: uname }).find();
        var rcard = userdata.userData.roomcard;
        var setNum = Number(roomcard) - rcard;
        var result = {};
        var userCurrency = userdata.userData.currency;
        var setCurrNum = Number(currency) - userCurrency;
        if(Number(currency) != userCurrency)
        {
            await this.where({ uname: uname }).update({ $addToSet: { "userData.payRecordList": { type: 10, offsetNum: setCurrNum, currentNum: Number(currency), time: new Date().toLocaleString() } } });
        }
        if (Number(roomcard) != rcard) {
            await this.where({ uname: uname }).update({ $addToSet: { "userData.payRecordList": { type: 1, offsetNum: setNum, currentNum: Number(roomcard), time: new Date().toLocaleString() } } });
            await this.where({ uname: uname }).update({ $set: { 'userData.name': nickName, 'userData.roomcard': Number(roomcard), 'userData.currency':Number(currency)} });
            if (password != "") {
                await this.where({ uname: uname }).update({ $set: { password: password } });
            }
        } else {
            await this.where({ uname: uname }).update({ $set: { 'userData.name': nickName, 'userData.roomcard': Number(roomcard), 'userData.currency':Number(currency) } });
            if (password != "") {
                await this.where({ uname: uname }).update({ $set: { password: password } });
            }
        }
        result.status = 0;
        return result;
    }
}