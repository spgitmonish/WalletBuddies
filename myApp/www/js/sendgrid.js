// Sendgrid Emailster
// This guy should be returning promises of when it successfully send/fails emails.
//      License: MIT

  angular.module('email', []).factory('$email', ['$http', function($http) {
      return { $send : function (api_user, api_key, to, toname, subject, text, from)
                  {
                          var method = 'GET';
                          var url = "https://api.sendgrid.com/api/mail.send.json?";
                          $http({method: method, url: url  + "api_user=" + api_user + 
                                                                           "&api_key=" + api_key + 
                                                                           "&to=" + to +
                                                                           "&subject=" + subject + 
                                                                           "&text=" + text + 
                                                                           "&from=" + from}).
                          success(function(data, status) {}).
                          error(function(data, status) {});   
                  }
            };
    }
  ]);
