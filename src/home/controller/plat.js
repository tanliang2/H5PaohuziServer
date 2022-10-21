'use strict';

import Base from './base.js';

export default class extends Base {
    init(http) {
        super.init(http);
        this.http.header("Access-Control-Allow-Origin", "*");
        this.http.header("Access-Control-Allow-Headers", "X-Requested-With");
        this.http.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
        this.http.header("X-Powered-By", ' 3.2.1')
        this.http.header("Content-Type", "application/json;charset=utf-8");
    }
    //获取当前在线用户、房间数
    getonlinecountAction() {
        var resData = {};
        resData.data = this.controller('home/socketio').getOnlineNumber();
        return this.json(resData);
    }
    //获取当天各时间段在线人数
    getonlinecountlistAction() {
        var resData = {};
        resData.data = this.controller('home/socketio').getOnlineCountList();
        return this.json(resData);
    }

    //获取当前在线用户列表
    getonlineuserlistAction() {
        var resData = {};
        resData.data = this.controller('home/socketio').getOnlineUserList();
        return this.json(resData);
    }
    //获取今日注册用户
    getregistuserlistAction() {
        var resData = {};
        resData.data = this.controller('home/socketio').getRegistUserList();
        return this.json(resData);
    }
    //获取房间列表
    getroomdatalistAction() {
        var resData = {};
        resData.data = this.controller('home/socketio').getRoomDataList();
        return this.json(resData);
    }
    //获取用户房卡变动记录
    async getuserpayrecordAction() {
        var uname = this.post("uname");
        let userModel = think.model('user', think.config('db'), 'home');
        var data = await userModel.getUserPayRecord(uname);
        return this.json(data);
    }
}