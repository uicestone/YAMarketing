const Project = require('../models/project.js');
const Campaign = require('../models/campaign.js');
const Channel = require('../models/channel.js');
const Types = require('mongoose').Types;

module.exports = (router) => {
    // Project CURD
    router.route('/project')

        // create a project
        .post((req, res) => {
            
            let project = new Project(req.body);      // create a new instance of the Project model
            project.brand = req.body.manager.brand;
            project.createdAt = new Date();

            // save the project and check for errors
            project.save((err, project) => {
                if (err)
                    return res.status(500).send(err);

                project.appid = project._id;
                project.save();

                res.json(project);
            });
            
        })

        // get all the projects for current user
        .get((req, res) => {
            const limit = +req.query.limit || 20;
            let skip = +req.query.skip || 0;

            let query = Project.find();

            if(req.query.page && !skip) {
                skip = (req.query.page - 1) * limit;
            }

            query.limit(limit).skip(skip);

            if (req.user.roles.indexOf('project_admin') > -1) {
                query.find({
                    'executive._id': req.user._id
                });
            }
            else if (req.user.roles.indexOf('brand_admin') > -1) {
                query.find({
                    'brand.name': req.user.brand.name
                });
            }

            if(req.query.keyword) {
                query.find({$or: [
                    {name: new RegExp(req.query.keyword)},
                    {appid: new RegExp(req.query.keyword)}
                ]});
            }

            ['name', 'url', 'appid'].forEach(property => {
                if(req.query[property]) {
                    query.find({[property]: new RegExp(req.query[property])});
                }
            });

            ['startDate', 'endDate'].forEach(property => {
                
                if(req.query[property]) {

                    const range = req.query[property].split(/[~_]/);

                    let condition = {[property]:{}};

                    if(range[0] && !isNaN(range[0])) {
                        condition[property].$gte = Number(range[0]);
                    }

                    if(range[1] && !isNaN(range[1])) {
                        condition[property].$lte = Number(range[1]);
                    }

                    query.find(condition);

                }

            })

            if(req.query.orderBy) {
                query.sort({
                    [req.query.orderBy]: (req.query.order === 'desc' || req.query.order === 'false' || Number(req.query.order) <= 0 ? 'desc' : 'asc')
                });
            }

            query.count()
            .then((total) => {
                return Promise.all([total, query.find().limit(limit).skip(skip).exec()]);
            })
            .then((result) => {
                let [total, page] = result;

                if(skip + page.length > total) {
                    total = skip + page.length;
                }

                res.set('items-total', total)
                .set('items-start', Math.min(skip + 1, total))
                .set('items-end', Math.min(skip + limit, total))
                .json(page);
            });
        });

    // on routes that end in /project/:projectId
    // ----------------------------------------------------
    router.route('/project/:projectId')

        // get the project with that id
        .get((req, res) => {
            Project.findById(req.params.projectId, (err, project) => {
                if (err)
                    return res.status(500).send(err);

                res.json(project);
            });
        })

        .put((req, res) => {
            Project.where({_id: req.params.projectId}).update(req.body, (err, raw) => {
                if (err)
                    return res.status(500).send(err);

                Project.findById(req.params.projectId, (err, project) => {
                    if (err)
                        return res.status(500).send(err);
                    
                    res.json(project);
                });
            });
        })

        // delete the project with this id
        .delete((req, res) => {
            Project.remove({
                _id: req.params.projectId
            }, (err, project) => {
                if (err)
                    return res.status(500).send(err);

                res.json({ message: 'Successfully deleted' });
            });
        });

    router.route('/project/:projectId/kpi-by-channels').get((req, res) => {
        Campaign.aggregate([{
            $match: {project: Types.ObjectId(req.params.projectId)}
        },{
            $group: {
                _id: "$fromChannel",
                uv: {$sum: 1},
                converts: {$sum: {$cond: {if: "$converted", then: 1, else: 0}}},
                timeStay: {$avg: "$stayedFor"},
                shares: {$sum: {$cond: {if: "$shared", then: 1, else: 0}}}
            }
        }]).then((result) => {
            res.send(result);
        });
    });

    router.route('/project/:projectId/kpi-by-date').get((req, res) => {
        Campaign.aggregate([{
            $match: {project: Types.ObjectId(req.params.projectId)}
        },{
            $group: {
                _id: {$dateToString: {format: "%Y-%m-%d", date: "$accessedAt"}},
                uv: {$sum: 1},
                converts: {$sum: {$cond: {if: "$converted", then: 1, else: 0}}}
            }
        }, {
            $sort: {_id: 1}
        }]).then((result) => {
            res.send(result);
        });
    });

    router.route('/project/:projectId/kpi-by-device').get((req, res) => {
        Campaign.aggregate([{
            $match: {project: Types.ObjectId(req.params.projectId)}
        },{
            $group: {
                _id: "$device",
                uv: {$sum: 1},
                converts: {$sum: {$cond: {if: "$converted", then: 1, else: 0}}}
            }
        }]).then((result) => {
            res.send(result);
        });
    });

    router.route('/project/:projectId/kpi-by-region').get((req, res) => {
        Campaign.aggregate([{
            $match: {project: Types.ObjectId(req.params.projectId)}
        },{
            $group: {
                _id: "$province",
                converts: {$sum: {$cond: {if: "$converted", then: 1, else: 0}}}
            }
        }]).then((result) => {
            res.send(result);
        });
    });

    router.route('/project/:projectId/campaign-record')

        .get((req, res) => {
            const limit = +req.query.limit || 20;
            let skip = +req.query.skip || 0;

            let query = Campaign.find({project: req.params.projectId});

            if(req.query.page && !skip) {
                skip = (req.query.page - 1) * limit;
            }

            query.count()
            .then((total) => {
                return Promise.all([total, query.find().limit(limit).skip(skip).exec()]);
            })
            .then((result) => {
                let [total, page] = result;

                if(skip + page.length > total) {
                    total = skip + page.length;
                }

                res.set('items-total', total)
                .set('items-start', Math.min(skip + 1, total))
                .set('items-end', Math.min(skip + limit, total))
                .json(page);
            });
        })

        .post((req, res) => {

            let record = new Campaign(req.body);      // create a new instance of the CampaignRecord model
            const channelId = req.query.channel;

            if(Object.keys(req.body).length === 0) {
                return res.status(400).send({message: 'Empty input.'});
            }

            record.createdAt = record.createdAt ? new Date(record.createdAt) : new Date();
            record.project = req.params.projectId;

            Channel.findOne({_id:channelId})
            .then((channel) => {
                if(!channel)
                    throw '';
                record.fromChannel = {_id: channel._id, name: channel.name};
            })
            .catch(() => {
                throw 'Invalid channel id.'
            })

            .then(() => {
                return Project.findOne({_id: record.project});
            })
            .then((project) => {
                if(!project)
                    throw '';
                return record.save();
            })
            .catch(() => {
                throw 'Invalid project id.'
            })

            .then((record) => {
                res.json(record);
            })
            .catch((err) => {
                return res.status(400).send({message: err});
            });

        });

    return router;
}
