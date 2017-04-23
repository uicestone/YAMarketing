(function () {
    'use strict';

    angular.module('app.wizard')
    .controller('wizardCtrl', ['$scope', '$window', '$location', '$route', '$mdToast', 'userService', 'channelService', 'projectService', 'regionService', wizardCtrl]);

    function wizardCtrl($scope, $window, $location, $route, $mdToast, userService, channelService, projectService, regionService) {

        $scope.platforms = [
            '微信', '微博', 'QQ'
        ];

        $scope.provinces = regionService.query();
        $scope.cities = [];

        $scope.$watch('project.region[0]', function(province) {
            if(!province || !province.id) {
                return;
            }
            $scope.cities = regionService.query(province.id);
        });

        // 切换省时清空市
        $scope.$watch('cities.$resolved', function(resolved) {
            if(!resolved)
                return;

            if($scope.project && $scope.project.region[1] && $scope.cities.map(function(city){return city.id}).indexOf($scope.project.region[1].id) === -1) {
                $scope.project.region[1] = null;
            }
        })

        $scope.kpiNames = ['PV', 'UV', '转化数', '转化率', '获取用户数', '平均停留时间', '分享率'];

        $scope.channels = channelService.query({limit:1000});

        $scope.isEditing = $location.search().editing;

        if($route.current.params.id) {
            $scope.project = projectService.get({id:$route.current.params.id});
        }
        else {
            $scope.project = new projectService();
            if(!$scope.$parent.user.can('set-user')) {
                $scope.project.manager = $scope.$parent.user;
            }
        }

        // check items in channel list which are already in project.channels
        Promise.all([$scope.project.$promise, $scope.channels.$promise]).then(function(result) {
            var project = result[0];
            var channels = result[1];
            var projectChannelIds;

            if(!project || !project.channels) {
                return;
            }

            projectChannelIds = project.channels.map(function(channel) { return channel._id; });

            channels.forEach(function(channel) {
                if(projectChannelIds.indexOf(channel._id) > -1) {
                    channel.selected = true;
                }
            });
        });

        $scope.saveKpi = function(kpi) {
            
            if(!$scope.project.kpis) {
                $scope.project.kpis = [];
            }

            $scope.project.kpis.push(kpi);
            $scope.newKpi = false;
        };

        $scope.addKpi = function() {
            $scope.newKpi = undefined;
        };

        $scope.removeKpi = function(kpiToRemove) {
            $scope.project.kpis = $scope.project.kpis.filter(function(kpi) {
                return kpi.type !== kpiToRemove.type;
            });
        }

        $scope.addKpiTiming = function(kpi, newTiming) {
            
            if(!kpi.timings) {
                kpi.timings = [];
            }

            kpi.timings.push(newTiming);
            delete kpi.newTiming;
        }

        $scope.removeKpiTiming = function(kpi, timingToRemove) {
            kpi.timings = kpi.timings.filter(function(timing) {
                return timing.name !== timingToRemove.name;
            });
        }

        $scope.startDatePercentage = function(item) {
            const projectDuration = new Date($scope.project.endDate) - new Date($scope.project.startDate) + 86400000;
            return (new Date(item.startDate) - new Date($scope.project.startDate)) / projectDuration * 100;
        };

        $scope.durationPercentage = function(item) {
            const projectDuration = new Date($scope.project.endDate) - new Date($scope.project.startDate) + 86400000;
            return (new Date(item.endDate) - new Date(item.startDate)) / projectDuration * 100;
        };

        $scope.saveProject = function(project, then) {
            project.$save().then(function(project) {
                if(then === true || $scope.isEditing) {
                    $location.path('project/' + project._id);
                } else if(then) {
                    $location.path(then + '/' + project._id);
                }
            });
        };

        $scope.updateProjectChannel = function(channel){
            
            if(channel.selected) {
                
                //we add this channel to project
                if(!$scope.project.channels) {
                    $scope.project.channels = [];
                }

                $scope.project.channels.push(channel);
            }
            else {
                // we remove this channel from project
                $scope.project.channels = $scope.project.channels.filter(function(currentChannel) { return currentChannel._id !== channel._id; });
            }
        };

        $scope.urlCopied = function() {
            $mdToast.show($mdToast.simple('链接已复制到剪贴板').position('top right'));
        };

        $scope.getUsers = function(roles, name) {
            return userService.query({roles:roles, name: name}).$promise;
        };
    }
    
})(); 



