//~~~~~~~~~~~游戏状态
exports.GAME_ST_WAIT = 0; //等待状态
exports.GAME_ST_READY = 1; //准备状态
exports.GAME_ST_GETCARD = 2;//抓牌状态
exports.GAME_ST_CHECK_MAH = 3; //检查手牌
exports.GAME_ST_ONTURN = 4; //出牌状态
exports.GAME_ST_WAIT_PLAY = 5; //等待其他玩家操作
exports.GAME_ST_SPECIAL = 6; //处理特殊情况，吃，碰，杠，胡
exports.GAME_ST_OUT = 7; //托管
exports.USER_COUNT = 3; //房间用户数

//房间状态
exports.ROOM_ST_WAIT_JOIN = "wait_for_join"; //等待玩家加入
exports.ROOM_ST_WAIT_PLAY = "wait_for_play"; //等待开始游戏
exports.ROOM_ST_WAIT_START = "wait_for_start"; //等待房主开始游戏
exports.ROOM_ST_WAIT_DEAL = "wait_for_deal"; //等待发牌
exports.ROOM_ST_WAIT_RESUME = "wait_for_resume"; //等待重新开始
exports.ROOM_ST_WAIT_DISMISS = "wait_for_dismiss"; //等待解散房间
exports.ROOM_ST_WAIT_WAKE = "wait_for_wake"; //等待激活房间
exports.ROOM_ST_WAIT_CONTINUE = "wait_for_continue"; //等待继续游戏

//胡牌类型
exports.HH = 1; //红胡
exports.ZDH = 2; //真点胡
exports.JDH = 3; //假点胡
exports.HW = 4; //红乌
exports.WH = 5; //乌胡
exports.DDH = 6; //对对胡
exports.DH = 7; //大胡
exports.XH = 8; //小胡
exports.ZM = 9; //自摸
exports.TH = 10; //天胡
exports.HDH = 11; //海底胡
