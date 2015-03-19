// Ionic Starter App
// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'ngCordova', 'firebase'])

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



.config(function($stateProvider, $urlRouterProvider) {

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider

    // .state('socialcircle', {
    //    url: "/socialcircle",
    //    templateUrl: "templates/socialcircle-form.html"
    //  })


<<<<<<< HEAD
  
  // State definition for Launch page
  
  	.state('launch', {
	 url: '/launch',
	 //abstract: true,
	 templateUrl: 'templates/launchpage.html'
  })
  
  // States for signin and signup
  
  	.state('signin', {
	 url: '/signin',
	 views: {
		 'launchpage': {
			 templateUrl: 'templates/signin.html',
			 controller: 'SignInCtrl'
		 }
	 }
  })
  
  
  	.state('signup', {
	 url: '/signup',
	 views: {
		 'signup': {
			 templateUrl: 'templates/signup.html',
			 controller: 'SignUpCtrl'
		 }
	 }
  })

=======
>>>>>>> origin/master

    // setup an abstract state for the tabs directive
    .state('tab', {
        url: "/tab",
        abstract: true,
        templateUrl: "templates/tabs.html"
    })


    // Each tab has its own nav history stack:

    .state('tab.dash', {
        url: '/dash',
        views: {
            'tab-dash': {
                templateUrl: 'templates/tab-dash.html',
                controller: 'AccountCtrl'
            }
        }
    })

    .state('tab.chats', {
            url: '/chats',
            views: {
                'tab-chats': {
                    templateUrl: 'templates/tab-chats.html',
                    controller: 'ChatsCtrl'
                }
            }
        })
        .state('tab.chat-detail', {
            url: '/chats/:chatId',
            views: {
                'tab-chats': {
                    templateUrl: 'templates/chat-detail.html',
                    controller: 'ChatDetailCtrl'
                }
            }
        })

    .state('tab.socialcircle', {
        url: '/socialcircle',
        views: {
            'tab-chats': {
                templateUrl: 'templates/socialcircle-form.html',
                controller: 'GroupCtrl'
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
            'tab-account': {
                templateUrl: 'templates/tab-account.html',
                controller: 'ConnectCtrl'
            }
        }
    })
<<<<<<< HEAD
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
      'tab-account': {
        templateUrl: 'templates/tab-account.html',
        controller: 'ConnectCtrl'
      }
    }
  })
  
  .state('tab.bank-auth', {
    url: '/account/:auth',
    views: {
      'tab-account': {
        templateUrl: 'templates/bank-auth.html',
        controller: 'ConnectCtrl'
      }
    }
  })

  
   ;

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/launch');

=======
>>>>>>> origin/master

    .state('tab.bank-auth', {
        url: '/account/:auth',
        views: {
            'tab-account': {
                templateUrl: 'templates/bank-auth.html',
                controller: 'ConnectCtrl'
            }
        }
    });

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/tab/dash');

});