const bluebird = require('bluebird');
const redisClient = require('redis').createClient();
const WechatAuth = require('wechat-auth');

bluebird.promisifyAll(WechatAuth.prototype);

/*
 * 获取全局component_verify_ticket的方法
 * 从redis缓存中读取
 */
const getVerifyTicket = function(callback) {
    return redisClient.get('component_verify_ticket', function(err, ticket) {
        if (err) {
            return callback(err);
        } else if (!ticket) {
            return callback(new Error('no component_verify_ticket'));
        } else {
            return callback(null, ticket);
        }
    });
};

/*
 * 获取全局component_access_token的方法
 * 从redis缓存中读取
 */
const getComponentToken = function(callback) {
    return redisClient.get('component_access_token', function(err, token) {
        if (err) {
            return callback(err);
        } else {
            return callback(null, JSON.parse(token));
        }
    });
};

/*
 * 保存component_access_token到redis中
 */
const saveComponentToken = function(token, callback) {
    return redisClient.setex('component_access_token', 7000, JSON.stringify(token), function(err, reply) {
        if (err) {
            callback(err);
        }
        return callback(null);
    });
};

let WechatAuthExport = () => {
    return new WechatAuth(process.env.COMPONENT_APP_ID, process.env.COMPONENT_APP_SECRET, getVerifyTicket, getComponentToken, saveComponentToken);
};

WechatAuthExport.saveAuthorizerAccessToken = (appId, accessToken, expiresIn = 7200) => {
    return redisClient.setex(`authorizer_access_token_${appId}`, expiresIn - 60, accessToken);
}

module.exports = WechatAuthExport;
