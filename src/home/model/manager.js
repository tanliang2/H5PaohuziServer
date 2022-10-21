'use strict';
/**
 * model
 */
export default class extends think.model.mongo {
    //查找管理员
    async findManager(uname)
    {
        var managerdata = await this.where({uname: uname}).find();
        return managerdata;
    }
    //添加管理员
    async addManager(uname,password){
        try{
            await this.add({ uname: uname, password: password });
        }catch(err){
            return false;
        }
        return true;
    }
    //重置管理员密码
    async resetManagerPass(uname,password){
        var managerdata = await this.where({uname: uname}).find();
        if(managerdata)
        {
            await this.where({uname: uname}).update({$set: { password: password }});
        }else
        {
            return 3;
        }
        return 0;
    }


}