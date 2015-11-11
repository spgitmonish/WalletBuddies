// Ionic Starter App
// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js

angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'ngCordova', 'ngMessages', 'firebase', 'email', 'cgNotify', 'ngIOS9UIWebViewPatch', 'jett.ionic.filter.bar'])

.run(function($ionicPlatform, $cordovaPush, $state, $rootScope, $ionicPopup, notify, $ionicHistory, $ionicLoading) {
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

        // Set up Google Analytics(with the ID)
        if(typeof analytics !== undefined) {
            analytics.startTrackerWithId("UA-68986040-1");
        } else {
            console.log("Google Analytics Unavailable");
        }

      	/*// Updating chat badge counter
		var fbRef = new Firebase("https://walletbuddies.firebaseio.com");
		// Get a reference to where the User's accepted circles are going to be stored
		var fbUserAcceptedCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");
		//$rootScope.walletCount = $rootScope.walletCount + 1;

		fbUserAcceptedCircles.child(notification.url).child("Members").child($rootScope.fbAuthData.uid).once("value", function(data){
			var counter = data.val().badgeCounter + 1;
			fbUserAcceptedCircles.child(notification.url).child("Members").child($rootScope.fbAuthData.uid).update({
				badgeCounter: counter
			})
			fbRef.child("Circles").child(notification.url).child("Members").child($rootScope.fbAuthData.uid).update({
				badgeCounter: counter
			})
			$rootScope.walletCount = $rootScope.walletCount + 1;
		});*/

        // listen for Online event
	    $rootScope.$on('$cordovaNetwork:online', function(event, networkState){
	      var onlineState = networkState;
	      console.log("onlineState: " + onlineState);
	      $ionicLoading.hide();
	    })

	    // listen for Offline event
	    $rootScope.$on('$cordovaNetwork:offline', function(event, networkState){
	      var offlineState = networkState;
	      console.log("offlineState: " + offlineState);
	      $ionicLoading.show({
            template: 'Your device appears to be offline.'
          });
	    })

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
						// Display Banner Notifications
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
						// Display Banner Notifications
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
					else if (notification.payload.tab == "feed"){
						// Display Banner Notifications
					    var messageTemplate = '<span ng-click="clickedNotification()">' + notification.message + '</span>';
						notify({
					        messageTemplate: messageTemplate
					    });
					    $rootScope.clickedNotification = function(){
					        notify.closeAll();
					        $state.go('tab.home');
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
						/*// Updating chat badge counter
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
						});*/
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
					else if (notification.payload.tab == "feed"){
					    $state.go('tab.home');
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
					/*// Updating chat badge counter
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
					});*/
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
				else if (notification.payload.tab == "feed"){
					// Display Banner Notifications
				    var messageTemplate = '<span ng-click="clickedNotification()">' + notification.message + '</span>';
					notify({
				        messageTemplate: messageTemplate
				    });
				    $rootScope.clickedNotification = function(){
				        notify.closeAll();
				        $state.go('tab.home');
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
					/*// Updating chat badge counter
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
					});*/
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
				else if (notification.payload.tab == "feed"){
				    $state.go('tab.home');
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
.directive('isFocused', function($timeout, $rootScope) {
  return {
    scope: { trigger: '@isFocused' },
    link: function(scope, element) {
      scope.$watch('trigger', function(value) {
        if(value === "true") {
          $timeout(function() {
	          console.log("Hello", value);
            element[0].focus();

            element.on('blur', function() {
	            console.log("Hello blur", value, $rootScope.focused);
	            if ($rootScope.focused != "false") {
		        console.log("Hello blur focusing", value, $rootScope.focused);    
		        	element[0].focus();   
	            }
            });
          });
        }
      });
    }
  };
})

// Directive for horizantal radio buttons 
.directive('groupedRadio', function() {
 return {
   restrict: 'A',
   require: 'ngModel',
   scope: {
     model: '=ngModel',
     value: '=groupedRadio'
   },
   link: function(scope, element, attrs, ngModelCtrl) {
     element.addClass('button');
     element.on('click', function(e) {
       scope.$apply(function() {
         ngModelCtrl.$setViewValue(scope.value);
       });
     });

     scope.$watch('model', function(newVal) {
       element.removeClass('button-balanced');
       if (newVal === scope.value) {
         element.addClass('button-balanced');
       }
     });
   }
 };
})

.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
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
        views: {
         	'': {
	        	templateUrl: 'templates/signin.html',
				controller: 'SignInCtrl'
			}
		}
    })

	// State for helper slides
    .state('help', {
        url: '/help',
        templateUrl: 'templates/help-slider.html',
        controller: 'HelpCtrl'
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

    .state('tab.socialcircletype', {
        url: '/socialcircle-type',
        views: {
            'tab-wallet': {
                templateUrl: 'templates/socialcircle-type.html',
                controller: 'CircleTypeCtrl'
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

    .state('tab.friend-detail', {
        url: '/friend/:friendId',
        views: {
            'tab-friends': {
                templateUrl: 'templates/friend-detail.html',
                controller: 'FriendDetailCtrl'
            }
        }
    })

	.state('tab.surveypage', {
        url: '/survey-page',
        views: {
            'tab-settings': {
        templateUrl: 'templates/survey-page.html',
        controller: 'SurveyPageCtrl'
        	}
        }
    })

    .state('tab.resetpassword', {
        url: '/reset-password',
        views: {
            'tab-settings': {
        templateUrl: 'templates/reset-password.html',
        controller: 'ResetPassCtrl'
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

    .state('tab.document-upload', {
        url: '/document-upload',
        views: {
            'tab-settings': {
                templateUrl: 'templates/document-upload.html',
                controller: 'DocUploadCtrl'
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

// Prototypes for AES Cipher
String.prototype.toHex = function() {
    var buffer = forge.util.createBuffer(this.toString());
    return buffer.toHex();
}

String.prototype.toSHA1 = function() {
    var md = forge.md.sha1.create();
    md.update(this);
    return md.digest().toHex();
}
