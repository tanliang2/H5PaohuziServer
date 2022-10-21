'use strict';

import Base from './base.js';
var crypto = require('crypto');

export default class extends Base {
    init(http){
        super.init(http);
        this.http.header("Access-Control-Allow-Origin", "*");
        this.http.header("Access-Control-Allow-Headers", "X-Requested-With");
        this.http.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
        this.http.header("X-Powered-By", ' 3.2.1')
        this.http.header("Content-Type", "application/json;charset=utf-8");
    }

    //管理员登录 
    async adminloginAction() {
        let uname = this.post("uname");
        let password = this.post("password");
        var resData = {};
        resData.action = "adminLogin";
        var data = await this.model("home/manager").findManager(uname);
        if (data && data.uname) {
            if (data.password == password) {
                resData.status = 0;
                resData.data = {};
                resData.data.name = data.uname;
                resData.msg = "登录成功";
            } else {
                resData.status = 1;
                resData.msg = "密码错误";
            }
        } else {
            resData.status = 2;
            resData.msg = "用户不存在";
        }
        return this.json(resData);
    }
    //玩家登录
    async onloginAction() {
        let uname = this.post("uname");
        let password = this.post("password");
        var resData = {};
        resData.action = "onLogin";
        if (this.controller('home/socketio').getSocketByUname(uname) != null) {
            resData.status = 3;
            resData.msg = "该用户已经登录！";
            return this.json(resData);
        }
        var data = await this.model("user").findUser(uname);
        if (data && data.uname) {
           // var hasher = crypto.createHash("md5");
           // hasher.update(data.password);
           // var hashmsg = hasher.digest('hex');//hashmsg为加密之后的数据
            if (data.password == password) {
                resData.status = 0;
                resData.data = data.userData;
                resData.data.uname = data.uname;
                resData.msg = "登录成功";
                var roomcfg = this.config("roomcfg");
                resData.roomcfg = roomcfg;
                this.controller('home/socketio').addUser(resData.data);
            } else {
                resData.status = 1;
                resData.msg = "密码错误";
            }
        } else {
            resData.status = 2;
            resData.msg = "用户不存在";
        }
     //   this.setCorsHeader();
        return this.json(resData);
    }
    //注册
    async adduserAction() {
        let uname = this.post("uname");
        let password = this.post("password");
        var resData = {};
        resData.action = "addUser";
        var data = await this.model("user").findUser(uname);
        if (data && data.uname) {
            resData.status = 1;
            resData.msg = "用户已存在";
            return this.json(resData);
        } else {
            try {
                await this.model("user").addUser(uname, password);
            } catch (err) {
                resData.status = 2;
                resData.msg = "注册失败";
                return this.json(resData);
            }
            resData.status = 0;
            resData.msg = "注册成功";
            this.controller('home/socketio').addRegistUser(uname);
            return this.json(resData);
        }
    }
    //根据用户名获取用户
    async getuserAction() {
        let uname = this.post("uname");
        var resData = {};
        resData.action = "getUser";
        var data = await this.model("user").findUser(uname);
         if (data && data.uname) {
            resData.status = 0;
            resData.data = data.userData;
            resData.data.uname = data.uname;
            var roomcfg = this.config("roomcfg");
            resData.roomcfg = roomcfg;
            resData.msg = "登录成功";
            this.controller('home/socketio').addUser(resData.data);
        } else {
            resData.status = 2;
            resData.msg = "用户不存在";
        }
        return this.json(resData);
    }
    //获取战绩记录
    async getrecorddataAction() {
        var uid = this.post("uid");
        var resData = {};
        resData.action = "getRecordData";
        var data = await this.model("user").getRecordData(uid);
        if (data) {
            resData.recordData = data;
            resData.status = 0;
        } else {
            resData.status = 1;//未找到数据
        }
        return this.json(resData);
    }
    //根据用户id获取用户
    async getuserbyidAction() {
        var uid = this.post("uid");
        var resData = {};
        resData.action = "getUserById";
        var data = await this.model("user").findUserById(uid);
        if (data && data.uname) {
            resData.status = 0;
            resData.data = data.userData;
            resData.msg = "获取用户信息成功";
        } else {
            resData.status = 1;
            resData.msg = "用户不存在";
        }
        return this.json(resData);
    }
    //后台修改用户信息
    async alteruserdataAction() {
        var response = this.post();
        var resData = {};
        resData.action = "getUserById";
        var data = await this.model("user").alterUserData(response.uname, response.nickName, response.password, response.roomCard,response.currency);
        if (data.status == 0) {
            var userlist = this.controller('home/socketio').getOnlineUserList();
            if (userlist[response.uname]) {
                userlist[response.uname].name = response.nickName;
                userlist[response.uname].roomcard = response.roomCard;
            }
            var regesitUserList = this.controller('home/socketio').getRegistUserList();
            if (regesitUserList[response.uname]) {
                regesitUserList[response.uname].name = response.nickName;
                regesitUserList[response.uname].roomcard = response.roomCard;
            }
        }
        resData.data = data;
        return this.json(resData);
    }
    //添加管理员
    async addmanagerAction() {
        let uname = this.post("uname");
        let password = this.post("password");
        var resData = {};
        var udata = await this.model("home/manager").findManager(uname);
        if (udata && udata.uname) {
            resData.status = 1;
            resData.msg = "用户已存在";
            return this.json(resData);
        } else {
            var result = await this.model("home/manager").addManager(uname, password);
            if (result) {
                resData.status = 0;
                resData.msg = "注册成功";
            } else {
                resData.status = 2;
                resData.msg = "注册失败";
            }
            return this.json(resData);
        }
    }
    //重置管理员密码
    async resetmanagerpassAction() {
        let uname = this.post("uname");
        let password = this.post("password");
        var resData = {};
        var data = await this.model("home/manager").resetManagerPass(uname, password);
        resData.msg = (data == 0) ? "重置成功!" : "重置失败!";
        resData.status = data;
        return this.json(resData);
    }
    //微信登录回调
    async notifywxloginAction() {
        var userData = this.post();
        var resData = {};
        var data = await this.model("user").findUser(userData.openid);
        if (data && data.uname) {
            //更新微信用户数据
            this.model("user").updateWxUserData(userData)
        } else {
            //添加微信用户到数据库
            this.model("user").addWxUser(userData);
        }
        resData.msg = "回调处理成功";
        return this.json(resData);
    }
    //玩家登录
    async getwxuserdataAction() {
        var openid = this.post("openid");
        var resData = {};
        resData.action = "getWxUserData";
        var data = await this.model("user").findUser(openid);
        if (data && data.uname) {
            resData.status = 0;
            resData.data = data.userData;
            resData.data.uname = data.uname;
            var roomcfg = this.config("roomcfg");
            resData.roomcfg = roomcfg;
            resData.msg = "登录成功";
            this.controller('home/socketio').addUser(resData.data);
        } else {
            resData.status = 2;
            resData.msg = "用户不存在";
        }
        return this.json(resData);
    }
}