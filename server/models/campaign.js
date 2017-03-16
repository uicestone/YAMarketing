var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var campaignSchema = new Schema({
    accessedAt: Date,
    device: String,
    mobile: String,
    email: String,
    sex: String,
    province: String,
    city: String,
    converted: Boolean,
    stayedFor: Number,
    shared: Boolean,
    fromChannel: {_id: Schema.Types.ObjectId, name: String},
    project: Schema.Types.ObjectId,
    createdAt: Date
}, {
    strict: false
});

campaignSchema.index({fromChannel:1});

module.exports = mongoose.model('Campaign', campaignSchema);
