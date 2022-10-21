'use strict';

import Base from './base.js';
var upgradelogic = require("./../logic/upgradelogic");

export default class extends Base {
  init(http) {
    super.init(http);
    this.http.header("Access-Control-Allow-Origin", "*");
    this.http.header("Access-Control-Allow-Headers", "X-Requested-With");
    this.http.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    this.http.header("X-Powered-By", ' 3.2.1')
    this.http.header("Content-Type", "application/json;charset=utf-8");
  }
  /**
   * index action
   * @return {Promise} []
   */
  indexAction() {
    //auto render template file index_index.html
    var mahList = [0,0,0,1,0,1,1,1,0,0,0,0,0,2,2,0,0,0,0,0];
    var speicalList = [{action:1,moArr:[0,1,2]},{action:1,moArr:[0,10,10]},{action:2,moArr:[4,4,4]},{action:4,moArr:[16,16,16,16]}]
    var res = upgradelogic.getResultFan(mahList,speicalList);
    console.log(res);
    this.http.end("红鸟H5游戏平台 v1.0.1");
 //   return this.display();
  }

  async changelogAction() {
    // let controllerInstance = this.controller('home/socketio');
    // var result = await this.model("user").getUserList();
    var roomcfg = this.config("roomcfg");
    return this.success({ result: roomcfg });
  }
}