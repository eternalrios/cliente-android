cordova.define("cordova-plugin-isemulator.cordova-plugin-isemulator", function(require, exports, module) {
var exec = require('cordova/exec');

exports.assess = function(success, error) {
    exec(success, error, "IsEmulator", "assess", []);
};

});
