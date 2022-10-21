'use strict';

import Base from './base.js';

export default class extends Base{
    init(http) {
        super.init(http);
        this.http.header("Access-Control-Allow-Origin", "*");
        this.http.header("Access-Control-Allow-Headers", "X-Requested-With");
        this.http.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
        this.http.header("X-Powered-By", ' 3.2.1')
        this.http.header("Content-Type", "application/json;charset=utf-8");
    }
    //获取回放记录
    async getplaybackAction(){
        var id = this.post("id");
        let playbackModel = think.model('playback', think.config('db'), 'home');
        var data = await playbackModel.getPlaybackData(id);
        var resData = {};
        resData.action = "getPlayback";
        if(data.id)
        {
            resData.status = 0;
            resData.data = data;
        }else
        {
            resData.status = 1;
        }
        return this.json(resData);
    }
}