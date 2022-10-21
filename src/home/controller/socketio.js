'use strict';

import Base from './base.js';
import roomModel from './../game/roommodel';
import roomuserManager from './../game/roomusermanager';
var eventDispatcher = require("./eventdispatcher");
var upgradelogic = require("./../logic/upgradelogic");

var socketList = {};
var roomList = {}; //所有房间列表
var normalRoomList = { 2: [], 3: [], 4: [] }; //金币房间列表
var roomCount = 10;
var userCount = 0;
var userList = {};
var onlineCountList = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, 22: 0, 23: 0 }; //每天各个整点在线用户数
var lastLoginTime = null;
var regesitUser = {}; //注册用户
var regesitUserList = {};//注册用户详细数据
var mahjongSetList = {}; //后台设置麻将数据

export default class extends Base {
  init(http) {
    super.init(http);
    this.http.header("Access-Control-Allow-Origin", "*");
    this.http.header("Access-Control-Allow-Headers", "X-Requested-With");
    this.http.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    this.http.header("X-Powered-By", ' 3.2.1')
    this.http.header("Content-Type", "application/json;charset=utf-8");
    upgradelogic.socketioProxy = this;
  }
  openAction(self) {
  //  this.http.io.set('heartbeat timeout', 15000);
    var socket = self.http.socket;
    //初始化socket
    socket.on("initSocket", function (uid, uname) {
      var checkResult = self.checkIfInRoom(uid);
      socket.emit("getip", socket.handshake.address.substr(7));
      if (checkResult) {
        roomList[checkResult.roomId].onUserReback(uid, socket, 1);
      }
      socketList[uname] = socket;
    })
    //断线自动重连
    socket.on("onReconect", function (uid) {
      var checkResult = self.checkIfInRoom(uid);
      if (checkResult) {
        roomList[checkResult.roomId].onUserReback(uid, socket, 2);
      }else
      {
        socket.emit("notInRoom");
      }
    })
    //创建房卡房间
    socket.on("createRoom", async function (userData, roomsetData) {
      var checkResult = self.checkIfInRoom(userData.uid);
      if (checkResult) {
        socket.emit("createFail", "您已经处于一个房间中了，请退出房间后再创建");
        return;
      }
      var maxRound = roomsetData.maxRound;
      var roundList = { 24: 12, 12: 6, 6: 4 };
      let userModel = think.model('user', think.config('db'), 'home');
      var res = await userModel.setUserRoomcard(userData.uid, -roundList[maxRound], 2);
      if (!res) {
        socket.emit("createFail", "房卡不足！");
        return;
      }
      var roomID = "2" + roomCount + "" + (Math.round(Math.random() * 100) + 10);
      var roomInfo = new roomModel(roomID); // roomModel.create(roomID);
      roomList[roomID] = roomInfo;
      roomInfo.roomsetData = roomsetData;
      roomInfo.maxRound = roomsetData.maxRound;
      var deskStation = roomInfo.getFreeDesk();
      var roomUser = new roomuserManager(socket, userData, roomID, roomList[roomID], deskStation);
      roomUser.startUp();
      roomInfo.addUser(roomUser);
      roomCount++;
    //  roomInfo.addBot();

      socket.join(roomID);    // 加入房间
      socket.emit("createSucc", roomID);
    });
    //加入房间
    socket.on("joinRoom", function (userData, roomId) {
      if (!roomList[roomId]) {
        socket.emit("joinFail", "房间不存在");
        return;
      }
      var checkResult = self.checkIfInRoom(userData.uid);
      if (checkResult != null && checkResult.roomId != roomId) {
        socket.emit("joinFail", "您已经处于一个房间中了，请退出房间后再加入");
        return;
      }
      var roomID = roomId;
      var isInRoom = false;
      var deskStation = -1;
      if(roomList[roomID].roomType != 1)
      {
        var hasobj = { 2: "normal", 3: "middle", 4: "hight" };
        var roomcfg = self.config("roomcfg");
        var cfgData = roomcfg[hasobj[roomList[roomID].roomType]];
        if (userData.currency < cfgData.limit) {
          socket.emit("createFail", "进入失败！金币总数需大于" + cfgData.limit + "才能进入该房间！");
          return;
        }
      }
      
      for (var k in roomList[roomID].userList) {
        if (roomList[roomID].userList[k].user.uid == userData.uid) {
          isInRoom = true;
          deskStation = k;
          break;
        }
      }

      if (isInRoom) {
        var userManager = roomList[roomID].userList[deskStation];
        if (userManager.isOutline) {
          userManager.isOutline = false;
        }
        userManager.setSocket(socket);
        userManager.startUp();
        roomList[roomID].addUser(userManager, true);
      } else {
        var userCount = roomList[roomID].getUserCount();
        if(userCount >= 3)
        {
          socket.emit("createFail", "房间已满，请进入其他房间！");
          return;
        }
        var deskStation = roomList[roomID].getFreeDesk();
        var roomUser = new roomuserManager(socket, userData, roomID, roomList[roomID], deskStation);
        roomUser.startUp();
        roomList[roomID].addUser(roomUser);
      }
      socket.join(roomID);
    })
    //加入金币房间请求
    socket.on("enternormalRoom", function (level,userData) {
      var hasobj = { 2: "normal", 3: "middle", 4: "hight" };
      var roomcfg = self.config("roomcfg");
      var cfgData = roomcfg[hasobj[level]];
      if(!userData.isbot)
      {
        var checkResult = self.checkIfInRoom(userData.uid);
        if (checkResult) {
          socket.emit("createFail", "您已经处于一个房间中了，请退出房间后再创建");
          return;
        }
        if (userData.currency < cfgData.limit) {
          socket.emit("createFail", "进入失败！金币总数需大于" + cfgData.limit + "才能进入该场！");
          return;
        }
      }
      var rlist = normalRoomList[level];
      rlist.sort(function (a, b) {
        return (a.getUserCount() > b.getUserCount()) ? -1 : 1;
      })
      if (rlist.length == 0 || rlist[rlist.length - 1].getUserCount() == 3) {
        var roomID = "2" + roomCount + "" + (Math.round(Math.random() * 100) + 10);
        var roomInfo = new roomModel(roomID, level);
        roomList[roomID] = roomInfo;
        normalRoomList[level].push(roomInfo);
        roomInfo.maxRound = cfgData.roundNum;
        var deskStation = roomInfo.getFreeDesk();
        var roomUser = new roomuserManager(socket, userData, roomID, roomList[roomID], deskStation);
        roomUser.startUp();
        roomInfo.addUser(roomUser);
        roomCount++;

        socket.join(roomID);    // 加入房间
        // socket.emit("createSucc", roomID);
      } else {
        var roomId;
        for (var i = 0; i < rlist.length; i++) {
          if (rlist[i].getUserCount() < 3) {
            roomId = rlist[i].roomID;
            break;
          }
        }
        var deskStation = roomList[roomId].getFreeDesk();
        var roomUser = new roomuserManager(socket, userData, roomId, roomList[roomId], deskStation);
        roomUser.startUp();
        roomList[roomId].addUser(roomUser);
        socket.join(roomId);
      }
    })
    //断开连接
    socket.on("disconnect", function () {
      if (userCount > 0) userCount--;
      for (var k in socketList) {
        if (socketList[k] == socket) {
          delete socketList[k];
          delete userList[k];
          break;
        }
      }
    })
  }

