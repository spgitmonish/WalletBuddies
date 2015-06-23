// Ionic Starter App
// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'ngCordova', 'firebase', 'email'])

.run(function($ionicPlatform) {
    $ionicPlatform.ready(function() {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }
    });
})

// All this does is allow the message
// to be sent when you tap return
.directive('input', function($timeout) {
  return {
    restrict: 'E',
    scope: {
      'returnClose': '=',
      'onReturn': '&',
      'onFocus': '&',
      'onBlur': '&'
    },
    link: function(scope, element, attr) {
      element.bind('focus', function(e) {
        if (scope.onFocus) {
          $timeout(function() {
            scope.onFocus();
          });
        }
      });
      element.bind('blur', function(e) {
        if (scope.onBlur) {
          $timeout(function() {
            scope.onBlur();
          });
        }
      });
      element.bind('keydown', function(e) {
        if (e.which == 13) {
          if (scope.returnClose) element[0].blur();
          if (scope.onReturn) {
            $timeout(function() {
              scope.onReturn();
            });
          }
        }
      });
    }
  }
})

.config(function($stateProvider, $urlRouterProvider) {

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider

    // State definition for Launch page
    .state('launch', {
        url: '/launch',
        templateUrl: 'templates/launchpage.html'
    })

    // States for signin and signup
    .state('signin', {
        url: '/signin',
        templateUrl: 'templates/signin.html',
        controller: 'SignInCtrl'
    })

    .state('signup', {
        url: '/signup',
        templateUrl: 'templates/signup.html',
        controller: 'AccountCtrl'
    })

    // setup an abstract state for the tabs directive
    .state('tab', {
        url: "/tab",
        abstract: true,
        templateUrl: "templates/tabs.html"
    })

    // Each tab has its own nav history stack:
    .state('tab.home', {
        url: '/home',
        views: {
            'tab-home': {
                templateUrl: 'templates/tab-home.html',
                controller: 'HomeCtrl'
            }
        }
    })

    .state('tab.wallet', {
        url: '/wallet',
        views: {
            'tab-wallet': {
                templateUrl: 'templates/tab-wallet.html',
                controller: 'WalletCtrl'
            }
        }
    })
	
	.state('tab.settings', {
        url: '/settings',
        views: {
            'tab-settings': {
                templateUrl: 'templates/tab-settings.html',
                controller: 'SettingsCtrl'
            }
        }
    })
	
	.state('tab.chat', {
        url: '/chat',
        views: {
            'tab-settings': {
                templateUrl: 'templates/chat.html',
                controller: 'ChatCtrl'
            }
        }
    })
	
    .state('tab.socialcircle', {
        url: '/socialcircle',
        views: {
            'tab-wallet': {
                templateUrl: 'templates/socialcircle-form.html',
                controller: 'GroupCtrl'
            }
        }
    })
    
    .state('tab.requests', {
        url: '/requests',
        views: {
            'tab-requests': {
                templateUrl: 'templates/tab-requests.html',
                controller: 'RequestsCtrl'
            }
        }
    })
    
    .state('tab.requests-detail', {
        url: '/requests/:circleID',
        views: {
            'tab-requests': {
                templateUrl: 'templates/requests-detail.html',
                controller: 'RequestsDetailCtrl'
            }
        }
    })

    .state('tab.friends', {
        url: '/friends',
        views: {
            'tab-friends': {
                templateUrl: 'templates/tab-friends.html',
                controller: 'FriendsCtrl'
            }
        }
    })

    .state('tab.friend-detail', {
        url: '/friend/:friendId',
        views: {
            'tab-friends': {
                templateUrl: 'templates/friend-detail.html',
                controller: 'FriendDetailCtrl'
            }
        }
    })

    .state('tab.account', {
        url: '/account',
        views: {
            'tab-settings': {
                templateUrl: 'templates/tab-account.html',
                controller: 'ConnectCtrl'
            }
        }
    })
    
    .state('tab.choose-account', {
        url: '/choose-account',
        views: {
            'tab-settings': {
                templateUrl: 'templates/choose-account.html',
                controller: 'ChooseAccCtrl'
            }
        }
    })
    
    .state('tab.kyc-details', {
        url: '/kyc-details',
        views: {
            'tab-settings': {
                templateUrl: 'templates/kyc-details.html',
                controller: 'KycCtrl'
            }
        }
    })
    
    .state('tab.kyc-questions', {
        url: '/kyc-questions',
        views: {
            'tab-settings': {
                templateUrl: 'templates/kyc-questions.html',
                controller: 'KycQuestionCtrl'
            }
        }
    })
    
    .state('tab.auth-question', {
        url: '/auth-question',
        views: {
            'tab-settings': {
                templateUrl: 'templates/auth-question.html',
                controller: 'QuestionCtrl'
            }
        }
    })
    
    .state('tab.auth-code', {
        url: '/auth-code',
        views: {
            'tab-settings': {
                templateUrl: 'templates/auth-code.html',
                controller: 'MFACtrl'
            }
        }
    });

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/launch');

});