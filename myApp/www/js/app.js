// Ionic Starter App
// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js

angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'ngCordova', 'firebase', 'email', 'cgNotify'])

.run(function($ionicPlatform, $cordovaPush, $state, $rootScope, $ionicPopup, notify, $ionicHistory) {
    return $ionicPlatform.ready(function() {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
            cordova.plugins.Keyboard.disableScroll(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }

        if (ionic.Platform.isAndroid()) {
            androidConfig = {
                "senderID": "456019050509" // Project number from GCM
            };
            $cordovaPush.register(androidConfig).then(function(deviceToken) {
                // Success -- Registration ID is received in $notificationReceiver and sent to FireBase
                console.log("Registration success app.js");
            }, function(err) {
                alert("Registration error: " + err);
            })
        } else if (ionic.Platform.isIOS()) {
            var iosConfig = {
                "badge": true,
                "sound": true,
                "alert": true,
            };
            $cordovaPush.register(iosConfig).then(function(deviceToken) {
                // Success -- send deviceToken to FireBase
                console.log("Registration success app.js");
            }, function(err) {
                alert("Registration error: " + err);
            });
        }

        // Listen and Display for New Push Notifications
        return $rootScope.$on('$cordovaPush:notificationReceived', function(event, notification) {
	        console.log("Notification : " + JSON.stringify(notification));
	      if (ionic.Platform.isAndroid()) {
		      switch(notification.event) {
		        case 'registered':
		          if (notification.regid.length > 0 ) {
		              console.log('registration ID = ' + notification.regid);
		              //alert("Device Registered for Push ");
		              // Get a reference to the Firebase account
					  var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
		              var fbUser = fbRef.child("Users").child($rootScope.fbAuthData.uid);
		              fbUser.update({
					  	deviceToken : notification.regid,
					  	device: "Android"
	            	  });
		          }
		          break;
		
		        case 'message':
		          // Push Notifications for when app is in the foreground
			      if (notification.foreground == true) {
					if (notification.payload.tab == "requests"){
						var messageTemplate = '<span ng-click="clickedNotification()">' + notification.message + '</span>';
						notify({
					        messageTemplate: messageTemplate
					    });
					    $rootScope.clickedNotification = function(){
					        notify.closeAll();
					        $state.go('tab.requests', {
					            circleID: notification.payload.url
					        });
					    };     
					}
					else if (notification.payload.tab == "chat"){
						// Updating chat badge counter
						var fbRef = new Firebase("https://walletbuddies.firebaseio.com");
						// Get a reference to where the User's accepted circles are going to be stored
						var fbUserAcceptedCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");
						fbUserAcceptedCircles.child(notification.payload.url).child("Members").child($rootScope.fbAuthData.uid).once("value", function(data){
							var counter = data.val().badgeCounter + 1;
							console.log("Badge counter " + counter);
							fbUserAcceptedCircles.child(notification.payload.url).child("Members").child($rootScope.fbAuthData.uid).update({
								badgeCounter: counter
							})
							fbRef.child("Circles").child(notification.payload.url).child("Members").child($rootScope.fbAuthData.uid).update({
								badgeCounter: counter
							})
							$rootScope.walletCount = $rootScope.walletCount + 1;
						});
						// To display Banner Notifications
					    var messageTemplate = '<span ng-click="clickedNotification()">' + notification.message + '</span>';
						notify({
					        messageTemplate: messageTemplate
					    });
					    $rootScope.clickedNotification = function(){
					        notify.closeAll();
					        // Current ionic build does not show a back button when navigating to chat page from another tab apart from tab.wallet(since chat belongs to this stack)
							// Hence clicking on a chat notification will be taken to tab.wallet if the user's current view is not currently in the tab.wallet stack
					        if ($ionicHistory.currentStateName() == "tab.wallet") {
						        $state.go('tab.chat', {
						            circleID: notification.payload.url
						        });
					        }
					        else if ($ionicHistory.currentStateName() == "tab.chat") {
						        $state.go('tab.chat', {
						            circleID: notification.payload.url
						        });
					        }
					        else if ($ionicHistory.currentStateName() == "tab.wallet-detail") {
						        $state.go('tab.chat', {
						            circleID: notification.payload.url
						        });
					        }
					        else {
						        $state.go('tab.wallet');
					        }
					    };
					}
				
				    if (notification.sound) {
				        var snd = new Media(event.sound);
				        snd.play();
				    }
			      }
			      else if (notification.foreground == false){ // if app is not open just go to page
			        if (notification.payload.tab == "requests"){
				        $state.go('tab.requests', {
				            circleID: notification.payload.url
				        });
					}
					else if (notification.payload.tab == "chat"){
						// Updating chat badge counter
						var fbRef = new Firebase("https://walletbuddies.firebaseio.com");
						// Get a reference to where the User's accepted circles are going to be stored
						var fbUserAcceptedCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");
						fbUserAcceptedCircles.child(notification.payload.url).child("Members").child($rootScope.fbAuthData.uid).once("value", function(data){
							var counter = data.val().badgeCounter + 1;
							fbUserAcceptedCircles.child(notification.payload.url).child("Members").child($rootScope.fbAuthData.uid).update({
								badgeCounter: counter
							})
							fbRef.child("Circles").child(notification.payload.url).child("Members").child($rootScope.fbAuthData.uid).update({
								badgeCounter: counter
							})
							$rootScope.walletCount = $rootScope.walletCount + 1;
						});
						// Current ionic build does not show a back button when navigating to chat page from another tab apart from tab.wallet(since chat belongs to this stack)
						// Hence clicking on a chat notification will be taken to tab.wallet if the user's current view is not currently in the tab.wallet stack
					    if ($ionicHistory.currentStateName() == "tab.wallet") {
					        $state.go('tab.chat', {
					            circleID: notification.payload.url
					        });
				        }
				        else if ($ionicHistory.currentStateName() == "tab.chat") {
					        $state.go('tab.chat', {
					            circleID: notification.payload.url
					        });
				        }
				        else if ($ionicHistory.currentStateName() == "tab.wallet-detail") {
					        $state.go('tab.chat', {
					            circleID: notification.payload.url
					        });
				        }
				        else {
					        $state.go('tab.wallet');
				        }
					}
					
				    if (notification.badge) {
				        $cordovaPush.setBadgeNumber(notification.badge).then(function(result) {
				          // Success!
				        }, function(err) {
				          // An error occurred. Show a message to the user
				        });
				    }
			      }
		          break;
		
		        case 'error':
		          alert('GCM error = ' + notification.msg);
		          break;
		
		        default:
		          alert('An unknown GCM event has occurred');
		          break;
		      }
	      }
	      else if (ionic.Platform.isIOS()) {
		      // Push Notifications for when app is in the foreground
		      if (notification.foreground == "1") {
				if (notification.tab == "requests"){
					var messageTemplate = '<span ng-click="clickedNotification()">' + notification.body + '</span>';
					notify({
				        messageTemplate: messageTemplate
				    });
				    $rootScope.clickedNotification = function(){
				        notify.closeAll();
				        $state.go('tab.requests', {
				            circleID: notification.url
				        });
				    };
				}
				else if (notification.tab == "chat"){
					// Updating chat badge counter
					var fbRef = new Firebase("https://walletbuddies.firebaseio.com");
					// Get a reference to where the User's accepted circles are going to be stored
					var fbUserAcceptedCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");
					fbUserAcceptedCircles.child(notification.url).child("Members").child($rootScope.fbAuthData.uid).once("value", function(data){
						var counter = data.val().badgeCounter + 1;
						console.log("Badge counter " + counter);
						fbUserAcceptedCircles.child(notification.url).child("Members").child($rootScope.fbAuthData.uid).update({
							badgeCounter: counter
						})
						fbRef.child("Circles").child(notification.url).child("Members").child($rootScope.fbAuthData.uid).update({
							badgeCounter: counter
						})
						$rootScope.walletCount = $rootScope.walletCount + 1;
					});
					// To display Banner Notifications
				    var messageTemplate = '<span ng-click="clickedNotification()">' + notification.body + '</span>';
					notify({
				        messageTemplate: messageTemplate
				    });
				    $rootScope.clickedNotification = function(){
				        notify.closeAll();
				        if ($ionicHistory.currentStateName() == "tab.wallet") {
					        $state.go('tab.chat', {
					            circleID: notification.url
					        });
				        }
				        else if ($ionicHistory.currentStateName() == "tab.chat") {
					        $state.go('tab.chat', {
					            circleID: notification.url
					        });
				        }
				        else if ($ionicHistory.currentStateName() == "tab.wallet-detail") {
					        $state.go('tab.chat', {
					            circleID: notification.url
					        });
				        }
				        else {
					        $state.go('tab.wallet');
				        }
				    };
				}
			
			    if (notification.sound) {
			        var snd = new Media(event.sound);
			        snd.play();
			    }
		      }
		      else if (notification.foreground == "0"){ // if app is not open just go to page
		        if (notification.tab == "requests"){
			        $state.go('tab.requests', {
			            circleID: notification.url
			        });
				}
				else if (notification.tab == "chat"){
					// Updating chat badge counter
					var fbRef = new Firebase("https://walletbuddies.firebaseio.com");
					// Get a reference to where the User's accepted circles are going to be stored
					var fbUserAcceptedCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");
					fbUserAcceptedCircles.child(notification.url).child("Members").child($rootScope.fbAuthData.uid).once("value", function(data){
						var counter = data.val().badgeCounter + 1;
						fbUserAcceptedCircles.child(notification.url).child("Members").child($rootScope.fbAuthData.uid).update({
							badgeCounter: counter
						})
						fbRef.child("Circles").child(notification.url).child("Members").child($rootScope.fbAuthData.uid).update({
							badgeCounter: counter
						})
						$rootScope.walletCount = $rootScope.walletCount + 1;
					});
					// Current ionic build does not show a back button when navigating to chat page from another tab apart from tab.wallet(since chat belongs to this stack)
					// Hence clicking on a chat notification will be taken to tab.wallet if the user's current view is not currently in the tab.wallet stack
					if ($ionicHistory.currentStateName() == "tab.wallet") {
				        $state.go('tab.chat', {
				            circleID: notification.url
				        });
			        }
			        else if ($ionicHistory.currentStateName() == "tab.chat") {
				        $state.go('tab.chat', {
				            circleID: notification.url
				        });
			        }
			        else if ($ionicHistory.currentStateName() == "tab.wallet-detail") {
				        $state.go('tab.chat', {
				            circleID: notification.url
				        });
			        }
			        else {
				        $state.go('tab.wallet');
			        }
				}
				
			    if (notification.badge) {
			        $cordovaPush.setBadgeNumber(notification.badge).then(function(result) {
			          // Success!
			        }, function(err) {
			          // An error occurred. Show a message to the user
			        });
			    }
		      }
	      }
	    });
    });
})