  //是否在房间内检测
  checkinroomAction(){
    var uid = this.post("uid");
    var resData = {};
    resData.status = 0;
    var checkResult = this.checkIfInRoom(uid);
    if (checkResult) {
      resData.status = 1;
    }
    console.log("sssssssssssssssssssssss" + resData.status);
    return this.json(resData);
  }

  //创建房间检测
  async checkcreateAction() {
    var maxRound = this.post("maxRound");
    var uid = this.post("uid");
    var resData = {};
    resData.status = 0;
    var checkResult = this.checkIfInRoom(uid);
    if (checkResult) {
      resData.status = 1;
      resData.msg = "您已经处于一个房间中了，请退出房间后再创建";
      return this.json(resData);
    }
    var roundList = { 24: 12, 12: 6, 6: 4 };
    let userModel = think.model('user', think.config('db'), 'home');
    var udata = await userModel.where({ "userData.uid": Number(uid) }).find();
    var res = udata.userData.roomcard - roundList[maxRound] >= 0;
    if (!res) {
      resData.status = 2;
      resData.msg = "房卡不足!";
      return this.json(resData);
    }
    return this.json(resData);
  }

  //加入房间检测
  async checkjoinAction(self) {
    var roomid = this.post("roomid");
    var uid = this.post("uid");
    var currency = this.post("currency");
    var resData = {};
    resData.status = 0;
    if (!roomList[roomid]) {
      resData.status = 1;
      resData.msg = "房间不存在!";
      return this.json(resData);
    }
    var checkResult = this.checkIfInRoom(uid);
    if (checkResult) {
      resData.status = 2;
      resData.msg = "您已经处于一个房间中了，请退出房间后再创建";
      return this.json(resData);
    }

    var userCount = roomList[roomid].getUserCount();
    if (userCount >= 3) {
      resData.status = 2;
      resData.msg = "房间已满，请进入其他房间！";
      return this.json(resData);
    }
    
    if (roomList[roomid].roomType != 1) {
      var hasobj = { 2: "normal", 3: "middle", 4: "hight" };
      var roomcfg = self.config("roomcfg");
      var cfgData = roomcfg[hasobj[roomList[roomid].roomType]];
      if (currency < cfgData.limit) {
        resData.status = 2;
        resData.msg = "进入失败！金币总数需大于" + cfgData.limit + "才能进入该房间！";
        return this.json(resData);
      }
    }

    return this.json(resData);
  }

