'use strict';
/**
 * model
 */
export default class extends think.model.mongo {
    init(...args) {
        super.init(...args);
        this.tableName = 'userCount';
    }

    async getUserCount(){
        var data = await this.where({id:1}).find();
        return data.userCount;
    }
    //用户数+1
    addUserCount(){
       this.where({id: 1}).increment('userCount', 1);
    }
    //获取当前回放条数
    async getPlaybackCount(){
        var data = await this.where({id:1}).find();
        return data.playbackCount;
    }
    //回放数+1
    addPlaybackCount()
    {
        this.where({id: 1}).increment('playbackCount', 1);
    }
}