// Directive for keeping the keyboard open while in chat
.directive('isFocused', function($timeout) {
  return {
    scope: { trigger: '@isFocused' },
    link: function(scope, element) {
      scope.$watch('trigger', function(value) {
        if(value === "true") {
	        console.log("here-o-o");
          $timeout(function() {
            element[0].focus();
            element.on('blur', function() {
              element[0].focus();
            });
          });
        }
      });
    }
  };
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
        templateUrl: 'templates/launchpage.html',
        controller: 'LaunchCtrl'
    })

    // States for signin and signup
    .state('signin', {
        url: '/signin',
        templateUrl: 'templates/signin.html',
        controller: 'SignInCtrl'
    })

    .state('forgotpassword', {
        url: '/forgot-password',
        templateUrl: 'templates/forgot-password.html',
        controller: 'ForgotPassCtrl'
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
        templateUrl: "templates/tabs.html",
        controller: 'TabsCtrl'
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

    .state('tab.wallet-detail', {
        url: '/wallet/:circleID',
        views: {
            'tab-wallet': {
                templateUrl: 'templates/wallet-detail.html',
                controller: 'WalletDetailCtrl'
            }
        }
    })
	
    .state('tab.chat', {
        url: '/chat?circleID',
        views: {
            'tab-wallet': {
                templateUrl: 'templates/chat.html',
                controller: 'ChatCtrl'
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

    .state('resetpassword', {
        url: '/reset-password',
        templateUrl: 'templates/reset-password.html',
        controller: 'ResetPassCtrl'
    })

    .state('surveypage', {
        url: '/survey-page',
        templateUrl: 'templates/survey-page.html',
        controller: 'SurveyPageCtrl'
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

    /*.state('tab.friends', {
        url: '/friends',
        views: {
            'tab-friends': {
                templateUrl: 'templates/tab-friends.html',
                controller: 'FriendsCtrl'
            }
        }
    })*/

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