  //加入金币场检测
  checkjoincroomAction(){
    var roomType = this.post("roomid");
    var uid = this.post("uid");
    var currency = this.post("currency");
    var resData = {};
    resData.status = 0;
    var checkResult = this.checkIfInRoom(uid);
    if (checkResult) {
      resData.status = 2;
      resData.msg = "您已经处于一个房间中了，请退出房间后再创建";
      return this.json(resData);
    }
    var hasobj = { 2: "normal", 3: "middle", 4: "hight" };
    var roomcfg = this.config("roomcfg");
    var cfgData = roomcfg[hasobj[roomType]];
    if (currency < cfgData.limit) {
      resData.status = 2;
      resData.msg = "进入失败！金币总数需大于" + cfgData.limit + "才能进入该房间！";
      return this.json(resData);
    }
    return this.json(resData);
  }

  //设置房间初始牌
  setusermahjongAction() {
    var response = this.post();
    var setList = JSON.parse(response.setList);
    var roomId = response.roomId;
    var allMahjongList = upgradelogic.getAllMahjong();
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
    mahjongSetList[roomId].baoSet = response.bao;
    var resData = {};
    resData.action = "setRoomCard";
    resData.msg = "设置成功";
    return this.json(resData);
  }
  //添加机器人
  addbotAction(){
    var roomid = this.post("roomid");
    var resData = {};
    resData.action = "addbot";
    if(roomList[roomid].getUserCount() < 3)
    {
      roomList[roomid].addBot();
      resData.msg = "成功添加了一个机器人。";
    }else
    {
      resData.msg = "房间人数已满!";
    }
    return this.json(resData);
  }

  //获取设置的麻将牌
  getRoomSetMahList(roomId) {
    return mahjongSetList[roomId];
  }
  //删除设置的牌
  removeRoomSetMahList(roomId) {
    delete mahjongSetList[roomId];
  }

  //获取当前在线人数
  getOnlineNumber() {
    var res = {};
    var roomCount = 0;
    for (var k in roomList) {
      roomCount++;
    }
    var now = new Date();
    var dateStr = now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate();
    res.regestCount = (!regesitUser[dateStr]) ? 0 : regesitUser[dateStr].length;
    res.userCount = userCount;
    res.roomCount = roomCount;
    return res;
  }
  //获取房间列表
  getRoomList() {
    return roomList;
  }
  //添加在线用户
  addUser(udata) {
    userList[udata.uname] = udata;
    userCount++;
    var now = new Date();
    var dateStr = now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate();
    if (regesitUser[dateStr] && (regesitUser[dateStr].indexOf(udata.uname) != -1)) {
      regesitUserList[udata.uname] = udata;
    }
    if (lastLoginTime != null) {
      if (now.getDate() != lastLoginTime.getDate()) {
        onlineCountList = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, 22: 0, 23: 0 };
        var hours = now.getHours();
        onlineCountList[hours] = userCount;
      } else {
        var lastHours = lastLoginTime.getHours();
        var nowHours = now.getHours();
        for (var i = lastHours + 1; i < nowHours; i++) {
          onlineCountList[i] = onlineCountList[lastHours];
        }
        if (onlineCountList[nowHours] == 0)
          onlineCountList[nowHours] = userCount;
      }
    } else {
      onlineCountList[now.getHours()] = userCount;
    }
    lastLoginTime = now;
  }
  //获取在线列表
  getOnlineCountList() {
    return onlineCountList;
  }
  //添加注册用户
  addRegistUser(user) {
    var now = new Date();
    var dateStr = now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate();
    if (!regesitUser[dateStr]) regesitUser[dateStr] = [];
    regesitUser[dateStr].push(user);
  }
  //获取在线用户列表
  getOnlineUserList() {
    return userList;
  }
  //获取今日注册用户
  getRegistUserList() {
    return regesitUserList;
  }
  //获取房间信息列表
  getRoomDataList() {
    var roomDataList = [];
    for (var k in roomList) {
      roomDataList.push(roomList[k].getRoomData());
    }
    return roomDataList;
  }
  //检查是否在房间内
  checkIfInRoom(uid) {
    for (var k in roomList) {
      for (var o in roomList[k].userList) {
        if (roomList[k].userList[o].user.uid == uid) {
          return { roomId: k, userIndex: o };
        }
      }
    }
    return null;
  }
  //获取socket
  getSocketByUname(uname) {
    return socketList[uname];
  }
  //移除socket
  removeSocket(socket) {
    for (var k in socketList) {
      if (socketList[k] == socket) {
        delete socketList[k];
        break;
      }
    }
  }
  //解散房间
  dissovleRoom(roomid) {
    roomList[roomid] = null;
    delete roomList[roomid];
    for(var k in normalRoomList)
    {
      for(var i = 0;i < normalRoomList[k].length;i++)
      {
        if(normalRoomList[k][i].roomID == roomid)
        {
          normalRoomList[k][i] = null;
          normalRoomList[k].splice(i,1);
          break;
        }
      }
    }
  }

}