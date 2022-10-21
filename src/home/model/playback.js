'use strict';
/**
 * model
 */
export default class extends think.model.mongo {
    //添加记录
    async addRecord(data) {
        let usercountModel = think.model('usercount', think.config('db'), 'home');
        var playbackCount = await usercountModel.getPlaybackCount();
        try {
            await this.add({
                id: playbackCount,
                data: data
            });
            usercountModel.addPlaybackCount();
            return playbackCount;
        }catch(err){
            return -1;
        }
        
    }
    //获取回放数据
    async getPlaybackData(id) {
        try {
            var playbackData = await this.where({ id: Number(id) }).find();
            return playbackData;
        } catch (err) {
            return null;
        }
    }
}